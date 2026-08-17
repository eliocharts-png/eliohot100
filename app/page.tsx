'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

import ChartSection from '@/components/ChartSection';
import WeeklyHot100Articles from '@/components/WeeklyHot100Articles';

import {
  fetchChartData,
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';

import {
  fetchWeeklyArtistData,
} from '@/lib/weeklyArtistData';

import type { ChartEntry } from '@/types';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

type ChartData = {
  title: string;
  href: string;
  entries: ChartEntry[];
};

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

  /*
   * ---------------------------------------------------------
   * WEEKLY HOT 100 DATA
   * ---------------------------------------------------------
   *
   * This contains the complete Hot 100 history.
   *
   * CHART BEAT uses this same data to generate
   * the three most recent weekly articles.
   */

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

  /*
   * ---------------------------------------------------------
   * WEEKLY ARTISTS
   * ---------------------------------------------------------
   */

  const [weeklyArtists, setWeeklyArtists] =
    useState<
      Awaited<
        ReturnType<
          typeof fetchWeeklyArtistData
        >
      > | null
    >(null);

  const [
    weeklyArtistsLoading,
    setWeeklyArtistsLoading,
  ] = useState(true);

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
                  /*
                   * THE HOT 100
                   *
                   * Fetch the full weekly payload.
                   *
                   * We keep this separately so
                   * CHART BEAT can access the
                   * previous three weeks.
                   */

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

                  /*
                   * OTHER CHARTS
                   */

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

  /*
   * Keep these variables available because
   * they may be used by the global/header
   * search implementation.
   */

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

      {/* =====================================================
          SPACE FOR GLOBAL FIXED HEADER
      ====================================================== */}

      <div className="pt-[3.8rem]">

        {/* ===================================================
            MAIN PAGE LAYOUT
        ==================================================== */}

        <div className="mx-auto max-w-[1360px] px-3 sm:px-6">

          <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">

            {/* =================================================
                TOP ARTISTS BLACK BLOCK
            ================================================= */}

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

                                {/* ARTIST IMAGE */}

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

                                  {/* RANK */}

                                  <div className="absolute left-1/2 top-full z-10 flex h-9 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#0050FF]">

                                    <p className="font-brown-bold text-xl leading-none text-white">
                                      {
                                        entry.rank
                                      }
                                    </p>

                                  </div>

                                </div>

                                {/* ARTIST NAME */}

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

            {/* =================================================
                RIGHT CONTENT
            ================================================= */}

            <div className="min-w-0">

              {/* =================================================
                  ELIO CHARTS TITLE
              ================================================= */}

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

              {/* =================================================
                  CHART SECTIONS
              ================================================= */}

              {chartsLoading ? (

                <div className="space-y-9 sm:space-y-12">

                  {/* SKELETON 1 */}

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

                  {/* SKELETON 2 */}

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

                  {/* SKELETON 3 */}

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
                    (chart) => (
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
                    )
                  )}

                  {/* =================================================
                      CHART BEAT
                  ================================================= */}

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