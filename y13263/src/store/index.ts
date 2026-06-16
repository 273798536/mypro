import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppStore,
  ResidentFeedback,
  FeedbackVersion,
  Location,
  LocationAlias,
  LocationPair,
  MergeEvidence,
  DrainagePlan,
  PlanScheme,
  TimelineEvent,
  PlanVersion,
  ChangeSnapshot,
  CalculationBasis,
  ImportFeedbackRaw,
  FeedbackStatus,
  PlanStatus,
} from "@/types";
import {
  uid,
  nowISO,
  nameSimilarity,
  haversineDistance,
  MERGE_DISTANCE_THRESHOLD,
  MERGE_SIMILARITY_THRESHOLD,
  detectDuplicateContent,
} from "@/utils/helpers";

const OPERATOR = "老曹";

function createSchemes(feedbackCount: number): PlanScheme[] {
  const base = feedbackCount * 1.2;
  return [
    {
      id: uid("sch"),
      name: "常规清掏方案",
      cost: Math.round(8000 + base * 500),
      duration: 3,
      effectiveness: Number((0.72 + Math.min(feedbackCount * 0.02, 0.15)).toFixed(2)),
      riskLevel: "low",
      isAnomaly: feedbackCount >= 5,
      anomalyReason: feedbackCount >= 5 ? "反馈次数较多，常规方案可能不充分" : undefined,
    },
    {
      id: uid("sch"),
      name: "增设沉泥井方案",
      cost: Math.round(22000 + base * 800),
      duration: 7,
      effectiveness: Number((0.88 + Math.min(feedbackCount * 0.01, 0.08)).toFixed(2)),
      riskLevel: "medium",
      isAnomaly: false,
    },
    {
      id: uid("sch"),
      name: "管网改造方案",
      cost: Math.round(68000 + base * 1500),
      duration: 15,
      effectiveness: 0.96,
      riskLevel: "high",
      isAnomaly: feedbackCount <= 2,
      anomalyReason: feedbackCount <= 2 ? "反馈较少，改造方案投入产出比偏低" : undefined,
    },
  ];
}

function buildCalculation(feedbacks: ResidentFeedback[]): CalculationBasis {
  const activeCount = feedbacks.filter((f) => f.status === "active").length;
  const suspendedCount = feedbacks.filter((f) => f.status === "suspended").length;
  const totalCount = feedbacks.filter((f) => f.status !== "withdrawn").length;
  return {
    formula: "积淤风险指数 = 有效反馈数 × 1.2 + 挂起数 × 0.5",
    parameters: {
      activeFeedbackCount: activeCount,
      suspendedFeedbackCount: suspendedCount,
      totalFeedbackCount: totalCount,
      riskIndex: Number((activeCount * 1.2 + suspendedCount * 0.5).toFixed(2)),
    },
    sourceFeedbackIds: feedbacks.map((f) => f.id),
    updatedAt: nowISO(),
  };
}

function buildTimelineEvent(
  planId: string,
  eventType: TimelineEvent["eventType"],
  description: string,
  relatedFeedbackIds?: string[],
): TimelineEvent {
  return {
    id: uid("ev"),
    planId,
    eventType,
    description,
    operator: OPERATOR,
    createdAt: nowISO(),
    relatedFeedbackIds,
  };
}

function buildSnapshot(
  planId: string,
  title: string,
  description: string,
  before: string,
  after: string,
  note: string,
): ChangeSnapshot {
  return {
    id: uid("snap"),
    planId,
    title,
    description,
    beforeState: before,
    afterState: after,
    screenshotNote: note,
    createdAt: nowISO(),
  };
}

