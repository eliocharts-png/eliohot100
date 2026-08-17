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
    analyzeWeeklyHot100(
      payload
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

      {/* =================================================
          CLICKABLE ARTICLE
      ================================================= */}

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
          />

        </div>

        {/* =================================================
            ARTICLE TITLE
        ================================================= */}

        <h2 className="mt-3 font-brown-bold text-base leading-[1.08] tracking-[-0.025em] text-black transition-colors duration-150 group-hover:text-[#0050FF] sm:text-lg">
          {title}
        </h2>

      </a>

      {/* =================================================
          ARTICLE AGE
      ================================================= */}

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
 * ARTICLES PAGE
 * ---------------------------------------------------------
 */

export default async function ArticlesPage() {

  /*
   * Find THE HOT 100 source from the
   * existing chart source configuration.
   */

  const weeklySource =
    sheetSources.find(
      (source) =>
        source.title ===
        'THE HOT 100'
    );

  if (!weeklySource) {
    throw new Error(
      'THE HOT 100 source not found'
    );
  }

  /*
   * Fetch the complete weekly chart
   * history.
   */

  const weeklyData =
    await fetchWeeklyChartData(
      weeklySource.csvUrl
    );

  /*
   * Build an article payload for
   * every available chart week.
   *
   * availableWeeks is already sorted
   * newest → oldest.
   */

  const articles =
    weeklyData.availableWeeks
      .map(
        (week) => {

          const entries =
            weeklyData
              .entriesByWeek[
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
        }
      )
      .filter(
        ({
          payload,
        }) =>
          payload.entries
            .length > 0
      );

  return (
    <main className="min-h-screen bg-white text-black">

      {/* =================================================
          GLOBAL HEADER SPACE
      ================================================= */}

      <div className="pt-[3.8rem]">

        <div className="mx-auto max-w-[1360px] px-3 sm:px-6">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <header className="pb-8 pt-8 sm:pb-12 sm:pt-12">

            <div className="flex items-end justify-between gap-6">

              <div>

                <p className="font-brown-regular text-[0.6rem] uppercase tracking-[0.16em] text-black/40 sm:text-xs">
                  ELIO CHARTS
                </p>

                <h1 className="mt-2 font-brown-bold text-[3.2rem] uppercase leading-[0.88] tracking-[-0.07em] text-black sm:text-[5.5rem]">
                  CHART BEAT
                </h1>

                <p className="mt-3 max-w-xl font-brown-regular text-xs leading-relaxed text-black/50 sm:text-sm">
                  Weekly stories, movements and
                  milestones from the Elio Hot 100.
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

          {/* =================================================
              ARTICLES
          ================================================= */}

          {articles.length > 0 ? (

            <div className="grid grid-cols-1 gap-x-5 gap-y-10 pb-14 sm:grid-cols-2 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

              {articles.map(
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