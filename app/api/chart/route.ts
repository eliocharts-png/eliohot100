import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
};

type RawRow = string[];

function parseSongArtist(content: string): {
  title: string;
  artist: string;
} {
  const parts = content
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: parts[0] ?? content,
    artist: parts[1] ?? '',
  };
}

function parseCsvRows(csvText: string): RawRow[] {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  return parsed.data;
}

function parseGoat(
  rows: RawRow[]
): ChartEntry[] {
  return rows
    .map((row): ChartEntry | null => {
      const rank = Number(
        row[0]?.trim() ?? 0
      );

      const content =
        row[1]?.trim() ?? '';

      const artwork =
        row[2]?.trim() ?? '';

      if (
        rank <= 0 ||
        !content
      ) {
        return null;
      }

      const song =
        parseSongArtist(content);

      return {
        rank,
        title: song.title,
        artist: song.artist,
        artwork:
          artwork || undefined,
      };
    })
    .filter(
      (
        entry
      ): entry is ChartEntry =>
        entry !== null
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    )
    .slice(0, 5);
}

function parseYearEnd(
  rows: RawRow[]
): ChartEntry[] {
  const entries: Array<
    ChartEntry & { year: string }
  > = [];

  for (const row of rows) {
    const year =
      row[0]?.trim() ?? '';

    const rank = Number(
      row[1]?.trim() ?? 0
    );

    const content =
      row[2]?.trim() ?? '';

    const artwork =
      row[3]?.trim() ?? '';

    if (
      !year ||
      rank <= 0 ||
      !content
    ) {
      continue;
    }

    const song =
      parseSongArtist(content);

    entries.push({
      year,
      rank,
      title: song.title,
      artist: song.artist,
      artwork:
        artwork || undefined,
    });
  }

  /*
   * Homepage Year-End preview:
   * Always show the most recent year.
   *
   * This means 2025 currently, rather
   * than accidentally showing 2010–2014.
   */
  const years = Array.from(
    new Set(
      entries.map(
        (entry) => entry.year
      )
    )
  ).sort(
    (a, b) =>
      Number(b) - Number(a)
  );

  const latestYear =
    years[0];

  if (!latestYear) {
    return [];
  }

  return entries
    .filter(
      (entry) =>
        entry.year === latestYear
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    )
    .slice(0, 5)
    .map(
      ({
        year: _year,
        ...entry
      }) => entry
    );
}

function parseWeekly(
  rows: RawRow[]
): ChartEntry[] {
  const entries: Array<
    ChartEntry & {
      week: string;
    }
  > = [];

  for (const row of rows) {
    const week =
      row[0]?.trim() ?? '';

    const rank = Number(
      row[1]?.trim() ?? 0
    );

    const content =
      row[2]?.trim() ?? '';

    /*
     * D = points
     * K = artwork
     */
    const artwork =
      row[10]?.trim() ?? '';

    if (
      !week ||
      rank <= 0 ||
      !content
    ) {
      continue;
    }

    const song =
      parseSongArtist(content);

    entries.push({
      week,
      rank,
      title: song.title,
      artist: song.artist,
      artwork:
        artwork || undefined,
    });
  }

  if (entries.length === 0) {
    return [];
  }

  /*
   * Convert a chart date into a number
   * so the newest week can be found.
   */
  function dateValue(
    value: string
  ): number {
    const parts =
      value.split('/').map(Number);

    if (parts.length !== 3) {
      return 0;
    }

    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

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

  const latestWeek =
    entries.reduce(
      (latest, entry) => {
        if (!latest) {
          return entry.week;
        }

        return dateValue(
          entry.week
        ) >
          dateValue(latest)
          ? entry.week
          : latest;
      },
      ''
    );

  return entries
    .filter(
      (entry) =>
        entry.week === latestWeek
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    )
    .slice(0, 5)
    .map(
      ({
        week: _week,
        ...entry
      }) => entry
    );
}

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      request.nextUrl.searchParams.get(
        'url'
      );

    const title =
      request.nextUrl.searchParams.get(
        'title'
      ) ?? '';

    if (!url) {
      return NextResponse.json(
        {
          error:
            'Missing chart URL',
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await fetch(url, {
        cache: 'no-store',
      });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            `Google Sheets request failed: HTTP ${response.status}`,
        },
        {
          status: 502,
        }
      );
    }

    const csvText =
      await response.text();

    if (!csvText.trim()) {
      return NextResponse.json(
        {
          entries: [],
        }
      );
    }

    const rows =
      parseCsvRows(csvText);

    let entries: ChartEntry[] = [];

    if (
      title ===
      'Greatest of All-Time'
    ) {
      entries = parseGoat(rows);
    } else if (
      title === 'Year-End'
    ) {
      entries =
        parseYearEnd(rows);
    } else {
      entries =
        parseWeekly(rows);
    }

    return NextResponse.json({
      entries,
    });
  } catch (error) {
    console.error(
      'Chart API error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Failed to load chart data',
        entries: [],
      },
      {
        status: 500,
      }
    );
  }
}