import { NextResponse } from 'next/server';

const WEEKLY_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

const CACHE_DURATION = 5 * 60 * 1000;

type RawEntry = {
  week: string;
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
  points?: number;
};

type NumberOneWeek = {
  week: string;
  points: number | null;
  weeksOnChart: number;
};

type NumberOneSong = {
  title: string;
  artist: string;
  artwork?: string;
  firstNo1: string;
  lastNo1: string;
  totalWeeksAtNo1: number;
  numberOneWeeks: NumberOneWeek[];
};

let cachedResult: {
  data: NumberOneSong[];
  createdAt: number;
} | null = null;

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];

    if (char === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') i += 1;

      row.push(value);
      value = '';

      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value !== '' || row.length > 0) {
    row.push(value);

    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function parseDate(value: string): number {
  const [month, day, year] = value.split('/').map(Number);

  if (!month || !day || year === undefined) return 0;

  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  return new Date(fullYear, month - 1, day).getTime();
}

function songKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}|||${artist.toLowerCase().trim()}`;
}

async function getNumberOneSongs(): Promise<NumberOneSong[]> {
  if (
    cachedResult &&
    Date.now() - cachedResult.createdAt < CACHE_DURATION
  ) {
    return cachedResult.data;
  }

  const response = await fetch(WEEKLY_CSV_URL, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Weekly CSV request failed: ${response.status}`);
  }

  const csv = await response.text();

  if (!csv.trim()) {
    throw new Error('Weekly CSV is empty');
  }

  const rows = parseCSV(csv);
  const historyBySong = new Map<string, RawEntry[]>();

  for (const row of rows) {
    const week = row[0]?.trim() ?? '';
    const rank = Number(row[1]?.trim() ?? 0);
    const content = row[2]?.trim() ?? '';
    const pointsValue = Number((row[3] ?? '').trim().replace(/,/g, ''));
    const artwork = row[10]?.trim() ?? '';

    if (!week || !parseDate(week) || rank <= 0 || !content) {
      continue;
    }

    const parts = content
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);

    const title = parts[0] ?? '';
    const artist = parts[1] ?? '';

    if (!title || !artist) continue;

    const entry: RawEntry = {
      week,
      rank,
      title,
      artist,
      artwork: artwork || undefined,
      points: Number.isFinite(pointsValue) && pointsValue > 0
        ? pointsValue
        : undefined,
    };

    const key = songKey(title, artist);
    const existing = historyBySong.get(key);

    if (existing) {
      existing.push(entry);
    } else {
      historyBySong.set(key, [entry]);
    }
  }

  const songs: NumberOneSong[] = [];

  for (const history of historyBySong.values()) {
    history.sort((a, b) => parseDate(a.week) - parseDate(b.week));

    const numberOneEntries = history.filter((entry) => entry.rank === 1);

    if (numberOneEntries.length === 0) continue;

    const numberOneWeeks: NumberOneWeek[] = numberOneEntries.map((entry) => ({
      week: entry.week,
      points: entry.points ?? null,
      weeksOnChart: history.filter(
        (historyEntry) => parseDate(historyEntry.week) <= parseDate(entry.week),
      ).length,
    }));

    const first = numberOneEntries[0];
    const last = numberOneEntries[numberOneEntries.length - 1];

    songs.push({
      title: first.title,
      artist: first.artist,
      artwork: history.find((entry) => entry.artwork)?.artwork,
      firstNo1: first.week,
      lastNo1: last.week,
      totalWeeksAtNo1: numberOneEntries.length,
      numberOneWeeks,
    });
  }

  songs.sort((a, b) => parseDate(a.firstNo1) - parseDate(b.firstNo1));

  cachedResult = {
    data: songs,
    createdAt: Date.now(),
  };

  return songs;
}

export async function GET() {
  try {
    const songs = await getNumberOneSongs();

    return NextResponse.json(
      { songs },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      },
    );
  } catch (error) {
    console.error('No. 1 history API error:', error);

    return NextResponse.json(
      { error: 'Failed to load No. 1 history', songs: [] },
      { status: 500 },
    );
  }
}
