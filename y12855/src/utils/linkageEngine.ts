import type { EntityType, Inspection, LinkageDelta, Revision, RiskLevel } from "@/types";

export function detectLinkageDelta(
  inspection: Inspection,
  modifiedEntityType: EntityType,
  modifiedEntityId: string,
): LinkageDelta {
  const affectedAlerts: string[] = [];
  let affectedConclusion = false;

  if (modifiedEntityType === "PHOTO") {
    inspection.riskAlerts.forEach((alert) => {
      if (alert.description.includes("照片") || alert.description.includes("投喂区") || alert.type.includes("DETECTION")) {
        affectedAlerts.push(alert.id);
      }
    });
    if (inspection.conclusion) {
      affectedConclusion = true;
    }
  }

  if (modifiedEntityType === "TRAJECTORY") {
    inspection.riskAlerts.forEach((alert) => {
      if (alert.type.includes("DRIFT") || alert.type.includes("TRAJECTORY")) {
        affectedAlerts.push(alert.id);
      }
    });
    if (inspection.conclusion) {
      affectedConclusion = true;
    }
  }

  if (modifiedEntityType === "RISK_ALERT") {
    if (inspection.conclusion) {
      affectedConclusion = true;
    }
  }

  return {
    inspectionId: inspection.id,
    modifiedEntityType,
    modifiedEntityId,
    affectedAlerts,
    affectedConclusion,
  };
}

export function applyLinkageDelta(
  inspection: Inspection,
  delta: LinkageDelta,
): Inspection {
  const now = new Date().toISOString();
  const newAlerts = inspection.riskAlerts.map((alert) =>
    delta.affectedAlerts.includes(alert.id)
      ? { ...alert, needsReview: true, lastSyncedAt: now }
      : alert,
  );
  const newConclusion =
    delta.affectedConclusion && inspection.conclusion
      ? { ...inspection.conclusion, needsReview: true }
      : inspection.conclusion;

  const pendingCount =
    newAlerts.filter((a) => a.needsReview).length +
    (newConclusion?.needsReview ? 1 : 0);

  const newAvailability =
    pendingCount > 0 ? "PENDING" : inspection.availability;

  return {
    ...inspection,
    riskAlerts: newAlerts,
    conclusion: newConclusion,
    availability: newAvailability,
  };
}

export function createSystemLinkageRevision(
  delta: LinkageDelta,
  inspectionCode: string,
): Revision {
  const summary: string[] = [];
  if (delta.affectedAlerts.length > 0) {
    summary.push(`已标记 ${delta.affectedAlerts.length} 条风险通报待复核`);
  }
  if (delta.affectedConclusion) {
    summary.push("已标记巡检结论待复核");
  }
  return {
    id: `sys-link-${Date.now()}`,
    entityType: delta.modifiedEntityType,
    entityId: delta.modifiedEntityId,
    fieldName: "linkage_trigger",
    oldValue: "needsReview=false",
    newValue: "needsReview=true",
    reason: `[系统联动] 巡检 ${inspectionCode} 的照片或轨迹已修改，${summary.join("，")}。请港口调度员确认。`,
    performedBy: "SYSTEM",
    performedByName: "联动引擎",
    performedAt: new Date().toISOString(),
    approvalStatus: "DRAFT",
  };
}

export function riskLevelOfDrift(percent: number): RiskLevel {
  if (percent >= 8) return "HIGH";
  if (percent >= 3) return "MEDIUM";
  return "LOW";
}

export function availabilitySummary(inspection: Inspection): {
  available: number;
  pending: number;
  recollect: number;
} {
  let available = 0;
  let pending = 0;
  let recollect = 0;

  if (inspection.availability === "AVAILABLE") available++;
  if (inspection.availability === "PENDING") pending++;
  if (inspection.availability === "RECOLLECT") recollect++;

  return { available, pending, recollect };
}

export function resultAvailabilityLabel(inspection: Inspection): {
  overall: "AVAILABLE" | "PENDING" | "RECOLLECT";
  details: { label: string; value: string; status: "AVAILABLE" | "PENDING" | "RECOLLECT" }[];
} {
  const conclusion = inspection.conclusion;
  const photosReady = inspection.photos.length >= 3;
  const trajectoryReady = inspection.trajectory.length >= 5;
  const waterQualityReady = (inspection.waterQualitySamples?.length ?? 0) >= 1;
  const alertsPending = inspection.riskAlerts.some((a) => a.needsReview);
  const conclusionPending = conclusion?.needsReview;
  const approvalReady = inspection.status === "APPROVED";

  const details: { label: string; value: string; status: "AVAILABLE" | "PENDING" | "RECOLLECT" }[] = [];

  details.push({
    label: "巡检照片",
    value: `${inspection.photos.length} 张`,
    status: photosReady ? (inspection.photos.some((p) => p.revision > 1) ? "PENDING" : "AVAILABLE") : "RECOLLECT",
  });

  details.push({
    label: "航迹数据",
    value: `${inspection.trajectory.length} 点`,
    status: trajectoryReady ? "AVAILABLE" : "RECOLLECT",
  });

  details.push({
    label: "水质采样",
    value: `${inspection.waterQualitySamples?.length ?? 0} 组`,
    status: waterQualityReady ? "AVAILABLE" : "RECOLLECT",
  });

  details.push({
    label: "风险通报",
    value: `${inspection.riskAlerts.filter((a) => a.needsReview).length} 项待复核`,
    status: alertsPending ? "PENDING" : "AVAILABLE",
  });

  details.push({
    label: "巡检结论",
    value: conclusionPending ? "待复核" : "已同步",
    status: conclusionPending ? "PENDING" : conclusion ? "AVAILABLE" : "RECOLLECT",
  });

  details.push({
    label: "三级审签",
    value:
      inspection.status === "APPROVED"
        ? "已通过"
        : inspection.status === "PENDING_CONFIRM"
          ? "审签中"
          : "未启动",
    status: approvalReady ? "AVAILABLE" : inspection.status === "REJECTED" ? "RECOLLECT" : "PENDING",
  });

  const recollectCount = details.filter((d) => d.status === "RECOLLECT").length;
  const pendingCount = details.filter((d) => d.status === "PENDING").length;

  let overall: "AVAILABLE" | "PENDING" | "RECOLLECT";
  if (recollectCount > 0) overall = "RECOLLECT";
  else if (pendingCount > 0) overall = "PENDING";
  else overall = "AVAILABLE";

  return { overall, details };
}
