import type {
  ArtistHistoryStats,
  ChartMover,
  NewPeak,
  PointMover,
  SongHistoryStats,
  Top10Story,
  WeeklyChartEntry,
  WeeklyChartPayload,
  WeeklyHot100Analysis,
} from '@/types';

/*
 * =========================================================
 * BASIC HELPERS
 * =========================================================
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

function getPointChangePercent(
  entry: WeeklyChartEntry
): number | null {
  if (
    entry.points === undefined ||
    entry.lastWeekPoints === undefined ||
    entry.lastWeekPoints === 0
  ) {
    return null;
  }

  return (
    (
      (entry.points -
        entry.lastWeekPoints) /
      entry.lastWeekPoints
    ) *
    100
  );
}

/*
 * =========================================================
 * TOP 10
 * =========================================================
 */

function buildTop10Stories(
  entries: WeeklyChartEntry[]
): Top10Story[] {
  return entries
    .filter(
      (entry) =>
        entry.rank <= 10
    )
    .sort(
      (a, b) =>
        a.rank -
        b.rank
    )
    .map(
      (entry): Top10Story => ({
        entry,

        movement:
          getRankMovement(entry),

        pointChange:
          getPointChange(entry),

        pointChangePercent:
          getPointChangePercent(entry),

        /*
         * Historical information is intentionally
         * no longer calculated.
         *
         * These lightweight placeholder values are
         * kept only because the existing TypeScript
         * interface still expects them.
         */
        songStats:
          createEmptySongStats(entry),

        artistStats: [],

        isFirstNumberOne:
          false,

        isFirstTop10:
          false,

        isFirstTop5:
          false,

        /*
         * New peak is determined directly from the
         * chartHistory already attached to the entry.
         */
        isNewCareerPeak:
          isNewCareerPeak(entry),

        numberOneRank:
          entry.rank === 1
            ? 1
            : 0,

        top10Rank:
          entry.rank <= 10
            ? entry.rank
            : 0,
      })
    );
}

/*
 * =========================================================
 * LIGHTWEIGHT SONG STATS
 * =========================================================
 *
 * We do NOT scan entriesByWeek anymore.
 *
 * chartHistory already exists on each entry, so if we need
 * basic information about the song's history, we can use
 * that directly.
 * =========================================================
 */

function createEmptySongStats(
  entry: WeeklyChartEntry
): SongHistoryStats {
  const history =
    entry.chartHistory ?? [];

  const top10Weeks =
    history.filter(
      (item) =>
        item.rank <= 10
    ).length;

  const top5Weeks =
    history.filter(
      (item) =>
        item.rank <= 5
    ).length;

  const numberOneWeeks =
    history.filter(
      (item) =>
        item.rank === 1
    ).length;

  const peak =
    history.reduce(
      (
        currentPeak,
        item
      ) =>
        Math.min(
          currentPeak,
          item.rank
        ),
      entry.rank
    );

  return {
    title:
      entry.title,

    artist:
      entry.artist,

    totalWeeks:
      entry.weeksOnChart,

    totalTop10Weeks:
      top10Weeks,

    totalTop5Weeks:
      top5Weeks,

    totalNumberOneWeeks:
      numberOneWeeks,

    peakPosition:
      peak,

    numberOneCount:
      numberOneWeeks,

    firstWeek:
      history[0]?.week ??
      entry.week,

    firstNumberOneWeek:
      history.find(
        (item) =>
          item.rank === 1
      )?.week ??
      null,

    firstTop10Week:
      history.find(
        (item) =>
          item.rank <= 10
      )?.week ??
      null,

    currentTop10Streak:
      0,

    longestTop10Streak:
      0,
  };
}

/*
 * =========================================================
 * NEW PEAKS
 * =========================================================
 */

function isNewCareerPeak(
  entry: WeeklyChartEntry
): boolean {
  const history =
    entry.chartHistory ?? [];

  const previousHistory =
    history.filter(
      (item) =>
        item.week !== entry.week
    );

  if (
    previousHistory.length === 0
  ) {
    return false;
  }

  const previousPeak =
    previousHistory.reduce(
      (
        peak,
        item
      ) =>
        Math.min(
          peak,
          item.rank
        ),
      Infinity
    );

  return (
    entry.rank <
    previousPeak
  );
}

