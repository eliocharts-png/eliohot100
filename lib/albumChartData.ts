
import type { MovementIcon } from '@/types';

const SPREADSHEET_ID =
  '1hwXa1A9lpc8dti9kcnUK3p_pYmL4JmyHtAaPPL6S3s4';

const WEEKLY_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=709193280`;

const ALBUMS_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1763528492`;

/*
 * ---------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------
 */

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

export interface PreviousAlbumEntry {
  title: string;
  artist: string;
  points: number;
}

export interface AlbumChartPayload {
  week: string;
  displayWeek: string;
  availableWeeks: string[];
  weeksAtNumberOne: number;
  entries: AlbumWeeklyEntry[];
  previousEntries: PreviousAlbumEntry[];

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

/*
 * ---------------------------------------------------------
 * CSV PARSER
 * ---------------------------------------------------------
 */

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
    } else if (
      (char === '\n' || char === '\r') &&
      !inQuotes
    ) {
      if (char === '\r' && next === '\n') {
        i++;
      }

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

/*
 * ---------------------------------------------------------
 * NORMALIZATION
 * ---------------------------------------------------------
 */

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
  const number = Number(
    value.replace(/,/g, '').trim()
  );

  return Number.isFinite(number) ? number : 0;
}

function normalizeWeek(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
  );

  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = Number(match[3]);

    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

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
  const match = week.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) return week;

  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    )
  );

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function albumKey(
  title: string,
  artist: string
): string {
  return `${normalizeText(title)}::${normalizeText(artist)}`;
}

/*
 * ---------------------------------------------------------
 * FETCH CSV
 * ---------------------------------------------------------
 */

