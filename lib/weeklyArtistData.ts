import Papa from 'papaparse';

import {
  SONGS_CSV_URL,
  HOT_100_CSV_URL,
} from './artistData';

export type WeeklyArtistEntry = {
  rank: number;
  artist: string;
  artwork?: string;

  points: number;

  lastWeekRank: number | null;

  movementIcon:
    | 'up'
    | 'down'
    | 'nonmover'
    | 'reentry'
    | 'debut';

  arrow:
    | 'NEW'
    | '▲'
    | '▼'
    | '→';

  /*
   * TRUE when:
   *
   * - artist moved up
   * - artist re-entered
   * - artist debuted
   * - OR artist's total points increased
   *   compared with the previous week
   */
  showBullet: boolean;

  peakPosition: number;
  weeksOnChart: number;
  songsOnChart: number;
  weeksAtNumberOne: number;
};

export type WeeklyArtistPayload = {
  week: string;
  displayWeek: string;
  availableWeeks: string[];

  entries: WeeklyArtistEntry[];

  entriesByWeek: Record<
    string,
    WeeklyArtistEntry[]
  >;
};

/* =========================================================
 * ARTISTS SHEET
 *
 * Column A = Artist
 * Column O = Artist Image
 *
 * IMPORTANT:
 * The weekly Artist Chart is NOT stored in this sheet.
 * The chart is calculated from the SONGS + HOT 100 sheets.
 *
 * Column O is ONLY used for artist artwork.
 * ======================================================= */

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

/*
 * Google Sheets column O = index 14
 *
 * A = 0
 * B = 1
 * C = 2
 * D = 3
 * E = 4
 * F = 5
 * G = 6
 * H = 7
 * I = 8
 * J = 9
 * K = 10
 * L = 11
 * M = 12
 * N = 13
 * O = 14
 */
const ARTIST_IMAGE_COLUMN_INDEX = 14;

/* =========================================================
 * TYPES
 * ======================================================= */

type Hot100Row = {
  week: string;
  rank: number;
  title: string;
  artistCredit: string;
  artwork?: string;
  points: number;
};

type SongRecord = {
  title: string;
  artistCredit: string;
  artists: string[];
};

type ArtistRecord = {
  artist: string;
  artwork?: string;
};

/* =========================================================
 * NORMALIZATION
 * ======================================================= */

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/* =========================================================
 * SONG KEY
 * ======================================================= */

function songKey(
  title: string,
  artist: string
): string {
  return (
    `${normalize(title)}|||` +
    normalize(artist)
  );
}

/* =========================================================
 * DATE
 * ======================================================= */

function parseDate(value: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  const parts = trimmed
    .split('/')
    .map(Number);

  if (parts.length !== 3) {
    return 0;
  }

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year)
  ) {
    return 0;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : year < 100
        ? 1900 + year
        : year;

  return new Date(
    fullYear,
    month - 1,
    day
  ).getTime();
}

/* =========================================================
 * DATE LABEL
 * ======================================================= */

export function formatDateLabel(
  value: string
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'UNKNOWN';
  }

  const parts = trimmed
    .split('/')
    .map(Number);

  if (parts.length !== 3) {
    return value;
  }

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year)
  ) {
    return value;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : year < 100
        ? 1900 + year
        : year;

  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  if (
    month < 1 ||
    month > 12
  ) {
    return value;
  }

  return `WEEK OF ${months[month - 1]} ${day}, ${fullYear}`;
}

/* =========================================================
 * CACHE-BUSTED URL
 * ======================================================= */

function freshUrl(
  url: string
): string {
  const separator =
    url.includes('?')
      ? '&'
      : '?';

  return `${url}${separator}_=${Date.now()}`;
}

/* =========================================================
 * CSV FETCH
 * ======================================================= */

async function fetchCsv(
  url: string,
  label: string
): Promise<string> {
  if (!url) {
    throw new Error(
      `${label}: CSV URL is empty`
    );
  }

  console.log(
    `[weeklyArtistData] Loading ${label}...`
  );

  const response =
    await fetch(
      freshUrl(url),
      {
        cache: 'no-store',
      }
    );

  if (!response.ok) {
    throw new Error(
      `${label}: CSV request failed: HTTP ${response.status}`
    );
  }

  const text =
    await response.text();

  if (!text.trim()) {
    throw new Error(
      `${label}: CSV returned empty data`
    );
  }

  console.log(
    `[weeklyArtistData] ${label} loaded successfully`
  );

  return text;
}

