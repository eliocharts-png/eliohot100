import ChartSection from '@/components/ChartSection';
import { fetchChartData, sheetSources } from '@/lib/chartData';
import type { ChartEntry } from '@/types';

type ChartData = {
  title: string;
  href: string;
  entries: ChartEntry[];
};

export default async function HomePage() {
  const charts: ChartData[] = await Promise.all(
    sheetSources.map(async (source) => {
      try {
        const entries = await fetchChartData(
          source.csvUrl,
          source.title
        );

        return {
          title: source.title,
          href: source.href,
          entries,
        };
      } catch {
        return {
          title: source.title,
          href: source.href,
          entries: [],
        };
      }
    })
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-3 pb-7 pt-6 sm:px-6 sm:pb-10 sm:pt-9">
        <header className="text-center">
          <h1 className="font-brown-bold text-[3.4rem] uppercase leading-[0.9] tracking-[-0.08em] text-black sm:text-[6rem] lg:text-[7rem]">
            ELIO CHARTS
          </h1>

          <p className="mt-3 text-[0.58rem] font-brown-regular uppercase tracking-[0.14em] text-black/50 sm:text-sm sm:tracking-[0.2em]">
            WEEKLY PERSONAL CHARTS
          </p>
        </header>
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="space-y-9 sm:space-y-12">
          {charts.map((chart) => (
            <ChartSection
              key={chart.title}
              title={chart.title}
              href={chart.href}
              entries={chart.entries}
            />
          ))}
        </div>
      </div>

      <div className="h-10 sm:h-12" />
    </main>
  );
}