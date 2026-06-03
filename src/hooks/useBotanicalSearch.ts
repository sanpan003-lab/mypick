import { useMemo, useDeferredValue } from 'react';
import dbRaw from '../data/botanicalDatabase.json';
import type { BotanicalEntry } from '../types/trees';

const db: BotanicalEntry[] = dbRaw as BotanicalEntry[];

function score(entry: BotanicalEntry, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const haystack = [
    entry.name.toLowerCase(),
    entry.botanicalName.toLowerCase(),
    (entry.region ?? '').toLowerCase(),
    entry.notes.toLowerCase(),
    (entry.tasteDescription ?? '').toLowerCase(),
    (entry.texture ?? '').toLowerCase(),
    (entry.climateConditions ?? '').toLowerCase(),
    (entry.growingTips ?? '').toLowerCase(),
    (entry.healthBenefits ?? []).join(' ').toLowerCase(),
  ].join(' ');

  let points = 0;
  for (const token of tokens) {
    if (entry.name.toLowerCase().startsWith(token)) points += 5;
    else if (entry.name.toLowerCase().includes(token)) points += 4;
    else if (entry.botanicalName.toLowerCase().includes(token)) points += 3;
    else if ((entry.region ?? '').toLowerCase().includes(token)) points += 2;
    else if (haystack.includes(token)) points += 1;
  }

  // Require all tokens to appear at least somewhere
  const allMatch = tokens.every(t => haystack.includes(t));
  return allMatch ? points : 0;
}

function runSearch(query: string, limit: number): BotanicalEntry[] {
  const q = query.trim();
  if (!q) return db.slice(0, limit);
  return db
    .map(entry => ({ entry, points: score(entry, q) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/**
 * React hook — uses useDeferredValue so typing never blocks the UI thread.
 * Returns up to `limit` entries matching the query, sorted by relevance.
 */
export function useBotanicalSearch(query: string, limit = 10): BotanicalEntry[] {
  const deferredQuery = useDeferredValue(query);
  return useMemo(() => runSearch(deferredQuery, limit), [deferredQuery, limit]);
}

/** Non-hook version for use outside React components. */
export function searchTrees(query: string, limit = 10): BotanicalEntry[] {
  return runSearch(query, limit);
}