/* =========================================================
 * SONGS SHEET
 *
 * Column B = Song title + artist credit
 * Column D = Artists involved in the song
 * ======================================================= */

async function fetchSongRecords(): Promise<
  SongRecord[]
> {
  const csv =
    await fetchCsv(
      SONGS_CSV_URL,
      'SONGS'
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const songs: SongRecord[] = [];

  for (
    const row of parsed.data
  ) {
    const content =
      row[1]?.trim() ?? '';

    const artistField =
      row[3]?.trim() ?? '';

    if (
      !content ||
      !artistField
    ) {
      continue;
    }

    const parts =
      content
        .split(/\r?\n/)
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean);

    const title =
      parts[0] ?? '';

    const artistCredit =
      parts[1] ?? '';

    if (
      !title ||
      !artistCredit
    ) {
      continue;
    }

    const artists =
      artistField
        .split(',')
        .map(
          (artist) =>
            artist.trim()
        )
        .filter(Boolean);

    if (
      artists.length === 0
    ) {
      continue;
    }

    songs.push({
      title,
      artistCredit,
      artists,
    });
  }

  console.log(
    `[weeklyArtistData] Songs parsed: ${songs.length}`
  );

  return songs;
}

/* =========================================================
 * HOT 100 SHEET
 *
 * A = Week
 * B = Rank
 * C = Song / Artist
 * D = Points
 * K = Artwork
 * ======================================================= */

async function fetchHot100(): Promise<
  Hot100Row[]
> {
  const csv =
    await fetchCsv(
      HOT_100_CSV_URL,
      'HOT 100'
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const result: Hot100Row[] = [];

  for (
    const row of parsed.data
  ) {
    const week =
      row[0]?.trim() ?? '';

    const rank =
      Number(
        row[1]?.trim() ?? 0
      );

    const content =
      row[2]?.trim() ?? '';

    const points =
      Number(
        (row[3] ?? '')
          .replace(/,/g, '')
          .trim()
      );

    const artwork =
      row[10]?.trim() ?? '';

    if (
      !week ||
      rank <= 0 ||
      !content
    ) {
      continue;
    }

    const parts =
      content
        .split(/\r?\n/)
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean);

    const title =
      parts[0] ?? '';

    const artistCredit =
      parts[1] ?? '';

    if (
      !title ||
      !artistCredit
    ) {
      continue;
    }

    result.push({
      week,
      rank,
      title,
      artistCredit,
      artwork:
        artwork || undefined,
      points:
        Number.isFinite(points)
          ? points
          : 0,
    });
  }

  console.log(
    `[weeklyArtistData] Hot 100 rows parsed: ${result.length}`
  );

  return result;
}

/* =========================================================
 * ARTISTS SHEET
 *
 * Column A = Artist
 * Column O = Artist Image
 *
 * THIS DOES NOT PROVIDE THE WEEKLY CHART DATA.
 * It only provides the official artist name and image.
 * ======================================================= */

async function fetchArtistRecords(): Promise<
  ArtistRecord[]
