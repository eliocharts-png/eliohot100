import Papa from 'papaparse';

import type {
  ChartEntry,
  WeeklyChartEntry,
  WeeklyChartPayload,
  MovementIcon,
} from '@/types';

export interface ChartSource {
  title: string;
  href: string;
  csvUrl: string;
}

export const sheetSources: ChartSource[] = [
  {
    title: 'THE HOT 100',
    href: '/weekly',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv',
  },
  {
    title: 'Greatest of All-Time',
    href: '/goat',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWOeHot100ExampleGoat/pub?output=csv',
  },
  {
    title: 'Year-End',
    href: '/year-end',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWOeHot100ExampleYearEnd/pub?output=csv',
  },
];

const fallbackChartData: Record<
  string,
  ChartEntry[]
> = {
  'THE HOT 100': [
    {
      rank: 1,
      title: 'Flowers',
      artist: 'Miley Cyrus',
    },
    {
      rank: 2,
      title: 'Last Night',
      artist: 'Morgan Wallen',
    },
    {
      rank: 3,
      title: 'Die For You',
      artist: 'The Weeknd',
    },
    {
      rank: 4,
      title: 'Kill Bill',
      artist: 'SZA',
    },
    {
      rank: 5,
      title: 'Calm Down',
      artist: 'Rema & Selena Gomez',
    },
  ],

  'Greatest of All-Time': [
    {
      rank: 1,
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
    },
    {
      rank: 2,
      title: 'Imagine',
      artist: 'John Lennon',
    },
    {
      rank: 3,
      title: 'Billie Jean',
      artist: 'Michael Jackson',
    },
    {
      rank: 4,
      title: 'Smells Like Teen Spirit',
      artist: 'Nirvana',
    },
    {
      rank: 5,
      title: 'Hey Jude',
      artist: 'The Beatles',
    },
  ],

  'Year-End': [
    {
      rank: 1,
      title: 'As It Was',
      artist: 'Harry Styles',
    },
    {
      rank: 2,
      title: 'Anti-Hero',
      artist: 'Taylor Swift',
    },
    {
      rank: 3,
      title: 'Unholy',
      artist: 'Sam Smith & Kim Petras',
    },
    {
      rank: 4,
      title: 'About Damn Time',
      artist: 'Lizzo',
    },
    {
      rank: 5,
      title: 'Bad Habit',
      artist: 'Steve Lacy',
    },
  ],
};

function getMovementArrow(
  currentRank: number,
  lastRank: number | null
) {
  if (lastRank === null) {
    return 'NEW' as const;
  }

  if (currentRank < lastRank) {
    return '▲' as const;
  }

  if (currentRank > lastRank) {
    return '▼' as const;
  }

  return '→' as const;
}

function getMovementIcon(
  currentRank: number,
  lastRank: number | null,
  hasAnyPriorAppearance: boolean
): MovementIcon {
  if (lastRank === null) {
    return hasAnyPriorAppearance
      ? 'reentry'
      : 'debut';
  }

  if (currentRank < lastRank) {
    return 'up';
  }

  if (currentRank > lastRank) {
    return 'down';
  }

  return 'nonmover';
}

