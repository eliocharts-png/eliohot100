
'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AlbumChartPayload,
  AlbumWeeklyEntry,
} from '@/lib/albumChartData';

interface AlbumChartDetailProps extends AlbumChartPayload {}

function formatShortDate(week: string): string {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(week)
      ? `${week}T00:00:00Z`
      : week
  );

  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = String(date.getUTCFullYear()).slice(-2);

    return `${month}/${day}/${year}`;
  }

  const [month, day, year] = week.split('/').map(Number);

  if (!month || !day || year === undefined) return week;

  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  const fallbackDate = new Date(
    Date.UTC(fullYear, month - 1, day)
  );

  return `${String(fallbackDate.getUTCMonth() + 1).padStart(2, '0')}/${String(
    fallbackDate.getUTCDate()
  ).padStart(2, '0')}/${String(
    fallbackDate.getUTCFullYear()
  ).slice(-2)}`;
}

function formatFullDate(week: string): string {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(week)
      ? `${week}T00:00:00Z`
      : week
  );

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
      .format(date)
      .toUpperCase();
  }

  const [month, day, year] = week.split('/').map(Number);

  if (!month || !day || year === undefined) {
    return week.toUpperCase();
  }

  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  const fallbackDate = new Date(
    Date.UTC(fullYear, month - 1, day)
  );

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(fallbackDate)
    .toUpperCase();
}

