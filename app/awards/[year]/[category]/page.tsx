'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/* =========================================================
 * CSV URL
 * ======================================================= */

const NOMINEES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1cIB9D2bPcJxyiw3yKNLJtfMLwuBx_ujLYEmfe-wUwcoUFZGZ2ukP34jtFt2J-TXh_VK__wE9XxjO/pub?gid=0&single=true&output=csv';

/* =========================================================
 * TYPES
 * ======================================================= */

type Nominee = {
  name: string;
  winner: boolean;
};

/* =========================================================
 * CSV PARSER
 * ======================================================= */

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];

    if (char === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') {
        i += 1;
      }

      row.push(value.trim());

      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      value = '';

      continue;
    }

    value += char;
  }

  if (value !== '' || row.length > 0) {
    row.push(value.trim());

    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/* =========================================================
 * CLEAN HTML
 * ======================================================= */

function cleanHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

/* =========================================================
 * NORMALIZE
 * ======================================================= */

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ');
}

/* =========================================================
 * WINNER
 * ======================================================= */

function parseWinner(
  value: string
): {
  name: string;
  winner: boolean;
} {
  const cleaned = cleanHtml(value).trim();

  const winner =
    /\(\s*winner\s*\)\s*$/i.test(cleaned);

  const name = cleaned
    .replace(/\s*\(\s*winner\s*\)\s*$/i, '')
    .trim();

  return {
    name,
    winner,
  };
}

/* =========================================================
 * SPLIT NOMINEES
 * ======================================================= */

function splitNominationLines(
  value: string
): string[] {
  const cleaned = cleanHtml(value);

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/* =========================================================
 * GET NOMINEES
 * ======================================================= */

function getNominees(
  csv: string,
  requestedYear: string,
  requestedCategory: string
): Nominee[] {
  const rows = parseCSV(csv);

  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0];

  /*
   * Find the year column.
   */
  const yearIndex = headers.findIndex(
    (header) =>
      normalize(header) ===
      normalize(requestedYear)
  );

  if (yearIndex === -1) {
    return [];
  }

  const nominees: Nominee[] = [];

  /*
   * Find the requested category.
   */
  for (
    let rowIndex = 1;
    rowIndex < rows.length;
    rowIndex += 1
  ) {
    const row = rows[rowIndex];

    const category =
      cleanHtml(
        row?.[0]?.trim() ?? ''
      );

    if (
      normalize(category) !==
      normalize(requestedCategory)
    ) {
      continue;
    }

    const nomineeCell =
      row?.[yearIndex] ?? '';

    const nomineeLines =
      splitNominationLines(
        nomineeCell
      );

    for (
      const rawNominee of nomineeLines
    ) {
      const parsed =
        parseWinner(rawNominee);

      if (!parsed.name) {
        continue;
      }

      nominees.push({
        name: parsed.name,
        winner: parsed.winner,
      });
    }

    break;
  }

  return nominees;
}

/* =========================================================
 * NOMINEE TITLE
 * ======================================================= */

function getNomineeTitle(
  nominee: string
): string {
  const separatorIndex =
    nominee.indexOf(' - ');

  if (separatorIndex === -1) {
    return nominee;
  }

  return nominee
    .slice(0, separatorIndex)
    .trim();
}

/* =========================================================
 * NOMINEE ARTISTS
 * ======================================================= */

function getNomineeArtists(
  nominee: string
): string {
  const separatorIndex =
    nominee.indexOf(' - ');

  if (separatorIndex === -1) {
    return '';
  }

  return nominee
    .slice(separatorIndex + 3)
    .trim();
}

/* =========================================================
 * ARTIST-BASED CATEGORIES
 * ======================================================= */

const ARTIST_BASED_CATEGORIES = [
  'Artist of the Year',
  'Best New Artist',
];

function isArtistBasedCategory(
  category: string
): boolean {
  return ARTIST_BASED_CATEGORIES.some(
    (item) =>
      normalize(item) ===
      normalize(category)
  );
}

/* =========================================================
 * FORMAT TITLE
 * ======================================================= */

function formatTitle(
  nominee: string,
  category: string
): string {
  if (isArtistBasedCategory(category)) {
    return '—';
  }

  return getNomineeTitle(nominee);
}

/* =========================================================
 * FORMAT ARTIST
 * ======================================================= */

function formatArtists(
  nominee: string,
  category: string
): string {
  if (isArtistBasedCategory(category)) {
    return nominee;
  }

  return getNomineeArtists(nominee);
}

/* =========================================================
 * PAGE
 * ======================================================= */