function findNewPeaks(
  entries: WeeklyChartEntry[]
): NewPeak[] {
  return entries
    .filter(
      (entry) =>
        isNewCareerPeak(entry)
    )
    .map(
      (
        entry
      ): NewPeak => {
        const previousHistory =
          entry.chartHistory.filter(
            (item) =>
              item.week !==
              entry.week
          );

        const previousPeak =
          previousHistory.reduce(
            (
              peak,
              item
            ) =>
              Math.min(
                peak,
                item.rank
              ),
            Infinity
          );

        return {
          entry,
          previousPeak:
            previousPeak === Infinity
              ? null
              : previousPeak,
        };
      }
    )
    .sort(
      (a, b) =>
        a.entry.rank -
        b.entry.rank
    );
}

/*
 * =========================================================
 * TOP 10 ENTRIES
 * =========================================================
 */

function findTop10Entries(
  entries: WeeklyChartEntry[]
): WeeklyChartEntry[] {
  return entries.filter(
    (entry) => {
      if (
        entry.rank > 10
      ) {
        return false;
      }

      if (
        entry.lastWeekRank === null
      ) {
        return true;
      }

      return (
        entry.lastWeekRank >
        10
      );
    }
  );
}

/*
 * =========================================================
 * DEBUTS
 * =========================================================
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
 * =========================================================
 * RE-ENTRIES
 * =========================================================
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
 * =========================================================
 * BIGGEST CLIMBER
 * =========================================================
 */

function findBiggestClimber(
  entries: WeeklyChartEntry[]
): ChartMover | null {
  let biggest:
    ChartMover | null =
    null;

  for (const entry of entries) {
    const movement =
      getRankMovement(entry);

    if (
      movement <= 0
    ) {
      continue;
    }

    if (
      biggest === null ||
      movement >
        biggest.movement
    ) {
      biggest = {
        entry,
        movement,
      };
    }
  }

  return biggest;
}

/*
 * =========================================================
 * BIGGEST TOP 10 CLIMBER
 * =========================================================
 */

function findBiggestTop10Climber(
  entries: WeeklyChartEntry[]
): ChartMover | null {
  let biggest:
    ChartMover | null =
    null;

  for (const entry of entries) {
    if (
      entry.rank > 10
    ) {
      continue;
    }

    const movement =
      getRankMovement(entry);

    if (
      movement <= 0
    ) {
      continue;
    }

    if (
      biggest === null ||
      movement >
        biggest.movement
    ) {
      biggest = {
        entry,
        movement,
      };
    }
  }

  return biggest;
}

/*
 * =========================================================
 * BIGGEST POINT GAINER
 * =========================================================
 */

function findBiggestPointGainer(
  entries: WeeklyChartEntry[]
): PointMover | null {
  let biggest:
    PointMover | null =
    null;

  for (const entry of entries) {
    const pointChange =
      getPointChange(entry);

    if (
      pointChange <= 0
    ) {
      continue;
    }

    if (
      biggest === null ||
      pointChange >
        biggest.pointChange
    ) {
      biggest = {
        entry,
        pointChange,
      };
    }
  }

  return biggest;
}

/*
 * =========================================================
 * MOMENTUM SONGS
 * =========================================================
 */

