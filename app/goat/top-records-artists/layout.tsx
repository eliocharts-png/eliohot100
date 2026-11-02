import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Greatest of All-Time Top Records Artists',
};

export default function TopRecordsArtistsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}