export default function AwardCategoryPage() {
  const params = useParams();
  const router = useRouter();

  const rawYear = params?.year;
  const rawCategory = params?.category;

  const year = decodeURIComponent(
    Array.isArray(rawYear)
      ? rawYear[0] ?? ''
      : rawYear ?? ''
  );

  const category = decodeURIComponent(
    Array.isArray(rawCategory)
      ? rawCategory[0] ?? ''
      : rawCategory ?? ''
  );

  const [
    nominees,
    setNominees,
  ] = useState<Nominee[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(false);

  /* =======================================================
   * LOAD
   * ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadNominees() {
      try {
        setLoading(true);
        setError(false);

        const response =
          await fetch(
            `${NOMINEES_CSV_URL}&_=${Date.now()}`,
            {
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Awards CSV failed: ${response.status}`
          );
        }

        const csv =
          await response.text();

        const parsed =
          getNominees(
            csv,
            year,
            category
          );

        if (!cancelled) {
          setNominees(parsed);
        }
      } catch (loadError) {
        console.error(
          '[AWARDS] Failed to load nominees:',
          loadError
        );

        if (!cancelled) {
          setNominees([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (year && category) {
      void loadNominees();
    }

    return () => {
      cancelled = true;
    };
  }, [year, category]);

  /* =======================================================
   * WINNER
   * ===================================================== */

  const winner = useMemo(
    () =>
      nominees.find(
        (nominee) =>
          nominee.winner
      ),
    [nominees]
  );

  /* =======================================================
   * BACK
   * ===================================================== */

  function goBack() {
    router.back();
  }

  /* =======================================================
   * RENDER
   * ===================================================== */

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">

        {/* =================================================
         * HEADER
         * ================================================= */}

        <section
          className="
            border-b
            border-black/10
            px-5
            pb-10
            pt-8
            sm:px-8
            sm:pb-14
            sm:pt-10
            lg:px-12
          "
        >
          <button
            type="button"
            onClick={goBack}
            className="
              font-brown-bold
              text-xs
              uppercase
              tracking-[0.08em]
              transition-opacity
              hover:opacity-50
            "
          >
            ← Back
          </button>

          <div className="mt-12">
            <p
              className="
                font-brown-regular
                text-xs
                uppercase
                tracking-[0.12em]
                text-black/40
              "
            >
              {year}
            </p>

            <h1
              className="
                mt-2
                max-w-5xl
                font-brown-bold
                text-[2.8rem]
                uppercase
                leading-[0.88]
                tracking-[-0.06em]
                sm:text-[4.5rem]
                lg:text-[6rem]
              "
            >
              {category}
            </h1>
          </div>
        </section>

        {/* =================================================
         * LOADING
         * ================================================= */}

        {loading && (
          <section
            className="
              mx-auto
              max-w-7xl
              px-5
              py-12
              sm:px-8
              lg:px-12
            "
          >
            <div
              className="
                h-[400px]
                animate-pulse
                bg-black/[0.05]
              "
            />
          </section>
        )}

        {/* =================================================
         * ERROR
         * ================================================= */}

        {!loading && error && (
          <section className="py-24 text-center">
            <p
              className="
                font-brown-regular
                text-xs
                uppercase
                tracking-[0.15em]
                text-black/40
              "
            >
              Failed to load nominees
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="
                mt-4
                font-brown-bold
                text-xs
                uppercase
                tracking-[0.1em]
                text-[#0050FF]
                hover:opacity-60
              "
            >
              Try Again
            </button>
          </section>
        )}

        {/* =================================================
         * NOMINEES
         * ================================================= */}

        {!loading &&
          !error &&
          nominees.length > 0 && (
            <section
              className="
                mx-auto
                max-w-7xl
                px-5
                pb-24
                pt-10
                sm:px-8
                sm:pt-14
                lg:px-12
              "
            >
              {/* Winner */}

              {winner && (
                <div
                  className="
                    mb-10
                    bg-[#EAF4FF]
                    px-5
                    py-6
                    sm:px-7
                    sm:py-8
                  "
                >
                  <p
                    className="
                      font-brown-bold
                      text-[9px]
                      uppercase
                      tracking-[0.12em]
                      text-[#0050FF]
                    "
                  >
                    Winner
                  </p>

                  <div
                    className="
                      mt-3
                      grid
                      gap-4
                      md:grid-cols-[minmax(190px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)]
                    "
                  >
                    <div>
                      <p
                        className="
                          font-brown-bold
                          text-lg
                          uppercase
                          leading-tight
                        "
                      >
                        {formatTitle(
                          winner.name,
                          category
                        )}
                      </p>
                    </div>

                    <p
                      className="
                        font-brown-regular
                        text-sm
                        leading-tight
                        text-black/65
                      "
                    >
                      {formatArtists(
                        winner.name,
                        category
                      )}
                    </p>

                    <p
                      className="
                        font-brown-bold
                        text-sm
                        uppercase
                        leading-tight
                      "
                    >
                      Winner
                    </p>
                  </div>
                </div>
              )}

              {/* Column headers */}

              <div
                className="
                  hidden
                  grid-cols-[90px_minmax(190px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)]
                  gap-5
                  px-4
                  py-4
                  md:grid
                "
              >
                <p
                  className="
                    font-brown-bold
                    text-[10px]
                    uppercase
                    tracking-[0.08em]
                    text-black/40
                  "
                >
                  #
                </p>

                <p
                  className="
                    font-brown-bold
                    text-[10px]
                    uppercase
                    tracking-[0.08em]
                    text-black/40
                  "
                >
                  Category
                </p>

                <p
                  className="
                    font-brown-bold
                    text-[10px]
                    uppercase
                    tracking-[0.08em]
                    text-black/40
                  "
                >
                  Artists
                </p>

                <p
                  className="
                    font-brown-bold
                    text-[10px]
                    uppercase
                    tracking-[0.08em]
                    text-black/40
                  "
                >
                  Title
                </p>
              </div>

              {/* All nominees */}

              <div>
                {nominees.map(
                  (nominee, index) => {
                    const title =
                      formatTitle(
                        nominee.name,
                        category
                      );

                    const artists =
                      formatArtists(
                        nominee.name,
                        category
                      );

                    return (
                      <div
                        key={`${nominee.name}-${index}`}
                        className={`
                          px-4
                          py-5
                          sm:py-6
                          ${
                            nominee.winner
                              ? 'bg-[#EAF4FF]'
                              : 'bg-white'
                          }
                        `}
                      >
                        {/* Desktop */}

                        <div
                          className="
                            hidden
                            grid-cols-[90px_minmax(190px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)]
                            items-start
                            gap-5
                            md:grid
                          "
                        >
                          <p
                            className="
                              font-brown-bold
                              text-sm
                            "
                          >
                            {index + 1}
                          </p>

                          <div>
                            <p
                              className="
                                font-brown-bold
                                text-sm
                                uppercase
                                leading-tight
                              "
                            >
                              {category}
                            </p>

                            <p
                              className={`
                                mt-2
                                font-brown-regular
                                text-[9px]
                                uppercase
                                tracking-[0.08em]
                                ${
                                  nominee.winner
                                    ? 'text-[#0050FF]'
                                    : 'text-black/35'
                                }
                              `}
                            >
                              {nominee.winner
                                ? 'Winner'
                                : 'Nominee'}
                            </p>
                          </div>

                          <p
                            className="
                              font-brown-regular
                              text-sm
                              leading-tight
                              text-black/65
                            "
                          >
                            {artists}
                          </p>

                          <p
                            className="
                              font-brown-bold
                              text-sm
                              leading-tight
                            "
                          >
                            {title}
                          </p>
                        </div>

                        {/* Mobile */}

                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                className="
                                  font-brown-bold
                                  text-xl
                                  leading-none
                                "
                              >
                                {index + 1}
                              </p>

                              <p
                                className="
                                  mt-2
                                  font-brown-bold
                                  text-sm
                                  uppercase
                                  leading-tight
                                "
                              >
                                {category}
                              </p>
                            </div>

                            <span
                              className={`
                                shrink-0
                                font-brown-bold
                                text-[9px]
                                uppercase
                                tracking-[0.08em]
                                ${
                                  nominee.winner
                                    ? 'text-[#0050FF]'
                                    : 'text-black/30'
                                }
                              `}
                            >
                              {nominee.winner
                                ? 'Winner'
                                : 'Nominee'}
                            </span>
                          </div>

                          <div
                            className="
                              mt-5
                              grid
                              grid-cols-2
                              gap-5
                            "
                          >
                            <div>
                              <p
                                className="
                                  font-brown-bold
                                  text-[9px]
                                  uppercase
                                  tracking-[0.08em]
                                  text-black/35
                                "
                              >
                                Artists
                              </p>

                              <p
                                className="
                                  mt-1
                                  font-brown-regular
                                  text-sm
                                  leading-tight
                                "
                              >
                                {artists}
                              </p>
                            </div>

                            <div>
                              <p
                                className="
                                  font-brown-bold
                                  text-[9px]
                                  uppercase
                                  tracking-[0.08em]
                                  text-black/35
                                "
                              >
                                Title
                              </p>

                              <p
                                className="
                                  mt-1
                                  font-brown-bold
                                  text-sm
                                  leading-tight
                                "
                              >
                                {title}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

        {/* =================================================
         * NO NOMINEES
         * ================================================= */}

        {!loading &&
          !error &&
          nominees.length === 0 && (
            <section className="py-24 text-center">
              <p
                className="
                  font-brown-regular
                  text-xs
                  uppercase
                  tracking-[0.15em]
                  text-black/40
                "
              >
                No nominees found
              </p>
            </section>
          )}
      </div>
    </main>
  );
}
