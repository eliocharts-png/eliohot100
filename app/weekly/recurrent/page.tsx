import RecurrentChartDetail from '@/components/RecurrentChartDetail';
import {
  fetchRecurrentChartData,
  sheetSources,
} from '@/lib/chartData';
import type { RecurrentChartPayload } from '@/types';

export const revalidate = 300;

const weeklySource = sheetSources.find(
  (source) => source.title === 'THE HOT 100'
);

interface RecurrentPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function RecurrentPage({
  searchParams,
}: RecurrentPageProps) {
  if (!weeklySource) {
    throw new Error(
      'Weekly chart source not found'
    );
  }

  const params = await searchParams;

  const selectedWeek =
    params.week || undefined;

  const chart: RecurrentChartPayload =
    await fetchRecurrentChartData(
      weeklySource.csvUrl,
      selectedWeek,
      weeklySource.title
    );

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <RecurrentChartDetail
            title="HOT RECURRENT SONGS"
            weekLabel={chart.displayWeek}
            week={chart.week}
            availableWeeks={
              chart.availableWeeks
            }
            entries={chart.entries}
            entriesByWeek={
              chart.entriesByWeek
            }
          />
        </div>
      </div>
    </main>
  );
}