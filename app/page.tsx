import { ChartSection } from '@/components/ChartSection';
import { fetchChartData, sheetSources } from '@/lib/chartData';
import type { ChartEntry } from '@/types';

export default async function Home() {
  const sections = await Promise.all(
    sheetSources.map(async (source) => ({
      ...source,
      entries: await fetchChartData(source.csvUrl, source.title),
    }))
  );

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-7xl">
        <header className="space-y-4 text-center">
          <p className="mx-auto max-w-2xl text-sm uppercase tracking-[0.35em] text-[#000000] font-brown-regular">
            PERSONAL CHARTS BY ELIO
          </p>
          <p className="section-title mx-auto w-fit text-[6.5rem] font-brown-bold uppercase tracking-[-0.08em] leading-[0.85] text-black sm:text-[7.75rem] lg:text-[9rem]">
            CHARTS
          </p>
        </header>

        <div className="space-y-16">
          {sections.map((section) => (
            <ChartSection
              key={section.title}
              title={section.title}
              linkLabel="VIEW CHART"
              href={section.href}
              entries={section.entries}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
