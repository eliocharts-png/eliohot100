import { fetchChartData, sheetSources } from '@/lib/chartData';
import type { ChartEntry } from '@/types';

const goatSource = sheetSources.find((source) => source.title === 'Greatest of All-Time');

export default async function GoatPage() {
  if (!goatSource) {
    throw new Error('GOAT chart source not found');
  }

  const entries = await fetchChartData(goatSource.csvUrl, goatSource.title);

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="space-y-6 text-center">
          <p className="section-title text-[4rem] font-black uppercase tracking-[-0.05em] leading-[0.95] text-black sm:text-[5rem] lg:text-[6rem]">
            Greatest of All Time
          </p>
          <p className="mx-auto max-w-2xl text-sm uppercase tracking-[0.35em] text-[#000000]">
            Full Greatest of All Time chart powered by Google Sheets data.
          </p>
        </header>

        <section className="space-y-6">
          <div className="w-full bg-[#0050FF] px-6 py-5 flex items-center justify-between">
            <h2 className="text-white text-lg font-bold uppercase tracking-[0.3em] font-brown-bold">Greatest of All-Time</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <article key={entry.rank} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-brown-light uppercase tracking-[0.3em] text-slate-500">Rank</p>
                    <p className="text-3xl font-brown-bold text-black">{entry.rank}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-black font-brown-bold text-sm leading-5">{entry.title}</p>
                    <p className="text-[#888888] font-brown-light text-xs leading-4 uppercase tracking-[0.2em]">{entry.artist}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