const initialState: Omit<AppStore, keyof object> = {
  feedbacks: [],
  locations: [],
  mergeEvidences: [],
  locationPairs: [],
  plans: [],
  currentOperator: OPERATOR,
  importFeedbacks: () => undefined,
  addFeedback: () => undefined,
  supplementFeedback: () => undefined,
  withdrawFeedback: () => undefined,
  suspendFeedback: () => undefined,
  confirmSuspended: () => undefined,
  detectLocationPairs: () => undefined,
  mergeLocations: () => undefined,
  rejectMerge: () => undefined,
  recalculatePlan: () => undefined,
  createPlanForLocation: () => undefined,
  getFeedbacksByLocation: () => [],
  getActiveFeedbacksByLocation: () => [],
  resetAll: () => undefined,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      feedbacks: [],
      locations: [],
      mergeEvidences: [],
      locationPairs: [],
      plans: [],
      currentOperator: OPERATOR,

      importFeedbacks: (rawList: ImportFeedbackRaw[]) => {
        const state = get();
        const newFeedbacks: ResidentFeedback[] = [];
        const newLocations: Location[] = [...state.locations];
        const timelineByPlan: Record<string, TimelineEvent[]> = {};

        for (const raw of rawList) {
          let location: Location | undefined = newLocations.find(
            (loc) => loc.canonicalName === raw.locationName,
          );
          if (!location) {
            location = {
              id: uid("loc"),
              canonicalName: raw.locationName,
              lng: raw.lng ?? 116.4 + Math.random() * 0.05,
              lat: raw.lat ?? 39.9 + Math.random() * 0.05,
              status: "active",
              aliases: [],
              feedbackCount: 0,
            };
            newLocations.push(location);
          }
          const alias: LocationAlias = {
            id: uid("alias"),
            locationId: location.id,
            aliasName: raw.locationName,
            isMerged: true,
            firstSeenAt: nowISO(),
            lng: location.lng,
            lat: location.lat,
          };
          location.aliases.push(alias);

          const versionId = uid("ver");
          const isDup = newFeedbacks.some((f) =>
            f.locationId === location!.id &&
            detectDuplicateContent(f.content, raw.content),
          );

          const dupOf = isDup
            ? newFeedbacks.find((f) =>
                f.locationId === location!.id &&
                detectDuplicateContent(f.content, raw.content),
              )?.id
            : undefined;

          const fbStatus: FeedbackStatus = isDup ? "suspended" : (raw.status ?? "active");
          const fbId = uid("fb");

          const version: FeedbackVersion = {
            id: versionId,
            feedbackId: fbId,
            contentBefore: null,
            contentAfter: raw.content,
            changeType: "create",
            operator: OPERATOR,
            remark: "批量导入历史材料",
            createdAt: nowISO(),
          };

          const feedback: ResidentFeedback = {
            id: fbId,
            locationId: location.id,
            locationNameRaw: raw.locationName,
            content: raw.content,
            status: fbStatus,
            source: raw.source,
            reporterName: raw.reporterName,
            createdAt: nowISO(),
            versions: [version],
            duplicateOf: dupOf,
          };
          newFeedbacks.push(feedback);
          location.feedbackCount += 1;

          if (isDup) {
            const plan = state.plans.find((p) => p.locationId === location!.id);
            if (plan) {
              if (!timelineByPlan[plan.id]) timelineByPlan[plan.id] = [];
              timelineByPlan[plan.id].push(
                buildTimelineEvent(
                  plan.id,
                  "suspend",
                  `导入发现疑似重复投诉，已自动挂起等待排班同事确认：「${raw.content.slice(0, 20)}…」`,
                  [feedback.id],
                ),
              );
            }
          }
        }

        const updatedFeedbacks: ResidentFeedback[] = [...state.feedbacks, ...newFeedbacks];
        const updatedLocations: Location[] = newLocations.map((loc) => ({
          ...loc,
          feedbackCount: updatedFeedbacks.filter(
            (f) => f.locationId === loc.id && f.status !== "withdrawn",
          ).length,
        }));

        const updatedPlans: DrainagePlan[] = state.plans.map((plan) => {
          const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === plan.locationId);
          const beforeState = JSON.stringify({
            status: plan.status,
            schemeCount: plan.schemes.length,
            feedbackCount: plan.currentCalculation.parameters.totalFeedbackCount,
          });
          const newSchemes = createSchemes(
            locFeedbacks.filter((f) => f.status !== "withdrawn").length,
          );
          const newCalc = buildCalculation(locFeedbacks);
          const version: PlanVersion = {
            id: uid("pv"),
            planId: plan.id,
            snapshotBefore: JSON.stringify({
              schemes: plan.schemes,
              calculation: plan.currentCalculation,
            }),
            snapshotAfter: JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
            remark: "导入历史反馈材料后自动重算方案",
            createdAt: nowISO(),
          };
          const afterState = JSON.stringify({
            status: plan.status,
            schemeCount: newSchemes.length,
            feedbackCount: newCalc.parameters.totalFeedbackCount,
          });
          const snap = buildSnapshot(
            plan.id,
            "导入历史反馈材料",
            `批量导入 ${newFeedbacks.length} 条居民反馈，触发方案自动重算`,
            beforeState,
            afterState,
            `变更说明：新增反馈 ${newFeedbacks.length} 条；前方案反馈基数 ${plan.currentCalculation.parameters.totalFeedbackCount} → ${newCalc.parameters.totalFeedbackCount}；已保留旧版本方案作为对比。`,
          );
          const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
            ? "suspended"
            : plan.status;
          return {
            ...plan,
            status: planStatus,
            schemes: newSchemes,
            currentCalculation: newCalc,
            versions: [...plan.versions, version],
            snapshots: [...plan.snapshots, snap],
            timeline: [
              ...plan.timeline,
              ...(timelineByPlan[plan.id] ?? []),
              buildTimelineEvent(plan.id, "import", `批量导入 ${newFeedbacks.length} 条居民反馈`, newFeedbacks.map((f) => f.id)),
            ],
            updatedAt: nowISO(),
          };
        });

        for (const loc of updatedLocations) {
          if (!updatedPlans.some((p) => p.locationId === loc.id)) {
            const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === loc.id);
            const schemes = createSchemes(
              locFeedbacks.filter((f) => f.status !== "withdrawn").length,
            );
            const calc = buildCalculation(locFeedbacks);
            const planId = uid("plan");
            const firstSnap = buildSnapshot(
              planId,
              "方案首次生成",
              `基于 ${locFeedbacks.length} 条居民反馈生成初始比选方案`,
              "（空）",
              JSON.stringify({ schemes: schemes.length, calc: calc.parameters.riskIndex }),
              `首次生成方案：${loc.canonicalName}，共 ${locFeedbacks.length} 条反馈，风险指数 ${calc.parameters.riskIndex.toFixed(2)}。`,
            );
            const firstEvent = buildTimelineEvent(
              planId,
              "calculate",
              `首次生成 ${loc.canonicalName} 方案`,
              locFeedbacks.map((f) => f.id),
            );
            const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
              ? "suspended"
              : "draft";
            updatedPlans.push({
              id: planId,
              locationId: loc.id,
              name: `${loc.canonicalName} 雨水口积淤方案`,
              status: planStatus,
              schemes,
              currentCalculation: calc,
              versions: [],
              snapshots: [firstSnap],
              timeline: [firstEvent],
              createdAt: nowISO(),
              updatedAt: nowISO(),
            });
          }
        }

        for (const p of updatedPlans) {
          p.snapshots = p.snapshots.filter(Boolean);
          p.timeline = p.timeline.filter(Boolean);
        }

        set({
          feedbacks: updatedFeedbacks,
          locations: updatedLocations,
          plans: updatedPlans,
        });
        get().detectLocationPairs();
      },

      addFeedback: (data: ImportFeedbackRaw) => {
        get().importFeedbacks([data]);
      },

      supplementFeedback: (feedbackId: string, newContent: string, remark?: string) => {
        const state = get();
        const feedback = state.feedbacks.find((f) => f.id === feedbackId);
        if (!feedback) return;

        const version: FeedbackVersion = {
          id: uid("ver"),
          feedbackId,
          contentBefore: feedback.content,
          contentAfter: newContent,
          changeType: "supplement",
          operator: OPERATOR,
          remark,
          createdAt: nowISO(),
        };

        const nextStatus: FeedbackStatus = feedback.status === "withdrawn" ? "active" : feedback.status;
        const updatedFeedbacks: ResidentFeedback[] = state.feedbacks.map((f) =>
          f.id === feedbackId
            ? { ...f, content: newContent, versions: [...f.versions, version], status: nextStatus }
            : f,
        );

        const updatedPlans: DrainagePlan[] = state.plans
          .filter((p) => p.locationId === feedback.locationId)
          .map((plan) => {
            const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === plan.locationId);
            const beforeState = JSON.stringify({
              content: feedback.content,
              riskIndex: plan.currentCalculation.parameters.riskIndex,
            });
            const beforeSnapshot = JSON.stringify({
              schemes: plan.schemes,
              calculation: plan.currentCalculation,
            });
            const newSchemes = createSchemes(
              locFeedbacks.filter((f) => f.status !== "withdrawn").length,
            );
            const newCalc = buildCalculation(locFeedbacks);
            const planVersion: PlanVersion = {
              id: uid("pv"),
              planId: plan.id,
              snapshotBefore: beforeSnapshot,
              snapshotAfter: JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
              remark: remark ?? `补充反馈 #${feedbackId.slice(-6)}`,
              createdAt: nowISO(),
            };
            const afterState = JSON.stringify({
              content: newContent,
              riskIndex: newCalc.parameters.riskIndex,
            });
            const snap = buildSnapshot(
              plan.id,
              "分批补充居民反馈",
              `反馈 #${feedbackId.slice(-6)} 补充新材料（原有判断未覆盖）`,
              beforeState,
              afterState,
              `变更说明：反馈内容由「${feedback.content.slice(0, 20)}…」补充为「${newContent.slice(0, 20)}…」；风险指数由 ${plan.currentCalculation.parameters.riskIndex.toFixed(2)} → ${newCalc.parameters.riskIndex.toFixed(2)}；旧方案版本已归档保留，未被覆盖。`,
            );
            const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
              ? "suspended"
              : "reviewing";
            return {
              ...plan,
              status: planStatus,
              schemes: newSchemes,
              currentCalculation: newCalc,
              versions: [...plan.versions, planVersion],
              snapshots: [...plan.snapshots, snap],
              timeline: [
                ...plan.timeline,
                buildTimelineEvent(
                  plan.id,
                  "supplement",
                  `补充反馈 #${feedbackId.slice(-6)}：${remark ?? newContent.slice(0, 20)}`,
                  [feedbackId],
                ),
                buildTimelineEvent(plan.id, "calculate", "补充反馈后自动重算方案", [feedbackId]),
              ],
              updatedAt: nowISO(),
            };
          });

        set({
          feedbacks: updatedFeedbacks,
          plans: state.plans.map((p) => updatedPlans.find((u) => u.id === p.id) ?? p),
        });
      },

      withdrawFeedback: (feedbackId: string, reason: string) => {
        const state = get();
        const feedback = state.feedbacks.find((f) => f.id === feedbackId);
        if (!feedback) return;

        const version: FeedbackVersion = {
          id: uid("ver"),
          feedbackId,
          contentBefore: feedback.content,
          contentAfter: `[已撤回] ${feedback.content}`,
          changeType: "withdraw",
          operator: OPERATOR,
          remark: reason,
          createdAt: nowISO(),
        };

        const updatedFeedbacks: ResidentFeedback[] = state.feedbacks.map((f) =>
          f.id === feedbackId
            ? { ...f, status: "withdrawn", versions: [...f.versions, version] }
            : f,
        );

        const updatedPlans: DrainagePlan[] = state.plans
          .filter((p) => p.locationId === feedback.locationId)
          .map((plan) => {
            const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === plan.locationId);
            const beforeState = JSON.stringify({
              feedbackStatus: feedback.status,
              riskIndex: plan.currentCalculation.parameters.riskIndex,
              activeCount: plan.currentCalculation.parameters.activeFeedbackCount,
            });
            const beforeSnapshot = JSON.stringify({
              schemes: plan.schemes,
              calculation: plan.currentCalculation,
            });
            const newSchemes = createSchemes(
              locFeedbacks.filter((f) => f.status !== "withdrawn").length,
            );
            const newCalc = buildCalculation(locFeedbacks);
            const planVersion: PlanVersion = {
              id: uid("pv"),
              planId: plan.id,
              snapshotBefore: beforeSnapshot,
              snapshotAfter: JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
              remark: `撤回反馈 #${feedbackId.slice(-6)}：${reason}`,
              createdAt: nowISO(),
            };
            const afterState = JSON.stringify({
              feedbackStatus: "withdrawn",
              riskIndex: newCalc.parameters.riskIndex,
              activeCount: newCalc.parameters.activeFeedbackCount,
            });
            const snap = buildSnapshot(
              plan.id,
              "撤回居民反馈记录",
              `反馈 #${feedbackId.slice(-6)} 被撤回，原因：${reason}`,
              beforeState,
              afterState,
              `变更说明：反馈 #${feedbackId.slice(-6)} 状态由 ${feedback.status} → withdrawn（撤回原因：${reason}）；有效反馈数 ${plan.currentCalculation.parameters.activeFeedbackCount} → ${newCalc.parameters.activeFeedbackCount}；风险指数 ${plan.currentCalculation.parameters.riskIndex.toFixed(2)} → ${newCalc.parameters.riskIndex.toFixed(2)}；撤回仅软删除，原始记录与版本保留在历史中，不可物理删除。`,
            );
            const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
              ? "suspended"
              : "reviewing";
            return {
              ...plan,
              status: planStatus,
              schemes: newSchemes,
              currentCalculation: newCalc,
              versions: [...plan.versions, planVersion],
              snapshots: [...plan.snapshots, snap],
              timeline: [
                ...plan.timeline,
                buildTimelineEvent(
                  plan.id,
                  "withdraw",
                  `撤回反馈 #${feedbackId.slice(-6)}，原因：${reason}`,
                  [feedbackId],
                ),
                buildTimelineEvent(plan.id, "calculate", "撤回反馈后自动重算方案", [feedbackId]),
              ],
              updatedAt: nowISO(),
            };
          });

        set({
          feedbacks: updatedFeedbacks,
          plans: state.plans.map((p) => updatedPlans.find((u) => u.id === p.id) ?? p),
        });
      },

      suspendFeedback: (feedbackId: string, reason: string) => {
        const state = get();
        const feedback = state.feedbacks.find((f) => f.id === feedbackId);
        if (!feedback) return;
        const updatedFeedbacks: ResidentFeedback[] = state.feedbacks.map((f) =>
          f.id === feedbackId ? { ...f, status: "suspended" } : f,
        );
        const updatedPlans: DrainagePlan[] = state.plans
          .filter((p) => p.locationId === feedback.locationId)
          .map((plan) => ({
            ...plan,
            status: "suspended",
            timeline: [
              ...plan.timeline,
              buildTimelineEvent(
                plan.id,
                "suspend",
                `挂起反馈 #${feedbackId.slice(-6)}：${reason}（等待排班同事确认）`,
                [feedbackId],
              ),
            ],
            updatedAt: nowISO(),
          }));
        set({
          feedbacks: updatedFeedbacks,
          plans: state.plans.map((p) => updatedPlans.find((u) => u.id === p.id) ?? p),
        });
      },

      confirmSuspended: (feedbackId: string) => {
        const state = get();
        const feedback = state.feedbacks.find((f) => f.id === feedbackId);
        if (!feedback) return;
        const updatedFeedbacks: ResidentFeedback[] = state.feedbacks.map((f) =>
          f.id === feedbackId ? { ...f, status: "active" } : f,
        );
        const updatedPlans: DrainagePlan[] = state.plans
          .filter((p) => p.locationId === feedback.locationId)
          .map((plan) => {
            const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === plan.locationId);
            const hasSuspended = locFeedbacks.some((f) => f.status === "suspended");
            const planStatus: PlanStatus = hasSuspended ? "suspended" : "reviewing";
            return {
              ...plan,
              status: planStatus,
              timeline: [
                ...plan.timeline,
                buildTimelineEvent(
                  plan.id,
                  "confirm",
                  `排班同事确认反馈 #${feedbackId.slice(-6)} 为有效投诉，解除挂起`,
                  [feedbackId],
                ),
              ],
              updatedAt: nowISO(),
            };
          });
        set({
          feedbacks: updatedFeedbacks,
          plans: state.plans.map((p) => updatedPlans.find((u) => u.id === p.id) ?? p),
        });
      },

      detectLocationPairs: () => {
        const state = get();
        const allAliases = state.locations.flatMap((l) =>
          l.aliases.map((a) => ({ ...a, canonicalName: l.canonicalName, locationStatus: l.status })),
        );
        const pairs: LocationPair[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < allAliases.length; i++) {
          for (let j = i + 1; j < allAliases.length; j++) {
            const a = allAliases[i];
            const b = allAliases[j];
            if (a.locationId === b.locationId) continue;
            const sim = nameSimilarity(a.aliasName, b.aliasName);
            const dist =
              a.lat != null && a.lng != null && b.lat != null && b.lng != null
                ? haversineDistance(a.lat, a.lng, b.lat, b.lng)
                : Infinity;
            if (sim >= MERGE_SIMILARITY_THRESHOLD || dist <= MERGE_DISTANCE_THRESHOLD) {
              const key = [a.id, b.id].sort().join("|");
              if (seen.has(key)) continue;
              seen.add(key);
              pairs.push({
                id: uid("pair"),
                aliasA: a,
                aliasB: b,
                nameSimilarity: sim,
                coordinateDistance: dist,
                reviewed: false,
              });
            }
          }
        }
        const existingIds = new Set(state.locationPairs.map((p) => `${p.aliasA.id}|${p.aliasB.id}`));
        const newPairs = pairs.filter(
          (p) => !existingIds.has(`${p.aliasA.id}|${p.aliasB.id}`) && !existingIds.has(`${p.aliasB.id}|${p.aliasA.id}`),
        );
        set({ locationPairs: [...state.locationPairs, ...newPairs] });
      },

      mergeLocations: (pairId: string, evidenceText: string) => {
        const state = get();
        const pair = state.locationPairs.find((p) => p.id === pairId);
        if (!pair) return;

        if (pair.coordinateDistance > MERGE_DISTANCE_THRESHOLD && pair.nameSimilarity < MERGE_SIMILARITY_THRESHOLD) {
          alert(`距离 ${pair.coordinateDistance.toFixed(0)}m 超过 ${MERGE_DISTANCE_THRESHOLD}m 阈值且名称相似度不足，禁止合并相邻点位`);
          return;
        }

        const keepLocation = state.locations.find((l) => l.id === pair.aliasA.locationId);
        const removeLocation = state.locations.find((l) => l.id === pair.aliasB.locationId);
        if (!keepLocation || !removeLocation) return;

        const evidence: MergeEvidence = {
          id: uid("evd"),
          aliasAId: pair.aliasA.id,
          aliasBId: pair.aliasB.id,
          targetLocationId: keepLocation.id,
          nameSimilarity: pair.nameSimilarity,
          coordinateDistance: pair.coordinateDistance,
          evidenceText,
          confirmedBy: OPERATOR,
          confirmedAt: nowISO(),
        };

        const mergedAliases: LocationAlias[] = [
          ...keepLocation.aliases,
          ...removeLocation.aliases.map((a) => ({ ...a, locationId: keepLocation.id, isMerged: true })),
        ];
        let updatedLocations: Location[] = state.locations
          .filter((l) => l.id !== removeLocation.id)
          .map((l) =>
            l.id === keepLocation.id
              ? { ...l, aliases: mergedAliases, status: "active" as const }
              : l,
          );

        const updatedFeedbacks: ResidentFeedback[] = state.feedbacks.map((f) =>
          f.locationId === removeLocation.id ? { ...f, locationId: keepLocation.id } : f,
        );

        updatedLocations = updatedLocations.map((l) => ({
          ...l,
          feedbackCount: updatedFeedbacks.filter(
            (f) => f.locationId === l.id && f.status !== "withdrawn",
          ).length,
        }));

        const updatedPairs: LocationPair[] = state.locationPairs.map((p) =>
          p.id === pairId ? { ...p, reviewed: true } : p,
        );

        const removePlan = state.plans.find((p) => p.locationId === removeLocation.id);
        const keepPlan = state.plans.find((p) => p.locationId === keepLocation.id);

        let finalPlans: DrainagePlan[] = state.plans.filter((p) => p.locationId !== removeLocation.id);
        if (keepPlan) {
          const locFeedbacks = updatedFeedbacks.filter((f) => f.locationId === keepLocation.id);
          const beforeState = JSON.stringify({
            canonicalName: keepLocation.canonicalName,
            feedbackCount: keepPlan.currentCalculation.parameters.totalFeedbackCount,
            riskIndex: keepPlan.currentCalculation.parameters.riskIndex,
          });
          const beforeSnapshot = JSON.stringify({
            schemes: keepPlan.schemes,
            calculation: keepPlan.currentCalculation,
          });
          const newSchemes = createSchemes(
            locFeedbacks.filter((f) => f.status !== "withdrawn").length,
          );
          const newCalc = buildCalculation(locFeedbacks);
          const planVersion: PlanVersion = {
            id: uid("pv"),
            planId: keepPlan.id,
            snapshotBefore: beforeSnapshot,
            snapshotAfter: JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
            remark: `合并地点「${removeLocation.canonicalName}」→「${keepLocation.canonicalName}」`,
            createdAt: nowISO(),
          };
          const afterState = JSON.stringify({
            canonicalName: keepLocation.canonicalName,
            feedbackCount: newCalc.parameters.totalFeedbackCount,
            riskIndex: newCalc.parameters.riskIndex,
          });
          const snap = buildSnapshot(
            keepPlan.id,
            "地点名称归并",
            `将「${pair.aliasB.aliasName}」归并到「${pair.aliasA.aliasName}」，归并证据已留存`,
            beforeState,
            afterState,
            `变更说明：地点归并「${removeLocation.canonicalName}」→「${keepLocation.canonicalName}」\n- 名称相似度：${(pair.nameSimilarity * 100).toFixed(1)}%\n- 坐标距离：${pair.coordinateDistance.toFixed(0)}m\n- 归并证据：${evidenceText}\n- 反馈基数 ${keepPlan.currentCalculation.parameters.totalFeedbackCount} → ${newCalc.parameters.totalFeedbackCount}\n- 风险指数 ${keepPlan.currentCalculation.parameters.riskIndex.toFixed(2)} → ${newCalc.parameters.riskIndex.toFixed(2)}\n- 所有别名、原始记录、归并证据均保留在库，不可撤销删除。`,
          );
          const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
            ? "suspended"
            : "reviewing";
          finalPlans = finalPlans.map((p) =>
            p.id === keepPlan.id
              ? {
                  ...p,
                  status: planStatus,
                  schemes: newSchemes,
                  currentCalculation: newCalc,
                  versions: [...p.versions, planVersion],
                  snapshots: [...p.snapshots, snap],
                  timeline: [
                    ...p.timeline,
                    ...(removePlan?.timeline ?? []),
                    buildTimelineEvent(
                      p.id,
                      "merge",
                      `归并地点「${pair.aliasB.aliasName}」→「${pair.aliasA.aliasName}」，证据：${evidenceText}`,
                    ),
                    buildTimelineEvent(p.id, "calculate", "地点归并后自动重算方案"),
                  ],
                  updatedAt: nowISO(),
                }
              : p,
          );
        }

        set({
          locations: updatedLocations,
          feedbacks: updatedFeedbacks,
          locationPairs: updatedPairs,
          mergeEvidences: [...state.mergeEvidences, evidence],
          plans: finalPlans,
        });
      },

      rejectMerge: (pairId: string) => {
        set((state) => ({
          locationPairs: state.locationPairs.map((p) =>
            p.id === pairId ? { ...p, reviewed: true } : p,
          ),
        }));
      },

      recalculatePlan: (planId: string, remark?: string) => {
        const state = get();
        const plan = state.plans.find((p) => p.id === planId);
        if (!plan) return;
        const locFeedbacks = state.feedbacks.filter((f) => f.locationId === plan.locationId);
        const beforeSnapshot = JSON.stringify({
          schemes: plan.schemes,
          calculation: plan.currentCalculation,
        });
        const newSchemes = createSchemes(
          locFeedbacks.filter((f) => f.status !== "withdrawn").length,
        );
        const newCalc = buildCalculation(locFeedbacks);
        const version: PlanVersion = {
          id: uid("pv"),
          planId,
          snapshotBefore: beforeSnapshot,
          snapshotAfter: JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
          remark: remark ?? "手动触发重算",
          createdAt: nowISO(),
        };
        const snap = buildSnapshot(
          planId,
          "手动重算方案",
          remark ?? "手动触发方案比选重算",
          beforeSnapshot,
          JSON.stringify({ schemes: newSchemes, calculation: newCalc }),
          `变更说明：手动重算，风险指数 ${plan.currentCalculation.parameters.riskIndex.toFixed(2)} → ${newCalc.parameters.riskIndex.toFixed(2)}；旧版本已归档。`,
        );
        const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
          ? "suspended"
          : plan.status === "draft"
            ? "draft"
            : "reviewing";
        set({
          plans: state.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  status: planStatus,
                  schemes: newSchemes,
                  currentCalculation: newCalc,
                  versions: [...p.versions, version],
                  snapshots: [...p.snapshots, snap],
                  timeline: [
                    ...p.timeline,
                    buildTimelineEvent(planId, "calculate", remark ?? "手动重算方案"),
                  ],
                  updatedAt: nowISO(),
                }
              : p,
          ),
        });
      },

      createPlanForLocation: (locationId: string) => {
        const state = get();
        if (state.plans.some((p) => p.locationId === locationId)) return;
        const loc = state.locations.find((l) => l.id === locationId);
        if (!loc) return;
        const locFeedbacks = state.feedbacks.filter((f) => f.locationId === locationId);
        const schemes = createSchemes(
          locFeedbacks.filter((f) => f.status !== "withdrawn").length,
        );
        const calc = buildCalculation(locFeedbacks);
        const planId = uid("plan");
        const planStatus: PlanStatus = locFeedbacks.some((f) => f.status === "suspended")
          ? "suspended"
          : "draft";
        const plan: DrainagePlan = {
          id: planId,
          locationId,
          name: `${loc.canonicalName} 雨水口积淤方案`,
          status: planStatus,
          schemes,
          currentCalculation: calc,
          versions: [],
          snapshots: [],
          timeline: [
            buildTimelineEvent(planId, "calculate", `创建 ${loc.canonicalName} 方案`, locFeedbacks.map((f) => f.id)),
          ],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set({ plans: [...state.plans, plan] });
      },

      getFeedbacksByLocation: (locationId: string) => {
        return get().feedbacks.filter((f) => f.locationId === locationId);
      },
      getActiveFeedbacksByLocation: (locationId: string) => {
        return get().feedbacks.filter((f) => f.locationId === locationId && f.status !== "withdrawn");
      },

      resetAll: () => {
        set({
          feedbacks: [],
          locations: [],
          mergeEvidences: [],
          locationPairs: [],
          plans: [],
          currentOperator: OPERATOR,
        });
        localStorage.removeItem("drainage-plan-store");
      },
    }),
    {
      name: "drainage-plan-store",
      version: 1,
    },
  ),
);

// silence unused initialState
void initialState;
