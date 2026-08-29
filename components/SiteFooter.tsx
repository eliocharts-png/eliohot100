'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <footer className="relative w-full bg-black text-white">
      <div
        className="
          mx-auto
          grid
          w-full
          max-w-7xl
          grid-cols-1
          items-center
          gap-6
          px-4
          py-8
          sm:px-6
          lg:grid-cols-3
          lg:px-8
          lg:py-7
        "
      >
        {/* ABOUT US */}
        <div className="relative flex justify-center lg:justify-start">
          <button
            type="button"
            onMouseEnter={() => setAboutOpen(true)}
            onMouseLeave={() => setAboutOpen(false)}
            onFocus={() => setAboutOpen(true)}
            onBlur={() => setAboutOpen(false)}
            className="
              font-brown-bold
              text-[10px]
              uppercase
              tracking-[0.1em]
              text-white
              transition-opacity
              hover:opacity-60
              focus:outline-none
              sm:text-xs
            "
          >
            ABOUT US
          </button>

          {/* ABOUT US POPUP */}
          {aboutOpen && (
            <div
              onMouseEnter={() => setAboutOpen(true)}
              onMouseLeave={() => setAboutOpen(false)}
              className="
                absolute
                bottom-[calc(100%+12px)]
                left-1/2
                z-50
                w-[min(88vw,360px)]
                -translate-x-1/2
                border
                border-white/20
                bg-black
                px-5
                py-5
                shadow-2xl
                lg:left-0
                lg:translate-x-0
              "
            >
              <p
                className="
                  font-brown-regular
                  text-[11px]
                  leading-[1.6]
                  text-white/75
                  sm:text-xs
                "
              >
                Elio Charts was founded in July 2020, with its
                first chart released on July 23, 2020. Since
                then, Elio Charts has consistently tracked and
                compiled personal weekly listening data.
              </p>

              <p
                className="
                  mt-3
                  font-brown-regular
                  text-[11px]
                  leading-[1.6]
                  text-white/75
                  sm:text-xs
                "
              >
                The weekly chart is based on personal streams
                and radio listens, which are tabulated using a
                unique set of formulas. In 2024, previously
                untracked charts were successfully backtracked,
                completing the historical archive.
              </p>

              <p
                className="
                  mt-3
                  font-brown-regular
                  text-[11px]
                  leading-[1.6]
                  text-white/75
                  sm:text-xs
                "
              >
                Listening is tracked through Friday, with each
                weekly chart compiled and released over the
                weekend.
              </p>
            </div>
          )}
        </div>

        {/* COPYRIGHT */}
        <div className="text-center">
          <p
            className="
              font-brown-regular
              text-[10px]
              leading-relaxed
              tracking-[0.03em]
              text-white/60
              sm:text-xs
            "
          >
            © 2026 Elio Charts. Powered by Erudite. All rights
            reserved.
          </p>
        </div>

        {/* FOLLOW US ON X */}
        <div className="flex justify-center lg:justify-end">
          <Link
            href="https://x.com/eliocharts"
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-brown-bold
              text-[10px]
              uppercase
              tracking-[0.1em]
              text-white
              transition-opacity
              hover:opacity-60
              sm:text-xs
            "
          >
            FOLLOW US ON X
          </Link>
        </div>
      </div>
    </footer>
  );
}
