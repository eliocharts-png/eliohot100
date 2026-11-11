
'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  analyzeWeeklyHot100,
} from '@/lib/weeklyHot100Analysis';

import {
  generateWeeklyHot100Article,
  getWeeklyHot100ArticleTitle,
} from '@/lib/weeklyHot100Article';

import {
  getAlbumChartData,
  type AlbumChartPayload,
} from '@/lib/albumChartData';

import {
  analyzeWeeklyAlbums,
} from '@/lib/weeklyAlbumAnalysis';

import {
  generateWeeklyAlbumArticle,
  getWeeklyAlbumArticleTitle,
} from '@/lib/weeklyAlbumArticle';

import {
  fetchWeeklyArtistData,
  type WeeklyArtistPayload,
} from '@/lib/weeklyArtistData';

import {
  analyzeWeeklyArtists,
} from '@/lib/weeklyArtistAnalysis';

import {
  generateWeeklyArtistArticle,
  getWeeklyArtistArticleTitle,
} from '@/lib/weeklyArtistArticle';

import type {
  WeeklyChartPayload,
} from '@/types';

/* =========================================================
   TYPES
========================================================= */

type WeeklyHot100ArticlesProps = {
  weeklyData: WeeklyChartPayload;
};

type GeneratedArticle = {
  type: 'generated';
  id: string;
  title: string;
  href: string;
  cover: string;
  date: Date;
};

/* =========================================================
   DATE HELPERS
========================================================= */

function parseChartDate(value: string): Date | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  const parts = value.split('/').map(Number);

  if (parts.length !== 3) return null;

  const [month, day, year] = parts;

  if (!month || !day || year === undefined) {
    return null;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : year < 100
        ? 1900 + year
        : year;

  return new Date(fullYear, month - 1, day);
}

function formatArticleDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRelativeTime(date: Date): string {
  const difference = Date.now() - date.getTime();

  if (difference < 0) return 'just now';

  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days <= 3) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return formatArticleDate(date);
}

/* =========================================================
   COVER IMAGES
========================================================= */

function getFallbackImage(title: string): string {
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

function getCoverImage(
  entries: Array<{
    rank: number;
    artwork?: string;
    title?: string;
    artist?: string;
  }>,
  fallbackTitle: string,
): string {
  const numberOne = entries.find((entry) => entry.rank === 1);
  const topEntry = numberOne ?? entries[0];

  if (topEntry?.artwork) {
    return topEntry.artwork;
  }

  return getFallbackImage(
    topEntry?.title ??
      topEntry?.artist ??
      fallbackTitle,
  );
}

/* =========================================================
   ARTICLE CARD
========================================================= */

function ArticleCard({
  title,
  href,
  cover,
  date,
}: {
  title: string;
  href: string;
  cover: string;
  date: Date;
}) {
  return (
    <article className="min-w-0">
      <a href={href} className="group block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            onError={(event) => {
              event.currentTarget.src = getFallbackImage(title);
            }}
          />
        </div>

        <h3 className="mt-3 font-brown-bold text-base leading-[1.08] tracking-[-0.025em] text-black transition-colors duration-150 group-hover:text-[#0050FF] sm:text-lg">
          {title}
        </h3>

        <p className="mt-2 font-brown-regular text-[0.58rem] uppercase tracking-[0.12em] text-black/40 sm:text-[0.62rem]">
          {getRelativeTime(date)}
        </p>
      </a>
    </article>
  );
}

/* =========================================================
   CHART BEAT
========================================================= */

