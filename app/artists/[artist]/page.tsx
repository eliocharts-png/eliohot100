'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

const YEAR_END_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCwhJoNSmVVS7klopONiGjob6kaRw_1CyjviTVffP_WdbMKZEo4xs_ou7nv-mkd14u25T0KcDshHdJ/pub?gid=1658746037&single=true&output=csv';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

type ArtistSong = {
  title: string;
  artistCredit: string;
  artwork?: string;
  peak: number;
  debutDate: string;
  peakDate: string;
  weeksOnChart: number;
  weeksAtPeak: number;
  totalPoints: number;
};

type ArtistResponse = {
  artist: string;
  artistImage?: string;
  songs: ArtistSong[];
  numberOneHits: number;
  top10Hits: number;
  top40Hits: number;
  entries: number;
  totalPoints: number;
};

type YearEndEntry = {
  year: string;
  rank: number;
  title: string;
  artist: string;
};

/* =========================================================
 * NORMALIZE
 * ======================================================= */

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

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

    if (
      (char === '\n' || char === '\r') &&
      !quoted
    ) {
      if (
        char === '\r' &&
        csv[i + 1] === '\n'
      ) {
        i += 1;
      }

      row.push(value.trim());

      if (
        row.some(
          (cell) => cell.trim() !== ''
        )
      ) {
        rows.push(row);
      }

      row = [];
      value = '';

      continue;
    }

    value += char;
  }

  if (
    value !== '' ||
    row.length > 0
  ) {
    row.push(value.trim());

    if (
      row.some(
        (cell) => cell.trim() !== ''
      )
    ) {
      rows.push(row);
    }
  }

  return rows;
}

/* =========================================================
 * ARTISTS SHEET
 *
 * IMPORTANT:
 *
 * Row 1 = header/info
 * Row 2 = header/info
 * Row 3 onward = actual artist data
 *
 * Column A = artist name
 * Column O = artist image
 *
 * Therefore:
 * row[0]  = Column A
 * row[14] = Column O
 *
 * We intentionally use slice(2).
 * ======================================================= */

function parseArtists(
  csv: string
): string[] {
  const rows =
    parseCSV(csv);

  console.log(
    '[ARTIST SEARCH] Total CSV rows:',
    rows.length
  );

  const artistNames =
    rows
      .slice(2)
      .map(
        (row) =>
          row[0]?.trim() ?? ''
      )
      .filter(
        (artist) =>
          artist.length > 0
      );

  console.log(
    '[ARTIST SEARCH] Artists found:',
    artistNames.length
  );

  console.log(
    '[ARTIST SEARCH] First artists:',
    artistNames.slice(0, 10)
  );

  return Array.from(
    new Set(
      artistNames
    )
  );
}

/* =========================================================
 * YEAR-END HELPERS
 * ======================================================= */

function parseSongCell(
  value: string
): {
  title: string;
  artist: string;
} {
  const parts =
    value
      .split(/\r?\n/)
      .map(
        (part) =>
          part.trim()
      )
      .filter(Boolean);

  return {
    title:
      parts[0] ?? '',
    artist:
      parts[1] ?? '',
  };
}

function findColumn(
  headers: string[],
  patterns: string[]
): number {
  return headers.findIndex(
    (header) => {
      const normalized =
        normalize(header);

      return patterns.some(
        (pattern) =>
          normalized.includes(
            pattern
          )
      );
    }
  );
}

