import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Number One Archive',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
