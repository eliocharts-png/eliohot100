'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDateLabel } from '@/lib/chartData';
import type { WeeklyChartEntry } from '@/types';

interface WeeklyChartDetailProps {
  title: string;
  weekLabel: string;
  week: string;
  availableWeeks: string[];
  weeksAtNumberOne: number;
  entries: WeeklyChartEntry[];
  entriesByWeek: Record<
    string,
    WeeklyChartEntry[]
  >;
  weeksAtNumberOneByWeek: Record<
    string,
    number
  >;
}

function getIconFilename(
  movementIcon: string
): string {
  const iconMap: Record<string, string> = {
    up: 'up.PNG',
    down: 'down.PNG',
    nonmover: 'non-move.PNG',
    reentry: 'reentry.PNG',
    debut: 'debut.PNG',
  };

  return (
    iconMap[movementIcon] ||
    'up.PNG'
  );
}

function shouldShowBullet(
  entry: WeeklyChartEntry
): boolean {
  if (
    entry.movementIcon === 'reentry' ||
    entry.movementIcon === 'debut'
  ) {
    return true;
  }

  if (
    entry.points !== undefined &&
    entry.lastWeekPoints !== undefined
  ) {
    return (
      entry.points >
      entry.lastWeekPoints
    );
  }

  return false;
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

export default function WeeklyChartDetail({
  title,
  weekLabel,
  week,
  availableWeeks,
  weeksAtNumberOne,
  entries,
  entriesByWeek,
  weeksAtNumberOneByWeek,
}: WeeklyChartDetailProps) {
  const [expandedRank, setExpandedRank] =
    useState<number | null>(null);

  const [expandedHistory, setExpandedHistory] =
    useState<number | null>(null);

  const [selectedWeek, setSelectedWeek] =
    useState(week);

  const toggleEntry = (
    rank: number
  ) => {
    setExpandedRank((current) =>
      current === rank
        ? null
        : rank
    );
  };

  const toggleHistory = (
    rank: number
  ) => {
    setExpandedHistory((current) =>
      current === rank
        ? null
        : rank
    );
  };

  /*
   * Get the songs for the selected
   * chart week.
   */
  const currentEntries =
  entriesByWeek?.[selectedWeek] ??
  entries;

  /*
   * Get the correct No. 1 count
   * for the selected chart week.
   */
  const currentWeeksAtNumberOne =
  weeksAtNumberOneByWeek?.[selectedWeek] ??
  weeksAtNumberOne

  return (
    <section className="space-y-0">

      {/* HEADER */}
      <div className="border-b border-black/10 bg-white px-6 py-6 text-center">
        <h1 className="text-[5rem] font-brown-bold uppercase leading-tight tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
          THE HOT 1OO
        </h1>
      </div>

      {/* DATE DROPDOWN */}
      <div className="flex items-center justify-center border-b border-black/10 bg-white px-6 py-3">
        <select
          value={selectedWeek}
          onChange={(event) => {
            setSelectedWeek(
              event.target.value
            );

            setExpandedRank(null);
            setExpandedHistory(null);
          }}
          className="cursor-pointer bg-black px-4 py-2 text-center text-[0.65rem] font-brown-regular uppercase tracking-[0.28em] text-white outline-none"
        >
          {availableWeeks.map(
            (weekOption) => (
              <option
                key={weekOption}
                value={weekOption}
              >
                {formatDateLabel(
                  weekOption
                )}
              </option>
            )
          )}
        </select>
      </div>

      {/* BLUE BANNER */}
      <div className="bg-[#0050FF] px-6 py-3 text-center">
        <p className="text-sm font-brown-regular uppercase tracking-[0.2em] text-white sm:text-base">
          PERSONAL CHARTS BY ELIO
        </p>
      </div>

      {/* CHART */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

          <div className="space-y-0">

            {currentEntries.map(
              (entry) => {

                const isExpanded =
                  expandedRank ===
                  entry.rank;

                const isHistoryExpanded =
                  expandedHistory ===
                  entry.rank;

                const showBullet =
                  shouldShowBullet(
                    entry
                  );

                /*
                 * Only show chart history
                 * through the selected week.
                 */
                const graphData =
                  (
                    entry.chartHistory ??
                    []
                  )
                    .filter(
                      (history) =>
                        parseChartDate(
                          history.week
                        ) <=
                        parseChartDate(
                          selectedWeek
                        )
                    )
                    .map(
                      (history) => ({
                        week:
                          history.week,
                        rank:
                          history.rank,
                        label:
                          formatDateLabel(
                            history.week
                          ),
                      })
                    );

                return (
                  <div
                    key={`${entry.rank}-${entry.title}-${entry.artist}`}
                    className="border-t border-black/10 first:border-t-0"
                  >

                    {/* WEEKS AT NO. 1 */}
                    {entry.rank ===
                      1 && (
                      <div className="hidden sm:block">
                        <div className="ml-[9rem] w-[7.8rem] bg-black px-2 py-2 text-center">
                          <p className="text-[0.6rem] font-brown-regular uppercase tracking-[0.15em] text-white">
                            {
                              currentWeeksAtNumberOne
                            }{' '}
                            {currentWeeksAtNumberOne ===
                            1
                              ? 'WEEK'
                              : 'WEEKS'}{' '}
                            AT NO. 1
                          </p>
                        </div>
                      </div>
                    )}

                    {/* MAIN ROW */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">

                      {/* EXPANDED STATS */}
                      {isExpanded && (
                        <div className="flex-shrink-0 sm:self-center sm:pr-2">
                          <div
                            className="relative inline-block bg-black px-4 py-3 shadow-sm"
                            style={{
                              clipPath:
                                'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                            }}
                          >
                            <div className="grid min-w-[260px] grid-cols-3 gap-3 text-white">

                              {/* LAST WEEK */}
                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.6rem] font-brown-regular uppercase leading-tight tracking-[0.18em] text-white/70">
                                  <span className="block">
                                    LAST
                                  </span>
                                  <span className="block">
                                    WEEK
                                  </span>
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.lastWeekRank ??
                                    '—'}
                                </p>
                              </div>

                              {/* PEAK */}
                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.6rem] font-brown-regular uppercase leading-tight tracking-[0.18em] text-white/70">
                                  <span className="block">
                                    PEAK
                                  </span>
                                  <span className="block">
                                    POSITION
                                  </span>
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {
                                    entry.peakPosition
                                  }
                                </p>
                              </div>

                              {/* WEEKS */}
                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.6rem] font-brown-regular uppercase leading-tight tracking-[0.18em] text-white/70">
                                  <span className="block">
                                    WEEKS ON
                                  </span>
                                  <span className="block">
                                    CHART
                                  </span>
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {
                                    entry.weeksOnChart
                                  }
                                </p>
                              </div>

                            </div>
                          </div>
                        </div>
                      )}

                      {/* MOVEMENT + RANK */}
                      <div className="flex flex-shrink-0 gap-0 px-4 py-4 sm:items-stretch sm:px-0 sm:py-0">

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="flex h-auto w-12 flex-shrink-0 flex-row gap-0 transition hover:opacity-75 sm:h-full sm:w-12 sm:flex-col"
                          aria-label={
                            isExpanded
                              ? 'Collapse song details'
                              : 'Show song details'
                          }
                        >

                          {/* MOVEMENT */}
                          <div className="flex flex-1 items-center justify-center bg-black/10">
                            <img
                              src={`/icons/${getIconFilename(
                                entry.movementIcon
                              )}`}
                              alt={
                                entry.movementIcon
                              }
                              className="h-10 w-10 sm:h-12 sm:w-12"
                            />
                          </div>

                          {/* BULLET */}
                          <div className="flex flex-1 items-center justify-center bg-[#0050FF]">
                            {showBullet && (
                              <img
                                src="/icons/bullet.PNG"
                                alt="trending up"
                                className="h-10 w-10 sm:h-12 sm:w-12"
                              />
                            )}
                          </div>

                        </button>

                        {/* RANK */}
                        <div className="flex min-h-[120px] w-24 flex-shrink-0 items-center justify-center sm:h-full sm:min-h-0">
                          <p className="m-0 text-center text-[2.5rem] font-brown-bold leading-none text-black sm:text-[3rem]">
                            {
                              entry.rank
                            }
                          </p>
                        </div>

                      </div>

                      {/* SONG INFORMATION */}
                      <div className="flex flex-1 items-center gap-4 px-4 py-4 sm:px-0 sm:py-[3px] sm:pl-0">

                        {/* ARTWORK */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="h-[6rem] w-[6rem] flex-shrink-0 cursor-pointer overflow-hidden bg-black/5 sm:h-[7.8rem] sm:w-[7.8rem]"
                          aria-label={
                            isExpanded
                              ? 'Collapse song details'
                              : 'Show song details'
                          }
                        >
                          {entry.artwork ? (
                            <img
                              src={
                                entry.artwork
                              }
                              alt={`${entry.title} artwork`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black/5 text-xs uppercase tracking-[0.35em] text-black/40">
                              ARTWORK
                            </div>
                          )}
                        </button>

                        {/* TITLE + ARTIST */}
                        <div className="min-w-0 flex-1">

                          <p className="text-xl font-brown-bold leading-tight text-black sm:text-4xl">
                            {
                              entry.title
                            }
                          </p>

                          <p className="mt-1 text-xl font-brown-regular text-blue-600">
                            {
                              entry.artist
                            }
                          </p>

                        </div>

                        {/* HISTORY BUTTON */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleHistory(
                              entry.rank
                            )
                          }
                          className="ml-auto flex h-10 w-10 flex-shrink-0 items-center justify-center self-center text-3xl font-brown-regular text-black/40 transition hover:text-black/60"
                          aria-label={
                            isHistoryExpanded
                              ? 'Collapse chart history'
                              : 'Show chart history'
                          }
                        >
                          {isHistoryExpanded
                            ? '−'
                            : '+'}
                        </button>

                      </div>

                    </div>

                    {/* CHART HISTORY GRAPH */}
                    {isHistoryExpanded && (
                      <div className="border-t border-black/10 bg-white px-4 py-6 sm:px-8">

                        <div className="mb-4">

                          <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                            CHART RUN
                          </p>

                          <p className="mt-1 text-lg font-brown-bold text-black">
                            {
                              entry.title
                            }
                          </p>

                          <p className="text-sm font-brown-regular text-blue-600">
                            {
                              entry.artist
                            }
                          </p>

                        </div>

                        {graphData.length >
                        0 ? (

                          <div className="h-[260px] w-full sm:h-[320px]">

                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >

                              <LineChart
                                data={
                                  graphData
                                }
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
                                  strokeWidth={
                                    3
                                  }
                                  dot={{
                                    r: 3,
                                    fill: '#0050FF',
                                    stroke: '#0050FF',
                                  }}
                                  activeDot={{
                                    r: 5,
                                  }}
                                  connectNulls
                                />

                              </LineChart>

                            </ResponsiveContainer>

                          </div>

                        ) : (

                          <div className="flex h-[220px] items-center justify-center bg-black/[0.03]">

                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                              NO CHART HISTORY AVAILABLE
                            </p>

                          </div>

                        )}

                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>
        </div>
      </div>
    </section>
  );
}