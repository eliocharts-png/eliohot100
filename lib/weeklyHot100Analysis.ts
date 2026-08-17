import type {
  WeeklyChartEntry,
  WeeklyChartPayload,
} from '@/types';

export interface ChartMover {
  entry: WeeklyChartEntry;
  movement: number;
}

export interface PointMover {
  entry: WeeklyChartEntry;
  pointChange: number;
}

export interface NewPeak {
  entry: WeeklyChartEntry;
  previousPeak: number | null;
}

export interface WeeklyHot100Analysis {
  week: string;
  displayWeek: string;

  numberOne: WeeklyChartEntry | null;
  weeksAtNumberOne: number;

  top10: WeeklyChartEntry[];
  top5: WeeklyChartEntry[];

  biggestClimber: ChartMover | null;
  biggestTop10Climber: ChartMover | null;
  biggestPointGainer: PointMover | null;

  top10Entries: WeeklyChartEntry[];
  debuts: WeeklyChartEntry[];
  reentries: WeeklyChartEntry[];

  newPeaks: NewPeak[];

  momentumSongs: ChartMover[];
  majorDrops: ChartMover[];

  notableSongs: WeeklyChartEntry[];

  totalSongs: number;
}

/*
 * ---------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------
 */

function getRankMovement(
  entry: WeeklyChartEntry
): number {
  if (
    entry.lastWeekRank === null
  ) {
    return 0;
  }

  return (
    entry.lastWeekRank -
    entry.rank
  );
}

function getPointChange(
  entry: WeeklyChartEntry
): number {
  if (
    entry.points === undefined ||
    entry.lastWeekPoints === undefined
  ) {
    return 0;
  }

  return (
    entry.points -
    entry.lastWeekPoints
  );
}

/*
 * ---------------------------------------------------------
 * TOP 10 ENTRIES
 * ---------------------------------------------------------
 *
 * A song is considered a Top 10 entry if:
 *
 * - it is currently inside the Top 10
 * - and it was either outside the Top 10 last week
 *   or did not appear last week.
 */

function findTop10Entries(
  entries: WeeklyChartEntry[]
): WeeklyChartEntry[] {
  return entries.filter(
    (entry) => {
      if (entry.rank > 10) {
        return false;
      }

      if (
        entry.lastWeekRank === null
      ) {
        return true;
      }

      return (
        entry.lastWeekRank > 10
      );
    }
  );
}

/*
 * ---------------------------------------------------------
 * DEBUTS
 * ---------------------------------------------------------
 */

function findDebuts(
  entries: WeeklyChartEntry[]
): WeeklyChartEntry[] {
  return entries.filter(
    (entry) =>
      entry.movementIcon ===
      'debut'
  );
}

/*
 * ---------------------------------------------------------
 * RE-ENTRIES
 * ---------------------------------------------------------
 */

function findReentries(
  entries: WeeklyChartEntry[]
): WeeklyChartEntry[] {
  return entries.filter(
    (entry) =>
      entry.movementIcon ===
      'reentry'
  );
}

/*
 * ---------------------------------------------------------
 * NEW PEAKS
 * ---------------------------------------------------------
 *
 * Because peakPosition already includes the
 * current week's rank, we can determine whether
 * the current position is a new career peak by
 * looking at the chart history before this week.
 */

function findNewPeaks(
  entries: WeeklyChartEntry[]
): NewPeak[] {
  return entries
    .filter(
      (entry) =>
        entry.chartHistory.length >
        0
    )
    .map(
      (entry): NewPeak | null => {
        const previousHistory =
          entry.chartHistory.filter(
            (history) =>
              history.week !==
              entry.week
          );

        if (
          previousHistory.length ===
          0
        ) {
          return null;
        }

        const previousPeak =
          previousHistory.reduce(
            (
              peak,
              history
            ) =>
              Math.min(
                peak,
                history.rank
              ),
            Infinity
          );

        if (
          entry.rank <
          previousPeak
        ) {
          return {
            entry,
            previousPeak,
          };
        }

        return null;
      }
    )
    .filter(
      (
        item
      ): item is NewPeak =>
        item !== null
    )
    .sort(
      (a, b) =>
        a.entry.rank -
        b.entry.rank
    );
}

/*
 * ---------------------------------------------------------
 * BIGGEST CLIMBERS
 * ---------------------------------------------------------
 */

function findBiggestClimber(
  entries: WeeklyChartEntry[]
): ChartMover | null {
  const movers =
    entries
      .filter(
        (entry) =>
          entry.lastWeekRank !==
            null &&
          entry.lastWeekRank >
            entry.rank
      )
      .map(
        (entry) => ({
          entry,
          movement:
            getRankMovement(
              entry
            ),
        })
      )
      .sort(
        (a, b) =>
          b.movement -
          a.movement
      );

  return movers[0] ?? null;
}

/*
 * ---------------------------------------------------------
 * BIGGEST TOP 10 CLIMBER
 * ---------------------------------------------------------
 */

function findBiggestTop10Climber(
  entries: WeeklyChartEntry[]
): ChartMover | null {
  const movers =
    entries
      .filter(
        (entry) =>
          entry.rank <= 10 &&
          entry.lastWeekRank !==
            null &&
          entry.lastWeekRank >
            entry.rank
      )
      .map(
        (entry) => ({
          entry,
          movement:
            getRankMovement(
              entry
            ),
        })
      )
      .sort(
        (a, b) =>
          b.movement -
          a.movement
      );

  return movers[0] ?? null;
}

/*
 * ---------------------------------------------------------
 * BIGGEST POINT GAINER
 * ---------------------------------------------------------
 */

