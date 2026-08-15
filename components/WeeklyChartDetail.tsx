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
  entriesByWeek: Record<string, WeeklyChartEntry[]>;
  weeksAtNumberOneByWeek: Record<string, number>;
}

function normalizeMovementIcon(
  movementIcon: string | undefined
): string {
  return String(movementIcon ?? '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');
}

function getIconFilename(
  movementIcon: string | undefined
): string {
  const normalizedIcon =
    normalizeMovementIcon(movementIcon);

  switch (normalizedIcon) {
    case 'reentry':
    case 'reenter':
      return 'reentry.PNG';

    case 'debut':
      return 'debut.PNG';

    case 'down':
      return 'down.PNG';

    case 'nonmover':
    case 'nonmovement':
      return 'non-move.PNG';

    case 'up':
    default:
      return 'up.PNG';
  }
}

function shouldShowBullet(
  entry: WeeklyChartEntry
): boolean {
  const movement =
    normalizeMovementIcon(
      entry.movementIcon
    );

  if (
    movement === 'reentry' ||
    movement === 'reenter' ||
    movement === 'debut'
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

function getPointIncreasePercentage(
  entry: WeeklyChartEntry
): number | null {
  if (
    entry.points === undefined ||
    entry.lastWeekPoints === undefined ||
    entry.lastWeekPoints <= 0
  ) {
    return null;
  }

  return (
    ((entry.points -
      entry.lastWeekPoints) /
      entry.lastWeekPoints) *
    100
  );
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

  const currentEntries =
    entriesByWeek?.[selectedWeek] ??
    entries;

  const currentWeeksAtNumberOne =
    weeksAtNumberOneByWeek?.[selectedWeek] ??
    weeksAtNumberOne;

  let greatestGainerRank: number | null =
    null;

  let greatestGainerPercentage =
    -Infinity;

  for (const entry of currentEntries) {
    const percentage =
      getPointIncreasePercentage(
        entry
      );

    if (
      percentage !== null &&
      percentage > greatestGainerPercentage
    ) {
      greatestGainerPercentage =
        percentage;

      greatestGainerRank =
        entry.rank;
    }
  }

  const hotshotDebutRank =
    currentEntries
      .filter((entry) => {
        const movement =
          normalizeMovementIcon(
            entry.movementIcon
          );

        return movement === 'debut';
      })
      .sort(
        (a, b) =>
          a.rank - b.rank
      )[0]?.rank ?? null;

  return (
    <section className="space-y-0">

      <div className="bg-white px-4 py-5 text-center sm:px-6 sm:py-6">
        <h1 className="text-[3.4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
          THE HOT 1OO
        </h1>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-3">
        <select
          value={selectedWeek}
          onChange={(event) => {
            setSelectedWeek(
              event.target.value
            );

            setExpandedRank(null);
            setExpandedHistory(null);
          }}
          className="cursor-pointer appearance-none rounded-none bg-black px-5 py-2.5 text-center text-xs font-brown-regular uppercase tracking-[0.2em] text-white outline-none sm:text-sm"
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

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="relative flex items-center justify-center bg-[#0050FF] px-4 py-3 sm:px-6">

          <a
            href="/"
            className="absolute left-4 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
          >
            &lt; HOME
          </a>

          <p className="ml-auto max-w-[70%] text-right text-[0.58rem] font-brown-regular uppercase tracking-[0.12em] text-white sm:mx-auto sm:max-w-none sm:text-base sm:tracking-[0.2em]">
            PERSONAL CHARTS BY ELIO
          </p>

        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
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

                const isGreatestGainer =
                  greatestGainerRank ===
                  entry.rank;

                const isHotshotDebut =
                  hotshotDebutRank ===
                  entry.rank;

                const graphData = (() => {
                  const history = (
                    entry.chartHistory ?? []
                  )
                    .filter(
                      (item) =>
                        parseChartDate(
                          item.week
                        ) <=
                        parseChartDate(
                          selectedWeek
                        )
                    )
                    .sort(
                      (a, b) =>
                        parseChartDate(
                          a.week
                        ) -
                        parseChartDate(
                          b.week
                        )
                    );

                  const data: Array<{
                    week: string;
                    rank: number | null;
                    label: string;
                  }> = [];

                  for (
                    let i = 0;
                    i < history.length;
                    i++
                  ) {
                    const current =
                      history[i];

                    const previous =
                      history[i - 1];

                    if (previous) {
                      const currentDate =
                        parseChartDate(
                          current.week
                        );

                      const previousDate =
                        parseChartDate(
                          previous.week
                        );

                      const weekDifference =
                        Math.round(
                          (currentDate -
                            previousDate) /
                            (7 *
                              24 *
                              60 *
                              60 *
                              1000)
                        );

                      if (
                        weekDifference > 1
                      ) {
                        const breakDate =
                          new Date(
                            previousDate +
                              7 *
                                24 *
                                60 *
                                60 *
                                1000
                          );

                        const month =
                          String(
                            breakDate.getMonth() +
                              1
                          ).padStart(
                            2,
                            '0'
                          );

                        const day =
                          String(
                            breakDate.getDate()
                          ).padStart(
                            2,
                            '0'
                          );

                        const year =
                          String(
                            breakDate.getFullYear()
                          ).slice(-2);

                        const breakWeek =
                          `${month}/${day}/${year}`;

                        data.push({
                          week:
                            breakWeek,
                          rank: null,
                          label:
                            formatDateLabel(
                              breakWeek
                            ),
                        });
                      }
                    }

                    data.push({
                      week:
                        current.week,
                      rank:
                        current.rank,
                      label:
                        formatDateLabel(
                          current.week
                        ),
                    });
                  }

                  return data;
                })();

                return (
                  <div
                    key={`${entry.rank}-${entry.title}-${entry.artist}`}
                    className="border-t border-black/10 first:border-t-0"
                  >

                    {entry.rank === 1 && (
                      <div className="hidden sm:block">
                        <div className="w-[16.8rem] bg-black px-3 py-2 text-center">
                          <p className="text-sm font-brown-regular uppercase tracking-[0.12em] text-white">
                            {currentWeeksAtNumberOne}{' '}
                            {currentWeeksAtNumberOne ===
                            1
                              ? 'WEEK'
                              : 'WEEKS'}{' '}
                            AT NO. 1
                          </p>
                        </div>
                      </div>
                    )}

                    {entry.rank === 1 && (
                      <div className="block px-3 pt-3 sm:hidden">
                        <div className="bg-black px-3 py-2 text-center">
                          <p className="text-xs font-brown-regular uppercase tracking-[0.1em] text-white">
                            {currentWeeksAtNumberOne}{' '}
                            {currentWeeksAtNumberOne ===
                            1
                              ? 'WEEK'
                              : 'WEEKS'}{' '}
                            AT NO. 1
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="sm:hidden">

                      <div className="flex items-center gap-1.5 px-3 py-3">

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="flex h-[4.6rem] w-7 flex-shrink-0 flex-col overflow-hidden transition hover:opacity-75"
                          aria-label={
                            isExpanded
                              ? 'Collapse song details'
                              : 'Show song details'
                          }
                        >

                          <div className="flex flex-1 items-center justify-center bg-black/10">
                            <img
                              src={`/icons/${getIconFilename(
                                entry.movementIcon
                              )}`}
                              alt={
                                entry.movementIcon ??
                                'movement'
                              }
                              className="h-5 w-5 object-contain"
                            />
                          </div>

                          <div className="flex flex-1 items-center justify-center bg-[#0050FF]">
                            {showBullet && (
                              <img
                                src="/icons/bullet.PNG"
                                alt="trending up"
                                className="h-5 w-5 object-contain"
                              />
                            )}
                          </div>

                        </button>

                        <div className="flex w-7 flex-shrink-0 items-center justify-center">
                          <p className="m-0 text-[1.35rem] font-brown-bold leading-none text-black">
                            {entry.rank}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="h-[4.6rem] w-[4.6rem] flex-shrink-0 cursor-pointer overflow-hidden bg-black/5"
                          aria-label={
                            isExpanded
                              ? 'Collapse song details'
                              : 'Show song details'
                          }
                        >
                          {entry.artwork ? (
                            <img
                              src={entry.artwork}
                              alt={`${entry.title} artwork`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black/5 text-[0.45rem] uppercase tracking-[0.2em] text-black/40">
                              ARTWORK
                            </div>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[0.9rem] font-brown-bold leading-[1.08] text-black">
                            {entry.title}
                          </p>

                          <p className="mt-0.5 break-words text-[0.72rem] font-brown-regular leading-tight text-blue-600">
                            {entry.artist}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            toggleHistory(
                              entry.rank
                            )
                          }
                          className="flex h-7 w-6 flex-shrink-0 items-center justify-center text-xl font-brown-regular leading-none text-black/40 transition hover:text-black/60"
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

                      {isExpanded && (
                        <div className="px-3 pb-3">

                          <div className="bg-black px-3 py-3">
                            <div className="grid grid-cols-3 gap-2 text-center text-white">

                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white/70">
                                  LAST WEEK
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.lastWeekRank ??
                                    '—'}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white/70">
                                  PEAK
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.peakPosition}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center">
                                <p className="text-[0.52rem] font-brown-regular uppercase tracking-[0.12em] text-white">
                                  WEEKS ON CHART
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.weeksOnChart}
                                </p>
                              </div>

                            </div>
                          </div>

                          {(isGreatestGainer ||
                            isHotshotDebut) && (
                            <div className="mt-2 space-y-1">

                              {isGreatestGainer && (
                                <div
                                  className="relative bg-black px-4 py-2.5 text-center"
                                  style={{
                                    clipPath:
                                      'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                                  }}
                                >
                                  <p className="text-[0.62rem] font-brown-regular uppercase tracking-[0.14em] text-white">
                                    GREATEST GAINER
                                  </p>
                                </div>
                              )}

                              {isHotshotDebut && (
                                <div
                                  className="relative bg-black px-4 py-2.5 text-center"
                                  style={{
                                    clipPath:
                                      'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                                  }}
                                >
                                  <p className="text-[0.62rem] font-brown-regular uppercase tracking-[0.14em] text-white">
                                    HOTSHOT DEBUT
                                  </p>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      )}

                    </div>

                    <div className="hidden flex-col gap-4 sm:flex sm:flex-row sm:items-stretch sm:gap-0">

                      {isExpanded && (
                        <div className="flex-shrink-0 sm:self-center sm:pr-2">

                          <div
                            className="relative inline-block bg-black px-4 py-3 shadow-sm"
                            style={{
                              clipPath:
                                'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                            }}
                          >
                            <div className="grid min-w-[260px] grid-cols-3 gap-3 text-center text-white">

                              <div className="flex flex-col items-center justify-center text-center">
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

                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-[0.6rem] font-brown-regular uppercase leading-tight tracking-[0.18em] text-white/70">
                                  <span className="block">
                                    PEAK
                                  </span>
                                  <span className="block">
                                    POSITION
                                  </span>
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.peakPosition}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-[0.6rem] font-brown-regular uppercase leading-tight tracking-[0.18em] text-white/70">
                                  <span className="block">
                                    WEEKS ON
                                  </span>
                                  <span className="block">
                                    CHART
                                  </span>
                                </p>

                                <p className="mt-1 text-sm font-brown-bold text-white">
                                  {entry.weeksOnChart}
                                </p>
                              </div>

                            </div>
                          </div>

                          {(isGreatestGainer ||
                            isHotshotDebut) && (
                            <div className="mt-1 space-y-1">

                              {isGreatestGainer && (
                                <div
                                  className="relative inline-block bg-black px-4 py-2 text-center"
                                  style={{
                                    clipPath:
                                      'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                                  }}
                                >
                                  <p className="text-[0.58rem] font-brown-regular uppercase tracking-[0.12em] text-white">
                                    GREATEST GAINER
                                  </p>
                                </div>
                              )}

                              {isHotshotDebut && (
                                <div
                                  className="relative inline-block bg-black px-4 py-2 text-center"
                                  style={{
                                    clipPath:
                                      'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                                  }}
                                >
                                  <p className="text-[0.58rem] font-brown-regular uppercase tracking-[0.12em] text-white">
                                    HOTSHOT DEBUT
                                  </p>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      )}

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

                          <div className="flex flex-1 items-center justify-center bg-black/10">
                            <img
                              src={`/icons/${getIconFilename(
                                entry.movementIcon
                              )}`}
                              alt={
                                entry.movementIcon ??
                                'movement'
                              }
                              className="h-10 w-10 sm:h-12 sm:w-12"
                            />
                          </div>

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

                        <div className="flex min-h-[120px] w-24 flex-shrink-0 items-center justify-center sm:h-full sm:min-h-0">
                          <p className="m-0 text-center text-[2.5rem] font-brown-bold leading-none text-black sm:text-[3rem]">
                            {entry.rank}
                          </p>
                        </div>

                      </div>

                      <div className="flex flex-1 items-center gap-4 px-4 py-4 sm:px-0 sm:py-[3px] sm:pl-0">

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
                              src={entry.artwork}
                              alt={`${entry.title} artwork`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black/5 text-xs uppercase tracking-[0.35em] text-black/40">
                              ARTWORK
                            </div>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">

                          <p className="text-xl font-brown-bold leading-tight text-black sm:text-4xl">
                            {entry.title}
                          </p>

                          <p className="mt-1 text-xl font-brown-regular text-blue-600">
                            {entry.artist}
                          </p>

                        </div>

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

                    {isHistoryExpanded && (
                      <div className="border-t border-black/10 bg-white px-4 py-6 sm:px-8">

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

                        {graphData.length > 0 ? (

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
                                  tickFormatter={(value) => {
                                    const parts =
                                      String(value).split('/');

                                    if (
                                      parts.length >= 2
                                    ) {
                                      return `${parts[0]}/${parts[1]}`;
                                    }

                                    return String(value);
                                  }}
                                />

                                <YAxis
                                  reversed
                                  domain={[1, 100]}
                                  allowDecimals={false}
                                  tick={{
                                    fontSize: 10,
                                  }}
                                  width={30}
                                />

                                <Tooltip
                                  formatter={(value) => [
                                    `#${value}`,
                                    'Rank',
                                  ]}
                                  labelFormatter={(label) =>
                                    formatDateLabel(
                                      String(label)
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
                                    stroke: '#0050FF',
                                  }}
                                  activeDot={{
                                    r: 5,
                                  }}
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