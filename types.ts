export interface ChartEntry {
  rank: number;
  title: string;
  artist: string;
}

export type MovementArrow = '▲' | '▼' | '→' | 'NEW';

export type MovementIcon =
  | 'up'
  | 'down'
  | 'nonmover'
  | 'reentry'
  | 'debut';

export interface WeeklyChartEntry {
  week: string;
  rank: number;
  title: string;
  artist: string;
  artwork?: string;
  points?: number;
  lastWeekRank: number | null;
  lastWeekPoints?: number;
  peakPosition: number;
  weeksOnChart: number;
  arrow: MovementArrow;
  movementIcon: MovementIcon;
  hasAnyPriorAppearance: boolean;
  chartHistory: {
    week: string;
    rank: number;
  }[];
}

export interface WeeklyChartPayload {
  week: string;
  displayWeek: string;
  availableWeeks: string[];
  weeksAtNumberOne: number;
  entries: WeeklyChartEntry[];
  entriesByWeek: Record<string, WeeklyChartEntry[]>;
  weeksAtNumberOneByWeek: Record<string, number>;
}