'use client';

import type { ChartEntry } from '@/types';
import { useMediaQuery } from './useMediaQuery';

interface ChartSectionProps {
  title: string;
  linkLabel: string;
  href: string;
  entries: ChartEntry[];
}

export function ChartSection({ title, linkLabel, href, entries }: ChartSectionProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)', false);
  const isTabletLandscape = useMediaQuery('(orientation: landscape) and (min-width: 768px)', false);
  const displayedEntries = isDesktop || isTabletLandscape ? entries.slice(0, 5) : entries.slice(0, 3);

  return (
    <section className="space-y-6">
      <div className="w-full bg-[#0050FF] px-6 py-7 flex items-center justify-between">
        <h2 className="text-white text-2xl font-bold uppercase tracking-[0.18em] font-brown-bold sm:text-[2.15rem] lg:text-[2.5rem]">
          {title}
        </h2>
        <a
          href={href}
          className="text-white text-sm font-brown-regular uppercase tracking-[0.3em] sm:text-base"
        >
          {linkLabel}
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 lg:grid-cols-5">
        {displayedEntries.map((entry) => (
          <article key={entry.rank} className="space-y-3">
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-100 via-slate-100 to-sky-200 pb-[120%]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(236,246,255,0.95),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(205,230,255,0.85),_transparent_30%)]" />
              <div className="absolute inset-x-0 top-0 h-2/3 bg-slate-200/60" />
              <div className="absolute inset-x-4 top-4 h-24 bg-white/80 shadow-sm backdrop-blur-sm" />
              <div className="absolute bottom-4 left-4 h-10 min-w-[2.75rem] bg-[#0050FF] px-3 py-1.5 flex items-center justify-center text-white text-base font-brown-bold">
                {entry.rank}
              </div>
            </div>
            <div>
              <p className="text-black font-brown-bold text-base leading-5">
                {entry.title}
              </p>
              <p className="text-[#666666] font-brown-regular text-sm leading-5 tracking-[0.02em]">
                {entry.artist.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
