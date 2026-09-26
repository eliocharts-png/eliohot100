import RecordsPage from '@/components/RecordsPage';
import { fetchRecordsData } from '@/lib/records';

export const dynamic = 'force-dynamic';

export default async function Records() {
  const records = await fetchRecordsData();

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="pt-[3.8rem]">
        <RecordsPage records={records} />
      </div>
    </main>
  );
}