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
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=861998262&single=true&output=csv',
  },

  /*
   * DECADE-END — 2010s
   */
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

/*
 * DECADE-END
 *
 * This is kept separate from GOAT.
 *
 * The 2010s Decade-End chart uses
 * its own Google Sheets CSV source.
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

  const entries: YearEndChartEntry[] =
    [];

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
 * Adds a cache-busting parameter to
 * Google Sheets CSV requests.
 *
 * Google occasionally returns HTTP 400
 * for repeated requests to the same
 * published CSV URL. A unique query
 * parameter prevents that request from
 * being treated as a stale/reused request.
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

    /*
     * Do not allow Google Sheets
     * responses to enter Next.js's
     * 2 MB data cache.
     *
     * This is especially important
     * for THE HOT 100, which is
     * approximately 10 MB.
     *
     * GOAT and DECADE-END also use
     * no-store so Google Sheets HTTP
     * responses are not tied to cache.
     */
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
      'Greatest of All-Time'
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
      title === 'Year-End'
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
     * Weekly data is approximately
     * 10 MB, so it must never enter
     * Next.js's 2 MB data cache.
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
        availableWeeks: [],
        weeksAtNumberOne: 0,
        entries: [],
        entriesByWeek: {},
        weeksAtNumberOneByWeek: {},
      };
    }

    const csvText =
      await response.text();

    if (!csvText.trim()) {
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

    const rows =
      parseCsv(csvText);

    if (rows.length === 0) {
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

    const groupedRows: Record<
      string,
      RawRow[]
    > = {};

    for (const row of rows) {
      if (!groupedRows[row.week]) {
        groupedRows[row.week] = [];
      }

      groupedRows[row.week].push(
        row
      );
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
        availableWeeks: [],
        entries: [],
        entriesByWeek: {},
        weeksAtNumberOne: 0,
        weeksAtNumberOneByWeek: {},
      };
    }

    const week =
      selectedWeek &&
      groupedRows[selectedWeek]
        ? selectedWeek
        : availableWeeks[0];

    const allHistoryBySong: Record<
      string,
      RawRow[]
    > = {};

    for (const row of rows) {
      const key = songKey(
        row.title,
        row.artist
      );

      if (!allHistoryBySong[key]) {
        allHistoryBySong[key] =
          [];
      }

      allHistoryBySong[key].push(
        row
      );
    }

    for (const key of Object.keys(
      allHistoryBySong
    )) {
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

    const entriesByWeek: Record<
      string,
      WeeklyChartEntry[]
    > = {};

    const weeksAtNumberOneByWeek: Record<
      string,
      number
    > = {};

    const cumulativeNumberOneWeeks: Record<
      string,
      number
    > = {};

    const chronologicalWeeks =
      [...availableWeeks].sort(
        (a, b) =>
          parseChartDate(a) -
          parseChartDate(b)
      );

    for (const currentWeek of chronologicalWeeks) {
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
      for (const row of sortedRows) {
        if (row.rank !== 1) {
          continue;
        }

        const key = songKey(
          row.title,
          row.artist
        );

        cumulativeNumberOneWeeks[key] =
          (cumulativeNumberOneWeeks[
            key
          ] ?? 0) + 1;
      }

      /*
       * Build entries for this week.
       */
      entriesByWeek[
        currentWeek
      ] = sortedRows.map(
        (row) => {
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
              (historyRow) =>
                parseChartDate(
                  historyRow.week
                ) < currentDate
            );

          const currentHistory =
            history.filter(
              (historyRow) =>
                parseChartDate(
                  historyRow.week
                ) <= currentDate
            );

          const previousChartWeekIndex =
            chronologicalWeeks.indexOf(
              currentWeek
            ) - 1;

          const previousChartWeek =
            previousChartWeekIndex >= 0
              ? chronologicalWeeks[
                  previousChartWeekIndex
                ]
              : undefined;

          const previousWeek =
            previousChartWeek
              ? history.find(
                  (historyRow) =>
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
            rank: row.rank,
            title: row.title,
            artist: row.artist,
            artwork:
              row.artwork,
            week: currentWeek,
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
      availableWeeks: [],
      weeksAtNumberOne: 0,
      entries: [],
      entriesByWeek: {},
      weeksAtNumberOneByWeek: {},
    };
  }
}