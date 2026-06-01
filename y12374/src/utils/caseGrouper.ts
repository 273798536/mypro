import type { Case, Issue, AnalysisResult, Recording } from "@/types";

export function groupIssuesIntoCases(
  issues: Issue[],
  recordingIds: string[],
  measureHints: string[],
  projectId: string
): Case[] {
  if (issues.length === 0) return [];

  const groups: Map<string, Issue[]> = new Map();

  for (const issue of issues) {
    let groupKey: string = issue.type;
    if (issue.measureRange) {
      groupKey = `${issue.type}-${issue.measureRange}`;
    }
    const existing = groups.get(groupKey) || [];
    existing.push(issue);
    groups.set(groupKey, existing);
  }

  const cases: Case[] = [];
  let caseIdx = 0;
  for (const [groupKey, groupIssues] of groups) {
    caseIdx++;
    const hasMisalignment = groupIssues.some((i) => i.type === "part_misalignment");
    const hasModulation = groupIssues.some((i) => i.type === "unmarked_modulation");
    const hasGap = groupIssues.some((i) => i.type === "audio_gap");

    const typeLabels: string[] = [];
    if (hasMisalignment) typeLabels.push("声部错位");
    if (hasModulation) typeLabels.push("转调漏标");
    if (hasGap) typeLabels.push("音频缺段");

    const measureParts = groupIssues
      .filter((i) => i.measureRange)
      .map((i) => `第${i.measureRange}小节`);
    const measureStr = measureParts.length > 0 ? measureParts[0] : "";

    const partParts = groupIssues
      .filter((i) => i.partName)
      .map((i) => i.partName!);
    const partStr = partParts.length > 0 ? partParts[0] : "";

    const titleParts = [measureStr, partStr, typeLabels.join("与")].filter(Boolean);
    const title = titleParts.join(" ") || `案例 ${caseIdx}`;

    cases.push({
      id: `case-${projectId.slice(0, 4)}-${caseIdx}`,
      projectId,
      title,
      linkedRecordings: recordingIds,
      linkedMeasures: measureHints.length > 0 ? measureHints : measureParts,
      issues: groupIssues,
      annotations: [],
      status: hasMisalignment || hasModulation || hasGap ? "open" : "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return cases;
}