export default function WeeklyHot100Articles({
  weeklyData,
}: WeeklyHot100ArticlesProps) {
  const [albumData, setAlbumData] =
    useState<AlbumChartPayload | null>(null);

  const [artistData, setArtistData] =
    useState<WeeklyArtistPayload | null>(null);

  /* =========================================================
     LOAD TOP RECORDS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAlbums() {
      try {
        const data = await getAlbumChartData();

        if (!cancelled) {
          setAlbumData(data);
        }
      } catch (error) {
        console.error(
          'Failed to load TOP RECORDS articles:',
          error,
        );
      }
    }

    void loadAlbums();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD ARTIST CHART
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      try {
        const data = await fetchWeeklyArtistData();

        if (!cancelled) {
          setArtistData(data);
        }
      } catch (error) {
        console.error(
          'Failed to load ARTIST CHART articles:',
          error,
        );
      }
    }

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     GENERATE LATEST HOT 100 ARTICLE
  ========================================================= */

  const hot100Article = useMemo<GeneratedArticle | null>(() => {
    const week = weeklyData.availableWeeks[0];

    if (!week) return null;

    const entries = weeklyData.entriesByWeek[week] ?? [];

    if (entries.length === 0) return null;

    const payload = {
      ...weeklyData,
      week,
      entries,
      weeksAtNumberOne:
        weeklyData.weeksAtNumberOneByWeek[week] ?? 0,
    };

    const analysis = analyzeWeeklyHot100(payload);
    const article = generateWeeklyHot100Article(analysis);

    if (!article) return null;

    const date = parseChartDate(week);

    if (!date) return null;

    return {
      type: 'generated',
      id: `hot100-${week}`,
      title: getWeeklyHot100ArticleTitle(analysis),
      href: `/articles/${encodeURIComponent(week)}`,
      cover: getCoverImage(entries, 'Elio Hot 100'),
      date,
    };
  }, [weeklyData]);

  /* =========================================================
     GENERATE LATEST TOP RECORDS ARTICLE
  ========================================================= */

  const albumArticle = useMemo<GeneratedArticle | null>(() => {
    if (!albumData) return null;

    const week = albumData.availableWeeks[0];

    if (!week) return null;

    const entries = albumData.entriesByWeek[week] ?? [];

    if (entries.length === 0) return null;

    const payload = {
      ...albumData,
      week,
      displayWeek: formatArticleDate(
        parseChartDate(week) ?? new Date(),
      ),
      entries,
      weeksAtNumberOne:
        albumData.weeksAtNumberOneByWeek[week] ?? 0,
    };

    const analysis = analyzeWeeklyAlbums(payload);
    const article = generateWeeklyAlbumArticle(analysis);

    if (!article) return null;

    const date = parseChartDate(week);

    if (!date) return null;

    return {
      type: 'generated',
      id: `albums-${week}`,
      title: getWeeklyAlbumArticleTitle(analysis),
      href: `/articles/albums/${encodeURIComponent(week)}`,
      cover: getCoverImage(entries, 'Top Records'),
      date,
    };
  }, [albumData]);

  /* =========================================================
     GENERATE LATEST ARTIST CHART ARTICLE
  ========================================================= */

  const artistArticle = useMemo<GeneratedArticle | null>(() => {
    if (!artistData) return null;

    const week = artistData.availableWeeks[0];

    if (!week) return null;

    const entries = artistData.entriesByWeek[week] ?? [];

    if (entries.length === 0) return null;

    const payload = {
      ...artistData,
      week,
      displayWeek: formatArticleDate(
        parseChartDate(week) ?? new Date(),
      ),
      entries,
    };

    const analysis = analyzeWeeklyArtists(payload);
    const article = generateWeeklyArtistArticle(analysis);

    if (!article) return null;

    const date = parseChartDate(week);

    if (!date) return null;

    return {
      type: 'generated',
      id: `artists-${week}`,
      title: getWeeklyArtistArticleTitle(analysis),
      href: `/articles/artists/${encodeURIComponent(week)}`,
      cover: getCoverImage(entries, 'Artist Chart'),
      date,
    };
  }, [artistData]);

  /* =========================================================
     COMBINE ARTICLES
  ========================================================= */

  const combinedArticles = useMemo<GeneratedArticle[]>(() => {
    return [
      hot100Article,
      albumArticle,
      artistArticle,
    ]
      .filter(
        (article): article is GeneratedArticle =>
          article !== null,
      )
      .sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      );
  }, [
    hot100Article,
    albumArticle,
    artistArticle,
  ]);

  if (combinedArticles.length === 0) {
    return null;
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-5 flex items-end justify-between border-b border-black pb-2">
        <div>
          <h2 className="font-brown-bold text-lg uppercase leading-none tracking-[-0.03em] text-black sm:text-xl">
            CHART BEAT
          </h2>

          <p className="mt-1 font-brown-regular text-[0.55rem] uppercase tracking-[0.12em] text-black/40">
            LATEST CHART STORIES
          </p>
        </div>

        <a
          href="/articles"
          className="font-brown-bold text-[0.62rem] uppercase tracking-[0.12em] text-black transition-colors duration-150 hover:text-[#0050FF] sm:text-xs"
        >
          MORE
        </a>
      </div>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {combinedArticles.map((item) => (
          <ArticleCard
            key={item.id}
            title={item.title}
            href={item.href}
            cover={item.cover}
            date={item.date}
          />
        ))}
      </div>
    </section>
  );
}
