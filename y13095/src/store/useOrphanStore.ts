import { create } from 'zustand';
import type { OrphanScreenshot } from '@/types';
import { getStorage, setStorage, generateId } from '@/utils/storage';
import { mockOrphanScreenshots } from '@/data/mockData';

interface OrphanState {
  screenshots: OrphanScreenshot[];
  loadScreenshots: () => void;
  addScreenshot: (pointId: string, imageUrl: string, lostReason: string) => void;
  markRelinked: (id: string) => void;
  getScreenshotsByPointId: (pointId: string) => OrphanScreenshot[];
}

const STORAGE_KEY = 'orphan_screenshots';
const INIT_FLAG = 'orphan_initialized';

export const useOrphanStore = create<OrphanState>((set, get) => ({
  screenshots: [],

  loadScreenshots: () => {
    const initialized = getStorage(INIT_FLAG, false);
    if (!initialized) {
      setStorage(STORAGE_KEY, mockOrphanScreenshots);
      setStorage(INIT_FLAG, true);
      set({ screenshots: mockOrphanScreenshots });
    } else {
      const screenshots = getStorage<OrphanScreenshot[]>(STORAGE_KEY, mockOrphanScreenshots);
      set({ screenshots });
    }
  },

  addScreenshot: (pointId, imageUrl, lostReason) => {
    const { screenshots } = get();
    
    const newScreenshot: OrphanScreenshot = {
      id: generateId(),
      pointId,
      imageUrl,
      lostReason,
      isRelinked: false,
      createdAt: new Date().toISOString(),
    };

    const updatedScreenshots = [...screenshots, newScreenshot];
    setStorage(STORAGE_KEY, updatedScreenshots);
    set({ screenshots: updatedScreenshots });
  },

  markRelinked: (id) => {
    const { screenshots } = get();
    const updatedScreenshots = screenshots.map(s =>
      s.id === id ? { ...s, isRelinked: true } : s
    );
    setStorage(STORAGE_KEY, updatedScreenshots);
    set({ screenshots: updatedScreenshots });
  },

  getScreenshotsByPointId: (pointId) => {
    return get().screenshots
      .filter(s => s.pointId === pointId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
}));
