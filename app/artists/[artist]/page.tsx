
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ALBUM_DATABASE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hwXa1A9lpc8dti9kcnUK3p_pYmL4JmyHtAaPPL6S3s4/export?format=csv&gid=709193280';

const ALBUM_ARTWORK_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hwXa1A9lpc8dti9kcnUK3p_pYmL4JmyHtAaPPL6S3s4/export?format=csv&gid=1763528492';

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

type AlbumChartRow = {
  weekEnding: string;
  rank: number;
  title: string;
  units: number;
  artist: string;
};

type AlbumArtwork = {
  title: string;
  artist: string;
  artwork: string;
};

type ArtistAlbum = {
  title: string;
  artistCredit: string;
  artwork?: string;
  peak: number;
  debutDate: string;
  peakDate: string;
  weeksOnChart: number;
  weeksAtPeak: number;
  totalUnits: number;
};

type ChartType = 'HOT 100' | 'TOP RECORDS';

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

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

function parseSongCell(value: string): {
  title: string;
  artist: string;
} {
  const parts = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: parts[0] ?? '',
    artist: parts[1] ?? '',
  };
}

function parseAlbumDatabaseCSV(csv: string): AlbumChartRow[] {
  const rows = parseCSV(csv);

  return rows.slice(1).flatMap((row) => {
    const weekEnding = row[0]?.trim() ?? '';
    const rank = Number(row[1]);
    const title = row[2]?.trim() ?? '';
    const units = Number(
      (row[3] ?? '').replace(/,/g, '').replace(/[$]/g, '')
    );
    const artist = row[4]?.trim() ?? '';

    if (
      !weekEnding ||
      !Number.isFinite(rank) ||
      rank <= 0 ||
      !title ||
      !artist
    ) {
      return [];
    }

    return [
      {
        weekEnding,
        rank,
        title,
        units: Number.isFinite(units) ? units : 0,
        artist,
      },
    ];
  });
}

function parseAlbumArtworkCSV(csv: string): AlbumArtwork[] {
  const rows = parseCSV(csv);

  return rows.slice(1).flatMap((row) => {
    const combinedCell = row[1] ?? '';
    const artwork = row[2]?.trim() ?? '';

    if (!combinedCell || !artwork) {
      return [];
    }

    const parsed = parseSongCell(combinedCell);

    if (!parsed.title || !parsed.artist) {
      return [];
    }

    return [
      {
        title: parsed.title,
        artist: parsed.artist,
        artwork,
      },
    ];
  });
}

function artistMatches(
  chartArtist: string,
  requestedArtist: string
): boolean {
  const requested = normalize(requestedArtist);
  const chart = normalize(chartArtist);

  if (chart === requested) {
    return true;
  }

  return chart
    .split(
      /\s+(?:featuring|feat\.?|ft\.?|with)\s+|,\s*|\s+&\s+/i
    )
    .some((artist) => normalize(artist) === requested);
}

