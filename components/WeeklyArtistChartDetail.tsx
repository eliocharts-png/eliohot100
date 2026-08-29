'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDateLabel } from '@/lib/chartData';
import type { WeeklyArtistEntry } from '@/lib/weeklyArtistData';

interface WeeklyArtistChartDetailProps {
  title: string;
  weekLabel: string;
  week: string;
  availableWeeks: string[];
  entries: WeeklyArtistEntry[];
  entriesByWeek: Record<string, WeeklyArtistEntry[]>;
}

function normalizeMovementIcon(
  movementIcon: string | undefined
): string {
  return String(movementIcon ?? '')
    .toLowerCase()
    .trim()
    .replace(/[-_\s]/g, '');
}

function getIconFilename(
  movementIcon: string | undefined
): string {
  const normalizedIcon =
    normalizeMovementIcon(movementIcon);

  switch (normalizedIcon) {
    case 'reentry':
    case 'reenter':
      return 'reentry.PNG';

    case 'debut':
      return 'debut.PNG';

    case 'down':
      return 'down.PNG';

    case 'nonmover':
    case 'nonmovement':
      return 'non-move.PNG';

    case 'up':
    default:
      return 'up.PNG';
  }
}

function normalizeArtist(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default function WeeklyArtistChartDetail({
  title,
  weekLabel,
  week,
  availableWeeks,
  entries,
  entriesByWeek,
}: WeeklyArtistChartDetailProps) {
  /*
   * =========================================================
   * MOBILE EXPANSION
   * =========================================================
   */

  const [expandedRank, setExpandedRank] =
    useState<number | null>(null);

  const [selectedWeek, setSelectedWeek] =
    useState(week);

  /*
   * =========================================================
   * ARTIST IMAGE CACHE
   * =========================================================
   */

  const [artistImages, setArtistImages] =
    useState<Record<string, string>>({});

  const toggleEntry = (rank: number) => {
    setExpandedRank((current) =>
      current === rank ? null : rank
    );
  };

  /*
   * =========================================================
   * CURRENT WEEK
   * =========================================================
   */

  const currentEntries = useMemo(
    () =>
      (
        entriesByWeek?.[selectedWeek] ??
        entries
      ).slice(0, 20),
    [
      entriesByWeek,
      selectedWeek,
      entries,
    ]
  );

  /*
   * =========================================================
   * LOAD ARTIST IMAGES
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadArtistImages() {
      const uniqueArtists =
        Array.from(
          new Set(
            currentEntries
              .map(
                (entry) =>
                  entry.artist?.trim() ?? ''
              )
              .filter(Boolean)
          )
        );

      if (
        uniqueArtists.length === 0
      ) {
        return;
      }

      const results =
        await Promise.all(
          uniqueArtists.map(
            async (artist) => {
              try {
                const response =
                  await fetch(
                    `/api/artist?name=${encodeURIComponent(
                      artist
                    )}`,
                    {
                      cache:
                        'no-store',
                    }
                  );

                if (
                  !response.ok
                ) {
                  return null;
                }

                const result =
                  (await response.json()) as {
                    artist?: string;
                    artistImage?: string;
                  };

                if (
                  !result.artistImage
                ) {
                  return null;
                }

                return {
                  artist,
                  image:
                    result.artistImage,
                };
              } catch (
                error
              ) {
                console.error(
                  `Failed to load image for ${artist}:`,
                  error
                );

                return null;
              }
            }
          )
        );

      if (
        cancelled
      ) {
        return;
      }

      setArtistImages(
        (current) => {
          const next = {
            ...current,
          };

          for (
            const result of results
          ) {
            if (
              result
            ) {
              next[
                normalizeArtist(
                  result.artist
                )
              ] =
                result.image;
            }
          }

          return next;
        }
      );
    }

    void loadArtistImages();

    return () => {
      cancelled = true;
    };
  }, [currentEntries]);

  /*
   * =========================================================
   * GET ARTIST IMAGE
   * =========================================================
   */

  const getArtistImage = (
    entry: WeeklyArtistEntry
  ): string | undefined => {
    const fetchedImage =
      artistImages[
        normalizeArtist(
          entry.artist
        )
      ];

    if (
      fetchedImage
    ) {
      return fetchedImage;
    }

    return entry.artwork;
  };

  /*
   * =========================================================
   * NO. 1 INFORMATION
   * =========================================================
   */

  const numberOneEntry =
    currentEntries.find(
      (entry) =>
        entry.rank === 1
    );

  const weeksAtNumberOne =
    numberOneEntry?.weeksAtNumberOne ??
    0;

  return (
    <section className="space-y-0">

      {/* =========================================
          DATE SELECTOR
      ========================================== */}

      <div className="flex items-center justify-center bg-white px-4 py-3">

        <select
          value={selectedWeek}
          onChange={(event) => {
            setSelectedWeek(
              event.target.value
            );

            setExpandedRank(
              null
            );
          }}
          className="cursor-pointer appearance-none rounded-none bg-black px-5 py-2.5 text-center text-xs font-brown-regular uppercase tracking-[0.2em] text-white outline-none sm:text-sm"
        >
          {availableWeeks.map(
            (weekOption) => (
              <option
                key={weekOption}
                value={weekOption}
              >
                {formatDateLabel(
                  weekOption
                )}
              </option>
            )
          )}
        </select>

      </div>

      {/* =========================================
          BLUE HEADER
          SAME WIDTH AS CHART
      ========================================== */}

      <div className="mx-auto max-w-[68rem] px-3 sm:px-6">

        <div className="relative flex w-full items-center justify-center bg-[#0050FF] px-4 py-3 sm:px-6">

          <a
            href="/"
            className="absolute left-4 text-xs font-brown-regular uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-70 sm:left-6 sm:text-sm sm:tracking-[0.2em]"
          >
            &lt; HOME
          </a>

          <p className="ml-auto max-w-[70%] text-right text-[0.58rem] font-brown-regular uppercase tracking-[0.12em] text-white sm:mx-auto sm:max-w-none sm:text-base sm:tracking-[0.2em]">
            PERSONAL CHARTS BY ELIO
          </p>

        </div>

      </div>

      {/* =========================================
          CHART CONTAINER
      ========================================== */}

      <div className="mx-auto max-w-[68rem] px-3 sm:px-6">

        <div className="border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)]">

          <div className="space-y-0">

            {currentEntries.map(
              (entry) => {

                const isExpanded =
                  expandedRank ===
                  entry.rank;

                const artistImage =
                  getArtistImage(
                    entry
                  );

                return (
                  <div
                    key={`${entry.rank}-${entry.artist}`}
                    className="group border-y border-black/10 transition-colors duration-150 first:border-t-0 hover:border-[#0050FF]"
                  >

                    {/* =================================
                        #1 WEEKS AT NO. 1 BANNER
                    ================================== */}

                    {entry.rank === 1 && (
                      <>

                        {/* DESKTOP */}

                        <div className="hidden sm:block">

                          <div className="w-[16.8rem] bg-black px-3 py-2 text-center">

                            <p className="text-sm font-brown-regular uppercase tracking-[0.12em] text-white">
                              {
                                weeksAtNumberOne
                              }{' '}
                              {weeksAtNumberOne ===
                              1
                                ? 'WEEK'
                                : 'WEEKS'}{' '}
                              AT NO. 1
                            </p>

                          </div>

                        </div>

                        {/* MOBILE */}

                        <div className="block px-3 pt-3 sm:hidden">

                          <div className="bg-black px-3 py-2 text-center">

                            <p className="text-xs font-brown-regular uppercase tracking-[0.1em] text-white">
                              {
                                weeksAtNumberOne
                              }{' '}
                              {weeksAtNumberOne ===
                              1
                                ? 'WEEK'
                                : 'WEEKS'}{' '}
                              AT NO. 1
                            </p>

                          </div>

                        </div>

                      </>
                    )}

                    {/* =================================
                        MOBILE
                    ================================== */}

                    <div className="sm:hidden">

                      <div className="flex items-center gap-1.5 px-3 py-3">

                        {/* MOVEMENT + BULLET */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="flex h-[4.6rem] w-7 flex-shrink-0 flex-col overflow-hidden transition hover:opacity-75"
                          aria-label={
                            isExpanded
                              ? 'Collapse artist details'
                              : 'Show artist details'
                          }
                        >

                          <div className="flex flex-1 items-center justify-center bg-black/10">

                            <img
                              src={`/icons/${getIconFilename(
                                entry.movementIcon
                              )}`}
                              alt={
                                entry.movementIcon ??
                                'movement'
                              }
                              className="h-5 w-5 object-contain"
                            />

                          </div>

                          <div className="flex flex-1 items-center justify-center bg-[#0050FF]">

                            {entry.showBullet && (
                              <img
                                src="/icons/bullet.PNG"
                                alt="positive movement"
                                className="h-5 w-5 object-contain"
                              />
                            )}

                          </div>

                        </button>

                        {/* RANK */}

                        <div className="flex w-7 flex-shrink-0 items-center justify-center">

                          <p className="m-0 text-[1.35rem] font-brown-bold leading-none text-black">
                            {
                              entry.rank
                            }
                          </p>

                        </div>

                        {/* ARTIST IMAGE */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="h-[4.6rem] w-[4.6rem] flex-shrink-0 cursor-pointer overflow-hidden bg-black/5"
                          aria-label={
                            isExpanded
                              ? 'Collapse artist details'
                              : 'Show artist details'
                          }
                        >

                          {artistImage ? (
                            <img
                              src={
                                artistImage
                              }
                              alt={`${entry.artist} image`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black/5 text-[0.45rem] uppercase tracking-[0.2em] text-black/40">
                              ARTIST
                            </div>
                          )}

                        </button>

                        {/* ARTIST NAME */}

                        <div className="min-w-0 flex-1">

                          <p className="break-words text-[0.9rem] font-brown-bold leading-[1.08] text-black">
                            {
                              entry.artist
                            }
                          </p>

                        </div>

                      </div>

                      {/* MOBILE PEN */}

                      {isExpanded && (
                        <div className="px-3 pb-3">

                          <div
                            className="relative bg-black px-3 py-3"
                            style={{
                              clipPath:
                                'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                            }}
                          >

                            <div className="grid grid-cols-4 gap-1 text-center text-white">

                              {/* LAST WEEK */}

                              <div>

                                <p className="text-[0.48rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  LAST
                                  <br />
                                  WEEK
                                </p>

                                <p className="mt-1 text-sm font-brown-bold">
                                  {
                                    entry.lastWeekRank ??
                                    '—'
                                  }
                                </p>

                              </div>

                              {/* PEAK */}

                              <div>

                                <p className="text-[0.48rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  PEAK
                                  <br />
                                  POSITION
                                </p>

                                <p className="mt-1 text-sm font-brown-bold">
                                  {
                                    entry.peakPosition
                                  }
                                </p>

                              </div>

                              {/* WEEKS */}

                              <div>

                                <p className="text-[0.48rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  WEEKS ON
                                  <br />
                                  CHART
                                </p>

                                <p className="mt-1 text-sm font-brown-bold">
                                  {
                                    entry.weeksOnChart
                                  }
                                </p>

                              </div>

                              {/* SONGS */}

                              <div>

                                <p className="text-[0.48rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  SONGS
                                  <br />
                                  THIS WEEK
                                </p>

                                <p className="mt-1 text-sm font-brown-bold">
                                  {
                                    entry.songsOnChart
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                        </div>
                      )}

                    </div>

                    {/* =================================
                        DESKTOP
                    ================================== */}

                    <div className="hidden sm:flex sm:flex-row sm:items-stretch">

                      {/* =================================
                          LEFT FIXED AREA
                      ================================== */}

                      <div className="relative flex flex-shrink-0 items-stretch">

                        {/* =================================
                            PEN PANEL
                            APPEARS ON HOVER
                        ================================== */}

                        <div className="pointer-events-none absolute right-full top-1/2 z-20 hidden -translate-y-1/2 pr-2 group-hover:block">

                          <div
                            className="relative bg-black px-2 py-3 shadow-md"
                            style={{
                              clipPath:
                                'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)',
                            }}
                          >

                            <div className="grid w-[155px] grid-cols-3 gap-2 text-center text-white">

                              {/* LAST WEEK */}

                              <div className="flex min-w-0 flex-col items-center justify-center text-center">

                                <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  LAST
                                  <br />
                                  WEEK
                                </p>

                                <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                  {
                                    entry.lastWeekRank ??
                                    '—'
                                  }
                                </p>

                              </div>

                              {/* PEAK POSITION */}

                              <div className="flex min-w-0 flex-col items-center justify-center text-center">

                                <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  PEAK
                                  <br />
                                  POSITION
                                </p>

                                <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                  {
                                    entry.peakPosition
                                  }
                                </p>

                              </div>

                              {/* WEEKS ON CHART */}

                              <div className="flex min-w-0 flex-col items-center justify-center text-center">

                                <p className="text-[0.52rem] font-brown-regular uppercase leading-tight tracking-[0.08em] text-white/70">
                                  WEEKS ON
                                  <br />
                                  CHART
                                </p>

                                <p className="mt-1 text-base font-brown-bold leading-none text-white">
                                  {
                                    entry.weeksOnChart
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                        </div>

                        {/* =================================
                            MOVEMENT + BULLET
                        ================================== */}

                        <div className="flex w-12 flex-shrink-0 flex-col">

                          <div className="flex flex-1 items-center justify-center bg-black/10">

                            <img
                              src={`/icons/${getIconFilename(
                                entry.movementIcon
                              )}`}
                              alt={
                                entry.movementIcon ??
                                'movement'
                              }
                              className="h-12 w-12 object-contain"
                            />

                          </div>

                          <div className="flex flex-1 items-center justify-center bg-[#0050FF]">

                            {entry.showBullet && (
                              <img
                                src="/icons/bullet.PNG"
                                alt="positive movement"
                                className="h-12 w-12 object-contain"
                              />
                            )}

                          </div>

                        </div>

                        {/* =================================
                            RANK
                        ================================== */}

                        <div className="flex w-24 flex-shrink-0 items-center justify-center">

                          <p className="m-0 text-center text-[3rem] font-brown-bold leading-none text-black">
                            {
                              entry.rank
                            }
                          </p>

                        </div>

                      </div>

                      {/* =================================
                          ARTIST IMAGE + NAME
                      ================================== */}

                      <div className="flex min-w-0 flex-1 items-center gap-4 py-[3px]">

                        {/* ARTIST IMAGE */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleEntry(
                              entry.rank
                            )
                          }
                          className="h-[7.8rem] w-[7.8rem] flex-shrink-0 cursor-pointer overflow-hidden bg-black/5"
                          aria-label={
                            isExpanded
                              ? 'Collapse artist details'
                              : 'Show artist details'
                          }
                        >

                          {artistImage ? (
                            <img
                              src={
                                artistImage
                              }
                              alt={`${entry.artist} image`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-black/5 text-xs uppercase tracking-[0.35em] text-black/40">
                              ARTIST
                            </div>
                          )}

                        </button>

                        {/* ARTIST NAME */}

                        <div className="min-w-0 flex-1">

                          <p className="text-4xl font-brown-bold leading-tight text-black">
                            {
                              entry.artist
                            }
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* =========================================
            BREATHING SPACE AFTER #20
        ========================================== */}

        <div className="h-12 sm:h-20" />

      </div>

    </section>
  );
}