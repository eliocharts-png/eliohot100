
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chart Beat',
};

export const dynamic = 'force-dynamic';

/*
 * ---------------------------------------------------------
 * HOT 100
 * ---------------------------------------------------------
 */

import {
  analyzeWeeklyHot100,
} from '@/lib/weeklyHot100Analysis';

import {
  generateWeeklyHot100Article,
  getWeeklyHot100ArticleTitle,
} from '@/lib/weeklyHot100Article';

import {
  fetchWeeklyChartData,
  sheetSources,
} from '@/lib/chartData';

import type {
  WeeklyChartPayload,
} from '@/types';

/*
 * ---------------------------------------------------------
 * TOP RECORDS
 * ---------------------------------------------------------
 */

import {
  getAlbumChartData,
} from '@/lib/albumChartData';

import type {
  AlbumChartPayload,
  AlbumWeeklyEntry,
} from '@/lib/albumChartData';

import {
  analyzeWeeklyAlbums,
} from '@/lib/weeklyAlbumAnalysis';

import {
  generateWeeklyAlbumArticle,
  getWeeklyAlbumArticleTitle,
} from '@/lib/weeklyAlbumArticle';

/*
 * ---------------------------------------------------------
 * ARTIST CHART
 * ---------------------------------------------------------
 */

import {
  fetchWeeklyArtistData,
} from '@/lib/weeklyArtistData';

import type {
  WeeklyArtistPayload,
  WeeklyArtistEntry,
} from '@/lib/weeklyArtistData';

import {
  analyzeWeeklyArtists,
} from '@/lib/weeklyArtistAnalysis';

import {
  generateWeeklyArtistArticle,
  getWeeklyArtistArticleTitle,
} from '@/lib/weeklyArtistArticle';

/*
 * ---------------------------------------------------------
 * DATE UTILITIES
 * ---------------------------------------------------------
 */

