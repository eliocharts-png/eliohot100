import type {
  WeeklyArtistPayload,
  WeeklyArtistEntry,
} from '@/lib/weeklyArtistData';

export interface ArtistMover {
  entry: WeeklyArtistEntry;
  movement: number;
}

export interface WeeklyArtistAnalysis {
  week: string;
  displayWeek: string;

  numberOne: WeeklyArtistEntry | null;
  top10: WeeklyArtistEntry[];
  top5: WeeklyArtistEntry[];

  biggestClimber: ArtistMover | null;
  biggestTop10Climber: ArtistMover | null;

  debuts: WeeklyArtistEntry[];
  reentries: WeeklyArtistEntry[];

  totalArtists: number;
}

function getMovement(
  entry: WeeklyArtistEntry,
): number {
  if (entry.lastWeekRank === null) {
    return 0;
  }

  return entry.lastWeekRank - entry.rank;
}

function findBiggestClimber(
  entries: WeeklyArtistEntry[],
): ArtistMover | null {
  const climbers = entries
    .filter(
      (entry) => entry.movementIcon === 'up',
    )
    .map((entry) => ({
      entry,
      movement: getMovement(entry),
    }))
    .sort(
      (a, b) => b.movement - a.movement,
    );

  return climbers[0] ?? null;
}

export function analyzeWeeklyArtists(
  payload: WeeklyArtistPayload,
): WeeklyArtistAnalysis {
  const entries = [...payload.entries].sort(
    (a, b) => a.rank - b.rank,
  );

  const top10 = entries.filter(
    (entry) => entry.rank <= 10,
  );

  const top5 = entries.filter(
    (entry) => entry.rank <= 5,
  );

  const top10Climbers = top10
    .filter(
      (entry) => entry.movementIcon === 'up',
    )
    .map((entry) => ({
      entry,
      movement: getMovement(entry),
    }))
    .sort(
      (a, b) => b.movement - a.movement,
    );

  return {
    week: payload.week,
    displayWeek: payload.displayWeek,

    numberOne:
      entries.find(
        (entry) => entry.rank === 1,
      ) ?? null,

    top10,
    top5,

    biggestClimber:
      findBiggestClimber(entries),

    biggestTop10Climber:
      top10Climbers[0] ?? null,

    debuts: entries.filter(
      (entry) => entry.movementIcon === 'debut',
    ),

    reentries: entries.filter(
      (entry) => entry.movementIcon === 'reentry',
    ),

    totalArtists: entries.length,
  };
}