function parseYearEndCSV(
  csv: string
): YearEndEntry[] {
  const rows =
    parseCSV(csv);

  if (
    rows.length === 0
  ) {
    return [];
  }

  const headers =
    rows[0].map(
      (header) =>
        normalize(header)
    );

  const yearColumn =
    findColumn(
      headers,
      [
        'year',
        'chart year',
        'year end',
      ]
    );

  const rankColumn =
    findColumn(
      headers,
      [
        'rank',
        'ranking',
        'position',
        'peak',
      ]
    );

  const titleColumn =
    findColumn(
      headers,
      [
        'song title',
        'title',
        'song',
      ]
    );

  const artistColumn =
    findColumn(
      headers,
      [
        'artist',
        'artists',
        'artist name',
      ]
    );

  const entries:
    YearEndEntry[] = [];

  const startIndex =
    yearColumn >= 0 ||
    rankColumn >= 0 ||
    titleColumn >= 0 ||
    artistColumn >= 0
      ? 1
      : 0;

  for (
    let i = startIndex;
    i < rows.length;
    i += 1
  ) {
    const row =
      rows[i];

    let year =
      yearColumn >= 0
        ? row[
            yearColumn
          ] ?? ''
        : '';

    let rankValue =
      rankColumn >= 0
        ? row[
            rankColumn
          ] ?? ''
        : '';

    let title =
      titleColumn >= 0
        ? row[
            titleColumn
          ] ?? ''
        : '';

    let artist =
      artistColumn >= 0
        ? row[
            artistColumn
          ] ?? ''
        : '';

    if (
      !year ||
      !rankValue ||
      !title ||
      !artist
    ) {
      const possibleYear =
        row.find(
          (cell) =>
            /^20\d{2}$/.test(
              cell.trim()
            )
        );

      const possibleRank =
        row.find(
          (cell) =>
            /^\d{1,3}$/.test(
              cell.trim()
            )
        );

      if (!year) {
        year =
          possibleYear ??
          '';
      }

      if (!rankValue) {
        rankValue =
          possibleRank ??
          '';
      }
    }

    const rank =
      Number(
        rankValue
          .replace(
            /^#/,
            ''
          )
          .trim()
      );

    if (
      (!title ||
        !artist) &&
      row.length > 0
    ) {
      for (
        const cell of row
      ) {
        if (
          cell.includes(
            '\n'
          )
        ) {
          const parsed =
            parseSongCell(
              cell
            );

          if (
            parsed.title &&
            parsed.artist
          ) {
            title =
              parsed.title;

            artist =
              parsed.artist;

            break;
          }
        }
      }
    }

    if (
      !title ||
      !artist
    ) {
      const nonEmpty =
        row.filter(
          (cell) =>
            cell.trim() !== ''
        );

      for (
        const cell of nonEmpty
      ) {
        const parsed =
          parseSongCell(
            cell
          );

        if (
          parsed.title &&
          parsed.artist
        ) {
          title =
            parsed.title;

          artist =
            parsed.artist;

          break;
        }
      }
    }

    if (
      !year ||
      !rank ||
      !title ||
      !artist
    ) {
      continue;
    }

    entries.push({
      year:
        year.trim(),

      rank,

      title:
        title.trim(),

      artist:
        artist.trim(),
    });
  }

  return entries;
}

/* =========================================================
 * ARTIST MATCHING
 * ======================================================= */

function artistMatches(
  chartArtist: string,
  requestedArtist: string
): boolean {
  const requested =
    normalize(
      requestedArtist
    );

  const chart =
    normalize(
      chartArtist
    );

  if (
    chart === requested
  ) {
    return true;
  }

  return chart
    .split(
      /\s+(?:featuring|feat\.?|ft\.?|with)\s+|,\s*|\s+&\s+/i
    )
    .some(
      (artist) =>
        normalize(
          artist
        ) === requested
    );
}

/* =========================================================
 * DATE
 * ======================================================= */

function formatDate(
  value: string
): string {
  return value;
}

/* =========================================================
 * PAGE
 * ======================================================= */

