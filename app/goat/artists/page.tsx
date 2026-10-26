
'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';

import { sheetSources } from '@/lib/chartData';

type ArtistEntry = {
  rank: number;
  artist: string;
  artwork?: string;
};

type ArtistStats = {
  numberOneHits: number;
  top10Hits: number;
  top20Hits: number;
  top40Hits: number;
  totalEntries: number;
};

type SongRow = {
  rank: number;
  title: string;
  artist: string;
};

const ARTIST_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTo4WYmWMqXuJnp9n_CguacvkVIVBXvjs69acvAHAEWtqSfOqyf2N5w5vRiohp6y9I5WJpM5XzWrUlF/pub?gid=1512706476&single=true&output=csv';

function freshCsvUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArtistList(csvText: string): ArtistEntry[] {
  const rows = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  }).data as string[][];

  return rows
    .map((row): ArtistEntry | null => {
      const rank = Number(row[0]?.trim() ?? 0);
      const artist = row[1]?.trim() ?? '';
      const artwork = row[2]?.trim() ?? '';

      if (!Number.isFinite(rank) || rank < 1 || !artist) {
        return null;
      }

      return {
        rank,
        artist,
        artwork: artwork || undefined,
      };
    })
    .filter((entry): entry is ArtistEntry => entry !== null)
    .sort((a, b) => a.rank - b.rank);
}

function parseWeeklyRows(csvText: string): SongRow[] {
  const rows = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  }).data as string[][];

  return rows
    .map((row): SongRow | null => {
      const rank = Number(row[1]?.trim() ?? 0);
      const content = row[2]?.trim() ?? '';

      if (!Number.isFinite(rank) || rank < 1 || rank > 100 || !content) {
        return null;
      }

      const parts = content
        .split(/\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean);

      const title = parts[0] ?? '';
      const artist = parts[1] ?? '';

      if (!title || !artist) {
        return null;
      }

      return { rank, title, artist };
    })
    .filter((row): row is SongRow => row !== null);
}

/*
 * Matches an artist as a complete name within a chart credit.
 * This avoids matching names that are only part of another word.
 */
function creditContainsArtist(
  credit: string,
  artist: string
): boolean {
  const normalizedCredit = normalize(credit);
  const normalizedArtist = normalize(artist);

  if (!normalizedCredit || !normalizedArtist) {
    return false;
  }

  let start = normalizedCredit.indexOf(normalizedArtist);

  while (start !== -1) {
    const end = start + normalizedArtist.length;
    const before = start > 0 ? normalizedCredit[start - 1] : '';
    const after = end < normalizedCredit.length
      ? normalizedCredit[end]
      : '';

    const isLeftBoundary = !before || !/[a-z0-9]/i.test(before);
    const isRightBoundary = !after || !/[a-z0-9]/i.test(after);

    if (isLeftBoundary && isRightBoundary) {
      return true;
    }

    start = normalizedCredit.indexOf(normalizedArtist, start + 1);
  }

  return false;
}

/*
 * Each song contributes only once to an artist's career totals.
 * Its best historical rank determines the highest tier it reached.
 */
function calculateArtistStats(
  artists: ArtistEntry[],
  rows: SongRow[]
): Record<string, ArtistStats> {
  const songPeaksByArtist = new Map<string, Map<string, number>>();

  const normalizedArtists = artists.map((entry) => ({
    name: entry.artist,
    key: normalize(entry.artist),
  }));

  for (const row of rows) {
    const songKey = normalize(row.title);

    for (const entry of normalizedArtists) {
      if (!creditContainsArtist(row.artist, entry.name)) {
        continue;
      }

      let songPeaks = songPeaksByArtist.get(entry.key);

      if (!songPeaks) {
        songPeaks = new Map<string, number>();
        songPeaksByArtist.set(entry.key, songPeaks);
      }

      const previousPeak = songPeaks.get(songKey);

      if (previousPeak === undefined || row.rank < previousPeak) {
        songPeaks.set(songKey, row.rank);
      }
    }
  }

  const result: Record<string, ArtistStats> = {};

  for (const entry of normalizedArtists) {
    const songPeaks = songPeaksByArtist.get(entry.key);
    const peaks = songPeaks ? Array.from(songPeaks.values()) : [];

    result[entry.key] = {
      numberOneHits: peaks.filter((rank) => rank === 1).length,
      top10Hits: peaks.filter((rank) => rank <= 10).length,
      top20Hits: peaks.filter((rank) => rank <= 20).length,
      top40Hits: peaks.filter((rank) => rank <= 40).length,
      totalEntries: peaks.length,
    };
  }

  return result;
}

