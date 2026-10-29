
import { getAlbumChartData } from '@/lib/albumChartData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get('week') ?? undefined;

  try {
    const chartData = await getAlbumChartData(week);

    return Response.json(chartData);
  } catch (error) {
    console.error('Failed to load the album chart:', error);

    return Response.json(
      { error: 'Unable to load the album chart.' },
      { status: 500 },
    );
  }
}
