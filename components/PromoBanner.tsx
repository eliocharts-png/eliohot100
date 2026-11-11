
'use client';

import { useEffect, useRef, useState } from 'react';

const SHOW_THRESHOLD = 150;

export default function PromoBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Measure the responsive banner height
  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    const updateHeight = () => {
      setBannerHeight(banner.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(banner);

    return () => observer.disconnect();
  }, []);

  // Control visibility based on scroll position and direction
  useEffect(() => {
    let lastScrollY = window.scrollY;

    setVisible(lastScrollY <= SHOW_THRESHOLD);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= SHOW_THRESHOLD) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Adjust the sticky header position
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--promo-banner-height',
      visible ? `${bannerHeight}px` : '0px',
    );

    return () => {
      document.documentElement.style.removeProperty(
        '--promo-banner-height',
      );
    };
  }, [visible, bannerHeight]);

  return (
    <>
      {/* Reserve space for the banner in the document */}
      <div
        aria-hidden="true"
        style={{ height: `${bannerHeight}px` }}
      />

      {/* Fixed promotional banner */}
      <div
        ref={bannerRef}
        className={`fixed left-0 top-0 z-[110] w-full transition-transform duration-300 ease-in-out ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <a
  href="/awards"
  aria-label="Visit Elio Charts Awards 2026"
  className="block cursor-pointer"
>
  <img
    src="/banner/eca-2026.jpg"
    alt="Elio Charts Awards 2026"
    className="block h-auto w-full"
  />
</a>
      </div>
    </>
  );
}
