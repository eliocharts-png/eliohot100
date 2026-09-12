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
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://shiny-space-giggle-6vjx7prq4qwc6qj-3000.app.github.dev';

  const imagePath = week
    ? `${baseUrl}/api/weekly-share?week=${encodeURIComponent(week)}`
    : `${baseUrl}/api/weekly-share`;

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type: 'article',
      url: week
        ? `${baseUrl}/weekly/share?week=${encodeURIComponent(week)}`
        : `${baseUrl}/weekly/share`,
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
      images: [imagePath],
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
    <html>
      <head>
        <meta
          httpEquiv="refresh"
          content={`2;url=${destination}`}
        />
      </head>

      <body>
        <p>
          Redirecting to Elio Hot 100...
        </p>
      </body>
    </html>
  );
}