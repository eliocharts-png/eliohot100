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