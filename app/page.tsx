'use client';

import { useEffect, useState } from 'react';
import ChartSection from '@/components/ChartSection';
import {
  sheetSources,
  type ChartSource,
} from '@/lib/chartData';

type ChartData = ChartSource & {
  entries: {
    rank: number;
    title: string;
    artist: string;
    artwork?: string;
  }[];
};

export default function HomePage() {
  const [charts, setCharts] = useState<ChartData[]>(
    sheetSources.map((source) => ({
      ...source,
      entries: [],
    }))
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCharts() {
      try {
        const results = await Promise.all(
          sheetSources.map(async (source) => {
            try {
              const response = await fetch(
                `/api/chart?url=${encodeURIComponent(
                  source.csvUrl
                )}&title=${encodeURIComponent(
                  source.title
                )}`
              );

              if (!response.ok) {
                console.error(
                  `Failed to load ${source.title}`
                );

                return {
                  ...source,
                  entries: [],
                };
              }

              const data =
                await response.json();

              return {
                ...source,
                entries:
                  data.entries ?? [],
              };
            } catch (error) {
              console.error(
                `Failed to load ${source.title}:`,
                error
              );

              return {
                ...source,
                entries: [],
              };
            }
          })
        );

        if (!cancelled) {
          setCharts(results);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCharts();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-6 sm:py-12">

        <header className="mb-10 text-center sm:mb-14">
          <h1 className="text-[4rem] font-brown-bold uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            CHARTS
          </h1>

          <p className="mt-3 text-xs font-brown-regular uppercase tracking-[0.2em] text-black/50 sm:text-sm">
            PERSONAL CHARTS BY ELIO
          </p>
        </header>

        <div className="space-y-12">
          {charts.map((chart) => (
            <ChartSection
              key={chart.title}
              title={chart.title}
              href={chart.href}
              entries={chart.entries}
            />
          ))}
        </div>

        {loading && (
          <div className="mt-8 text-center">
            <p className="text-sm font-brown-regular text-black/40">
              LOADING CHARTS...
            </p>
          </div>
        )}

      </div>
    </main>
  );
}