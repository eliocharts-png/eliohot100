import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artists Chart',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
