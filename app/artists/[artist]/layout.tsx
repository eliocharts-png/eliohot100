import type { Metadata } from 'next';

type Props = {
  params: Promise<{ artist: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist } = await params;
  const artistName = decodeURIComponent(artist.replace(/\\+/g, ' '));

  return {
    title: {
      absolute: `Chart History | ${artistName}`,
    },
  };
}

export default function ArtistHistoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
