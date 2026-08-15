'use client';

import Link from 'next/link';
import type { ChartEntry } from '@/types';
import { useMediaQuery } from './useMediaQuery';

interface ChartSectionProps {
  title: string;
  href: string;
  entries: ChartEntry[];
}

export default function ChartSection({
  title,
  href,
  entries,
}: ChartSectionProps) {
  const isDesktop = useMediaQuery(
    '(min-width: 1024px)',
    false
  );

  const isTabletLandscape = useMediaQuery(
    '(orientation: landscape) and (min-width: 768px)',
    false
  );

  const displayedEntries =
    isDesktop || isTabletLandscape
      ? entries.slice(0, 5)
      : entries.slice(0, 3);

  const displayTitle =
    title === 'Year-End'
      ? 'YEAR-END CHARTS'
      : title;

  return (
    <section className="space-y-4 sm:space-y-6">

      {/* BLUE SECTION HEADER */}
      <div className="flex min-h-[3rem] w-full items-center bg-[#0050FF] px-3 py-2.5 sm:min-h-[4.5rem] sm:px-6 sm:py-4">

        <h2 className="min-w-0 flex-1 truncate font-brown-bold text-[1rem] uppercase leading-none tracking-[0.1em] text-white sm:text-[2.15rem] sm:tracking-[0.18em] lg:text-[2.5rem]">
          {displayTitle}
        </h2>

        <Link
          href={href}
          prefetch={true}
          className="ml-3 flex-shrink-0 whitespace-nowrap text-[0.55rem] font-brown-regular uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-70 sm:ml-6 sm:text-base sm:tracking-[0.2em]"
        >
          VIEW CHART →
        </Link>

      </div>

      {/* SONG PREVIEW */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-5">

        {displayedEntries.map((entry) => (
          <article
            key={`${entry.rank}-${entry.title}-${entry.artist}`}
            className="min-w-0"
          >

            {/* ARTWORK + RANK */}
            <div className="relative">

              {entry.artwork ? (
                <img
                  src={entry.artwork}
                  alt={`${entry.title} artwork`}
                  className="block aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-black/5" />
              )}

              <div className="absolute bottom-0 left-0 flex h-7 min-w-[1.9rem] items-center justify-center bg-[#0050FF] px-1.5 font-brown-bold text-[0.85rem] leading-none text-white sm:h-10 sm:min-w-[2.75rem] sm:px-2 sm:text-lg">
                {entry.rank}
              </div>

            </div>

            {/* SONG INFORMATION */}
            <div className="mt-2 min-w-0 sm:mt-3">

              <p className="break-words font-brown-bold text-[0.7rem] leading-[1.08] text-black sm:text-base sm:leading-5">
                {entry.title}
              </p>

              <p className="mt-0.5 break-words font-brown-regular text-[0.58rem] leading-[1.1] tracking-[0.01em] text-[#666666] sm:text-sm sm:leading-5 sm:tracking-[0.02em]">
                {entry.artist}
              </p>

            </div>

          </article>
        ))}

      </div>

    </section>
  );
}