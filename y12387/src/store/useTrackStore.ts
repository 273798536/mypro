import { create } from 'zustand';
import { Track } from '@/types';
import { initialTracks } from '@/mock/initialData';

interface TrackState {
  tracks: Track[];
  selectedTrack: Track | null;
  setSelectedTrack: (track: Track | null) => void;
  addTrack: (track: Track) => void;
  updateTrack: (id: string, track: Partial<Track>) => void;
  deleteTrack: (id: string) => void;
  getTrackById: (id: string) => Track | undefined;
}

export const useTrackStore = create<TrackState>((set, get) => ({
  tracks: initialTracks,
  selectedTrack: null,
  setSelectedTrack: (track) => set({ selectedTrack: track }),
  addTrack: (track) =>
    set((state) => ({ tracks: [...state.tracks, track] })),
  updateTrack: (id, track) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, ...track, updatedAt: new Date().toISOString() } : t
      ),
    })),
  deleteTrack: (id) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
    })),
  getTrackById: (id) => get().tracks.find((t) => t.id === id),
}));
