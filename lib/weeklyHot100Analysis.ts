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
 * INTERNAL TYPES
 * =========================================================
 */

interface SongHistoryRow {
  week: string;
  rank: number;
  points?: number;
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function songKey(
  title: string,
  artist: string
): string {
  return `${normalize(title)}|||${normalize(artist)}`;
}

function parseChartDate(
  value: string
): number {
  const parts = value
    .split('/')
    .map(Number);

  if (parts.length < 3) {
    return 0;
  }

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
    return 0;
  }

  const fullYear =
    year < 50
      ? 2000 + year
      : 1900 + year;

  return new Date(
    fullYear,
    month - 1,
    day
  ).getTime();
}

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
    ((entry.points -
      entry.lastWeekPoints) /
      entry.lastWeekPoints) *
    100
  );
}

/*
 * =========================================================
 * HISTORY COLLECTION
 * =========================================================
 */

function getAllEntries(
  payload: WeeklyChartPayload
): WeeklyChartEntry[] {
  const map =
    new Map<
      string,
      WeeklyChartEntry
    >();

  for (const entries of Object.values(
    payload.entriesByWeek
  )) {
    for (const entry of entries) {
      const key =
        `${entry.week}|||${songKey(
          entry.title,
          entry.artist
        )}`;

      map.set(
        key,
        entry
      );
    }
  }

  return Array.from(
    map.values()
  );
}

function getSongHistory(
  payload: WeeklyChartPayload,
  title: string,
  artist: string
): SongHistoryRow[] {
  const key =
    songKey(
      title,
      artist
    );

  const history: SongHistoryRow[] =
    [];

  for (const entries of Object.values(
    payload.entriesByWeek
  )) {
    for (const entry of entries) {
      if (
        songKey(
          entry.title,
          entry.artist
        ) !== key
      ) {
        continue;
      }

      history.push({
        week: entry.week,
        rank: entry.rank,
        points: entry.points,
      });
    }
  }

  return history.sort(
    (a, b) =>
      parseChartDate(a.week) -
      parseChartDate(b.week)
  );
}

/*
 * =========================================================
 * CONSECUTIVE RUN CALCULATIONS
 * =========================================================
 */

function calculateLongestRun(
  history: SongHistoryRow[],
  condition: (
    rank: number
  ) => boolean
): number {
  if (
    history.length === 0
  ) {
    return 0;
  }

  const sorted =
    [...history].sort(
      (a, b) =>
        parseChartDate(a.week) -
        parseChartDate(b.week)
    );

  let longest = 0;
  let current = 0;

  let previousWeekDate:
    number | null = null;

  for (const row of sorted) {
    const date =
      parseChartDate(
        row.week
      );

    const isLaterWeek =
      previousWeekDate === null ||
      date >
        previousWeekDate;

    if (
      condition(row.rank)
    ) {
      if (
        isLaterWeek
      ) {
        current += 1;
      } else {
        current = 1;
      }
    } else {
      current = 0;
    }

    longest =
      Math.max(
        longest,
        current
      );

    previousWeekDate =
      date;
  }

  return longest;
}

function calculateCurrentRun(
  history: SongHistoryRow[],
  condition: (
    rank: number
  ) => boolean
): number {
  if (
    history.length === 0
  ) {
    return 0;
  }

  const sorted =
    [...history].sort(
      (a, b) =>
        parseChartDate(b.week) -
        parseChartDate(a.week)
    );

  let streak = 0;

  for (const row of sorted) {
    if (
      !condition(row.rank)
    ) {
      break;
    }

    streak += 1;
  }

  return streak;
}

/*
 * =========================================================
 * SONG HISTORY STATS
 * =========================================================
 */

function buildSongHistoryStats(
  payload: WeeklyChartPayload,
  title: string,
  artist: string
): SongHistoryStats {
  const history =
    getSongHistory(
      payload,
      title,
      artist
    );

  const sorted =
    [...history].sort(
      (a, b) =>
        parseChartDate(a.week) -
        parseChartDate(b.week)
    );

  const top10 =
    sorted.filter(
      (row) =>
        row.rank <= 10
    );

  const top5 =
    sorted.filter(
      (row) =>
        row.rank <= 5
    );

  const numberOnes =
    sorted.filter(
      (row) =>
        row.rank === 1
    );

  const peakPosition =
    sorted.reduce(
      (
        peak,
        row
      ) =>
        Math.min(
          peak,
          row.rank
        ),
      Infinity
    );

  return {
    title,
    artist,

    totalWeeks:
      sorted.length,

    totalTop10Weeks:
      top10.length,

    totalTop5Weeks:
      top5.length,

    totalNumberOneWeeks:
      numberOnes.length,

    peakPosition:
      peakPosition === Infinity
        ? 0
        : peakPosition,

    numberOneCount:
      numberOnes.length,

    firstWeek:
      sorted[0]?.week ?? '',

    firstNumberOneWeek:
      numberOnes[0]?.week ??
      null,

    firstTop10Week:
      top10[0]?.week ??
      null,

    currentTop10Streak:
      calculateCurrentRun(
        sorted,
        (rank) =>
          rank <= 10
      ),

    longestTop10Streak:
      calculateLongestRun(
        sorted,
        (rank) =>
          rank <= 10
      ),
  };
}

