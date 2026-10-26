
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Greatest of All-Time Hot 100 Artists',
};

export default function ArtistsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
