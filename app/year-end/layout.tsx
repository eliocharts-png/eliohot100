import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Year-End Charts',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
