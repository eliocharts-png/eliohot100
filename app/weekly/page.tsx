import WeeklyChartDetail from '@/components/WeeklyChartDetail';
import {
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';
import type { WeeklyChartPayload } from '@/types';

export const revalidate = 300;

const weeklySource = sheetSources.find(
  (source) =>
    source.title === 'THE HOT 100'
);

interface WeeklyPageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function WeeklyPage({
  searchParams,
}: WeeklyPageProps) {
  if (!weeklySource) {
    throw new Error(
      'Weekly chart source not found'
    );
  }

  const params =
    await searchParams;

  const selectedWeek =
    params.week || undefined;

  const chart: WeeklyChartPayload =
    await fetchWeeklyChartData(
      weeklySource.csvUrl,
      weeklySource.title,
      selectedWeek
    );

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-6xl">
        <WeeklyChartDetail
          title={weeklySource.title}
          weekLabel={chart.displayWeek}
          week={chart.week}
          availableWeeks={
            chart.availableWeeks
          }
          weeksAtNumberOne={
            chart.weeksAtNumberOne
          }
          entries={chart.entries}
          entriesByWeek={
            chart.entriesByWeek
          }
          weeksAtNumberOneByWeek={
            chart.weeksAtNumberOneByWeek
          }
        />
      </div>
    </main>
  );
}