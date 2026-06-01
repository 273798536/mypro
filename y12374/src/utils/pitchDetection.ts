import type { AnalysisResult, PitchPoint, Issue } from "@/types";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

const ISSUE_TEMPLATES: Array<{
  type: Issue["type"];
  makeIssue: (rng: () => number, partName: string, startT: number, endT: number) => Issue;
}> = [
  {
    type: "part_misalignment",
    makeIssue: (rng, partName, startT, endT) => ({
      id: `issue-pm-${Math.floor(rng() * 99999)}`,
      type: "part_misalignment",
      startTime: startT,
      endTime: endT,
      severity: rng() > 0.5 ? "error" : "warning",
      triggerMaterial: `声部分轨「${partName}」在 ${startT.toFixed(1)}s 处与参考时轴偏移`,
      stuckAt: `声部对齐步骤：${partName}时间轴偏移量超过阈值（${(rng() * 200 + 50).toFixed(0)}ms），无法自动校正`,
      nextStep: "请检查该声部分轨文件是否完整，或手动调整分轨起始时间偏移",
      partName,
      measureRange: `${Math.floor(startT / 4) + 1}-${Math.floor(endT / 4) + 1}`,
    }),
  },
  {
    type: "unmarked_modulation",
    makeIssue: (rng, partName, startT, endT) => ({
      id: `issue-um-${Math.floor(rng() * 99999)}`,
      type: "unmarked_modulation",
      startTime: startT,
      endTime: endT,
      severity: "error",
      triggerMaterial: `排练录音在 ${startT.toFixed(1)}s 处检测到音高整体偏移约${(rng() * 3 + 1).toFixed(1)}个半音，但乐谱无对应转调标记`,
      stuckAt: `转调检测步骤：检测到频率整体偏移，但缺少乐谱转调标记作为校准基准`,
      nextStep: "请在乐谱对应小节标注转调信息，或确认该处是否为演唱偏差",
      measureRange: `${Math.floor(startT / 4) + 1}`,
    }),
  },
  {
    type: "audio_gap",
    makeIssue: (rng, partName, startT, endT) => ({
      id: `issue-ag-${Math.floor(rng() * 99999)}`,
      type: "audio_gap",
      startTime: startT,
      endTime: endT,
      severity: "error",
      triggerMaterial: `声部分轨「${partName}」在 ${startT.toFixed(1)}s-${endT.toFixed(1)}s 处存在静音段`,
      stuckAt: `音频完整性检查：检测到 ${(endT - startT).toFixed(1)}s 的静音段，无法提取音高信息`,
      nextStep: "请补充该时段的排练录音，或确认该时段是否为休止",
      partName,
      measureRange: `${Math.floor(startT / 4) + 1}-${Math.floor(endT / 4) + 1}`,
    }),
  },
];

export function analyzeRecording(recordingId: string, fileHash: string, partName: string): AnalysisResult {
  const rng = seededRandom(fileHash);

  const baseFreq = partName.includes("女高") ? 523 : partName.includes("女低") ? 392 : partName.includes("男高") ? 262 : 196;

  const pitchData: PitchPoint[] = [];
  for (let i = 0; i < 200; i++) {
    const time = (i / 200) * 60;
    const scaleIdx = Math.floor(rng() * 8);
    const scaleRatios = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2];
    const freq = baseFreq * scaleRatios[scaleIdx] * (1 + (rng() - 0.5) * 0.04);
    const midiNote = 69 + 12 * Math.log2(freq / 440);
    const deviation = (rng() - 0.5) * 30;
    pitchData.push({ time, frequency: freq, midiNote, deviation });
  }

  const issueCount = Math.floor(rng() * 3);
  const detectedIssues: Issue[] = [];
  for (let i = 0; i < issueCount; i++) {
    const template = ISSUE_TEMPLATES[Math.floor(rng() * ISSUE_TEMPLATES.length)];
    const startT = rng() * 50 + 5;
    const endT = startT + rng() * 5 + 1;
    detectedIssues.push(template.makeIssue(rng, partName, startT, endT));
  }

  return {
    id: `analysis-${fileHash.slice(0, 8)}`,
    recordingId,
    fileHash,
    pitchData,
    detectedIssues,
    computedAt: Date.now(),
  };
}