function findMomentumSongs(
  entries: WeeklyChartEntry[]
): ChartMover[] {
  return entries
    .filter(
      (entry) =>
        entry.rank > 10 &&
        entry.lastWeekRank !== null &&
        entry.lastWeekRank >
          entry.rank &&
        entry.weeksOnChart >= 2
    )
    .map(
      (entry) => ({
        entry,
        movement:
          getRankMovement(entry),
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
 * =========================================================
 * MAJOR DROPS
 * =========================================================
 */

function findMajorDrops(
  entries: WeeklyChartEntry[]
): ChartMover[] {
  return entries
    .filter(
      (entry) =>
        entry.lastWeekRank !== null &&
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
 * =========================================================
 * NOTABLE SONGS
 * =========================================================
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

  const add =
    (
      entry: WeeklyChartEntry
    ) => {
      const key =
        `${entry.title}|||${entry.artist}`
          .trim()
          .toLowerCase();

      notable.set(
        key,
        entry
      );
    };

  for (
    const entry of top10Entries
  ) {
    add(entry);
  }

  for (
    const entry of debuts
  ) {
    add(entry);
  }

  for (
    const entry of reentries
  ) {
    add(entry);
  }

  for (
    const item of newPeaks
  ) {
    add(item.entry);
  }

  for (
    const item of momentumSongs
  ) {
    add(item.entry);
  }

  return Array.from(
    notable.values()
  ).sort(
    (a, b) =>
      a.rank -
      b.rank
  );
}

/*
 * =========================================================
 * LIGHTWEIGHT ARTIST STATS
 * =========================================================
 *
 * Artist history is no longer scanned.
 *
 * The old version searched every week in entriesByWeek for
 * every Top 10 artist. That was one of the major sources of
 * unnecessary work.
 *
 * We keep an empty array for compatibility with the existing
 * WeeklyHot100Analysis type.
 * =========================================================
 */

function getNumberOneArtistStats():
  ArtistHistoryStats[] {
  return [];
}

/*
 * =========================================================
 * HISTORICAL PLACEHOLDERS
 * =========================================================
 *
 * These remain only because the current WeeklyHot100Analysis
 * interface still contains these fields.
 *
 * They are deliberately NOT calculated.
 * =========================================================
 */

function getUniqueNumberOneSongs():
  number {
  return 0;
}

function getNumberOneSongsThisYear():
  number {
  return 0;
}

/*
 * =========================================================
 * MAIN ANALYSIS
 * =========================================================
 */

export function analyzeWeeklyHot100(
  payload: WeeklyChartPayload
): WeeklyHot100Analysis {
  /*
   * Current week's entries only.
   *
   * We intentionally do not scan:
   *
   * payload.entriesByWeek
   *
   * except where the data has already been attached to
   * each entry through chartHistory.
   */

  const entries =
    payload.entries ?? [];

  const sortedEntries =
    [...entries].sort(
      (a, b) =>
        a.rank -
        b.rank
    );

  /*
   * No. 1.
   */

  const numberOne =
    sortedEntries.find(
      (entry) =>
        entry.rank === 1
    ) ?? null;

  /*
   * Top 10.
   */

  const top10 =
    sortedEntries
      .filter(
        (entry) =>
          entry.rank <= 10
      )
      .slice(0, 10);

  /*
   * Top 5.
   */

  const top5 =
    sortedEntries
      .filter(
        (entry) =>
          entry.rank <= 5
      )
      .slice(0, 5);

  /*
   * Basic Top 10 stories.
   */

  const top10Stories =
    buildTop10Stories(
      top10
    );

  /*
   * Basic movements.
   */

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

  /*
   * Top 10 entries.
   */

  const top10Entries =
    findTop10Entries(
      sortedEntries
    );

  /*
   * Debuts.
   */

  const debuts =
    findDebuts(
      sortedEntries
    );

  /*
   * Re-entries.
   */

  const reentries =
    findReentries(
      sortedEntries
    );

  /*
   * New peaks.
   */

  const newPeaks =
    findNewPeaks(
      sortedEntries
    );

  /*
   * Other simple movement categories.
   */

  const momentumSongs =
    findMomentumSongs(
      sortedEntries
    );

  const majorDrops =
    findMajorDrops(
      sortedEntries
    );

  /*
   * Notable songs.
   */

  const notableSongs =
    findNotableSongs(
      sortedEntries,
      top10Entries,
      debuts,
      reentries,
      newPeaks,
      momentumSongs
    );

  /*
   * We keep these values for compatibility with the existing
   * interface, but no historical scans are performed.
   */

  const currentYear =
    numberOne
      ? Number(
          numberOne.week
            .split('/')[2]
        )
      : new Date()
          .getFullYear();

  const numberOneSongStats =
    numberOne
      ? createEmptySongStats(
          numberOne
        )
      : null;

  const numberOneArtistStats =
    getNumberOneArtistStats();

  const uniqueNumberOneSongs =
    getUniqueNumberOneSongs();

  const numberOneSongsThisYear =
    getNumberOneSongsThisYear();

  /*
   * No historical reference songs.
   */

  const top10ReferenceSongs:
    SongHistoryStats[] = [];

  /*
   * No historical milestones.
   */

  const milestones:
    WeeklyHot100Analysis['milestones'] =
    [];

  /*
   * Return lightweight analysis.
   */

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

    top10Stories,

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

    uniqueNumberOneSongs,

    numberOneSongsThisYear,

    currentYear,

    numberOneSongStats,

    numberOneArtistStats,

    top10ReferenceSongs,

    milestones,
  };
}