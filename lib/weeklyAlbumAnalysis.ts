import type {
  AlbumChartPayload,
  AlbumWeeklyEntry,
} from '@/lib/albumChartData';

export interface AlbumMover {
  entry: AlbumWeeklyEntry;
  movement: number;
}

export interface AlbumPointMover {
  entry: AlbumWeeklyEntry;
  pointChange: number;
}

export interface AlbumNewPeak {
  entry: AlbumWeeklyEntry;
  previousPeak: number;
}

export interface WeeklyAlbumAnalysis {
  week: string;
  displayWeek: string;

  numberOne: AlbumWeeklyEntry | null;
  weeksAtNumberOne: number;

  top10: AlbumWeeklyEntry[];
  top5: AlbumWeeklyEntry[];

  biggestClimber: AlbumMover | null;
  biggestTop10Climber: AlbumMover | null;
  biggestPointGainer: AlbumPointMover | null;

  debuts: AlbumWeeklyEntry[];
  reentries: AlbumWeeklyEntry[];
  newPeaks: AlbumNewPeak[];

  totalAlbums: number;
}

function getMovement(
  entry: AlbumWeeklyEntry,
): number {
  if (entry.lastWeekRank === null) {
    return 0;
  }

  return entry.lastWeekRank - entry.rank;
}

function getPointChange(
  entry: AlbumWeeklyEntry,
): number | null {
  if (entry.lastWeekPoints === undefined) {
    return null;
  }

  return entry.points - entry.lastWeekPoints;
}

function findNewPeaks(
  entries: AlbumWeeklyEntry[],
  week: string,
): AlbumNewPeak[] {
  return entries.flatMap((entry) => {
    if (entry.movementIcon === 'debut') {
      return [];
    }

    const previousHistory =
      entry.chartHistory.filter(
        (item) => item.week < week,
      );

    if (previousHistory.length === 0) {
      return [];
    }

    const previousPeak = Math.min(
      ...previousHistory.map(
        (item) => item.rank,
      ),
    );

    if (entry.rank >= previousPeak) {
      return [];
    }

    return [{
      entry,
      previousPeak,
    }];
  });
}

function findBiggestClimber(
  entries: AlbumWeeklyEntry[],
): AlbumMover | null {
  const climbers = entries
    .filter(
      (entry) =>
        entry.movementIcon === 'up',
    )
    .map((entry) => ({
      entry,
      movement: getMovement(entry),
    }))
    .sort(
      (a, b) =>
        b.movement - a.movement,
    );

  return climbers[0] ?? null;
}

function findBiggestPointGainer(
  entries: AlbumWeeklyEntry[],
): AlbumPointMover | null {
  const gainers = entries
    .map((entry) => ({
      entry,
      pointChange: getPointChange(entry),
    }))
    .filter(
      (
        item,
      ): item is AlbumPointMover =>
        item.pointChange !== null &&
        item.pointChange > 0,
    )
    .sort(
      (a, b) =>
        b.pointChange - a.pointChange,
    );

  return gainers[0] ?? null;
}

export function analyzeWeeklyAlbums(
  payload: AlbumChartPayload,
): WeeklyAlbumAnalysis {
  const entries = [...payload.entries].sort(
    (a, b) => a.rank - b.rank,
  );

  const top10 = entries.filter(
    (entry) => entry.rank <= 10,
  );

  const top5 = entries.filter(
    (entry) => entry.rank <= 5,
  );

  const top10Climbers = entries
    .filter(
      (entry) =>
        entry.rank <= 10 &&
        entry.movementIcon === 'up',
    )
    .map((entry) => ({
      entry,
      movement: getMovement(entry),
    }))
    .sort(
      (a, b) =>
        b.movement - a.movement,
    );

  return {
    week: payload.week,
    displayWeek: payload.displayWeek,

    numberOne:
      entries.find(
        (entry) => entry.rank === 1,
      ) ?? null,

    weeksAtNumberOne:
      payload.weeksAtNumberOne,

    top10,
    top5,

    biggestClimber:
      findBiggestClimber(entries),

    biggestTop10Climber:
      top10Climbers[0] ?? null,

    biggestPointGainer:
      findBiggestPointGainer(entries),

    debuts: entries.filter(
      (entry) =>
        entry.movementIcon === 'debut',
    ),

    reentries: entries.filter(
      (entry) =>
        entry.movementIcon === 'reentry',
    ),

    newPeaks: findNewPeaks(
      entries,
      payload.week,
    ),

    totalAlbums: entries.length,
  };
}