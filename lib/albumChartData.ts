
import type { MovementIcon } from '@/types';

const SPREADSHEET_ID = '1hwXa1A9lpc8dti9kcnUK3p_pYmL4JmyHtAaPPL6S3s4';

const WEEKLY_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=709193280`;

const ALBUMS_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1763528492`;

export interface AlbumChartHistoryEntry {
  week: string;
  rank: number;
}

export interface AlbumWeeklyEntry {
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
  week: string;
  points: number;
  lastWeekRank: number | null;
  lastWeekPoints?: number;
  peakPosition: number;
  weeksOnChart: number;
  arrow: 'NEW' | '▲' | '▼' | '→';
  movementIcon: MovementIcon;
  hasAnyPriorAppearance: boolean;
  chartHistory: AlbumChartHistoryEntry[];
}

export interface AlbumChartPayload {
  week: string;
  displayWeek: string;
  availableWeeks: string[];
  weeksAtNumberOne: number;
  entries: AlbumWeeklyEntry[];
  entriesByWeek: Record<string, AlbumWeeklyEntry[]>;
  weeksAtNumberOneByWeek: Record<string, number>;
}

interface WeeklyRow {
  week: string;
  rank: number;
  title: string;
  artist: string;
  units: number;
}

interface AlbumArtwork {
  title: string;
  artist: string;
  artwork: string;
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;

      row.push(field);

      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseNumber(value: string): number {
  const number = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : 0;
}

function normalizeWeek(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  // Keep ISO-style dates unchanged.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Support dates such as 8/27/2020 or 08/27/20.
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = Number(match[3]);

    if (year < 100) year += year >= 70 ? 1900 : 2000;

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);

