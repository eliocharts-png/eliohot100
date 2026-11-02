
'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';

interface RecordEntry {
  rank: number;
  title: string;
  artist: string;
  artwork: string;
}

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2032802693&single=true&output=csv';

export default function TopRecordsPage() {
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      try {
        const response = await fetch(CSV_URL, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch records');
        }

        const csvText = await response.text();

        const parsed = Papa.parse<string[]>(csvText, {
          skipEmptyLines: true,
        });

        const data = parsed.data
          .map((row) => {
            const combined = (row[1] || '').trim();

            const lines = combined
              .split(/\r\n|\n|\r/)
              .map((line) => line.trim())
              .filter(Boolean);

            return {
              rank: Number(row[0]),
              title: lines[0] || '',
              artist: lines.slice(1).join(' '),
              artwork: row[2]?.trim() || '',
            };
          })
          .filter(
            (entry) =>
              entry.rank > 0 &&
              entry.title
          )
          .sort((a, b) => a.rank - b.rank);

        if (!cancelled) {
          setEntries(data);
        }
      } catch (err) {
        console.error('Error loading Top Records:', err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">

      <div className="pt-[3.8rem]">

        {/* HEADER */}
        <div className="bg-white px-4 py-5 text-center sm:px-6 sm:py-6">
          <h1 className="text-[3.4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            TOP RECORDS
          </h1>
        </div>

        {/* BLUE BANNER */}
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="relative flex min-h-[2.75rem] items-center bg-[#0050FF] px-4 py-3 sm:px-6">

            <a
              href="/goat"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
            >
              &lt; HOME
            </a>

            <div className="ml-auto flex max-w-[65%] items-center justify-end gap-1.5 sm:mx-auto sm:max-w-none sm:justify-center sm:gap-2">

              <p className="text-right text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
                PERSONAL CHARTS BY ELIO
              </p>

              {/* INFO BUTTON */}
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowInfo((current) => !current)
                  }
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80 text-[0.7rem] font-brown-bold leading-none text-white transition hover:bg-white hover:text-[#0050FF]"
                  aria-label="Show chart methodology"
                  aria-expanded={showInfo}
                >
                  i
                </button>

                {showInfo && (
                  <div
                    className="absolute right-0 top-full z-[200] mt-3 w-[18rem] sm:right-1/2 sm:w-[32rem] sm:translate-x-1/2"
                    onMouseEnter={() => setShowInfo(true)}
                    onMouseLeave={() => setShowInfo(false)}
                  >
                    <div className="border border-black/10 bg-white px-5 py-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:px-7 sm:py-6">

                      <p className="text-[0.62rem] font-brown-bold uppercase tracking-[0.2em] text-black sm:text-xs">
                        TOP RECORDS
                      </p>

                      <p className="mt-3 text-xs font-brown-regular leading-relaxed text-black/70 sm:text-sm">
                        <em>
                          Albums are ranked based on an inverse point system, with weeks at №1 earning the greatest value and weeks at lower spots earning the least. Due to changes in chart methodology over the years, eras are weighted differently to account for chart turnover rates during periods. As of October 22nd, 2026 week-ending.
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

            {/* LOADING */}
            {!loaded && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  LOADING TOP RECORDS
                </p>
              </div>
            )}

            {/* ERROR */}
            {loaded && error && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  UNABLE TO LOAD TOP RECORDS
                </p>
              </div>
            )}

            {/* ENTRIES */}
            {loaded && !error &&
              entries.map((entry) => (
                <div
                  key={`${entry.rank}-${entry.title}-${entry.artist}`}
                  className="border-t border-black/10 first:border-t-0"
                >
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
                          loading="lazy"
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

                  </div>
                </div>
              ))}

            {/* EMPTY STATE */}
            {loaded && !error && entries.length === 0 && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  NO TOP RECORDS DATA AVAILABLE
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
