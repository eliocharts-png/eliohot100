'use client';

import { useEffect, useMemo, useState } from 'react';
import localFont from 'next/font/local';

const gothamBlack = localFont({
  src: '../../../fonts/Gotham Black.otf',
  display: 'swap',
});

const gothamRegular = localFont({
  src: '../../../fonts/Gotham Regular.otf',
  display: 'swap',
});

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

type ChartRow = {
  date: Date;
  rank: number;
  song: string;
  artist: string;
  points: number;
  artwork: string;
};

type SongSummary = {
  key: string;
  song: string;
  artist: string;
  artwork: string;
  totalPoints: number;
  yearlyPoints: Record<number, number>;
  decadePoints: {
    '2010s': number;
    '2020s': number;
  };
  currentRank: number | null;
  gain: number | null;
};

type Decade = 'overall' | '2010s' | '2020s';

const INVERSE_POINTS: Record<number, number> = {
  1: 75000,
  2: 55000,
  3: 45000,
  4: 35000,
  5: 33000,
  6: 31400,
  7: 30800,
  8: 29200,
  9: 27600,
  10: 26000,
  11: 16500,
  12: 16000,
  13: 15500,
  14: 15000,
  15: 14500,
  16: 14000,
  17: 13500,
  18: 13000,
  19: 12500,
  20: 12000,
  21: 11900,
  22: 11600,
  23: 11300,
  24: 11000,
  25: 10700,
  26: 10400,
  27: 10100,
  28: 9800,
  29: 9500,
  30: 9000,
  31: 9000,
  32: 8800,
  33: 8600,
  34: 8400,
  35: 8200,
  36: 8000,
  37: 7800,
  38: 7600,
  39: 7400,
  40: 7200,
  41: 7000,
  42: 6800,
  43: 6600,
  44: 6400,
  45: 6200,
  46: 6000,
  47: 5800,
  48: 5600,
  49: 5400,
  50: 5200,
  51: 5000,
  52: 4800,
  53: 4600,
  54: 4400,
  55: 4200,
  56: 4000,
  57: 3800,
  58: 3600,
  59: 3400,
  60: 3200,
  61: 3100,
  62: 3000,
  63: 2900,
  64: 2800,
  65: 2700,
  66: 2600,
  67: 2500,
  68: 2400,
  69: 2300,
  70: 2200,
  71: 2150,
  72: 2100,
  73: 2050,
  74: 2000,
  75: 1950,
  76: 1900,
  77: 1850,
  78: 1800,
  79: 1750,
  80: 1700,
  81: 1650,
  82: 1625,
  83: 1600,
  84: 1575,
  85: 1550,
  86: 1525,
  87: 1500,
  88: 1475,
  89: 1450,
  90: 1425,
  91: 1400,
  92: 1375,
  93: 1350,
  94: 1325,
  95: 1300,
  96: 1275,
  97: 1250,
  98: 1225,
  99: 1200,
  100: 1175,
};

function getMultiplier(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // March 19, 2026 onward = 0.65
  if (
    year > 2026 ||
    (year === 2026 &&
      (month > 3 ||
        (month === 3 && day >= 19)))
  ) {
    return 0.65;
  }

  // March 6, 2025 onward = 0.60
  if (
    year > 2025 ||
    (year === 2025 &&
      (month > 3 ||
        (month === 3 && day >= 6)))
  ) {
    return 0.6;
  }

  // October 17, 2024 onward = 0.54
  if (
    year > 2024 ||
    (year === 2024 &&
      (month > 10 ||
        (month === 10 && day >= 17)))
  ) {
    return 0.54;
  }

  // January 7, 2010 onward = 1.00
  if (
    year > 2010 ||
    (year === 2010 &&
      (month > 1 ||
        (month === 1 && day >= 7)))
  ) {
    return 1;
  }

  return 1;
}

