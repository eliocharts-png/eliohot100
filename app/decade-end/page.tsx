'use client';

import { useEffect, useState } from 'react';

const decades = [
  {
    label: '2010s',
    href: '/decade-end/2010s',
  },
  {
    label: '2020s',
    href: '/decade-end/2020s',
  },
];

export default function DecadeEndPage() {
  const [selectedDecade, setSelectedDecade] =
    useState('2010s');

  useEffect(() => {
    if (selectedDecade === '2010s') {
      window.location.href =
        '/decade-end/2010s';
    }

    if (selectedDecade === '2020s') {
      window.location.href =
        '/decade-end/2020s';
    }
  }, [selectedDecade]);

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
                onChange={(event) =>
                  setSelectedDecade(
                    event.target.value
                  )
                }
                aria-label="Select decade"
                className="h-10 min-w-[130px] border border-black bg-white px-4 text-center font-brown-bold text-sm uppercase tracking-[0.08em] text-black outline-none focus:border-[#0050FF] sm:h-11 sm:min-w-[170px] sm:px-5 sm:text-lg"
              >
                {decades.map(
                  (decade) => (
                    <option
                      key={decade.label}
                      value={decade.label}
                    >
                      {decade.label}
                    </option>
                  )
                )}
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

            {/* PERSONAL CHARTS */}

            <div className="mx-auto flex items-center justify-center gap-1.5 sm:gap-2">

              <p className="text-center text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
                PERSONAL CHARTS BY ELIO
              </p>

            </div>

          </div>

          {/* =================================================
           * CHART AREA
           * ================================================= */}

          <div className="border-x border-b border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

            {/* 2020s / COMING SOON */}

            {selectedDecade === '2020s' && (
              <div className="flex min-h-[300px] items-center justify-center px-6">

                <p className="text-center font-brown-bold text-sm uppercase tracking-[0.2em] text-black/50 sm:text-base">
                  COMING SOON
                </p>

              </div>
            )}

            {/* 2010s / REDIRECT */}

            {selectedDecade === '2010s' && (
              <div className="flex min-h-[300px] items-center justify-center px-6">

                <p className="text-center font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                  LOADING 2010S DECADE-END CHART
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