function parseChartDate(
  value: string
): Date | null {
  const trimmed = value.trim();

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    return new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  // Existing chart format: MM/DD/YY or MM/DD/YYYY
  const parts = trimmed
    .split('/')
    .map(Number);

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  if (
    !month ||
    !day ||
    year === undefined ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year)
  ) {
    return null;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : year < 100
        ? 1900 + year
        : year;

  const date = new Date(
    fullYear,
    month - 1,
    day
  );

  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/*
 * ---------------------------------------------------------
 * GET ALL AVAILABLE CHART WEEKS
 * ---------------------------------------------------------
 */

function getSortedWeeks<T>(
  entriesByWeek: Record<string, T[]>
): string[] {
  return Object.keys(entriesByWeek)
    .filter(
      (week) =>
        Array.isArray(entriesByWeek[week]) &&
        entriesByWeek[week].length > 0
    )
    .sort((a, b) => {
      const dateA = parseChartDate(a);
      const dateB = parseChartDate(b);

      if (!dateA && !dateB) {
        return b.localeCompare(a);
      }

      if (!dateA) {
        return 1;
      }

      if (!dateB) {
        return -1;
      }

      return dateB.getTime() - dateA.getTime();
    });
}

/*
 * ---------------------------------------------------------
 * RELATIVE ARTICLE TIME
 * ---------------------------------------------------------
 */

function getRelativeTime(
  week: string
): string {
  const articleDate =
    parseChartDate(week);

  if (!articleDate) {
    return '';
  }

  const now = new Date();

  const difference =
    now.getTime() -
    articleDate.getTime();

  const seconds =
    Math.floor(difference / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1
        ? 'minute'
        : 'minutes'
    } ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    } ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${
      days === 1
        ? 'day'
        : 'days'
    } ago`;
  }

  const weeks =
    Math.floor(days / 7);

  if (weeks < 5) {
    return `${weeks} ${
      weeks === 1
        ? 'week'
        : 'weeks'
    } ago`;
  }

  const months =
    Math.floor(days / 30.4375);

  if (months < 12) {
    return `${months} ${
      months === 1
        ? 'month'
        : 'months'
    } ago`;
  }

  const years =
    Math.floor(days / 365.25);

  return `${years} ${
    years === 1
      ? 'year'
      : 'years'
  } ago`;
}

/*
 * ---------------------------------------------------------
 * COVER IMAGE UTILITIES
 * ---------------------------------------------------------
 */

function getFallbackCover(
  title: string
): string {
  return (
    'https://ui-avatars.com/api/' +
    `?name=${encodeURIComponent(title)}` +
    '&size=1200' +
    '&background=0050FF' +
    '&color=ffffff' +
    '&bold=true' +
    '&format=png'
  );
}

function getHot100Cover(
  entries: WeeklyChartPayload['entries']
): string {
  const numberOne =
    entries.find(
      (entry) => entry.rank === 1
    );

  if (numberOne?.artwork) {
    return numberOne.artwork;
  }

  const topEntry = entries[0];

  if (topEntry?.artwork) {
    return topEntry.artwork;
  }

  return getFallbackCover(
    topEntry?.title ?? 'Elio Hot 100'
  );
}

function getAlbumCover(
  entries: AlbumWeeklyEntry[]
): string {
  const numberOne =
    entries.find(
      (entry) => entry.rank === 1
    );

  if (numberOne?.artwork) {
    return numberOne.artwork;
  }

  const topEntry = entries[0];

  if (topEntry?.artwork) {
    return topEntry.artwork;
  }

  return getFallbackCover(
    topEntry?.title ?? 'Top Records'
  );
}

function getArtistCover(
  entries: WeeklyArtistEntry[]
): string {
  const numberOne =
    entries.find(
      (entry) => entry.rank === 1
    );

  if (numberOne?.artwork) {
    return numberOne.artwork;
  }

  const topEntry = entries[0];

  if (topEntry?.artwork) {
    return topEntry.artwork;
  }

  return getFallbackCover(
    topEntry?.artist ?? 'Artist Chart'
  );
}

/*
 * ---------------------------------------------------------
 * ARTICLE CARD
 * ---------------------------------------------------------
 */

interface ArticleCardProps {
  category: string;
  week: string;
  href: string;
  title: string;
  cover: string;
}

function ArticleCard({
  category,
  week,
  href,
  title,
  cover,
}: ArticleCardProps) {
  const relativeTime =
    getRelativeTime(week);

  return (
    <article className="min-w-0">

      <a
        href={href}
        className="group block"
      >

        {/* 16:9 COVER */}

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">

          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
          />

        </div>

        {/* ARTICLE CATEGORY */}

        <p className="mt-3 font-brown-bold text-[0.55rem] uppercase tracking-[0.14em] text-[#0050FF] sm:text-[0.6rem]">
          {category}
        </p>

        {/* ARTICLE TITLE */}

        <h2 className="mt-1 font-brown-bold text-base leading-[1.08] tracking-[-0.025em] text-black transition-colors duration-150 group-hover:text-[#0050FF] sm:text-lg">
          {title}
        </h2>

      </a>

      {/* ARTICLE AGE */}

      {relativeTime && (
        <p className="mt-2 font-brown-regular text-[0.58rem] uppercase tracking-[0.12em] text-black/40 sm:text-[0.62rem]">
          {relativeTime}
        </p>
      )}

    </article>
  );
}

/*
 * ---------------------------------------------------------
 * ARTICLE DATA
 * ---------------------------------------------------------
 */

interface ArticleItem {
  key: string;
  category: string;
  week: string;
  href: string;
  title: string;
  cover: string;
}

/*
 * ---------------------------------------------------------
 * ARTICLES PAGE
 * ---------------------------------------------------------
 */

export default async function ArticlesPage() {

  /*
   * FETCH ALL THREE CHARTS
   */

  const weeklySource =
    sheetSources.find(
      (source) =>
        source.title === 'THE HOT 100'
    );

  if (!weeklySource) {
    throw new Error(
      'THE HOT 100 source not found'
    );
  }

  const [
    weeklyData,
    albumData,
    artistData,
  ] = await Promise.all([
    fetchWeeklyChartData(
      weeklySource.csvUrl
    ),

    getAlbumChartData(),

    fetchWeeklyArtistData(),
  ]);

  /*
   * -------------------------------------------------------
   * HOT 100 ARTICLES
   * -------------------------------------------------------
   */

  const hot100Weeks =
    getSortedWeeks(
      weeklyData.entriesByWeek
    );

  const hot100Articles: ArticleItem[] =
    hot100Weeks.flatMap(
      (week) => {
        const entries =
          weeklyData.entriesByWeek[week] ?? [];

        const payload: WeeklyChartPayload = {
          ...weeklyData,
          week,
          entries,
          weeksAtNumberOne:
            weeklyData.weeksAtNumberOneByWeek[week] ?? 0,
        };

        const analysis =
          analyzeWeeklyHot100(payload);

        const article =
          generateWeeklyHot100Article(
            analysis
          );

        if (!article) {
          return [];
        }

        return [{
          key: `hot100-${week}`,
          category: 'HOT 100',
          week,
          href: `/articles/${encodeURIComponent(week)}`,
          title: getWeeklyHot100ArticleTitle(
            analysis
          ),
          cover: getHot100Cover(entries),
        }];
      }
    );

  /*
   * -------------------------------------------------------
   * TOP RECORDS ARTICLES
   * -------------------------------------------------------
   */

  const albumWeeks =
    getSortedWeeks(
      albumData.entriesByWeek
    );

  const albumArticles: ArticleItem[] =
    albumWeeks.flatMap(
      (week) => {
        const entries =
          albumData.entriesByWeek[week] ?? [];

        const payload: AlbumChartPayload = {
          ...albumData,
          week,
          displayWeek: week,
          entries,
          weeksAtNumberOne:
            albumData.weeksAtNumberOneByWeek[week] ?? 0,
        };

        const analysis =
          analyzeWeeklyAlbums(payload);

        const article =
          generateWeeklyAlbumArticle(
            analysis
          );

        if (!article) {
          return [];
        }

        return [{
          key: `albums-${week}`,
          category: 'TOP RECORDS',
          week,
          href: `/articles/albums/${encodeURIComponent(week)}`,
          title: getWeeklyAlbumArticleTitle(
            analysis
          ),
          cover: getAlbumCover(entries),
        }];
      }
    );

  /*
   * -------------------------------------------------------
   * ARTIST CHART ARTICLES
   * -------------------------------------------------------
   */

  const artistWeeks =
    getSortedWeeks(
      artistData.entriesByWeek
    );

  const artistArticles: ArticleItem[] =
    artistWeeks.flatMap(
      (week) => {
        const entries =
          artistData.entriesByWeek[week] ?? [];

        const payload: WeeklyArtistPayload = {
          ...artistData,
          week,
          displayWeek: week,
          entries,
        };

        const analysis =
          analyzeWeeklyArtists(payload);

        const article =
          generateWeeklyArtistArticle(
            analysis
          );

        if (!article) {
          return [];
        }

        return [{
          key: `artists-${week}`,
          category: 'ARTIST CHART',
          week,
          href: `/articles/artists/${encodeURIComponent(week)}`,
          title: getWeeklyArtistArticleTitle(
            analysis
          ),
          cover: getArtistCover(entries),
        }];
      }
    );

  /*
   * -------------------------------------------------------
   * COMBINE ARTICLES
   *
   * Sort by week first, then chart category:
   * 1. HOT 100
   * 2. TOP RECORDS
   * 3. ARTIST CHART
   *
   * Newest weeks appear first.
   * -------------------------------------------------------
   */

  const categoryOrder: Record<string, number> = {
    'HOT 100': 0,
    'TOP RECORDS': 1,
    'ARTIST CHART': 2,
  };

  const articles: ArticleItem[] = [
    ...hot100Articles,
    ...albumArticles,
    ...artistArticles,
  ].sort((a, b) => {
    const dateA = parseChartDate(a.week);
    const dateB = parseChartDate(b.week);

    if (dateA && dateB) {
      const dateDifference =
        dateB.getTime() - dateA.getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }
    }

    if (!dateA && dateB) {
      return 1;
    }

    if (dateA && !dateB) {
      return -1;
    }

    return (
      categoryOrder[a.category] -
      categoryOrder[b.category]
    );
  });

  /*
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-white text-black">

      <div className="pt-[3.8rem]">

        <div className="mx-auto max-w-[1360px] px-3 sm:px-6">

          {/* PAGE HEADER */}

          <header className="pb-8 pt-8 sm:pb-12 sm:pt-12">

            <div className="flex items-end justify-between gap-6">

              <div>

                <p className="font-brown-regular text-[0.6rem] uppercase tracking-[0.16em] text-black/40 sm:text-xs">
                  ELIO CHARTS
                </p>

                <h1 className="mt-2 font-brown-bold text-[2.2rem] uppercase leading-[0.88] tracking-[-0.07em] text-black sm:text-[5.5rem]">
                  CHART BEAT
                </h1>

                <p className="mt-3 max-w-xl font-brown-regular text-xs leading-relaxed text-black/50 sm:text-sm">
                  Weekly stories, movements and
                  milestones from the Elio Charts.
                </p>

              </div>

              {/* HOME */}

              <a
                href="/"
                className="hidden shrink-0 font-brown-bold text-xs uppercase tracking-[0.12em] text-[#0050FF] transition-opacity hover:opacity-60 sm:block"
              >
                ← HOME
              </a>

            </div>

          </header>

          {/* ARTICLES */}

          {articles.length > 0 ? (

            <div className="grid grid-cols-3 gap-x-3 gap-y-8 pb-14 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

              {articles.map((article) => (
                <ArticleCard
                  key={article.key}
                  category={article.category}
                  week={article.week}
                  href={article.href}
                  title={article.title}
                  cover={article.cover}
                />
              ))}

            </div>

          ) : (

            <div className="py-20 text-center">

              <p className="font-brown-regular text-xs uppercase tracking-[0.14em] text-black/40">
                NO ARTICLES AVAILABLE
              </p>

            </div>

          )}

        </div>

      </div>

    </main>
  );
}
