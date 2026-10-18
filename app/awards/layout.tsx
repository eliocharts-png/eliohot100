import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Elio Charts Awards',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
