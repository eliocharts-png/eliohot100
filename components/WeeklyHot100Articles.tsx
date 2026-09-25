'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
 * MEDIUM ARTICLE
 * ---------------------------------------------------------
 */

type MediumArticle = {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string;
};

/*
 * ---------------------------------------------------------
 * ARTICLE DATE
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

/*
 * ---------------------------------------------------------
 * PUBLISHED DATE
 * ---------------------------------------------------------
 */

function formatPublishedDate(
  date: Date
): string {
  return date.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

/*
 * ---------------------------------------------------------
 * RELATIVE ARTICLE TIME
 * ---------------------------------------------------------
 *
 * Under 1 minute:
 *   just now
 *
 * Under 1 hour:
 *   X minutes ago
 *
 * Under 24 hours:
 *   X hours ago
 *
 * 1–3 days:
 *   X day(s) ago
 *
 * Older than 3 days:
 *   Published date
 * ---------------------------------------------------------
 */

function getRelativeTime(
  date: Date
): string {
  const now = new Date();

  const difference =
    now.getTime() -
    date.getTime();

  /*
   * If the date is somehow in the future,
   * avoid displaying negative time.
   */
  if (difference < 0) {
    return 'just now';
  }

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

  if (days <= 3) {
    return `${days} ${
      days === 1
        ? 'day'
        : 'days'
    } ago`;
  }

  return formatPublishedDate(
    date
  );
}

/*
 * ---------------------------------------------------------
 * MEDIUM DATE
 * ---------------------------------------------------------
 */

function parseMediumDate(
  value: string
): Date | null {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/*
 * ---------------------------------------------------------
 * MEDIUM COVER IMAGE
 * ---------------------------------------------------------
 */

function getMediumThumbnail(
  item: any
): string {
  if (
    typeof item.thumbnail ===
      'string' &&
    item.thumbnail
  ) {
    return item.thumbnail;
  }

  if (
    typeof item.description ===
      'string'
  ) {
    const imageMatch =
      item.description.match(
        /<img[^>]+src=["']([^"']+)["']/i
      );

    if (
      imageMatch?.[1]
    ) {
      return imageMatch[1];
    }
  }

  return (
    'https://ui-avatars.com/api/' +
    `?name=${encodeURIComponent(
      item.title ??
        'Medium'
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
 * FETCH MEDIUM ARTICLES
 * ---------------------------------------------------------
 */

async function fetchMediumArticles(): Promise<
  MediumArticle[]
> {
  const feedUrl =
    'https://medium.com/feed/@eliocharts';

  const apiUrl =
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
      feedUrl
    )}`;

  const response =
    await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `Medium request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    data.status !== 'ok' ||
    !Array.isArray(data.items)
  ) {
    throw new Error(
      'Invalid Medium feed'
    );
  }

  return data.items
    .map(
      (item: any) => ({
        title:
          String(
            item.title ?? ''
          ).trim(),

        link:
          String(
            item.link ?? ''
          ).trim(),

        pubDate:
          String(
            item.pubDate ?? ''
          ).trim(),

        thumbnail:
          getMediumThumbnail(
            item
          ),
      })
    )
    .filter(
      (
        article: MediumArticle
      ) =>
        article.title &&
        article.link &&
        article.pubDate
    );
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
 * WEEKLY ARTICLE CARD
 * ---------------------------------------------------------
 */

function WeeklyArticleCard({
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

  const articleDate =
    parseChartDate(
      payload.week
    );

  const relativeTime =
    articleDate
      ? getRelativeTime(
          articleDate
        )
      : '';

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
 * MEDIUM ARTICLE CARD
 * ---------------------------------------------------------
 */

function MediumArticleCard({
  article,
}: {
  article: MediumArticle;
}) {
  const articleDate =
    parseMediumDate(
      article.pubDate
    );

  const relativeTime =
    articleDate
      ? getRelativeTime(
          articleDate
        )
      : '';

  return (
    <article className="min-w-0">

      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >

        {/* =================================================
            16:9 COVER
        ================================================= */}

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">

          <img
            src={article.thumbnail}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            onError={(event) => {
              const image =
                event.currentTarget;

              image.src =
                'https://ui-avatars.com/api/' +
                `?name=${encodeURIComponent(
                  article.title
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
          {article.title}
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
  const [
    mediumArticles,
    setMediumArticles,
  ] = useState<
    MediumArticle[]
  >([]);

  /*
   * -------------------------------------------------------
   * LOAD MEDIUM
   * -------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadMediumArticles() {
      try {
        const articles =
          await fetchMediumArticles();

        if (!cancelled) {
          setMediumArticles(
            articles
          );
        }
      } catch (error) {
        console.error(
          'Failed to load Medium articles:',
          error
        );

        if (!cancelled) {
          setMediumArticles(
            []
          );
        }
      }
    }

    void loadMediumArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * -------------------------------------------------------
   * WEEKLY HOT 100 ARTICLES
   * -------------------------------------------------------
   */

  const recentWeeks =
    useMemo(() => {
      return weeklyData.availableWeeks
        .slice(0, 3)
        .map((week) => {
          const entries =
            weeklyData.entriesByWeek[
              week
            ] ?? [];

          const articleDate =
            parseChartDate(
              week
            );

          return {
            week,
            date:
              articleDate ??
              new Date(0),
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

  /*
   * -------------------------------------------------------
   * COMBINE + SORT ARTICLES
   * -------------------------------------------------------
   *
   * Medium articles and generated Chart Beat articles
   * are treated as one feed.
   *
   * Newest published article appears first.
   */

  const combinedArticles =
    useMemo(() => {
      const weeklyArticles =
        recentWeeks.map(
          ({
            week,
            date,
            payload,
          }) => ({
            type: 'weekly' as const,
            date,
            week,
            payload,
          })
        );

      const medium =
        mediumArticles
          .map(
            (article) => ({
              type: 'medium' as const,
              date:
                parseMediumDate(
                  article.pubDate
                ) ??
                new Date(0),
              article,
            })
          );

      return [
        ...weeklyArticles,
        ...medium,
      ]
        .sort(
          (a, b) =>
            b.date.getTime() -
            a.date.getTime()
        )
        .slice(0, 3);
    }, [
      recentWeeks,
      mediumArticles,
    ]);

  if (
    combinedArticles.length === 0
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

        {combinedArticles.map(
          (item) => {

            if (
              item.type ===
              'medium'
            ) {
              return (
                <MediumArticleCard
                  key={`medium-${item.article.link}`}
                  article={
                    item.article
                  }
                />
              );
            }

            return (
              <WeeklyArticleCard
                key={`weekly-${item.week}`}
                payload={
                  item.payload
                }
              />
            );
          }
        )}

      </div>

    </section>
  );
}