import { create } from 'zustand';
import type { ScheduleItem, Conflict, WeatherCard, GamePhase, HistorySnapshot, GameScore, HeatSnapshot } from '../types';
import { artists } from '../data/artists';
import { stages } from '../data/stages';
import { weatherCards as weatherCardsData } from '../data/weatherCards';
import { detectConflicts, calculateHeatSnapshots, calculateScore } from '../engine/conflictDetector';
import { checkWeatherTrigger } from '../engine/weatherSystem';
import { generateId, minutesToTimeString } from '../utils/timeUtils';

interface GameState {
  phase: GamePhase;
  scheduleItems: ScheduleItem[];
  conflicts: Conflict[];
  activatedWeather: WeatherCard[];
  arrangedArtistIds: string[];
  history: HistorySnapshot[];
  reviewTick: number;
  selectedConflictId: string | null;
  heatSnapshots: HeatSnapshot[];
  score: GameScore;
  weatherJustTriggered: WeatherCard | null;
  dragPreview: { artistId: string; stageId: string; startTime: number } | null;
  timelineRef: HTMLDivElement | null;

  placeArtist: (artistId: string, stageId: string, startTime: number) => void;
  removeScheduleItem: (itemId: string) => void;
  moveScheduleItem: (itemId: string, newStageId: string, newStartTime: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  enterReview: () => void;
  exitReview: () => void;
  finishGame: () => void;
  setReviewTick: (tick: number) => void;
  selectConflict: (id: string | null) => void;
  dismissWeatherAlert: () => void;
  setDragPreview: (preview: { artistId: string; stageId: string; startTime: number } | null) => void;
  setTimelineRef: (ref: HTMLDivElement | null) => void;
  undoLastAction: () => void;
}

const initialScore: GameScore = {
  total: 0,
  scheduling: 0,
  changeover: 0,
  equipment: 0,
  crowd: 0,
  heat: 0,
  weather: 80,
};

function recalculate(state: Partial<GameState>) {
  const items = state.scheduleItems || [];
  const weather = state.activatedWeather || [];
  const conflicts = detectConflicts(items, artists, stages, weather);
  const heatSnapshots = calculateHeatSnapshots(items, artists, weather);
  const score = calculateScore(items, conflicts, artists, heatSnapshots, weather);
  return { conflicts, heatSnapshots, score };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'playing',
  scheduleItems: [],
  conflicts: [],
  activatedWeather: [],
  arrangedArtistIds: [],
  history: [],
  reviewTick: 0,
  selectedConflictId: null,
  heatSnapshots: [],
  score: initialScore,
  weatherJustTriggered: null,
  dragPreview: null,
  timelineRef: null,

  placeArtist: (artistId, stageId, startTime) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.arrangedArtistIds.includes(artistId)) return;

    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return;

    let duration = artist.duration;
    for (const w of state.activatedWeather) {
      for (const e of w.effects) {
        if (e.type === 'duration_modifier' && duration > 60) {
          duration += e.value;
        }
      }
    }
    duration = Math.max(15, duration);

    const endTime = startTime + duration;

    const newItem: ScheduleItem = {
      id: generateId(),
      artistId,
      stageId,
      startTime,
      endTime,
    };

    const newItems = [...state.scheduleItems, newItem];
    const newArranged = [...state.arrangedArtistIds, artistId];
    const { conflicts, heatSnapshots, score } = recalculate({
      scheduleItems: newItems,
      activatedWeather: state.activatedWeather,
    });

    const newHistoryEntry: HistorySnapshot = {
      tick: state.history.length,
      scheduleItems: [...newItems],
      conflicts: [...conflicts],
      activatedWeather: state.activatedWeather.map((w) => w.id),
      arrangedCount: newArranged.length,
    };

