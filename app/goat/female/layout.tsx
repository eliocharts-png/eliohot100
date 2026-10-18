import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Greatest of All-Time Female Songs',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
