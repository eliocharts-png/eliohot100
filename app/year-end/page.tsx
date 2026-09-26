'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSearchParams } from 'next/navigation';

import { sheetSources } from '@/lib/chartData';
import type { ChartEntry } from '@/types';

type YearEndEntry = ChartEntry & {
  year: string;
};

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];

    if (char === '"') {
      if (
        quoted &&
        csv[i + 1] === '"'
      ) {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (
      char === ',' &&
      !quoted
    ) {
      row.push(value);
      value = '';
      continue;
    }

    if (
      (char === '\n' ||
        char === '\r') &&
      !quoted
    ) {
      if (
        char === '\r' &&
        csv[i + 1] === '\n'
      ) {
        i += 1;
      }

      row.push(value);
      value = '';

      if (
        row.some(
          (cell) =>
            cell.trim() !== ''
        )
      ) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (
    value !== '' ||
    row.length > 0
  ) {
    row.push(value);

    if (
      row.some(
        (cell) =>
          cell.trim() !== ''
      )
    ) {
      rows.push(row);
    }
  }

  return rows;
}

function parseSong(
  content: string
): {
  title: string;
  artist: string;
} {
  const normalizedContent =
    content.replace(
      /<br\s*\/?>/gi,
      '\n'
    );

  const parts =
    normalizedContent
      .split(/\r?\n/)
      .map(
        (part) => part.trim()
      )
      .filter(Boolean);

  return {
    title:
      parts[0] || content,
    artist:
      parts[1] || '',
  };
}

function parseYearEndData(
  csv: string
): YearEndEntry[] {
  const rows = parseCSV(csv);

  const result: YearEndEntry[] = [];

  for (const row of rows) {
    const year =
      (row[0] || '').trim();

    const rank =
      Number(
        (row[1] || '').trim()
      );

    const content =
      (row[2] || '').trim();

    const artwork =
      (row[3] || '').trim();

    if (
      !year ||
      rank <= 0 ||
      !content
    ) {
      continue;
    }

    const song =
      parseSong(content);

    result.push({
      year,
      rank,
      title: song.title,
      artist: song.artist,
      artwork,
    });
  }

  return result.sort(
    (a, b) => {
      const yearDifference =
        Number(b.year) -
        Number(a.year);

      if (
        yearDifference !== 0
      ) {
        return yearDifference;
      }

      return a.rank - b.rank;
    }
  );
}

function YearEndPageContent() {
  const searchParams =
    useSearchParams();

  const requestedYear =
    searchParams.get(
      'year'
    );

  const requestedSong =
    searchParams.get(
      'song'
    );

  const [entries, setEntries] =
    useState<YearEndEntry[]>([]);

  const [selectedYear, setSelectedYear] =
    useState<string>('');

  const [years, setYears] =
    useState<string[]>([]);

  const [showInfo, setShowInfo] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const hasHandledTarget =
    useRef(false);

  useEffect(() => {
    async function loadYearEnd() {
      try {
        setLoading(true);
        setError(false);

        const source =
          sheetSources.find(
            (item) =>
              item.title ===
              'Year-End'
          );

        if (!source) {
          throw new Error(
            'Year-End chart source not found'
          );
        }

        const response =
          await fetch(
            source.csvUrl,
            {
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Year-End request failed: ${response.status}`
          );
        }

        const csv =
          await response.text();

        if (!csv.trim()) {
          throw new Error(
            'Year-End CSV is empty'
          );
        }

        const data =
          parseYearEndData(csv);

        if (
          data.length === 0
        ) {
          throw new Error(
            'No Year-End chart entries found'
          );
        }

        setEntries(data);

        const availableYears =
          Array.from(
            new Set<string>(
              data.map(
                (entry) =>
                  entry.year
              )
            )
          ).sort(
            (a, b) =>
              Number(b) -
              Number(a)
          );

        setYears(
          availableYears
        );

        /*
         * If a year was supplied
         * in the URL and that year
         * exists, use it.
         *
         * Otherwise default to
         * the newest year.
         */
        if (
          requestedYear &&
          availableYears.includes(
            requestedYear
          )
        ) {
          setSelectedYear(
            requestedYear
          );
        } else if (
          availableYears.length > 0
        ) {
          setSelectedYear(
            availableYears[0]
          );
        }
      } catch (loadError) {
        console.error(
          'Failed to load Year-End chart:',
          loadError
        );

        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadYearEnd();
  }, [requestedYear]);

  const currentEntries =
    useMemo(() => {
      return entries
        .filter(
          (entry) =>
            entry.year ===
            selectedYear
        )
        .sort(
          (a, b) =>
            a.rank - b.rank
        );
    }, [
      entries,
      selectedYear,
    ]);

  /*
   * Find the requested song
   * inside the selected year.
   */
  const targetEntry =
    useMemo(() => {
      if (
        !requestedSong ||
        !selectedYear
      ) {
        return null;
      }

      const normalizedTarget =
        requestedSong
          .trim()
          .toLowerCase();

      return (
        currentEntries.find(
          (entry) =>
            entry.title
              .trim()
              .toLowerCase() ===
            normalizedTarget
        ) ?? null
      );
    }, [
      currentEntries,
      requestedSong,
      selectedYear,
    ]);

  /*
   * Scroll to the requested
   * song after the chart has
   * rendered.
   */
  useEffect(() => {
    if (
      loading ||
      !targetEntry ||
      hasHandledTarget.current
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        const targetId =
          `year-end-${targetEntry.year}-${targetEntry.rank}`;

        const element =
          document.getElementById(
            targetId
          );

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          element.classList.add(
            'year-end-target'
          );

          window.setTimeout(() => {
            element.classList.remove(
              'year-end-target'
            );
          }, 2500);

          hasHandledTarget.current =
            true;
        }
      }, 150);

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    loading,
    targetEntry,
  ]);

  /*
   * Reset the target handler
   * whenever the requested
   * year/song changes.
   */
  useEffect(() => {
    hasHandledTarget.current =
      false;
  }, [
    requestedYear,
    requestedSong,
  ]);

  return (
    <main className="min-h-screen bg-white text-black">

      <div className="pt-[3.8rem]">

        <header className="px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">

          <div className="mx-auto max-w-6xl">

            <div className="text-center">

              <h1 className="font-brown-bold text-[3.4rem] uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
                YEAR-END CHARTS
              </h1>

              <div className="mt-6 flex justify-center sm:mt-7">

                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(
                      event.target.value
                    )
                  }
                  disabled={
                    loading ||
                    years.length === 0
                  }
                  aria-label="Select year"
                  className="h-10 min-w-[130px] border border-black bg-white px-4 text-center font-brown-bold text-sm uppercase tracking-[0.08em] text-black outline-none focus:border-[#0050FF] sm:h-11 sm:min-w-[170px] sm:px-5 sm:text-lg"
                >
                  {years.map(
                    (year) => (
                      <option
                        key={`year-${year}`}
                        value={year}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>

              </div>

            </div>

          </div>

        </header>

        <div className="mx-auto max-w-6xl px-3 sm:px-6">

          <div className="relative flex min-h-[2.75rem] items-center bg-[#0050FF] px-4 py-3 sm:px-6">

            <a
              href="/"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
            >
              &lt; HOME
            </a>

            <div className="ml-auto flex max-w-[62%] items-center justify-end gap-1.5 sm:mx-auto sm:max-w-none sm:justify-center sm:gap-2">

              <p className="text-right text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
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
                    ? 'Hide Year-End methodology'
                    : 'Show Year-End methodology'
                }
                aria-expanded={
                  showInfo
                }
              >
                i
              </button>

            </div>

          </div>

          {showInfo && (
            <div className="border-x border-b border-black/10 bg-white px-3 py-6 sm:px-6">

              <div className="mx-auto max-w-3xl text-center">

                <p className="font-brown-bold text-xs uppercase tracking-[0.2em] text-black">
                  YEAR-END CHARTS
                </p>

                <p className="mt-3 font-brown-regular text-sm leading-relaxed text-black/70 sm:text-base">
                  <em>
                    Year-end charts rank songs
                    based on their performance
                    throughout each chart year.
                  </em>
                </p>

              </div>

            </div>
          )}

          <div className="border-x border-b border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

            {loading && (
              <div className="flex min-h-[300px] items-center justify-center">

                <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                  LOADING YEAR-END CHART
                </p>

              </div>
            )}

            {!loading &&
              error && (
                <div className="flex min-h-[300px] items-center justify-center">

                  <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                    UNABLE TO LOAD YEAR-END CHART
                  </p>

                </div>
              )}

            {!loading &&
              !error &&
              currentEntries.map(
                (entry, index) => {
                  const isTarget =
                    targetEntry?.year ===
                      entry.year &&
                    targetEntry.rank ===
                      entry.rank &&
                    targetEntry.title ===
                      entry.title;

                  return (
                    <div
                      id={`year-end-${entry.year}-${entry.rank}`}
                      key={`${entry.year}-${entry.rank}-${entry.title}-${entry.artist}-${index}`}
                      className={`flex items-center gap-1.5 px-3 py-3 transition-all duration-500 sm:gap-6 sm:px-6 ${
                        index > 0
                          ? 'border-t border-black/10'
                          : ''
                      } ${
                        isTarget
                          ? 'bg-[#0050FF]/10'
                          : ''
                      }`}
                    >

                      <div className="flex w-7 flex-shrink-0 items-center justify-center sm:w-20">

                        <p className="m-0 font-brown-bold text-[1.35rem] leading-none text-black sm:text-[3.5rem]">
                          {entry.rank}
                        </p>

                      </div>

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

                      <div className="min-w-0 flex-1">

                        <p className="break-words font-brown-bold text-[0.9rem] leading-[1.08] text-black sm:text-4xl">
                          {entry.title}
                        </p>

                        <p className="mt-0.5 break-words font-brown-regular text-[0.72rem] leading-tight text-blue-600 sm:mt-1 sm:text-xl">
                          {entry.artist}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            {!loading &&
              !error &&
              currentEntries.length === 0 && (
                <div className="flex min-h-[300px] items-center justify-center">

                  <p className="font-brown-regular text-xs uppercase tracking-[0.2em] text-black/50">
                    NO YEAR-END CHART DATA AVAILABLE
                  </p>

                </div>
              )}

          </div>

        </div>

        <div className="h-12" />

      </div>

      <style jsx global>{`
        @keyframes year-end-target-pulse {
          0% {
            background-color: rgba(0, 80, 255, 0);
          }

          25% {
            background-color: rgba(0, 80, 255, 0.18);
          }

          100% {
            background-color: rgba(0, 80, 255, 0);
          }
        }

        .year-end-target {
          animation: year-end-target-pulse 1.0s ease-out both;
        }
      `}</style>

    </main>
  );
}

export default function YearEndPage() {
  return (
    <Suspense fallback={null}>
      <YearEndPageContent />
    </Suspense>
  );
}
