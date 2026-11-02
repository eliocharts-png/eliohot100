import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const crystalBook = localFont({
  src: '../public/fonts/Crystal-Book.woff2',
  variable: '--font-crystal-book',
  display: 'swap',
});

const crystalExtraBold = localFont({
  src: '../public/fonts/Crystal-ExtraBold.woff2',
  variable: '--font-crystal-extrabold',
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
  title: {
    default: 'Elio Charts',
    template: '%s | Elio Charts',
  },
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
        className={`${crystalBook.variable} ${crystalExtraBold.variable} ${gothamBlack.variable} ${gothamRegular.variable}`}
      >
        <SiteHeader />

        <div className="site-content">
        {children}
        </div>

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