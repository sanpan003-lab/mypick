/**
 * Community Pins — PocketBase-backed public discovery layer.
 *
 * Design:
 *  - Reads are anonymous — no sign-in required.
 *  - Writes identify the device via a stable per-device UUID (localStorage).
 *  - Geo-queries use a simple bounding-box filter on lat/lng fields.
 */

import { getPocketBase } from './pocketbase';
import type { Pin } from '../components/PickMap';

const DEVICE_UID_KEY = 'orchard_device_uid';

/** Stable per-device identity — generated once and persisted in localStorage. */
export function getDeviceUid(): string {
  let uid = localStorage.getItem(DEVICE_UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(DEVICE_UID_KEY, uid);
  }
  return uid;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PublicTreeRecord {
  id: string;
  device_uid: string;
  lat: number;
  lng: number;
  common_name: string;
  scientific_name: string;
  description: string;
  address: string;
  notes: string;
  image_url: string;
  details: Record<string, unknown>;
  date_added: string;
}

function recordToPin(r: PublicTreeRecord): Pin {
  return {
    id: r.id,
    uid: r.device_uid || 'community',
    lat: r.lat,
    lng: r.lng,
    details: {
      commonName: r.common_name,
      scientificName: r.scientific_name || undefined,
      description: r.description || undefined,
      ...(r.details as object),
    },
    address: r.address || undefined,
    notes: r.notes || undefined,
    imageUrls: r.image_url ? [r.image_url] : [],
    dateAdded: r.date_added,
    isPublic: true,
  };
}

/**
 * Fetch all public trees within a geographic bounding box (max 100 results).
 */
export async function fetchPublicTreesInBounds(bounds: BoundingBox): Promise<Pin[]> {
  try {
    const pb = getPocketBase();
    const filter = `lat >= ${bounds.minLat} && lat <= ${bounds.maxLat} && lng >= ${bounds.minLng} && lng <= ${bounds.maxLng}`;
    const result = await pb.collection('trees').getList<PublicTreeRecord>(1, 100, {
      filter,
      sort: '-date_added',
    });
    return result.items.map(recordToPin);
  } catch (err) {
    console.error('[communityPins] fetch error:', err);
    return [];
  }
}

/**
 * Publish a local pin to the community trees collection.
 * Only stores the first photo if it is under 200 KB.
 */
export async function publishTree(pin: Pin): Promise<void> {
  const pb = getPocketBase();
  const deviceUid = getDeviceUid();
  const rawImage = pin.imageUrls?.[0];
  const imageUrl = rawImage && rawImage.length < 200_000 ? rawImage : '';

  const payload = {
    device_uid: deviceUid,
    lat: pin.lat,
    lng: pin.lng,
    common_name: pin.details.commonName,
    scientific_name: pin.details.scientificName ?? '',
    description: pin.details.description ?? '',
    address: pin.address ?? '',
    notes: pin.notes ?? '',
    image_url: imageUrl,
    details: pin.details,
    date_added: pin.dateAdded,
  };

  try {
    // Attempt update first (record may already exist with this id)
    await pb.collection('trees').update(pin.id, payload);
  } catch {
    // Record doesn't exist yet — create it with the local id
    await pb.collection('trees').create({ id: pin.id, ...payload });
  }
}

/**
 * Remove a previously published tree (only works if device_uid matches the record's).
 */
export async function unpublishTree(pinId: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('trees').delete(pinId);
}
