
import Papa from 'papaparse';

import {
  SONGS_CSV_URL,
  HOT_100_CSV_URL,
} from './artistData';

export type WeeklyArtistEntry = {
  week: string;

  chartHistory: Array<{
    week: string;
    rank: number;
  }>;

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
 * ======================================================= */

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

const ARTIST_IMAGE_COLUMN_INDEX = 14;

/* =========================================================
 * TOP RECORDS SHEET
 *
 * A = Week
 * B = Rank
 * C = Album Title
 * D = Units
 * E = Artists
 * ======================================================= */

const TOP_RECORDS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hwXa1A9lpc8dti9kcnUK3p_pYmL4JmyHtAaPPL6S3s4/export?format=csv&gid=709193280';

const TOP_RECORDS_START_DATE = '11/5/26';

/* =========================================================
 * NEW ARTIST CHART METHODOLOGY
 *
 * Effective November 5, 2026 onward.
 *
 * Hot 100 performance = 50 points
 * Albums performance = 50 points
 *
 * Within each category:
 * Best entry = 70%
 * Remaining entries = 30%
 *
 * Additional entries use diminishing weights:
 * 50%, 25%, 12.5%, 6.25%, etc.
 *
 * #1 Hot 100 song = +5
 * #1 album = +5
 * Both simultaneously = additional +5
 *
 * Maximum possible score = 115
 * ======================================================= */

const CATEGORY_MAX_SCORE = 50;

const BEST_ENTRY_WEIGHT = 0.70;
const REMAINING_ENTRIES_WEIGHT = 0.30;

const ADDITIONAL_ENTRY_DECAY = 0.50;

const NUMBER_ONE_SONG_BONUS = 5;
const NUMBER_ONE_ALBUM_BONUS = 5;
const DOUBLE_NUMBER_ONE_BONUS = 5;

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

type TopRecordsRow = {
  week: string;
  rank: number;
  title: string;
  units: number;
  artists: string[];
};

type AlbumEntry = {
  rank: number;
  title: string;
  units: number;
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
 * METHODOLOGY DATE CHECK
 * ======================================================= */

function usesNewMethodology(
  week: string
): boolean {
  return (
    parseDate(week) >=
    parseDate(TOP_RECORDS_START_DATE)
  );
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
    const errorText =
      await response.text();

    console.error(
      `[weeklyArtistData] ${label} HTTP ${response.status}:`,
      errorText
    );

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

  for (const row of parsed.data) {
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

  for (const row of parsed.data) {
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

  const records: ArtistRecord[] = [];

  for (const row of parsed.data) {
    const artist =
      row[0]?.trim() ?? '';

    if (!artist) {
      continue;
    }

    const normalized =
      normalize(artist);

    if (
      normalized === 'artist' ||
      normalized === 'artists' ||
      normalized === 'artist name'
    ) {
      continue;
    }

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
 * TOP RECORDS SHEET
 *
 * A = Week
 * B = Rank
 * C = Album Title
 * D = Units
 * E = Artists
 *
 * Only weeks beginning November 5, 2026 are included.
 * ======================================================= */

async function fetchTopRecords(): Promise<
  TopRecordsRow[]
> {
  const csv =
    await fetchCsv(
      TOP_RECORDS_CSV_URL,
      'TOP RECORDS'
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const result: TopRecordsRow[] = [];

  const startDate =
    parseDate(
      TOP_RECORDS_START_DATE
    );

  for (const row of parsed.data) {
    const week =
      row[0]?.trim() ?? '';

    const rank =
      Number(
        row[1]?.trim() ?? 0
      );

    const title =
      row[2]?.trim() ?? '';

    const units =
      Number(
        (row[3] ?? '')
          .replace(/,/g, '')
          .trim()
      );

    const artistField =
      row[4]?.trim() ?? '';

    if (
      !week ||
      parseDate(week) < startDate ||
      rank <= 0 ||
      !title ||
      !Number.isFinite(units) ||
      units <= 0 ||
      !artistField
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

    result.push({
      week,
      rank,
      title,
      units,
      artists,
    });
  }

  console.log(
    `[weeklyArtistData] Top Records rows parsed from ${TOP_RECORDS_START_DATE}: ${result.length}`
  );

  console.log(
    `[weeklyArtistData] #1 albums found: ${
      result.filter(
        (row) => row.rank === 1
      ).length
    }`
  );

  return result;
}

/* =========================================================
 * DIMINISHING ENTRY SCORE
 *
 * Best entry receives 70%.
 *
 * Remaining entries share 30%.
 * Their relative weights are:
 *
 * 50%, 25%, 12.5%, 6.25%, etc.
 *
 * If an artist has only one entry, that entry
 * receives its full value.
 * ======================================================= */

function calculateWeightedEntryScore(
  values: number[]
): number {
  const sorted =
    values
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      )
      .sort(
        (a, b) => b - a
      );

  if (sorted.length === 0) {
    return 0;
  }

  const bestEntry =
    sorted[0];

  if (sorted.length === 1) {
    return bestEntry;
  }

  const additionalEntries =
    sorted.slice(1);

  const weights =
    additionalEntries.map(
      (_, index) =>
        Math.pow(
          ADDITIONAL_ENTRY_DECAY,
          index
        )
    );

  const totalWeight =
    weights.reduce(
      (sum, weight) =>
        sum + weight,
      0
    );

  const weightedAdditionalScore =
    additionalEntries.reduce(
      (sum, value, index) =>
        sum +
        value *
          (
            weights[index] /
            totalWeight
          ),
      0
    );

  return (
    bestEntry *
      BEST_ENTRY_WEIGHT +
    weightedAdditionalScore *
      REMAINING_ENTRIES_WEIGHT
  );
}

/* =========================================================
 * CATEGORY NORMALIZATION
 *
 * The strongest artist in each category receives
 * the full 50 points available for that category.
 *
 * Every other artist receives a proportional score.
 * ======================================================= */

function normalizeCategoryScores(
  rawScores: number[]
): number[] {
  const maximum =
    Math.max(
      0,
      ...rawScores
    );

  if (maximum <= 0) {
    return rawScores.map(
      () => 0
    );
  }

  return rawScores.map(
    (score) =>
      (
        score /
        maximum
      ) *
      CATEGORY_MAX_SCORE
  );
}

/* =========================================================
 * NUMBER ONE BONUS
 * ======================================================= */

function calculateNumberOneBonus(
  songs: Hot100Row[],
  albums: AlbumEntry[]
): number {
  const hasNumberOneSong =
    songs.some(
      (song) =>
        song.rank === 1
    );

  const hasNumberOneAlbum =
    albums.some(
      (album) =>
        album.rank === 1
    );

  let bonus = 0;

  if (hasNumberOneSong) {
    bonus +=
      NUMBER_ONE_SONG_BONUS;
  }

  if (hasNumberOneAlbum) {
    bonus +=
      NUMBER_ONE_ALBUM_BONUS;
  }

  if (
    hasNumberOneSong &&
    hasNumberOneAlbum
  ) {
    bonus +=
      DOUBLE_NUMBER_ONE_BONUS;
  }

  return bonus;
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
 * ======================================================= */

function getShowBullet(
  movementIcon: WeeklyArtistEntry['movementIcon'],
  currentPoints: number,
  previousEntry:
    | WeeklyArtistEntry
    | undefined
): boolean {
  if (
    movementIcon === 'reentry' ||
    movementIcon === 'debut'
  ) {
    return true;
  }

  if (
    movementIcon === 'up'
  ) {
    return true;
  }

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
  const empty: WeeklyArtistPayload = {
    week: '',
    displayWeek: 'UNKNOWN',
    availableWeeks: [],
    entries: [],
    entriesByWeek: {},
  };

  try {
    /* =====================================================
     * LOAD ALL FOUR DATA SOURCES
     * =================================================== */

    const [
      songs,
      hot100,
      artistRecords,
      topRecords,
    ] = await Promise.all([
      fetchSongRecords(),
      fetchHot100(),
      fetchArtistRecords(),
      fetchTopRecords(),
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
      `[weeklyArtistData] Top Records rows: ${topRecords.length}`
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

    for (const record of artistRecords) {
      officialArtistMap.set(
        normalize(record.artist),
        {
          name: record.artist,
          artwork: record.artwork,
        }
      );
    }

    /* =====================================================
     * SONG LOOKUP
     * =================================================== */

    const songMap =
      new Map<string, SongRecord>();

    for (const song of songs) {
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
      Record<string, Hot100Row[]> = {};

    for (const row of hot100) {
      if (
        !groupedRows[row.week]
      ) {
        groupedRows[row.week] = [];
      }

      groupedRows[row.week].push(row);
    }

    const availableWeeks =
      Array.from(
        new Set([
          ...Object.keys(groupedRows),
          ...topRecords.map(
            (row) => row.week
          ),
        ])
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
        'No valid chart weeks were found in the HOT 100 or TOP RECORDS sheets.'
      );
    }

    /* =====================================================
     * SELECT WEEK
     * =================================================== */

    const week =
      selectedWeek &&
      availableWeeks.includes(
        selectedWeek
      )
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
            songs: Hot100Row[];
            albums: AlbumEntry[];
          }
        >
      > = {};

    let matchedHot100Rows = 0;
    let unmatchedHot100Rows = 0;

    /* =====================================================
     * ADD HOT 100 ENTRIES
     * =================================================== */

    for (const row of hot100) {
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

      for (const artist of song.artists) {
        const key =
          normalize(artist);

        if (!artistHistory[key]) {
          artistHistory[key] = {};
        }

        if (
          !artistHistory[key][row.week]
        ) {
          artistHistory[key][row.week] = {
            artist,
            songs: [],
            albums: [],
          };
        }

        artistHistory[key][row.week]
          .songs.push(row);
      }
    }

    console.log(
      `[weeklyArtistData] Matched Hot 100 rows: ${matchedHot100Rows}`
    );

    console.log(
      `[weeklyArtistData] Unmatched Hot 100 rows: ${unmatchedHot100Rows}`
    );

    /* =====================================================
     * ADD TOP RECORDS ENTRIES
     *
     * Each credited artist receives the full album entry.
     * =================================================== */

    for (const row of topRecords) {
      for (const artist of row.artists) {
        const key =
          normalize(artist);

        if (!artistHistory[key]) {
          artistHistory[key] = {};
        }

        if (
          !artistHistory[key][row.week]
        ) {
          artistHistory[key][row.week] = {
            artist,
            songs: [],
            albums: [],
          };
        }

        artistHistory[key][row.week]
          .albums.push({
            rank: row.rank,
            title: row.title,
            units: row.units,
          });
      }
    }

    console.log(
      `[weeklyArtistData] Artists with calculated history: ${
        Object.keys(artistHistory).length
      }`
    );

    if (
      Object.keys(artistHistory).length === 0
    ) {
      throw new Error(
        'No artist history could be created. The SONGS and HOT 100 song/artist formatting is not matching.'
      );
    }

    /* =====================================================
     * CHRONOLOGICAL WEEKS
     * =================================================== */

    const chronologicalWeeks = [
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
      Record<string, WeeklyArtistEntry[]> = {};

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
          chartHistory: Array<{
            week: string;
            rank: number;
          }>;
        }
      > = {};

    /* =====================================================
     * BUILD EVERY WEEK
     * =================================================== */

    for (const currentWeek of chronologicalWeeks) {
      const useNewScoring =
        usesNewMethodology(currentWeek);

      const weeklyArtistData:
        Array<{
          artist: string;
          songs: Hot100Row[];
          albums: AlbumEntry[];
          rawHot100Score: number;
          rawAlbumsScore: number;
          bestHot100Rank: number;
          bestAlbumRank: number;
        }> = [];

      /* ===================================================
       * COLLECT ACTIVE ARTISTS AND THEIR ENTRIES
       * ================================================= */

      for (const key of Object.keys(artistHistory)) {
        const data =
          artistHistory[key][currentWeek];

        if (!data) {
          continue;
        }

        const bestHot100Rank =
          data.songs.length > 0
            ? Math.min(
                ...data.songs.map(
                  (song) => song.rank
                )
              )
            : Number.POSITIVE_INFINITY;

        const bestAlbumRank =
          data.albums.length > 0
            ? Math.min(
                ...data.albums.map(
                  (album) => album.rank
                )
              )
            : Number.POSITIVE_INFINITY;

        weeklyArtistData.push({
          artist: data.artist,
          songs: data.songs,
          albums: data.albums,

          rawHot100Score:
            calculateWeightedEntryScore(
              data.songs.map(
                (song) => song.points
              )
            ),

          rawAlbumsScore:
            calculateWeightedEntryScore(
              data.albums.map(
                (album) => album.units
              )
            ),

          bestHot100Rank,
          bestAlbumRank,
        });
      }

      /* ===================================================
       * CALCULATE ARTIST SCORES
       *
       * BEFORE NOVEMBER 5, 2026:
       * Original methodology:
       * Hot 100 points + album units / 100 / 2
       *
       * NOVEMBER 5, 2026 ONWARD:
       * New weighted 50/50 methodology.
       * ================================================= */

      let artistRows:
        Array<{
          artist: string;
          points: number;
          songs: Hot100Row[];
          albums: AlbumEntry[];
          bestHot100Rank: number;
          bestAlbumRank: number;
        }>;

      if (useNewScoring) {
        /* ===============================================
         * NEW METHODOLOGY
         * ============================================= */

        const hot100Scores =
          normalizeCategoryScores(
            weeklyArtistData.map(
              (artist) =>
                artist.rawHot100Score
            )
          );

        const albumScores =
          normalizeCategoryScores(
            weeklyArtistData.map(
              (artist) =>
                artist.rawAlbumsScore
            )
          );

        artistRows =
          weeklyArtistData.map(
            (artist, index) => {
              const numberOneBonus =
                calculateNumberOneBonus(
                  artist.songs,
                  artist.albums
                );

              const finalScore =
                hot100Scores[index] +
                albumScores[index] +
                numberOneBonus;

              return {
                artist: artist.artist,
                points: finalScore,
                songs: artist.songs,
                albums: artist.albums,
                bestHot100Rank:
                  artist.bestHot100Rank,
                bestAlbumRank:
                  artist.bestAlbumRank,
              };
            }
          );
      } else {
        /* ===============================================
         * ORIGINAL METHODOLOGY
         *
         * This preserves historical scoring.
         * ============================================= */

        artistRows =
          weeklyArtistData.map(
            (artist) => {
              const hot100Points =
                artist.songs.reduce(
                  (sum, song) =>
                    sum + song.points,
                  0
                );

              const albumPoints =
                artist.albums.reduce(
                  (sum, album) =>
                    sum +
                    album.units / 100 / 2,
                  0
                );

              return {
                artist: artist.artist,

                points:
                  hot100Points +
                  albumPoints,

                songs: artist.songs,
                albums: artist.albums,

                bestHot100Rank:
                  artist.bestHot100Rank,

                bestAlbumRank:
                  artist.bestAlbumRank,
              };
            }
          );
      }

      /* ===================================================
       * SORT ARTISTS
       *
       * Primary:
       *     Artist Chart score
       *
       * Tiebreaker:
       *     Best Hot 100 rank
       *
       * New methodology only:
       *     Best album rank as second tiebreaker
       * ================================================= */

      artistRows.sort(
        (a, b) => {
          if (
            Math.abs(
              b.points - a.points
            ) > 0.000001
          ) {
            return (
              b.points -
              a.points
            );
          }

          if (
            a.bestHot100Rank !==
            b.bestHot100Rank
          ) {
            return (
              a.bestHot100Rank -
              b.bestHot100Rank
            );
          }

          if (useNewScoring) {
            return (
              a.bestAlbumRank -
              b.bestAlbumRank
            );
          }

          return 0;
        }
      );

      /* ===================================================
       * TOP 20
       * ================================================= */

      const top20 =
        artistRows.slice(0, 20);

      /* ===================================================
       * PREVIOUS WEEK
       * ================================================= */

      const previousIndex =
        chronologicalWeeks.indexOf(
          currentWeek
        ) - 1;

      const previousWeek =
        previousIndex >= 0
          ? chronologicalWeeks[previousIndex]
          : null;

      const previousEntries =
        previousWeek
          ? entriesByWeek[previousWeek] ?? []
          : [];

      /* ===================================================
       * CHECK WHETHER POINTS ARE COMPARABLE
       *
       * Do not compare old raw points against the new
       * normalized score during the transition week.
       * ================================================= */

      const canComparePreviousPoints =
        previousWeek !== null &&
        (
          usesNewMethodology(previousWeek) ===
          useNewScoring
        );

      /* ===================================================
       * CREATE WEEKLY ENTRIES
       * ================================================= */

      const currentEntries =
        top20.map(
          (artistRow, index) => {
            const rank = index + 1;

            const key =
              normalize(artistRow.artist);

            const previousEntry =
              previousEntries.find(
                (entry) =>
                  normalize(entry.artist) === key
              );

            const lastWeekRank =
              previousEntry?.rank ?? null;

            /* Previous career history */

            const history =
              artistChartHistory[key];

            const hadPriorAppearance =
              Boolean(
                history &&
                history.weeks > 0
              );

            /* Peak position */

            const peak =
              history
                ? Math.min(
                    history.peak,
                    rank
                  )
                : rank;

            /* Weeks on Artist Chart */

            const weeks =
              history
                ? history.weeks + 1
                : 1;

            /* Weeks at number one */

            const weeksAtNumberOne =
              history
                ? history.weeksAtNumberOne +
                  (rank === 1 ? 1 : 0)
                : rank === 1
                  ? 1
                  : 0;

            /* Complete chart history */

            const chartHistory = [
              ...(history?.chartHistory ?? []),
              {
                week: currentWeek,
                rank,
              },
            ];

            /* Save updated history */

            artistChartHistory[key] = {
              peak,
              weeks,
              weeksAtNumberOne,
              chartHistory,
            };

            /* Official artist information */

            const officialArtist =
              officialArtistMap.get(key);

            /* Movement */

            const movementIcon =
              getMovementIcon(
                rank,
                lastWeekRank,
                hadPriorAppearance
              );

            /* Blue bullet */

            const comparablePreviousEntry =
              canComparePreviousPoints
                ? previousEntry
                : undefined;

            const showBullet =
              getShowBullet(
                movementIcon,
                artistRow.points,
                comparablePreviousEntry
              );

            return {
              week: currentWeek,

              chartHistory,

              rank,

              artist:
                officialArtist?.name ??
                artistRow.artist,

              artwork:
                officialArtist?.artwork,

              points:
                artistRow.points,

              lastWeekRank,

              movementIcon,

              arrow:
                getArrow(
                  rank,
                  lastWeekRank
                ),

              showBullet,

              peakPosition:
                peak,

              weeksOnChart:
                weeks,

              songsOnChart:
                artistRow.songs.length,

              weeksAtNumberOne,
            };
          }
        );

      entriesByWeek[currentWeek] =
        currentEntries;
    }

    /* =====================================================
     * FINAL VALIDATION
     * =================================================== */

    const selectedEntries =
      entriesByWeek[week] ?? [];

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

    console.log(
      `[weeklyArtistData] Methodology for ${week}: ${
        usesNewMethodology(week)
          ? 'NEW 50/50 WEIGHTED SYSTEM'
          : 'ORIGINAL POINTS SYSTEM'
      }`
    );

    /* =====================================================
     * RETURN
     * =================================================== */

    return {
      week,

      displayWeek:
        formatDateLabel(week),

      availableWeeks,

      entries:
        selectedEntries,

      entriesByWeek,
    };
  } catch (error) {
    console.error(
      '[weeklyArtistData] FAILED:',
      error
    );

    return empty;
  }
}
