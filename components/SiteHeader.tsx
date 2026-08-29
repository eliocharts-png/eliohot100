'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

/* =========================================================
 * ARTIST CSV
 * ======================================================= */

function parseArtists(csv: string): string[] {
  const parsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    console.warn(
      '[SITE HEADER] CSV parsing warnings:',
      parsed.errors
    );
  }

  const rows = parsed.data;

  console.log(
    `[SITE HEADER] Artist CSV rows loaded: ${rows.length}`
  );

  const artists = rows
    .slice(2)
    .map((row) => {
      return (
        row[0]
          ?.replace(/^\uFEFF/, '')
          .trim() ?? ''
      );
    })
    .filter((artist) => artist.length > 0);

  /*
   * Remove duplicates while preserving
   * the original spelling from the sheet.
   */
  const uniqueArtists: string[] = [];
  const seen = new Set<string>();

  for (const artist of artists) {
    const normalized = normalizeArtist(artist);

    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniqueArtists.push(artist);
  }

  console.log(
    `[SITE HEADER] Artists parsed from Column A: ${uniqueArtists.length}`
  );

  if (uniqueArtists.length > 0) {
    console.log(
      '[SITE HEADER] First artists:',
      uniqueArtists.slice(0, 10)
    );
  }

  return uniqueArtists;
}

/* =========================================================
 * NORMALIZATION
 * ======================================================= */

