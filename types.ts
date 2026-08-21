export type MovementIcon =
  | 'up'
  | 'down'
  | 'nonmover'
  | 'reentry'
  | 'debut';

export interface ChartEntry {
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
}

export interface ChartHistoryEntry {
  week: string;
  rank: number;
}

export interface WeeklyChartEntry
  extends ChartEntry {
  week: string;
  artwork?: string;
  points?: number;
  lastWeekRank: number | null;
  lastWeekPoints?: number;
  peakPosition: number;
  weeksOnChart: number;
  arrow:
    | 'NEW'
    | '▲'
    | '▼'
    | '→';
  movementIcon: MovementIcon;
  hasAnyPriorAppearance: boolean;
  chartHistory: ChartHistoryEntry[];
}

export interface WeeklyChartPayload {
  week: string;
  displayWeek: string;
  availableWeeks: string[];
  weeksAtNumberOne: number;
  entries: WeeklyChartEntry[];

  entriesByWeek: Record<
    string,
    WeeklyChartEntry[]
  >;

  weeksAtNumberOneByWeek: Record<
    string,
    number
  >;
}

/*
 * =========================================================
 * WEEKLY HOT 100 ARTICLE ANALYSIS
 * =========================================================
 */

export interface SongHistoryStats {
  title: string;
  artist: string;

  totalWeeks: number;
  totalTop10Weeks: number;
  totalTop5Weeks: number;
  totalNumberOneWeeks: number;

  peakPosition: number;

  numberOneCount: number;

  firstWeek: string;
  firstNumberOneWeek: string | null;
  firstTop10Week: string | null;

  currentTop10Streak: number;
  longestTop10Streak: number;
}

export interface ArtistHistoryStats {
  artist: string;

  chartEntries: number;
  top10Hits: number;
  top5Hits: number;
  numberOneHits: number;

  totalNumberOneWeeks: number;

  firstNumberOneWeek: string | null;
  longestNumberOneReign: number;

  longestTop10Run: number;
}

export interface Top10Story {
  entry: WeeklyChartEntry;

  movement: number;
  pointChange: number;
  pointChangePercent: number | null;

  songStats: SongHistoryStats;

  artistStats: ArtistHistoryStats[];

  isFirstNumberOne: boolean;
  isFirstTop10: boolean;
  isFirstTop5: boolean;

  isNewCareerPeak: boolean;

  numberOneRank: number;
  top10Rank: number;
}

export interface HistoricalMilestone {
  type:
    | 'firstNumberOne'
    | 'firstTop10'
    | 'firstTop5'
    | 'artistNumberOne'
    | 'artistTop10'
    | 'songNumberOne'
    | 'songTop10'
    | 'yearNumberOne'
    | 'allTimeNumberOne'
    | 'longestNumberOneReign'
    | 'top10Record';

  text: string;
}

export interface WeeklyHot100Analysis {
  week: string;
  displayWeek: string;

  numberOne: WeeklyChartEntry | null;
  weeksAtNumberOne: number;

  top10: WeeklyChartEntry[];
  top5: WeeklyChartEntry[];

  top10Stories: Top10Story[];

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

  /*
   * Historical No. 1 statistics.
   */

  uniqueNumberOneSongs: number;
  numberOneSongsThisYear: number;
  currentYear: number;

  /*
   * Historical artist/song information
   * for the current No. 1.
   */

  numberOneSongStats: SongHistoryStats | null;
  numberOneArtistStats: ArtistHistoryStats[];

  /*
   * All-time Top 10 reference songs.
   */

  top10ReferenceSongs: SongHistoryStats[];

  /*
   * Historical milestones worth mentioning.
   */

  milestones: HistoricalMilestone[];
}

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