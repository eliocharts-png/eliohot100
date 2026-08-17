'use client';

import { useEffect, useState } from 'react';
import WeeklyArtistChartDetail from '@/components/WeeklyArtistChartDetail';
import {
  fetchWeeklyArtistData,
} from '@/lib/weeklyArtistData';

/* =========================================================
 * ARTIST CHART LOADING SKELETON
 * ======================================================= */

function ArtistChartSkeleton() {
  return (
    <section className="space-y-0">

      {/* TITLE AREA */}

      <div className="bg-white px-4 py-5 text-center sm:px-6 sm:py-6">
        <div className="mx-auto h-[3.1rem] w-[18rem] animate-pulse bg-black/[0.07] sm:h-[5.5rem] sm:w-[32rem] lg:h-[6.3rem] lg:w-[38rem]" />
      </div>

      {/* WEEK SELECTOR */}

      <div className="flex items-center justify-center bg-white px-4 py-3">
        <div className="h-10 w-52 animate-pulse bg-black/[0.08]" />
      </div>

      {/* BLUE HEADER */}

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="relative flex h-12 items-center justify-center bg-[#0050FF] px-4 py-3 sm:px-6">

          <div className="absolute left-4 h-3 w-16 animate-pulse bg-white/20 sm:left-6 sm:w-20" />

          <div className="h-3 w-44 animate-pulse bg-white/20 sm:w-64" />

        </div>
      </div>

      {/* CHART */}

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="overflow-hidden border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

          <div className="space-y-0">

            {Array.from({ length: 10 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="border-t border-black/10 first:border-t-0"
                >

                  {/* MOBILE */}

                  <div className="flex items-center gap-2 px-3 py-3 sm:hidden">

                    <div className="flex h-[4.6rem] w-7 flex-shrink-0 flex-col overflow-hidden">

                      <div className="flex flex-1 animate-pulse items-center justify-center bg-black/[0.06]" />

                      <div className="flex flex-1 animate-pulse items-center justify-center bg-[#0050FF]/20" />

                    </div>

                    <div className="flex h-7 w-7 flex-shrink-0 animate-pulse items-center justify-center bg-black/[0.05]" />

                    <div className="h-[4.6rem] w-[4.6rem] flex-shrink-0 animate-pulse bg-black/[0.07]" />

                    <div className="min-w-0 flex-1 space-y-2">

                      <div className="h-4 w-[85%] animate-pulse bg-black/[0.07]" />

                      <div className="h-3 w-[60%] animate-pulse bg-black/[0.05]" />

                    </div>

                    <div className="h-7 w-6 flex-shrink-0 animate-pulse bg-black/[0.05]" />

                  </div>

                  {/* DESKTOP */}

                  <div className="hidden sm:flex sm:min-h-[8rem] sm:items-stretch">

                    <div className="flex w-12 flex-shrink-0 flex-col">

                      <div className="flex flex-1 animate-pulse items-center justify-center bg-black/[0.06]" />

                      <div className="flex flex-1 animate-pulse items-center justify-center bg-[#0050FF]/20" />

                    </div>

                    <div className="flex w-24 flex-shrink-0 items-center justify-center">

                      <div className="h-12 w-14 animate-pulse bg-black/[0.05]" />

                    </div>

                    <div className="flex flex-1 items-center gap-4">

                      <div className="h-[7.8rem] w-[7.8rem] flex-shrink-0 animate-pulse bg-black/[0.07]" />

                      <div className="flex-1 space-y-3">

                        <div className="h-7 w-[65%] animate-pulse bg-black/[0.07]" />

                        <div className="h-5 w-[40%] animate-pulse bg-black/[0.05]" />

                      </div>

                      <div className="mr-4 h-10 w-10 animate-pulse bg-black/[0.05]" />

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        </div>
      </div>

    </section>
  );
}

/* =========================================================
 * PAGE
 * ======================================================= */

export default function ArtistsPage() {
  const [weeklyChart, setWeeklyChart] =
    useState<
      Awaited<
        ReturnType<typeof fetchWeeklyArtistData>
      > | null
    >(null);

  const [chartLoading, setChartLoading] =
    useState(true);

  /* =======================================================
   * LOAD INITIAL ARTIST CHART
   * ===================================================== */

  useEffect(() => {
    async function loadWeeklyChart() {
      try {
        setChartLoading(true);

        const data =
          await fetchWeeklyArtistData();

        setWeeklyChart(data);
      } catch (error) {
        console.error(
          'Failed to load weekly artist chart:',
          error
        );

        setWeeklyChart(null);
      } finally {
        setChartLoading(false);
      }
    }

    void loadWeeklyChart();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">

      {/* ===================================================
       * MAIN CONTENT
       * ================================================= */}

      <div className="pt-[3.8rem]">

        {/* =================================================
         * TITLE
         * =============================================== */}

        <header className="px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">

          <div className="mx-auto max-w-6xl">

            <div className="text-center">

              <h1 className="font-brown-bold text-[3.4rem] uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
                ARTIST CHART
              </h1>

            </div>

          </div>

        </header>

        {/* =================================================
         * LOADING
         * =============================================== */}

        {chartLoading && (
          <ArtistChartSkeleton />
        )}

        {/* =================================================
         * ARTIST CHART
         * =============================================== */}

        {!chartLoading &&
          weeklyChart &&
          weeklyChart.entries.length > 0 && (
            <WeeklyArtistChartDetail
              title="ARTIST CHART"
              weekLabel={
                weeklyChart.displayWeek
              }
              week={
                weeklyChart.week
              }
              availableWeeks={
                weeklyChart.availableWeeks
              }
              entries={
                weeklyChart.entries
              }
              entriesByWeek={
                weeklyChart.entriesByWeek
              }
            />
          )}

        {/* =================================================
         * NO DATA
         * =============================================== */}

        {!chartLoading &&
          weeklyChart &&
          weeklyChart.entries.length === 0 && (
            <div className="mx-auto max-w-6xl px-3 sm:px-6">

              <p className="py-8 text-center font-brown-regular text-xs uppercase tracking-[0.15em] text-black/50">
                NO ARTIST CHART DATA
              </p>

            </div>
          )}

      </div>

    </main>
  );
}