function getDateSortValue(value: string): number {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildArtistAlbums(
  rows: AlbumChartRow[],
  artworkRows: AlbumArtwork[],
  requestedArtist: string
): ArtistAlbum[] {
  const matchingRows = rows.filter((row) =>
    artistMatches(row.artist, requestedArtist)
  );

  const artworkMap = new Map<string, string>();

  for (const item of artworkRows) {
    const key = `${normalize(item.title)}|||${normalize(item.artist)}`;
    artworkMap.set(key, item.artwork);
  }

  const grouped = new Map<string, AlbumChartRow[]>();

  for (const row of matchingRows) {
    const key = normalize(row.title);
    const existing = grouped.get(key) ?? [];

    existing.push(row);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((albumRows) => {
      const chronologicalRows = [...albumRows].sort(
        (a, b) =>
          getDateSortValue(a.weekEnding) -
          getDateSortValue(b.weekEnding)
      );

      const peak = Math.min(...albumRows.map((row) => row.rank));

      const peakRows = chronologicalRows.filter(
        (row) => row.rank === peak
      );

      const firstRow = chronologicalRows[0];
      const peakRow = peakRows[0];

      const artworkKey = `${normalize(firstRow.title)}|||${normalize(
        firstRow.artist
      )}`;

      let artwork = artworkMap.get(artworkKey);

      if (!artwork) {
        const titleMatches = artworkRows.filter(
          (item) => normalize(item.title) === normalize(firstRow.title)
        );

        if (titleMatches.length === 1) {
          artwork = titleMatches[0].artwork;
        }
      }

      return {
        title: firstRow.title,
        artistCredit: firstRow.artist,
        artwork,
        peak,
        debutDate: firstRow.weekEnding,
        peakDate: peakRow?.weekEnding ?? firstRow.weekEnding,
        weeksOnChart: albumRows.length,
        weeksAtPeak: peakRows.length,
        totalUnits: albumRows.reduce(
          (total, row) => total + row.units,
          0
        ),
      };
    })
    .sort((a, b) => {
      if (a.peak !== b.peak) {
        return a.peak - b.peak;
      }

      if (a.weeksOnChart !== b.weeksOnChart) {
        return b.weeksOnChart - a.weeksOnChart;
      }

      return (
        getDateSortValue(a.peakDate) -
        getDateSortValue(b.peakDate)
      );
    });
}

function formatDate(value: string): string {
  return value;
}

function getWeeklyChartUrl(date: string): string {
  return `/weekly?week=${encodeURIComponent(date)}`;
}

function getAlbumChartUrl(date: string): string {
  return `/albums?week=${encodeURIComponent(date)}`;
}

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();

  const artistParam = Array.isArray(params.artist)
    ? params.artist[0]
    : params.artist;

  const artistName = decodeURIComponent(artistParam ?? '');

  const [data, setData] = useState<ArtistResponse | null>(null);
  const [albumRows, setAlbumRows] = useState<AlbumChartRow[]>([]);
  const [albumArtwork, setAlbumArtwork] = useState<AlbumArtwork[]>([]);

  const [loading, setLoading] = useState(true);
  const [albumLoading, setAlbumLoading] = useState(false);

  const [error, setError] = useState(false);
  const [albumError, setAlbumError] = useState(false);

  const [selectedChart, setSelectedChart] =
    useState<ChartType>('HOT 100');

  const [expandedEntry, setExpandedEntry] =
    useState<string | null>(null);

  useEffect(() => {
    if (!artistName) return;

    async function loadArtist() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(
          `/api/artist?name=${encodeURIComponent(artistName)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error(`Artist request failed: ${response.status}`);
        }

        const result = (await response.json()) as ArtistResponse;
        setData(result);
      } catch (loadError) {
        console.error('Failed to load artist:', loadError);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadArtist();
  }, [artistName]);

  useEffect(() => {
    if (selectedChart !== 'TOP RECORDS' || albumRows.length > 0) {
      return;
    }

    let cancelled = false;

    async function loadAlbumData() {
      try {
        setAlbumLoading(true);
        setAlbumError(false);

        const [databaseResponse, artworkResponse] = await Promise.all([
          fetch(`${ALBUM_DATABASE_CSV_URL}&_=${Date.now()}`, {
            cache: 'no-store',
          }),
          fetch(`${ALBUM_ARTWORK_CSV_URL}&_=${Date.now()}`, {
            cache: 'no-store',
          }),
        ]);

        if (!databaseResponse.ok || !artworkResponse.ok) {
          throw new Error('Unable to load album data');
        }

        const [databaseCSV, artworkCSV] = await Promise.all([
          databaseResponse.text(),
          artworkResponse.text(),
        ]);

        if (!databaseCSV.trim()) {
          throw new Error('Album Database CSV is empty');
        }

        const parsedRows = parseAlbumDatabaseCSV(databaseCSV);
        const parsedArtwork = parseAlbumArtworkCSV(artworkCSV);

        if (!cancelled) {
          setAlbumRows(parsedRows);
          setAlbumArtwork(parsedArtwork);
        }
      } catch (loadError) {
        console.error('Failed to load album data:', loadError);

        if (!cancelled) {
          setAlbumError(true);
        }
      } finally {
        if (!cancelled) {
          setAlbumLoading(false);
        }
      }
    }

    void loadAlbumData();

    return () => {
      cancelled = true;
    };
  }, [selectedChart, albumRows.length]);

  const sortedSongs = useMemo(() => {
    if (!data) return [];

    return [...data.songs].sort((a, b) => {
      if (a.peak !== b.peak) {
        return a.peak - b.peak;
      }

      if (a.peak === 1 && a.weeksAtPeak !== b.weeksAtPeak) {
        return b.weeksAtPeak - a.weeksAtPeak;
      }

      if (a.weeksOnChart !== b.weeksOnChart) {
        return b.weeksOnChart - a.weeksOnChart;
      }

      return a.peakDate.localeCompare(b.peakDate);
    });
  }, [data]);

  const artistAlbums = useMemo(() => {
    if (!data || albumRows.length === 0) return [];

    return buildArtistAlbums(
      albumRows,
      albumArtwork,
      data.artist
    );
  }, [albumRows, albumArtwork, data]);

  const albumStats = useMemo(
    () => ({
      numberOneAlbums: artistAlbums.filter(
        (album) => album.peak === 1
      ).length,
      top10Albums: artistAlbums.filter(
        (album) => album.peak <= 10
      ).length,
      top20Albums: artistAlbums.filter(
        (album) => album.peak <= 20
      ).length,
      top40Albums: artistAlbums.filter(
        (album) => album.peak <= 40
      ).length,
      totalAlbums: artistAlbums.length,
    }),
    [artistAlbums]
  );

  const handleChartChange = (chart: ChartType) => {
    setSelectedChart(chart);
    setExpandedEntry(null);
  };

  const crystalFont = {
    fontFamily: '"Crystal Ultra Condensed Bold", sans-serif',
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="h-[180px] w-[180px] animate-pulse bg-black/[0.07] sm:h-[220px] sm:w-[220px]" />

            <div className="w-full flex-1">
              <div className="h-5 w-32 animate-pulse bg-black/[0.08]" />
              <div className="mt-3 h-12 w-64 animate-pulse bg-black/[0.08]" />

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[65px] animate-pulse bg-[#0050FF]/30"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[70px] animate-pulse bg-black/[0.04]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
          <p className="font-brown-regular text-sm uppercase tracking-[0.18em] text-black/50">
            ARTIST NOT FOUND
          </p>
        </div>
      </main>
    );
  }

  const stats =
    selectedChart === 'HOT 100'
      ? [
          { label: '#1', value: data.numberOneHits },
          { label: 'TOP 10', value: data.top10Hits },
          {
            label: 'TOP 20',
            value: data.songs.filter((song) => song.peak <= 20).length,
          },
          { label: 'TOP 40', value: data.top40Hits },
          { label: 'ENTRIES', value: data.entries },
        ]
      : [
          { label: '#1', value: albumStats.numberOneAlbums },
          { label: 'TOP 10', value: albumStats.top10Albums },
          { label: 'TOP 20', value: albumStats.top20Albums },
          { label: 'TOP 40', value: albumStats.top40Albums },
          { label: 'ALBUMS', value: albumStats.totalAlbums },
        ];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* ARTIST HEADER */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* ARTIST IMAGE */}
          <div className="mx-auto w-[190px] shrink-0 sm:mx-0 sm:w-[220px]">
            <div className="aspect-square w-full overflow-hidden bg-black/[0.04]">
              {data.artistImage ? (
                <img
                  src={data.artistImage}
                  alt={data.artist}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/[0.04]">
                  <span className="font-brown-bold text-8xl uppercase text-black/15">
                    {data.artist.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ARTIST INFORMATION */}
          <div className="w-full min-w-0">
            {/* CHART SELECTOR */}
            <div className="mb-2 inline-flex border border-[#0050FF]">
              {(['HOT 100', 'TOP RECORDS'] as ChartType[]).map((chart) => (
                <button
                  key={chart}
                  type="button"
                  onClick={() => handleChartChange(chart)}
                  aria-pressed={selectedChart === chart}
                  className={`px-3 py-1.5 text-[17px] leading-none transition-colors sm:px-4 sm:py-2 sm:text-[19px] ${
                    selectedChart === chart
                      ? 'bg-[#0050FF] text-white'
                      : 'bg-black/[0.06] text-black/40 hover:bg-[#0050FF]/10 hover:text-[#0050FF]'
                  }`}
                  style={crystalFont}
                >
                  {chart}
                </button>
              ))}
            </div>

            {/* ARTIST NAME */}
            <h1
              className="break-words text-left text-[38px] uppercase leading-[0.9] text-[#0050FF] sm:text-[64px]"
              style={{
                ...crystalFont,
                letterSpacing: '0.055em',
              }}
            >
              {data.artist}
            </h1>

            {/* CAREER STATS */}
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-h-[62px] flex-col items-center justify-center bg-[#0050FF] px-1 py-2 sm:min-h-[76px]"
                >
                  <p className="font-brown-regular text-[8px] uppercase leading-none tracking-[0.04em] text-white sm:text-[10px]">
                    {stat.label}
                  </p>

                  <p className="mt-1.5 font-brown-bold text-xl leading-none text-white sm:text-2xl">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOT 100 SONG HISTORY */}
      {selectedChart === 'HOT 100' && (
        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
          {/* MOBILE HEADER */}
          <div className="bg-[#0050FF] px-3 py-2.5 sm:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_42px_42px_26px] items-center gap-2">
              <p className="font-brown-bold text-[9px] uppercase tracking-[0.08em] text-white">
                SONG
              </p>
              <p className="text-center font-brown-bold text-[8px] uppercase leading-none text-white">
                PEAK
              </p>
              <p className="text-center font-brown-bold text-[8px] uppercase leading-none text-white">
                WEEKS
              </p>
              <span />
            </div>
          </div>

          {/* DESKTOP HEADER */}
          <div className="hidden bg-[#0050FF] px-3 py-2.5 sm:block">
            <div className="grid grid-cols-[minmax(0,1fr)_65px_110px_110px_95px] items-center gap-2">
              <p className="font-brown-bold text-[11px] uppercase tracking-[0.08em] text-white">
                SONG
              </p>
              <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                PEAK
              </p>
              <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                DEBUT DATE
              </p>
              <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                PEAK DATE
              </p>
              <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                WEEKS ON CHART
              </p>
            </div>
          </div>

          {sortedSongs.map((song) => {
            const entryKey = `song:${song.title}|||${song.artistCredit}`;
            const isExpanded = expandedEntry === entryKey;

            return (
              <div
                key={`${song.title}|||${song.artistCredit}`}
                className="border-b border-black/10"
              >
                {/* MOBILE SONG ROW */}
                <div className="grid grid-cols-[minmax(0,1fr)_42px_42px_26px] items-center gap-2 px-3 py-3 sm:hidden">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {song.artwork ? (
                      <img
                        src={song.artwork}
                        alt=""
                        className="h-10 w-10 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 bg-black/[0.04]" />
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
                    <p className="font-brown-bold text-[15px] leading-none text-black">
                      {song.peak}
                    </p>

                    {song.peak === 1 && (
                      <span className="mt-1 whitespace-nowrap bg-[#0050FF] px-0.5 py-1 text-center font-brown-bold text-[7px] uppercase leading-none text-white">
                        {song.weeksAtPeak}{' '}
                        {song.weeksAtPeak === 1 ? 'WEEK' : 'WEEKS'}
                      </span>
                    )}
                  </div>

                  <p className="text-center font-brown-bold text-[15px] leading-none text-black">
                    {song.weeksOnChart}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEntry((current) =>
                        current === entryKey ? null : entryKey
                      )
                    }
                    aria-expanded={isExpanded}
                    aria-label="Show song debut and peak dates"
                    className="flex h-7 w-6 items-center justify-center font-brown-regular text-lg leading-none text-black/60"
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>

                {/* MOBILE SONG DETAILS */}
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-3 border-t border-black/10 bg-black/[0.025] px-3 py-3 sm:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(getWeeklyChartUrl(song.debutDate))
                      }
                      className="text-left"
                    >
                      <span className="block font-brown-regular text-[9px] uppercase tracking-[0.08em] text-black/40">
                        DEBUT DATE
                      </span>
                      <span className="mt-1 block font-brown-regular text-[11px] text-[#0050FF] underline underline-offset-2">
                        {formatDate(song.debutDate)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(getWeeklyChartUrl(song.peakDate))
                      }
                      className="text-left"
                    >
                      <span className="block font-brown-regular text-[9px] uppercase tracking-[0.08em] text-black/40">
                        PEAK DATE
                      </span>
                      <span className="mt-1 block font-brown-regular text-[11px] text-[#0050FF] underline underline-offset-2">
                        {formatDate(song.peakDate)}
                      </span>
                    </button>
                  </div>
                )}

                {/* DESKTOP SONG ROW */}
                <div className="hidden grid-cols-[minmax(0,1fr)_65px_110px_110px_95px] items-center gap-2 px-3 py-3 sm:grid">
                  <div className="flex min-w-0 items-center gap-3">
                    {song.artwork ? (
                      <img
                        src={song.artwork}
                        alt=""
                        className="h-12 w-12 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 bg-black/[0.04]" />
                    )}

                    <div className="min-w-0">
                      <p className="truncate font-brown-bold text-base leading-tight text-black">
                        {song.title}
                      </p>
                      <p className="mt-1 truncate font-brown-regular text-sm leading-tight text-[#0050FF]">
                        {song.artistCredit}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <p className="font-brown-bold text-lg leading-none text-black">
                      {song.peak}
                    </p>

                    {song.peak === 1 && (
                      <span className="mt-1.5 bg-[#0050FF] px-2 py-1 text-center font-brown-bold text-[9px] uppercase leading-none text-white">
                        {song.weeksAtPeak}{' '}
                        {song.weeksAtPeak === 1 ? 'WEEK' : 'WEEKS'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(getWeeklyChartUrl(song.debutDate))
                    }
                    className="text-center font-brown-regular text-sm leading-tight text-[#0050FF] underline decoration-[#0050FF]/40 underline-offset-2 hover:text-black"
                  >
                    {formatDate(song.debutDate)}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(getWeeklyChartUrl(song.peakDate))
                    }
                    className="text-center font-brown-regular text-sm leading-tight text-[#0050FF] underline decoration-[#0050FF]/40 underline-offset-2 hover:text-black"
                  >
                    {formatDate(song.peakDate)}
                  </button>

                  <p className="text-center font-brown-regular text-base leading-none text-black">
                    {song.weeksOnChart}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* TOP RECORDS ALBUM HISTORY */}
      {selectedChart === 'TOP RECORDS' && (
        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
          {albumLoading ? (
            <div className="bg-[#0050FF] px-3 py-4">
              <p className="font-brown-regular text-[11px] uppercase tracking-[0.12em] text-white">
                LOADING ALBUM HISTORY
              </p>
            </div>
          ) : albumError ? (
            <div className="border border-black/10 px-4 py-6">
              <p className="font-brown-bold text-sm uppercase text-black">
                UNABLE TO LOAD TOP RECORDS
              </p>
              <p className="mt-1 font-brown-regular text-xs text-black/50">
                Please try switching charts again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAlbumRows([]);
                  setAlbumArtwork([]);
                  setAlbumError(false);
                }}
                className="mt-3 font-brown-bold text-xs uppercase text-[#0050FF] underline underline-offset-2"
              >
                RETRY
              </button>
            </div>
          ) : (
            <>
              {/* MOBILE ALBUM HEADER */}
              <div className="bg-[#0050FF] px-3 py-2.5 sm:hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_42px_42px_26px] items-center gap-2">
                  <p className="font-brown-bold text-[9px] uppercase tracking-[0.08em] text-white">
                    ALBUM
                  </p>
                  <p className="text-center font-brown-bold text-[8px] uppercase leading-none text-white">
                    PEAK
                  </p>
                  <p className="text-center font-brown-bold text-[8px] uppercase leading-none text-white">
                    WEEKS
                  </p>
                  <span />
                </div>
              </div>

              {/* DESKTOP ALBUM HEADER */}
              <div className="hidden bg-[#0050FF] px-3 py-2.5 sm:block">
                <div className="grid grid-cols-[minmax(0,1fr)_65px_110px_110px_95px] items-center gap-2">
                  <p className="font-brown-bold text-[11px] uppercase tracking-[0.08em] text-white">
                    ALBUM
                  </p>
                  <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                    PEAK
                  </p>
                  <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                    DEBUT DATE
                  </p>
                  <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                    PEAK DATE
                  </p>
                  <p className="text-center font-brown-bold text-[10px] uppercase leading-none text-white">
                    WEEKS ON CHART
                  </p>
                </div>
              </div>

              {artistAlbums.length === 0 ? (
                <div className="border-b border-black/10 px-3 py-8 text-center">
                  <p className="font-brown-regular text-sm uppercase tracking-[0.1em] text-black/40">
                    NO ALBUM ENTRIES FOUND
                  </p>
                </div>
              ) : (
                artistAlbums.map((album) => {
                  const entryKey = `album:${normalize(album.title)}`;
                  const isExpanded = expandedEntry === entryKey;

                  return (
                    <div
                      key={normalize(album.title)}
                      className="border-b border-black/10"
                    >
                      {/* MOBILE ALBUM ROW */}
                      <div className="grid grid-cols-[minmax(0,1fr)_42px_42px_26px] items-center gap-2 px-3 py-3 sm:hidden">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {album.artwork ? (
                            <img
                              src={album.artwork}
                              alt=""
                              className="h-10 w-10 shrink-0 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 bg-black/[0.04]" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-brown-bold text-[12px] leading-tight text-black">
                              {album.title}
                            </p>
                            <p className="mt-0.5 truncate font-brown-regular text-[9px] leading-tight text-[#0050FF]">
                              {album.artistCredit}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <p className="font-brown-bold text-[15px] leading-none text-black">
                            {album.peak}
                          </p>

                          {album.peak === 1 && (
                            <span className="mt-1 whitespace-nowrap bg-[#0050FF] px-0.5 py-1 text-center font-brown-bold text-[7px] uppercase leading-none text-white">
                              {album.weeksAtPeak}{' '}
                              {album.weeksAtPeak === 1 ? 'WEEK' : 'WEEKS'}
                            </span>
                          )}
                        </div>

                        <p className="text-center font-brown-bold text-[15px] leading-none text-black">
                          {album.weeksOnChart}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEntry((current) =>
                              current === entryKey ? null : entryKey
                            )
                          }
                          aria-expanded={isExpanded}
                          aria-label="Show album debut and peak dates"
                          className="flex h-7 w-6 items-center justify-center font-brown-regular text-lg leading-none text-black/60"
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </div>

                      {/* MOBILE ALBUM DETAILS */}
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-3 border-t border-black/10 bg-black/[0.025] px-3 py-3 sm:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(getAlbumChartUrl(album.debutDate))
                            }
                            className="text-left"
                          >
                            <span className="block font-brown-regular text-[9px] uppercase tracking-[0.08em] text-black/40">
                              DEBUT DATE
                            </span>
                            <span className="mt-1 block font-brown-regular text-[11px] text-[#0050FF] underline underline-offset-2">
                              {formatDate(album.debutDate)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(getAlbumChartUrl(album.peakDate))
                            }
                            className="text-left"
                          >
                            <span className="block font-brown-regular text-[9px] uppercase tracking-[0.08em] text-black/40">
                              PEAK DATE
                            </span>
                            <span className="mt-1 block font-brown-regular text-[11px] text-[#0050FF] underline underline-offset-2">
                              {formatDate(album.peakDate)}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* DESKTOP ALBUM ROW */}
                      <div className="hidden grid-cols-[minmax(0,1fr)_65px_110px_110px_95px] items-center gap-2 px-3 py-3 sm:grid">
                        <div className="flex min-w-0 items-center gap-3">
                          {album.artwork ? (
                            <img
                              src={album.artwork}
                              alt=""
                              className="h-12 w-12 shrink-0 object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 shrink-0 bg-black/[0.04]" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-brown-bold text-base leading-tight text-black">
                              {album.title}
                            </p>
                            <p className="mt-1 truncate font-brown-regular text-sm leading-tight text-[#0050FF]">
                              {album.artistCredit}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <p className="font-brown-bold text-lg leading-none text-black">
                            {album.peak}
                          </p>

                          {album.peak === 1 && (
                            <span className="mt-1.5 bg-[#0050FF] px-2 py-1 text-center font-brown-bold text-[9px] uppercase leading-none text-white">
                              {album.weeksAtPeak}{' '}
                              {album.weeksAtPeak === 1 ? 'WEEK' : 'WEEKS'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(getAlbumChartUrl(album.debutDate))
                          }
                          className="text-center font-brown-regular text-sm leading-tight text-[#0050FF] underline decoration-[#0050FF]/40 underline-offset-2 hover:text-black"
                        >
                          {formatDate(album.debutDate)}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(getAlbumChartUrl(album.peakDate))
                          }
                          className="text-center font-brown-regular text-sm leading-tight text-[#0050FF] underline decoration-[#0050FF]/40 underline-offset-2 hover:text-black"
                        >
                          {formatDate(album.peakDate)}
                        </button>

                        <p className="text-center font-brown-regular text-base leading-none text-black">
                          {album.weeksOnChart}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </section>
      )}

      <div className="h-12" />
    </main>
  );
}