function parseChartDate(value: string): number {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00Z`
      : value
  );

  if (!Number.isNaN(date.getTime())) {
    return date.getTime();
  }

  const [month, day, year] = value.split('/').map(Number);

  if (!month || !day || year === undefined) return 0;

  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  return Date.UTC(fullYear, month - 1, day);
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
  switch (normalizeMovementIcon(movementIcon)) {
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

type ChartHistoryPoint = {
  week: string;
  rank: number | null;
  label: string;
};

function buildChartHistory(
  history: NonNullable<AlbumWeeklyEntry['chartHistory']>,
  selectedWeek: string
): ChartHistoryPoint[] {
  const selectedTime = parseChartDate(selectedWeek);

  const points = history
    .filter((point) => {
      const time = parseChartDate(point.week);
      const rank = Number(point.rank);

      return (
        time > 0 &&
        time <= selectedTime &&
        Number.isFinite(rank) &&
        rank >= 1 &&
        rank <= 100
      );
    })
    .sort(
      (a, b) =>
        parseChartDate(a.week) - parseChartDate(b.week)
    );

  const result: ChartHistoryPoint[] = [];
  let previousTime: number | null = null;

  for (const point of points) {
    const time = parseChartDate(point.week);

    if (previousTime !== null) {
      const weeksApart = Math.round(
        (time - previousTime) / (7 * 24 * 60 * 60 * 1000)
      );

      if (weeksApart > 1) {
        result.push({
          week: `gap-${previousTime}-${time}`,
          rank: null,
          label: '',
        });
      }
    }

    result.push({
      week: point.week,
      rank: Number(point.rank),
      label: `WEEK OF ${formatFullDate(point.week)}`,
    });

    previousTime = time;
  }

  return result;
}

export default function AlbumChartDetail({
  week,
  availableWeeks,
  weeksAtNumberOne,
  entries,
  entriesByWeek,
  weeksAtNumberOneByWeek,
}: AlbumChartDetailProps) {
  const [selectedWeek, setSelectedWeek] = useState(week);
  const [expandedHistory, setExpandedHistory] =
    useState<string | null>(null);

  const currentEntries =
    entriesByWeek?.[selectedWeek] ?? entries;

  const selectedWeekIndex =
    availableWeeks.indexOf(selectedWeek);

  const previousWeek =
    selectedWeekIndex >= 0 &&
    selectedWeekIndex < availableWeeks.length - 1
      ? availableWeeks[selectedWeekIndex + 1]
      : null;

  const nextWeek =
    selectedWeekIndex > 0
      ? availableWeeks[selectedWeekIndex - 1]
      : null;

  const previousEntries = previousWeek
    ? entriesByWeek?.[previousWeek] ?? []
    : [];

  const currentWeeksAtNumberOne =
    weeksAtNumberOneByWeek?.[selectedWeek] ??
    weeksAtNumberOne;

  const currentDisplayWeek = `WEEK OF ${formatFullDate(selectedWeek)}`;

  function changeWeek(weekToSelect: string | null) {
    if (!weekToSelect) return;

    setSelectedWeek(weekToSelect);
    setExpandedHistory(null);
  }

  function toggleHistory(entry: AlbumWeeklyEntry) {
    const key = `${entry.title}|||${entry.artist}`;

    setExpandedHistory((current) =>
      current === key ? null : key
    );
  }

  async function handleShare() {
    const shareUrl =
      `${window.location.origin}/albums?week=${encodeURIComponent(
        selectedWeek
      )}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Elio Charts Weekly Album Chart',
          text: `Elio Charts Weekly Album Chart (${currentDisplayWeek})`,
          url: shareUrl,
        });
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // The share dialog may be cancelled by the user.
    }
  }

  function hasBullet(entry: AlbumWeeklyEntry): boolean {
    const movement = normalizeMovementIcon(entry.movementIcon);

    if (
      movement === 'debut' ||
      movement === 'reentry' ||
      movement === 'reenter'
    ) {
      return true;
    }

    const previousEntry = previousEntries.find(
      (item) =>
        item.title === entry.title &&
        item.artist === entry.artist
    );

    return Boolean(
      previousEntry &&
      entry.points > previousEntry.points
    );
  }

  return (
    <section className="space-y-0">
      {/* CHART TITLE */}

      <div className="bg-white px-4 pb-5 pt-10 text-center sm:px-6 sm:pb-6 sm:pt-12">
        <h1 className="text-[3.4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
          TOP RECORDS
        </h1>
      </div>

      {/* WEEK NAVIGATION */}

      <div className="flex items-center justify-center gap-2 bg-white px-3 py-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => changeWeek(previousWeek)}
          disabled={!previousWeek}
          aria-label="Previous week's chart"
          title="Previous week"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-black/10 bg-white text-black transition-colors hover:border-[#0050FF] hover:text-[#0050FF] disabled:cursor-not-allowed disabled:opacity-25"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m14.5 5-7 7 7 7" />
          </svg>
        </button>

        <select
          value={selectedWeek}
          onChange={(event) => changeWeek(event.target.value)}
          aria-label="Choose chart week"
          className="min-w-0 max-w-[calc(100%-6rem)] cursor-pointer appearance-none rounded-none bg-black px-3 py-2.5 text-center text-xs font-brown-regular uppercase tracking-[0.08em] text-white outline-none sm:px-5 sm:text-sm sm:tracking-[0.12em]"
        >
          {availableWeeks.map((weekOption) => (
            <option key={weekOption} value={weekOption}>
              {`WEEK OF ${formatFullDate(weekOption)}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => changeWeek(nextWeek)}
          disabled={!nextWeek}
          aria-label="Next week's chart"
          title="Next week"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-black/10 bg-white text-black transition-colors hover:border-[#0050FF] hover:text-[#0050FF] disabled:cursor-not-allowed disabled:opacity-25"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m9.5 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* BLUE HEADER */}

      <div className="mx-auto max-w-[68rem] px-3 sm:px-6">
        <div className="relative flex w-full items-center justify-center bg-[#0050FF] px-4 py-3 sm:px-6">
          <a
            href="/"
            className="absolute left-4 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
          >
            &lt; HOME
          </a>

          <p className="ml-auto mr-12 max-w-[55%] text-right text-[0.58rem] font-brown-regular uppercase tracking-[0.12em] text-white sm:mx-auto sm:max-w-none sm:text-base sm:tracking-[0.2em]">
            PERSONAL CHARTS BY ELIO
          </p>

          <button
            type="button"
            onClick={handleShare}
            className="absolute right-3 flex items-center gap-1.5 text-white transition-opacity hover:opacity-70 sm:right-6 sm:gap-2"
            aria-label="Share this chart"
          >
            <span className="hidden text-[0.6rem] font-brown-regular uppercase tracking-[0.12em] sm:inline">
              SHARE
            </span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="19" r="2.5" />
              <path d="M8.2 10.8 15.8 6.2" />
              <path d="m8.2 13.2 7.6 4.6" />
            </svg>
          </button>
        </div>
      </div>

      {/* ALBUM CHART */}

      <div className="mx-auto max-w-[68rem] px-3 sm:px-6">
        <div className="border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          {currentEntries.length > 0 ? (
            currentEntries.map((entry) => {
              const key = `${entry.title}|||${entry.artist}`;
              const isHistoryExpanded = expandedHistory === key;
              const showBullet = hasBullet(entry);

              const graphData = buildChartHistory(
                entry.chartHistory ?? [],
                selectedWeek
              );

              return (
                <article
                  key={`${key}::${entry.rank}`}
                  className="group border-y border-black/10 transition-colors duration-150 first:border-t-0 hover:border-[#0050FF]"
                >
                  {/* MOBILE ROW */}

                  <div className="sm:hidden">
                    <div className="relative flex w-full items-center">
                      <div className="flex h-[4.1rem] w-7 flex-shrink-0 flex-col overflow-hidden">
                        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/10">
                          <img
                            src={`/icons/${getIconFilename(entry.movementIcon)}`}
                            alt={entry.movementIcon ?? 'movement'}
                            className="h-6 w-6 object-contain"
                          />
                        </div>

                        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0050FF]">
                          {showBullet && (
                            <img
                              src="/icons/bullet.PNG"
                              alt="Chart highlight"
                              className="h-6 w-6 object-contain"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex h-[4.1rem] w-7 flex-shrink-0 items-center justify-center">
                        <p className="m-0 text-[1.35rem] font-brown-bold leading-none text-black">
                          {entry.rank}
                        </p>
                      </div>

                      <div className="h-[4.1rem] w-[4.1rem] flex-shrink-0 overflow-hidden bg-black/5">
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
                      </div>

                      <div className="min-w-0 flex-1 px-2 py-2 pr-1">
                        <div className="flex h-full flex-col justify-center">
                          {entry.rank === 1 && (
                            <span className="mb-1 inline-flex w-fit items-center bg-[#0050FF] px-2 py-1.5 text-[0.58rem] font-brown-bold uppercase leading-none tracking-[0.05em] text-white">
                              {currentWeeksAtNumberOne}{' '}
                              {currentWeeksAtNumberOne === 1
                                ? 'WEEK'
                                : 'WEEKS'}{' '}
                              AT NO. 1
                            </span>
                          )}

                          <p className="break-words text-[0.9rem] font-brown-bold leading-[1.08] text-black">
                            {entry.title}
                          </p>

                          <p className="mt-0.5 break-words text-[0.72rem] font-brown-regular leading-tight text-blue-600">
                            {entry.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex w-[4.2rem] flex-shrink-0 flex-col items-end justify-center py-1 pr-1">
                        <div className="flex w-full items-baseline justify-end gap-1 whitespace-nowrap text-right">
                          <span className="text-[0.48rem] font-brown-regular uppercase leading-none tracking-[0.04em] text-black/40">
                            PEAK:
                          </span>
                          <span className="text-[0.68rem] font-brown-bold leading-none text-black/50">
                            {entry.peakPosition}
                          </span>
                        </div>

                        <div className="mt-1 flex w-full items-baseline justify-end gap-1 whitespace-nowrap text-right">
                          <span className="text-[0.48rem] font-brown-regular uppercase leading-none tracking-[0.04em] text-black/40">
                            WEEKS:
                          </span>
                          <span className="text-[0.68rem] font-brown-bold leading-none text-black/50">
                            {entry.weeksOnChart}
                          </span>
                        </div>

                        <div className="mt-1 flex w-full items-baseline justify-end gap-1 whitespace-nowrap text-right">
                          <span className="text-[0.48rem] font-brown-regular uppercase leading-none tracking-[0.04em] text-black/40">
                            LW:
                          </span>
                          <span className="text-[0.68rem] font-brown-bold leading-none text-black/50">
                            {entry.lastWeekRank ?? '—'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleHistory(entry)}
                        className="flex h-[4.1rem] w-7 flex-shrink-0 items-center justify-center text-xl font-brown-regular leading-none text-black/40 transition hover:text-black/60"
                        aria-label={
                          isHistoryExpanded
                            ? 'Collapse chart history'
                            : 'Show chart history'
                        }
                        aria-expanded={isHistoryExpanded}
                      >
                        {isHistoryExpanded ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {/* DESKTOP ROW */}

                  <div className="hidden sm:flex sm:flex-row sm:items-stretch">
                    <div className="relative flex flex-shrink-0 items-stretch">
                      <div className="pointer-events-none absolute right-full top-1/2 z-20 hidden -translate-y-1/2 pr-2 group-hover:block">
                        <div
                          className="relative bg-black px-2 py-3 shadow-md"
                          style={{
                            clipPath:
                              'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)',
                          }}
                        >
                          <div className="grid w-[155px] grid-cols-3 gap-2 text-center text-white">
                            <div className="flex min-w-0 flex-col items-center justify-center text-center">
                              <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                LAST
                                <br />
                                WEEK
                              </p>
                              <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                {entry.lastWeekRank ?? '—'}
                              </p>
                            </div>

                            <div className="flex min-w-0 flex-col items-center justify-center text-center">
                              <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                PEAK
                                <br />
                                POSITION
                              </p>
                              <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                {entry.peakPosition}
                              </p>
                            </div>

                            <div className="flex min-w-0 flex-col items-center justify-center text-center">
                              <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                WEEKS ON
                                <br />
                                CHART
                              </p>
                              <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                {entry.weeksOnChart}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-12 flex-shrink-0 flex-col">
                        <div className="flex flex-1 items-center justify-center bg-black/10">
                          <img
                            src={`/icons/${getIconFilename(entry.movementIcon)}`}
                            alt={entry.movementIcon ?? 'movement'}
                            className="h-12 w-12 object-contain"
                          />
                        </div>

                        <div className="flex flex-1 items-center justify-center bg-[#0050FF]">
                          {showBullet && (
                            <img
                              src="/icons/bullet.PNG"
                              alt="Chart highlight"
                              className="h-12 w-12 object-contain"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex w-24 flex-shrink-0 items-center justify-center">
                        <p className="m-0 text-center text-[3rem] font-brown-bold leading-none text-black">
                          {entry.rank}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-4 py-[3px]">
                      <div className="h-[7.8rem] w-[7.8rem] flex-shrink-0 overflow-hidden bg-black/5">
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
                      </div>

                      <div className="min-w-0 flex-1">
                        {entry.rank === 1 && (
                          <span className="mb-2 inline-flex w-fit items-center bg-[#0050FF] px-3 py-2.5 text-[0.72rem] font-brown-bold uppercase leading-none tracking-[0.06em] text-white">
                            {currentWeeksAtNumberOne}{' '}
                            {currentWeeksAtNumberOne === 1
                              ? 'WEEK'
                              : 'WEEKS'}{' '}
                            AT NO. 1
                          </span>
                        )}

                        <p className="text-xl font-brown-bold leading-tight text-black sm:text-4xl">
                          {entry.title}
                        </p>

                        <p className="mt-1 text-xl font-brown-regular text-blue-600">
                          {entry.artist}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleHistory(entry)}
                        className="ml-auto flex h-10 w-10 flex-shrink-0 items-center justify-center self-center text-3xl font-brown-regular text-black/40 transition hover:text-black/60"
                        aria-label={
                          isHistoryExpanded
                            ? 'Collapse chart history'
                            : 'Show chart history'
                        }
                        aria-expanded={isHistoryExpanded}
                      >
                        {isHistoryExpanded ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {/* ALBUM CHART HISTORY */}

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

                      {graphData.some((point) => point.rank !== null) ? (
                        <div className="h-[240px] w-full overflow-visible sm:h-[340px]">
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                          >
                            <LineChart
                              data={graphData}
                              margin={{
                                top: 16,
                                right: 20,
                                left: 6,
                                bottom: 12,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#00000015"
                              />

                              <XAxis
                                dataKey="week"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => {
                                  const point = graphData.find(
                                    (item) => item.week === value
                                  );

                                  return point?.label ?? '';
                                }}
                                minTickGap={24}
                                tickMargin={8}
                              />

                              <YAxis
                                reversed
                                type="number"
                                domain={[1, 100]}
                                ticks={[1, 20, 40, 60, 80, 100]}
                                allowDataOverflow={false}
                                allowDecimals={false}
                                tickFormatter={(value) => `#${value}`}
                                tick={{ fontSize: 10 }}
                                width={38}
                                padding={{
                                  top: 10,
                                  bottom: 10,
                                }}
                              />

                              <Tooltip
                                contentStyle={{
                                  backgroundColor:
                                    'var(--chart-tooltip-bg, #ffffff)',
                                  border:
                                    '1px solid var(--chart-tooltip-border, #e5e7eb)',
                                  borderRadius: '0px',
                                  color:
                                    'var(--chart-tooltip-text, #111111)',
                                }}
                                labelStyle={{ color: '#0050FF' }}
                                itemStyle={{ color: '#0050FF' }}
                                formatter={(value) => [
                                  value == null
                                    ? 'No chart position'
                                    : `#${value}`,
                                  'Rank',
                                ]}
                                labelFormatter={(label) => {
                                  const point = graphData.find(
                                    (item) => item.week === label
                                  );

                                  return point?.label ?? '';
                                }}
                              />

                              <Line
                                type="monotone"
                                dataKey="rank"
                                name="Rank"
                                stroke="#0050FF"
                                strokeWidth={3}
                                dot={{
                                  r: 3,
                                  fill: '#0050FF',
                                  stroke: '#0050FF',
                                }}
                                activeDot={{
                                  r: 5,
                                  fill: '#0050FF',
                                  stroke: '#0050FF',
                                }}
                                connectNulls={false}
                                isAnimationActive={false}
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
                </article>
              );
            })
          ) : (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
              <p className="text-xs font-brown-regular uppercase tracking-[0.18em] text-black/40">
                NO ALBUMS AVAILABLE
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="h-20" />
    </section>
  );
}
