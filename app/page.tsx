'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

import ChartSection from '@/components/ChartSection';
import WeeklyHot100Articles from '@/components/WeeklyHot100Articles';

import {
  calculateRecurrentChart,
  fetchChartData,
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';

import {
  fetchWeeklyArtistData,
} from '@/lib/weeklyArtistData';

import type { ChartEntry } from '@/types';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

type ChartData = {
  title: string;
  href: string;
  entries: ChartEntry[];
};

const GOAT_CHART_TITLES = [
  'Greatest of All-Time',
  'Greatest of All-Time Filipino Songs',
  'Greatest of All-Time No. 2 Songs',
  'Greatest of All-Time Female Songs',
];

function parseArtists(csv: string): string[] {
  const parsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: true,
  });

  const artists = parsed.data
    .slice(2)
    .map((row) => row[0]?.trim() ?? '')
    .filter(
      (artist) => artist.length > 0
    );

  return Array.from(
    new Set(artists)
  );
}

function normalizeArtist(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getFallbackArtistImage(
  artistName: string
): string {
  return (
    'https://ui-avatars.com/api/' +
    `?name=${encodeURIComponent(
      artistName
    )}` +
    '&size=600' +
    '&background=0050FF' +
    '&color=ffffff' +
    '&bold=true' +
    '&format=png'
  );
}

/* =========================================================
   HISTORY DROPDOWN
========================================================= */

function HistoryDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpen(false);
    };

    if (open) {
      window.addEventListener(
        'click',
        handleClickOutside
      );
    }

    return () => {
      window.removeEventListener(
        'click',
        handleClickOutside
      );
    };
  }, [open]);

  return (
    <div
      className="relative w-full"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() =>
          setOpen((current) => !current)
        }
        className="flex h-9 w-full items-center justify-center border border-[#0050FF] bg-black px-2 text-[#0050FF] outline-none sm:h-10 lg:h-11"
        style={{
          fontFamily:
            "'Crystal Ultra Condensed Bold', sans-serif",
          fontSize:
            'clamp(1.15rem, 2vw, 1.65rem)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        <span>{value}</span>

        <span
          className={`ml-2 text-[0.7em] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto border border-[#0050FF] bg-black">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full px-2 py-2 text-center text-[#0050FF] transition-colors hover:bg-[#0050FF] hover:text-white ${
                index !== options.length - 1
                  ? 'border-b border-[#0050FF]/40'
                  : ''
              }`}
              style={{
                fontFamily:
                  "'Crystal Ultra Condensed Bold', sans-serif",
                fontSize:
                  'clamp(1.05rem, 1.7vw, 1.4rem)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [charts, setCharts] =
    useState<ChartData[]>([]);

  const [artists, setArtists] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState('');

  const [artistsLoading, setArtistsLoading] =
    useState(true);

  const [chartsLoading, setChartsLoading] =
    useState(true);

  /* =========================================================
     GOAT CHART ROTATION
  ========================================================= */

  const [activeGoatIndex, setActiveGoatIndex] =
    useState(0);

  const [goatTransitionKey, setGoatTransitionKey] =
    useState(0);

  /* =========================================================
     WEEKLY HOT 100 DATA
  ========================================================= */

  const [
    weeklyHot100Data,
    setWeeklyHot100Data,
  ] = useState<
    Awaited<
      ReturnType<
        typeof fetchWeeklyChartData
      >
    > | null
  >(null);

  /* =========================================================
     RECURRENT CHART
  ========================================================= */

  const recurrentChartData = useMemo(
    () =>
      weeklyHot100Data
        ? calculateRecurrentChart(
            weeklyHot100Data
          )
        : null,
    [weeklyHot100Data]
  );

  /* =========================================================
     WEEKLY ARTISTS
  ========================================================= */

  const [weeklyArtists, setWeeklyArtists] =
    useState<
      Awaited<
        ReturnType<
          typeof fetchWeeklyArtistData
        >
      >
    | null
    >(null);

  const [
    weeklyArtistsLoading,
    setWeeklyArtistsLoading,
  ] = useState(true);

  /* =========================================================
     THIS WEEK IN HISTORY
  ========================================================= */

  const historyYears = useMemo(() => {
    if (!weeklyHot100Data) {
      return [];
    }

    return Array.from(
      new Set(
        weeklyHot100Data.availableWeeks
          .map((week) => {
            const parts =
              week.split('/');

            if (
              parts.length !== 3
            ) {
              return '';
            }

            const year =
              Number(parts[2]);

            if (
              Number.isNaN(year)
            ) {
              return '';
            }

            return String(
              year < 50
                ? 2000 + year
                : 1900 + year
            );
          })
          .filter(Boolean)
      )
    ).sort(
      (a, b) =>
        Number(b) - Number(a)
    );
  }, [weeklyHot100Data]);

  const [
    historyYear,
    setHistoryYear,
  ] = useState('');

  const [
    historyPosition,
    setHistoryPosition,
  ] = useState('1');

  const [
    historyWeek,
    setHistoryWeek,
  ] = useState('');

  const getHistoricalWeek = (
    year: string
  ) => {
    if (
      !weeklyHot100Data ||
      !year
    ) {
      return '';
    }

    const currentParts =
      weeklyHot100Data.week.split('/');

    if (
      currentParts.length !== 3
    ) {
      return '';
    }

    const currentMonth =
      Number(currentParts[0]);

    const currentDay =
      Number(currentParts[1]);

    const matchingWeeks =
      weeklyHot100Data.availableWeeks.filter(
        (week) => {
          const parts =
            week.split('/');

          if (
            parts.length !== 3
          ) {
            return false;
          }

          const weekYear =
            Number(parts[2]);

          const fullYear =
            weekYear < 50
              ? 2000 + weekYear
              : 1900 + weekYear;

          return (
            String(fullYear) ===
            year
          );
        }
      );

    if (
      matchingWeeks.length === 0
    ) {
      return '';
    }

    let closestWeek =
      matchingWeeks[0];

    let closestDifference =
      Number.POSITIVE_INFINITY;

    for (
      const week of matchingWeeks
    ) {
      const parts =
        week.split('/');

      const month =
        Number(parts[0]);

      const day =
        Number(parts[1]);

      const difference =
        Math.abs(
          (month * 31 + day) -
          (currentMonth * 31 + currentDay)
        );

      if (
        difference <
        closestDifference
      ) {
        closestDifference =
          difference;

        closestWeek =
          week;
      }
    }

    return closestWeek;
  };

  useEffect(() => {
    if (
      historyYears.length === 0 ||
      historyYear
    ) {
      return;
    }

    const currentParts =
      weeklyHot100Data?.week
        ?.split('/');

    const currentYear =
      currentParts?.[2];

    const fullCurrentYear =
      currentYear
        ? String(
            Number(currentYear) < 50
              ? 2000 +
                Number(currentYear)
              : 1900 +
                Number(currentYear)
          )
        : '';

    const initialYear =
      historyYears.includes(
        fullCurrentYear
      )
        ? fullCurrentYear
        : historyYears[0];

    setHistoryYear(
      initialYear
    );

    setHistoryWeek(
      getHistoricalWeek(
        initialYear
      )
    );
  }, [
    historyYears,
    historyYear,
    weeklyHot100Data,
  ]);

  useEffect(() => {
    if (!historyYear) {
      return;
    }

    const newWeek =
      getHistoricalWeek(
        historyYear
      );

    setHistoryWeek(
      newWeek
    );
  }, [
    historyYear,
  ]);

  const historyEntries =
    useMemo(() => {
      if (
        !weeklyHot100Data ||
        !historyWeek
      ) {
        return [];
      }

      return (
        weeklyHot100Data
          .entriesByWeek[
          historyWeek
        ] ?? []
      );
    }, [
      weeklyHot100Data,
      historyWeek,
    ]);

  useEffect(() => {
    if (
      historyEntries.length === 0
    ) {
      return;
    }

    const positionExists =
      historyEntries.some(
        (entry) =>
          String(entry.rank) ===
          historyPosition
      );

    if (!positionExists) {
      setHistoryPosition(
        String(
          historyEntries[0].rank
        )
      );
    }
  }, [
    historyEntries,
    historyPosition,
  ]);

  const historyEntry =
    historyEntries.find(
      (entry) =>
        String(entry.rank) ===
        historyPosition
    ) ??
    historyEntries[0] ??
    null;

  /* =========================================================
     LOAD CHARTS
  ========================================================= */

  useEffect(() => {
    async function loadCharts() {
      try {
        setChartsLoading(true);

        const results =
          await Promise.all(
            sheetSources.map(
              async (source) => {
                try {
                  if (
                    source.title ===
                    'THE HOT 100'
                  ) {
                    const weeklyData =
                      await fetchWeeklyChartData(
                        source.csvUrl
                      );

                    setWeeklyHot100Data(
                      weeklyData
                    );

                    return {
                      title:
                        source.title,
                      href:
                        source.href,
                      entries:
                        weeklyData.entries,
                    };
                  }

                  const entries =
                    await fetchChartData(
                      source.csvUrl,
                      source.title
                    );

                  return {
                    title:
                      source.title,
                    href:
                      source.href,
                    entries,
                  };
                } catch (
                  error
                ) {
                  console.error(
                    `Failed to load ${source.title}:`,
                    error
                  );

                  return {
                    title:
                      source.title,
                    href:
                      source.href,
                    entries: [],
                  };
                }
              }
            )
          );

        setCharts(results);
      } finally {
        setChartsLoading(false);
      }
    }

    void loadCharts();
  }, []);

  /* =========================================================
     GOAT CHARTS
  ========================================================= */

  const goatCharts =
    useMemo(
      () =>
        charts.filter(
          (chart) =>
            GOAT_CHART_TITLES.includes(
              chart.title
            )
        ),
      [charts]
    );

  /* =========================================================
     ROTATE GOAT CHARTS EVERY 5 SECONDS
  ========================================================= */

  useEffect(() => {
    if (
      goatCharts.length <= 1
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setActiveGoatIndex(
          (current) =>
            (current + 1) %
            goatCharts.length
        );

        setGoatTransitionKey(
          (current) =>
            current + 1
        );
      }, 5000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    goatCharts.length,
  ]);

  const activeGoatChart =
    goatCharts.length > 0
      ? goatCharts[
          activeGoatIndex %
            goatCharts.length
        ]
      : null;

  /* =========================================================
     GOAT HEADER TITLES
  ========================================================= */

  const activeGoatHeaderTitle =
    activeGoatChart?.title ===
    'Greatest of All-Time'
      ? 'HOT 100 SONGS'
      : activeGoatChart?.title ===
        'Greatest of All-Time Filipino Songs'
        ? 'FILIPINO SONGS'
        : activeGoatChart?.title ===
          'Greatest of All-Time No. 2 Songs'
          ? 'NO. 2 SONGS'
          : 'FEMALE SONGS';

  /* =========================================================
     LOAD ARTISTS FOR SEARCH
  ========================================================= */

  useEffect(() => {
    async function loadArtists() {
      try {
        setArtistsLoading(true);

        const response =
          await fetch(
            `${ARTISTS_CSV_URL}&_=artists-${Date.now()}`,
            {
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Artists request failed: ${response.status}`
          );
        }

        const csv =
          await response.text();

        if (!csv.trim()) {
          throw new Error(
            'Artists CSV is empty'
          );
        }

        const artistList =
          parseArtists(csv);

        setArtists(
          artistList
        );
      } catch (error) {
        console.error(
          'Failed to load artists:',
          error
        );

        setArtists([]);
      } finally {
        setArtistsLoading(false);
      }
    }

    void loadArtists();
  }, []);

  /* =========================================================
     LOAD WEEKLY ARTIST CHART
  ========================================================= */

  useEffect(() => {
    async function loadWeeklyArtists() {
      try {
        setWeeklyArtistsLoading(
          true
        );

        const data =
          await fetchWeeklyArtistData();

        setWeeklyArtists(
          data
        );
      } catch (error) {
        console.error(
          'Failed to load weekly artist chart:',
          error
        );

        setWeeklyArtists(
          null
        );
      } finally {
        setWeeklyArtistsLoading(
          false
        );
      }
    }

    void loadWeeklyArtists();
  }, []);

  /* =========================================================
     SEARCH RESULTS
  ========================================================= */

  const filteredArtists =
    useMemo(() => {
      const query =
        normalizeArtist(
          search
        );

      if (!query) {
        return [];
      }

      return artists
        .filter(
          (artist) =>
            normalizeArtist(
              artist
            ).includes(query)
        )
        .slice(0, 20);
    }, [
      artists,
      search,
    ]);

  void filteredArtists;
  void artistsLoading;
  void search;
  void setSearch;

  /* =========================================================
     TOP 3 ARTISTS OF THE WEEK
  ========================================================= */

  const topArtists =
    weeklyArtists
      ?.entries
      ?.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-white text-black">

      <div className="pt-[3.8rem]">

        <div className="mx-auto max-w-[1360px] px-3 sm:px-6">

          <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">

            {/* TOP ARTISTS */}

            <aside className="hidden h-full lg:block">

              <div className="h-full min-h-full w-full bg-black px-6 pb-10 pt-8">

                <div className="sticky top-[4.5rem]">

                  <p className="text-center font-brown-bold text-xs uppercase tracking-[0.18em] text-white">
                    TOP ARTISTS
                  </p>

                  <p className="mt-1 text-center font-brown-regular text-[0.6rem] uppercase tracking-[0.14em] text-white/45">
                    THIS WEEK
                  </p>

                  <div className="mt-7">

                    {weeklyArtistsLoading ? (

                      <div className="space-y-8">

                        {Array.from({
                          length: 3,
                        }).map(
                          (
                            _,
                            index
                          ) => (
                            <div
                              key={`artist-loading-${index}`}
                              className="flex flex-col items-center"
                            >

                              <div className="aspect-square w-full max-w-[150px] animate-pulse bg-white/10" />

                              <div className="mt-3 h-5 w-12 animate-pulse bg-white/10" />

                              <div className="mt-2 h-4 w-[80%] animate-pulse bg-white/10" />

                            </div>
                          )
                        )}

                      </div>

                    ) : topArtists.length >
                      0 ? (

                      <div className="space-y-9">

                        {topArtists.map(
                          (
                            entry,
                            index
                          ) => {

                            const fallbackImage =
                              getFallbackArtistImage(
                                entry.artist
                              );

                            const artistImage =
                              entry.artwork ||
                              fallbackImage;

                            return (
                              <div
                                key={`${entry.rank}-${entry.artist}-${index}`}
                                className="flex flex-col items-center text-center"
                              >

                                <div className="relative w-full max-w-[150px]">

                                  <div className="aspect-square w-full overflow-hidden bg-white/10">

                                    <img
                                      src={
                                        artistImage
                                      }
                                      alt={`${entry.artist} artist`}
                                      className="h-full w-full object-cover"
                                      onError={(
                                        event
                                      ) => {
                                        const image =
                                          event.currentTarget;

                                        if (
                                          image.src !==
                                          fallbackImage
                                        ) {
                                          image.src =
                                            fallbackImage;
                                        }
                                      }}
                                    />

                                  </div>

                                  <div className="absolute left-1/2 top-full z-10 flex h-9 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#0050FF]">

                                    <p className="font-brown-bold text-xl leading-none text-white">
                                      {
                                        entry.rank
                                      }
                                    </p>

                                  </div>

                                </div>

                                <a
                                  href={`/artists/${encodeURIComponent(
                                    entry.artist
                                  )}`}
                                  className="mt-7 max-w-[170px] break-words font-brown-bold text-sm leading-tight text-[#0050FF] transition-opacity hover:opacity-60"
                                >
                                  {
                                    entry.artist
                                  }
                                </a>

                              </div>
                            );
                          }
                        )}

                      </div>

                    ) : (

                      <p className="text-center font-brown-regular text-[0.6rem] uppercase tracking-[0.15em] text-white/40">
                        NO ARTIST DATA
                      </p>

                    )}

                  </div>

                </div>

              </div>

            </aside>

            {/* RIGHT CONTENT */}

            <div className="min-w-0">

              {/* ELIO CHARTS TITLE */}

              <div className="pb-7 pt-6 sm:pb-10 sm:pt-9">

                <header className="text-center">

                  <h1 className="font-brown-bold text-[3.4rem] uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
                    ELIO CHARTS
                  </h1>

                  <p className="mt-3 text-[0.58rem] font-brown-regular uppercase tracking-[0.14em] text-black/50 sm:text-sm sm:tracking-[0.2em]">
                    WEEKLY PERSONAL CHARTS
                  </p>

                </header>

              </div>

              {/* CHART SECTIONS */}

              {chartsLoading ? (

                <div className="space-y-9 sm:space-y-12">

                  <section className="space-y-4 sm:space-y-6">

                    <div className="h-[3rem] w-full animate-pulse bg-black/10 sm:h-[4.5rem]" />

                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-5">

                      {Array.from({
                        length: 5,
                      }).map(
                        (
                          _,
                          index
                        ) => (
                          <div
                            key={`chart-skeleton-1-${index}`}
                            className="min-w-0"
                          >

                            <div className="aspect-square w-full animate-pulse bg-black/10" />

                            <div className="mt-2 space-y-1.5 sm:mt-3">

                              <div className="h-3 w-[85%] animate-pulse bg-black/10 sm:h-4" />

                              <div className="h-2.5 w-[65%] animate-pulse bg-black/5 sm:h-3" />

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </section>

                  <section className="space-y-4 sm:space-y-6">

                    <div className="h-[3rem] w-full animate-pulse bg-black/10 sm:h-[4.5rem]" />

                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-5">

                      {Array.from({
                        length: 5,
                      }).map(
                        (
                          _,
                          index
                        ) => (
                          <div
                            key={`chart-skeleton-2-${index}`}
                            className="min-w-0"
                          >

                            <div className="aspect-square w-full animate-pulse bg-black/10" />

                            <div className="mt-2 space-y-1.5 sm:mt-3">

                              <div className="h-3 w-[85%] animate-pulse bg-black/10 sm:h-4" />

                              <div className="h-2.5 w-[65%] animate-pulse bg-black/5 sm:h-3" />

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </section>

                  <section className="space-y-4 sm:space-y-6">

                    <div className="h-[3rem] w-full animate-pulse bg-black/10 sm:h-[4.5rem]" />

                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-5">

                      {Array.from({
                        length: 5,
                      }).map(
                        (
                          _,
                          index
                        ) => (
                          <div
                            key={`chart-skeleton-3-${index}`}
                            className="min-w-0"
                          >

                            <div className="aspect-square w-full animate-pulse bg-black/10" />

                            <div className="mt-2 space-y-1.5 sm:mt-3">

                              <div className="h-3 w-[85%] animate-pulse bg-black/10 sm:h-4" />

                              <div className="h-2.5 w-[65%] animate-pulse bg-black/5 sm:h-3" />

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </section>

                </div>

              ) : (

                <div className="space-y-9 sm:space-y-12">

                  {charts.map(
                    (chart) => {

                      if (
                        GOAT_CHART_TITLES.includes(
                          chart.title
                        )
                      ) {

                        if (
                          chart.title !==
                          'Greatest of All-Time'
                        ) {
                          return null;
                        }

                        if (
                          !activeGoatChart
                        ) {
                          return null;
                        }

                        return (
                          <div
                            key={`goat-rotation-${goatTransitionKey}`}
                            className="space-y-9 sm:space-y-12"
                          >

                            {/* GOAT SECTION */}

                            <div className="goat-blur-enter">

                              <ChartSection
                                title={
                                  activeGoatChart.title
                                }
                                href={
                                  activeGoatChart.href
                                }
                                entries={
                                  activeGoatChart.entries
                                }
                                headerEyebrow="GREATEST OF ALL TIME"
                                headerTitle={
                                  activeGoatHeaderTitle
                                }
                              />

                            </div>

                            {/* =================================================
                                THIS WEEK IN HISTORY
                            ================================================= */}

                            <section className="w-full bg-black px-4 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">

                              <div className="mx-auto flex w-fit max-w-full items-center gap-3 sm:gap-4 lg:gap-5">

                                {/* THIS WEEK IN */}

                                <span
                                  className="shrink-0 text-[#0050FF]"
                                  style={{
                                    fontFamily:
                                      "'Crystal Ultra Condensed Bold', sans-serif",
                                    fontSize:
                                      'clamp(1.65rem, 3vw, 3rem)',
                                    fontWeight: 700,
                                    letterSpacing:
                                      '0.08em',
                                    lineHeight:
                                      0.9,
                                  }}
                                >
                                  THIS WEEK IN
                                </span>

                                {/* YEAR DROPDOWN */}

                                <div className="w-[clamp(5.5rem,7vw,6.5rem)] shrink-0">
                                  <HistoryDropdown
                                    value={
                                      historyYear
                                    }
                                    options={
                                      historyYears
                                    }
                                    onChange={
                                      setHistoryYear
                                    }
                                    ariaLabel="Select year"
                                  />
                                </div>

                                {/* POSITION DROPDOWN */}

                                <div className="w-[clamp(4rem,5vw,5rem)] shrink-0">
                                  <HistoryDropdown
                                    value={
                                      historyPosition
                                    }
                                    options={historyEntries.map(
                                      (
                                        entry
                                      ) =>
                                        String(
                                          entry.rank
                                        )
                                    )}
                                    onChange={
                                      setHistoryPosition
                                    }
                                    ariaLabel="Select chart position"
                                  />
                                </div>

                                {/* SONG + ARTIST */}

                                {historyEntry && (
                                  <div className="w-[clamp(12rem,28vw,22rem)] min-w-0">

                                    <p className="truncate font-brown-bold text-base leading-none text-[#0050FF] sm:text-lg lg:text-xl">
                                      {
                                        historyEntry.title
                                      }
                                    </p>

                                    <p className="mt-1 truncate font-brown-regular text-xs leading-none text-[#0050FF] sm:text-sm lg:text-base">
                                      {
                                        historyEntry.artist
                                      }
                                    </p>

                                  </div>
                                )}

                              </div>

                            </section>

                          </div>
                        );
                      }

                      return (
                        <ChartSection
                          key={
                            chart.title
                          }
                          title={
                            chart.title
                          }
                          href={
                            chart.href
                          }
                          entries={
                            chart.entries
                          }
                        />
                      );
                    }
                  )}

                  {/* RECURRENT CHARTS */}

                  {recurrentChartData &&
                    recurrentChartData.entries.length > 0 && (
                      <ChartSection
                        title="RECURRENT CHARTS"
                        href="/weekly/recurrent"
                        entries={
                          recurrentChartData.entries
                        }
                      />
                    )}

                  {/* CHART BEAT */}

                  {weeklyHot100Data && (
                    <WeeklyHot100Articles
                      weeklyData={
                        weeklyHot100Data
                      }
                    />
                  )}

                </div>

              )}

              <div className="h-10 sm:h-12" />

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}