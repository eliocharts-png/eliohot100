import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Decade-End 2020s Chart',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
