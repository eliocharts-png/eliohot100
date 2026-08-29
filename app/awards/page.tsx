'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

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

type Nominee = {
  name: string;
  winner: boolean;
};

type AwardCategory = {
  category: string;
  nominees: Nominee[];
};

type ArtistImage = {
  artist: string;
  image: string;
};

/* =========================================================
 * CATEGORY TYPES
 * ======================================================= */

const ARTIST_BASED_CATEGORIES = [
  'Artist of the Year',
  'Best New Artist',
  'Best Duo/Group',
  'Best Female Artist',
  'Best Male Artist',
];

const SOUNDTRACK_CATEGORY = 'Soundtrack of the Year';

/* =========================================================
 * SPECIAL ARTIST ACTS
 *
 * These must remain ONE artist/act rather than being split.
 * ======================================================= */

const SPECIAL_ARTIST_ACTS = [
  'Mumford & Sons',
  'Macklemore & Ryan Lewis',
  'Nico & Vinz',
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
 * NORMALIZE
 * ======================================================= */

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/* =========================================================
 * REMOVE WINNER INDICATOR
 *
 * (Winner), (winner), ( WINNER ), etc.
 *
 * Winner is metadata only and must NEVER be displayed,
 * linked, used for image lookup, or included in parsing.
 * ======================================================= */

function removeWinnerIndicator(value: string): string {
  return value
    .replace(
      /\s*\(\s*winner\s*\)\s*/gi,
      ' '
    )
    .replace(
      /\s*\[\s*winner\s*\]\s*/gi,
      ' '
    )
    .replace(
      /\s*\*+\s*\(?\s*winner\s*\)?\s*\*+\s*/gi,
      ' '
    )
    .replace(
      /\s+winner\s*$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
 * CLEAN WINNER MARKER
 *
 * Kept as a shared function for compatibility with all
 * parsing logic.
 * ======================================================= */

function cleanWinnerMarker(value: string): string {
  return removeWinnerIndicator(value);
}

/* =========================================================
 * PARSE NOMINEES
 * ======================================================= */

function parseNominees(
  csv: string,
  year: string
): AwardCategory[] {
  const rows = parseCSV(csv);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];

  const yearColumn =
    headers.findIndex(
      (header) =>
        header.trim() === year
    );

  if (yearColumn === -1) {
    console.warn(
      `[AWARDS] No column found for year ${year}`
    );

    return [];
  }

  const categories: AwardCategory[] = [];

  for (
    let i = 1;
    i < rows.length;
    i += 1
  ) {
    const row = rows[i];

    const category =
      row[0]?.trim() ?? '';

    const nomineeCell =
      row[yearColumn]?.trim() ?? '';

    if (
      !category ||
      !nomineeCell
    ) {
      continue;
    }

    const nomineeLines =
      nomineeCell
        .split(/\r?\n/)
        .map((line) =>
          line.trim()
        )
        .filter(Boolean);

    const nominees: Nominee[] =
      nomineeLines.map((line) => {
        const winner =
          /\(\s*winner\s*\)/i.test(line) ||
          /\[\s*winner\s*\]/i.test(line) ||
          /\*+\s*\(?\s*winner\s*\)?\s*\*+/i.test(line) ||
          /\s+winner\s*$/i.test(line);

        const cleanName =
          cleanWinnerMarker(line);

        return {
          name: cleanName,
          winner,
        };
      });

    if (
      nominees.length > 0
    ) {
      categories.push({
        category,
        nominees,
      });
    }
  }

  return categories;
}

/* =========================================================
 * PARSE ARTIST IMAGES
 * ======================================================= */

function parseArtistImages(
  csv: string
): ArtistImage[] {
  const rows = parseCSV(csv);

  if (rows.length === 0) {
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
    normalize(
      cleanWinnerMarker(
        artistName
      )
    );

  const match =
    artistImages.find(
      (entry) =>
        normalize(
          cleanWinnerMarker(
            entry.artist
          )
        ) === target
    );

  return (
    match?.image ||
    undefined
  );
}

/* =========================================================
 * CHECK SPECIAL ACT
 * ======================================================= */

function isSpecialArtistAct(
  artist: string
): boolean {
  const target =
    normalize(
      cleanWinnerMarker(
        artist
      )
    );

  return SPECIAL_ARTIST_ACTS.some(
    (specialAct) =>
      normalize(
        specialAct
      ) === target
  );
}

/* =========================================================
 * EXTRACT ARTISTS
 *
 * Normal collaborations:
 *
 * Taylor Swift & Ice Spice
 * Taylor Swift feat. Ice Spice
 * Taylor Swift ft. Ice Spice
 * Taylor Swift featuring Ice Spice
 * Taylor Swift with Ice Spice
 *
 * become:
 *
 * Taylor Swift
 * Ice Spice
 *
 * HOWEVER:
 *
 * Mumford & Sons
 * Macklemore & Ryan Lewis
 * Nico & Vinz
 *
 * remain intact.
 * ======================================================= */

function extractArtists(
  credit: string
): string[] {
  const cleaned =
    cleanWinnerMarker(
      credit
    );

  /* =======================================================
   * First protect the three special acts.
   * ===================================================== */

  const protectedActs: {
    token: string;
    artist: string;
  }[] = [];

  let protectedCredit =
    cleaned;

  SPECIAL_ARTIST_ACTS.forEach(
    (artist, index) => {
      const token =
        `___SPECIAL_ACT_${index}___`;

      const regex =
        new RegExp(
          artist.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          ),
          'gi'
        );

      if (
        regex.test(
          protectedCredit
        )
      ) {
        protectedActs.push({
          token,
          artist,
        });

        protectedCredit =
          protectedCredit.replace(
            regex,
            token
          );
      }
    }
  );

  /* =======================================================
   * Split all normal credits.
   * ===================================================== */

  const artists =
    protectedCredit
      .split(
        /\s+(?:&|and|featuring|feat\.?|ft\.?|with)\s+|,\s*/i
      )
      .map((artist) =>
        artist
          .trim()
          .replace(
            /^___SPECIAL_ACT_(\d+)___$/i,
            (_, index) => {
              const match =
                protectedActs.find(
                  (
                    item
                  ) =>
                    item.token ===
                    `___SPECIAL_ACT_${index}___`
                );

              return (
                match?.artist ??
                ''
              );
            }
          )
      )
      .map((artist) =>
        cleanWinnerMarker(
          artist
        )
      )
      .filter(Boolean);

  return artists;
}

/* =========================================================
 * GET NOMINEE ARTISTS
 * ======================================================= */

function getNomineeArtists(
  nominee: string
): string {
  const cleaned =
    cleanWinnerMarker(
      nominee
    );

  if (
    !cleaned.includes(' - ')
  ) {
    return cleaned;
  }

  const parts =
    cleaned.split(' - ');

  return parts
    .slice(1)
    .join(' - ')
    .trim();
}

/* =========================================================
 * GET NOMINEE TITLE
 * ======================================================= */

function getNomineeTitle(
  nominee: string
): string {
  const cleaned =
    cleanWinnerMarker(
      nominee
    );

  if (
    !cleaned.includes(' - ')
  ) {
    return cleaned;
  }

  return cleaned
    .split(' - ')[0]
    .trim();
}

/* =========================================================
 * QUOTED TITLE
 *
 * Songs and albums are displayed as:
 *
 * "Karma"
 *
 * Artist-based categories are NOT quoted.
 * ======================================================= */

function formatTitle(
  title: string
): string {
  const cleaned =
    cleanWinnerMarker(
      title
    );

  return `"${cleaned}"`;
}

/* =========================================================
 * GET NOMINEE IMAGES
 *
 * Supports up to FOUR artist images.
 * ======================================================= */

function getNomineeImages(
  nominee: string,
  artistImages: ArtistImage[]
): string[] {
  const cleaned =
    cleanWinnerMarker(
      nominee
    );

  /*
   * Artist-based categories:
   *
   * Kendrick Lamar
   */

  if (
    !cleaned.includes(' - ')
  ) {
    const directImage =
      findArtistImage(
        cleaned,
        artistImages
      );

    return directImage
      ? [directImage]
      : [];
  }

  /*
   * Song / album categories:
   *
   * TITLE - ARTIST
   */

  const parts =
    cleaned.split(' - ');

  const artistCredit =
    parts[
      parts.length - 1
    ] ?? '';

  const artists =
    extractArtists(
      artistCredit
    );

  return artists
    .slice(0, 4)
    .map((artist) =>
      findArtistImage(
        artist,
        artistImages
      )
    )
    .filter(
      (
        image
      ): image is string =>
        Boolean(image)
    );
}

/* =========================================================
 * ARTIST-BASED CATEGORY
 * ======================================================= */

function isArtistBasedCategory(
  categoryName: string
): boolean {
  return ARTIST_BASED_CATEGORIES.some(
    (category) =>
      normalize(category) ===
      normalize(categoryName)
  );
}

/* =========================================================
 * ARTIST LINK
 * ======================================================= */

function ArtistLink({
  artist,
}: {
  artist: string;
}) {
  const router = useRouter();

  const cleanArtist =
    cleanWinnerMarker(
      artist
    );

  function openArtist() {
    router.push(
      `/awards/artists/${encodeURIComponent(
        cleanArtist
      )}`
    );
  }

  return (
    <button
      type="button"
      onClick={openArtist}
      className="text-left transition-opacity hover:opacity-60"
    >
      {cleanArtist}
    </button>
  );
}

/* =========================================================
 * ARTIST CREDIT
 *
 * Displays normal collaborations with commas:
 *
 * Taylor Swift, Ice Spice
 *
 * Special acts stay intact:
 *
 * Mumford & Sons
 * Macklemore & Ryan Lewis
 * Nico & Vinz
 *
 * Each normal artist remains independently clickable.
 * ======================================================= */

function ArtistCredit({
  artistCredit,
}: {
  artistCredit: string;
}) {
  const cleaned =
    cleanWinnerMarker(
      artistCredit
    );

  const artists =
    extractArtists(
      cleaned
    );

  if (
    artists.length <= 1
  ) {
    return (
      <ArtistLink
        artist={
          artists[0] ??
          cleaned
        }
      />
    );
  }

  return (
    <>
      {artists.map(
        (
          artist,
          index
        ) => (
          <span
            key={`${artist}-${index}`}
          >
            <ArtistLink
              artist={artist}
            />

            {index <
              artists.length - 1 &&
              ', '}
          </span>
        )
      )}
    </>
  );
}

/* =========================================================
 * COLLAGE
 *
 * 1 image  = full image
 * 2 images = 2 columns
 * 3 images = 3 columns
 * 4 images = 2 x 2 grid
 * ======================================================= */

function NomineeImageCollage({
  images,
}: {
  images: string[];
}) {
  if (
    images.length === 0
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0050FF] px-4 text-center">
        <span className="font-brown-bold text-sm uppercase leading-tight text-white sm:text-base">
          ECA
          <br />
          NOMINEE
        </span>
      </div>
    );
  }

  if (
    images.length === 1
  ) {
    return (
      <img
        src={images[0]}
        alt=""
        className="
          h-full
          w-full
          object-cover
          transition-transform
          duration-300
          group-hover:scale-[1.02]
        "
      />
    );
  }

  if (
    images.length === 2
  ) {
    return (
      <div className="grid h-full w-full grid-cols-2">
        {images.map(
          (
            image,
            index
          ) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt=""
              className="
                h-full
                min-w-0
                w-full
                object-cover
                transition-transform
                duration-300
                group-hover:scale-[1.02]
              "
            />
          )
        )}
      </div>
    );
  }

  if (
    images.length === 3
  ) {
    return (
      <div className="grid h-full w-full grid-cols-3">
        {images.map(
          (
            image,
            index
          ) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt=""
              className="
                h-full
                min-w-0
                w-full
                object-cover
                transition-transform
                duration-300
                group-hover:scale-[1.02]
              "
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2">
      {images
        .slice(0, 4)
        .map(
          (
            image,
            index
          ) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt=""
              className="
                h-full
                min-h-0
                min-w-0
                w-full
                object-cover
                transition-transform
                duration-300
                group-hover:scale-[1.02]
              "
            />
          )
        )}
    </div>
  );
}

/* =========================================================
 * NOMINEE CARD
 * ======================================================= */

function NomineeCard({
  nominee,
  category,
  artistImages,
}: {
  nominee: Nominee;
  category: string;
  artistImages: ArtistImage[];
}) {
  const artistBased =
    isArtistBasedCategory(
      category
    );

  const cleanNominee =
    cleanWinnerMarker(
      nominee.name
    );

  const images =
    getNomineeImages(
      cleanNominee,
      artistImages
    );

  const title =
    artistBased
      ? cleanNominee
      : getNomineeTitle(
          cleanNominee
        );

  const artist =
    artistBased
      ? ''
      : cleanNominee.includes(
          ' - '
        )
        ? getNomineeArtists(
            cleanNominee
          )
        : '';

  return (
    <div className="group min-w-0 cursor-pointer">
      <div className="overflow-hidden bg-white">

        {/* IMAGE */}

        <div className="relative aspect-square w-full overflow-hidden bg-white">
          <NomineeImageCollage
            images={images}
          />

          {/* BLUE HOVER */}

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-[#0050FF]/0
              transition-colors
              duration-200
              group-hover:bg-[#0050FF]/20
            "
          />

          {/* WINNER */}

          {nominee.winner && (
            <div
              className="
                absolute
                bottom-0
                left-0
                right-0
                z-10
                bg-[#0050FF]
                px-2
                py-2
                text-center
              "
            >
              <span className="font-brown-bold text-[10px] uppercase tracking-[0.08em] text-white sm:text-xs">
                Winner
              </span>
            </div>
          )}
        </div>

        {/* INFORMATION */}

        <div
          className="
            relative
            bg-white
            px-2
            pb-3
            pt-3
            transition-colors
            duration-200
            group-hover:bg-[#0050FF]/20
          "
        >
          <p className="font-brown-bold text-base leading-tight text-black sm:text-lg">
            {artistBased ? (
              <ArtistLink
                artist={title}
              />
            ) : (
              formatTitle(title)
            )}
          </p>

          {artist && (
            <p className="mt-1 font-brown-regular text-sm leading-tight text-black/55 sm:text-base">
              <ArtistCredit
                artistCredit={artist}
              />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * CATEGORY SECTION
 * ======================================================= */

function AwardCategorySection({
  category,
  artistImages,
  categoryRef,
}: {
  category: AwardCategory;
  artistImages: ArtistImage[];
  categoryRef?: (
    element: HTMLElement | null
  ) => void;
}) {
  return (
    <section
      ref={categoryRef}
      id={`award-${normalize(
        category.category
      ).replace(/\s+/g, '-')}`}
      className="border-b border-black/10"
    >
      <div className="px-0 py-6 sm:py-8">
        <h2 className="font-brown-bold text-2xl uppercase leading-none tracking-[-0.04em] sm:text-4xl">
          {category.category}
        </h2>
      </div>

      <div className="pb-10 sm:pb-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {category.nominees.map(
            (
              nominee,
              index
            ) => (
              <NomineeCard
                key={`${nominee.name}-${index}`}
                nominee={nominee}
                category={
                  category.category
                }
                artistImages={
                  artistImages
                }
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * WINNERS SECTION
 * ======================================================= */

function WinnersSection({
  categories,
  selectedYear,
}: {
  categories: AwardCategory[];
  selectedYear: string;
}) {
  const router = useRouter();

  function goToCategory(
    categoryName: string
  ) {
    const params =
      new URLSearchParams();

    params.set(
      'year',
      selectedYear
    );

    params.set(
      'category',
      categoryName
    );

    router.push(
      `/awards?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }

  return (
    <section className="mt-16 sm:mt-20">

      {/* WINNERS HEADER */}

      <div className="border-y border-black/10 py-6 text-center sm:py-8">
        <h2 className="font-brown-bold text-3xl uppercase leading-none tracking-[-0.04em] sm:text-5xl">
          Winners
        </h2>
      </div>

      {/* WINNERS LIST */}

      <div>
        {categories.map(
          (category) => {
            const winner =
              category.nominees.find(
                (nominee) =>
                  nominee.winner
              );

            if (!winner) {
              return null;
            }

            const artistBased =
              isArtistBasedCategory(
                category.category
              );

            const winnerArtist =
              artistBased
                ? cleanWinnerMarker(
                    winner.name
                  )
                : getNomineeArtists(
                    winner.name
                  );

            const winnerTitle =
              artistBased
                ? cleanWinnerMarker(
                    winner.name
                  )
                : getNomineeTitle(
                    winner.name
                  );

            return (
              <div
                key={
                  category.category
                }
                className="
                  grid
                  grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]
                  items-center
                  gap-3
                  border-b
                  border-black/10
                  px-2
                  py-5
                  sm:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_120px]
                  sm:px-6
                  sm:py-6
                "
              >

                {/* CATEGORY */}

                <p className="font-brown-bold text-xs uppercase leading-tight sm:text-base">
                  {category.category}
                </p>

                {/* WINNER ARTIST */}

                <p className="font-brown-regular text-sm leading-tight text-black sm:text-base">
                  <ArtistCredit
                    artistCredit={
                      winnerArtist
                    }
                  />
                </p>

                {/* WINNER TITLE */}

                <p className="font-brown-bold text-sm leading-tight sm:text-base">
                  {artistBased ? (
                    <ArtistLink
                      artist={
                        winnerTitle
                      }
                    />
                  ) : (
                    formatTitle(
                      winnerTitle
                    )
                  )}
                </p>

                {/* ALL NOMINEES */}

                <button
                  type="button"
                  onClick={() =>
                    goToCategory(
                      category.category
                    )
                  }
                  className="
                    whitespace-nowrap
                    font-brown-bold
                    text-[10px]
                    uppercase
                    tracking-[0.05em]
                    text-[#0050FF]
                    transition-opacity
                    hover:opacity-60
                    sm:text-xs
                  "
                >
                  All Nominees →
                </button>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

/* =========================================================
 * ORDINAL
 * ======================================================= */

function getOrdinal(
  number: number
): string {
  const mod100 =
    number % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return `${number}th`;
  }

  switch (
    number % 10
  ) {
    case 1:
      return `${number}st`;

    case 2:
      return `${number}nd`;

    case 3:
      return `${number}rd`;

    default:
      return `${number}th`;
  }
}

/* =========================================================
 * PAGE
 * ======================================================= */

export default function AwardsPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  /*
   * Read the requested year/category from the URL.
   */

  const urlYear =
    searchParams.get(
      'year'
    );

  const urlCategory =
    searchParams.get(
      'category'
    );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    urlYear ?? '2025'
  );

  const [
    categories,
    setCategories,
  ] = useState<AwardCategory[]>(
    []
  );

  const [
    artistImages,
    setArtistImages,
  ] = useState<ArtistImage[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(false);

  const [
    showBackToTop,
    setShowBackToTop,
  ] = useState(false);

  /*
   * Used to prevent automatic category scroll from
   * happening before categories have finished loading.
   */

  const categoryScrollPending =
    useRef(
      Boolean(urlCategory)
    );

  /* =======================================================
   * YEARS
   * ===================================================== */

  const years = useMemo(
    () => [
      '2025',
      '2024',
      '2023',
      '2022',
      '2021',
      '2020',
      '2019',
      '2018',
      '2017',
      '2016',
      '2015',
      '2014',
      '2013',
      '2012',
      '2011',
      '2010',
      '2009',
    ],
    []
  );

  /* =======================================================
   * SYNC URL YEAR
   * ===================================================== */

  useEffect(() => {
    if (
      urlYear &&
      years.includes(urlYear)
    ) {
      setSelectedYear(
        urlYear
      );

      categoryScrollPending.current =
        Boolean(urlCategory);
    }
  }, [
    urlYear,
    urlCategory,
    years,
  ]);

  /* =======================================================
   * BACK TO TOP VISIBILITY
   * ===================================================== */

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(
        window.scrollY > 400
      );
    }

    handleScroll();

    window.addEventListener(
      'scroll',
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );
    };
  }, []);

  /* =======================================================
   * YEAR SELECTOR
   * ===================================================== */

  const [
    yearStartIndex,
    setYearStartIndex,
  ] = useState(0);

  const visibleYears =
    years.slice(
      yearStartIndex,
      yearStartIndex + 5
    );

  const canMoveLeft =
    yearStartIndex > 0;

  const canMoveRight =
    yearStartIndex <
    years.length - 5;

  function moveYearsLeft() {
    setYearStartIndex(
      (current) => {
        if (current <= 0) {
          return 0;
        }

        return current - 1;
      }
    );
  }

  function moveYearsRight() {
    setYearStartIndex(
      (current) => {
        const maxStart =
          years.length - 5;

        if (
          current >=
          maxStart
        ) {
          return maxStart;
        }

        return current + 1;
      }
    );
  }

  function selectYear(
    year: string
  ) {
    setSelectedYear(year);

    router.push(
      `/awards?year=${encodeURIComponent(
        year
      )}`,
      {
        scroll: false,
      }
    );
  }

  /* =======================================================
   * LOAD DATA
   * ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(false);

        console.log(
          `[AWARDS] Loading data for ${selectedYear}...`
        );

        /* =================================================
         * LOAD NOMINEES
         * ================================================= */

        const nomineesResponse =
          await fetch(
            `${NOMINEES_CSV_URL}&_=${Date.now()}`,
            {
              cache: 'no-store',
            }
          );

        if (!nomineesResponse.ok) {
          throw new Error(
            `Nominees CSV failed: ${nomineesResponse.status}`
          );
        }

        const nomineesCSV =
          await nomineesResponse.text();

        if (
          !nomineesCSV.trim()
        ) {
          throw new Error(
            'Nominees CSV is empty'
          );
        }

        console.log(
          `[AWARDS] Nominees CSV loaded: ${nomineesCSV.length} characters`
        );

        let parsedCategories =
          parseNominees(
            nomineesCSV,
            selectedYear
          );

        /* =================================================
         * LOAD ARTIST IMAGES
         * ================================================= */

        let parsedArtistImages:
          ArtistImage[] = [];

        try {
          const artistsResponse =
            await fetch(
              `${ARTISTS_CSV_URL}&_=${Date.now()}`,
              {
                cache: 'no-store',
              }
            );

          if (
            artistsResponse.ok
          ) {
            const artistsCSV =
              await artistsResponse.text();

            if (
              artistsCSV.trim()
            ) {
              parsedArtistImages =
                parseArtistImages(
                  artistsCSV
                );
            }
          } else {
            console.warn(
              `[AWARDS] Artist image CSV failed: ${artistsResponse.status}`
            );
          }
        } catch (
          artistError
        ) {
          console.warn(
            '[AWARDS] Artist image CSV could not be loaded:',
            artistError
          );
        }

        /* =================================================
         * SOUNDTRACK OF THE YEAR
         *
         * ONLY 2022 + 2023
         * ================================================= */

        if (
          selectedYear !== '2022' &&
          selectedYear !== '2023'
        ) {
          parsedCategories =
            parsedCategories.filter(
              (category) =>
                normalize(
                  category.category
                ) !==
                normalize(
                  SOUNDTRACK_CATEGORY
                )
            );
        }

        if (!cancelled) {
          setCategories(
            parsedCategories
          );

          setArtistImages(
            parsedArtistImages
          );

          console.log(
            `[AWARDS] ${selectedYear}: ${parsedCategories.length} categories`
          );
        }
      } catch (loadError) {
        console.error(
          '[AWARDS] Failed to load awards:',
          loadError
        );

        if (!cancelled) {
          setCategories([]);
          setArtistImages([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  /* =======================================================
   * KEEP SELECTED YEAR VISIBLE
   * ===================================================== */

  useEffect(() => {
    const selectedIndex =
      years.indexOf(
        selectedYear
      );

    if (
      selectedIndex === -1
    ) {
      return;
    }

    if (
      selectedIndex <
      yearStartIndex
    ) {
      setYearStartIndex(
        selectedIndex
      );
    } else if (
      selectedIndex >=
      yearStartIndex + 5
    ) {
      setYearStartIndex(
        Math.min(
          years.length - 5,
          selectedIndex - 4
        )
      );
    }
  }, [
    selectedYear,
    years,
    yearStartIndex,
  ]);

  /* =======================================================
   * SCROLL TO SELECTED CATEGORY
   * ===================================================== */

  useEffect(() => {
    if (
      loading ||
      error ||
      categories.length === 0 ||
      !urlCategory ||
      !categoryScrollPending.current
    ) {
      return;
    }

    const targetCategory =
      categories.find(
        (category) =>
          normalize(
            category.category
          ) ===
          normalize(
            urlCategory
          )
      );

    if (!targetCategory) {
      categoryScrollPending.current =
        false;

      return;
    }

    const timeout =
      window.setTimeout(() => {
        const id =
          `award-${normalize(
            targetCategory.category
          ).replace(
            /\s+/g,
            '-'
          )}`;

        const element =
          document.getElementById(
            id
          );

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }

        categoryScrollPending.current =
          false;
      }, 100);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    loading,
    error,
    categories,
    urlCategory,
  ]);

  /* =======================================================
   * ANNUAL NUMBER
   * ===================================================== */

  const annualNumber =
    Number(selectedYear) -
    2008;

  const annualLabel =
    `${getOrdinal(
      annualNumber
    )} Annual Elio Charts Awards`;

  /* =======================================================
   * BACK TO TOP
   * ===================================================== */

  function backToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /* =======================================================
   * RENDER
   * ===================================================== */

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">

        {/* =================================================
         * TITLE
         * ================================================= */}

        <header className="px-4 pb-7 pt-10 text-center sm:px-6 sm:pb-9 sm:pt-12">
          <h1 className="font-brown-bold text-[2.7rem] uppercase leading-[0.9] tracking-[-0.08em] sm:text-[5rem] lg:text-[6rem]">
            ELIO CHARTS AWARDS
          </h1>

          <p className="mt-5 font-brown-regular text-sm uppercase tracking-[0.08em] text-black/60 sm:text-base">
            {annualLabel}
          </p>
        </header>

        {/* =================================================
         * YEAR SELECTOR
         * ================================================= */}

        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-y border-black/10">
            <div className="flex items-center justify-center py-1">

              {/* LEFT ARROW */}

              <button
                type="button"
                aria-label="Previous years"
                onClick={
                  moveYearsLeft
                }
                disabled={
                  !canMoveLeft
                }
                className={`
                  flex
                  h-12
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  font-brown-bold
                  text-xl
                  transition-all
                  duration-150
                  sm:w-10
                  sm:text-2xl
                  ${
                    canMoveLeft
                      ? 'text-black hover:-translate-x-1 hover:text-[#0050FF]'
                      : 'cursor-default text-black/15'
                  }
                `}
              >
                ←
              </button>

              {/* YEARS */}

              <div className="min-w-0 overflow-hidden">
                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-5
                    px-2
                    py-4
                    sm:gap-8
                    sm:px-4
                  "
                >
                  {visibleYears.map(
                    (year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() =>
                          selectYear(
                            year
                          )
                        }
                        className={`
                          relative
                          shrink-0
                          px-1
                          py-1
                          font-brown-bold
                          text-sm
                          transition-all
                          duration-150
                          sm:text-base
                          ${
                            selectedYear ===
                            year
                              ? 'scale-110 text-[#0050FF]'
                              : 'text-black/35 hover:scale-105 hover:text-black'
                          }
                        `}
                      >
                        {year}

                        <span
                          className={`
                            absolute
                            bottom-[-2px]
                            left-0
                            h-[2px]
                            bg-[#0050FF]
                            transition-all
                            duration-200
                            ${
                              selectedYear ===
                              year
                                ? 'w-full opacity-100'
                                : 'w-0 opacity-0'
                            }
                          `}
                        />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* RIGHT ARROW */}

              <button
                type="button"
                aria-label="Next years"
                onClick={
                  moveYearsRight
                }
                disabled={
                  !canMoveRight
                }
                className={`
                  flex
                  h-12
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  font-brown-bold
                  text-xl
                  transition-all
                  duration-150
                  sm:w-10
                  sm:text-2xl
                  ${
                    canMoveRight
                      ? 'text-black hover:translate-x-1 hover:text-[#0050FF]'
                      : 'cursor-default text-black/15'
                  }
                `}
              >
                →
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
         * CONTENT
         * ================================================= */}

        <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">

          {/* LOADING */}

          {loading && (
            <div className="space-y-3">
              {Array.from({
                length: 6,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse bg-black/[0.05]"
                  />
                )
              )}
            </div>
          )}

          {/* ERROR */}

          {!loading &&
            error && (
              <div className="py-12 text-center">
                <p className="font-brown-regular text-xs uppercase tracking-[0.15em] text-black/40">
                  FAILED TO LOAD
                  AWARDS DATA
                </p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                  className="mt-4 font-brown-bold text-xs uppercase tracking-[0.1em] text-[#0050FF] hover:opacity-60"
                >
                  TRY AGAIN
                </button>
              </div>
            )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            categories.length ===
              0 && (
              <div className="py-12 text-center">
                <p className="font-brown-regular text-xs uppercase tracking-[0.15em] text-black/40">
                  NO AWARDS DATA
                  FOR{' '}
                  {selectedYear}
                </p>
              </div>
            )}

          {/* =================================================
           * AWARDS
           * ================================================= */}

          {!loading &&
            !error &&
            categories.length >
              0 && (
              <>
                {/* NOMINEE CATEGORIES */}

                <div className="border-t border-black/10">
                  {categories.map(
                    (
                      category
                    ) => (
                      <AwardCategorySection
                        key={
                          category.category
                        }
                        category={
                          category
                        }
                        artistImages={
                          artistImages
                        }
                      />
                    )
                  )}
                </div>

                {/* WINNERS */}

                <WinnersSection
                  categories={
                    categories
                  }
                  selectedYear={
                    selectedYear
                  }
                />
              </>
            )}
        </section>

        {/* =================================================
         * BACK TO TOP
         * ================================================= */}

        {showBackToTop && (
          <button
            type="button"
            aria-label="Back to top"
            onClick={
              backToTop
            }
            className="
              fixed
              bottom-5
              right-5
              z-50
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-[#0050FF]
              font-brown-bold
              text-lg
              leading-none
              text-white
              shadow-lg
              transition-transform
              duration-150
              hover:scale-105
              sm:bottom-7
              sm:right-7
              sm:h-12
              sm:w-12
            "
          >
            ↑
          </button>
        )}

        <div className="h-20 sm:h-28" />
      </div>
    </main>
  );
}