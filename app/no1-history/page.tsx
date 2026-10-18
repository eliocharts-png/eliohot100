'use client';

import { useEffect, useMemo, useState } from 'react';

type NumberOneWeek = {
  week: string;
  points: number | null;
  weeksOnChart: number;
};

type NumberOneSong = {
  title: string;
  artist: string;
  artwork?: string;
  firstNo1: string;
  lastNo1: string;
  totalWeeksAtNo1: number;
  numberOneWeeks: NumberOneWeek[];
};

function parseChartDate(value: string): number {
  const [month, day, year] = value.split('/').map(Number);
  if (!month || !day || year === undefined) return 0;
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  return new Date(fullYear, month - 1, day).getTime();
}

function formatDate(value: string): string {
  const timestamp = parseChartDate(value);
  if (!timestamp) return value;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPoints(points: number | null): string {
  return points === null ? '—' : points.toLocaleString('en-US');
}

function ordinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export default function No1HistoryPage() {
  const [songs, setSongs] = useState<NumberOneSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<NumberOneSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSongs() {
      try {
        const response = await fetch('/api/no1-history');
        if (!response.ok) throw new Error('Failed to load No. 1 history');
        const data: { songs?: NumberOneSong[] } = await response.json();
        if (!cancelled) setSongs(data.songs ?? []);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSongs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter((song) =>
      `${song.title} ${song.artist}`.toLowerCase().includes(query),
    );
  }, [songs, search]);

  return (
    <main className="no1-history-page min-h-screen bg-white pb-16 pt-[4.5rem] text-black dark:bg-black dark:text-white">
      <div className="mx-auto max-w-[1800px] px-3 sm:px-6">
        <header className="mb-6 border-b border-black/15 pb-5 dark:border-white/20">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0050FF]">
                ELIO CHARTS ARCHIVE
              </p>
              <h1 className="section-title text-4xl uppercase leading-none sm:text-6xl">
                No. 1 History
              </h1>
            </div>
            <p className="text-sm text-black/55 dark:text-white/55">
              {loading ? 'Loading songs…' : `${songs.length.toLocaleString()} songs`}
            </p>
          </div>
          <p className="max-w-2xl text-sm text-black/65 dark:text-white/65 sm:text-base">
            Every song that has reached the top of the Elio Charts Hot 100,
            ordered by its first week at No. 1.
          </p>
                    {!selectedSong && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search songs or artists"
              aria-label="Search songs or artists"
              className="w-full max-w-sm border border-black/20 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0050FF] dark:border-white/20 dark:bg-[#242424]"
            />
            {selectedSong && (
              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="border border-[#0050FF] px-3 py-2 text-sm font-bold text-[#0050FF] transition hover:bg-[#0050FF] hover:text-white"
              >
                Back to all No. 1s
              </button>
            )}
          </div>
          )}
        </header>

        {selectedSong ? (
          <section>
            <button
              type="button"
              onClick={() => setSelectedSong(null)}
              className="mb-5 text-sm font-bold text-[#0050FF] hover:underline"
            >
              ← ALL NO. 1 SONGS
            </button>

            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr]">
              <div className="w-full max-w-[260px]">
                {selectedSong.artwork ? (
                  <img
                    src={selectedSong.artwork}
                    alt={`${selectedSong.title} artwork`}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-black/5 text-sm text-black/40 dark:bg-white/10 dark:text-white/40">
                    ARTWORK UNAVAILABLE
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0050FF]">
                  ELIO CHARTS HOT 100 NO. 1
                </p>
                <h2 className="section-title text-3xl uppercase leading-tight sm:text-5xl">
                  {selectedSong.title}
                </h2>
                <p className="mt-2 text-lg text-black/65 dark:text-white/65">
                  {selectedSong.artist}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-black/15 pt-3 dark:border-white/20 sm:grid-cols-3 sm:gap-x-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                      Weeks at No. 1
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {selectedSong.totalWeeksAtNo1}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                      First No. 1
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatDate(selectedSong.firstNo1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                      Most Recent No. 1
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatDate(selectedSong.lastNo1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 className="section-title text-2xl uppercase">
                Every week at No. 1
              </h3>
              <p className="text-xs text-black/50 dark:text-white/50">
                {selectedSong.numberOneWeeks.length} weeks
              </p>
            </div>

            <div className="flex justify-center overflow-x-auto border-y border-black/15 dark:border-white/20">
              <table className="w-fit table-auto border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/15 text-xs uppercase tracking-wide text-black/55 dark:border-white/20 dark:text-white/55">
                    <th className="whitespace-nowrap px-2 py-2">Week at No. 1</th>
                    <th className="whitespace-nowrap px-2 py-2">Chart Date</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Points</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Week on Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSong.numberOneWeeks.map((week, index) => (
                    <tr
                      key={`${week.week}-${index}`}
                      className="border-b border-black/10 last:border-b-0 dark:border-white/10"
                    >
                      <td className="px-2 py-1.5 font-bold text-[#0050FF]">
                        {ordinal(index + 1)}
                      </td>
                      <td className="px-2 py-1.5">
                        <a
                          href={`/weekly?week=${encodeURIComponent(week.week)}`}
                          className="font-bold underline decoration-[#0050FF]/50 underline-offset-2 hover:text-[#0050FF]"
                        >
                          {formatDate(week.week)}
                        </a>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatPoints(week.points)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {week.weeksOnChart}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 sm:gap-2 lg:grid-cols-10">
            {Array.from({ length: 30 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square animate-pulse bg-black/5 dark:bg-white/10"
              />
            ))}
          </div>
        ) : error ? (
          <p className="border border-red-500/30 p-4 text-sm text-red-600">
            The No. 1 archive couldn&apos;t be loaded. Please refresh the page to try again.
          </p>
        ) : filteredSongs.length === 0 ? (
          <p className="py-12 text-center text-sm text-black/55 dark:text-white/55">
            No songs found.
          </p>
        ) : (
          <>
            {search.trim() && (
              <p className="mb-3 text-sm text-black/55 dark:text-white/55">
                {filteredSongs.length.toLocaleString()} matching songs
              </p>
            )}

            <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 sm:gap-2 lg:grid-cols-10">
              {filteredSongs.map((song) => (
                <button
                  key={`${song.title}|||${song.artist}`}
                  type="button"
                  onClick={() => {
                    setSelectedSong(song);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label={`View No. 1 history for ${song.title} by ${song.artist}`}
                  title={`${song.title} — ${song.artist}`}
                  className="group relative block aspect-square overflow-hidden bg-black/5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0050FF] dark:bg-white/10"
                >
                  {song.artwork ? (
                    <img
                      src={song.artwork}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-black/40 dark:text-white/40">
                      {song.title}
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2 pt-8 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <p className="line-clamp-2 text-xs font-bold leading-tight">
                      {song.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-white/75">
                      {song.artist}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-white">
                      {song.totalWeeksAtNo1} {song.totalWeeksAtNo1 === 1 ? 'WEEK' : 'WEEKS'} AT NO. 1
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
