import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

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

const gothamBlack = localFont({
  src: '../fonts/Gotham Black.otf',
  variable: '--font-gotham-black',
  display: 'swap',
});

const gothamRegular = localFont({
  src: '../fonts/Gotham Regular.otf',
  variable: '--font-gotham-regular',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Elio Charts',
  description: 'Personal charts by Elio',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${brownBold.variable} ${brownRegular.variable} ${gothamBlack.variable} ${gothamRegular.variable}`}
      >
        <SiteHeader />

        {children}

        <SiteFooter />

        <Analytics />

        <Script
          src="/elio-preview-player.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}