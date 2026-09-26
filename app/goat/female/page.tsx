'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  fetchChartData,
  sheetSources,
  formatDateLabel,
} from '@/lib/chartData';

import type { ChartEntry } from '@/types';

function parseChartDate(value: string): number {
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

function createGraphData(
  history: {
    week: string;
    rank: number;
  }[]
) {
  const sortedHistory = [...history].sort(
    (a, b) =>
      parseChartDate(a.week) -
      parseChartDate(b.week)
  );

  const data: Array<{
    week: string;
    rank: number | null;
  }> = [];

  for (
    let i = 0;
    i < sortedHistory.length;
    i += 1
  ) {
    const current = sortedHistory[i];
    const previous = sortedHistory[i - 1];

    if (previous) {
      const weekDifference = Math.round(
        (
          parseChartDate(current.week) -
          parseChartDate(previous.week)
        ) /
          (7 * 24 * 60 * 60 * 1000)
      );

      if (weekDifference > 1) {
        const breakDate = new Date(
          parseChartDate(previous.week) +
            7 * 24 * 60 * 60 * 1000
        );

        const month = String(
          breakDate.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
          breakDate.getDate()
        ).padStart(2, '0');

        const year = String(
          breakDate.getFullYear()
        ).slice(-2);

        data.push({
          week: `${month}/${day}/${year}`,
          rank: null,
        });
      }
    }

    data.push({
      week: current.week,
      rank: current.rank,
    });
  }

  return data;
}

type HistoryMap = Record<
  string,
  {
    week: string;
    rank: number;
  }[]
>;

export default function FemaleGoatPage() {
  const [entries, setEntries] =
    useState<ChartEntry[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  const [expandedRank, setExpandedRank] =
    useState<number | null>(null);

  const [historyMap, setHistoryMap] =
    useState<HistoryMap>({});

  const [loadingHistory, setLoadingHistory] =
    useState<number | null>(null);

  const [historyErrors, setHistoryErrors] =
    useState<Record<number, boolean>>({});

  const [showInfo, setShowInfo] =
    useState(false);

  /*
   * Load the Female GOAT list once
   * when the component mounts.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadGoat() {
      const goatSource =
        sheetSources.find(
          (source) =>
            source.title ===
            'Greatest of All-Time Female Songs'
        );

      if (!goatSource) {
        return;
      }

      try {
        const goatEntries =
          await fetchChartData(
            goatSource.csvUrl,
            goatSource.title
          );

        if (!cancelled) {
          setEntries(goatEntries);
          setLoaded(true);
        }
      } catch (error) {
        console.error(
          'Failed to load Female GOAT chart:',
          error
        );

        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadGoat();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleHistory(
    entry: ChartEntry
  ) {
    const isExpanded =
      expandedRank === entry.rank;

    if (isExpanded) {
      setExpandedRank(null);
      return;
    }

    const key =
      `${entry.title}|||${entry.artist}`;

    /*
     * Already loaded:
     * show it immediately without another
     * network request.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        historyMap,
        key
      )
    ) {
      setExpandedRank(entry.rank);
      return;
    }

    setExpandedRank(entry.rank);
    setLoadingHistory(entry.rank);

    setHistoryErrors(
      (current) => ({
        ...current,
        [entry.rank]: false,
      })
    );

    try {
      const params =
        new URLSearchParams({
          title: entry.title,
          artist: entry.artist,
        });

      const response =
        await fetch(
          `/api/chart-history?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );

      if (!response.ok) {
        throw new Error(
          `History request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !Array.isArray(
          data.history
        )
      ) {
        throw new Error(
          'Invalid chart history response'
        );
      }

      setHistoryMap(
        (current) => ({
          ...current,
          [key]: data.history,
        })
      );
    } catch (error) {
      console.error(
        'Failed to load Female GOAT chart history:',
        error
      );

      setHistoryErrors(
        (current) => ({
          ...current,
          [entry.rank]: true,
        })
      );
    } finally {
      setLoadingHistory(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">

      {/* SAME SPACING AS GOAT PAGE */}
      <div className="pt-[3.8rem]">

        {/* HEADER */}
        <div className="bg-white px-4 py-5 text-center sm:px-6 sm:py-6">
          <h1 className="text-[3.4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            HOT 1OO FEMALE SONGS
          </h1>
        </div>

        {/* BLUE BANNER */}
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="relative flex min-h-[2.75rem] items-center bg-[#0050FF] px-4 py-3 sm:px-6">

            {/* HOME BUTTON */}
            <a
              href="/"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
            >
              &lt; HOME
            </a>

            {/* PERSONAL CHARTS */}
            <div className="ml-auto flex max-w-[65%] items-center justify-end gap-1.5 sm:mx-auto sm:max-w-none sm:justify-center sm:gap-2">

              <p className="text-right text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
                PERSONAL CHARTS BY ELIO
              </p>

              {/* INFO BUTTON + HOVER POPUP */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() =>
                  setShowInfo(true)
                }
                onMouseLeave={() =>
                  setShowInfo(false)
                }
              >

                <button
                  type="button"
                  onClick={() =>
                    setShowInfo(
                      (current) => !current
                    )
                  }
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80 text-[0.7rem] font-brown-bold leading-none text-white transition hover:bg-white hover:text-[#0050FF]"
                  aria-label={
                    showInfo
                      ? 'Hide Greatest of All-Time methodology'
                      : 'Show Greatest of All-Time methodology'
                  }
                  aria-expanded={showInfo}
                >
                  i
                </button>

                {/* FLOATING INFORMATION POPUP */}
                {showInfo && (
                  <div
                    className="absolute right-0 top-full z-[200] mt-3 w-[18rem] sm:right-1/2 sm:w-[32rem] sm:translate-x-1/2"
                    onMouseEnter={() =>
                      setShowInfo(true)
                    }
                    onMouseLeave={() =>
                      setShowInfo(false)
                    }
                  >
                    <div className="border border-black/10 bg-white px-5 py-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:px-7 sm:py-6">

                      <p className="text-[0.62rem] font-brown-bold uppercase tracking-[0.2em] text-black sm:text-xs">
                        HOT 1OO FEMALE SONGS
                      </p>

                      <p className="mt-3 text-xs font-brown-regular leading-relaxed text-black/70 sm:text-sm">
                        <em>
                          Songs are ranked based on an inverse point system, with weeks at №1 earning the greatest value and weeks at lower spots earning the least. Due to changes in chart methodology over the years, eras are weighted differently to account for chart turnover rates during periods. As of September 24th, 2026 week-ending.
                        </em>
                      </p>

                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>

        {/* LIST */}
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

            {/* INITIAL LOADING */}
            {!loaded && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  LOADING GREATEST OF ALL-TIME: FEMALE SONGS
                </p>
              </div>
            )}

            {/* GOAT ENTRIES */}
            {loaded &&
              entries.map((entry) => {
                const isExpanded =
                  expandedRank === entry.rank;

                const key =
                  `${entry.title}|||${entry.artist}`;

                const history =
                  historyMap[key] ?? [];

                const isLoading =
                  loadingHistory ===
                  entry.rank;

                const hasError =
                  historyErrors[
                    entry.rank
                  ] === true;

                const graphData =
                  createGraphData(
                    history
                  );

                return (
                  <div
                    key={`${entry.rank}-${entry.title}-${entry.artist}`}
                    className="border-t border-black/10 first:border-t-0"
                  >

                    {/* MAIN ROW */}
                    <div className="flex items-center gap-1.5 px-3 py-3 sm:gap-6 sm:px-6">

                      {/* RANK */}
                      <div className="flex w-7 flex-shrink-0 items-center justify-center sm:w-20">
                        <p className="m-0 text-[1.35rem] font-brown-bold leading-none text-black sm:text-[3.5rem]">
                          {entry.rank}
                        </p>
                      </div>

                      {/* ARTWORK */}
                      <div className="h-[4.6rem] w-[4.6rem] flex-shrink-0 overflow-hidden bg-black/5 sm:h-[7.8rem] sm:w-[7.8rem]">
                        {entry.artwork ? (
                          <img
                            src={entry.artwork}
                            alt={`${entry.title} artwork`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.45rem] uppercase tracking-[0.2em] text-black/40">
                            ARTWORK
                          </div>
                        )}
                      </div>

                      {/* TITLE + ARTIST */}
                      <div className="min-w-0 flex-1">

                        <p className="break-words text-[0.9rem] font-brown-bold leading-[1.08] text-black sm:text-4xl">
                          {entry.title}
                        </p>

                        <p className="mt-0.5 break-words text-[0.72rem] font-brown-regular leading-tight text-blue-600 sm:mt-1 sm:text-xl">
                          {entry.artist}
                        </p>

                      </div>

                      {/* HISTORY BUTTON */}
                      <button
                        type="button"
                        onClick={() =>
                          void toggleHistory(
                            entry
                          )
                        }
                        className="flex h-7 w-6 flex-shrink-0 items-center justify-center text-xl font-brown-regular leading-none text-black/40 transition hover:text-black/60 sm:h-10 sm:w-10 sm:text-3xl"
                        aria-label={
                          isExpanded
                            ? 'Collapse chart history'
                            : 'Show chart history'
                        }
                        aria-expanded={
                          isExpanded
                        }
                      >
                        {isLoading
                          ? '…'
                          : isExpanded
                            ? '−'
                            : '+'}
                      </button>

                    </div>

                    {/* GRAPH */}
                    {isExpanded && (
                      <div className="border-t border-black/10 bg-white px-3 py-5 sm:px-8 sm:py-6">

                        <div className="mb-4">

                          <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                            CHART RUN
                          </p>

                          <p className="mt-1 text-lg font-brown-bold text-black">
                            {entry.title}
                          </p>

                          <p className="text-sm font-brown-regular text-blue-600">
                            {entry.artist}
                          </p>

                        </div>

                        {/* HISTORY LOADING */}
                        {isLoading ? (
                          <div className="flex h-[220px] items-center justify-center sm:h-[320px]">
                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                              LOADING CHART RUN
                            </p>
                          </div>
                        ) : hasError ? (
                          <div className="flex h-[220px] items-center justify-center bg-black/[0.03] sm:h-[320px]">
                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                              UNABLE TO LOAD CHART HISTORY
                            </p>
                          </div>
                        ) : graphData.length > 0 ? (
                          <div className="h-[220px] w-full sm:h-[320px]">

                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >
                              <LineChart
                                data={graphData}
                                margin={{
                                  top: 10,
                                  right: 20,
                                  left: 0,
                                  bottom: 10,
                                }}
                              >

                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#00000015"
                                />

                                <XAxis
                                  dataKey="week"
                                  tick={{
                                    fontSize: 10,
                                  }}
                                  tickFormatter={(
                                    value
                                  ) => {
                                    const parts =
                                      String(
                                        value
                                      ).split(
                                        '/'
                                      );

                                    if (
                                      parts.length >=
                                      2
                                    ) {
                                      return `${parts[0]}/${parts[1]}`;
                                    }

                                    return String(
                                      value
                                    );
                                  }}
                                />

                                <YAxis
                                  reversed
                                  domain={[
                                    1,
                                    100,
                                  ]}
                                  allowDecimals={
                                    false
                                  }
                                  tick={{
                                    fontSize: 10,
                                  }}
                                  width={30}
                                />

                                <Tooltip
                                  formatter={(
                                    value
                                  ) => [
                                    `#${value}`,
                                    'Rank',
                                  ]}
                                  labelFormatter={(
                                    label
                                  ) =>
                                    formatDateLabel(
                                      String(
                                        label
                                      )
                                    )
                                  }
                                />

                                <Line
                                  type="monotone"
                                  dataKey="rank"
                                  stroke="#0050FF"
                                  strokeWidth={3}
                                  dot={{
                                    r: 3,
                                    fill: '#0050FF',
                                    stroke:
                                      '#0050FF',
                                  }}
                                  activeDot={{
                                    r: 5,
                                  }}
                                  connectNulls={
                                    false
                                  }
                                />

                              </LineChart>
                            </ResponsiveContainer>

                          </div>
                        ) : (
                          <div className="flex h-[220px] items-center justify-center bg-black/[0.03] sm:h-[320px]">
                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                              NO CHART HISTORY AVAILABLE
                            </p>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })}

            {/* EMPTY STATE */}
            {loaded &&
              entries.length === 0 && (
                <div className="flex min-h-[300px] items-center justify-center">
                  <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                    NO GREATEST OF ALL-TIME: FEMALE SONGS DATA AVAILABLE
                  </p>
                </div>
              )}

          </div>
        </div>

        <div className="h-12" />

      </div>

    </main>
  );
}