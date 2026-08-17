import Papa from 'papaparse';

export const ARTISTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=397544544&single=true&output=csv';

export const SONGS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1237780394&single=true&output=csv';

export const HOT_100_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=2098313277&single=true&output=csv';

export type ArtistSong = {
  title: string;
  artistCredit: string;
  artwork?: string;
  peak: number;
  debutDate: string;
  peakDate: string;
  weeksOnChart: number;
  weeksAtPeak: number;
};

export type ArtistHistory = {
  artist: string;
  songs: ArtistSong[];
  numberOneHits: number;
  top10Hits: number;
  top40Hits: number;
  entries: number;
};

type Hot100Row = {
  week: string;
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
};

type SongRecord = {
  title: string;
  artistCredit: string;
  artists: string[];
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseDate(value: string): number {
  const parts = value
    .split('/')
    .map(Number);

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  if (
    !month ||
    !day ||
    year === undefined
  ) {
    return 0;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  return new Date(
    fullYear,
    month - 1,
    day
  ).getTime();
}

function getFreshUrl(
  url: string
): string {
  const separator =
    url.includes('?')
      ? '&'
      : '?';

  return `${url}${separator}_=${Date.now()}`;
}

async function fetchCsv(
  url: string
): Promise<string> {
  const response = await fetch(
    getFreshUrl(url),
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      `CSV request failed: ${response.status}`
    );
  }

  const text =
    await response.text();

  if (!text.trim()) {
    throw new Error(
      'CSV returned empty data'
    );
  }

  return text;
}

/*
 * ARTISTS SHEET
 *
 * Data starts at A3.
 *
 * A1 and A2 are intentionally ignored.
 */
export async function fetchArtists(): Promise<
  string[]
> {
  const csv =
    await fetchCsv(
      ARTISTS_CSV_URL
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const rows =
    parsed.data;

  const artists =
    rows
      .slice(2)
      .map(
        (row) =>
          row[0]?.trim() ?? ''
      )
      .filter(Boolean);

  return Array.from(
    new Set(artists)
  );
}

/*
 * SONGS SHEET
 *
 * Data starts at row 2.
 *
 * Column B = song title + original
 *            artist credit
 *
 * Column D = comma-separated artists
 *
 * Example:
 *
 * Katy Perry, Snoop Dogg
 *
 * This means the song belongs to
 * BOTH Katy Perry and Snoop Dogg.
 */
async function fetchSongRecords(): Promise<
  SongRecord[]
> {
  const csv =
    await fetchCsv(
      SONGS_CSV_URL
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const rows =
    parsed.data;

  const songs: SongRecord[] =
    [];

  for (
    const row of rows.slice(1)
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

/*
 * HOT 100
 *
 * Uses the existing weekly chart CSV.
 */
async function fetchHot100(): Promise<
  Hot100Row[]
> {
  const csv =
    await fetchCsv(
      HOT_100_CSV_URL
    );

  const parsed =
    Papa.parse<string[]>(
      csv,
      {
        header: false,
        skipEmptyLines: true,
      }
    );

  const rows =
    parsed.data;

  const result: Hot100Row[] =
    [];

  for (
    const row of rows
  ) {
    const week =
      row[0]?.trim() ?? '';

    const rank =
      Number(
        row[1]?.trim() ?? 0
      );

    const content =
      row[2]?.trim() ?? '';

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

    if (!title) {
      continue;
    }

    result.push({
      week,
      rank,
      title,
      artist,
      artwork:
        artwork || undefined,
    });
  }

  return result;
}

function sameSong(
  chartRow: Hot100Row,
  song: SongRecord
): boolean {
  return (
    normalize(
      chartRow.title
    ) ===
      normalize(
        song.title
      ) &&
    normalize(
      chartRow.artist
    ) ===
      normalize(
        song.artistCredit
      )
  );
}

function calculateSongStats(
  song: SongRecord,
  hot100: Hot100Row[]
): ArtistSong | null {
  const history =
    hot100.filter(
      (row) =>
        sameSong(row, song)
    );

  if (
    history.length === 0
  ) {
    return null;
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

  const debutDate =
    history[0].week;

  const peakDate =
    peakRows[0].week;

  const weeksAtPeak =
    peakRows.length;

  return {
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
    debutDate,
    peakDate,
    weeksOnChart:
      history.length,
    weeksAtPeak,
  };
}

export async function fetchArtistHistory(
  artistName: string
): Promise<ArtistHistory> {
  const normalizedArtist =
    normalize(
      artistName
    );

  if (
    !normalizedArtist
  ) {
    return {
      artist: artistName,
      songs: [],
      numberOneHits: 0,
      top10Hits: 0,
      top40Hits: 0,
      entries: 0,
    };
  }

  const [
    artists,
    songs,
    hot100,
  ] = await Promise.all([
    fetchArtists(),
    fetchSongRecords(),
    fetchHot100(),
  ]);

  /*
   * Make sure the requested artist
   * actually exists in the Artists
   * master list.
   */
  const officialArtist =
    artists.find(
      (artist) =>
        normalize(
          artist
        ) ===
        normalizedArtist
    );

  if (!officialArtist) {
    return {
      artist: artistName,
      songs: [],
      numberOneHits: 0,
      top10Hits: 0,
      top40Hits: 0,
      entries: 0,
    };
  }

  /*
   * Column D is the authoritative
   * artist-credit field.
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

  const calculatedSongs =
    artistSongs
      .map(
        (song) =>
          calculateSongStats(
            song,
            hot100
          )
      )
      .filter(
        (
          song
        ): song is ArtistSong =>
          song !== null
      );

  /*
   * Sort:
   *
   * 1. Best peak
   * 2. Most weeks at that peak
   * 3. Earlier peak date
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
   * Artist totals.
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

  return {
    artist:
      officialArtist,
    songs:
      calculatedSongs,
    numberOneHits,
    top10Hits,
    top40Hits,
    entries:
      calculatedSongs.length,
  };
}