function parseDate(value: string): Date | null {
  const cleaned = value.trim();

  /*
   * Parse calendar dates manually first.
   *
   * This prevents timezone differences from moving
   * a chart date across a multiplier boundary.
   */
  const parts = cleaned.split(/[/-]/);

  if (parts.length === 3) {
    const [month, day, year] =
      parts.map(Number);

    if (
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      Number.isFinite(year)
    ) {
      const date = new Date(
        year,
        month - 1,
        day
      );

      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  const parsed = new Date(cleaned);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function parseCSV(text: string): ChartRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (
      char === '"' &&
      insideQuotes &&
      next === '"'
    ) {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (
      char === ',' &&
      !insideQuotes
    ) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (
      (char === '\n' || char === '\r') &&
      !insideQuotes
    ) {
      if (
        char === '\r' &&
        next === '\n'
      ) {
        i++;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const result: ChartRow[] = [];

  for (const rawRow of rows.slice(1)) {
    const date = parseDate(
      rawRow[0]?.trim() ?? ''
    );

    const rank = Number(rawRow[1]);

    const songArtist =
      rawRow[2]?.trim() ?? '';

    const points = Number(
      (rawRow[3] ?? '')
        .replace(/,/g, '')
        .trim()
    );

    const artwork =
      rawRow[10]?.trim() ?? '';

    if (
      !date ||
      !songArtist ||
      !Number.isFinite(rank)
    ) {
      continue;
    }

    const lines = songArtist
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!lines.length) {
      continue;
    }

    const song = lines[0];
    const artist = lines
      .slice(1)
      .join(' ');

    result.push({
      date,
      rank,
      song,
      artist,
      points: Number.isFinite(points)
        ? points
        : 0,
      artwork,
    });
  }

  return result;
}

function normalizeSong(song: string): string {
  return song
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(
  artist: string
): string {
  return artist
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSongKey(
  song: string,
  artist: string
): string {
  return `${normalizeSong(song)}|||${normalizeArtist(
    artist
  )}`;
}

function formatNumber(
  value: number
): string {
  return Math.round(
    value
  ).toLocaleString('en-US');
}

function pointFill(
  value: number
): string {
  if (value >= 20000) return '#fc1c2f';
  if (value >= 15000) return '#9546ff';
  if (value >= 12000) return '#0c7ef4';
  if (value >= 10000) return '#00a5da';
  if (value >= 8000) return '#09d2e6';
  if (value >= 6000) return '#00e7ca';
  if (value >= 4000) return '#63f073';
  if (value >= 2000) return '#baff66';
  if (value >= 1000) return '#f1ff9b';
  if (value >= 800) return '#fff385';
  if (value >= 600) return '#ffd9a7';
  if (value >= 400) return '#ffc6c7';
  if (value >= 1) return '#e5e1db';

  return 'transparent';
}

function pointTextColor(
  value: number
): string {
  const fill = pointFill(value);

  if (
    fill === '#fc1c2f' ||
    fill === '#9546ff' ||
    fill === '#0c7ef4' ||
    fill === '#00a5da'
  ) {
    return '#ffffff';
  }

  return '#000000';
}

function gainColor(
  rank: number | null
): string {
  if (rank === null) {
    return '#000000';
  }

  if (rank === 1) {
    return '#00a88f';
  }

  if (
    rank >= 2 &&
    rank <= 10
  ) {
    return '#8f1d3d';
  }

  if (
    rank >= 11 &&
    rank <= 40
  ) {
    return '#00a5da';
  }

  return '#8bb7d9';
}

/*
 * Lighter versions of the existing gain colors.
 *
 * These correspond directly to the same rank groups
 * used by gainColor().
 */
function gainBackgroundColor(
  rank: number | null
): string {
  if (rank === null) {
    return '#ffffff';
  }

  if (rank === 1) {
    return '#d9f3ee';
  }

  if (
    rank >= 2 &&
    rank <= 10
  ) {
    return '#f0dce3';
  }

  if (
    rank >= 11 &&
    rank <= 40
  ) {
    return '#d9eef8';
  }

  return '#e7f0f7';
}

function getDecadeYears(
  decade: '2010s' | '2020s'
): number[] {
  if (decade === '2010s') {
    return Array.from(
      { length: 10 },
      (_, index) => 2010 + index
    );
  }

  const currentYear =
    new Date().getFullYear();

  return Array.from(
    {
      length:
        currentYear -
        2020 +
        1,
    },
    (_, index) => 2020 + index
  );
}

export default function DecadeEndBreakdownPage() {
  const [rows, setRows] =
    useState<ChartRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [decade, setDecade] =
    useState<Decade>('overall');

  const [selectedYear, setSelectedYear] =
    useState<number | 'all'>('all');

  const [weighted, setWeighted] =
    useState(false);

  const [search, setSearch] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response =
          await fetch(CSV_URL);

        const text =
          await response.text();

        const parsed =
          parseCSV(text);

        if (!cancelled) {
          setRows(parsed);
        }
      } catch (error) {
        console.error(
          'Failed to load decade-end data:',
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    if (decade === 'overall') {
      return [];
    }

    return getDecadeYears(decade);
  }, [decade]);

  useEffect(() => {
    setSelectedYear('all');
  }, [decade]);

  const latestChartDate =
    useMemo(() => {
      if (!rows.length) {
        return null;
      }

      return rows.reduce(
        (latest, row) =>
          row.date.getTime() >
          latest.getTime()
            ? row.date
            : latest,
        rows[0].date
      );
    }, [rows]);

  const latestChartEntries =
    useMemo(() => {
      if (!latestChartDate) {
        return new Map<
          string,
          ChartRow
        >();
      }

      const map =
        new Map<string, ChartRow>();

      for (const row of rows) {
        if (
          row.date.getTime() !==
          latestChartDate.getTime()
        ) {
          continue;
        }

        const key =
          getSongKey(
            row.song,
            row.artist
          );

        map.set(key, row);
      }

      return map;
    }, [
      rows,
      latestChartDate,
    ]);

  const summaries = useMemo(() => {
    const relevantRows =
      rows.filter((row) => {
        const year =
          row.date.getFullYear();

        if (year < 2010) {
          return false;
        }

        if (
          decade === '2010s' &&
          (year < 2010 ||
            year > 2019)
        ) {
          return false;
        }

        if (
          decade === '2020s' &&
          year < 2020
        ) {
          return false;
        }

        if (
          selectedYear !== 'all' &&
          year !== selectedYear
        ) {
          return false;
        }

        return true;
      });

    const grouped =
      new Map<
        string,
        {
          song: string;
          artist: string;
          artwork: string;
          totalPoints: number;
          yearlyPoints: Record<
            number,
            number
          >;
          decadePoints: {
            '2010s': number;
            '2020s': number;
          };
        }
      >();

    for (const row of relevantRows) {
      const key =
        getSongKey(
          row.song,
          row.artist
        );

      if (!grouped.has(key)) {
        grouped.set(key, {
          song: row.song,
          artist: row.artist,
          artwork: row.artwork,
          totalPoints: 0,
          yearlyPoints: {},
          decadePoints: {
            '2010s': 0,
            '2020s': 0,
          },
        });
      }

      const item =
        grouped.get(key)!;

      if (
        !item.artwork &&
        row.artwork
      ) {
        item.artwork =
          row.artwork;
      }

      const contribution =
        weighted
          ? (INVERSE_POINTS[
              row.rank
            ] ?? 0) *
            getMultiplier(
              row.date
            )
          : row.points;

      item.totalPoints +=
        contribution;

      const year =
        row.date.getFullYear();

      item.yearlyPoints[year] =
        (item.yearlyPoints[
          year
        ] ?? 0) +
        contribution;

      if (
        year >= 2010 &&
        year <= 2019
      ) {
        item.decadePoints[
          '2010s'
        ] += contribution;
      }

      if (year >= 2020) {
        item.decadePoints[
          '2020s'
        ] += contribution;
      }
    }

    const result: SongSummary[] =
      Array.from(
        grouped.entries()
      ).map(
        ([key, item]) => {
          const currentEntry =
            latestChartEntries.get(
              key
            );

          const currentRank =
            currentEntry?.rank ??
            null;

          const gain =
            currentEntry &&
            currentEntry.points > 0
              ? currentEntry.points
              : null;

          return {
            key,
            song: item.song,
            artist: item.artist,
            artwork: item.artwork,
            totalPoints:
              item.totalPoints,
            yearlyPoints:
              item.yearlyPoints,
            decadePoints:
              item.decadePoints,
            currentRank,
            gain,
          };
        }
      );

    const filtered =
      result.filter((item) => {
        if (!search.trim()) {
          return true;
        }

        const query =
          search
            .toLowerCase()
            .trim();

        return item.artist
          .toLowerCase()
          .includes(query);
      });

    filtered.sort((a, b) => {
      if (
        b.totalPoints !==
        a.totalPoints
      ) {
        return (
          b.totalPoints -
          a.totalPoints
        );
      }

      return a.song.localeCompare(
        b.song
      );
    });

    return filtered;
  }, [
    rows,
    decade,
    selectedYear,
    weighted,
    search,
    latestChartEntries,
  ]);

  if (loading) {
    return (
      <main className="pt-20 pb-16">
        <div className="text-center font-gotham-black text-2xl">
          Loading...
        </div>
      </main>
    );
  }

  const showGain =
    (decade === '2020s' ||
      decade === 'overall') &&
    (selectedYear === 'all' ||
      selectedYear === 2026);

  return (
    <main className="pt-24 pb-16">
      <style jsx global>{`
        .dark .breakdown-zero-point {
          color: #888888 !important;
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1600px] px-4">

        <h1
          className={`${gothamBlack.className} text-center text-2xl sm:text-3xl md:text-4xl`}
        >
          {decade === 'overall'
            ? 'Hot 100 All-Time Building Chart'
            : `Decade-End Hits of the ${decade}`}
        </h1>

        <div className="mt-8 flex flex-col items-center gap-4">

          <div className="flex items-center justify-center gap-2">

            {(
              [
                'overall',
                '2010s',
                '2020s',
              ] as const
            ).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setDecade(option)
                }
                className={`${gothamBlack.className} px-4 py-2 text-sm ${
                  decade === option
                    ? 'bg-black text-white'
                    : 'bg-stone-100 text-black'
                }`}
              >
                {option === 'overall'
                  ? 'OVERALL'
                  : option}
              </button>
            ))}

          </div>

          {decade !== 'overall' && (
            <div className="flex flex-wrap items-center justify-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setSelectedYear(
                    'all'
                  )
                }
                className={`${gothamBlack.className} px-3 py-1.5 text-sm ${
                  selectedYear ===
                  'all'
                    ? 'bg-black text-white'
                    : 'bg-stone-100 text-black'
                }`}
              >
                All
              </button>

              {years.map(
                (year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() =>
                      setSelectedYear(
                        year
                      )
                    }
                    className={`${gothamBlack.className} px-3 py-1.5 text-sm ${
                      selectedYear ===
                      year
                        ? 'bg-black text-white'
                        : 'bg-stone-100 text-black'
                    }`}
                  >
                    {year}
                  </button>
                )
              )}

            </div>
          )}

          <label className="flex items-center gap-2 text-sm">

            <input
              type="checkbox"
              checked={weighted}
              onChange={(event) =>
                setWeighted(
                  event.target.checked
                )
              }
              className="h-4 w-4"
            />

            <span
              className={
                gothamRegular.className
              }
            >
              Apply estimated tracking period and weighting
            </span>

          </label>

          <div className="relative w-full max-w-md">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by artist name..."
              className={`${gothamRegular.className} w-full border border-stone-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-black`}
            />

          </div>

        </div>

        <div className="mt-10 overflow-x-auto">

          <div className="flex min-w-full justify-center">

            <div className="relative inline-block">

              <table
                className={`${gothamRegular.className} relative z-10 table-fixed border-collapse`}
              >

                <colgroup>

                  <col className="w-10" />

                  <col className="w-[300px] md:w-[360px]" />

                  <col className="w-14" />

                  {showGain && (
                    <col className="w-14" />
                  )}

                  {decade ===
                  'overall' ? (
                    <>
                      <col className="w-[80px]" />
                      <col className="w-[80px]" />
                    </>
                  ) : (
                    years.map(
                      (year) => (
                        <col
                          key={year}
                          className="w-[43px]"
                        />
                      )
                    )
                  )}

                </colgroup>

                <thead>

                  <tr className="text-sm">

                    <th className="sticky top-0 bg-white py-1 text-center">
                      #
                    </th>

                    <th className="sticky top-0 bg-white py-1 text-left">
                      Song
                    </th>

                    <th className="sticky top-0 min-w-[3.5rem] bg-white py-1 text-center">
                      Points
                    </th>

                    {showGain && (
                      <th className="sticky top-0 min-w-[3.5rem] bg-white py-1 text-center">
                        Gain
                      </th>
                    )}

                    {decade ===
                    'overall' ? (
                      <>
                        <th className="sticky top-0 bg-white px-0.5 py-1 text-center">
                          2010s
                        </th>

                        <th className="sticky top-0 bg-white px-0.5 py-1 text-center">
                          2020s
                        </th>
                      </>
                    ) : (
                      years.map(
                        (year) => (
                          <th
                            key={year}
                            className={`${gothamRegular.className} sticky top-0 bg-white px-0.5 py-1 text-center`}
                          >
                            '
                            {String(
                              year
                            ).slice(
                              -2
                            )}
                          </th>
                        )
                      )
                    )}

                  </tr>

                </thead>

                <tbody>

                  {summaries.map(
                    (
                      item,
                      index
                    ) => {

                      const displayedTotal =
                        item.totalPoints /
                        (weighted
                          ? 100
                          : 1);

                      const gainIsActive =
                        item.currentRank !==
                          null &&
                        item.gain !==
                          null &&
                        item.gain > 0;

                      const gainColorValue =
                        gainColor(
                          item.currentRank
                        );

                      const currentEntry =
                        item.currentRank !==
                        null
                          ? latestChartEntries.get(
                              item.key
                            )
                          : null;

                      const displayedGain =
                        currentEntry
                          ? weighted
                            ? ((INVERSE_POINTS[
                                currentEntry
                                  .rank
                              ] ??
                                0) *
                                getMultiplier(
                                  currentEntry.date
                                )) /
                              100
                            : currentEntry.points
                          : null;

                      const songCellStyle =
                        gainIsActive
                          ? {
                              backgroundColor:
                                gainBackgroundColor(
                                  item.currentRank
                                ),
                            }
                          : undefined;

                      return (
                        <tr
                          key={
                            item.key
                          }
                        >

                          <td className="relative z-20 py-1 text-center align-middle">

                            <span
                              className={
                                gothamBlack.className
                              }
                            >
                              {index +
                                1}
                            </span>

                          </td>

                          <td
                            className="relative z-20 bg-white py-1 align-middle"
                            style={
                              songCellStyle
                            }
                          >

                            <div className="flex items-center gap-1 py-1 sm:gap-2">

                              {item.artwork ? (
                                <img
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-md bg-stone-200 object-cover md:h-11 md:w-11"
                                  src={
                                    item.artwork
                                  }
                                />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-md bg-stone-200 md:h-11 md:w-11" />
                              )}

                              <div className="min-w-0 max-w-[18rem] flex-1 pl-1 pr-2.5 md:max-w-[25.5rem]">

                                <span
                                  className={`${gothamBlack.className} block truncate text-[1.1rem] leading-tight md:text-[1.2rem]`}
                                  style={{
                                    color:
                                      gainIsActive
                                        ? '#000000'
                                        : undefined,
                                  }}
                                >
                                  {
                                    item.song
                                  }
                                </span>

                                <span
                                  className={`${gothamRegular.className} block truncate text-xs leading-tight md:text-sm`}
                                  style={{
                                    color:
                                      gainIsActive
                                        ? '#444444'
                                        : undefined,
                                  }}
                                >
                                  {
                                    item.artist
                                  }
                                </span>

                              </div>

                            </div>

                          </td>

                          <td
                            className="relative z-20 py-1 text-center align-middle"
                            style={{
                              backgroundColor:
                                pointFill(
                                  displayedTotal
                                ),
                              color:
                                pointTextColor(
                                  displayedTotal
                                ),
                            }}
                          >

                            <span
                              className={`${gothamBlack.className} relative z-40 text-sm ${
                                displayedTotal ===
                                0
                                  ? 'breakdown-zero-point'
                                  : ''
                              }`}
                            >
                              {formatNumber(
                                displayedTotal
                              )}
                            </span>

                          </td>

                          {showGain && (
                            <td className="relative z-20 bg-white py-1 text-center align-middle">

                              {gainIsActive &&
                              displayedGain !==
                                null ? (
                                <div className="flex items-center justify-center gap-1">

                                  <span
                                    className="flex h-4 w-4 items-center justify-center rounded-full"
                                    style={{
                                      backgroundColor:
                                        gainColorValue,
                                    }}
                                    aria-hidden="true"
                                  >

                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="#ffffff"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 19V5" />
                                      <path d="m6 11 6-6 6 6" />
                                    </svg>

                                  </span>

                                  <span
                                    className={`${gothamBlack.className} text-sm`}
                                    style={{
                                      color:
                                        gainColorValue,
                                    }}
                                  >
                                    {formatNumber(
                                      displayedGain
                                    )}
                                  </span>

                                </div>
                              ) : (
                                <span
                                  className={`${gothamRegular.className} text-stone-500`}
                                >
                                  --
                                </span>
                              )}

                            </td>
                          )}

                          {decade ===
                          'overall' ? (
                            <>
                              <td
                                className={`${gothamRegular.className} relative z-20 px-0.5 py-1 text-center align-middle`}
                                style={{
                                  backgroundColor:
                                    pointFill(
                                      item.decadePoints[
                                        '2010s'
                                      ] /
                                        (weighted
                                          ? 100
                                          : 1)
                                    ),
                                  color:
                                    pointTextColor(
                                      item.decadePoints[
                                        '2010s'
                                      ] /
                                        (weighted
                                          ? 100
                                          : 1)
                                    ),
                                }}
                              >

                                <span
                                  className={`relative z-40 text-sm ${
                                    item.decadePoints[
                                      '2010s'
                                    ] /
                                      (weighted
                                        ? 100
                                        : 1) ===
                                    0
                                      ? 'breakdown-zero-point'
                                      : ''
                                  }`}
                                >
                                  {formatNumber(
                                    item.decadePoints[
                                      '2010s'
                                    ] /
                                      (weighted
                                        ? 100
                                        : 1)
                                  )}
                                </span>

                              </td>

                              <td
                                className={`${gothamRegular.className} relative z-20 px-0.5 py-1 text-center align-middle`}
                                style={{
                                  backgroundColor:
                                    pointFill(
                                      item.decadePoints[
                                        '2020s'
                                      ] /
                                        (weighted
                                          ? 100
                                          : 1)
                                    ),
                                  color:
                                    pointTextColor(
                                      item.decadePoints[
                                        '2020s'
                                      ] /
                                        (weighted
                                          ? 100
                                          : 1)
                                    ),
                                }}
                              >

                                <span
                                  className={`relative z-40 text-sm ${
                                    item.decadePoints[
                                      '2020s'
                                    ] /
                                      (weighted
                                        ? 100
                                        : 1) ===
                                    0
                                      ? 'breakdown-zero-point'
                                      : ''
                                  }`}
                                >
                                  {formatNumber(
                                    item.decadePoints[
                                      '2020s'
                                    ] /
                                      (weighted
                                        ? 100
                                        : 1)
                                  )}
                                </span>

                              </td>
                            </>
                          ) : (
                            years.map(
                              (year) => {

                                const rawValue =
                                  item.yearlyPoints[
                                    year
                                  ] ??
                                  0;

                                const displayedValue =
                                  rawValue /
                                  (weighted
                                    ? 100
                                    : 1);

                                return (
                                  <td
                                    key={
                                      year
                                    }
                                    className={`${gothamRegular.className} relative z-20 px-0.5 py-1 text-center align-middle`}
                                    style={{
                                      backgroundColor:
                                        pointFill(
                                          displayedValue
                                        ),
                                      color:
                                        pointTextColor(
                                          displayedValue
                                        ),
                                    }}
                                  >

                                    <span
                                      className={`relative z-40 text-sm ${
                                        displayedValue ===
                                        0
                                          ? 'breakdown-zero-point'
                                          : ''
                                      }`}
                                    >
                                      {formatNumber(
                                        displayedValue
                                      )}
                                    </span>

                                  </td>
                                );
                              }
                            )
                          )}

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-30 opacity-[0.7] grayscale mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url('/texture/texture.jpg')",
                  backgroundRepeat:
                    'repeat-y',
                  backgroundPosition:
                    'top left',
                  backgroundSize:
                    '100% 650px',
                }}
              />

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