/*
 * =========================================================
 * ARTIST HISTORY STATS
 * =========================================================
 */

function buildArtistHistoryStats(
  payload: WeeklyChartPayload,
  artist: string
): ArtistHistoryStats {
  const normalizedArtist =
    normalize(artist);

  const songs =
    new Map<
      string,
      SongHistoryRow[]
    >();

  for (const entry of getAllEntries(
    payload
  )) {
    if (
      normalize(
        entry.artist
      ) !==
      normalizedArtist
    ) {
      continue;
    }

    const key =
      songKey(
        entry.title,
        entry.artist
      );

    if (!songs.has(key)) {
      songs.set(
        key,
        []
      );
    }

    songs.get(key)!.push({
      week: entry.week,
      rank: entry.rank,
      points: entry.points,
    });
  }

  const songHistories =
    Array.from(
      songs.values()
    ).map(
      (history) =>
        [...history].sort(
          (a, b) =>
            parseChartDate(
              a.week
            ) -
            parseChartDate(
              b.week
            )
        )
    );

  const top10Songs =
    songHistories.filter(
      (history) =>
        history.some(
          (row) =>
            row.rank <= 10
        )
    );

  const top5Songs =
    songHistories.filter(
      (history) =>
        history.some(
          (row) =>
            row.rank <= 5
        )
    );

  const numberOneSongs =
    songHistories.filter(
      (history) =>
        history.some(
          (row) =>
            row.rank === 1
        )
    );

  const allArtistWeeks =
    songHistories.flat();

  const firstNumberOne =
    numberOneSongs
      .flat()
      .filter(
        (row) =>
          row.rank === 1
      )
      .sort(
        (a, b) =>
          parseChartDate(
            a.week
          ) -
          parseChartDate(
            b.week
          )
      )[0];

  let longestNumberOneReign =
    0;

  for (const history of numberOneSongs) {
    longestNumberOneReign =
      Math.max(
        longestNumberOneReign,
        calculateLongestRun(
          history,
          (rank) =>
            rank === 1
        )
      );
  }

  let longestTop10Run =
    0;

  for (const history of top10Songs) {
    longestTop10Run =
      Math.max(
        longestTop10Run,
        calculateLongestRun(
          history,
          (rank) =>
            rank <= 10
        )
      );
  }

  return {
    artist,

    chartEntries:
      songHistories.length,

    top10Hits:
      top10Songs.length,

    top5Hits:
      top5Songs.length,

    numberOneHits:
      numberOneSongs.length,

    totalNumberOneWeeks:
      allArtistWeeks.filter(
        (row) =>
          row.rank === 1
      ).length,

    firstNumberOneWeek:
      firstNumberOne?.week ??
      null,

    longestNumberOneReign,

    longestTop10Run,
  };
}

/*
 * =========================================================
 * TOP 10 STORIES
 * =========================================================
 */