> {
  const csv =
    await fetchCsv(
      ARTISTS_CSV_URL,
      'ARTISTS'
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const records: ArtistRecord[] =
    [];

  for (
    const row of parsed.data
  ) {
    /*
     * Column A
     */
    const artist =
      row[0]?.trim() ?? '';

    if (!artist) {
      continue;
    }

    /*
     * Ignore header.
     */
    const normalized =
      normalize(artist);

    if (
      normalized === 'artist' ||
      normalized === 'artists' ||
      normalized === 'artist name'
    ) {
      continue;
    }

    /*
     * Column O ONLY.
     */
    const artwork =
      row[
        ARTIST_IMAGE_COLUMN_INDEX
      ]?.trim() ?? '';

    records.push({
      artist,
      artwork:
        artwork || undefined,
    });
  }

  console.log(
    `[weeklyArtistData] Official artists parsed: ${records.length}`
  );

  console.log(
    `[weeklyArtistData] Artists with Column O images: ${
      records.filter(
        (record) =>
          Boolean(record.artwork)
      ).length
    }`
  );

  return records;
}

/* =========================================================
 * MOVEMENT
 * ======================================================= */

function getMovementIcon(
  currentRank: number,
  lastRank: number | null,
  hadPriorAppearance: boolean
): WeeklyArtistEntry['movementIcon'] {
  if (
    lastRank === null
  ) {
    return hadPriorAppearance
      ? 'reentry'
      : 'debut';
  }

  if (
    currentRank <
    lastRank
  ) {
    return 'up';
  }

  if (
    currentRank >
    lastRank
  ) {
    return 'down';
  }

  return 'nonmover';
}

function getArrow(
  currentRank: number,
  lastRank: number | null
): WeeklyArtistEntry['arrow'] {
  if (
    lastRank === null
  ) {
    return 'NEW';
  }

  if (
    currentRank <
    lastRank
  ) {
    return '▲';
  }

  if (
    currentRank >
    lastRank
  ) {
    return '▼';
  }

  return '→';
}

/* =========================================================
 * BULLET
 *
 * The blue bullet appears when ANY of these are true:
 *
 * 1. Artist moved UP
 * 2. Artist RE-ENTERED
 * 3. Artist DEBUTED
 * 4. Artist's total points increased
 *
 * The points comparison is against the artist's
 * total points from the previous week.
 * ======================================================= */

function getShowBullet(
  movementIcon: WeeklyArtistEntry['movementIcon'],
  currentPoints: number,
  previousEntry:
    | WeeklyArtistEntry
    | undefined
): boolean {
  /*
   * Re-entry and debut always get a bullet.
   */
  if (
    movementIcon === 'reentry' ||
    movementIcon === 'debut'
  ) {
    return true;
  }

  /*
   * Moving up always gets a bullet.
   */
  if (
    movementIcon === 'up'
  ) {
    return true;
  }

  /*
   * If the artist was on the chart
   * the previous week, compare total
   * artist points.
   */
  if (
    previousEntry &&
    currentPoints >
      previousEntry.points
  ) {
    return true;
  }

  return false;
}

/* =========================================================
 * MAIN
 * ======================================================= */

export async function fetchWeeklyArtistData(
  selectedWeek?: string
): Promise<WeeklyArtistPayload> {
  const empty: WeeklyArtistPayload =
    {
      week: '',
      displayWeek: 'UNKNOWN',
      availableWeeks: [],
      entries: [],
      entriesByWeek: {},
    };

  try {
    /* =====================================================
     * LOAD ALL THREE DATA SOURCES
     * =================================================== */

    const [
      songs,
      hot100,
      artistRecords,
    ] =
      await Promise.all([
        fetchSongRecords(),
        fetchHot100(),
        fetchArtistRecords(),
      ]);

    console.log(
      '[weeklyArtistData] ==============================='
    );

    console.log(
      `[weeklyArtistData] Songs: ${songs.length}`
    );

    console.log(
      `[weeklyArtistData] Hot 100 rows: ${hot100.length}`
    );

    console.log(
      `[weeklyArtistData] Official artists: ${artistRecords.length}`
    );

    console.log(
      '[weeklyArtistData] ==============================='
    );

    if (
      songs.length === 0
    ) {
      throw new Error(
        'SONGS sheet returned zero usable songs.'
      );
    }

    if (
      hot100.length === 0
    ) {
      throw new Error(
        'HOT 100 sheet returned zero usable rows.'
      );
    }

    if (
      artistRecords.length === 0
    ) {
      throw new Error(
        'ARTISTS sheet returned zero usable artists.'
      );
    }

    /* =====================================================
     * OFFICIAL ARTIST MAP
     * =================================================== */

    const officialArtistMap =
      new Map<
        string,
        {
          name: string;
          artwork?: string;
        }
      >();

    for (
      const record of artistRecords
    ) {
      officialArtistMap.set(
        normalize(
          record.artist
        ),
        {
          name:
            record.artist,
          artwork:
            record.artwork,
        }
      );
    }

    /* =====================================================
     * SONG LOOKUP
     * =================================================== */

    const songMap =
      new Map<
        string,
        SongRecord
      >();

    for (
      const song of songs
    ) {
      songMap.set(
        songKey(
          song.title,
          song.artistCredit
        ),
        song
      );
    }

    console.log(
      `[weeklyArtistData] Song lookup keys: ${songMap.size}`
    );

    /* =====================================================
     * GROUP HOT 100 BY WEEK
     * =================================================== */

    const groupedRows:
      Record<
        string,
        Hot100Row[]
      > = {};

    for (
      const row of hot100
    ) {
      if (
        !groupedRows[row.week]
      ) {
        groupedRows[
          row.week
        ] = [];
      }

      groupedRows[
        row.week
      ].push(row);
    }

    const availableWeeks =
      Object.keys(
        groupedRows
      ).sort(
        (a, b) =>
          parseDate(b) -
          parseDate(a)
      );

    console.log(
      `[weeklyArtistData] Available weeks: ${availableWeeks.length}`
    );

    if (
      availableWeeks.length === 0
    ) {
      throw new Error(
        'No valid chart weeks were found in the HOT 100 sheet.'
      );
    }

    /* =====================================================
     * SELECT WEEK
     * =================================================== */

    const week =
      selectedWeek &&
      groupedRows[
        selectedWeek
      ]
        ? selectedWeek
        : availableWeeks[0];

    console.log(
      `[weeklyArtistData] Selected week: ${week}`
    );

    /* =====================================================
     * BUILD ARTIST HISTORY
     * =================================================== */

    const artistHistory:
      Record<
        string,
        Record<
          string,
          {
            artist: string;
            points: number;
            songs: Hot100Row[];
          }
        >
      > = {};

    let matchedHot100Rows = 0;
    let unmatchedHot100Rows = 0;

    for (
      const row of hot100
    ) {
      const song =
        songMap.get(
          songKey(
            row.title,
            row.artistCredit
          )
        );

      if (!song) {
        unmatchedHot100Rows++;
        continue;
      }

      matchedHot100Rows++;

      for (
        const artist of
          song.artists
      ) {
        const key =
          normalize(artist);

        if (
          !artistHistory[key]
        ) {
          artistHistory[key] =
            {};
        }

        if (
          !artistHistory[key][
            row.week
          ]
        ) {
          artistHistory[key][
            row.week
          ] = {
            artist,
            points: 0,
            songs: [],
          };
        }

        artistHistory[key][
          row.week
        ].points +=
          row.points;

        artistHistory[key][
          row.week
        ].songs.push(row);
      }
    }

    console.log(
      `[weeklyArtistData] Matched Hot 100 rows: ${matchedHot100Rows}`
    );

    console.log(
      `[weeklyArtistData] Unmatched Hot 100 rows: ${unmatchedHot100Rows}`
    );

    console.log(
      `[weeklyArtistData] Artists with calculated history: ${
        Object.keys(
          artistHistory
        ).length
      }`
    );

    if (
      Object.keys(
        artistHistory
      ).length === 0
    ) {
      throw new Error(
        'No artist history could be created. The SONGS and HOT 100 song/artist formatting is not matching.'
      );
    }

    /* =====================================================
     * CHRONOLOGICAL WEEKS
     * =================================================== */

    const chronologicalWeeks =
      [
        ...availableWeeks,
      ].sort(
        (a, b) =>
          parseDate(a) -
          parseDate(b)
      );

    /* =====================================================
     * RESULTS
     * =================================================== */

    const entriesByWeek:
      Record<
        string,
        WeeklyArtistEntry[]
      > = {};

    /* =====================================================
     * ARTIST CHART CAREER HISTORY
     * =================================================== */

    const artistChartHistory:
      Record<
        string,
        {
          peak: number;
          weeks: number;
          weeksAtNumberOne: number;
        }
      > = {};

    /* =====================================================
     * BUILD EVERY WEEK
     * =================================================== */

    for (
      const currentWeek of
        chronologicalWeeks
    ) {
      const artistRows:
        Array<{
          artist: string;
          points: number;
          songs: Hot100Row[];
        }> = [];

      /* ===================================================
       * FIND ALL ARTISTS ACTIVE THIS WEEK
       * ================================================= */

      for (
        const key of Object.keys(
          artistHistory
        )
      ) {
        const data =
          artistHistory[key][
            currentWeek
          ];

        if (!data) {
          continue;
        }

        artistRows.push({
          artist:
            data.artist,
          points:
            data.points,
          songs:
            data.songs,
        });
      }

      /* ===================================================
       * SORT ARTISTS
       *
       * Primary:
       *     Artist points
       *
       * Tiebreaker:
       *     Best individual Hot 100 rank
       * ================================================= */

      artistRows.sort(
        (a, b) => {
          if (
            b.points !==
            a.points
          ) {
            return (
              b.points -
              a.points
            );
          }

          const bestA =
            Math.min(
              ...a.songs.map(
                (song) =>
                  song.rank
              )
            );

          const bestB =
            Math.min(
              ...b.songs.map(
                (song) =>
                  song.rank
              )
            );

          return (
            bestA -
            bestB
          );
        }
      );

      /* ===================================================
       * TOP 20
       * ================================================= */

      const top20 =
        artistRows.slice(
          0,
          20
        );

      /* ===================================================
       * PREVIOUS WEEK
       * ================================================= */

      const previousIndex =
        chronologicalWeeks.indexOf(
          currentWeek
        ) - 1;

      const previousWeek =
        previousIndex >= 0
          ? chronologicalWeeks[
              previousIndex
            ]
          : null;

      const previousEntries =
        previousWeek
          ? entriesByWeek[
              previousWeek
            ] ?? []
          : [];

      /* ===================================================
       * CREATE WEEKLY ENTRIES
       * ================================================= */

      const currentEntries =
        top20.map(
          (
            artistRow,
            index
          ) => {
            const rank =
              index + 1;

            const key =
              normalize(
                artistRow.artist
              );

            /*
             * Find previous week's
             * entry for this artist.
             *
             * This gives us BOTH:
             *
             * - previous rank
             * - previous total points
             */
            const previousEntry =
              previousEntries.find(
                (
                  entry
                ) =>
                  normalize(
                    entry.artist
                  ) === key
              );

            const lastWeekRank =
              previousEntry
                ?.rank ?? null;

            /*
             * Previous career history.
             */
            const history =
              artistChartHistory[
                key
              ];

            const hadPriorAppearance =
              Boolean(
                history &&
                history.weeks >
                  0
              );

            /*
             * Peak position.
             */
            const peak =
              history
                ? Math.min(
                    history.peak,
                    rank
                  )
                : rank;

            /*
             * Weeks on Artist Chart.
             */
            const weeks =
              history
                ? history.weeks +
                  1
                : 1;

            /*
             * Weeks at #1.
             */
            const weeksAtNumberOne =
              history
                ? history.weeksAtNumberOne +
                  (rank === 1
                    ? 1
                    : 0)
                : rank === 1
                  ? 1
                  : 0;

            /*
             * Save updated history.
             */
            artistChartHistory[
              key
            ] = {
              peak,
              weeks,
              weeksAtNumberOne,
            };

            /*
             * Official artist information
             * from Artists sheet.
             */
            const officialArtist =
              officialArtistMap.get(
                key
              );

            /*
             * Movement icon.
             */
            const movementIcon =
              getMovementIcon(
                rank,
                lastWeekRank,
                hadPriorAppearance
              );

            /*
             * Bullet.
             *
             * This now checks both
             * movement AND total points.
             */
            const showBullet =
              getShowBullet(
                movementIcon,
                artistRow.points,
                previousEntry
              );

            return {
              rank,

              /*
               * Prefer exact official
               * artist name from Column A.
               */
              artist:
                officialArtist?.name ??
                artistRow.artist,

              /*
               * Column O artwork ONLY.
               */
              artwork:
                officialArtist?.artwork,

              /*
               * Calculated artist points.
               */
              points:
                artistRow.points,

              /*
               * Previous week's position.
               */
              lastWeekRank,

              /*
               * Movement.
               */
              movementIcon,

              /*
               * Arrow.
               */
              arrow:
                getArrow(
                  rank,
                  lastWeekRank
                ),

              /*
               * Blue bullet.
               */
              showBullet,

              /*
               * Career statistics.
               */
              peakPosition:
                peak,

              weeksOnChart:
                weeks,

              songsOnChart:
                artistRow.songs
                  .length,

              weeksAtNumberOne,
            };
          }
        );

      entriesByWeek[
        currentWeek
      ] =
        currentEntries;
    }

    /* =====================================================
     * FINAL VALIDATION
     * =================================================== */

    const selectedEntries =
      entriesByWeek[
        week
      ] ?? [];

    console.log(
      `[weeklyArtistData] Selected week entries: ${selectedEntries.length}`
    );

    if (
      selectedEntries.length === 0
    ) {
      throw new Error(
        `Artist chart calculation completed, but no artists were available for ${week}.`
      );
    }

    /* =====================================================
     * RETURN
     * =================================================== */

    return {
      week,

      displayWeek:
        formatDateLabel(
          week
        ),

      availableWeeks,

      entries:
        selectedEntries,

      entriesByWeek,
    };
  } catch (error) {
    /*
     * IMPORTANT:
     *
     * We still return the expected payload shape so
     * the page does not crash.
     *
     * BUT we log the complete error above so the
     * terminal shows the actual reason instead of
     * leaving us guessing.
     */
    console.error(
      '[weeklyArtistData] FAILED:',
      error
    );

    return empty;
  }
}