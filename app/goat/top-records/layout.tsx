import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Greatest of All-Time Top Records',
};

export default function TopRecordsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}