const EMPTY_STATS: ArtistStats = {
  numberOneHits: 0,
  top10Hits: 0,
  top20Hits: 0,
  top40Hits: 0,
  totalEntries: 0,
};

export default function GoatArtistsPage() {
  const [artists, setArtists] = useState<ArtistEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const [artistStats, setArtistStats] = useState<Record<string, ArtistStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      try {
        const response = await fetch(freshCsvUrl(ARTIST_CSV_URL), {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Artist CSV request failed: ${response.status}`);
        }

        const csvText = await response.text();
        const entries = parseArtistList(csvText);

        if (!cancelled) {
          setArtists(entries);
        }
      } catch (error) {
        console.error('Failed to load Hot 100 Artists:', error);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadCareerStats() {
    if (statsLoaded || loadingStats) {
      return;
    }

    setLoadingStats(true);
    setStatsError(false);

    try {
      const hot100Source = sheetSources.find(
        (source) => source.title === 'THE HOT 100'
      );

      if (!hot100Source) {
        throw new Error('The weekly Hot 100 source was not found.');
      }

      const response = await fetch(freshCsvUrl(hot100Source.csvUrl), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Weekly chart request failed: ${response.status}`);
      }

      const csvText = await response.text();
      const weeklyRows = parseWeeklyRows(csvText);
      const stats = calculateArtistStats(artists, weeklyRows);

      setArtistStats(stats);
      setStatsLoaded(true);
    } catch (error) {
      console.error('Failed to calculate artist career stats:', error);
      setStatsError(true);
    } finally {
      setLoadingStats(false);
    }
  }

  async function toggleArtist(entry: ArtistEntry) {
    if (expandedRank === entry.rank) {
      setExpandedRank(null);
      return;
    }

    setExpandedRank(entry.rank);

    if (!statsLoaded) {
      await loadCareerStats();
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">
        {/* HEADER */}
        <div className="bg-white px-4 py-5 text-center sm:px-6 sm:py-6">
          <h1 className="text-[3.4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            HOT 1OO ARTISTS
          </h1>
        </div>

        {/* BLUE BANNER */}
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="relative flex min-h-[2.75rem] items-center bg-[#0050FF] px-4 py-3 sm:px-6">
            <a
              href="/"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
            >
              &lt; HOME
            </a>

            <div className="ml-auto flex max-w-[65%] items-center justify-end gap-1.5 sm:mx-auto sm:max-w-none sm:justify-center sm:gap-2">
              <p className="text-right text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-white sm:text-base sm:tracking-[0.2em]">
                PERSONAL CHARTS BY ELIO
              </p>

              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowInfo((current) => !current)}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80 text-[0.7rem] font-brown-bold leading-none text-white transition hover:bg-white hover:text-[#0050FF]"
                  aria-label={showInfo ? 'Hide methodology' : 'Show methodology'}
                  aria-expanded={showInfo}
                >
                  i
                </button>

                {showInfo && (
                  <div className="absolute right-0 top-full z-[200] w-[18rem] pt-3 sm:right-1/2 sm:w-[32rem] sm:translate-x-1/2">
                    <div className="border border-black/10 bg-white px-5 py-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:px-7 sm:py-6">
                      <p className="text-[0.62rem] font-brown-bold uppercase tracking-[0.2em] text-black sm:text-xs">
                        HOT 100 ARTISTS
                      </p>

                      <p className="mt-3 text-xs font-brown-regular leading-relaxed text-black/70 sm:text-sm">
                        <em>
                          Artists are ranked based on an inverse point system across their chart entries, with weeks at №1 earning the greatest value and weeks at lower spots earning the least. Due to changes in chart methodology over the years, eras are weighted differently to account for chart turnover rates during periods. As of Oct. 22nd, 2026 week-ending
                        </em>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ARTIST LIST */}
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
            {!loaded && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  LOADING HOT 100 ARTISTS
                </p>
              </div>
            )}

            {loaded &&
              artists.map((entry) => {
                const isExpanded = expandedRank === entry.rank;
                const stats = artistStats[normalize(entry.artist)] ?? EMPTY_STATS;

                return (
                  <div
                    key={`${entry.rank}-${entry.artist}`}
                    className="border-t border-black/10 first:border-t-0"
                  >
                    {/* MAIN ROW */}
                    <div className="flex items-center gap-1.5 px-3 py-3 sm:gap-6 sm:px-6">
                      <div className="flex w-7 flex-shrink-0 items-center justify-center sm:w-20">
                        <p className="m-0 text-[1.35rem] font-brown-bold leading-none text-black sm:text-[3.5rem]">
                          {entry.rank}
                        </p>
                      </div>

                      <div className="h-[4.6rem] w-[4.6rem] flex-shrink-0 overflow-hidden bg-black/5 sm:h-[7.8rem] sm:w-[7.8rem]">
                        {entry.artwork ? (
                          <img
                            src={entry.artwork}
                            alt={`${entry.artist} artist image`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.45rem] uppercase tracking-[0.2em] text-black/40">
                            ARTIST
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[0.9rem] font-brown-bold leading-[1.08] text-black sm:text-4xl">
                          {entry.artist}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleArtist(entry)}
                        className="flex h-7 w-6 flex-shrink-0 items-center justify-center text-xl font-brown-regular leading-none text-black/40 transition hover:text-black/60 sm:h-10 sm:w-10 sm:text-3xl"
                        aria-label={isExpanded ? 'Collapse artist statistics' : 'Show artist statistics'}
                        aria-expanded={isExpanded}
                      >
                        {loadingStats && isExpanded
                          ? '…'
                          : isExpanded
                            ? '−'
                            : '+'}
                      </button>
                    </div>

                    {/* EXPANDED CAREER STATS */}
                    {isExpanded && (
                      <div className="border-t border-black/10 bg-white px-3 py-5 sm:px-8 sm:py-6">
                        <div className="mb-5">
                          <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                            CAREER HOT 100 STATS
                          </p>
                          <p className="mt-1 text-lg font-brown-bold text-black sm:text-2xl">
                            {entry.artist}
                          </p>
                        </div>

                        {loadingStats ? (
                          <div className="flex min-h-[180px] items-center justify-center">
                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                              CALCULATING CAREER STATS
                            </p>
                          </div>
                        ) : statsError ? (
                          <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 bg-black/[0.03] px-4 text-center">
                            <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/60">
                              UNABLE TO LOAD CAREER STATS
                            </p>
                            <button
                              type="button"
                              onClick={() => void loadCareerStats()}
                              className="border border-[#0050FF] px-4 py-2 text-xs font-brown-bold uppercase tracking-[0.12em] text-[#0050FF] transition hover:bg-[#0050FF] hover:text-white"
                            >
                              TRY AGAIN
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-px border border-black/10 bg-black/10 sm:grid-cols-5">
                              {[
                                { label: '#1 HITS', value: stats.numberOneHits },
                                { label: 'TOP 10 HITS', value: stats.top10Hits },
                                { label: 'TOP 20 HITS', value: stats.top20Hits },
                                { label: 'TOP 40 HITS', value: stats.top40Hits },
                                { label: 'TOTAL ENTRIES', value: stats.totalEntries },
                              ].map((stat) => (
                                <div
                                  key={stat.label}
                                  className="flex min-h-[105px] flex-col justify-between bg-white p-4 sm:min-h-[125px] sm:p-5"
                                >
                                  <p className="text-[0.58rem] font-brown-regular uppercase leading-tight tracking-[0.12em] text-black/50 sm:text-xs sm:tracking-[0.16em]">
                                    {stat.label}
                                  </p>
                                  <p className="mt-3 text-3xl font-brown-bold leading-none text-black sm:text-4xl">
                                    {stat.value.toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="mt-5 flex justify-center sm:justify-start">
                              <a
                                href={`/artists/${encodeURIComponent(entry.artist)}`}
                                className="inline-flex min-h-11 items-center justify-center bg-[#0050FF] px-5 py-3 text-center text-[0.65rem] font-brown-bold uppercase tracking-[0.15em] text-white transition hover:bg-black sm:px-7 sm:text-xs"
                              >
                                VIEW FULL ARTIST HISTORY
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {loaded && artists.length === 0 && (
              <div className="flex min-h-[300px] items-center justify-center">
                <p className="text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50">
                  NO HOT 100 ARTIST DATA AVAILABLE
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="h-12" />
      </div>
    </main>
  );
}
