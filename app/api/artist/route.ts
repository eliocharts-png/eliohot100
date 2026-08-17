import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

const SONGS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1237780394&single=true&output=csv';

const HOT_100_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

type HistoryEntry = {
  week: string;
  rank: number;
  points: number;
  artwork?: string;
  title?: string;
  artist?: string;
};

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

type ArtistRecord = {
  name: string;
  image?: string;
};

type SongRecord = {
  title: string;
  artistCredit: string;
  artists: string[];
};

/* =========================================================
   NORMALIZATION
========================================================= */

function normalize(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/* =========================================================
   SONG KEY
========================================================= */

function songKey(
  title: string,
  artist: string
): string {
  return `${normalize(title)}|||${normalize(artist)}`;
}

/* =========================================================
   DATE
========================================================= */

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
   CSV FETCHING
========================================================= */

async function fetchCsv(
  url: string,
  label: string
): Promise<string> {
  console.log(
    `[ARTIST API] Loading ${label}...`
  );

  const response = await fetch(
    url,
    {
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `${label} CSV request failed: ${response.status}`
    );
  }

  const text =
    await response.text();

  if (!text.trim()) {
    throw new Error(
      `${label} CSV returned empty data`
    );
  }

  console.log(
    `[ARTIST API] ${label} loaded successfully`
  );

  return text;
}

/* =========================================================
   CACHED RAW CSV
========================================================= */

let artistsCsvCache:
  Promise<string> | null = null;

let songsCsvCache:
  Promise<string> | null = null;

let hot100CsvCache:
  Promise<string> | null = null;

function getArtistsCsv(): Promise<string> {
  if (!artistsCsvCache) {
    artistsCsvCache =
      fetchCsv(
        ARTISTS_CSV_URL,
        'Artists'
      ).catch((error) => {
        artistsCsvCache = null;
        throw error;
      });
  }

  return artistsCsvCache;
}

function getSongsCsv(): Promise<string> {
  if (!songsCsvCache) {
    songsCsvCache =
      fetchCsv(
        SONGS_CSV_URL,
        'Songs'
      ).catch((error) => {
        songsCsvCache = null;
        throw error;
      });
  }

  return songsCsvCache;
}

function getHot100Csv(): Promise<string> {
  if (!hot100CsvCache) {
    hot100CsvCache =
      fetchCsv(
        HOT_100_CSV_URL,
        'Hot 100'
      ).catch((error) => {
        hot100CsvCache = null;
        throw error;
      });
  }

  return hot100CsvCache;
}

/* =========================================================
   ARTISTS SHEET
   DATA STARTS AT ROW 3
   COLUMN A = ARTIST NAME
   COLUMN O = ARTIST IMAGE
========================================================= */

function parseArtists(
  csv: string
): ArtistRecord[] {
  const parsed =
    Papa.parse<string[]>(csv, {
      header: false,
      skipEmptyLines: false,
    });

  const artists: ArtistRecord[] = [];

  /*
   * Google Sheet:
   *
   * Row 1 = headers / title
   * Row 2 = secondary/header information
   * Row 3 onward = actual artist data
   *
   * Column A = index 0
   * Column O = index 14
   */

  for (
    let index = 2;
    index < parsed.data.length;
    index += 1
  ) {
    const row =
      parsed.data[index];

    if (!row) {
      continue;
    }

    const name =
      String(
        row[0] ?? ''
      )
        .replace(/^\uFEFF/, '')
        .trim();

    const image =
      String(
        row[14] ?? ''
      ).trim();

    if (!name) {
      continue;
    }

    artists.push({
      name,
      image:
        image || undefined,
    });
  }

  /*
   * Remove duplicate artist names while
   * preserving the first occurrence.
   */

  const uniqueArtists =
    new Map<
      string,
      ArtistRecord
    >();

  for (
    const artist of artists
  ) {
    const key =
      normalize(
        artist.name
      );

    if (!uniqueArtists.has(key)) {
      uniqueArtists.set(
        key,
        artist
      );
    }
  }

  const result =
    Array.from(
      uniqueArtists.values()
    );

  console.log(
    `[ARTIST API] Parsed ${result.length} artists from rows 3 onward`
  );

  if (result.length > 0) {
    console.log(
      `[ARTIST API] First artist: "${result[0].name}"`
    );
  }

  return result;
}

/* =========================================================
   CACHED PARSED ARTISTS
========================================================= */

let artistsCache:
  Promise<ArtistRecord[]> | null = null;

function getArtists(): Promise<ArtistRecord[]> {
  if (!artistsCache) {
    artistsCache =
      getArtistsCsv()
        .then(parseArtists)
        .catch((error) => {
          artistsCache = null;
          throw error;
        });
  }

  return artistsCache;
}

/* =========================================================
   SONG DATABASE
========================================================= */

function parseSongs(
  csv: string
): SongRecord[] {
  const parsed =
    Papa.parse<string[]>(csv, {
      header: false,
      skipEmptyLines: true,
    });

  const songs: SongRecord[] = [];

  for (
    const row of parsed.data.slice(1)
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

    if (!title) {
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

  return songs;
}

/* =========================================================
   CACHED PARSED SONGS
========================================================= */

let songsCache:
  Promise<SongRecord[]> | null = null;

function getSongs(): Promise<SongRecord[]> {
  if (!songsCache) {
    songsCache =
      getSongsCsv()
        .then(parseSongs)
        .catch((error) => {
          songsCache = null;
          throw error;
        });
  }

  return songsCache;
}

/* =========================================================
   HOT 100
========================================================= */

function parseHot100(
  csv: string
): HistoryEntry[] {
  const parsed =
    Papa.parse<string[]>(csv, {
      header: false,
      skipEmptyLines: true,
    });

  const history: HistoryEntry[] = [];

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

    const artist =
      parts[1] ?? '';

    if (
      !title ||
      !artist
    ) {
      continue;
    }

    history.push({
      week,
      rank,
      points:
        Number.isFinite(points)
          ? points
          : 0,
      artwork:
        artwork || undefined,
      title,
      artist,
    });
  }

  return history;
}

/* =========================================================
   CACHED HOT 100
========================================================= */

let hot100Cache:
  Promise<HistoryEntry[]> | null = null;

function getHot100(): Promise<HistoryEntry[]> {
  if (!hot100Cache) {
    hot100Cache =
      getHot100Csv()
        .then(parseHot100)
        .catch((error) => {
          hot100Cache = null;
          throw error;
        });
  }

  return hot100Cache;
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request
) {
  const startedAt =
    Date.now();

  try {
    const url =
      new URL(request.url);

    const requestedArtist =
      url.searchParams
        .get('name')
        ?.trim();

    /*
     * =====================================================
     * ARTIST SEARCH ENDPOINT
     *
     * /api/artist?search=...
     *
     * This is what the global search bar uses.
     * It ONLY loads the Artists sheet.
     * It does NOT calculate artist history.
     * =====================================================
     */

    const searchQuery =
      url.searchParams
        .get('search')
        ?.trim();

    if (
      searchQuery
    ) {
      const artists =
        await getArtists();

      const normalizedQuery =
        normalize(
          searchQuery
        );

      const results =
        artists
          .filter(
            (artist) =>
              normalize(
                artist.name
              ).includes(
                normalizedQuery
              )
          )
          .slice(
            0,
            20
          )
          .map(
            (artist) => ({
              name:
                artist.name,
              image:
                artist.image,
            })
          );

      console.log(
        `[ARTIST API] Search "${searchQuery}" → ${results.length} results`
      );

      return NextResponse.json(
        results,
        {
          headers: {
            'Cache-Control':
              'public, s-maxage=300, stale-while-revalidate=86400',
          },
        }
      );
    }

    /*
     * =====================================================
     * NORMAL ARTIST PAGE REQUEST
     * =====================================================
     */

    if (!requestedArtist) {
      return NextResponse.json(
        {
          error:
            'Missing artist name.',
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      `[ARTIST API] Request received: "${requestedArtist}"`
    );

    const normalizedArtist =
      normalize(
        requestedArtist
      );

    /*
     * LOAD ALL DATABASES
     */

    const [
      artists,
      songs,
      hot100,
    ] = await Promise.all([
      getArtists(),
      getSongs(),
      getHot100(),
    ]);

    console.log(
      `[ARTIST API] Databases ready — Artists: ${artists.length}, Songs: ${songs.length}, Hot 100: ${hot100.length}`
    );

    /*
     * FIND OFFICIAL ARTIST
     */

    const officialArtist =
      artists.find(
        (artist) =>
          normalize(
            artist.name
          ) ===
          normalizedArtist
      );

    if (!officialArtist) {
      console.warn(
        `[ARTIST API] Artist not found: "${requestedArtist}"`
      );

      return NextResponse.json(
        {
          error:
            'Artist not found.',
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      `[ARTIST API] Matched artist: "${officialArtist.name}"`
    );

    /*
     * FIND SONGS BELONGING TO ARTIST
     */

    const artistSongs =
      songs.filter(
        (song) =>
          song.artists.some(
            (artist) =>
              normalize(
                artist
              ) ===
              normalizedArtist
          )
      );

    console.log(
      `[ARTIST API] Found ${artistSongs.length} songs for "${officialArtist.name}"`
    );

    /*
     * CALCULATE HISTORY
     */

    const calculatedSongs:
      ArtistSong[] = [];

    let totalArtistPoints =
      0;

    for (
      const song of artistSongs
    ) {
      const targetKey =
        songKey(
          song.title,
          song.artistCredit
        );

      const history =
        hot100.filter(
          (row) =>
            row.title &&
            row.artist &&
            songKey(
              row.title,
              row.artist
            ) === targetKey
        );

      if (
        history.length === 0
      ) {
        continue;
      }

      history.sort(
        (a, b) =>
          parseDate(a.week) -
          parseDate(b.week)
      );

      const peak =
        history.reduce(
          (best, row) =>
            Math.min(
              best,
              row.rank
            ),
          history[0].rank
        );

      const peakRows =
        history.filter(
          (row) =>
            row.rank === peak
        );

      const songTotalPoints =
        history.reduce(
          (total, row) =>
            total + row.points,
          0
        );

      totalArtistPoints +=
        songTotalPoints;

      calculatedSongs.push({
        title:
          song.title,

        artistCredit:
          song.artistCredit,

        artwork:
          history.find(
            (row) =>
              row.artwork
          )?.artwork,

        peak,

        debutDate:
          history[0].week,

        peakDate:
          peakRows[0].week,

        weeksOnChart:
          history.length,

        weeksAtPeak:
          peakRows.length,

        totalPoints:
          songTotalPoints,
      });
    }

    /*
     * SORT SONGS
     */

    calculatedSongs.sort(
      (a, b) => {
        if (
          a.peak !==
          b.peak
        ) {
          return (
            a.peak -
            b.peak
          );
        }

        if (
          a.weeksAtPeak !==
          b.weeksAtPeak
        ) {
          return (
            b.weeksAtPeak -
            a.weeksAtPeak
          );
        }

        return (
          parseDate(
            a.peakDate
          ) -
          parseDate(
            b.peakDate
          )
        );
      }
    );

    /*
     * CAREER STATS
     */

    const numberOneHits =
      calculatedSongs.filter(
        (song) =>
          song.peak === 1
      ).length;

    const top10Hits =
      calculatedSongs.filter(
        (song) =>
          song.peak <= 10
      ).length;

    const top40Hits =
      calculatedSongs.filter(
        (song) =>
          song.peak <= 40
      ).length;

    /*
     * FINAL RESPONSE
     */

    const result:
      ArtistResponse = {
        artist:
          officialArtist.name,

        artistImage:
          officialArtist.image,

        songs:
          calculatedSongs,

        numberOneHits,

        top10Hits,

        top40Hits,

        entries:
          calculatedSongs.length,

        totalPoints:
          totalArtistPoints,
      };

    console.log(
      `[ARTIST API] SUCCESS "${officialArtist.name}" — ${calculatedSongs.length} entries — ${Date.now() - startedAt}ms`
    );

    return NextResponse.json(
      result,
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error(
      '[ARTIST API] FATAL ERROR:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        error:
          'Failed to load artist history.',
        details:
          message,
      },
      {
        status: 500,
      }
    );
  }
}