  if (!Number.isNaN(parsed.getTime())) {
    return [
      parsed.getUTCFullYear(),
      String(parsed.getUTCMonth() + 1).padStart(2, '0'),
      String(parsed.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  return trimmed;
}

function displayWeekLabel(week: string): string {
  const match = week.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return week;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function albumKey(title: string, artist: string): string {
  return `${normalizeText(title)}::${normalizeText(artist)}`;
}

async function fetchCSV(url: string, label: string): Promise<string[][]> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load the ${label} Google Sheet (HTTP ${response.status}). Check its sharing settings.`,
    );
  }

  const text = await response.text();

  if (
    text.trimStart().startsWith('<!DOCTYPE html') ||
    text.trimStart().startsWith('<html')
  ) {
    throw new Error(
      `The ${label} Google Sheet returned a webpage instead of CSV data. Make sure the sheet is accessible to the app.`,
    );
  }

  return parseCSV(text);
}

function getWeeklyRows(rows: string[][]): WeeklyRow[] {
  return rows
    .map((row) => ({
      week: normalizeWeek(row[0] ?? ''),
      rank: parseNumber(row[1] ?? ''),
      title: (row[2] ?? '').trim(),
      units: parseNumber(row[3] ?? ''),
      artist: (row[4] ?? '').trim(),
    }))
    .filter(
      (row) =>
        row.week !== '' &&
        row.rank > 0 &&
        row.title !== '' &&
        row.artist !== '',
    );
}

function getArtworkRows(rows: string[][]): AlbumArtwork[] {
  return rows
    .map((row) => {
      const combinedTitle = (row[1] ?? '').trim();
      const artwork = (row[2] ?? '').trim();
      const artist = (row[3] ?? '').trim();

      // Column B contains the album title and artist on separate lines.
      const title = combinedTitle.split(/\r?\n/)[0]?.trim() ?? '';

      return { title, artist, artwork };
    })
    .filter((row) => row.title !== '' && row.artist !== '' && row.artwork !== '');
}

export async function getAlbumChartData(
  requestedWeek?: string,
): Promise<AlbumChartPayload> {
  const [weeklyRows, artworkRows] = await Promise.all([
    fetchCSV(WEEKLY_CSV_URL, 'weekly album chart'),
    fetchCSV(ALBUMS_CSV_URL, 'unique albums'),
  ]);

  const weekly = getWeeklyRows(weeklyRows);
  const artwork = getArtworkRows(artworkRows);

  if (weekly.length === 0) {
    throw new Error(
      'No weekly album chart rows were found. Check that columns A to E contain the expected data.',
    );
  }

  const artworkByAlbum = new Map<string, string>();

  for (const album of artwork) {
    artworkByAlbum.set(
      albumKey(album.title, album.artist),
      album.artwork,
    );
  }

  const weeksAscending = [
    ...new Set(weekly.map((row) => row.week)),
  ].sort((a, b) => a.localeCompare(b));

  const rowsByWeek = new Map<string, WeeklyRow[]>();

  for (const row of weekly) {
    const rows = rowsByWeek.get(row.week) ?? [];
    rows.push(row);
    rowsByWeek.set(row.week, rows);
  }

  for (const rows of rowsByWeek.values()) {
    rows.sort((a, b) => a.rank - b.rank);
  }

  const historyByAlbum = new Map<string, AlbumChartHistoryEntry[]>();
  const unitsByAlbumWeek = new Map<string, number>();

  for (const week of weeksAscending) {
    const rows = rowsByWeek.get(week) ?? [];

    for (const row of rows) {
      const key = albumKey(row.title, row.artist);
      const history = historyByAlbum.get(key) ?? [];

      history.push({ week, rank: row.rank });
      historyByAlbum.set(key, history);
      unitsByAlbumWeek.set(`${key}::${week}`, row.units);
    }
  }

  const entriesByWeek: Record<string, AlbumWeeklyEntry[]> = {};
  const weeksAtNumberOneByWeek: Record<string, number> = {};
  const firstWeekIndexByAlbum = new Map<string, number>();

  for (const week of weeksAscending) {
    const weekIndex = weeksAscending.indexOf(week);
    const rows = rowsByWeek.get(week) ?? [];

    entriesByWeek[week] = rows.map((row) => {
      const key = albumKey(row.title, row.artist);
      const history = historyByAlbum.get(key) ?? [];
      const albumHistory = history.filter((entry) =>
        entry.week.localeCompare(week) <= 0,
      );
      const currentHistory = albumHistory[albumHistory.length - 1];
      const previousHistory = albumHistory[albumHistory.length - 2];

      if (!firstWeekIndexByAlbum.has(key)) {
        firstWeekIndexByAlbum.set(key, weekIndex);
      }

      const peakPosition = Math.min(
        ...albumHistory.map((entry) => entry.rank),
      );

      let movementIcon: MovementIcon = 'debut';
      let arrow: AlbumWeeklyEntry['arrow'] = 'NEW';

      if (previousHistory) {
        if (row.rank < previousHistory.rank) {
          movementIcon = 'up';
          arrow = '▲';
        } else if (row.rank > previousHistory.rank) {
          movementIcon = 'down';
          arrow = '▼';
        } else {
          movementIcon = 'nonmover';
          arrow = '→';
        }
      } else if (history.length > 1) {
        // The album has appeared before, but not in the immediately
        // preceding chart week.
        movementIcon = 'reentry';
        arrow = 'NEW';
      }

      return {
        rank: row.rank,
        title: row.title,
        artist: row.artist,
        artwork: artworkByAlbum.get(key),
        week,
        points: row.units,
        lastWeekRank: previousHistory?.rank ?? null,
        lastWeekPoints: previousHistory
          ? unitsByAlbumWeek.get(`${key}::${previousHistory.week}`)
          : undefined,
        peakPosition,
        weeksOnChart: albumHistory.length,
        arrow,
        movementIcon,
        hasAnyPriorAppearance: Boolean(previousHistory),
        chartHistory: albumHistory,
      };
    });

    const numberOne = rows.find((row) => row.rank === 1);

    if (numberOne) {
      const key = albumKey(numberOne.title, numberOne.artist);
      weeksAtNumberOneByWeek[week] = (historyByAlbum.get(key) ?? [])
        .filter((entry) => entry.rank === 1 && entry.week.localeCompare(week) <= 0)
        .length;
    } else {
      weeksAtNumberOneByWeek[week] = 0;
    }
  }

  // Show the newest chart week first in the week selector.
  const availableWeeks = [...weeksAscending].reverse();
  const normalizedRequestedWeek = requestedWeek
    ? normalizeWeek(requestedWeek)
    : '';

  const week =
    normalizedRequestedWeek && entriesByWeek[normalizedRequestedWeek]
      ? normalizedRequestedWeek
      : availableWeeks[0];

  return {
    week,
    displayWeek: displayWeekLabel(week),
    availableWeeks,
    weeksAtNumberOne: weeksAtNumberOneByWeek[week] ?? 0,
    entries: entriesByWeek[week] ?? [],
    entriesByWeek,
    weeksAtNumberOneByWeek,
  };
}
