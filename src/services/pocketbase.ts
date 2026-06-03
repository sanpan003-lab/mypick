import PocketBase from 'pocketbase';

export const POCKETBASE_URL =
  (import.meta.env.VITE_POCKETBASE_URL as string | undefined) ?? 'http://localhost:8090';

let _pb: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!_pb) _pb = new PocketBase(POCKETBASE_URL);
  return _pb;
}
