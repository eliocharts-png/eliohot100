'use client';

import { useEffect, useState } from 'react';
import { fetchChartData, sheetSources } from '@/lib/chartData';
import type { ChartEntry } from '@/types';

export default function DecadeEnd2010sPage() {
  const [entries, setEntries] =
    useState<ChartEntry[]>([]);

  const [selectedDecade, setSelectedDecade] =
    useState('2010s');

  const [showInfo, setShowInfo] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  useEffect(() => {
    async function loadDecadeEnd() {
      try {
        setLoading(true);
        setError(false);

        const source =
          sheetSources.find(
            (item) =>
              item.title ===
              'Decade-End 2010s'
          );

        if (!source) {
          throw new Error(
            'Decade-End 2010s chart source not found'
          );
        }

        const data =
          await fetchChartData(
            source.csvUrl,
            source.title
          );

        if (data.length === 0) {
          throw new Error(
            'No Decade-End chart entries found'
          );
        }

        setEntries(data);
      } catch (loadError) {
        console.error(
          'Failed to load Decade-End chart:',
          loadError
        );

        setEntries([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadDecadeEnd();
  }, []);

  function handleDecadeChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const decade =
      event.target.value;

    if (decade === '2020s') {
      window.location.href =
        '/decade-end/2020s';

      return;
    }

    setSelectedDecade(decade);
  }

  return (
    <main className="min-h-screen bg-white text-black">

      {/* =================================================
       * MAIN CONTENT
       * ================================================= */}

      <div className="pt-[3.8rem]">

        {/* =================================================
         * TITLE
         * ================================================= */}

        <header className="px-4 pb-6 pt-6 text-center sm:px-6 sm:pb-8 sm:pt-8">

          <div className="mx-auto max-w-6xl">

            <h1 className="font-brown-bold text-[3.4rem] uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
              DECADE-END CHARTS
            </h1>

            {/* DECADE DROPDOWN */}

            <div className="mt-6 flex justify-center sm:mt-7">

              <select
                value={selectedDecade}
                onChange={handleDecadeChange}
                aria-label="Select decade"
                className="h-10 min-w-[130px] border border-black bg-white px-4 text-center font-brown-bold text-sm uppercase tracking-[0.08em] text-black outline-none focus:border-[#0050FF] sm:h-11 sm:min-w-[170px] sm:px-5 sm:text-lg"
              >
                <option value="2010s">
                  2010s
                </option>

                <option value="2020s">
                  2020s
                </option>
              </select>

            </div>

          </div>

        </header>

        {/* =================================================
         * BLUE BANNER
         * ================================================= */}

        <div className="mx-auto max-w-6xl px-3 sm:px-6">

          <div className="relative flex min-h-[2.75rem] items-center bg-[#0050FF] px-4 py-3 sm:px-6">

            {/* HOME */}

            <a
              href="/"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
            >
              &lt; HOME
            </a>

            {/* PERSONAL CHARTS + INFO */}

            <div className="mx-auto flex items-center justify-center gap-1.5 sm:gap-2">

              <p className="text-center text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
                PERSONAL CHARTS BY ELIO
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowInfo(
                    (current) =>
                      !current
                  )
                }
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/80 text-[0.7rem] font-brown-bold leading-none text-white transition hover:bg-white hover:text-[#0050FF]"
                aria-label={
                  showInfo
                    ? 'Hide Decade-End methodology'
                    : 'Show Decade-End methodology'
                }
                aria-expanded={showInfo}
              >
                i
              </button>

            </div>

          </div>

          {/* =================================================
           * INFORMATION
           * ================================================= */}

          {showInfo && (
            <div className="border-x border-b border-black/10 bg-white px-3 py-6 sm:px-6">

              <div className="mx-auto max-w-3xl text-center">

                <p className="font-brown-bold text-xs uppercase tracking-[0.2em] text-black">
                  DECADE-END CHARTS
                </p>

                <p className="mt-3 font-brown-regular text-sm leading-relaxed text-black/70 sm:text-base">
                  <em>
                    Songs are ranked based on an
                    inverse point system, with
                    weeks at №1 earning the
                    greatest value and weeks at
                    lower spots earning the least.
                    Due to changes in chart
                    methodology over the years,
                    eras are weighted differently
                    to account for chart turnover
                    rates during periods. Tracking
                    from January 7, 2010 through
                    December 26, 2019.
                  </em>
                </p>

              </div>

            </div>
          )}

        </div>

        {/* =================================================
         * CHART
         * ================================================= */}

        <div className="mx-auto max-w-6xl px-3 sm:px-6">

          <div className="border-x border-b border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

            {/* LOADING */}

            {loading && (
              <div className="flex min-h-[300px] items-center justify-center">

                <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                  LOADING DECADE-END CHART
                </p>

              </div>
            )}

            {/* ERROR */}

            {!loading &&
              error && (
                <div className="flex min-h-[300px] items-center justify-center">

                  <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                    UNABLE TO LOAD DECADE-END CHART
                  </p>

                </div>
              )}

            {/* CHART ENTRIES */}

            {!loading &&
              !error &&
              entries.map(
                (entry, index) => (
                  <div
                    key={`${entry.rank}-${entry.title}-${entry.artist}-${index}`}
                    className={`flex items-center gap-1.5 px-3 py-3 sm:gap-6 sm:px-6 ${
                      index > 0
                        ? 'border-t border-black/10'
                        : ''
                    }`}
                  >

                    {/* RANK */}

                    <div className="flex w-7 flex-shrink-0 items-center justify-center sm:w-20">

                      <p className="m-0 font-brown-bold text-[1.35rem] leading-none text-black sm:text-[3.5rem]">
                        {String(entry.rank)}
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
                        <div className="flex h-full w-full items-center justify-center font-brown-regular text-[0.45rem] uppercase tracking-[0.2em] text-black/40">
                          ARTWORK
                        </div>
                      )}

                    </div>

                    {/* TITLE + ARTIST */}

                    <div className="min-w-0 flex-1">

                      <p className="break-words font-brown-bold text-[0.9rem] leading-[1.08] text-black sm:text-4xl">
                        {entry.title}
                      </p>

                      <p className="mt-0.5 break-words font-brown-regular text-[0.72rem] leading-tight text-blue-600 sm:mt-1 sm:text-xl">
                        {entry.artist}
                      </p>

                    </div>

                  </div>
                )
              )}

            {/* NO DATA */}

            {!loading &&
              !error &&
              entries.length === 0 && (
                <div className="flex min-h-[300px] items-center justify-center">

                  <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                    NO DECADE-END CHART DATA AVAILABLE
                  </p>

                </div>
              )}

          </div>

        </div>

      </div>

      <div className="h-12" />

    </main>
  );
}