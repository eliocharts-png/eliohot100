import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';

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
  title: 'Elio Charts',
  description: 'Personal charts by Elio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${brownBold.variable} ${brownRegular.variable}`}
      >
        <SiteHeader />

        {children}
      </body>
    </html>
  );
}