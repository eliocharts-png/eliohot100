'use client';

import Link from 'next/link';
import type { ChartEntry } from '@/types';

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
  const previewEntries = entries.slice(0, 5);

  return (
    <section className="space-y-4">

      {/* SECTION HEADER */}
      <div className="flex items-end justify-between border-b border-black pb-3">
        <div>
          <h2 className="text-2xl font-brown-bold uppercase leading-none tracking-[-0.03em] text-black sm:text-3xl">
            {title}
          </h2>
        </div>

        <Link
          href={href}
          className="text-xs font-brown-regular uppercase tracking-[0.15em] text-black transition-opacity hover:opacity-50 sm:text-sm"
        >
          VIEW CHART →
        </Link>
      </div>

      {/* CHART PREVIEW */}
      <div className="border border-black/10 bg-white">

        {previewEntries.length > 0 ? (
          <div>
            {previewEntries.map(
              (entry, index) => (
                <div
                  key={`${entry.rank}-${entry.title}-${entry.artist}`}
                  className="flex items-center gap-3 border-t border-black/10 px-3 py-3 first:border-t-0 sm:gap-5 sm:px-5 sm:py-4"
                >

                  {/* RANK */}
                  <div className="flex w-8 flex-shrink-0 items-center justify-center sm:w-10">
                    <p className="text-xl font-brown-bold leading-none text-black sm:text-2xl">
                      {entry.rank}
                    </p>
                  </div>

                  {/* ARTWORK */}
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden bg-black/5 sm:h-16 sm:w-16">
                    {entry.artwork ? (
                      <img
                        src={entry.artwork}
                        alt={`${entry.title} artwork`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[0.4rem] font-brown-regular uppercase tracking-[0.15em] text-black/30">
                        ARTWORK
                      </div>
                    )}
                  </div>

                  {/* SONG INFO */}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-brown-bold leading-tight text-black sm:text-xl">
                      {entry.title}
                    </p>

                    <p className="mt-1 break-words text-sm font-brown-regular leading-tight text-blue-600 sm:text-base">
                      {entry.artist}
                    </p>
                  </div>

                </div>
              )
            )}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-xs font-brown-regular uppercase tracking-[0.18em] text-black/40">
              NO CHART DATA AVAILABLE
            </p>
          </div>
        )}

      </div>

    </section>
  );
}