function normalizeArtist(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/* =========================================================
 * COMPONENT
 * ======================================================= */

export default function SiteHeader() {
  const [artists, setArtists] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState('');

  const [artistsLoading, setArtistsLoading] =
    useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  /* =======================================================
   * LOAD ARTISTS
   * ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      try {
        setArtistsLoading(true);

        console.log(
          '[SITE HEADER] Loading artist list...'
        );

        const response = await fetch(
          `${ARTISTS_CSV_URL}&_=${Date.now()}`,
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

        console.log(
          `[SITE HEADER] Artist CSV received: ${csv.length} characters`
        );

        const artistList =
          parseArtists(csv);

        if (!cancelled) {
          setArtists(artistList);
        }
      } catch (error) {
        console.error(
          '[SITE HEADER] Failed to load artists:',
          error
        );

        if (!cancelled) {
          setArtists([]);
        }
      } finally {
        if (!cancelled) {
          setArtistsLoading(false);
        }
      }
    }

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
   * FILTER + ALPHABETIZE SEARCH RESULTS
   * ===================================================== */

  const filteredArtists =
    useMemo(() => {
      const query =
        normalizeArtist(search);

      if (!query) {
        return [];
      }

      return artists
        .filter((artist) =>
          normalizeArtist(
            artist
          ).includes(query)
        )
        .sort((a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              sensitivity: 'base',
            }
          )
        )
        .slice(0, 20);
    }, [
      artists,
      search,
    ]);

  const showResults =
    search.trim().length > 0 &&
    !artistsLoading;

  /* =======================================================
   * SEARCH RESULT LINK
   * ===================================================== */

  function artistHref(
    artist: string
  ): string {
    return `/artists/${encodeURIComponent(
      artist
    )}`;
  }

  /* =======================================================
   * CLOSE MOBILE MENU
   * ===================================================== */

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  /* =======================================================
   * RENDER
   * ======================================================= */

  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] bg-black">

      <div className="mx-auto flex min-h-[3.8rem] max-w-7xl items-center px-4 sm:px-6 lg:px-8">

        {/* =================================================
         * MOBILE MENU BUTTON
         * ================================================= */}

        <button
          type="button"
          aria-label={
            mobileMenuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={mobileMenuOpen}
          onClick={() =>
            setMobileMenuOpen(
              (open) => !open
            )
          }
          className="mr-3 flex h-8 w-8 shrink-0 flex-col items-center justify-center gap-[4px] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF] lg:hidden"
        >
          <span
            className={`block h-[1.5px] w-5 bg-current transition-transform duration-150 ${
              mobileMenuOpen
                ? 'translate-y-[5.5px] rotate-45'
                : ''
            }`}
          />

          <span
            className={`block h-[1.5px] w-5 bg-current transition-opacity duration-150 ${
              mobileMenuOpen
                ? 'opacity-0'
                : 'opacity-100'
            }`}
          />

          <span
            className={`block h-[1.5px] w-5 bg-current transition-transform duration-150 ${
              mobileMenuOpen
                ? '-translate-y-[5.5px] -rotate-45'
                : ''
            }`}
          />
        </button>

        {/* =================================================
         * ELIO CHARTS
         * ================================================= */}

        <a
          href="/"
          onClick={closeMobileMenu}
          className="flex-shrink-0 font-brown-bold text-sm uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF] sm:text-base"
        >
          ELIO CHARTS
        </a>

        {/* =================================================
         * DESKTOP NAVIGATION
         * ================================================= */}

        <div className="ml-auto hidden items-center gap-5 lg:flex">

          <a
            href="/weekly"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            HOT 100
          </a>

          <a
            href="/articles"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            CHART BEAT
          </a>

          <a
            href="/artists"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            ARTIST CHART
          </a>

          <a
            href="/year-end"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            YEAR-END CHARTS
          </a>

          <a
            href="/decade-end"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            DECADE-END
          </a>

          <a
            href="/goat"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            GREATEST OF ALL TIME
          </a>

          {/* =================================================
           * AWARDS
           * ================================================= */}

          <a
            href="/awards"
            className="font-brown-regular text-xs uppercase tracking-[0.08em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
          >
            AWARDS
          </a>

          {/* =================================================
           * DESKTOP SEARCH
           * ================================================= */}

          <div className="relative ml-1 w-44">

            <label
              htmlFor="site-header-search"
              className="sr-only"
            >
              Search artists
            </label>

            <input
              id="site-header-search"
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="SEARCH ARTIST"
              autoComplete="off"
              className="h-8 w-full border border-white/60 bg-black px-3 font-brown-regular text-[0.65rem] uppercase tracking-[0.08em] text-white outline-none transition-colors duration-150 placeholder:text-white/50 hover:border-[#0050FF] focus:border-[#0050FF] focus:text-[#0050FF] focus:placeholder:text-[#0050FF]/60"
            />

            {/* DESKTOP SEARCH RESULTS */}

            {showResults && (
              <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-80 overflow-y-auto border border-black/10 bg-white shadow-lg">

                {filteredArtists.length > 0 ? (
                  filteredArtists.map(
                    (artist) => (
                      <a
                        key={artist}
                        href={artistHref(
                          artist
                        )}
                        className="block border-b border-black/10 px-3 py-2 text-left font-brown-regular text-xs text-black transition-colors duration-150 hover:bg-[#0050FF] hover:text-white active:bg-[#0050FF] active:text-white last:border-b-0"
                      >
                        {artist}
                      </a>
                    )
                  )
                ) : (
                  <div className="px-3 py-3">

                    <p className="font-brown-regular text-xs uppercase tracking-[0.12em] text-black/50">
                      NO ARTISTS FOUND
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

        {/* =================================================
         * MOBILE SEARCH
         * ================================================= */}

        <div className="ml-auto lg:hidden">

          <div className="relative w-36 sm:w-48">

            <label
              htmlFor="site-header-search-mobile"
              className="sr-only"
            >
              Search artists
            </label>

            <input
              id="site-header-search-mobile"
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="SEARCH ARTIST"
              autoComplete="off"
              className="h-8 w-full border border-white/60 bg-black px-2.5 font-brown-regular text-[0.6rem] uppercase tracking-[0.06em] text-white outline-none transition-colors duration-150 placeholder:text-white/50 hover:border-[#0050FF] focus:border-[#0050FF] focus:text-[#0050FF] focus:placeholder:text-[#0050FF]/60 sm:h-9 sm:text-xs"
            />

            {/* MOBILE SEARCH RESULTS */}

            {showResults && (
              <div className="absolute right-0 top-full z-[110] mt-1 max-h-72 w-full overflow-y-auto border border-black/10 bg-white shadow-lg">

                {filteredArtists.length > 0 ? (
                  filteredArtists.map(
                    (artist) => (
                      <a
                        key={artist}
                        href={artistHref(
                          artist
                        )}
                        className="block border-b border-black/10 px-3 py-2 text-left font-brown-regular text-xs text-black transition-colors duration-150 hover:bg-[#0050FF] hover:text-white active:bg-[#0050FF] active:text-white last:border-b-0"
                      >
                        {artist}
                      </a>
                    )
                  )
                ) : (
                  <div className="px-3 py-3">

                    <p className="font-brown-regular text-xs uppercase tracking-[0.12em] text-black/50">
                      NO ARTISTS FOUND
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* =====================================================
       * MOBILE NAVIGATION MENU
       * ===================================================== */}

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-black lg:hidden">

          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

            <div className="flex flex-col">

              <a
                href="/weekly"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                HOT 100
              </a>

              <a
                href="/articles"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                CHART BEAT
              </a>

              <a
                href="/artists"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                ARTIST CHART
              </a>

              <a
                href="/year-end"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                YEAR-END CHARTS
              </a>

              <a
                href="/decade-end"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                DECADE-END
              </a>

              <a
                href="/goat"
                onClick={closeMobileMenu}
                className="border-b border-white/10 py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                GREATEST OF ALL TIME
              </a>

              {/* =================================================
               * MOBILE AWARDS
               * ================================================= */}

              <a
                href="/awards"
                onClick={closeMobileMenu}
                className="py-3 font-brown-regular text-xs uppercase tracking-[0.1em] text-white transition-colors duration-150 hover:text-[#0050FF] active:text-[#0050FF]"
              >
                AWARDS
              </a>

            </div>

          </div>

        </div>
      )}

    </nav>
  );
}