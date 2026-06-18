import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Version, Sample, LeakRecord } from '@/types';
import { mockVersions } from '@/data/mockVersions';

interface VersionState {
  versions: Version[];
  selectedBaseVersionId: string;
  selectedTargetVersionId: string;
  rerunStatus: Record<string, 'idle' | 'running' | 'done'>;
  setSelectedBaseVersion: (id: string) => void;
  setSelectedTargetVersion: (id: string) => void;
  toggleLeakStatus: (versionId: string, sampleId: string, reason?: string) => void;
  rerunSample: (versionId: string, sampleId: string) => void;
  rerunAll: (versionId: string) => void;
  getVersionById: (id: string) => Version | undefined;
  getLeakSamples: (versionId: string) => Sample[];
  getTopContributionSamples: (versionId: string, limit?: number) => Sample[];
  addLeakRecord: (versionId: string, record: Omit<LeakRecord, 'id' | 'markedAt'>) => void;
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      versions: mockVersions,
      selectedBaseVersionId: 'v4',
      selectedTargetVersionId: 'v5',
      rerunStatus: {},

      setSelectedBaseVersion: (id) => set({ selectedBaseVersionId: id }),
      setSelectedTargetVersion: (id) => set({ selectedTargetVersionId: id }),

      toggleLeakStatus: (versionId, sampleId, reason) =>
        set((state) => ({
          versions: state.versions.map((v) => {
            if (v.id !== versionId) return v;
            const isCurrentlyLeak = v.samples.find((s) => s.id === sampleId)?.isLeak ?? false;
            return {
              ...v,
              samples: v.samples.map((s) =>
                s.id === sampleId ? { ...s, isLeak: !isCurrentlyLeak } : s
              ),
              leakRecords: !isCurrentlyLeak
                ? [
                    ...v.leakRecords,
                    {
                      id: `leak-${Date.now()}`,
                      sampleId,
                      markedBy: '当前用户',
                      markedAt: new Date().toLocaleString('zh-CN'),
                      reason: reason || '',
                    },
                  ]
                : v.leakRecords.filter((r) => r.sampleId !== sampleId),
            };
          }),
        })),

      addLeakRecord: (versionId, record) =>
        set((state) => ({
          versions: state.versions.map((v) => {
            if (v.id !== versionId) return v;
            return {
              ...v,
              leakRecords: [
                ...v.leakRecords,
                {
                  ...record,
                  id: `leak-${Date.now()}`,
                  markedAt: new Date().toLocaleString('zh-CN'),
                },
              ],
            };
          }),
        })),

      rerunSample: (versionId, sampleId) => {
        const key = `${versionId}-${sampleId}`;
        set((state) => ({
          rerunStatus: { ...state.rerunStatus, [key]: 'running' },
        }));
        setTimeout(() => {
          set((state) => ({
            rerunStatus: { ...state.rerunStatus, [key]: 'done' },
          }));
        }, 1500);
      },

      rerunAll: (versionId) => {
        const state = get();
        const version = state.versions.find((v) => v.id === versionId);
        if (!version) return;

        const statusUpdates: Record<string, 'running'> = {};
        version.samples.forEach((s) => {
          statusUpdates[`${versionId}-${s.id}`] = 'running';
        });
        set((state) => ({
          rerunStatus: { ...state.rerunStatus, ...statusUpdates },
        }));

        setTimeout(() => {
          const doneUpdates: Record<string, 'done'> = {};
          version.samples.forEach((s) => {
            doneUpdates[`${versionId}-${s.id}`] = 'done';
          });
          set((state) => ({
            rerunStatus: { ...state.rerunStatus, ...doneUpdates },
          }));
        }, 2000);
      },

      getVersionById: (id) => get().versions.find((v) => v.id === id),

      getLeakSamples: (versionId) => {
        const version = get().versions.find((v) => v.id === versionId);
        return version ? version.samples.filter((s) => s.isLeak) : [];
      },

      getTopContributionSamples: (versionId, limit = 10) => {
        const version = get().versions.find((v) => v.id === versionId);
        if (!version) return [];
        return [...version.samples]
          .sort((a, b) => b.contribution.score - a.contribution.score)
          .slice(0, limit);
      },
    }),
    {
      name: 'version-store',
      partialize: (state) => ({
        versions: state.versions,
        rerunStatus: state.rerunStatus,
      }),
    }
  )
);
