/**
 * Google Drive Backup & Recovery
 *
 * Design principles:
 *  - NEVER auto-triggers; only runs when explicitly called by the user.
 *  - All tree data is bundled into ONE JSON upload (orchard_system_backup.json)
 *    to minimise API quota usage.
 *  - 429 / quota errors are handled with exponential backoff (up to 5 retries).
 *  - A module-level lock prevents concurrent sync operations.
 */

import { Pin, NoteEntry } from '../components/PickMap';
import { getAllPhotos, restorePhotos } from './localStorageDB';
import botanicalDatabase from '../data/botanicalDatabase.json';

const DRIVE_FOLDER_NAME = 'My Pick';
const BACKUP_FILENAME   = 'orchard_system_backup.json';
const SCOPES            = 'https://www.googleapis.com/auth/drive.file';

// ─── Concurrency lock ─────────────────────────────────────────────────────────

let _syncInProgress = false;

function acquireLock(): boolean {
  if (_syncInProgress) return false;
  _syncInProgress = true;
  return true;
}

function releaseLock() {
  _syncInProgress = false;
}

// ─── Exponential backoff fetch ────────────────────────────────────────────────

const MAX_RETRIES   = 5;
const BASE_DELAY_MS = 1_000; // 1 s

async function fetchWithBackoff(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(input, init);
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;

    // Honour Retry-After if present, otherwise use exponential backoff
    const retryAfter = res.headers.get('Retry-After');
    const delay = retryAfter
      ? parseFloat(retryAfter) * 1_000
      : BASE_DELAY_MS * 2 ** attempt + Math.random() * 500;

    attempt++;
    await new Promise(r => setTimeout(r, delay));
  }
}

// ─── GIS script loader ────────────────────────────────────────────────────────

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const existing = document.getElementById('gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id    = 'gis-script';
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

// ─── Token management ─────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

export function clearDriveToken() {
  _cachedToken = null;
  _tokenExpiry = 0;
}

// Thrown when the browser blocks the OAuth popup — callers can check instanceof.
export class PopupBlockedError extends Error {
  constructor() {
    super(
      'POPUP_BLOCKED: Your browser blocked the Google sign-in popup.\n\n' +
      'Please allow popups for this site, then try again:\n' +
      '  Chrome/Edge → address bar → the popup-blocked icon → "Always allow"\n' +
      '  Safari      → Settings → Websites → Pop-up Windows → Allow',
    );
    this.name = 'PopupBlockedError';
  }
}

function requestFreshToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const gis = (window as any).google?.accounts?.oauth2;
    if (!gis) { reject(new Error('Google Identity Services not loaded')); return; }

    const client = gis.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        _cachedToken = response.access_token;
        _tokenExpiry = Date.now() + 55 * 60 * 1_000; // cache 55 min
        resolve(response.access_token);
      },
      error_callback: (err: any) => {
        const msg: string = err?.message ?? err?.type ?? '';
        // GIS fires "popup_failed_to_open" or "popup_closed" when blocked
        if (
          msg.includes('popup') ||
          msg.includes('Failed to open') ||
          err?.type === 'popup_failed_to_open'
        ) {
          reject(new PopupBlockedError());
        } else {
          reject(new Error(msg || 'OAuth cancelled or failed'));
        }
      },
    });

    client.requestAccessToken({ prompt: '' });
  });
}

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error(
      'Google Drive sync is not configured.\n\nAdd VITE_GOOGLE_CLIENT_ID to your .env file.'
    );
  }

  await loadGisScript();
  return requestFreshToken(clientId);
}

// ─── Drive REST helpers ───────────────────────────────────────────────────────

