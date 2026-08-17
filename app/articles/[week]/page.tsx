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

type ArticlePageProps = {
  params: Promise<{
    week: string;
  }>;
};

/*
 * ---------------------------------------------------------
 * GET WEEKLY HOT 100 SOURCE
 * ---------------------------------------------------------
 */

const weeklySource =
  sheetSources.find(
    (source) =>
      source.title === 'THE HOT 100'
  );

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
    '&size=1600' +
    '&background=0050FF' +
    '&color=ffffff' +
    '&bold=true' +
    '&format=png'
  );
}

/*
 * ---------------------------------------------------------
 * FORMAT ARTICLE DATE
 * ---------------------------------------------------------
 */

function formatArticleDate(
  week: string
): string {
  const parts = week
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
    return week;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  const date = new Date(
    fullYear,
    month - 1,
    day
  );

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
 * ARTICLE CARD
 * ---------------------------------------------------------
 */

function RecentArticleCard({
  week,
  payload,
}: {
  week: string;
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

  const cover =
    getCoverImage(
      payload.entries
    );

  return (
    <a
      href={`/articles/${encodeURIComponent(
        week
      )}`}
      className="group block min-w-0"
    >

      {/* COVER */}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">

        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover"
        />

      </div>

      {/* TITLE */}

      <h3 className="mt-3 font-brown-bold text-base leading-[1.08] tracking-[-0.025em] text-black transition-colors duration-150 group-hover:text-[#0050FF] sm:text-lg">
        {title}
      </h3>

      {/* DATE */}

      <p className="mt-2 font-brown-regular text-[0.58rem] uppercase tracking-[0.12em] text-black/40 sm:text-[0.62rem]">
        {formatArticleDate(
          week
        )}
      </p>

    </a>
  );
}

/*
 * ---------------------------------------------------------
 * PAGE
 * ---------------------------------------------------------
 */

export default async function ArticlePage({
  params,
}: ArticlePageProps) {
  const { week } = await params;

  const decodedWeek =
    decodeURIComponent(week);

  /*
   * Make sure the Hot 100 source exists.
   */

  if (!weeklySource) {
    throw new Error(
      'THE HOT 100 source was not found.'
    );
  }

  /*
   * -------------------------------------------------------
   * FETCH COMPLETE WEEKLY CHART DATA
   * -------------------------------------------------------
   */

  const weeklyData =
    await fetchWeeklyChartData(
      weeklySource.csvUrl,
      weeklySource.title
    );

  /*
   * -------------------------------------------------------
   * FIND CURRENT ARTICLE
   * -------------------------------------------------------
   */

  const entries =
    weeklyData.entriesByWeek[
      decodedWeek
    ] ?? [];

  /*
   * -------------------------------------------------------
   * ARTICLE NOT FOUND
   * -------------------------------------------------------
   */

  if (entries.length === 0) {
    return (
      <main className="min-h-screen bg-white px-4 pb-20 pt-28 text-black sm:px-6">

        <div className="mx-auto max-w-[900px]">

          <p className="font-brown-regular text-xs uppercase tracking-[0.14em] text-black/40">
            CHART BEAT
          </p>

          <h1 className="mt-3 font-brown-bold text-3xl tracking-[-0.03em] sm:text-5xl">
            Article Not Found
          </h1>

          <p className="mt-4 font-brown-regular text-sm leading-relaxed text-black/60 sm:text-base">
            We couldn't find an article for
            this chart week.
          </p>

          <a
            href="/articles"
            className="mt-7 inline-block font-brown-bold text-xs uppercase tracking-[0.1em] text-[#0050FF] transition-opacity hover:opacity-60"
          >
            ← BACK TO CHART BEAT
          </a>

        </div>

      </main>
    );
  }

  /*
   * -------------------------------------------------------
   * BUILD CURRENT ARTICLE PAYLOAD
   * -------------------------------------------------------
   */

  const payload: WeeklyChartPayload = {
    ...weeklyData,

    week: decodedWeek,

    entries,

    weeksAtNumberOne:
      weeklyData
        .weeksAtNumberOneByWeek[
          decodedWeek
        ] ?? 0,
  };

  /*
   * -------------------------------------------------------
   * ANALYZE CURRENT ARTICLE
   * -------------------------------------------------------
   */

  const analysis =
    analyzeWeeklyHot100(
      payload
    );

  /*
   * -------------------------------------------------------
   * ARTICLE TITLE + BODY
   * -------------------------------------------------------
   */

  const title =
    getWeeklyHot100ArticleTitle(
      analysis
    );

  const article =
    generateWeeklyHot100Article(
      analysis
    );

  /*
   * -------------------------------------------------------
   * COVER
   * -------------------------------------------------------
   */

  const cover =
    getCoverImage(entries);

  /*
   * -------------------------------------------------------
   * THREE MOST RECENT OTHER ARTICLES
   * -------------------------------------------------------
   *
   * availableWeeks is already ordered
   * newest → oldest.
   *
   * We exclude the current article,
   * then take the first three.
   */

  const recentArticles =
    weeklyData.availableWeeks
      .filter(
        (availableWeek) =>
          availableWeek !==
          decodedWeek
      )
      .slice(0, 3)
      .map(
        (recentWeek) => {

          const recentEntries =
            weeklyData
              .entriesByWeek[
              recentWeek
              ] ?? [];

          return {
            week: recentWeek,

            payload: {
              ...weeklyData,

              week: recentWeek,

              entries:
                recentEntries,

              weeksAtNumberOne:
                weeklyData
                  .weeksAtNumberOneByWeek[
                  recentWeek
                  ] ?? 0,
            },
          };
        }
      )
      .filter(
        ({
          payload:
            recentPayload,
        }) =>
          recentPayload.entries
            .length > 0
      );

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-white text-black">

      {/* =====================================================
          GLOBAL HEADER SPACE
      ====================================================== */}

      <div className="pt-[3.8rem]">

        <article className="mx-auto max-w-[1100px] px-4 pb-24 sm:px-6">

          {/* =================================================
              ARTICLE HEADER
          ================================================= */}

          <header className="mx-auto max-w-[900px] pb-7 pt-8 sm:pb-10 sm:pt-12">

            {/* SECTION */}

            <p className="font-brown-regular text-[0.62rem] uppercase tracking-[0.18em] text-black/40 sm:text-xs">
              CHART BEAT
            </p>

            {/* HEADLINE */}

            <h1 className="mt-3 font-brown-bold text-3xl leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
              {title}
            </h1>

            {/* AUTHOR + DATE */}

            <div className="mt-6 flex flex-wrap items-center gap-3">

              <span className="bg-[#0050FF] px-3 py-1.5 font-brown-bold text-[0.58rem] uppercase tracking-[0.1em] text-white">
                Elio Charts
              </span>

              <span className="font-brown-regular text-[0.62rem] uppercase tracking-[0.1em] text-black/40">
                {formatArticleDate(
                  decodedWeek
                )}
              </span>

            </div>

          </header>

          {/* =================================================
              COVER IMAGE
          ================================================= */}

          <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">

            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
            />

          </div>

          {/* =================================================
              ARTICLE BODY
          ================================================= */}

          <div className="mx-auto mt-10 max-w-[800px] sm:mt-12">

            {article
              .split('\n\n')
              .filter(
                (paragraph) =>
                  paragraph.trim()
                    .length > 0
              )
              .map(
                (
                  paragraph,
                  index
                ) => (
                  <p
                    key={index}
                    className="mb-7 font-brown-regular text-base leading-[1.7] text-black sm:mb-8 sm:text-lg sm:leading-[1.75] lg:text-xl"
                  >
                    {paragraph}
                  </p>
                )
              )}

          </div>

          {/* =================================================
              MORE CHART BEAT
          ================================================= */}

          {recentArticles.length > 0 && (

            <section className="mx-auto mt-16 max-w-[1000px] border-t border-black pt-6 sm:mt-20">

              {/* SECTION HEADER */}

              <div className="mb-6 flex items-center justify-between gap-4">

                <h2 className="font-brown-bold text-lg uppercase leading-none tracking-[-0.03em] sm:text-xl">
                  MORE CHART BEAT
                </h2>

                <a
                  href="/articles"
                  className="shrink-0 font-brown-bold text-[0.62rem] uppercase tracking-[0.12em] text-[#0050FF] transition-opacity hover:opacity-60 sm:text-xs"
                >
                  VIEW ALL →
                </a>

              </div>

              {/* THREE ARTICLES */}

              <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-5">

                {recentArticles.map(
                  ({
                    week,
                    payload:
                      recentPayload,
                  }) => (
                    <RecentArticleCard
                      key={week}
                      week={week}
                      payload={
                        recentPayload
                      }
                    />
                  )
                )}

              </div>

            </section>

          )}

        </article>

      </div>

    </main>
  );
}