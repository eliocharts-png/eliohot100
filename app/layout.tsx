import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const brownBold = localFont({
  src: '../fonts/Brown-Bold.ttf',
  variable: '--font-brown-bold',
  display: 'swap',
});

const brownRegular = localFont({
  src: '../fonts/Brown-Regular.ttf',
  variable: '--font-brown-regular',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'elio charts',
  description: 'Personal music charts landing page',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${brownBold.variable} ${brownRegular.variable}`}>
      <body>{children}</body>
    </html>
  );
}
