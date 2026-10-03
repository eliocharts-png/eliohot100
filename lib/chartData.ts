import Papa from 'papaparse';

import type {
  ChartEntry,
  WeeklyChartEntry,
  WeeklyChartPayload,
  MovementIcon,
  RecurrentChartEntry,
  RecurrentChartPayload,
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
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=861998262&single=true&output=csv',
  },
  {
    title: 'Greatest of All-Time Filipino Songs',
    href: '/goat/filipino',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1687213192&single=true&output=csv',
  },
  {
    title: 'Greatest of All-Time No. 2 Songs',
    href: '/goat/no-2',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1145220552&single=true&output=csv',
  },
  {
    title: 'Greatest of All-Time Female Songs',
    href: '/goat/female',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=52589889&single=true&output=csv',
  },
  {
    title: 'Decade-End 2010s',
    href: '/decade-end/2010s',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1710077475&single=true&output=csv',
  },
  {
    title: 'Year-End',
    href: '/year-end',
    csvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCwhJoNSmVVS7klopONiGjob6kaRw_1CyjviTVffP_WdbMKZEo4xs_ou7nv-mkd14u25T0KcDshHdJ/pub?gid=1658746037&single=true&output=csv',
  },
];

function getMovementArrow(
  currentRank: number,
  lastRank: number | null
): 'NEW' | '▲' | '▼' | '→' {
  if (lastRank === null) {
    return 'NEW';
  }

  if (currentRank < lastRank) {
    return '▲';
  }

  if (currentRank > lastRank) {
    return '▼';
  }

  return '→';
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
  const parts = value
    .split('/')
    .map(Number);

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

function formatDateLabel(
  dateString: string
): string {
  if (!dateString) {
    return 'UNKNOWN';
  }

  const parts = dateString
    .split('/')
    .map(Number);

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

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

  return `WEEK OF ${months[month - 1]} ${day}, ${fullYear}`;
}

export {
  formatDateLabel,
};

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

function parseCsv(
  csvText: string
): RawRow[] {
  const parsed = Papa.parse(
    csvText,
    {
      header: false,
      skipEmptyLines: true,
    }
  );

  const rows =
    parsed.data as string[][];

  return rows
    .map(
      (
        row
      ): RawRow => {
        const week =
          row[0]?.trim() ?? '';

        const rank =
          Number(
            row[1]?.trim() ?? 0
          );

        const content =
          row[2]?.trim() ?? '';

        const pointsNumber =
          Number(
            row[3]?.trim() ?? 0
          );

        const artwork =
          row[10]?.trim() ?? '';

        const parts =
          content
            .split(/\r?\n/)
            .map(
              (value) =>
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
      }
    )
    .filter(
      (row) =>
        row.week &&
        row.rank > 0 &&
        row.title
    );
}

function parseGoatCsv(
  csvText: string
): ChartEntry[] {
  const parsed = Papa.parse(
    csvText,
    {
      header: false,
      skipEmptyLines: true,
    }
  );

  const rows =
    parsed.data as string[][];

  return rows
    .map(
      (
        row
      ): ChartEntry | null => {
        const rank =
          Number(
            row[0]?.trim() ?? 0
          );

        const content =
          row[1]?.trim() ?? '';

        const image =
          row[2]?.trim() ?? '';

        if (
          !Number.isFinite(rank) ||
          rank <= 0 ||
          !content
        ) {
          return null;
        }

        const normalizedContent =
          content.replace(
            /<br\s*\/?>/gi,
            '\n'
          );

        const parts =
          normalizedContent
            .split(/\r?\n/)
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean);

        return {
          rank,
          title:
            parts[0] ?? content,
          artist:
            parts[1] ?? '',
          artwork:
            image || undefined,
        };
      }
    )
    .filter(
      (
        entry
      ): entry is ChartEntry =>
        entry !== null
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    );
}

/*
 * ============================================================
 * DECADE-END
 * ============================================================
 */

function parseDecadeEndCsv(
  csvText: string
): ChartEntry[] {
  const parsed = Papa.parse(
    csvText,
    {
      header: false,
      skipEmptyLines: true,
    }
  );

  const rows =
    parsed.data as string[][];

  return rows
    .map(
      (
        row
      ): ChartEntry | null => {
        const rank =
          Number(
            row[0]?.trim() ?? 0
          );

        const content =
          row[1]?.trim() ?? '';

        const image =
          row[2]?.trim() ?? '';

        if (
          rank <= 0 ||
          !content
        ) {
          return null;
        }

        const parts =
          content
            .split(/\r?\n/)
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean);

        return {
          rank,
          title:
            parts[0] ?? content,
          artist:
            parts[1] ?? '',
          artwork:
            image || undefined,
        };
      }
    )
    .filter(
      (
        entry
      ): entry is ChartEntry =>
        entry !== null
    )
    .sort(
      (a, b) =>
        a.rank - b.rank
    );
}

