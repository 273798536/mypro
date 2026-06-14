import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Anomaly, Annotation, AuthorizationNote, ChangeRecord, AlignmentItem } from "@/types";
import { initialAnomalies, initialAnnotations, initialAuthorizationNotes, initialChangeRecords, initialAlignmentItems } from "@/mockData";

interface StoreState {
  anomalies: Anomaly[];
  annotations: Annotation[];
  authorizationNotes: AuthorizationNote[];
  changeRecords: ChangeRecord[];
  alignmentItems: AlignmentItem[];
  selectedAnomalyId: string | null;
  filterSession: string;
  filterChannel: string;

  setSelectedAnomalyId: (id: string | null) => void;
  setFilterSession: (session: string) => void;
  setFilterChannel: (channel: string) => void;

  addAnnotation: (anomalyId: string, content: string, author: string, impactScope: string[], sourceLine: string) => void;
  overrideAnomalyJudgment: (anomalyId: string, newJudgment: string, author: string) => void;
  addAuthorizationNote: (content: string, author: string) => void;
  confirmAnomaly: (anomalyId: string, author: string) => void;
  realignItem: (alignmentItemId: string, note: string) => void;
}

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      anomalies: initialAnomalies,
      annotations: initialAnnotations,
      authorizationNotes: initialAuthorizationNotes,
      changeRecords: initialChangeRecords,
      alignmentItems: initialAlignmentItems,
      selectedAnomalyId: null,
      filterSession: "",
      filterChannel: "",

      setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),
      setFilterSession: (session) => set({ filterSession: session }),
      setFilterChannel: (channel) => set({ filterChannel: channel }),

      addAnnotation: (anomalyId, content, author, impactScope, sourceLine) => {
        const annotation: Annotation = {
          id: genId("ANN"),
          anomalyId,
          content,
          author,
          impactScope,
          sourceLine,
          createdAt: new Date().toISOString(),
        };
        const anomaly = get().anomalies.find((a) => a.id === anomalyId);
        const changeRecord: ChangeRecord = {
          id: genId("CHR"),
          type: "annotation",
          description: `为 ${anomalyId} 添加批注：${content.slice(0, 40)}...`,
          impactScope,
          sourceLine,
          author,
          beforeValue: anomaly?.currentJudgment ?? "",
          afterValue: anomaly?.currentJudgment ?? "",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          annotations: [...state.annotations, annotation],
          changeRecords: [...state.changeRecords, changeRecord],
        }));
      },

      overrideAnomalyJudgment: (anomalyId, newJudgment, author) => {
        const anomaly = get().anomalies.find((a) => a.id === anomalyId);
        if (!anomaly) return;
        const before = anomaly.currentJudgment;
        const changeRecord: ChangeRecord = {
          id: genId("CHR"),
          type: "override",
          description: `${anomaly.channel} 判断由'${before}'覆盖为'${newJudgment}'`,
          impactScope: [`${anomaly.session}`, `${anomaly.channel}`],
          sourceLine: `${anomalyId}`,
          author,
          beforeValue: before,
          afterValue: newJudgment,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId ? { ...a, currentJudgment: newJudgment, status: "overridden" as const } : a
          ),
          changeRecords: [...state.changeRecords, changeRecord],
        }));
      },

      addAuthorizationNote: (content, author) => {
        const noteId = genId("AUTH");
        const affectedFiles: string[] = [];
        const affectedTracks: string[] = [];
        const affectedChecklist: string[] = [];

        const alignmentUpdates = get().alignmentItems.map((item) => {
          if (item.alignmentStatus === "offset") {
            affectedFiles.push(item.fileName);
            affectedTracks.push(item.trackName);
            affectedChecklist.push(item.checklistEntry);
            return { ...item, alignmentStatus: "aligned" as const, note: `授权备注 ${noteId} 对齐` };
          }
          return item;
        });

        const authorizationNote: AuthorizationNote = {
          id: noteId,
          content,
          author,
          affectedFiles,
          affectedTracks,
          affectedChecklist,
          createdAt: new Date().toISOString(),
        };

        const changeRecord: ChangeRecord = {
          id: genId("CHR"),
          type: "authorization",
          description: `补入授权备注：${content.slice(0, 40)}...`,
          impactScope: [...affectedFiles, ...affectedTracks, ...affectedChecklist],
          sourceLine: noteId,
          author,
          beforeValue: `${affectedFiles.length} 项偏移`,
          afterValue: "全部对齐",
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          authorizationNotes: [...state.authorizationNotes, authorizationNote],
          alignmentItems: alignmentUpdates,
          changeRecords: [...state.changeRecords, changeRecord],
        }));
      },

      confirmAnomaly: (anomalyId, author) => {
        const anomaly = get().anomalies.find((a) => a.id === anomalyId);
        if (!anomaly) return;
        const before = anomaly.status;
        const changeRecord: ChangeRecord = {
          id: genId("CHR"),
          type: "annotation",
          description: `${anomaly.channel} 状态从'${before}'确认为'confirmed'`,
          impactScope: [anomaly.channel, anomaly.session],
          sourceLine: anomalyId,
          author,
          beforeValue: before,
          afterValue: "confirmed",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId ? { ...a, status: "confirmed" as const } : a
          ),
          changeRecords: [...state.changeRecords, changeRecord],
        }));
      },

      realignItem: (alignmentItemId, note) => {
        set((state) => ({
          alignmentItems: state.alignmentItems.map((item) =>
            item.id === alignmentItemId ? { ...item, alignmentStatus: "aligned" as const, note } : item
          ),
        }));
      },
    }),
    {
      name: "iem-alert-storage",
    }
  )
);