    let weatherTriggered: WeatherCard | null = null;
    const newActivatedWeather = [...state.activatedWeather];
    const triggered = checkWeatherTrigger(newArranged.length, newActivatedWeather.map((w) => w.id));
    if (triggered) {
      newActivatedWeather.push(triggered);
      weatherTriggered = triggered;
      const re = recalculate({ scheduleItems: newItems, activatedWeather: newActivatedWeather });
      set({
        scheduleItems: newItems,
        arrangedArtistIds: newArranged,
        activatedWeather: newActivatedWeather,
        conflicts: re.conflicts,
        heatSnapshots: re.heatSnapshots,
        score: re.score,
        history: [...state.history, { ...newHistoryEntry, conflicts: re.conflicts }],
        weatherJustTriggered: weatherTriggered,
      });
    } else {
      set({
        scheduleItems: newItems,
        arrangedArtistIds: newArranged,
        conflicts,
        heatSnapshots,
        score,
        history: [...state.history, newHistoryEntry],
      });
    }
  },

  removeScheduleItem: (itemId) => {
    const state = get();
    if (state.phase !== 'playing') return;
    const item = state.scheduleItems.find((i) => i.id === itemId);
    if (!item) return;

    const newItems = state.scheduleItems.filter((i) => i.id !== itemId);
    const newArranged = state.arrangedArtistIds.filter((id) => id !== item.artistId);
    const { conflicts, heatSnapshots, score } = recalculate({
      scheduleItems: newItems,
      activatedWeather: state.activatedWeather,
    });

    set({
      scheduleItems: newItems,
      arrangedArtistIds: newArranged,
      conflicts,
      heatSnapshots,
      score,
      selectedConflictId: null,
    });
  },

  moveScheduleItem: (itemId, newStageId, newStartTime) => {
    const state = get();
    if (state.phase !== 'playing') return;
    const item = state.scheduleItems.find((i) => i.id === itemId);
    if (!item) return;

    const artist = artists.find((a) => a.id === item.artistId);
    if (!artist) return;

    const newItems = state.scheduleItems.map((i) =>
      i.id === itemId ? { ...i, stageId: newStageId, startTime: newStartTime, endTime: newStartTime + artist.duration } : i
    );
    const { conflicts, heatSnapshots, score } = recalculate({
      scheduleItems: newItems,
      activatedWeather: state.activatedWeather,
    });

    set({
      scheduleItems: newItems,
      conflicts,
      heatSnapshots,
      score,
      selectedConflictId: null,
    });
  },

  pause: () => set({ phase: 'paused' }),
  resume: () => set({ phase: 'playing' }),
  restart: () => {
    set({
      phase: 'playing',
      scheduleItems: [],
      conflicts: [],
      activatedWeather: [],
      arrangedArtistIds: [],
      history: [],
      reviewTick: 0,
      selectedConflictId: null,
      heatSnapshots: [],
      score: initialScore,
      weatherJustTriggered: null,
      dragPreview: null,
    });
  },
  enterReview: () => {
    const state = get();
    set({ phase: 'review', reviewTick: state.history.length - 1 });
  },
  exitReview: () => set({ phase: 'finished' }),
  finishGame: () => set({ phase: 'finished' }),
  setReviewTick: (tick) => set({ reviewTick: tick }),
  selectConflict: (id) => set({ selectedConflictId: id }),
  dismissWeatherAlert: () => set({ weatherJustTriggered: null }),
  setDragPreview: (preview) => set({ dragPreview: preview }),
  setTimelineRef: (ref) => set({ timelineRef: ref }),

  undoLastAction: () => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.history.length === 0) return;

    const prev = state.history[state.history.length - 1];
    const prevItems = state.history.length >= 2
      ? state.history[state.history.length - 2].scheduleItems
      : [];
    const prevArranged = prevItems.map((i) => i.artistId);
    const prevWeather = state.activatedWeather.filter(
      (w) => prev.activatedWeather.includes(w.id)
    );

    const { conflicts, heatSnapshots, score } = recalculate({
      scheduleItems: prevItems,
      activatedWeather: prevWeather,
    });

    set({
      scheduleItems: prevItems,
      arrangedArtistIds: prevArranged,
      activatedWeather: prevWeather,
      conflicts,
      heatSnapshots,
      score,
      history: state.history.slice(0, -1),
      selectedConflictId: null,
    });
  },
}));
