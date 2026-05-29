export type ConflictType = 'changeover' | 'equipment' | 'crowd';
export type Severity = 'warning' | 'error';
export type GamePhase = 'playing' | 'paused' | 'review' | 'finished';

export interface Artist {
  id: string;
  name: string;
  duration: number;
  equipment: string[];
  heat: number;
  preferredStages: string[];
}

export interface Stage {
  id: string;
  name: string;
  equipment: string[];
  changeoverTime: number;
}

export interface ScheduleItem {
  id: string;
  artistId: string;
  stageId: string;
  startTime: number;
  endTime: number;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: Severity;
  scheduleItemIds: string[];
  description: string;
  sourceRef: string;
}

export interface WeatherCard {
  id: string;
  name: string;
  triggerAfterCount: number;
  description: string;
  effects: WeatherEffect[];
  activated: boolean;
}

export interface WeatherEffect {
  type: 'stage_disable' | 'heat_modifier' | 'equipment_disable' | 'changeover_modifier' | 'duration_modifier';
  target?: string;
  value: number;
  description: string;
}

export interface HeatSnapshot {
  timeSlot: number;
  heatValue: number;
  artists: string[];
  stageId: string;
}

export interface HistorySnapshot {
  tick: number;
  scheduleItems: ScheduleItem[];
  conflicts: Conflict[];
  activatedWeather: string[];
  arrangedCount: number;
}

export interface GameScore {
  total: number;
  scheduling: number;
  changeover: number;
  equipment: number;
  crowd: number;
  heat: number;
  weather: number;
}

export const GAME_START_MINUTES = 600;
export const GAME_END_MINUTES = 1380;
export const GAME_DURATION_MINUTES = GAME_END_MINUTES - GAME_START_MINUTES;
export const PIXELS_PER_MINUTE = 3;
