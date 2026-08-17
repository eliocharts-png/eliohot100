import { NextResponse } from 'next/server';

const WEEKLY_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

type HistoryEntry = {
  week: string;
  rank: number;
};

type CachedHistory = {
  data: Map<string, HistoryEntry[]>;
  createdAt: number;
};

const CACHE_DURATION = 5 * 60 * 1000;

let historyCache: CachedHistory | null = null;

function songKey(
  title: string,
  artist: string
): string {
  return (
    `${title.toLowerCase().trim()}|||` +
    artist.toLowerCase().trim()
  );
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (
    let i = 0;
    i < csv.length;
    i += 1
  ) {
    const char = csv[i];

    if (char === '"') {
      if (
        quoted &&
        csv[i + 1] === '"'
      ) {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (
      char === ',' &&
      !quoted
    ) {
      row.push(value);
      value = '';
      continue;
    }

    if (
      (char === '\n' ||
        char === '\r') &&
      !quoted
    ) {
      if (
        char === '\r' &&
        csv[i + 1] === '\n'
      ) {
        i += 1;
      }

      row.push(value);
      value = '';

      if (
        row.some(
          (cell) =>
            cell.trim() !== ''
        )
      ) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (
    value !== '' ||
    row.length > 0
  ) {
    row.push(value);

    if (
      row.some(
        (cell) =>
          cell.trim() !== ''
      )
    ) {
      rows.push(row);
    }
  }

  return rows;
}

function parseDate(
  value: string
): number {
  const [
    month,
    day,
    year,
  ] = value
    .split('/')
    .map(Number);

  if (
    !month ||
    !day ||
    year === undefined
  ) {
    return 0;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  return new Date(
    fullYear,
    month - 1,
    day
  ).getTime();
}

/*
 * Download and parse the giant Weekly CSV
 * only once per cache period.
 *
 * This is the important fix:
 *
 * BEFORE:
 * Every GOAT click downloaded ~10 MB.
 *
 * NOW:
 * The first request builds the history map.
 * Subsequent GOAT clicks reuse it.
 */
async function getHistoryMap(): Promise<
  Map<string, HistoryEntry[]>
> {
  const now = Date.now();

  if (
    historyCache &&
    now -
      historyCache.createdAt <
      CACHE_DURATION
  ) {
    return historyCache.data;
  }

  const response =
    await fetch(
      WEEKLY_CSV_URL,
      {
        cache: 'no-store',
      }
    );

  if (!response.ok) {
    throw new Error(
      `Weekly chart request failed: ${response.status}`
    );
  }

  const csv =
    await response.text();

  if (!csv.trim()) {
    throw new Error(
      'Weekly chart CSV is empty'
    );
  }

  const rows =
    parseCSV(csv);

  const map = new Map<
    string,
    HistoryEntry[]
  >();

  for (const row of rows) {
    const week =
      row[0]?.trim() ?? '';

    const rank =
      Number(
        row[1]?.trim() ?? 0
      );

    const content =
      row[2]?.trim() ?? '';

    if (
      !week ||
      rank <= 0 ||
      !content
    ) {
      continue;
    }

    const parts =
      content
        .split(/\r?\n/)
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean);

    const title =
      parts[0] ?? '';

    const artist =
      parts[1] ?? '';

    if (!title || !artist) {
      continue;
    }

    const key =
      songKey(
        title,
        artist
      );

    const existing =
      map.get(key);

    const entry = {
      week,
      rank,
    };

    if (existing) {
      existing.push(entry);
    } else {
      map.set(key, [
        entry,
      ]);
    }
  }

  /*
   * Sort each song's history once.
   * We don't need to sort it again
   * every time somebody clicks a graph.
   */
  for (const history of map.values()) {
    history.sort(
      (a, b) =>
        parseDate(a.week) -
        parseDate(b.week)
    );
  }

  historyCache = {
    data: map,
    createdAt: now,
  };

  return map;
}

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const title =
      searchParams
        .get('title')
        ?.trim();

    const artist =
      searchParams
        .get('artist')
        ?.trim();

    if (
      !title ||
      !artist
    ) {
      return NextResponse.json(
        {
          error:
            'Missing title or artist',
        },
        {
          status: 400,
        }
      );
    }

    const historyMap =
      await getHistoryMap();

    const key =
      songKey(
        title,
        artist
      );

    const history =
      historyMap.get(key) ??
      [];

    return NextResponse.json(
      {
        history,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=300, s-maxage=300',
        },
      }
    );
  } catch (error) {
    console.error(
      'Chart history API error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Failed to load chart history',
      },
      {
        status: 500,
      }
    );
  }
}