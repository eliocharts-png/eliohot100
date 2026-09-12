import type { Metadata } from 'next';
import { formatDateLabel } from '@/lib/chartData';

interface SharePageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: SharePageProps): Promise<Metadata> {
  const params = await searchParams;
  const week = params.week ?? '';

  const dateLabel = week
    ? formatDateLabel(week)
    : '';

  const title = 'Elio Hot 100 Top 10';

  const description = week
    ? `Elio Hot 100 Top 10 (chart dated ${dateLabel})`
    : 'Elio Hot 100 Top 10';

  const baseUrl =
    'https://eliocharts.vercel.app';

  const imagePath = week
    ? `${baseUrl}/api/weekly-share?week=${encodeURIComponent(week)}`
    : `${baseUrl}/api/weekly-share`;

  const pageUrl = week
    ? `${baseUrl}/weekly/share?week=${encodeURIComponent(week)}`
    : `${baseUrl}/weekly/share`;

  return {
    title,
    description,

    metadataBase: new URL(baseUrl),

    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      images: [
        {
          url: imagePath,
          width: 1637,
          height: 2048,
          alt: description,
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: imagePath,
          alt: description,
        },
      ],
    },
  };
}

export default async function WeeklySharePage({
  searchParams,
}: SharePageProps) {
  const params = await searchParams;
  const week = params.week ?? '';

  const destination = week
    ? `/weekly?week=${encodeURIComponent(week)}`
    : '/weekly';

  return (
    <main>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function () {
              window.location.href = ${JSON.stringify(destination)};
            }, 2000);
          `,
        }}
      />

      <p>Redirecting to Elio Hot 100...</p>
    </main>
  );
}