export default function ArtistPage() {
  const params =
    useParams();

  const artistParam =
    Array.isArray(
      params.artist
    )
      ? params.artist[0]
      : params.artist;

  const artistName =
    decodeURIComponent(
      artistParam ?? ''
    );

  const [data, setData] =
    useState<ArtistResponse | null>(
      null
    );

  const [yearEnd, setYearEnd] =
    useState<YearEndEntry[]>(
      []
    );

  const [artists, setArtists] =
    useState<string[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [yearEndLoading, setYearEndLoading] =
    useState(true);

  const [artistsLoading, setArtistsLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [expandedSong, setExpandedSong] =
    useState<string | null>(
      null
    );

  /* =======================================================
   * LOAD ARTIST
   * ===================================================== */

  useEffect(() => {
    if (!artistName) {
      return;
    }

    async function loadArtist() {
      try {
        setLoading(true);
        setError(false);

        const response =
          await fetch(
            `/api/artist?name=${encodeURIComponent(
              artistName
            )}`,
            {
              cache:
                'no-store',
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `Artist request failed: ${response.status}`
          );
        }

        const result =
          (await response.json()) as ArtistResponse;

        setData(result);
      } catch (
        loadError
      ) {
        console.error(
          'Failed to load artist:',
          loadError
        );

        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadArtist();
  }, [artistName]);

  /* =======================================================
   * LOAD ARTIST SEARCH LIST
   *
   * THIS IS INDEPENDENT FROM THE ARTIST API.
   *
   * It reads:
   *
   * A3:A = artist names
   *
   * We do NOT read row 1 or row 2.
   * ===================================================== */

  useEffect(() => {
    async function loadArtists() {
      try {
        setArtistsLoading(
          true
        );

        console.log(
          '[ARTIST SEARCH] Loading Artists sheet...'
        );

        const response =
          await fetch(
            `${ARTISTS_CSV_URL}&_=${Date.now()}`,
            {
              cache:
                'no-store',
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `Artists request failed: ${response.status}`
          );
        }

        const csv =
          await response.text();

        if (
          !csv.trim()
        ) {
          throw new Error(
            'Artists CSV is empty'
          );
        }

        console.log(
          '[ARTIST SEARCH] CSV received. Characters:',
          csv.length
        );

        const artistList =
          parseArtists(
            csv
          );

        console.log(
          '[ARTIST SEARCH] Setting artist list:',
          artistList.length
        );

        setArtists(
          artistList
        );
      } catch (
        loadError
      ) {
        console.error(
          '[ARTIST SEARCH] Failed to load artists:',
          loadError
        );

        setArtists([]);
      } finally {
        setArtistsLoading(
          false
        );
      }
    }

    void loadArtists();
  }, []);

  /* =======================================================
   * LOAD YEAR-END
   * ===================================================== */

  useEffect(() => {
    async function loadYearEnd() {
      try {
        setYearEndLoading(
          true
        );

        const response =
          await fetch(
            YEAR_END_CSV_URL,
            {
              cache:
                'no-store',
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `Year-End request failed: ${response.status}`
          );
        }

        const csv =
          await response.text();

        const parsed =
          parseYearEndCSV(
            csv
          );

        setYearEnd(
          parsed
        );
      } catch (
        loadError
      ) {
        console.error(
          'Year-End error:',
          loadError
        );

        setYearEnd([]);
      } finally {
        setYearEndLoading(
          false
        );
      }
    }

    void loadYearEnd();
  }, []);

  /* =======================================================
   * FILTER SEARCH RESULTS
   * ===================================================== */

  const filteredArtists =
    useMemo(() => {
      const query =
        normalize(search);

      if (!query) {
        return [];
      }

      const results =
        artists
          .filter(
            (artist) =>
              normalize(
                artist
              ).includes(
                query
              )
          )
          .slice(
            0,
            20
          );

      console.log(
        '[ARTIST SEARCH]',
        {
          query,
          totalArtists:
            artists.length,
          results:
            results.length,
        }
      );

      return results;
    }, [
      artists,
      search,
    ]);

  /* =======================================================
   * YEAR-END FOR SONG
   * ===================================================== */

  const getYearEndForSong = (
    song: ArtistSong
  ): YearEndEntry[] => {
    if (!data) {
      return [];
    }

    return yearEnd
      .filter(
        (entry) =>
          normalize(
            entry.title
          ) ===
            normalize(
              song.title
            ) &&
          artistMatches(
            entry.artist,
            data.artist
          )
      )
      .sort(
        (a, b) => {
          const yearDifference =
            Number(a.year) -
            Number(b.year);

          if (
            yearDifference !==
            0
          ) {
            return yearDifference;
          }

          return (
            a.rank -
            b.rank
          );
        }
      );
  };

  /* =========================================================
   * LOADING SKELETON
   * ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          <header className="pb-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-14 animate-pulse bg-black/[0.08]" />

              <div className="h-8 w-[150px] animate-pulse bg-black/[0.06] sm:h-9 sm:w-[190px]" />
            </div>
          </header>

          <section className="mx-auto">

            <div className="sm:hidden">
              <div className="mx-auto max-w-[360px]">

                <div className="mx-auto w-[230px]">

                  <div className="flex min-h-[48px] items-center justify-center bg-[#0050FF] px-3 py-2">
                    <div className="h-5 w-32 animate-pulse bg-white/30" />
                  </div>

                  <div className="aspect-square w-full animate-pulse bg-black/[0.07]" />

                </div>

                <div className="mt-3 grid grid-cols-5 gap-1.5">

                  {Array.from({
                    length: 5,
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]"
                      >
                        <div className="h-2 w-7 animate-pulse bg-white/30" />

                        <div className="mt-2 h-5 w-8 animate-pulse bg-white/40" />
                      </div>
                    )
                  )}

                </div>

              </div>
            </div>

            <div className="hidden items-center justify-center gap-5 sm:flex">

              <div className="w-[220px] shrink-0">

                <div className="flex min-h-[60px] items-center justify-center bg-[#0050FF] px-3 py-2">
                  <div className="h-7 w-36 animate-pulse bg-white/30" />
                </div>

                <div className="aspect-square w-full animate-pulse bg-black/[0.07]" />

              </div>

              <div className="flex items-center justify-center gap-2">

                {Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="flex h-[74px] w-[70px] flex-col items-center justify-center bg-[#0050FF]"
                    >
                      <div className="h-2 w-8 animate-pulse bg-white/30" />

                      <div className="mt-2 h-7 w-9 animate-pulse bg-white/40" />
                    </div>
                  )
                )}

                <div className="flex h-[74px] w-[95px] flex-col items-center justify-center bg-[#0050FF]">
                  <div className="h-2 w-10 animate-pulse bg-white/30" />

                  <div className="mt-2 h-5 w-14 animate-pulse bg-white/40" />
                </div>

              </div>

            </div>

          </section>

          <section className="mt-8">

            <div className="bg-[#0050FF] px-3 py-2">
              <div className="h-3 w-12 animate-pulse bg-white/30" />
            </div>

            <div className="divide-y divide-black/10">

              {Array.from({
                length: 8,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="px-3 py-3"
                  >

                    <div className="flex items-center gap-3 sm:hidden">

                      <div className="h-11 w-11 shrink-0 animate-pulse bg-black/[0.07]" />

                      <div className="min-w-0 flex-1">

                        <div className="h-3 w-[65%] animate-pulse bg-black/[0.09]" />

                        <div className="mt-2 h-2.5 w-[45%] animate-pulse bg-[#0050FF]/20" />

                      </div>

                      <div className="flex w-12 flex-col items-center">

                        <div className="h-4 w-5 animate-pulse bg-black/[0.09]" />

                        <div className="mt-1.5 h-4 w-8 animate-pulse bg-[#0050FF]/30" />

                      </div>

                      <div className="h-5 w-5 animate-pulse bg-black/[0.07]" />

                    </div>

                    <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_65px_95px_100px_90px_30px]">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="h-11 w-11 shrink-0 animate-pulse bg-black/[0.07]" />

                        <div className="min-w-0 flex-1">

                          <div className="h-3.5 w-[45%] animate-pulse bg-black/[0.09]" />

                          <div className="mt-2 h-2.5 w-[30%] animate-pulse bg-[#0050FF]/20" />

                        </div>

                      </div>

                      <div className="flex flex-col items-center">

                        <div className="h-4 w-5 animate-pulse bg-black/[0.09]" />

                        <div className="mt-1.5 h-4 w-10 animate-pulse bg-[#0050FF]/30" />
                      </div>

                      <div className="mx-auto h-3 w-16 animate-pulse bg-black/[0.07]" />

                      <div className="mx-auto h-3 w-16 animate-pulse bg-black/[0.07]" />

                      <div className="mx-auto h-3 w-8 animate-pulse bg-black/[0.07]" />

                      <div className="mx-auto h-5 w-5 animate-pulse bg-black/[0.07]" />

                    </div>

                  </div>
                )
              )}

            </div>

          </section>

          <div className="h-12" />

        </div>
      </main>
    );
  }

  /* =========================================================
   * ARTIST NOT FOUND
   * ======================================================= */

  if (
    error ||
    !data
  ) {
    return (
      <main className="min-h-screen bg-white text-black">

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

          <a
            href="/"
            className="font-brown-regular text-xs uppercase tracking-[0.18em] text-black"
          >
            &lt; HOME
          </a>

          <p className="mt-12 font-brown-regular text-xs uppercase tracking-[0.18em] text-black/50">
            ARTIST NOT FOUND
          </p>

        </div>

      </main>
    );
  }

  /* =========================================================
   * PAGE
   * ======================================================= */

  return (
    <main className="min-h-screen bg-white text-black">

      {/* =====================================================
       * TOP NAVIGATION
       * =================================================== */}

      <header className="mx-auto max-w-6xl px-4 pb-5 pt-6 sm:px-6">

        <div className="flex items-center justify-between gap-3">

          <a
            href="/"
            className="shrink-0 font-brown-regular text-xs uppercase tracking-[0.18em] text-black transition-opacity hover:opacity-60 sm:text-sm"
          >
            &lt; HOME
          </a>

          {/* =================================================
           * SEARCH
           * =============================================== */}

          <div className="relative w-[150px] sm:w-[190px]">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="SEARCH ARTIST"
              autoComplete="off"
              className="h-8 w-full border border-black bg-white px-3 font-brown-regular text-[10px] uppercase tracking-[0.12em] text-black outline-none placeholder:text-black/35 focus:border-[#0050FF] sm:h-9 sm:text-xs"
            />

            {/* SEARCH RESULTS */}

            {search.trim() && (
              <div className="absolute right-0 top-full z-30 mt-1 max-h-80 w-full overflow-y-auto border border-black/10 bg-white">

                {artistsLoading ? (
                  <div className="px-3 py-2">

                    <p className="font-brown-regular text-[10px] uppercase tracking-[0.12em] text-black/50">
                      SEARCHING...
                    </p>

                  </div>
                ) : filteredArtists.length >
                  0 ? (
                  filteredArtists.map(
                    (artist) => (
                      <a
                        key={artist}
                        href={`/artists/${encodeURIComponent(
                          artist
                        )}`}
                        className="block w-full border-b border-black/10 px-3 py-2 text-left font-brown-regular text-xs text-black transition hover:bg-[#0050FF] hover:text-white last:border-b-0"
                      >
                        {artist}
                      </a>
                    )
                  )
                ) : (
                  <div className="px-3 py-2">

                    <p className="font-brown-regular text-[10px] uppercase tracking-[0.12em] text-black/50">
                      NO ARTISTS FOUND
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </header>

      {/* =====================================================
       * ARTIST / STATS
       * =================================================== */}

      <section className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* MOBILE */}

        <div className="sm:hidden">

          <div className="mx-auto max-w-[360px]">

            <div className="mx-auto w-[230px]">

              <div className="flex min-h-[48px] items-center justify-center bg-[#0050FF] px-3 py-2 text-center">

                <p className="font-brown-bold text-xl uppercase leading-[0.95] tracking-[-0.04em] text-white">
                  {data.artist}
                </p>

              </div>

              <div className="aspect-square w-full overflow-hidden bg-black/[0.04]">

                {data.artistImage ? (
                  <img
                    src={
                      data.artistImage
                    }
                    alt={
                      data.artist
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black/[0.04]">

                    <span className="font-brown-bold text-7xl uppercase text-black/15">
                      {data.artist.charAt(
                        0
                      )}
                    </span>

                  </div>
                )}

              </div>

            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">

              <div className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]">
                <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white">
                  #1
                </p>

                <p className="mt-1 font-brown-bold text-xl leading-none text-white">
                  {data.numberOneHits}
                </p>
              </div>

              <div className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]">
                <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white">
                  TOP 10
                </p>

                <p className="mt-1 font-brown-bold text-xl leading-none text-white">
                  {data.top10Hits}
                </p>
              </div>

              <div className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]">
                <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white">
                  TOP 40
                </p>

                <p className="mt-1 font-brown-bold text-xl leading-none text-white">
                  {data.top40Hits}
                </p>
              </div>

              <div className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]">
                <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white">
                  ENTRIES
                </p>

                <p className="mt-1 font-brown-bold text-xl leading-none text-white">
                  {data.entries}
                </p>
              </div>

              <div className="flex h-[58px] flex-col items-center justify-center bg-[#0050FF]">
                <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white">
                  POINTS
                </p>

                <p className="mt-1 font-brown-bold text-[11px] leading-none text-white">
                  {data.totalPoints.toLocaleString()}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* DESKTOP */}

        <div className="hidden items-center justify-center gap-5 sm:flex">

          <div className="w-[220px] shrink-0">

            <div className="flex min-h-[60px] items-center justify-center bg-[#0050FF] px-3 py-2 text-center">

              <p className="font-brown-bold text-3xl uppercase leading-[0.95] tracking-[-0.04em] text-white">
                {data.artist}
              </p>

            </div>

            <div className="aspect-square w-full overflow-hidden bg-black/[0.04]">

              {data.artistImage ? (
                <img
                  src={
                    data.artistImage
                  }
                  alt={
                    data.artist
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/[0.04]">

                  <span className="font-brown-bold text-8xl uppercase text-black/15">
                    {data.artist.charAt(
                      0
                    )}
                  </span>

                </div>
              )}

            </div>

          </div>

          <div className="flex items-center justify-center gap-2">

            <div className="flex h-[74px] w-[70px] flex-col items-center justify-center bg-[#0050FF]">
              <p className="font-brown-regular text-[9px] uppercase leading-none tracking-[0.04em] text-white">
                #1
              </p>

              <p className="mt-1 font-brown-bold text-2xl leading-none text-white">
                {data.numberOneHits}
              </p>
            </div>

            <div className="flex h-[74px] w-[70px] flex-col items-center justify-center bg-[#0050FF]">
              <p className="font-brown-regular text-[9px] uppercase leading-none tracking-[0.04em] text-white">
                TOP 10
              </p>

              <p className="mt-1 font-brown-bold text-2xl leading-none text-white">
                {data.top10Hits}
              </p>
            </div>

            <div className="flex h-[74px] w-[70px] flex-col items-center justify-center bg-[#0050FF]">
              <p className="font-brown-regular text-[9px] uppercase leading-none tracking-[0.04em] text-white">
                TOP 40
              </p>

              <p className="mt-1 font-brown-bold text-2xl leading-none text-white">
                {data.top40Hits}
              </p>
            </div>

            <div className="flex h-[74px] w-[70px] flex-col items-center justify-center bg-[#0050FF]">
              <p className="font-brown-regular text-[9px] uppercase leading-none tracking-[0.04em] text-white">
                ENTRIES
              </p>

              <p className="mt-1 font-brown-bold text-2xl leading-none text-white">
                {data.entries}
              </p>
            </div>

            <div className="flex h-[74px] w-[95px] flex-col items-center justify-center bg-[#0050FF]">
              <p className="font-brown-regular text-[9px] uppercase leading-none tracking-[0.04em] text-white">
                POINTS
              </p>

              <p className="mt-1 font-brown-bold text-lg leading-none text-white">
                {data.totalPoints.toLocaleString()}
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
       * SONG HISTORY
       * =================================================== */}

      <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">

        {/* MOBILE HEADER */}

        <div className="bg-[#0050FF] px-3 py-2 sm:hidden">

          <div className="grid grid-cols-[minmax(0,1fr)_48px_30px] items-center gap-2">

            <p className="font-brown-bold text-[9px] uppercase tracking-[0.08em] text-white">
              SONG
            </p>

            <p className="text-center font-brown-bold text-[8px] uppercase leading-none text-white">
              PEAK
            </p>

            <p className="text-center font-brown-bold text-[10px] text-white">
              +
            </p>

          </div>

        </div>

        {/* DESKTOP HEADER */}

        <div className="hidden bg-[#0050FF] px-3 py-2 sm:block">

          <div className="grid grid-cols-[minmax(0,1fr)_65px_95px_100px_90px_30px] items-center gap-2">

            <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-white">
              SONG
            </p>

            <p className="text-center font-brown-bold text-[9px] uppercase leading-none text-white">
              PEAK
            </p>

            <p className="text-center font-brown-bold text-[9px] uppercase leading-none text-white">
              DEBUT DATE
            </p>

            <p className="text-center font-brown-bold text-[9px] uppercase leading-none text-white">
              PEAK DATE
            </p>

            <p className="text-center font-brown-bold text-[9px] uppercase leading-none text-white">
              WEEKS ON CHART
            </p>

            <p className="text-center font-brown-bold text-[10px] text-white">
              +
            </p>

          </div>

        </div>

        {/* SONG ROWS */}

        <div>

          {data.songs.map(
            (song) => {

              const songId =
                `${song.title}|||${song.artistCredit}`;

              const isExpanded =
                expandedSong ===
                songId;

              const songYearEnd =
                isExpanded
                  ? getYearEndForSong(
                      song
                    )
                  : [];

              return (
                <div
                  key={songId}
                  className="border-b border-black/10"
                >

                  {/* MOBILE */}

                  <div className="sm:hidden">

                    <div className="grid grid-cols-[minmax(0,1fr)_48px_30px] items-center gap-2 px-3 py-2.5">

                      <div className="flex min-w-0 items-center gap-2.5">

                        {song.artwork ? (
                          <img
                            src={
                              song.artwork
                            }
                            alt=""
                            className="h-11 w-11 shrink-0 object-cover"
                          />
                        ) : (
                          <div className="h-11 w-11 shrink-0 bg-black/[0.04]" />
                        )}

                        <div className="min-w-0">

                          <p className="truncate font-brown-bold text-[12px] leading-tight text-black">
                            {song.title}
                          </p>

                          <p className="mt-0.5 truncate font-brown-regular text-[9px] leading-tight text-[#0050FF]">
                            {song.artistCredit}
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-col items-center justify-center">

                        <p className="font-brown-bold text-base leading-none text-black">
                          {song.peak}
                        </p>

                        <span className="mt-1 bg-[#0050FF] px-1.5 py-1 text-center font-brown-bold text-[7px] uppercase leading-none text-white">
                          {song.weeksAtPeak}{' '}
                          {song.weeksAtPeak ===
                          1
                            ? 'WK'
                            : 'WKS'}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSong(
                            isExpanded
                              ? null
                              : songId
                          )
                        }
                        aria-label={
                          isExpanded
                            ? 'Hide Year-End'
                            : 'Show Year-End'
                        }
                        className="mx-auto flex h-7 w-7 items-center justify-center font-brown-regular text-xl leading-none text-black"
                      >
                        {isExpanded
                          ? '−'
                          : '+'}
                      </button>

                    </div>

                    <div className="grid grid-cols-3 border-t border-black/[0.06] px-3 py-2">

                      <div className="text-center">

                        <p className="font-brown-bold text-[7px] uppercase tracking-[0.08em] text-black/40">
                          DEBUT
                        </p>

                        <p className="mt-0.5 font-brown-regular text-[9px] leading-tight text-black">
                          {formatDate(
                            song.debutDate
                          )}
                        </p>

                      </div>

                      <div className="border-x border-black/[0.06] text-center">

                        <p className="font-brown-bold text-[7px] uppercase tracking-[0.08em] text-black/40">
                          PEAK DATE
                        </p>

                        <p className="mt-0.5 font-brown-regular text-[9px] leading-tight text-black">
                          {formatDate(
                            song.peakDate
                          )}
                        </p>

                      </div>

                      <div className="text-center">

                        <p className="font-brown-bold text-[7px] uppercase tracking-[0.08em] text-black/40">
                          WEEKS
                        </p>

                        <p className="mt-0.5 font-brown-bold text-[10px] leading-tight text-black">
                          {song.weeksOnChart}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* DESKTOP */}

                  <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_65px_95px_100px_90px_30px] sm:items-center sm:gap-2 sm:px-3 sm:py-2">

                    <div className="flex min-w-0 items-center gap-3">

                      {song.artwork ? (
                        <img
                          src={
                            song.artwork
                          }
                          alt=""
                          className="h-11 w-11 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="h-11 w-11 shrink-0 bg-black/[0.04]" />
                      )}

                      <div className="min-w-0">

                        <p className="truncate font-brown-bold text-sm leading-tight text-black">
                          {song.title}
                        </p>

                        <p className="mt-0.5 truncate font-brown-regular text-xs leading-tight text-[#0050FF]">
                          {song.artistCredit}
                        </p>

                      </div>

                    </div>

                    <div className="flex flex-col items-center justify-center">

                      <p className="font-brown-bold text-base leading-none text-black">
                        {song.peak}
                      </p>

                      <span className="mt-1 bg-[#0050FF] px-2 py-1 text-center font-brown-bold text-[8px] uppercase leading-none text-white">
                        {song.weeksAtPeak}{' '}
                        {song.weeksAtPeak ===
                        1
                          ? 'WEEK'
                          : 'WEEKS'}
                      </span>

                    </div>

                    <p className="text-center font-brown-regular text-xs leading-tight text-black">
                      {formatDate(
                        song.debutDate
                      )}
                    </p>

                    <p className="text-center font-brown-regular text-xs leading-tight text-black">
                      {formatDate(
                        song.peakDate
                      )}
                    </p>

                    <p className="text-center font-brown-regular text-sm leading-none text-black">
                      {song.weeksOnChart}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSong(
                          isExpanded
                            ? null
                            : songId
                        )
                      }
                      aria-label={
                        isExpanded
                          ? 'Hide Year-End'
                          : 'Show Year-End'
                      }
                      className="mx-auto flex h-6 w-6 items-center justify-center font-brown-regular text-lg leading-none text-black hover:bg-[#0050FF] hover:text-white"
                    >
                      {isExpanded
                        ? '−'
                        : '+'}
                    </button>

                  </div>

                  {/* YEAR-END */}

                  {isExpanded && (
                    <div className="pb-3 pl-11 pr-7 sm:pb-4 sm:pl-16 sm:pr-10">

                      <div className="border-l-2 border-[#0050FF] pl-3">

                        <p className="mb-2 font-brown-bold text-[9px] uppercase tracking-[0.12em] text-[#0050FF]">
                          YEAR-END
                        </p>

                        {yearEndLoading ? (
                          <p className="font-brown-regular text-[10px] uppercase tracking-[0.08em] text-black/40">
                            LOADING
                          </p>
                        ) : songYearEnd.length >
                          0 ? (
                          <div className="space-y-1.5">

                            {songYearEnd.map(
                              (
                                entry,
                                index
                              ) => (
                                <div
                                  key={`${entry.year}-${entry.rank}-${index}`}
                                  className="flex items-center gap-3"
                                >

                                  <span className="w-10 font-brown-regular text-xs text-black">
                                    {entry.year}
                                  </span>

                                  <span className="bg-[#0050FF] px-2 py-1 font-brown-bold text-[10px] text-white">
                                    #{entry.rank}
                                  </span>

                                </div>
                              )
                            )}

                          </div>
                        ) : (
                          <p className="font-brown-regular text-xs text-black/60">
                            N/A
                          </p>
                        )}

                      </div>

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>

      </section>

      <div className="h-12" />

    </main>
  );
}