function findBiggestPointGainer(
  entries: WeeklyChartEntry[]
): PointMover | null {
  const gainers =
    entries
      .filter(
        (entry) =>
          entry.points !==
            undefined &&
          entry.lastWeekPoints !==
            undefined
      )
      .map(
        (entry) => ({
          entry,
          pointChange:
            getPointChange(
              entry
            ),
        })
      )
      .filter(
        (item) =>
          item.pointChange > 0
      )
      .sort(
        (a, b) =>
          b.pointChange -
          a.pointChange
      );

  return gainers[0] ?? null;
}

/*
 * ---------------------------------------------------------
 * MOMENTUM SONGS
 * ---------------------------------------------------------
 *
 * These are songs outside the Top 10 that:
 *
 * - are moving upward
 * - have been on the chart for at least
 *   two weeks
 *
 * We use them later to talk about
 * "upcoming hits."
 */

function findMomentumSongs(
  entries: WeeklyChartEntry[]
): ChartMover[] {
  return entries
    .filter(
      (entry) =>
        entry.rank > 10 &&
        entry.lastWeekRank !==
          null &&
        entry.lastWeekRank >
          entry.rank &&
        entry.weeksOnChart >= 2
    )
    .map(
      (entry) => ({
        entry,
        movement:
          getRankMovement(
            entry
          ),
      })
    )
    .sort(
      (a, b) =>
        b.movement -
        a.movement
    )
    .slice(0, 5);
}

/*
 * ---------------------------------------------------------
 * MAJOR DROPS
 * ---------------------------------------------------------
 */

function findMajorDrops(
  entries: WeeklyChartEntry[]
): ChartMover[] {
  return entries
    .filter(
      (entry) =>
        entry.lastWeekRank !==
          null &&
        entry.rank >
          entry.lastWeekRank
    )
    .map(
      (entry) => ({
        entry,
        movement:
          entry.rank -
          (entry.lastWeekRank ??
            entry.rank),
      })
    )
    .sort(
      (a, b) =>
        b.movement -
        a.movement
    )
    .slice(0, 5);
}

/*
 * ---------------------------------------------------------
 * NOTABLE SONGS
 * ---------------------------------------------------------
 *
 * These are songs that are likely to be
 * useful when constructing the article.
 *
 * We don't necessarily mention all of them.
 * The article-writing layer will decide
 * what is actually interesting.
 */

function findNotableSongs(
  entries: WeeklyChartEntry[],
  top10Entries: WeeklyChartEntry[],
  debuts: WeeklyChartEntry[],
  reentries: WeeklyChartEntry[],
  newPeaks: NewPeak[],
  momentumSongs: ChartMover[]
): WeeklyChartEntry[] {
  const notable =
    new Map<
      string,
      WeeklyChartEntry
    >();

  const add = (
    entry: WeeklyChartEntry
  ) => {
    const key =
      `${entry.title}|||${entry.artist}`;

    notable.set(
      key,
      entry
    );
  };

  for (const entry of top10Entries) {
    add(entry);
  }

  for (const entry of debuts) {
    add(entry);
  }

  for (const entry of reentries) {
    add(entry);
  }

  for (const item of newPeaks) {
    add(item.entry);
  }

  for (const item of momentumSongs) {
    add(item.entry);
  }

  return Array.from(
    notable.values()
  ).sort(
    (a, b) =>
      a.rank - b.rank
  );
}

/*
 * ---------------------------------------------------------
 * MAIN ANALYSIS FUNCTION
 * ---------------------------------------------------------
 */

export function analyzeWeeklyHot100(
  payload: WeeklyChartPayload
): WeeklyHot100Analysis {
  const entries =
    payload.entries ?? [];

  const sortedEntries =
    [...entries].sort(
      (a, b) =>
        a.rank - b.rank
    );

  const numberOne =
    sortedEntries.find(
      (entry) =>
        entry.rank === 1
    ) ?? null;

  const top10 =
    sortedEntries
      .filter(
        (entry) =>
          entry.rank <= 10
      )
      .slice(0, 10);

  const top5 =
    sortedEntries
      .filter(
        (entry) =>
          entry.rank <= 5
      )
      .slice(0, 5);

  const biggestClimber =
    findBiggestClimber(
      sortedEntries
    );

  const biggestTop10Climber =
    findBiggestTop10Climber(
      sortedEntries
    );

  const biggestPointGainer =
    findBiggestPointGainer(
      sortedEntries
    );

  const top10Entries =
    findTop10Entries(
      sortedEntries
    );

  const debuts =
    findDebuts(
      sortedEntries
    );

  const reentries =
    findReentries(
      sortedEntries
    );

  const newPeaks =
    findNewPeaks(
      sortedEntries
    );

  const momentumSongs =
    findMomentumSongs(
      sortedEntries
    );

  const majorDrops =
    findMajorDrops(
      sortedEntries
    );

  const notableSongs =
    findNotableSongs(
      sortedEntries,
      top10Entries,
      debuts,
      reentries,
      newPeaks,
      momentumSongs
    );

  return {
    week:
      payload.week,

    displayWeek:
      payload.displayWeek,

    numberOne,

    weeksAtNumberOne:
      payload.weeksAtNumberOne,

    top10,

    top5,

    biggestClimber,

    biggestTop10Climber,

    biggestPointGainer,

    top10Entries,

    debuts,

    reentries,

    newPeaks,

    momentumSongs,

    majorDrops,

    notableSongs,

    totalSongs:
      sortedEntries.length,
  };
}