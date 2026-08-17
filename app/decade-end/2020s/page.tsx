'use client';

import { useState } from 'react';

export default function DecadeEnd2020sPage() {
  const [showInfo, setShowInfo] =
    useState(false);

  function handleDecadeChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const decade =
      event.target.value;

    if (decade === '2010s') {
      window.location.href =
        '/decade-end/2010s';

      return;
    }

    if (decade === '2020s') {
      window.location.href =
        '/decade-end/2020s';
    }
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
                value="2020s"
                onChange={
                  handleDecadeChange
                }
                aria-label="Select decade"
                className="h-10 min-w-[130px] border border-black bg-white px-4 text-center font-brown-bold text-sm uppercase tracking-[0.08em] text-black outline-none focus:border-[#0050FF] sm:h-11 sm:min-w-[170px] sm:px-5 sm:text-lg"
              >
                <option value="2020s">
                  2020s
                </option>

                <option value="2010s">
                  2010s
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

              {/* INFO BUTTON */}

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
                aria-expanded={
                  showInfo
                }
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
                    data January 2, 2020 through
                    December 27, 2029.
                  </em>
                </p>

              </div>

            </div>
          )}

        </div>

        {/* =================================================
         * COMING SOON
         * ================================================= */}

        <div className="mx-auto max-w-6xl px-3 sm:px-6">

          <div className="flex min-h-[300px] items-center justify-center border-x border-b border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:min-h-[400px]">

            <p className="font-brown-bold text-xl uppercase tracking-[0.15em] text-black sm:text-3xl">
              COMING SOON
            </p>

          </div>

        </div>

      </div>

      <div className="h-12" />

    </main>
  );
}