function buildTop10Stories(
  payload: WeeklyChartPayload,
  entries: WeeklyChartEntry[]
): Top10Story[] {
  const top10 =
    [...entries]
      .filter(
        (entry) =>
          entry.rank <= 10
      )
      .sort(
        (a, b) =>
          a.rank - b.rank
      );

  return top10.map(
    (entry) => {
      const movement =
        getRankMovement(
          entry
        );

      const pointChange =
        getPointChange(
          entry
        );

      const pointChangePercent =
        getPointChangePercent(
          entry
        );

      const songStats =
        buildSongHistoryStats(
          payload,
          entry.title,
          entry.artist
        );

      const artistStats =
        [
          buildArtistHistoryStats(
            payload,
            entry.artist
          ),
        ];

      const isFirstNumberOne =
        entry.rank === 1 &&
        songStats.totalNumberOneWeeks ===
          1;

      const isFirstTop10 =
        entry.rank <= 10 &&
        songStats.totalTop10Weeks ===
          1;

      const isFirstTop5 =
        entry.rank <= 5 &&
        songStats.totalTop5Weeks ===
          1;

      const previousPeak =
        entry.chartHistory
          .filter(
            (history) =>
              history.week !==
              entry.week
          )
          .reduce(
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

      const isNewCareerPeak =
        previousPeak !==
          Infinity &&
        entry.rank <
          previousPeak;

      return {
        entry,

        movement,

        pointChange,

        pointChangePercent,

        songStats,

        artistStats,

        isFirstNumberOne,

        isFirstTop10,

        isFirstTop5,

        isNewCareerPeak,

        numberOneRank:
          entry.rank === 1
            ? 1
            : 0,

        top10Rank:
          entry.rank <= 10
            ? entry.rank
            : 0,
      };
    }
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
 * NEW PEAKS
 * =========================================================
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
      (
        entry
      ): NewPeak | null => {
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
 * =========================================================
 * BIGGEST CLIMBER
 * =========================================================
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

  return (
    movers[0] ??
    null
  );
}

/*
 * =========================================================
 * BIGGEST TOP 10 CLIMBER
 * =========================================================
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

  return (
    movers[0] ??
    null
  );
}

/*
 * =========================================================
 * BIGGEST POINT GAINER
 * =========================================================
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

  return (
    gainers[0] ??
    null
  );
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

  const add = (
    entry: WeeklyChartEntry
  ) => {
    const key =
      songKey(
        entry.title,
        entry.artist
      );

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
      a.rank -
      b.rank
  );
}

/*
 * =========================================================
 * UNIQUE NO. 1 SONGS
 * =========================================================
 */

function getUniqueNumberOneSongs(
  payload: WeeklyChartPayload
): Set<string> {
  const songs =
    new Set<string>();

  for (const entries of Object.values(
    payload.entriesByWeek
  )) {
    for (const entry of entries) {
      if (
        entry.rank !== 1
      ) {
        continue;
      }

      songs.add(
        songKey(
          entry.title,
          entry.artist
        )
      );
    }
  }

  return songs;
}

/*
 * =========================================================
 * NO. 1 SONGS THIS YEAR
 * =========================================================
 */

function getNumberOneSongsThisYear(
  payload: WeeklyChartPayload,
  currentYear: number
): number {
  const songs =
    new Set<string>();

  for (const entries of Object.values(
    payload.entriesByWeek
  )) {
    for (const entry of entries) {
      if (
        entry.rank !== 1
      ) {
        continue;
      }

      const timestamp =
        parseChartDate(
          entry.week
        );

      if (
        timestamp === 0
      ) {
        continue;
      }

      const date =
        new Date(
          timestamp
        );

      if (
        date.getFullYear() !==
        currentYear
      ) {
        continue;
      }

      songs.add(
        songKey(
          entry.title,
          entry.artist
        )
      );
    }
  }

  return songs.size;
}

/*
 * =========================================================
 * TOP 10 REFERENCE SONGS
 * =========================================================
 */

function getTop10ReferenceSongs(
  payload: WeeklyChartPayload
): SongHistoryStats[] {
  const songs =
    new Map<
      string,
      {
        title: string;
        artist: string;
      }
    >();

  for (const entries of Object.values(
    payload.entriesByWeek
  )) {
    for (const entry of entries) {
      if (
        entry.rank > 10
      ) {
        continue;
      }

      const key =
        songKey(
          entry.title,
          entry.artist
        );

      songs.set(
        key,
        {
          title:
            entry.title,
          artist:
            entry.artist,
        }
      );
    }
  }

  return Array.from(
    songs.values()
  )
    .map(
      (song) =>
        buildSongHistoryStats(
          payload,
          song.title,
          song.artist
        )
    )
    .sort(
      (a, b) =>
        b.totalTop10Weeks -
        a.totalTop10Weeks
    );
}

/*
 * =========================================================
 * HISTORICAL MILESTONES
 * =========================================================
 */

function buildMilestones(
  analysis: {
    numberOne: WeeklyChartEntry | null;
    numberOneSongStats: SongHistoryStats | null;
    numberOneArtistStats: ArtistHistoryStats[];
    uniqueNumberOneSongs: number;
    numberOneSongsThisYear: number;
    currentYear: number;
  }
): WeeklyHot100Analysis['milestones'] {
  const milestones: WeeklyHot100Analysis['milestones'] =
    [];

  const numberOne =
    analysis.numberOne;

  if (!numberOne) {
    return milestones;
  }

  const songStats =
    analysis.numberOneSongStats;

  /*
   * First career No. 1.
   */

  for (const artist of analysis.numberOneArtistStats) {
    if (
      artist.numberOneHits ===
      1
    ) {
      milestones.push({
        type:
          'firstNumberOne',
        text:
          `${artist.artist} earns a first career No. 1.`,
      });
    }
  }

  /*
   * Artist No. 1 count.
   */

  for (const artist of analysis.numberOneArtistStats) {
    milestones.push({
      type:
        'artistNumberOne',
      text:
        `${artist.artist} now has ${artist.numberOneHits} No. 1 hit${
          artist.numberOneHits ===
          1
            ? ''
            : 's'
        }.`,
    });
  }

  /*
   * Song No. 1 count.
   */

  if (
    songStats &&
    songStats.totalNumberOneWeeks >
      0
  ) {
    milestones.push({
      type:
        'songNumberOne',
      text:
        `"${songStats.title}" now has ${songStats.totalNumberOneWeeks} week${
          songStats.totalNumberOneWeeks ===
          1
            ? ''
            : 's'
        } at No. 1.`,
    });
  }

  /*
   * Longest No. 1 reign.
   *
   * This is based on the song's own historical
   * No. 1 weeks. We do not reference properties
   * that are not part of SongHistoryStats.
   */

  if (
    songStats &&
    songStats.totalNumberOneWeeks >
      1
  ) {
    milestones.push({
      type:
        'longestNumberOneReign',
      text:
        `"${songStats.title}" has ${songStats.totalNumberOneWeeks} weeks at No. 1.`,
    });
  }

  /*
   * Year No. 1 count.
   */

  if (
    analysis.numberOneSongsThisYear >
    0
  ) {
    milestones.push({
      type:
        'yearNumberOne',
      text:
        `This becomes the ${analysis.numberOneSongsThisYear}${getOrdinalSuffix(
          analysis.numberOneSongsThisYear
        )} unique No. 1 hit of ${analysis.currentYear}.`,
    });
  }

  /*
   * All-time unique No. 1 count.
   */

  if (
    songStats &&
    songStats.totalNumberOneWeeks ===
      1
  ) {
    milestones.push({
      type:
        'allTimeNumberOne',
      text:
        `This is the ${analysis.uniqueNumberOneSongs}${getOrdinalSuffix(
          analysis.uniqueNumberOneSongs
        )} unique song to reach No. 1 in Elio Hot 100 history.`,
    });
  }

  return milestones;
}

/*
 * =========================================================
 * ORDINALS
 * =========================================================
 */

function getOrdinalSuffix(
  value: number
): string {
  const mod100 =
    value % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return 'th';
  }

  switch (
    value % 10
  ) {
    case 1:
      return 'st';

    case 2:
      return 'nd';

    case 3:
      return 'rd';

    default:
      return 'th';
  }
}

/*
 * =========================================================
 * MAIN ANALYSIS
 * =========================================================
 */

export function analyzeWeeklyHot100(
  payload: WeeklyChartPayload
): WeeklyHot100Analysis {
  const entries =
    payload.entries ?? [];

  const sortedEntries =
    [...entries].sort(
      (a, b) =>
        a.rank -
        b.rank
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

  /*
   * Current Top 10 story data.
   */

  const top10Stories =
    buildTop10Stories(
      payload,
      sortedEntries
    );

  /*
   * Other chart movement.
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

  /*
   * Historical No. 1 information.
   */

  const uniqueNumberOneSongSet =
    getUniqueNumberOneSongs(
      payload
    );

  const uniqueNumberOneSongs =
    uniqueNumberOneSongSet.size;

  const currentYear =
    numberOne
      ? new Date(
          parseChartDate(
            numberOne.week
          )
        ).getFullYear()
      : new Date().getFullYear();

  const numberOneSongsThisYear =
    getNumberOneSongsThisYear(
      payload,
      currentYear
    );

  /*
   * Current No. 1 song stats.
   */

  const numberOneSongStats =
    numberOne
      ? buildSongHistoryStats(
          payload,
          numberOne.title,
          numberOne.artist
        )
      : null;

  /*
   * Current No. 1 artist stats.
   */

  const numberOneArtistStats =
    numberOne
      ? [
          buildArtistHistoryStats(
            payload,
            numberOne.artist
          ),
        ]
      : [];

  /*
   * Reference songs for Top 10 longevity.
   */

  const top10ReferenceSongs =
    getTop10ReferenceSongs(
      payload
    );

  /*
   * Milestones.
   */

  const milestones =
    buildMilestones({
      numberOne,
      numberOneSongStats,
      numberOneArtistStats,
      uniqueNumberOneSongs,
      numberOneSongsThisYear,
      currentYear,
    });

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