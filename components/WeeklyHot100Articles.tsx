'use client';

import { useMemo } from 'react';

import {
  analyzeWeeklyHot100,
} from '@/lib/weeklyHot100Analysis';

import {
  generateWeeklyHot100Article,
  getWeeklyHot100ArticleTitle,
} from '@/lib/weeklyHot100Article';

import type {
  WeeklyChartPayload,
} from '@/types';

type WeeklyHot100ArticlesProps = {
  weeklyData: WeeklyChartPayload;
};

/*
 * ---------------------------------------------------------
 * RELATIVE ARTICLE TIME
 * ---------------------------------------------------------
 */

function parseChartDate(
  value: string
): Date | null {
  const parts = value
    .split('/')
    .map(Number);

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  if (
    !month ||
    !day ||
    year === undefined
  ) {
    return null;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  return new Date(
    fullYear,
    month - 1,
    day
  );
}

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
    Math.floor(
      difference / 1000
    );

  if (seconds < 60) {
    return 'just now';
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1
        ? 'minute'
        : 'minutes'
    } ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    } ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days} ${
      days === 1
        ? 'day'
        : 'days'
    } ago`;
  }

  const weeks =
    Math.floor(
      days / 7
    );

  if (weeks < 5) {
    return `${weeks} ${
      weeks === 1
        ? 'week'
        : 'weeks'
    } ago`;
  }

  const months =
    Math.floor(
      days / 30.4375
    );

  if (months < 12) {
    return `${months} ${
      months === 1
        ? 'month'
        : 'months'
    } ago`;
  }

  const years =
    Math.floor(
      days / 365.25
    );

  return `${years} ${
    years === 1
      ? 'year'
      : 'years'
  } ago`;
}

/*
 * ---------------------------------------------------------
 * COVER IMAGE
 * ---------------------------------------------------------
 */

function getCoverImage(
  entries: WeeklyChartPayload['entries']
): string {
  const numberOne =
    entries.find(
      (entry) =>
        entry.rank === 1
    );

  if (numberOne?.artwork) {
    return numberOne.artwork;
  }

  const topEntry =
    entries[0];

  if (topEntry?.artwork) {
    return topEntry.artwork;
  }

  const title =
    topEntry?.title ??
    'Elio Hot 100';

  return (
    'https://ui-avatars.com/api/' +
    `?name=${encodeURIComponent(
      title
    )}` +
    '&size=1200' +
    '&background=0050FF' +
    '&color=ffffff' +
    '&bold=true' +
    '&format=png'
  );
}

/*
 * ---------------------------------------------------------
 * ARTICLE CARD
 * ---------------------------------------------------------
 */

function ArticleCard({
  payload,
}: {
  payload: WeeklyChartPayload;
}) {
  const analysis =
    useMemo(
      () =>
        analyzeWeeklyHot100(
          payload
        ),
      [payload]
    );

  const title =
    getWeeklyHot100ArticleTitle(
      analysis
    );

  const article =
    generateWeeklyHot100Article(
      analysis
    );

  const cover =
    getCoverImage(
      payload.entries
    );

  const relativeTime =
    getRelativeTime(
      payload.week
    );

  if (!article) {
    return null;
  }

  return (
    <article className="min-w-0">

      <a
        href={`/articles/${encodeURIComponent(
          payload.week
        )}`}
        className="group block"
      >

        {/* =================================================
            16:9 COVER
        ================================================= */}

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">

          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            onError={(event) => {
              const image =
                event.currentTarget;

              image.src =
                'https://ui-avatars.com/api/' +
                `?name=${encodeURIComponent(
                  title
                )}` +
                '&size=1200' +
                '&background=0050FF' +
                '&color=ffffff' +
                '&bold=true' +
                '&format=png';
            }}
          />

        </div>

        {/* =================================================
            ARTICLE TITLE
        ================================================= */}

        <h3 className="mt-3 font-brown-bold text-base leading-[1.08] tracking-[-0.025em] text-black transition-colors duration-150 group-hover:text-[#0050FF] sm:text-lg">
          {title}
        </h3>

        {/* =================================================
            ARTICLE AGE
        ================================================= */}

        {relativeTime && (
          <p className="mt-2 font-brown-regular text-[0.58rem] uppercase tracking-[0.12em] text-black/40 sm:text-[0.62rem]">
            {relativeTime}
          </p>
        )}

      </a>

    </article>
  );
}

/*
 * ---------------------------------------------------------
 * CHART BEAT
 * ---------------------------------------------------------
 */

export default function WeeklyHot100Articles({
  weeklyData,
}: WeeklyHot100ArticlesProps) {
  const recentWeeks =
    useMemo(() => {
      return weeklyData.availableWeeks
        .slice(0, 3)
        .map((week) => {
          const entries =
            weeklyData.entriesByWeek[
              week
            ] ?? [];

          return {
            week,
            payload: {
              ...weeklyData,
              week,
              entries,
              weeksAtNumberOne:
                weeklyData
                  .weeksAtNumberOneByWeek[
                  week
                ] ?? 0,
            },
          };
        });
    }, [weeklyData]);

  if (
    recentWeeks.length === 0
  ) {
    return null;
  }

  return (
    <section className="mt-10 sm:mt-14">

      {/* =================================================
          SECTION HEADER
      ================================================= */}

      <div className="mb-5 flex items-end justify-between border-b border-black pb-2">

        <div>

          <h2 className="font-brown-bold text-lg uppercase leading-none tracking-[-0.03em] text-black sm:text-xl">
            CHART BEAT
          </h2>

          <p className="mt-1 font-brown-regular text-[0.55rem] uppercase tracking-[0.12em] text-black/40">
            LATEST CHART STORIES
          </p>

        </div>

        {/* =================================================
            MORE BUTTON
        ================================================= */}

        <a
          href="/articles"
          className="font-brown-bold text-[0.62rem] uppercase tracking-[0.12em] text-black transition-colors duration-150 hover:text-[#0050FF] sm:text-xs"
        >
          MORE
        </a>

      </div>

      {/* =================================================
          ARTICLES
      ================================================= */}

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">

        {recentWeeks.map(
          ({
            week,
            payload,
          }) => (
            <ArticleCard
              key={week}
              payload={payload}
            />
          )
        )}

      </div>

    </section>
  );
}