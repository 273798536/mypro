import { create } from 'zustand';
import type { Playlist, Song, OperationLog, ValidationRule } from '@/types';
import { generateId } from '@/utils/helpers';
import { calculateBalanceScore } from '@/utils/validation';
import { defaultValidationRules, mockPlaylist, mockOperationLogs } from '@/data/mockData';

interface AppState {
  playlists: Playlist[];
  operationLogs: OperationLog[];
  validationRules: ValidationRule[];
  currentUser: string;
  currentValidationResult: Map<string, ReturnType<typeof calculateBalanceScore>>;

  loadFromStorage: () => void;
  saveToStorage: () => void;

  createPlaylist: (name: string, description: string, songs: Song[]) => Playlist;
  deletePlaylist: (id: string) => void;
  lockPlaylist: (id: string) => void;
  unlockPlaylist: (id: string) => void;

  addSongs: (playlistId: string, songs: Song[], remark?: string) => void;
  updateSong: (playlistId: string, songId: string, updates: Partial<Song>, remark?: string) => void;
  deleteSong: (playlistId: string, songId: string, remark?: string) => void;

  validatePlaylist: (playlistId: string) => ReturnType<typeof calculateBalanceScore>;
  getValidationResult: (playlistId: string) => ReturnType<typeof calculateBalanceScore> | undefined;

  updateValidationRule: (id: string, updates: Partial<ValidationRule>) => void;
  resetValidationRules: () => void;

  setCurrentUser: (name: string) => void;
}

const STORAGE_KEY = 'radio-playlist-balancer';

export const useStore = create<AppState>((set, get) => ({
  playlists: [mockPlaylist],
  operationLogs: [...mockOperationLogs],
  validationRules: [...defaultValidationRules],
  currentUser: '编导张三',
  currentValidationResult: new Map(),

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          playlists: data.playlists || [mockPlaylist],
          operationLogs: data.operationLogs || [...mockOperationLogs],
          validationRules: data.validationRules || [...defaultValidationRules],
          currentUser: data.currentUser || '编导张三',
        });
      }
    } catch {
      /* ignore */
    }
  },

  saveToStorage: () => {
    const { playlists, operationLogs, validationRules, currentUser } = get();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ playlists, operationLogs, validationRules, currentUser })
      );
    } catch {
      /* ignore */
    }
  },

  createPlaylist: (name, description, songs) => {
    const now = new Date().toISOString();
    const playlist: Playlist = {
      id: generateId(),
      name,
      description,
      songs,
      version: 1,
      versionName: '初稿',
      isLocked: false,
      createdAt: now,
      updatedAt: now,
      createdBy: get().currentUser,
    };
    set((state) => {
      const logs: OperationLog = {
        id: generateId(),
        playlistId: playlist.id,
        operationType: 'create',
        operator: state.currentUser,
        timestamp: now,
        remark: `创建歌单「${name}」，包含 ${songs.length} 首歌曲`,
      };
      return {
        playlists: [...state.playlists, playlist],
        operationLogs: [...state.operationLogs, logs],
      };
    });
    get().saveToStorage();
    return playlist;
  },

  deletePlaylist: (id) => {
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
      operationLogs: [
        ...state.operationLogs,
        {
          id: generateId(),
          playlistId: id,
          operationType: 'delete',
          operator: state.currentUser,
          timestamp: new Date().toISOString(),
          remark: '删除歌单',
        },
      ],
    }));
    get().saveToStorage();
  },

  lockPlaylist: (id) => {
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, isLocked: true } : p)),
      operationLogs: [
        ...state.operationLogs,
        {
          id: generateId(),
          playlistId: id,
          operationType: 'lock',
          operator: state.currentUser,
          timestamp: new Date().toISOString(),
          remark: '锁定歌单',
        },
      ],
    }));
    get().saveToStorage();
  },

  unlockPlaylist: (id) => {
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, isLocked: false } : p)),
      operationLogs: [
        ...state.operationLogs,
        {
          id: generateId(),
          playlistId: id,
          operationType: 'unlock',
          operator: state.currentUser,
          timestamp: new Date().toISOString(),
          remark: '解锁歌单',
        },
      ],
    }));
    get().saveToStorage();
  },

  addSongs: (playlistId, songs, remark) => {
    const now = new Date().toISOString();
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId ? { ...p, songs: [...p.songs, ...songs], updatedAt: now } : p
      ),
      operationLogs: [
        ...state.operationLogs,
        {
          id: generateId(),
          playlistId,
          operationType: 'import',
          operator: state.currentUser,
          timestamp: now,
          remark: remark || `导入 ${songs.length} 首歌曲`,
        },
      ],
    }));
    get().saveToStorage();
  },

  updateSong: (playlistId, songId, updates, remark) => {
    const now = new Date().toISOString();
    set((state) => {
      const playlist = state.playlists.find((p) => p.id === playlistId);
      const song = playlist?.songs.find((s) => s.id === songId);
      if (!song) return state;

      const changedFields = Object.keys(updates) as (keyof Song)[];
      const newLogs: OperationLog[] = changedFields.map((field) => ({
        id: generateId(),
        playlistId,
        songId,
        operationType: 'update' as const,
        field: field as string,
        oldValue: String(song[field]),
        newValue: String(updates[field]),
        operator: state.currentUser,
        timestamp: now,
        remark: remark || '',
      }));

      return {
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                songs: p.songs.map((s) =>
                  s.id === songId ? { ...s, ...updates, updatedAt: now } : s
                ),
                updatedAt: now,
              }
            : p
        ),
        operationLogs: [...state.operationLogs, ...newLogs],
      };
    });
    get().saveToStorage();
  },

  deleteSong: (playlistId, songId, remark) => {
    const now = new Date().toISOString();
    set((state) => {
      const playlist = state.playlists.find((p) => p.id === playlistId);
      const song = playlist?.songs.find((s) => s.id === songId);
      return {
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, songs: p.songs.filter((s) => s.id !== songId), updatedAt: now }
            : p
        ),
        operationLogs: [
          ...state.operationLogs,
          {
            id: generateId(),
            playlistId,
            songId,
            operationType: 'delete',
            oldValue: song ? `${song.title} - ${song.artist}` : '',
            operator: state.currentUser,
            timestamp: now,
            remark: remark || '删除歌曲',
          },
        ],
      };
    });
    get().saveToStorage();
  },

  validatePlaylist: (playlistId) => {
    const state = get();
    const playlist = state.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return { score: 0, details: { artistScore: 0, decadeScore: 0, tagScore: 0, genreScore: 0 }, issues: [] };
    }
    const result = calculateBalanceScore(playlist.songs, state.validationRules);
    set((s) => {
      const newMap = new Map(s.currentValidationResult);
      newMap.set(playlistId, result);
      return { currentValidationResult: newMap };
    });
    return result;
  },

  getValidationResult: (playlistId) => {
    return get().currentValidationResult.get(playlistId);
  },

  updateValidationRule: (id, updates) => {
    set((state) => ({
      validationRules: state.validationRules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    get().saveToStorage();
  },

  resetValidationRules: () => {
    set({ validationRules: [...defaultValidationRules] });
    get().saveToStorage();
  },

  setCurrentUser: (name) => {
    set({ currentUser: name });
    get().saveToStorage();
  },
}));
