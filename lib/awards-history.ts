import Papa from 'papaparse';
import { sheetSources } from '@/lib/chartData';

const CUTOFF = new Date(2025, 9, 1);

function parseDate(value: string): Date | null {
  const parts = value.trim().split('/').map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [month, day, shortYear] = parts;
  const year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;

  return new Date(year, month - 1, day);
}

function normalizeArtist(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/*
 * Splits multiple artist credits while preserving known
 * artist names that contain an ampersand.
 */
function splitArtistCredits(credit: string): string[] {
  const protectedNames = ['She & Him'];
  let value = credit.trim();

  protectedNames.forEach((name, index) => {
    value = value.replace(
      new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      `__PROTECTED_ARTIST_${index}__`
    );
  });

  value = value
    .replace(/\b(featuring|feat\.?|ft\.?)\b/gi, '|')
    .replace(/\bwith\b/gi, '|')
    .replace(/[&+,]/g, '|');

  return value
    .split('|')
    .map((artist) => artist.trim())
    .filter(Boolean)
    .map((artist) => {
      let restored = artist;

      protectedNames.forEach((name, index) => {
        restored = restored.replace(
          `__PROTECTED_ARTIST_${index}__`,
          name
        );
      });

      return restored;
    });
}

export async function getArtistFirstAppearances(
  requestedArtists: string[]
): Promise<Record<string, string | null>> {
  const source = sheetSources.find(
    (item) => item.title === 'THE HOT 100'
  );

  if (!source) {
    throw new Error('The historical Hot 100 source was not found.');
  }

  const response = await fetch(source.csvUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load Hot 100 history: HTTP ${response.status}`
    );
  }

  const csv = await response.text();
  const parsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: true,
  });

  const wanted = new Map(
    requestedArtists.map((artist) => [
      normalizeArtist(artist),
      artist,
    ])
  );

  const firstDates = new Map<string, Date>();

  for (const row of parsed.data) {
    const week = row[0]?.trim() ?? '';
    const content = row[2]?.trim() ?? '';
    const parts = content.split(/\r?\n/);
    const credit = parts[1]?.trim() ?? '';
    const date = parseDate(week);

    if (!date || !credit) continue;

    for (const creditedArtist of splitArtistCredits(credit)) {
      const key = normalizeArtist(creditedArtist);

      if (!wanted.has(key)) continue;

      const previous = firstDates.get(key);

      if (!previous || date < previous) {
        firstDates.set(key, date);
      }
    }
  }

  const result: Record<string, string | null> = {};

  for (const [key, originalName] of wanted) {
    const date = firstDates.get(key);

    result[originalName] = date
      ? `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      : null;
  }

  return result;
}

export function isBestNewArtistEligible(
  firstAppearance: string | null
): boolean {
  if (!firstAppearance) return false;

  const date = parseDate(firstAppearance);

  return date !== null && date >= CUTOFF;
}