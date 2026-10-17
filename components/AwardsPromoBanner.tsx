
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const PREDICTIONS_URL = '/awards-predictions';

const CATEGORIES = [
  { id: 'album', title: 'ALBUM OF THE YEAR' },
  { id: 'artist', title: 'ARTIST OF THE YEAR' },
  { id: 'record', title: 'RECORD OF THE YEAR' },
  { id: 'song', title: 'SONG OF THE YEAR' },
  { id: 'collaboration', title: 'COLLABORATION OF THE YEAR' },
  { id: 'new-artist', title: 'BEST NEW ARTIST' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

type Contender = {
  nominee: string;
  points?: number;
  appearances?: number;
  firstPlaceVotes?: number;
  odds?: number;
  change?: number | null;
};

type CategoryOdds = {
  nominees: Contender[];
  submissionCount: number;
};

type ApiResult = {
  success?: boolean;
  categories?: Record<string, CategoryOdds>;
};

function splitNominee(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return {
      title: lines[0],
      artist: lines.slice(1).join(' '),
    };
  }

  const separator = value.indexOf(' — ');

  if (separator === -1) {
    return { title: value.trim(), artist: '' };
  }

  return {
    title: value.slice(0, separator).trim(),
    artist: value.slice(separator + 3).trim(),
  };
}

function getPercentage(
  contender: Contender,
  submissionCount: number
) {
  if (submissionCount <= 0) return 0;

  const appearances = Number(contender.appearances) || 0;

  return Math.max(
    0,
    Math.min(100, (appearances / submissionCount) * 100)
  );
}

function formatChange(change?: number | null) {
  if (typeof change !== 'number' || !Number.isFinite(change)) {
    return { label: '—', direction: 'flat' };
  }

  if (change > 0) {
    return {
      label: `+${change.toFixed(1)}% ▲`,
      direction: 'up',
    };
  }

  if (change < 0) {
    return {
      label: `${change.toFixed(1)}% ▼`,
      direction: 'down',
    };
  }

  return { label: '0.0% —', direction: 'flat' };
}

export default function AwardsPromoBanner() {
  const [showOdds, setShowOdds] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [oddsByCategory, setOddsByCategory] =
    useState<Record<string, CategoryOdds>>({});
  const [showCompact, setShowCompact] = useState(false);
  const originalBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOdds() {
      try {
        const response = await fetch('/api/awards-predictions', {
          cache: 'no-store',
        });

        const result = (await response.json()) as ApiResult;

        if (!response.ok || result.success !== true) {
          throw new Error('Unable to load award prediction odds.');
        }

        if (!cancelled) {
          setOddsByCategory(result.categories ?? {});
        }
      } catch (error) {
        console.error('[AWARDS BANNER] Unable to load odds:', error);
      }
    }

    void loadOdds();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let rotation: ReturnType<typeof setInterval> | undefined;

    const startRotation = setTimeout(() => {
      setShowOdds(true);

      rotation = setInterval(() => {
        setActiveIndex((previous) => (previous + 1) % CATEGORIES.length);
      }, 2000);
    }, 5000);

    return () => {
      clearTimeout(startRotation);

      if (rotation) {
        clearInterval(rotation);
      }
    };
  }, []);

  useEffect(() => {
    let previousY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const bannerHeight = originalBannerRef.current?.offsetHeight ?? 174;

        if (currentY <= bannerHeight) {
          setShowCompact(false);
        } else if (currentY < previousY - 3) {
          setShowCompact(false);
        } else if (currentY > previousY + 3) {
          setShowCompact(true);
        }

        previousY = currentY;
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('eca-compact-visible', showCompact);

    return () => {
      document.documentElement.classList.remove('eca-compact-visible');
    };
  }, [showCompact]);

  const activeCategory = CATEGORIES[activeIndex];
  const categoryOdds = oddsByCategory[activeCategory.title];

  const contenders = [...(categoryOdds?.nominees ?? [])]
    .filter((contender) => contender.nominee?.trim())
    .sort(
      (a, b) =>
        (Number(b.odds) || 0) - (Number(a.odds) || 0) ||
        (Number(b.appearances) || 0) -
          (Number(a.appearances) || 0) ||
        (Number(b.points) || 0) - (Number(a.points) || 0) ||
        a.nominee.localeCompare(b.nominee)
    )
    .slice(0, 5);

  return (
    <><div className="eca-promo" ref={originalBannerRef}>
      {showOdds ? (
        <Link
          href={PREDICTIONS_URL}
          className="eca-promo-odds"
          aria-label={`${activeCategory.title} front-runners. Predict now for ECA 2026.`}
        >
          <div className="eca-promo-category">
            <span className="eca-promo-eyebrow">ECA 2026</span>
            <span className="eca-promo-category-title">
              {activeCategory.title} FRONT-RUNNERS
            </span>
          </div>

          <div className="eca-promo-contenders" aria-live="polite">
            {contenders.length > 0 ? (
              contenders.map((contender, index) => {
                const artistOnly: CategoryId[] = [
                  'artist',
                  'new-artist',
                ];

                const parsed = splitNominee(contender.nominee);
                const isArtistOnly = artistOnly.includes(activeCategory.id);
                const title = isArtistOnly
                  ? contender.nominee
                  : parsed.title;
                const artist = isArtistOnly ? '' : parsed.artist;
                const change = formatChange(contender.change);
                const percentage = getPercentage(
                  contender,
                  Number(categoryOdds?.submissionCount) || 0
                );

                return (
                  <div
                    className="eca-promo-contender"
                    key={`${activeCategory.id}-${contender.nominee}`}
                  >
                    <span className="eca-promo-rank">
                      {index + 1}
                    </span>

                    <span className="eca-promo-name">
                      <span className="eca-promo-title" title={title}>
                        {title}
                      </span>

                      {artist && (
                        <span className="eca-promo-artist" title={artist}>
                          {artist}
                        </span>
                      )}
                    </span>

                    <span className="eca-promo-metrics">
                      <span className="eca-promo-percentage">
                        {percentage.toFixed(1)}%
                      </span>

                      <span
                        className={`eca-promo-change ${change.direction}`}
                      >
                        {change.label}
                      </span>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="eca-promo-loading">
                {categoryOdds
                  ? 'Contender odds unavailable'
                  : 'Loading live prediction odds…'}
              </div>
            )}
          </div>

          <span className="eca-promo-cta">
            PREDICT NOW <span aria-hidden="true">↗</span>
          </span>
        </Link>
      ) : (
        <Link
          href={PREDICTIONS_URL}
          className="eca-promo-hero"
          aria-label="Predict the ECA 2026 nominees and winners"
        >
          <div className="eca-promo-collage" aria-hidden="true">
            <div className="eca-promo-portrait portrait-one">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRMNHAySXTsY1Vnl0CzJCxEqt8SQhhZOP4wi53nYLSng&s=10"
                alt=""
              />
            </div>

            <div className="eca-promo-portrait portrait-two">
              <img
                src="https://media.brooklynvegan.com/xxrzsfjkyw/styles/card-social/2026/06/12/Olivia-Rodrigo-by-Nick-Walker.jpeg.webp?version=6ac828a9674cb"
                alt=""
              />
            </div>

            <div className="eca-promo-portrait portrait-three">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd4LskF07lG9EpsNV1oMD1tNVi6UxVWIhmzRhhUjG3gtbx0sLZ22e4Kqlb&s=10"
                alt=""
              />
            </div>
          </div>

          <div className="eca-promo-hero-copy">
            <span className="eca-promo-hero-kicker">ECA 2026 AWARDS</span>
            <h2>
              YOUR CALL,
              <br />
              YOUR PREDICTION
            </h2>
            <p>
              PREDICT THE NOMINEES
              <br />
              AND WINNERS AT ECA 2026
            </p>
          </div>

          <span className="eca-promo-cta">
            PREDICT NOW <span aria-hidden="true">↗</span>
          </span>
        </Link>
      )}
    </div>

    <div className={`eca-compact-promo ${showCompact ? 'is-visible' : ''}`} aria-hidden={!showCompact}>
      <Link
        href={PREDICTIONS_URL}
        className="eca-compact-promo-link"
        tabIndex={showCompact ? 0 : -1}
        aria-label="ECA 2026 award predictions"
      >
        <span className="eca-compact-label">ECA 2026</span>
        {showOdds ? (
          <>
            <span className="eca-compact-category">{activeCategory.title}</span>
            <span className="eca-compact-nominees">
              {contenders.slice(0, 5).map((contender, index) => (
                <span className="eca-compact-nominee" key={`${activeCategory.id}-${contender.nominee}`}>
                  {index + 1}. {splitNominee(contender.nominee).title}
                  <strong>
                    {' '}{getPercentage(contender, Number(categoryOdds?.submissionCount) || 0).toFixed(1)}%
                  </strong>
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className="eca-compact-category">YOUR CALL, YOUR PREDICTION</span>
        )}
        <span className="eca-compact-cta">PREDICT ↗</span>
      </Link>
    </div>
    </>
  );
}
