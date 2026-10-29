
import { getAlbumChartData } from '@/lib/albumChartData';
import AlbumChartDetail from '@/components/AlbumChartDetail';

export const metadata = {
  title: 'Top Records',
  description: 'Weekly album charts powered by Elio Charts.',
};

export const revalidate = 300;

export default async function AlbumsPage() {
  try {
    const chartData = await getAlbumChartData();

    return <AlbumChartDetail {...chartData} />;
  } catch (error) {
    console.error('Failed to load the album chart:', error);

    return (
      <main
        style={{
          maxWidth: '68rem',
          margin: '0 auto',
          padding: '48px 20px',
        }}
      >
        <h1>THE TOP RECORDS</h1>
        <p>
          The album chart data could not be loaded. Please check the Google
          Sheets sharing settings and try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
      </main>
    );
  }
}
