import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ECA Predictions',
};

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