function parseChartDate(
  value: string
): number {
  const [month, day, year] =
    value.split('/').map(Number);

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

function formatDateLabel(
  dateString: string
): string {
  if (!dateString) {
    return 'UNKNOWN';
  }

  const [month, day, year] =
    dateString.split('/').map(Number);

  if (
    !month ||
    !day ||
    year === undefined
  ) {
    return dateString.toUpperCase();
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  return `WEEK OF ${
    months[month - 1]
  } ${day}, ${fullYear}`;
}

export { formatDateLabel };

type RawRow = {
  week: string;
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
  points?: number;
};

function songKey(
  title: string,
  artist: string
): string {
  return (
    `${title.toLowerCase()}|||` +
    artist.toLowerCase()
  );
}

function createFallbackPayload(
  title: string
): WeeklyChartPayload {
  const fallback =
    fallbackChartData[title] ?? [];

  return {
    week: '',
    displayWeek: 'UNKNOWN',
    availableWeeks: [],
    weeksAtNumberOne: 0,
    entries: fallback.map(
      (entry): WeeklyChartEntry => ({
        ...entry,
        week: '',
        artwork: undefined,
        points: undefined,
        lastWeekRank: null,
        lastWeekPoints: undefined,
        peakPosition: entry.rank,
        weeksOnChart: 1,
        arrow: 'NEW',
        movementIcon: 'debut',
        hasAnyPriorAppearance: false,
        chartHistory: [],
      })
    ),
  };
}

function parseCsv(
  csvText: string
): RawRow[] {
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows =
    parsed.data as string[][];

  return rows
    .map((row): RawRow => {
      const week =
        row[0]?.trim() ?? '';

      const rank =
        Number(row[1]?.trim() ?? 0);

      const content =
        row[2]?.trim() ?? '';

      const pointsNumber =
        Number(row[3]?.trim() ?? 0);

      const artwork =
        row[10]?.trim() ?? '';

      const parts =
        content
          .split(/\r?\n/)
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

      return {
        week,
        rank,
        title:
          parts[0] ?? content,
        artist:
          parts[1] ?? '',
        artwork:
          artwork || undefined,
        points:
          pointsNumber > 0
            ? pointsNumber
            : undefined,
      };
    })
    .filter(
      (row) =>
        row.week &&
        row.rank > 0 &&
        row.title
    );
}

export async function fetchChartData(
  csvUrl: string,
  title: string
): Promise<ChartEntry[]> {
  try {
    const response =
      await fetch(csvUrl, {
        cache: 'no-store',
      });

    if (!response.ok) {
      return (
        fallbackChartData[title] ??
        []
      );
    }

    const csvText =
      await response.text();

    const rows =
      parseCsv(csvText);

    if (rows.length === 0) {
      return (
        fallbackChartData[title] ??
        []
      );
    }

    const latestWeek =
      rows.reduce(
        (latest, row) => {
          if (!latest) {
            return row.week;
          }

          return parseChartDate(
            row.week
          ) >
            parseChartDate(latest)
            ? row.week
            : latest;
        },
        ''
      );

    return rows
      .filter(
        (row) =>
          row.week === latestWeek
      )
      .map(
        (row): ChartEntry => ({
          rank: row.rank,
          title: row.title,
          artist: row.artist,
        })
      )
      .sort(
        (a, b) =>
          a.rank - b.rank
      );
  } catch {
    return (
      fallbackChartData[title] ??
      []
    );
  }
}

export async function fetchWeeklyChartData(
  csvUrl: string,
  title: string,
  selectedWeek?: string
): Promise<WeeklyChartPayload> {
  try {
    /*
     * Fetch CSV.
     */
    const response =
      await fetch(csvUrl, {
        cache: 'no-store',
      });

    if (!response.ok) {
      return createFallbackPayload(
        title
      );
    }

    const csvText =
      await response.text();

    /*
     * Parse exactly once.
     */
    const rows =
      parseCsv(csvText);

    if (rows.length === 0) {
      return createFallbackPayload(
        title
      );
    }

    /*
     * Get every available week.
     */
    const weekSet =
      new Set<string>();

    for (const row of rows) {
      weekSet.add(row.week);
    }

    const availableWeeks =
      Array.from(weekSet).sort(
        (a, b) =>
          parseChartDate(a) -
          parseChartDate(b)
      );

    if (
      availableWeeks.length === 0
    ) {
      return createFallbackPayload(
        title
      );
    }

    /*
     * Determine selected week.
     *
     * If no week was provided,
     * use the latest week.
     */
    let currentWeek =
      selectedWeek &&
      availableWeeks.includes(
        selectedWeek
      )
        ? selectedWeek
        : availableWeeks[
            availableWeeks.length - 1
          ];

    /*
     * Find previous week.
     */
    const currentIndex =
      availableWeeks.indexOf(
        currentWeek
      );

    const previousWeek =
      currentIndex > 0
        ? availableWeeks[
            currentIndex - 1
          ]
        : '';

    /*
     * Current week rows.
     */
    const currentRows =
      rows.filter(
        (row) =>
          row.week === currentWeek
      );

    /*
     * Previous week rows.
     */
    const previousRows =
      rows.filter(
        (row) =>
          row.week === previousWeek
      );

    /*
     * Previous-week lookup.
     */
    const previousMap =
      new Map<
        string,
        RawRow
      >();

    for (const row of previousRows) {
      previousMap.set(
        songKey(
          row.title,
          row.artist
        ),
        row
      );
    }

    /*
     * Build song history only for songs
     * appearing on the selected week.
     */
    const selectedSongs =
      new Set<string>();

    for (const row of currentRows) {
      selectedSongs.add(
        songKey(
          row.title,
          row.artist
        )
      );
    }

    const historyMap =
      new Map<
        string,
        {
          peak: number;
          weeks: number;
          appearedBefore: boolean;
          chartHistory: {
            week: string;
            rank: number;
          }[];
        }
      >();

    for (const row of rows) {
      const key =
        songKey(
          row.title,
          row.artist
        );

      if (
        !selectedSongs.has(key)
      ) {
        continue;
      }

      let history =
        historyMap.get(key);

      if (!history) {
        history = {
          peak: row.rank,
          weeks: 0,
          appearedBefore: false,
          chartHistory: [],
        };

        historyMap.set(
          key,
          history
        );
      }

      history.peak =
        Math.min(
          history.peak,
          row.rank
        );

      history.weeks++;

      if (
        parseChartDate(row.week) <
        parseChartDate(currentWeek)
      ) {
        history.appearedBefore =
          true;
      }

      history.chartHistory.push({
        week: row.week,
        rank: row.rank,
      });
    }

    /*
     * Sort selected songs' histories.
     */
    for (
      const history of
        historyMap.values()
    ) {
      history.chartHistory.sort(
        (a, b) =>
          parseChartDate(
            a.week
          ) -
          parseChartDate(
            b.week
          )
      );
    }

    /*
     * Count weeks at #1 for the
     * current #1 song.
     */
    const numberOne =
      currentRows.find(
        (row) =>
          row.rank === 1
      );

    let weeksAtNumberOne = 0;

    if (numberOne) {
      const numberOneKey =
        songKey(
          numberOne.title,
          numberOne.artist
        );

      for (const row of rows) {
        if (
          row.rank !== 1 ||
          parseChartDate(
            row.week
          ) >
            parseChartDate(
              currentWeek
            )
        ) {
          continue;
        }

        if (
          songKey(
            row.title,
            row.artist
          ) === numberOneKey
        ) {
          weeksAtNumberOne++;
        }
      }
    }

    /*
     * Build entries.
     */
    const entries =
      currentRows
        .map(
          (
            row
          ): WeeklyChartEntry => {
            const key =
              songKey(
                row.title,
                row.artist
              );

            const previous =
              previousMap.get(
                key
              ) ?? null;

            const history =
              historyMap.get(
                key
              );

            const appearedBefore =
              history?.appearedBefore ??
              false;

            const movementIcon =
              getMovementIcon(
                row.rank,
                previous
                  ? previous.rank
                  : null,
                appearedBefore
              );

            return {
              week: currentWeek,

              rank: row.rank,

              title: row.title,

              artist: row.artist,

              artwork: row.artwork,

              points: row.points,

              lastWeekRank:
                previous
                  ? previous.rank
                  : null,

              lastWeekPoints:
                previous
                  ? previous.points
                  : undefined,

              peakPosition:
                history?.peak ??
                row.rank,

              weeksOnChart:
                history?.weeks ??
                1,

              arrow:
                getMovementArrow(
                  row.rank,
                  previous
                    ? previous.rank
                    : null
                ),

              movementIcon,

              hasAnyPriorAppearance:
                appearedBefore,

              chartHistory:
                history?.chartHistory ??
                [],
            };
          }
        )
        .sort(
          (a, b) =>
            a.rank - b.rank
        );

    return {
      week: currentWeek,

      displayWeek:
        formatDateLabel(
          currentWeek
        ),

      availableWeeks,

      weeksAtNumberOne,

      entries,
    };
  } catch (error) {
    console.error(
      'Failed to fetch weekly chart data:',
      error
    );

    return createFallbackPayload(
      title
    );
  }
}