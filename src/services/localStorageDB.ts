import { openDB, IDBPDatabase } from 'idb';
import { Pin, NoteEntry } from '../components/PickMap';

const DB_NAME = 'OrchardLocalDB';
const DB_VERSION = 1;
const PICKS_STORE = 'picks';
const NOTES_STORE = 'notes';
const PHOTOS_STORE = 'photos';

let _db: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PICKS_STORE)) {
          db.createObjectStore(PICKS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(NOTES_STORE)) {
          db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          db.createObjectStore(PHOTOS_STORE);
        }
      },
    });
  }
  return _db;
}

// ─── Picks ────────────────────────────────────────────────────────────────────

export async function getAllPicks(): Promise<Pin[]> {
  const db = await getDB();
  return db.getAll(PICKS_STORE);
}

export async function savePick(pick: Pin): Promise<void> {
  const db = await getDB();
  await db.put(PICKS_STORE, pick);
}

export async function deletePick(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PICKS_STORE, id);
}

export async function replaceAllPicks(picks: Pin[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(PICKS_STORE, 'readwrite');
  await tx.store.clear();
  for (const pick of picks) await tx.store.put(pick);
  await tx.done;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getAllNotes(): Promise<NoteEntry[]> {
  const db = await getDB();
  return db.getAll(NOTES_STORE);
}

export async function saveNote(note: NoteEntry): Promise<void> {
  const db = await getDB();
  await db.put(NOTES_STORE, note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(NOTES_STORE, id);
}

export async function replaceAllNotes(notes: NoteEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(NOTES_STORE, 'readwrite');
  await tx.store.clear();
  for (const note of notes) await tx.store.put(note);
  await tx.done;
}

// ─── Photos (keyed by "pickId_index" or "noteId_index") ──────────────────────

export async function savePhoto(key: string, base64: string): Promise<void> {
  const db = await getDB();
  await db.put(PHOTOS_STORE, base64, key);
}

export async function getPhoto(key: string): Promise<string | undefined> {
  try {
    const db = await getDB();
    return db.get(PHOTOS_STORE, key);
  } catch {
    return undefined;
  }
}

export async function deletePhotosForId(id: string): Promise<void> {
  const db = await getDB();
  const keys = await db.getAllKeys(PHOTOS_STORE);
  const tx = db.transaction(PHOTOS_STORE, 'readwrite');
  for (const k of keys) {
    if ((k as string).startsWith(`${id}_`)) {
      tx.store.delete(k);
    }
  }
  await tx.done;
}

export async function getAllPhotos(): Promise<Record<string, string>> {
  const db = await getDB();
  const keys = await db.getAllKeys(PHOTOS_STORE);
  const result: Record<string, string> = {};
  for (const k of keys) {
    result[k as string] = await db.get(PHOTOS_STORE, k);
  }
  return result;
}

export async function restorePhotos(photos: Record<string, string>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(PHOTOS_STORE, 'readwrite');
  for (const [k, v] of Object.entries(photos)) {
    tx.store.put(v, k);
  }
  await tx.done;
}

// ─── Convenience: load first photo for a pick ────────────────────────────────

export async function getPickPhoto(pickId: string, index = 0): Promise<string | undefined> {
  return getPhoto(`${pickId}_${index}`);
}

export async function savePickPhoto(pickId: string, index: number, base64: string): Promise<void> {
  return savePhoto(`${pickId}_${index}`, base64);
}

export async function getAllPickPhotos(pickId: string): Promise<string[]> {
  const db = await getDB();
  const allKeys = await db.getAllKeys(PHOTOS_STORE);
  const prefix = `${pickId}_`;
  const relevant = (allKeys as string[])
    .filter(k => k.startsWith(prefix) && !k.includes('note_'))
    .sort((a, b) => {
      const ai = parseInt(a.slice(prefix.length), 10);
      const bi = parseInt(b.slice(prefix.length), 10);
      return ai - bi;
    });
  const results = await Promise.all(relevant.map(k => db.get(PHOTOS_STORE, k) as Promise<string>));
  return results.filter(Boolean);
}

// ─── Videos (keyed by "pickId_v{index}") ─────────────────────────────────────

export async function savePickVideo(pickId: string, index: number, base64: string): Promise<void> {
  return savePhoto(`${pickId}_v${index}`, base64);
}

export async function getPickVideo(pickId: string, index: number): Promise<string | undefined> {
  return getPhoto(`${pickId}_v${index}`);
}

export async function getAllPickVideos(pickId: string): Promise<string[]> {
  const db = await getDB();
  const allKeys = await db.getAllKeys(PHOTOS_STORE);
  const prefix = `${pickId}_v`;
  const relevant = (allKeys as string[])
    .filter(k => k.startsWith(prefix))
    .sort((a, b) => {
      const ai = parseInt(a.slice(prefix.length), 10);
      const bi = parseInt(b.slice(prefix.length), 10);
      return ai - bi;
    });
  const results = await Promise.all(relevant.map(k => db.get(PHOTOS_STORE, k) as Promise<string>));
  return results.filter(Boolean);
}

export async function getNotePhoto(noteId: string, index: number): Promise<string | undefined> {
  return getPhoto(`note_${noteId}_${index}`);
}

export async function saveNotePhoto(noteId: string, index: number, base64: string): Promise<void> {
  return savePhoto(`note_${noteId}_${index}`, base64);
}
