
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Greatest of All-Time Artists',
};

export default function AllTimeArtistsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