async function fetchCSV(
  url: string,
  label: string
): Promise<string[][]> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load the ${label} Google Sheet (HTTP ${response.status}). Check its sharing settings.`
    );
  }

  const text = await response.text();

  if (
    text.trimStart().startsWith('<!DOCTYPE html') ||
    text.trimStart().startsWith('<html')
  ) {
    throw new Error(
      `The ${label} Google Sheet returned a webpage instead of CSV data. Make sure the sheet is accessible to the app.`
    );
  }

  return parseCSV(text);
}

/*
 * ---------------------------------------------------------
 * PARSE WEEKLY ALBUM DATA
 * ---------------------------------------------------------
 */

function getWeeklyRows(
  rows: string[][]
): WeeklyRow[] {
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

/*
 * ---------------------------------------------------------
 * PARSE ALBUM ARTWORK
 * ---------------------------------------------------------
 */

function getArtworkRows(
  rows: string[][]
): AlbumArtwork[] {
  return rows
    .map((row) => {
      const combinedTitle = (row[1] ?? '').trim();

      return {
        title:
          combinedTitle.split(/\r?\n/)[0]?.trim() ?? '',
        artwork: (row[2] ?? '').trim(),
        artist: (row[3] ?? '').trim(),
      };
    })
    .filter(
      (row) =>
        row.title !== '' &&
        row.artist !== '' &&
        row.artwork !== '',
    );
}

/*
 * ---------------------------------------------------------
 * BUILD ALBUM ENTRY
 * ---------------------------------------------------------
 */

function buildAlbumEntry(
  row: WeeklyRow,
  currentWeek: string,
  previousWeek: string | null,
  previousWeekAlbumKeys: Set<string>,
  historyByAlbum: Map<string, AlbumChartHistoryEntry[]>,
  unitsByAlbumWeek: Map<string, number>,
  artworkByAlbum: Map<string, string>,
): AlbumWeeklyEntry {
  const key = albumKey(row.title, row.artist);

  const completeHistory =
    historyByAlbum.get(key) ?? [];

  const historyToDate =
    completeHistory.filter(
      (entry) =>
        entry.week.localeCompare(currentWeek) <= 0,
    );

  const earlierHistory =
    historyToDate.filter(
      (entry) =>
        entry.week.localeCompare(currentWeek) < 0,
    );

  const hasAnyPriorAppearance =
    earlierHistory.length > 0;

  const previousWeekEntry =
    previousWeek
      ? earlierHistory.find(
          (entry) => entry.week === previousWeek
        )
      : undefined;

  let movementIcon: MovementIcon;
  let arrow: AlbumWeeklyEntry['arrow'];

  let lastWeekRank: number | null = null;
  let lastWeekPoints: number | undefined;

  if (
    previousWeekAlbumKeys.has(key) &&
    previousWeekEntry
  ) {
    lastWeekRank = previousWeekEntry.rank;

    lastWeekPoints = unitsByAlbumWeek.get(
      `${key}::${previousWeekEntry.week}`
    );

    if (row.rank < previousWeekEntry.rank) {
      movementIcon = 'up';
      arrow = '▲';
    } else if (row.rank > previousWeekEntry.rank) {
      movementIcon = 'down';
      arrow = '▼';
    } else {
      movementIcon = 'nonmover';
      arrow = '→';
    }
  } else if (hasAnyPriorAppearance) {
    movementIcon = 'reentry';
    arrow = 'NEW';
  } else {
    movementIcon = 'debut';
    arrow = 'NEW';
  }

  const peakPosition = historyToDate.reduce(
    (peak, entry) => Math.min(peak, entry.rank),
    Infinity,
  );

  return {
    rank: row.rank,
    title: row.title,
    artist: row.artist,
    artwork: artworkByAlbum.get(key),
    week: currentWeek,
    points: row.units,
    lastWeekRank,
    lastWeekPoints,
    peakPosition: Number.isFinite(peakPosition)
      ? peakPosition
      : row.rank,
    weeksOnChart: historyToDate.length,
    arrow,
    movementIcon,
    hasAnyPriorAppearance,
    chartHistory: historyToDate,
  };
}

/*
 * ---------------------------------------------------------
 * GET ALBUM CHART DATA
 * ---------------------------------------------------------
 */

export async function getAlbumChartData(
  requestedWeek?: string,
): Promise<AlbumChartPayload> {
  /*
   * FETCH SOURCE DATA
   */

  const [weeklyRows, artworkRows] = await Promise.all([
    fetchCSV(WEEKLY_CSV_URL, 'weekly album chart'),
    fetchCSV(ALBUMS_CSV_URL, 'unique albums'),
  ]);

  const weekly = getWeeklyRows(weeklyRows);
  const artwork = getArtworkRows(artworkRows);

  if (weekly.length === 0) {
    throw new Error(
      'No weekly album chart rows were found. Check that columns A to E contain the expected data.'
    );
  }

  /*
   * ARTWORK LOOKUP
   */

  const artworkByAlbum = new Map<string, string>();

  for (const album of artwork) {
    artworkByAlbum.set(
      albumKey(album.title, album.artist),
      album.artwork,
    );
  }

  /*
   * AVAILABLE WEEKS
   */

  const weeksAscending = [
    ...new Set(weekly.map((row) => row.week)),
  ].sort((a, b) => a.localeCompare(b));

  const availableWeeks = [
    ...weeksAscending,
  ].reverse();

  const normalizedRequestedWeek = requestedWeek
    ? normalizeWeek(requestedWeek)
    : '';

  const week =
    normalizedRequestedWeek &&
    weeksAscending.includes(normalizedRequestedWeek)
      ? normalizedRequestedWeek
      : availableWeeks[0];

  /*
   * GROUP ROWS BY WEEK
   */

  const rowsByWeek = new Map<string, WeeklyRow[]>();

  for (const row of weekly) {
    const rows = rowsByWeek.get(row.week) ?? [];

    rows.push(row);
    rowsByWeek.set(row.week, rows);
  }

  for (const rows of rowsByWeek.values()) {
    rows.sort((a, b) => a.rank - b.rank);
  }

  /*
   * BUILD COMPLETE ALBUM HISTORIES
   */

  const historyByAlbum = new Map<
    string,
    AlbumChartHistoryEntry[]
  >();

  const unitsByAlbumWeek = new Map<string, number>();

  for (const row of weekly) {
    const key = albumKey(row.title, row.artist);

    const history =
      historyByAlbum.get(key) ?? [];

    history.push({
      week: row.week,
      rank: row.rank,
    });

    historyByAlbum.set(key, history);

    unitsByAlbumWeek.set(
      `${key}::${row.week}`,
      row.units,
    );
  }

  for (const history of historyByAlbum.values()) {
    history.sort(
      (a, b) => a.week.localeCompare(b.week)
    );
  }

  /*
   * BUILD EVERY WEEK'S ENTRIES
   */

  const entriesByWeek: Record<
    string,
    AlbumWeeklyEntry[]
  > = {};

  const weeksAtNumberOneByWeek: Record<
    string,
    number
  > = {};

  for (
    let weekIndex = 0;
    weekIndex < weeksAscending.length;
    weekIndex++
  ) {
    const currentWeek =
      weeksAscending[weekIndex];

    const previousWeek =
      weekIndex > 0
        ? weeksAscending[weekIndex - 1]
        : null;

    const currentRows =
      rowsByWeek.get(currentWeek) ?? [];

    const previousRows = previousWeek
      ? rowsByWeek.get(previousWeek) ?? []
      : [];

    const previousWeekAlbumKeys = new Set(
      previousRows.map((row) =>
        albumKey(row.title, row.artist)
      ),
    );

    const currentEntries =
      currentRows.map((row) =>
        buildAlbumEntry(
          row,
          currentWeek,
          previousWeek,
          previousWeekAlbumKeys,
          historyByAlbum,
          unitsByAlbumWeek,
          artworkByAlbum,
        )
      );

    entriesByWeek[currentWeek] =
      currentEntries;

    /*
     * WEEKS AT NUMBER ONE
     */

    const numberOne =
      currentRows.find(
        (row) => row.rank === 1
      );

    if (numberOne) {
      const key = albumKey(
        numberOne.title,
        numberOne.artist,
      );

      weeksAtNumberOneByWeek[currentWeek] =
        (historyByAlbum.get(key) ?? []).filter(
          (entry) =>
            entry.rank === 1 &&
            entry.week.localeCompare(currentWeek) <= 0,
        ).length;
    } else {
      weeksAtNumberOneByWeek[currentWeek] = 0;
    }
  }

  /*
   * SELECTED WEEK
   */

  const selectedIndex =
    weeksAscending.indexOf(week);

  const previousChartWeek =
    selectedIndex > 0
      ? weeksAscending[selectedIndex - 1]
      : null;

  const entries =
    entriesByWeek[week] ?? [];

  const priorRows = previousChartWeek
    ? rowsByWeek.get(previousChartWeek) ?? []
    : [];

  const previousEntries: PreviousAlbumEntry[] =
    priorRows.map((row) => ({
      title: row.title,
      artist: row.artist,
      points: row.units,
    }));

  const weeksAtNumberOne =
    weeksAtNumberOneByWeek[week] ?? 0;

  /*
   * RETURN
   */

  return {
    week,
    displayWeek: displayWeekLabel(week),
    availableWeeks,
    weeksAtNumberOne,
    entries,
    previousEntries,
    entriesByWeek,
    weeksAtNumberOneByWeek,
  };
}
