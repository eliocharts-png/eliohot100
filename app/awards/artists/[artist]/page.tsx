'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

/* =========================================================
 * CSV URLS
 * ======================================================= */

const NOMINEES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1cIB9D2bPcJxyiw3yKNLJtfMLwuBx_ujLYEmfe-wUwcoUFZGZ2ukP34jtFt2J-TXh_VK__wE9XxjO/pub?gid=0&single=true&output=csv';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1cIB9D2bPcJxyiw3yKNLJtfMLwuBx_ujLYEmfe-wUwcoUFZGZ2ukP34jtFt2J-TXh_VK__wE9XxjO/pub?gid=526167020&single=true&output=csv';

/* =========================================================
 * TYPES
 * ======================================================= */

type ArtistImage = {
  artist: string;
  image: string;
};

type AwardHistoryEntry = {
  id: string;
  year: string;
  category: string;
  nominee: string;
  winner: boolean;
};

/* =========================================================
 * CATEGORY TYPES
 * ======================================================= */

const ARTIST_BASED_CATEGORIES = [
  'Artist of the Year',
  'Best New Artist',
];

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

  if (value !== '' || row.length > 0) {
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
 * WINNER MARKER
 * ======================================================= */

function parseWinner(
  value: string
): {
  name: string;
  winner: boolean;
} {
  const cleaned = cleanHtml(value).trim();

  const winner =
    /\(\s*winner\s*\)\s*$/i.test(
      cleaned
    );

  const name = cleaned
    .replace(
      /\s*\(\s*winner\s*\)\s*$/i,
      ''
    )
    .trim();

  return {
    name,
    winner,
  };
}

/* =========================================================
 * SPLIT NOMINATION CELL
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
 * ARTIST-BASED CATEGORY
 * ======================================================= */

function isArtistBasedCategory(
  category: string
): boolean {
  const target = normalize(category);

  return ARTIST_BASED_CATEGORIES.some(
    (item) =>
      normalize(item) === target
  );
}

/* =========================================================
 * GET NOMINEE TITLE
 * ======================================================= */

function getNomineeTitle(
  nominee: string
): string {
  const cleaned = cleanHtml(nominee);

  const separatorIndex =
    cleaned.indexOf(' - ');

  if (separatorIndex === -1) {
    return cleaned;
  }

  return cleaned
    .slice(0, separatorIndex)
    .trim();
}

/* =========================================================
 * GET NOMINEE ARTIST CREDIT
 * ======================================================= */

function getNomineeArtists(
  nominee: string
): string {
  const cleaned = cleanHtml(nominee);

  const separatorIndex =
    cleaned.indexOf(' - ');

  if (separatorIndex === -1) {
    return cleaned;
  }

  return cleaned
    .slice(separatorIndex + 3)
    .trim();
}

/* =========================================================
 * ARTIST CREDIT TOKENIZER
 * ======================================================= */

function tokenizeArtistCredit(
  credit: string
): string[] {
  let cleaned =
    cleanHtml(credit).trim();

  if (!cleaned) {
    return [];
  }

  /*
   * Remove surrounding parentheses/brackets only
   * when they are part of a stored collaboration
   * credit.
   *
   * IMPORTANT:
   * Silk Sonic is now handled separately as an
   * artist alias in creditBelongsToArtist().
   */
  cleaned = cleaned
    .replace(/[()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  /*
   * Normalize collaboration separators.
   *
   * These separators mean multiple credited artists:
   *
   * &
   * and
   * featuring
   * feat.
   * ft.
   * with
   * /
   * +
   * ×
   * x
   * ,
   * ;
   */
  cleaned = cleaned
    .replace(
      /\s+(?:&|and|featuring|feat\.?|ft\.?|with|\/|\+|×|x)\s+/gi,
      '|||'
    )
    .replace(
      /\s*[,;]\s*/g,
      '|||'
    );

  return cleaned
    .split('|||')
    .map((artist) =>
      artist.trim()
    )
    .filter(Boolean);
}

/* =========================================================
 * SILK SONIC MATCHING
 * ======================================================= */

function isSilkSonic(
  value: string
): boolean {
  return (
    normalize(value) ===
    'silk sonic'
  );
}

/* =========================================================
 * ARTIST CREDIT MATCHING
 * ======================================================= */

function creditBelongsToArtist(
  credit: string,
  requestedArtist: string
): boolean {
  const target =
    normalize(requestedArtist);

  if (!target) {
    return false;
  }

  /*
   * =======================================================
   * SILK SONIC
   *
   * The spreadsheet now credits Silk Sonic simply as:
   *
   * Silk Sonic
   *
   * However, Silk Sonic nominations should appear on:
   *
   * 1. Silk Sonic
   * 2. Bruno Mars
   * 3. Anderson .Paak
   *
   * This is ONLY a matching rule for the artist pages.
   *
   * The displayed credit remains exactly:
   *
   * Silk Sonic
   * =======================================================
   */

  if (isSilkSonic(credit)) {
    return (
      target === 'silk sonic' ||
      target === 'bruno mars' ||
      target === 'anderson .paak'
    );
  }

  /*
   * =======================================================
   * NORMAL COLLABORATIONS
   * =======================================================
   */

  const artists =
    tokenizeArtistCredit(
      credit
    );

  return artists.some(
    (artist) =>
      normalize(artist) ===
      target
  );
}

/* =========================================================
 * NOMINEE MATCHING
 * ======================================================= */

function nomineeBelongsToArtist(
  nominee: string,
  category: string,
  artistName: string
): boolean {
  const target =
    normalize(artistName);

  /*
   * ARTIST-BASED CATEGORIES
   */
  if (
    isArtistBasedCategory(
      category
    )
  ) {
    return (
      normalize(nominee) ===
      target
    );
  }

  /*
   * SONG / ALBUM / OTHER CATEGORIES
   */
  const artistCredit =
    getNomineeArtists(
      nominee
    );

  if (!artistCredit) {
    return false;
  }

  return creditBelongsToArtist(
    artistCredit,
    artistName
  );
}

/* =========================================================
 * PARSE ARTIST LIST
 * ======================================================= */

function parseArtistList(
  csv: string
): string[] {
  const rows = parseCSV(csv);

  if (rows.length <= 1) {
    return [];
  }

  const artists = new Map<
    string,
    string
  >();

  for (
    let i = 1;
    i < rows.length;
    i += 1
  ) {
    const artist =
      rows[i]?.[0]?.trim() ??
      '';

    if (!artist) {
      continue;
    }

    const key =
      normalize(artist);

    if (!artists.has(key)) {
      artists.set(
        key,
        artist
      );
    }
  }

  return Array.from(
    artists.values()
  ).sort(
    (a, b) =>
      a.localeCompare(
        b,
        undefined,
        {
          sensitivity:
            'base',
        }
      )
  );
}

/* =========================================================
 * PARSE ARTIST IMAGES
 * ======================================================= */

function parseArtistImages(
  csv: string
): ArtistImage[] {
  const rows = parseCSV(csv);

  if (rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .map((row) => ({
      artist:
        row[0]?.trim() ?? '',
      image:
        row[1]?.trim() ?? '',
    }))
    .filter(
      (entry) =>
        entry.artist.length > 0
    );
}

/* =========================================================
 * FIND ARTIST IMAGE
 * ======================================================= */

function findArtistImage(
  artistName: string,
  artistImages: ArtistImage[]
): string | undefined {
  const target =
    normalize(artistName);

  return artistImages.find(
    (entry) =>
      normalize(
        entry.artist
      ) === target
  )?.image;
}

/* =========================================================
 * BUILD ARTIST HISTORY
 * ======================================================= */

function buildArtistHistory(
  csv: string,
  artistName: string
): AwardHistoryEntry[] {
  const rows = parseCSV(csv);

  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0];

  const history: AwardHistoryEntry[] =
    [];

  /*
   * Column A = category
   *
   * Columns B onward = years
   */
  for (
    let yearIndex = 1;
    yearIndex < headers.length;
    yearIndex += 1
  ) {
    const year =
      headers[
        yearIndex
      ]?.trim() ?? '';

    if (!year) {
      continue;
    }

    for (
      let rowIndex = 1;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex];

      const category =
        cleanHtml(
          row?.[0]?.trim() ??
            ''
        );

      if (!category) {
        continue;
      }

      const nomineeCell =
        row?.[yearIndex] ??
        '';

      if (
        !nomineeCell.trim()
      ) {
        continue;
      }

      /*
       * Each line here is one
       * physical nominee entry.
       */
      const nomineeLines =
        splitNominationLines(
          nomineeCell
        );

      for (
        let nomineeIndex = 0;
        nomineeIndex <
        nomineeLines.length;
        nomineeIndex += 1
      ) {
        const rawNominee =
          nomineeLines[
            nomineeIndex
          ];

        if (!rawNominee) {
          continue;
        }

        const parsed =
          parseWinner(
            rawNominee
          );

        if (!parsed.name) {
          continue;
        }

        const belongs =
          nomineeBelongsToArtist(
            parsed.name,
            category,
            artistName
          );

        if (!belongs) {
          continue;
        }

        /*
         * ONE AND ONLY ONE
         * HISTORY ENTRY.
         */
        history.push({
          id:
            `${year}|${category}|${nomineeIndex}|${parsed.name}`,
          year,
          category,
          nominee:
            parsed.name,
          winner:
            parsed.winner,
        });
      }
    }
  }

  /*
   * Sort newest year first.
   *
   * Within the same year:
   * winners first.
   *
   * Then category.
   */
  history.sort(
    (a, b) => {
      const yearDifference =
        Number(b.year) -
        Number(a.year);

      if (
        yearDifference !== 0
      ) {
        return yearDifference;
      }

      if (
        a.winner !== b.winner
      ) {
        return a.winner
          ? -1
          : 1;
      }

      return a.category.localeCompare(
        b.category,
        undefined,
        {
          sensitivity:
            'base',
        }
      );
    }
  );

  return history;
}

/* =========================================================
 * DOMINANT COLOR
 * ======================================================= */

function getDominantColor(
  imageUrl: string
): Promise<string> {
  return new Promise(
    (resolve) => {
      const image =
        new Image();

      image.crossOrigin =
        'anonymous';

      image.onload = () => {
        try {
          const canvas =
            document.createElement(
              'canvas'
            );

          const context =
            canvas.getContext(
              '2d',
              {
                willReadFrequently:
                  true,
              }
            );

          if (!context) {
            resolve(
              '#0050FF'
            );
            return;
          }

          const size = 60;

          canvas.width = size;
          canvas.height = size;

          context.drawImage(
            image,
            0,
            0,
            size,
            size
          );

          const imageData =
            context.getImageData(
              0,
              0,
              size,
              size
            ).data;

          const colorMap =
            new Map<
              string,
              {
                count: number;
                r: number;
                g: number;
                b: number;
              }
            >();

          for (
            let i = 0;
            i < imageData.length;
            i += 4
          ) {
            const r =
              imageData[i];

            const g =
              imageData[i + 1];

            const b =
              imageData[i + 2];

            const alpha =
              imageData[i + 3];

            if (alpha < 100) {
              continue;
            }

            const brightness =
              (r + g + b) / 3;

            if (
              brightness < 20 ||
              brightness > 245
            ) {
              continue;
            }

            const qr =
              Math.round(
                r / 24
              ) * 24;

            const qg =
              Math.round(
                g / 24
              ) * 24;

            const qb =
              Math.round(
                b / 24
              ) * 24;

            const key =
              `${qr},${qg},${qb}`;

            const existing =
              colorMap.get(key);

            if (existing) {
              existing.count +=
                1;
            } else {
              colorMap.set(
                key,
                {
                  count: 1,
                  r: qr,
                  g: qg,
                  b: qb,
                }
              );
            }
          }

          let dominant:
            | {
                count: number;
                r: number;
                g: number;
                b: number;
              }
            | undefined;

          for (
            const color of
              colorMap.values()
          ) {
            if (
              !dominant ||
              color.count >
                dominant.count
            ) {
              dominant =
                color;
            }
          }

          if (!dominant) {
            resolve(
              '#0050FF'
            );
            return;
          }

          const factor = 0.82;

          const r =
            Math.max(
              0,
              Math.min(
                255,
                Math.round(
                  dominant.r *
                    factor
                )
              )
            );

          const g =
            Math.max(
              0,
              Math.min(
                255,
                Math.round(
                  dominant.g *
                    factor
                )
              )
            );

          const b =
            Math.max(
              0,
              Math.min(
                255,
                Math.round(
                  dominant.b *
                    factor
                )
              )
            );

          resolve(
            `rgb(${r}, ${g}, ${b})`
          );
        } catch {
          resolve(
            '#0050FF'
          );
        }
      };

      image.onerror = () => {
        resolve(
          '#0050FF'
        );
      };

      image.src = imageUrl;
    }
  );
}

/* =========================================================
 * HERO TEXT COLOR
 * ======================================================= */

function getHeroTextColor(
  color: string
): '#000000' | '#FFFFFF' {
  const match =
    color.match(
      /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/
    );

  if (!match) {
    return '#FFFFFF';
  }

  const r = Number(
    match[1]
  );

  const g = Number(
    match[2]
  );

  const b = Number(
    match[3]
  );

  const luminance =
    (0.299 * r +
      0.587 * g +
      0.114 * b) /
    255;

  return luminance > 0.58
    ? '#000000'
    : '#FFFFFF';
}

/* =========================================================
 * FORMAT NOMINEE ARTISTS
 * ======================================================= */

function formatNomineeArtists(
  nominee: string,
  category: string
): string {
  if (
    isArtistBasedCategory(
      category
    )
  ) {
    return nominee;
  }

  return getNomineeArtists(
    nominee
  );
}

/* =========================================================
 * FORMAT NOMINEE TITLE
 * ======================================================= */

function formatNomineeTitle(
  nominee: string,
  category: string
): string {
  if (
    isArtistBasedCategory(
      category
    )
  ) {
    return '—';
  }

  return getNomineeTitle(
    nominee
  );
}

/* =========================================================
 * NOMINATION URL
 *
 * ALL NOMINEES now goes back to:
 *
 * /awards?year=2025&category=Song%20of%20the%20Year
 *
 * This allows awards/page.tsx to display
 * the correct year + category.
 * ======================================================= */

function getNominationUrl(
  year: string,
  category: string
): string {
  return `/awards?year=${encodeURIComponent(
    year
  )}&category=${encodeURIComponent(
    category
  )}`;
}

/* =========================================================
 * PAGE
 * ======================================================= */

export default function AwardsArtistPage() {
  const params = useParams();
  const router = useRouter();

  const rawArtist =
    params?.artist;

  const artistName =
    decodeURIComponent(
      Array.isArray(rawArtist)
        ? rawArtist[0] ?? ''
        : rawArtist ?? ''
    );

  const [
    history,
    setHistory,
  ] =
    useState<AwardHistoryEntry[]>(
      []
    );

  const [
    artistImages,
    setArtistImages,
  ] =
    useState<ArtistImage[]>([]);

  const [
    allArtists,
    setAllArtists,
  ] =
    useState<string[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    recognitionIndex,
    setRecognitionIndex,
  ] = useState(0);

  const [
    dominantColor,
    setDominantColor,
  ] = useState('#0050FF');

  /* =======================================================
   * LOAD DATA
   * ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(false);

        const nomineesResponse =
          await fetch(
            `${NOMINEES_CSV_URL}&_=${Date.now()}`,
            {
              cache: 'no-store',
            }
          );

        if (
          !nomineesResponse.ok
        ) {
          throw new Error(
            `Awards CSV failed: ${nomineesResponse.status}`
          );
        }

        const nomineesCSV =
          await nomineesResponse.text();

        const artistHistory =
          buildArtistHistory(
            nomineesCSV,
            artistName
          );

        let parsedArtistImages:
          ArtistImage[] = [];

        let parsedArtistList:
          string[] = [];

        try {
          const artistsResponse =
            await fetch(
              `${ARTISTS_CSV_URL}&_=${Date.now()}`,
              {
                cache: 'no-store',
              }
            );

          if (
            !artistsResponse.ok
          ) {
            throw new Error(
              `Artists CSV failed: ${artistsResponse.status}`
            );
          }

          const artistsCSV =
            await artistsResponse.text();

          if (
            artistsCSV.trim()
          ) {
            parsedArtistList =
              parseArtistList(
                artistsCSV
              );

            parsedArtistImages =
              parseArtistImages(
                artistsCSV
              );
          }
        } catch (
          imageError
        ) {
          console.warn(
            '[AWARDS] Artist CSV failed:',
            imageError
          );
        }

        if (!cancelled) {
          setHistory(
            artistHistory
          );

          setAllArtists(
            parsedArtistList
          );

          setArtistImages(
            parsedArtistImages
          );

          setRecognitionIndex(
            0
          );
        }
      } catch (
        loadError
      ) {
        console.error(
          '[AWARDS] Failed to load artist history:',
          loadError
        );

        if (!cancelled) {
          setHistory([]);
          setAllArtists([]);
          setArtistImages([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (artistName) {
      void loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [artistName]);

  /* =======================================================
   * ARTIST IMAGE
   * ===================================================== */

  const artistImage =
    useMemo(
      () =>
        findArtistImage(
          artistName,
          artistImages
        ),
      [
        artistName,
        artistImages,
      ]
    );

  /* =======================================================
   * DOMINANT COLOR
   * ===================================================== */

  useEffect(() => {
    if (!artistImage) {
      setDominantColor(
        '#0050FF'
      );

      return;
    }

    let cancelled = false;

    void getDominantColor(
      artistImage
    ).then((color) => {
      if (!cancelled) {
        setDominantColor(
          color
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [artistImage]);

  /* =======================================================
   * HERO TEXT COLOR
   * ===================================================== */

  const heroTextColor =
    useMemo(
      () =>
        getHeroTextColor(
          dominantColor
        ),
      [dominantColor]
    );

  /* =======================================================
   * SEARCH
   * ===================================================== */

  const filteredArtists =
    useMemo(() => {
      const query =
        normalize(
          searchQuery
        );

      if (!query) {
        return [];
      }

      return allArtists
        .filter((artist) =>
          normalize(
            artist
          ).includes(query)
        )
        .filter(
          (artist) =>
            normalize(
              artist
            ) !==
            normalize(
              artistName
            )
        )
        .slice(0, 8);
    }, [
      allArtists,
      searchQuery,
      artistName,
    ]);

  /* =======================================================
   * STATS
   * ===================================================== */

  const totalNominations =
    history.length;

  const totalWins =
    history.filter(
      (entry) =>
        entry.winner
    ).length;

  /* =======================================================
   * CURRENT RECOGNITION
   * ===================================================== */

  const currentRecognition =
    history[
      recognitionIndex
    ];

  /* =======================================================
   * NAVIGATION
   * ===================================================== */

  function goToArtist(
    artist: string
  ) {
    setSearchOpen(false);
    setSearchQuery('');

    router.push(
      `/awards/artists/${encodeURIComponent(
        artist
      )}`
    );
  }

  function goToNomination(
    year: string,
    category: string
  ) {
    const url =
      getNominationUrl(
        year,
        category
      );

    router.push(url);
  }

  function goBackToAwards() {
    router.push('/awards');
  }

  function previousRecognition() {
    if (
      history.length === 0
    ) {
      return;
    }

    setRecognitionIndex(
      (current) =>
        current === 0
          ? history.length - 1
          : current - 1
    );
  }

  function nextRecognition() {
    if (
      history.length === 0
    ) {
      return;
    }

    setRecognitionIndex(
      (current) =>
        current ===
        history.length - 1
          ? 0
          : current + 1
    );
  }

  /* =======================================================
   * RENDER
   * ===================================================== */

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">

        {/* =================================================
         * HERO
         * ================================================= */}

        {!loading &&
          !error &&
          history.length > 0 && (
            <section
              className="
                relative
                mt-0
                w-full
                overflow-hidden
              "
              style={{
                backgroundColor:
                  dominantColor,
              }}
            >
              <div
                className="
                  absolute
                  inset-x-0
                  top-0
                  z-30
                  px-4
                  pt-6
                  sm:px-6
                  sm:pt-8
                  lg:px-8
                  lg:pt-8
                "
                style={{
                  color:
                    heroTextColor,
                }}
              >
                <div className="flex items-start justify-between">

                  <button
                    type="button"
                    onClick={
                      goBackToAwards
                    }
                    className="
                      font-brown-bold
                      text-xs
                      uppercase
                      tracking-[0.08em]
                      transition-opacity
                      hover:opacity-60
                    "
                    style={{
                      color:
                        heroTextColor,
                    }}
                  >
                    ← Awards
                  </button>

                  <div className="relative flex flex-col items-end">

                    <button
                      type="button"
                      aria-label="Search Awards artists"
                      onClick={() =>
                        setSearchOpen(
                          (current) =>
                            !current
                        )
                      }
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        border
                        transition-all
                        duration-150
                        sm:h-12
                        sm:w-12
                      "
                      style={{
                        color:
                          heroTextColor,
                        borderColor:
                          `${heroTextColor}40`,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="6.5"
                        />

                        <path
                          d="M16 16L21 21"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    {searchOpen && (
                      <div
                        className="
                          absolute
                          right-0
                          top-[3.5rem]
                          z-50
                          w-[min(78vw,340px)]
                          sm:top-[3.75rem]
                          sm:w-[340px]
                        "
                      >
                        <div
                          className="
                            rounded-none
                            border
                            backdrop-blur-xl
                          "
                          style={{
                            backgroundColor:
                              heroTextColor ===
                              '#FFFFFF'
                                ? 'rgba(0,0,0,0.35)'
                                : 'rgba(255,255,255,0.35)',
                            borderColor:
                              `${heroTextColor}35`,
                          }}
                        >
                          <input
                            autoFocus
                            type="text"
                            value={
                              searchQuery
                            }
                            onChange={(
                              event
                            ) =>
                              setSearchQuery(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="SEARCH AWARDS ARTISTS"
                            className="
                              w-full
                              bg-transparent
                              px-4
                              py-3
                              font-brown-regular
                              text-sm
                              uppercase
                              tracking-[0.08em]
                              outline-none
                              placeholder:opacity-50
                            "
                            style={{
                              color:
                                heroTextColor,
                            }}
                          />
                        </div>

                        {searchQuery &&
                          filteredArtists.length >
                            0 && (
                            <div
                              className="
                                mt-1
                                overflow-hidden
                                border
                                backdrop-blur-2xl
                              "
                              style={{
                                backgroundColor:
                                  heroTextColor ===
                                  '#FFFFFF'
                                    ? 'rgba(0,0,0,0.55)'
                                    : 'rgba(255,255,255,0.55)',
                                borderColor:
                                  `${heroTextColor}30`,
                              }}
                            >
                              {filteredArtists.map(
                                (
                                  artist
                                ) => (
                                  <button
                                    key={
                                      artist
                                    }
                                    type="button"
                                    onClick={() =>
                                      goToArtist(
                                        artist
                                      )
                                    }
                                    className="
                                      block
                                      w-full
                                      px-4
                                      py-3
                                      text-right
                                      font-brown-bold
                                      text-sm
                                      uppercase
                                      transition-colors
                                      hover:bg-black/10
                                    "
                                    style={{
                                      color:
                                        heroTextColor,
                                    }}
                                  >
                                    {
                                      artist
                                    }
                                  </button>
                                )
                              )}
                            </div>
                          )}

                        {searchQuery &&
                          filteredArtists.length ===
                            0 && (
                            <div
                              className="
                                mt-1
                                border
                                px-4
                                py-4
                                text-right
                                backdrop-blur-2xl
                              "
                              style={{
                                backgroundColor:
                                  heroTextColor ===
                                  '#FFFFFF'
                                    ? 'rgba(0,0,0,0.55)'
                                    : 'rgba(255,255,255,0.55)',
                                borderColor:
                                  `${heroTextColor}30`,
                              }}
                            >
                              <p
                                className="
                                  font-brown-regular
                                  text-xs
                                  uppercase
                                  tracking-[0.08em]
                                "
                                style={{
                                  color:
                                    heroTextColor,
                                  opacity: 0.7,
                                }}
                              >
                                No Awards artists found
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="
                  grid
                  w-full
                  grid-cols-1
                  lg:grid-cols-[50%_50%]
                "
              >
                <div
                  className="
                    relative
                    aspect-square
                    w-full
                    overflow-hidden
                    lg:aspect-auto
                    lg:min-h-[620px]
                  "
                >
                  {artistImage ? (
                    <img
                      src={artistImage}
                      alt={artistName}
                      crossOrigin="anonymous"
                      className="
                        absolute
                        inset-0
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        min-h-[420px]
                        w-full
                        items-center
                        justify-center
                        bg-[#0050FF]
                      "
                    >
                      <span
                        className="
                          font-brown-bold
                          text-xl
                          uppercase
                          text-white
                        "
                      >
                        ECA
                        <br />
                        AWARDS
                      </span>
                    </div>
                  )}

                  <div
                    className="
                      absolute
                      inset-y-0
                      right-0
                      hidden
                      w-[45%]
                      lg:block
                    "
                    style={{
                      background:
                        `linear-gradient(
                          to right,
                          transparent 0%,
                          ${dominantColor} 100%
                        )`,
                    }}
                  />

                  <div
                    className="
                      absolute
                      inset-x-0
                      bottom-0
                      h-[35%]
                      lg:hidden
                    "
                    style={{
                      background:
                        `linear-gradient(
                          to top,
                          ${dominantColor} 0%,
                          transparent 100%
                        )`,
                    }}
                  />
                </div>

                <div
                  className="
                    flex
                    min-h-[420px]
                    flex-col
                    justify-between
                    px-5
                    pb-8
                    pt-3
                    sm:px-8
                    sm:pb-10
                    sm:pt-6
                    lg:min-h-[620px]
                    lg:px-12
                    lg:pb-12
                    lg:pt-12
                  "
                  style={{
                    color:
                      heroTextColor,
                  }}
                >
                  <div>
                    <p
                      className="
                        font-brown-regular
                        text-xs
                        uppercase
                        tracking-[0.12em]
                        opacity-55
                        sm:text-sm
                      "
                    >
                      Artist
                    </p>

                    <h1
                      className="
                        mt-1
                        max-w-3xl
                        break-words
                        font-brown-bold
                        text-[2.8rem]
                        uppercase
                        leading-[0.86]
                        tracking-[-0.07em]
                        sm:text-[4.4rem]
                        lg:text-[5.2rem]
                        xl:text-[5.8rem]
                      "
                    >
                      {artistName}
                    </h1>
                  </div>

                  <div className="mt-10">

                    <div
                      className="
                        grid
                        grid-cols-2
                      "
                    >
                      <div
                        className="
                          py-5
                          pr-5
                          sm:py-7
                          sm:pr-8
                        "
                      >
                        <p
                          className="
                            font-brown-bold
                            text-4xl
                            leading-none
                            sm:text-6xl
                          "
                        >
                          {totalWins}
                        </p>

                        <p
                          className="
                            mt-2
                            font-brown-regular
                            text-[10px]
                            uppercase
                            tracking-[0.1em]
                            opacity-55
                            sm:text-xs
                          "
                        >
                          Wins
                        </p>
                      </div>

                      <div
                        className="
                          py-5
                          pl-5
                          sm:py-7
                          sm:pl-8
                        "
                      >
                        <p
                          className="
                            font-brown-bold
                            text-4xl
                            leading-none
                            sm:text-6xl
                          "
                        >
                          {
                            totalNominations
                          }
                        </p>

                        <p
                          className="
                            mt-2
                            font-brown-regular
                            text-[10px]
                            uppercase
                            tracking-[0.1em]
                            opacity-55
                            sm:text-xs
                          "
                        >
                          Nominations
                        </p>
                      </div>
                    </div>

                    {currentRecognition && (
                      <div
                        className="
                          mt-8
                          pt-6
                          sm:mt-10
                          sm:pt-8
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-5
                          "
                        >
                          <div className="min-w-0">

                            <div className="flex items-center gap-3">
                              <span
                                className="
                                  font-brown-bold
                                  text-xs
                                  uppercase
                                  tracking-[0.1em]
                                  opacity-55
                                  sm:text-sm
                                "
                              >
                                {
                                  currentRecognition.year
                                }
                              </span>

                              <span
                                className="
                                  font-brown-bold
                                  text-[9px]
                                  uppercase
                                  tracking-[0.08em]
                                "
                              >
                                {
                                  currentRecognition.winner
                                    ? 'Winner'
                                    : 'Nominee'
                                }
                              </span>
                            </div>

                            <h2
                              className="
                                mt-3
                                font-brown-bold
                                text-xl
                                uppercase
                                leading-tight
                                sm:text-2xl
                              "
                            >
                              {
                                currentRecognition.category
                              }
                            </h2>

                            <p
                              className="
                                mt-2
                                font-brown-regular
                                text-sm
                                leading-tight
                                opacity-60
                                sm:text-base
                              "
                            >
                              {
                                formatNomineeTitle(
                                  currentRecognition.nominee,
                                  currentRecognition.category
                                )
                              }
                            </p>
                          </div>

                          <div
                            className="
                              flex
                              shrink-0
                              gap-1
                            "
                          >
                            <button
                              type="button"
                              aria-label="Previous recognition"
                              onClick={
                                previousRecognition
                              }
                              className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                font-brown-bold
                                text-lg
                                transition-opacity
                                hover:opacity-50
                                sm:h-11
                                sm:w-11
                              "
                            >
                              ‹
                            </button>

                            <button
                              type="button"
                              aria-label="Next recognition"
                              onClick={
                                nextRecognition
                              }
                              className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                font-brown-bold
                                text-lg
                                transition-opacity
                                hover:opacity-50
                                sm:h-11
                                sm:w-11
                              "
                            >
                              ›
                            </button>
                          </div>
                        </div>

                        <p
                          className="
                            mt-5
                            font-brown-regular
                            text-[9px]
                            uppercase
                            tracking-[0.12em]
                            opacity-35
                          "
                        >
                          Recognition{' '}
                          {recognitionIndex +
                            1}{' '}
                          of{' '}
                          {history.length}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* =================================================
         * LOADING
         * ================================================= */}

        {loading && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div
              className="
                h-[520px]
                animate-pulse
                bg-black/[0.05]
              "
            />
          </section>
        )}

        {/* =================================================
         * ERROR
         * ================================================= */}

        {!loading &&
          error && (
            <div className="py-24 text-center">
              <p
                className="
                  font-brown-regular
                  text-xs
                  uppercase
                  tracking-[0.15em]
                  text-black/40
                "
              >
                Failed to load Awards history
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
            </div>
          )}

        {/* =================================================
         * NO HISTORY
         * ================================================= */}

        {!loading &&
          !error &&
          history.length === 0 && (
            <div className="py-24 text-center">
              <p
                className="
                  font-brown-regular
                  text-xs
                  uppercase
                  tracking-[0.15em]
                  text-black/40
                "
              >
                No Awards history found
              </p>
            </div>
          )}

        {/* =================================================
         * ALL AWARDS
         * ================================================= */}

        {!loading &&
          !error &&
          history.length > 0 && (
            <section
              className="
                mx-auto
                max-w-7xl
                px-4
                pb-24
                pt-14
                sm:px-6
                sm:pt-20
                lg:px-8
              "
            >
              <div className="mb-8 text-center sm:mb-12">
                <p
                  className="
                    font-brown-regular
                    text-xs
                    uppercase
                    tracking-[0.12em]
                    text-black/40
                  "
                >
                  All Awards and Nominations
                </p>

                <h2
                  className="
                    mt-2
                    font-brown-bold
                    text-4xl
                    uppercase
                    leading-none
                    tracking-[-0.06em]
                    sm:text-6xl
                  "
                >
                  {artistName}
                </h2>
              </div>

              {/* =================================================
               * DESKTOP HEADER
               * ================================================= */}

              <div
                className="
                  hidden
                  grid-cols-[90px_minmax(190px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)_auto]
                  gap-5
                  px-4
                  py-4
                  md:grid
                "
              >
                <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-black/40">
                  Year
                </p>

                <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-black/40">
                  Category
                </p>

                <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-black/40">
                  Artists
                </p>

                <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-black/40">
                  Title
                </p>

                <p className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-black/40">
                  All Nominees
                </p>
              </div>

              <div>
                {history.map(
                  (entry) => {
                    const title =
                      formatNomineeTitle(
                        entry.nominee,
                        entry.category
                      );

                    const artists =
                      formatNomineeArtists(
                        entry.nominee,
                        entry.category
                      );

                    const nominationUrl =
                      getNominationUrl(
                        entry.year,
                        entry.category
                      );

                    return (
                      <div
                        key={entry.id}
                        onClick={() =>
                          goToNomination(
                            entry.year,
                            entry.category
                          )
                        }
                        role="link"
                        tabIndex={0}
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                              'Enter' ||
                            event.key ===
                              ' '
                          ) {
                            event.preventDefault();

                            goToNomination(
                              entry.year,
                              entry.category
                            );
                          }
                        }}
                        className={`
                          group
                          block
                          w-full
                          cursor-pointer
                          px-4
                          py-5
                          text-left
                          transition-colors
                          sm:py-6
                          ${
                            entry.winner
                              ? 'bg-[#EAF4FF]'
                              : 'bg-white'
                          }
                          hover:bg-[#0050FF]/[0.06]
                          focus:outline-none
                        `}
                      >

                        {/* =================================================
                         * DESKTOP ROW
                         * ================================================= */}

                        <div
                          className="
                            hidden
                            grid-cols-[90px_minmax(190px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)_auto]
                            items-center
                            gap-5
                            md:grid
                          "
                        >
                          <p
                            className="
                              font-brown-bold
                              text-sm
                              leading-tight
                            "
                          >
                            {
                              entry.year
                            }
                          </p>

                          <div>
                            <p
                              className="
                                font-brown-bold
                                text-sm
                                uppercase
                                leading-tight
                                transition-colors
                                group-hover:text-[#0050FF]
                              "
                            >
                              {
                                entry.category
                              }
                            </p>

                            <p
                              className={`
                                mt-2
                                font-brown-regular
                                text-[9px]
                                uppercase
                                tracking-[0.08em]
                                ${
                                  entry.winner
                                    ? 'text-[#0050FF]'
                                    : 'text-black/35'
                                }
                              `}
                            >
                              {entry.winner
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
                            {
                              artists
                            }
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

                          {/* =================================================
                           * ALL NOMINEES
                           * ================================================= */}

                          <div className="flex items-center justify-end">
                            <Link
                              href={
                                nominationUrl
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();
                              }}
                              className="
                                inline-flex
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-[#0050FF]
                                px-3
                                py-1.5
                                font-brown-bold
                                text-[9px]
                                uppercase
                                tracking-[0.08em]
                                text-white
                                transition-all
                                duration-150
                                hover:bg-black
                              "
                            >
                              All Nominees
                            </Link>
                          </div>
                        </div>

                        {/* =================================================
                         * MOBILE ROW
                         * ================================================= */}

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
                                {
                                  entry.year
                                }
                              </p>

                              <p
                                className="
                                  mt-2
                                  font-brown-bold
                                  text-sm
                                  uppercase
                                  leading-tight
                                  group-hover:text-[#0050FF]
                                "
                              >
                                {
                                  entry.category
                                }
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
                                  entry.winner
                                    ? 'text-[#0050FF]'
                                    : 'text-black/30'
                                }
                              `}
                            >
                              {entry.winner
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
                                {
                                  artists
                                }
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

                          {/* =================================================
                           * MOBILE ALL NOMINEES
                           * ================================================= */}

                          <div className="mt-5 flex items-center justify-between gap-4">
                            <Link
                              href={
                                nominationUrl
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();
                              }}
                              className="
                                inline-flex
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-[#0050FF]
                                px-3
                                py-1.5
                                font-brown-bold
                                text-[9px]
                                uppercase
                                tracking-[0.08em]
                                text-white
                                transition-all
                                duration-150
                                hover:bg-black
                              "
                            >
                              All Nominees
                            </Link>

                            <p
                              className="
                                font-brown-bold
                                text-[9px]
                                uppercase
                                tracking-[0.1em]
                                text-[#0050FF]
                                opacity-0
                                transition-opacity
                                group-hover:opacity-100
                              "
                            >
                              View nomination →
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

        <div className="h-8 sm:h-12" />
      </div>
    </main>
  );
}