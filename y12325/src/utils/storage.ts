import { Experiment, BatchJob } from '@/types';

const EXPERIMENTS_KEY = 'fractal_experiments';
const BATCH_JOBS_KEY = 'fractal_batch_jobs';

export const storage = {
  saveExperiments: (experiments: Experiment[]) => {
    try {
      localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
    } catch (e) {
      console.error('Failed to save experiments:', e);
    }
  },

  loadExperiments: (): Experiment[] => {
    try {
      const data = localStorage.getItem(EXPERIMENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((e: Experiment) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        }));
      }
    } catch (e) {
      console.error('Failed to load experiments:', e);
    }
    return [];
  },

  saveBatchJobs: (jobs: BatchJob[]) => {
    try {
      localStorage.setItem(BATCH_JOBS_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed to save batch jobs:', e);
    }
  },

  loadBatchJobs: (): BatchJob[] => {
    try {
      const data = localStorage.getItem(BATCH_JOBS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((j: BatchJob) => ({
          ...j,
          experiments: j.experiments.map((e: Experiment) => ({
            ...e,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt),
          })),
        }));
      }
    } catch (e) {
      console.error('Failed to load batch jobs:', e);
    }
    return [];
  },

  saveCanvasImage: (id: string, dataUrl: string) => {
    try {
      localStorage.setItem(`canvas_${id}`, dataUrl);
    } catch (e) {
      console.error('Failed to save canvas image:', e);
    }
  },

  loadCanvasImage: (id: string): string | null => {
    try {
      return localStorage.getItem(`canvas_${id}`);
    } catch (e) {
      console.error('Failed to load canvas image:', e);
      return null;
    }
  },

  clearAll: () => {
    localStorage.removeItem(EXPERIMENTS_KEY);
    localStorage.removeItem(BATCH_JOBS_KEY);
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('canvas_')) {
        localStorage.removeItem(key);
      }
    });
  },
};