type YearEndChartEntry =
  ChartEntry & {
    year: string;
  };

function parseYearEndCsv(
  csvText: string
): ChartEntry[] {
  const parsed = Papa.parse(
    csvText,
    {
      header: false,
      skipEmptyLines: true,
    }
  );

  const rows =
    parsed.data as string[][];

  const entries:
    YearEndChartEntry[] = [];

  for (const row of rows) {
    const year =
      row[0]?.trim() ?? '';

    const rank =
      Number(
        row[1]?.trim() ?? 0
      );

    const content =
      row[2]?.trim() ?? '';

    const image =
      row[3]?.trim() ?? '';

    if (
      !year ||
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

    entries.push({
      year,
      rank,
      title:
        parts[0] ?? content,
      artist:
        parts[1] ?? '',
      artwork:
        image || undefined,
    });
  }

  entries.sort(
    (a, b) => {
      const yearDifference =
        Number(b.year) -
        Number(a.year);

      if (
        yearDifference !== 0
      ) {
        return yearDifference;
      }

      return (
        a.rank -
        b.rank
      );
    }
  );

  return entries.map(
    ({
      year: _year,
      ...entry
    }) => entry
  );
}

/*
 * ============================================================
 * CACHE-BUSTING GOOGLE SHEETS REQUEST
 * ============================================================
 */

function getFreshCsvUrl(
  csvUrl: string
): string {
  const separator =
    csvUrl.includes('?')
      ? '&'
      : '?';

  return `${csvUrl}${separator}_=${Date.now()}`;
}

export async function fetchChartData(
  csvUrl: string,
  title: string
): Promise<ChartEntry[]> {
  if (!csvUrl) {
    console.error(
      `No CSV URL configured for ${title}`
    );

    return [];
  }

  try {
    const freshUrl =
      getFreshCsvUrl(csvUrl);

    const response =
      await fetch(
        freshUrl,
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      console.error(
        `Failed to fetch ${title}: HTTP ${response.status}`
      );

      return [];
    }

    const csvText =
      await response.text();

    if (!csvText.trim()) {
      console.error(
        `Google Sheets returned empty data for ${title}`
      );

      return [];
    }

    if (
      title ===
        'Greatest of All-Time' ||
      title ===
        'Greatest of All-Time Filipino Songs' ||
      title ===
        'Greatest of All-Time No. 2 Songs' ||
      title ===
        'Greatest of All-Time Female Songs'
    ) {
      return parseGoatCsv(
        csvText
      );
    }

    if (
      title ===
      'Decade-End 2010s'
    ) {
      return parseDecadeEndCsv(
        csvText
      );
    }

    if (
      title ===
      'Year-End'
    ) {
      return parseYearEndCsv(
        csvText
      );
    }

    const rows =
      parseCsv(csvText);

    if (rows.length === 0) {
      console.error(
        `No chart rows found for ${title}`
      );

      return [];
    }

    const latestWeek =
      rows.reduce(
        (
          latest,
          row
        ) => {
          if (!latest) {
            return row.week;
          }

          return (
            parseChartDate(
              row.week
            ) >
            parseChartDate(
              latest
            )
              ? row.week
              : latest
          );
        },
        ''
      );

    if (!latestWeek) {
      return [];
    }

    return rows
      .filter(
        (row) =>
          row.week ===
          latestWeek
      )
      .map(
        (
          row
        ): ChartEntry => ({
          rank: row.rank,
          title: row.title,
          artist: row.artist,
          artwork:
            row.artwork,
        })
      )
      .sort(
        (a, b) =>
          a.rank - b.rank
      );
  } catch (error) {
    console.error(
      `Failed to fetch ${title}:`,
      error
    );

    return [];
  }
}

/*
 * ============================================================
 * RECURRENT HOT 100
 * ============================================================
 *
 * Recurrent chart begins:
 *
 *     AUGUST 19, 2010
 *
 * Modern recurrency rules begin:
 *
 *     FEBRUARY 24, 2022
 *
 * Modern eligibility when a song leaves the Hot 100:
 *
 *     More than 20 weeks on chart
 *
 * First recurrent week:
 *
 *     last Hot 100 points × 1.02
 *
 * Every following recurrent week:
 *
 *     normal songs:
 *       previous recurrent points × 0.97
 *
 *     selected Christmas songs:
 *       previous recurrent points × 0.80
 *
 * Recurrent status remains tracked even when a song
 * falls outside the displayed Top 20.
 *
 * Recurrent weeks are cumulative across ALL recurrent
 * appearances, including periods where the song returns
 * to the main Hot 100.
 */

const FIRST_RECURRENT_WEEK =
  '08/19/10';

const MODERN_RECURRENCY_WEEK =
  '02/24/22';

/*
 * ============================================================
 * SPECIAL CHRISTMAS RECURRENT DECAY
 * ============================================================
 *
 * These three songs receive a 20% weekly recurrent
 * points deduction after their first recurrent week.
 *
 * First recurrent week remains the normal +2%.
 *
 * Every following recurrent week:
 *
 *     previous recurrent points × 0.80
 *
 * All other songs continue using × 0.97.
 */

const CHRISTMAS_RECURRENT_SONGS =
  new Set([
    songKey(
      'All I Want for Christmas Is You',
      'Mariah Carey'
    ),
    songKey(
      'Santa Tell Me',
      'Ariana Grande'
    ),
    songKey(
      "Rockin' Around The Christmas The Tree",
      'Brenda Lee'
    ),
    songKey(
      'Jingle Bell Rock',
      'Bobby Helms'
    ),
    songKey(
      'Last Christmas',
      'Wham!'
    ), 
  ]);

function isChristmasRecurrentSong(
  title: string,
  artist: string
): boolean {
  const normalizedTitle =
    title
      .toLowerCase()
      .replace(/[’']/g, "'")
      .trim();

  const normalizedArtist =
    artist
      .toLowerCase()
      .trim();

  const normalizedKey =
    `${normalizedTitle}|||${normalizedArtist}`;

  return (
    CHRISTMAS_RECURRENT_SONGS.has(
      normalizedKey
    ) ||
    normalizedKey ===
      songKey(
        'Rockin Around The Christmas The Tree',
        'Brenda Lee'
      )
  );
}

type RecurrentState = {
  title: string;
  artist: string;
  artwork?: string;
  recurrentPoints: number;
  recurrentWeeks: number;
  hasPriorRecurrentAppearance: boolean;
  peakPosition: number | null;
};

function roundRecurrentPoints(
  points: number
): number {
  return (
    Math.round(
      points * 100
    ) / 100
  );
}

function isModernRecurrencyWeek(
  week: string
): boolean {
  return (
    parseChartDate(week) >=
    parseChartDate(
      MODERN_RECURRENCY_WEEK
    )
  );
}

function isRecurrentEligibleModern(
  entry: WeeklyChartEntry
): boolean {
  /*
   * More than 20 weeks and below No. 50.
   */
  if (
    entry.weeksOnChart > 20 &&
    entry.rank > 50
  ) {
    return true;
  }

  /*
   * 53 weeks or more and below No. 30.
   */
  if (
    entry.weeksOnChart >= 53 &&
    entry.rank > 30
  ) {
    return true;
  }

  return false;
}

export function calculateRecurrentChart(
  weeklyData: WeeklyChartPayload
): RecurrentChartPayload {
  const chronologicalWeeks =
    [...weeklyData.availableWeeks].sort(
      (a, b) =>
        parseChartDate(a) -
        parseChartDate(b)
    );

  const firstRecurrentDate =
    parseChartDate(
      FIRST_RECURRENT_WEEK
    );

  const entriesByWeek:
    Record<
      string,
      RecurrentChartEntry[]
    > = {};

  /*
   * Contains ALL active recurrent songs,
   * not only the displayed Top 20.
   */
  const recurrentState =
    new Map<
      string,
      RecurrentState
    >();

  /*
   * Remembers every song that has ever
   * entered recurrent.
   */
  const priorRecurrentAppearance =
    new Set<string>();

  /*
   * Stores the latest recurrent point value.
   *
   * This allows a song to return to the
   * Hot 100 and later become recurrent again
   * without receiving another +2% boost.
   */
  const lastRecurrentPoints =
    new Map<
      string,
      number
    >();

  /*
   * Stores the TOTAL number of recurrent
   * chart weeks for every song.
   *
   * This map survives when a song returns
   * to the main Hot 100.
   */
  const recurrentWeekCounts =
    new Map<
      string,
      number
    >();

  /*
   * Stores the highest recurrent-chart
   * position each song has ever achieved.
   */
  const recurrentPeakPositions =
    new Map<
      string,
      number
    >();

  /*
   * Previous displayed recurrent Top 20.
   */
  let previousDisplayedRanks =
    new Map<
      string,
      number
    >();

  /*
   * Previous displayed recurrent points.
   */
  let previousDisplayedPoints =
    new Map<
      string,
      number
    >();

  /*
   * Process chronologically.
   */
  for (
    let weekIndex = 0;
    weekIndex <
    chronologicalWeeks.length;
    weekIndex += 1
  ) {
    const currentWeek =
      chronologicalWeeks[
        weekIndex
      ];

    const currentEntries =
      weeklyData.entriesByWeek[
        currentWeek
      ] ?? [];

    const currentSongKeys =
      new Set(
        currentEntries.map(
          (entry) =>
            songKey(
              entry.title,
              entry.artist
            )
        )
      );

    /*
     * --------------------------------------------------------
     * BEFORE THE RECURRENT CHART STARTED
     * --------------------------------------------------------
     */
    if (
      parseChartDate(
        currentWeek
      ) <
      firstRecurrentDate
    ) {
      entriesByWeek[
        currentWeek
      ] = [];

      continue;
    }

    /*
     * --------------------------------------------------------
     * 1. Remove recurrent status from songs
     *    that returned to the main Hot 100.
     * --------------------------------------------------------
     */
    for (
      const key of Array.from(
        recurrentState.keys()
      )
    ) {
      if (
        currentSongKeys.has(key)
      ) {
        const state =
          recurrentState.get(
            key
          );

        if (state) {
          lastRecurrentPoints.set(
            key,
            state.recurrentPoints
          );

          priorRecurrentAppearance.add(
            key
          );

          if (
            state.peakPosition !==
            null
          ) {
            recurrentPeakPositions.set(
              key,
              state.peakPosition
            );
          }
        }

        recurrentState.delete(
          key
        );
      }
    }

    /*
     * --------------------------------------------------------
     * 2. Find songs that fell off the Hot 100
     *    this week.
     * --------------------------------------------------------
     */
    const newRecurrentKeys =
      new Set<string>();

    if (weekIndex > 0) {
      const previousWeek =
        chronologicalWeeks[
          weekIndex - 1
        ];

      const previousEntries =
        weeklyData.entriesByWeek[
          previousWeek
        ] ?? [];

      for (
        const previousEntry of previousEntries
      ) {
        const key =
          songKey(
            previousEntry.title,
            previousEntry.artist
          );

        /*
         * Still on the main chart.
         */
        if (
          currentSongKeys.has(key)
        ) {
          continue;
        }

        /*
         * Already active on recurrent.
         */
        if (
          recurrentState.has(key)
        ) {
          continue;
        }

        let eligible = false;

        if (
          isModernRecurrencyWeek(
            currentWeek
          )
        ) {
          /*
           * More than 20 Hot 100 weeks.
           *
           * Once the song leaves the main
           * chart, its final rank is no longer
           * used to prevent recurrent status.
           */
          eligible =
            previousEntry.weeksOnChart >=
              20 ||
            isRecurrentEligibleModern(
              previousEntry
            );
        } else {
          /*
           * Historical reconstruction.
           */
          eligible =
            previousEntry.weeksOnChart >=
            20;
        }

        if (!eligible) {
          continue;
        }

        if (
          !previousEntry.points ||
          previousEntry.points <= 0
        ) {
          continue;
        }

        const hasPriorRecurrentAppearance =
          priorRecurrentAppearance.has(
            key
          ) ||
          lastRecurrentPoints.has(
            key
          );

        let recurrentPoints: number;

        /*
         * FIRST recurrent appearance:
         *
         * Last Hot 100 points × 1.02
         *
         * This remains unchanged even for
         * the selected Christmas songs.
         */
        if (
          !hasPriorRecurrentAppearance
        ) {
          recurrentPoints =
            roundRecurrentPoints(
              previousEntry.points *
                1.02
            );
        } else {
          /*
           * SUBSEQUENT recurrent appearance:
           *
           * Normal songs:
           * Previous recurrent points × 0.97
           *
           * Selected Christmas songs:
           * Previous recurrent points × 0.80
           */
          const previousRecurrentPoints =
            lastRecurrentPoints.get(
              key
            );

          const decayMultiplier =
            isChristmasRecurrentSong(
              previousEntry.title,
              previousEntry.artist
            )
              ? 0.80
              : 0.97;

          recurrentPoints =
            roundRecurrentPoints(
              (
                previousRecurrentPoints ??
                previousEntry.points
              ) *
                decayMultiplier
            );
        }

        /*
         * ----------------------------------------------------
         * CUMULATIVE RECURRENT WEEK COUNT
         * ----------------------------------------------------
         */
        const recurrentWeeks =
          (
            recurrentWeekCounts.get(
              key
            ) ?? 0
          ) + 1;

        recurrentWeekCounts.set(
          key,
          recurrentWeeks
        );

        /*
         * Preserve the previous peak if
         * the song is returning to recurrent.
         */
        const previousPeak =
          recurrentPeakPositions.get(
            key
          ) ?? null;

        recurrentState.set(
          key,
          {
            title:
              previousEntry.title,
            artist:
              previousEntry.artist,
            artwork:
              previousEntry.artwork,
            recurrentPoints,
            recurrentWeeks,
            hasPriorRecurrentAppearance,
            peakPosition:
              previousPeak,
          }
        );

        newRecurrentKeys.add(
          key
        );

        lastRecurrentPoints.set(
          key,
          recurrentPoints
        );
      }
    }

    /*
     * --------------------------------------------------------
     * 3. Advance the recurrent week count for songs
     *    that were ALREADY active before this week.
     * --------------------------------------------------------
     */
    for (
      const [
        key,
        state,
      ] of recurrentState.entries()
    ) {
      if (
        newRecurrentKeys.has(key)
      ) {
        continue;
      }

      const recurrentWeeks =
        (
          recurrentWeekCounts.get(
            key
          ) ?? state.recurrentWeeks
        ) + 1;

      recurrentWeekCounts.set(
        key,
        recurrentWeeks
      );

      state.recurrentWeeks =
        recurrentWeeks;
    }

    /*
     * --------------------------------------------------------
     * 4. Apply recurrent decay.
     * --------------------------------------------------------
     *
     * Newly recurrent songs are Week 1
     * and retain their +2% adjustment.
     *
     * Existing recurrent songs:
     *
     * Normal songs:
     *     × 0.97
     *
     * Selected Christmas songs:
     *     × 0.80
     *
     * Returning songs are NOT treated as
     * recurrent debuts.
     */
    for (
      const state of recurrentState.values()
    ) {
      if (
        state.recurrentWeeks > 1
      ) {
        const decayMultiplier =
          isChristmasRecurrentSong(
            state.title,
            state.artist
          )
            ? 0.80
            : 0.97;

        state.recurrentPoints =
          roundRecurrentPoints(
            state.recurrentPoints *
              decayMultiplier
          );
      }
    }

    /*
     * --------------------------------------------------------
     * 5. Rank the COMPLETE recurrent pool.
     * --------------------------------------------------------
     */
    const rankedRecurrentSongs =
      Array.from(
        recurrentState.entries()
      ).sort(
        (
          [, a],
          [, b]
        ) =>
          b.recurrentPoints -
          a.recurrentPoints
      );

    /*
     * --------------------------------------------------------
     * 6. Update the ALL-TIME recurrent peak
     *    for every active recurrent song.
     * --------------------------------------------------------
     */
    rankedRecurrentSongs.forEach(
      (
        [
          key,
          state,
        ],
        index
      ) => {
        const currentPosition =
          index + 1;

        const previousPeak =
          recurrentPeakPositions.get(
            key
          );

        const peakPosition =
          previousPeak === undefined
            ? currentPosition
            : Math.min(
                previousPeak,
                currentPosition
              );

        recurrentPeakPositions.set(
          key,
          peakPosition
        );

        state.peakPosition =
          peakPosition;

        recurrentState.set(
          key,
          state
        );

        lastRecurrentPoints.set(
          key,
          state.recurrentPoints
        );
      }
    );

    /*
     * Historical charts are hidden until
     * there are at least 20 qualifying songs.
     *
     * Modern recurrent charts display whenever
     * at least one qualifying recurrent song exists.
     */
    const shouldDisplayChart =
      isModernRecurrencyWeek(
        currentWeek
      )
        ? rankedRecurrentSongs.length >
          0
        : rankedRecurrentSongs.length >=
          20;

    if (
      !shouldDisplayChart
    ) {
      entriesByWeek[
        currentWeek
      ] = [];

      /*
       * Recurrent state still remains active
       * even when the chart is not displayed.
       */
      for (
        const [
          key,
          state,
        ] of recurrentState.entries()
      ) {
        lastRecurrentPoints.set(
          key,
          state.recurrentPoints
        );

        priorRecurrentAppearance.add(
          key
        );

        state.hasPriorRecurrentAppearance =
          true;
      }

      previousDisplayedRanks =
        new Map();

      previousDisplayedPoints =
        new Map();

      continue;
    }

    /*
     * --------------------------------------------------------
     * 7. Build the displayed Top 20.
     * --------------------------------------------------------
     */
    const displayedSongs =
      rankedRecurrentSongs.slice(
        0,
        20
      );

    const currentDisplayedRanks =
      new Map<
        string,
        number
      >();

    const currentDisplayedPoints =
      new Map<
        string,
        number
      >();

    entriesByWeek[
      currentWeek
    ] = displayedSongs.map(
      (
        [
          key,
          state,
        ],
        index
      ) => {
        const rank =
          index + 1;

        const lastWeekRank =
          previousDisplayedRanks.get(
            key
          ) ?? null;

        const lastWeekPoints =
          previousDisplayedPoints.get(
            key
          );

        const hasAnyPriorAppearance =
          state.hasPriorRecurrentAppearance ||
          priorRecurrentAppearance.has(
            key
          );

        const isRecurrentDebut =
          !hasAnyPriorAppearance &&
          state.recurrentWeeks ===
            1;

        /*
         * BEST-EVER recurrent position.
         */
        const peakPosition =
          recurrentPeakPositions.get(
            key
          ) ??
          state.peakPosition ??
          rank;

        currentDisplayedRanks.set(
          key,
          rank
        );

        currentDisplayedPoints.set(
          key,
          state.recurrentPoints
        );

        return {
          rank,
          title:
            state.title,
          artist:
            state.artist,
          artwork:
            state.artwork,
          week:
            currentWeek,
          points:
            state.recurrentPoints,
          lastWeekRank,
          lastWeekPoints,
          peakPosition,
          weeksOnChart:
            state.recurrentWeeks,
          arrow:
            getMovementArrow(
              rank,
              lastWeekRank
            ),
          movementIcon:
            getMovementIcon(
              rank,
              lastWeekRank,
              hasAnyPriorAppearance
            ),
          hasAnyPriorAppearance,
          chartHistory: [],
          recurrentPoints:
            state.recurrentPoints,
          recurrentWeeks:
            state.recurrentWeeks,
          isRecurrentDebut,
        };
      }
    );

    /*
     * --------------------------------------------------------
     * 8. Remember EVERY active recurrent song.
     * --------------------------------------------------------
     */
    for (
      const [
        key,
        state,
      ] of recurrentState.entries()
    ) {
      priorRecurrentAppearance.add(
        key
      );

      state.hasPriorRecurrentAppearance =
        true;

      lastRecurrentPoints.set(
        key,
        state.recurrentPoints
      );

      /*
       * Keep the persistent peak synchronized.
       */
      if (
        state.peakPosition !== null
      ) {
        recurrentPeakPositions.set(
          key,
          state.peakPosition
        );
      }
    }

    previousDisplayedRanks =
      currentDisplayedRanks;

    previousDisplayedPoints =
      currentDisplayedPoints;

    /*
     * IMPORTANT:
     *
     * There is NO recurrentWeeks += 1 here anymore.
     *
     * The cumulative counter is updated at the
     * beginning of each recurrent week above.
     */
  }

  /*
   * The recurrent chart itself begins on
   * August 19, 2010.
   *
   * Earlier Hot 100 weeks are used internally
   * but are not selectable recurrent weeks.
   */
  const recurrentAvailableWeeks =
    chronologicalWeeks
      .filter(
        (week) =>
          parseChartDate(week) >=
          firstRecurrentDate
      )
      .reverse();

  /*
   * Use the selected week only if it is
   * actually within the recurrent chart.
   *
   * Otherwise use the latest recurrent week.
   */
  const selectedWeek =
    weeklyData.week &&
    recurrentAvailableWeeks.includes(
      weeklyData.week
    )
      ? weeklyData.week
      : recurrentAvailableWeeks[0] ??
        '';

  return {
    week:
      selectedWeek,

    displayWeek:
      formatDateLabel(
        selectedWeek
      ),

    availableWeeks:
      recurrentAvailableWeeks,

    entries:
      entriesByWeek[
        selectedWeek
      ] ?? [],

    entriesByWeek,
  };
}

/*
 * ============================================================
 * RECURRENT DATA FETCHER
 * ============================================================
 */

export async function fetchRecurrentChartData(
  csvUrl: string,
  selectedWeek?: string,
  chartTitle?: string
): Promise<RecurrentChartPayload> {
  const weeklyData =
    await fetchWeeklyChartData(
      csvUrl,
      selectedWeek,
      chartTitle
    );

  return calculateRecurrentChart(
    weeklyData
  );
}

/*
 * ============================================================
 * WEEKLY HOT 100
 * ============================================================
 */

export async function fetchWeeklyChartData(
  csvUrl: string,
  selectedWeek?: string,
  _chartTitle?: string
): Promise<WeeklyChartPayload> {
  if (!csvUrl) {
    return {
      week: '',
      displayWeek: 'UNKNOWN',
      availableWeeks: [],
      weeksAtNumberOne: 0,
      entries: [],
      entriesByWeek: {},
      weeksAtNumberOneByWeek: {},
    };
  }

  try {
    /*
     * Weekly data is approximately 10 MB,
     * so it must never enter Next.js's
     * 2 MB data cache.
     */
    const response =
      await fetch(
        getFreshCsvUrl(csvUrl),
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      console.error(
        `Failed to fetch weekly chart: HTTP ${response.status}`
      );

      return {
        week: '',
        displayWeek: 'UNKNOWN',
        entries: [],
        entriesByWeek: {},
        availableWeeks: [],
        weeksAtNumberOne: 0,
        weeksAtNumberOneByWeek: {},
      };
    }

    const csvText =
      await response.text();

    if (!csvText.trim()) {
      return {
        week: '',
        displayWeek: 'UNKNOWN',
        entries: [],
        entriesByWeek: {},
        availableWeeks: [],
        weeksAtNumberOne: 0,
        weeksAtNumberOneByWeek: {},
      };
    }

    const rows =
      parseCsv(csvText);

    if (rows.length === 0) {
      return {
        week: '',
        displayWeek: 'UNKNOWN',
        entries: [],
        entriesByWeek: {},
        availableWeeks: [],
        weeksAtNumberOne: 0,
        weeksAtNumberOneByWeek: {},
      };
    }

    const groupedRows:
      Record<
        string,
        RawRow[]
      > = {};

    for (const row of rows) {
      if (
        !groupedRows[
          row.week
        ]
      ) {
        groupedRows[
          row.week
        ] = [];
      }

      groupedRows[
        row.week
      ].push(row);
    }

    const availableWeeks =
      Object.keys(
        groupedRows
      ).sort(
        (a, b) =>
          parseChartDate(b) -
          parseChartDate(a)
      );

    if (
      availableWeeks.length ===
      0
    ) {
      return {
        week: '',
        displayWeek: 'UNKNOWN',
        entries: [],
        entriesByWeek: {},
        availableWeeks: [],
        weeksAtNumberOne: 0,
        weeksAtNumberOneByWeek: {},
      };
    }

    const week =
      selectedWeek &&
      groupedRows[selectedWeek]
        ? selectedWeek
        : availableWeeks[0];

    const allHistoryBySong:
      Record<
        string,
        RawRow[]
      > = {};

    for (const row of rows) {
      const key =
        songKey(
          row.title,
          row.artist
        );

      if (
        !allHistoryBySong[key]
      ) {
        allHistoryBySong[key] =
          [];
      }

      allHistoryBySong[key].push(
        row
      );
    }

    for (
      const key of Object.keys(
        allHistoryBySong
      )
    ) {
      allHistoryBySong[key].sort(
        (a, b) =>
          parseChartDate(
            a.week
          ) -
          parseChartDate(
            b.week
          )
      );
    }

    const entriesByWeek:
      Record<
        string,
        WeeklyChartEntry[]
      > = {};

    const weeksAtNumberOneByWeek:
      Record<
        string,
        number
      > = {};

    const cumulativeNumberOneWeeks:
      Record<
        string,
        number
      > = {};

    const chronologicalWeeks =
      [...availableWeeks].sort(
        (a, b) =>
          parseChartDate(a) -
          parseChartDate(b)
      );

    for (
      const currentWeek of chronologicalWeeks
    ) {
      const currentRows =
        groupedRows[
          currentWeek
        ] ?? [];

      const sortedRows =
        [...currentRows].sort(
          (a, b) =>
            a.rank - b.rank
        );

      /*
       * Update cumulative #1 total.
       */
      for (
        const row of sortedRows
      ) {
        if (
          row.rank !== 1
        ) {
          continue;
        }

        const key =
          songKey(
            row.title,
            row.artist
          );

        cumulativeNumberOneWeeks[
          key
        ] =
          (
            cumulativeNumberOneWeeks[
              key
            ] ?? 0
          ) + 1;
      }

      /*
       * Build entries for this week.
       */
      entriesByWeek[
        currentWeek
      ] = sortedRows.map(
        (
          row
        ) => {
          const key =
            songKey(
              row.title,
              row.artist
            );

          const history =
            allHistoryBySong[
              key
            ] ?? [];

          const currentDate =
            parseChartDate(
              currentWeek
            );

          const priorHistory =
            history.filter(
              (
                historyRow
              ) =>
                parseChartDate(
                  historyRow.week
                ) <
                currentDate
            );

          const currentHistory =
            history.filter(
              (
                historyRow
              ) =>
                parseChartDate(
                  historyRow.week
                ) <=
                currentDate
            );

          const previousChartWeekIndex =
            chronologicalWeeks.indexOf(
              currentWeek
            ) - 1;

          const previousChartWeek =
            previousChartWeekIndex >=
            0
              ? chronologicalWeeks[
                  previousChartWeekIndex
                ]
              : undefined;

          const previousWeek =
            previousChartWeek
              ? history.find(
                  (
                    historyRow
                  ) =>
                    historyRow.week ===
                    previousChartWeek
                )
              : undefined;

          const lastWeekRank =
            previousWeek
              ? previousWeek.rank
              : null;

          const hasAnyPriorAppearance =
            priorHistory.length >
            0;

          const peakPosition =
            currentHistory.reduce(
              (
                peak,
                historyRow
              ) =>
                Math.min(
                  peak,
                  historyRow.rank
                ),
              row.rank
            );

          const chartHistory =
            currentHistory.map(
              (
                historyRow
              ) => ({
                week:
                  historyRow.week,
                rank:
                  historyRow.rank,
              })
            );

          return {
            rank:
              row.rank,
            title:
              row.title,
            artist:
              row.artist,
            artwork:
              row.artwork,
            week:
              currentWeek,
            points:
              row.points,
            lastWeekRank,
            lastWeekPoints:
              previousWeek?.points,
            peakPosition,
            weeksOnChart:
              currentHistory.length,
            arrow:
              getMovementArrow(
                row.rank,
                lastWeekRank
              ),
            movementIcon:
              getMovementIcon(
                row.rank,
                lastWeekRank,
                hasAnyPriorAppearance
              ),
            hasAnyPriorAppearance,
            chartHistory,
          };
        }
      );

      /*
       * Find current #1 song.
       */
      const numberOneRow =
        sortedRows.find(
          (row) =>
            row.rank === 1
        );

      if (numberOneRow) {
        const numberOneKey =
          songKey(
            numberOneRow.title,
            numberOneRow.artist
          );

        weeksAtNumberOneByWeek[
          currentWeek
        ] =
          cumulativeNumberOneWeeks[
            numberOneKey
          ] ?? 1;
      } else {
        weeksAtNumberOneByWeek[
          currentWeek
        ] = 0;
      }
    }

    const entries =
      entriesByWeek[
        week
      ] ?? [];

    const weeksAtNumberOne =
      weeksAtNumberOneByWeek[
        week
      ] ?? 0;

    return {
      week,
      displayWeek:
        formatDateLabel(
          week
        ),
      availableWeeks,
      weeksAtNumberOne,
      entries,
      entriesByWeek,
      weeksAtNumberOneByWeek,
    };
  } catch (error) {
    console.error(
      'Failed to fetch weekly chart data:',
      error
    );

    return {
      week: '',
      displayWeek: 'UNKNOWN',
      entries: [],
      entriesByWeek: {},
      availableWeeks: [],
      weeksAtNumberOne: 0,
      weeksAtNumberOneByWeek: {},
    };
  }
}