async function driveRequest(url: string, init?: RequestInit): Promise<any> {
  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers ?? {}),
  };
  const res = await fetchWithBackoff(url, { ...init, headers });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  const ct = res.headers.get('Content-Type') ?? '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function multipartUpload(
  folderId: string,
  filename: string,
  body: string,
  mimeType: string,
  existingId?: string,
): Promise<string> {
  const token    = await getToken();
  const BOUNDARY = 'OrchardBoundary271828';
  const metadata = existingId
    ? { name: filename }
    : { name: filename, parents: [folderId] };

  const payload =
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${BOUNDARY}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    body +
    `\r\n--${BOUNDARY}--`;

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=id`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`;

  const res = await fetchWithBackoff(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
    },
    body: payload,
  });

  if (!res.ok) throw new Error(`Drive upload failed ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

async function findOrCreateFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const result = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`
  );
  if (result.files?.length > 0) return result.files[0].id as string;

  const token = await getToken();
  const res = await fetchWithBackoff('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!res.ok) throw new Error(`Could not create Drive folder: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

async function findFile(folderId: string, name: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and '${folderId}' in parents and trashed=false`
  );
  const result = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`
  );
  return result.files?.[0]?.id ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BackupProgress {
  current: number;
  total: number;
  label: string;
}

export interface BackupResult {
  treeCount: number;
  noteCount: number;
}

/**
 * Bundles ALL tree data into a single JSON file and uploads it in ONE Drive API
 * call — no per-tree requests, no quota hammering.
 *
 * Must only be called in response to an explicit user action.
 */
export async function backupToDrive(
  picks: Pin[],
  notes: NoteEntry[],
  onProgress?: (p: BackupProgress) => void,
): Promise<BackupResult> {
  if (!acquireLock()) {
    throw new Error('A sync operation is already in progress.');
  }

  try {
    onProgress?.({ current: 0, total: 3, label: 'Connecting to Google Drive…' });

    const folderId  = await findOrCreateFolder();
    const allPhotos = await getAllPhotos();

    onProgress?.({ current: 1, total: 3, label: 'Building snapshot…' });

    const snapshot = JSON.stringify(
      {
        picks,
        notes,
        // 'media' holds all photos AND videos keyed by their IDB key
        // Photo keys: "{pickId}_{index}", Video keys: "{pickId}_v{index}"
        media: allPhotos,
        botanicalDatabase,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    onProgress?.({ current: 2, total: 3, label: 'Uploading to Google Drive…' });

    const existingId = await findFile(folderId, BACKUP_FILENAME);
    await multipartUpload(
      folderId,
      BACKUP_FILENAME,
      snapshot,
      'application/json',
      existingId ?? undefined,
    );

    onProgress?.({ current: 3, total: 3, label: 'Done!' });

    return { treeCount: picks.length, noteCount: notes.length };
  } finally {
    releaseLock();
  }
}

export interface RestoreResult {
  picks: Pin[];
  notes: NoteEntry[];
}

/**
 * Downloads the single backup JSON from Drive and restores it into local state.
 *
 * Must only be called in response to an explicit user action.
 */
export async function restoreFromDrive(): Promise<RestoreResult> {
  if (!acquireLock()) {
    throw new Error('A sync operation is already in progress.');
  }

  try {
    const folderId = await findOrCreateFolder();
    const fileId   = await findFile(folderId, BACKUP_FILENAME);

    if (!fileId) {
      throw new Error(
        `No backup found in "${DRIVE_FOLDER_NAME}" on your Google Drive.\n\nRun a backup from this device first.`
      );
    }

    const raw = await driveRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );

    const data   = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const picks: Pin[]           = Array.isArray(data.picks)  ? data.picks  : [];
    const notes: NoteEntry[]     = Array.isArray(data.notes)  ? data.notes  : [];
    // Support both old 'photos' key and new 'media' key
    const photos: Record<string, string> =
      (data.media ?? data.photos) && typeof (data.media ?? data.photos) === 'object'
        ? (data.media ?? data.photos)
        : {};

    if (Object.keys(photos).length > 0) {
      await restorePhotos(photos);
    }

    return { picks, notes };
  } finally {
    releaseLock();
  }
}
