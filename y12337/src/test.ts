import { diagnose } from "./engine.js";
import type { DiagnosisInput } from "./types.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

const input: DiagnosisInput = {
  songTags: [
    { songId: "s_normal", tags: ["流行", "华语", "抒情"] },
    { songId: "s_no_tag", tags: [] },
    { songId: "s_empty_tag", tags: ["摇滚", "", ""] },
  ],
  exposureLogs: [
    { songId: "s_crowded", userId: "u1", timestamp: 1, position: 5, clicked: true },
    { songId: "s_crowded", userId: "u2", timestamp: 2, position: 8, clicked: false },
  ],
  diagnosisReports: [
    {
      reportId: "rpt_test",
      generatedAt: 1,
      entries: [
        {
          songId: "s_sparse",
          tagMissing: null,
          popularCrowding: null,
          similaritySparse: {
            neighborCount: 1,
            maxSimilarity: 0.1,
            avgSimilarity: 0.1,
            sparseThreshold: 0.15,
            source: "diagnosis_report",
            message: "test sparse",
          },
          coldStartScore: 0.65,
          sampleReplay: { neighborIds: ["s_other"], similarityScores: [0.1], tagIntersection: [] },
          improvementSuggestions: [],
        },
        {
          songId: "s_normal",
          tagMissing: null,
          popularCrowding: null,
          similaritySparse: null,
          coldStartScore: 0.95,
          sampleReplay: {
            neighborIds: ["s_normal_n1"],
            similarityScores: [0.8],
            tagIntersection: [],
          },
          improvementSuggestions: [],
        },
      ],
    },
  ],
};

const result = diagnose(input);

console.log("协同过滤冷启动诊断 - 冒烟测试\n");

assert(result.records.length > 0, "diagnose 应返回非空记录列表");
assert(result.summary.totalAnalyzed > 0, "summary.totalAnalyzed 应 > 0");

const normal = result.records.find((r) => r.songId === "s_normal");
assert(normal !== undefined, "应存在 s_normal 记录");
assert(normal!.tagMissing === null, "s_normal 不应触发标签缺失");
assert(normal!.popularCrowding === null, "s_normal 不应触发热门挤占");
assert(normal!.similaritySparse === null, "s_normal 不应触发相似度稀疏");
assert(normal!.coldStartScore >= 0.8, `s_normal 冷启动评分应 ≥ 0.8，实际 ${normal!.coldStartScore}`);
assert(
  normal!.improvementSuggestions.some((s) => s.includes("正常")),
  "s_normal 应有正常推荐建议"
);

const noTag = result.records.find((r) => r.songId === "s_no_tag");
assert(noTag !== undefined, "应存在 s_no_tag 记录");
assert(noTag!.tagMissing !== null, "s_no_tag 应触发标签缺失");
assert(
  noTag!.tagMissing!.missingTagNames.includes("全部标签缺失"),
  "s_no_tag 应报告全部标签缺失"
);
assert(
  noTag!.tagMissing!.source === "song_tag",
  "标签缺失来源应为 song_tag"
);
assert(
  noTag!.improvementSuggestions.some((s) => s.includes("song_tag") && s.includes("s_no_tag")),
  "s_no_tag 改进建议应标注来源 song_tag 和歌曲 s_no_tag"
);

const emptyTag = result.records.find((r) => r.songId === "s_empty_tag");
assert(emptyTag !== undefined, "应存在 s_empty_tag 记录");
assert(emptyTag!.tagMissing !== null, "s_empty_tag 应触发标签缺失（空标签）");
assert(
  emptyTag!.tagMissing!.missingTagNames.length === 2,
  "s_empty_tag 应检测到 2 个空标签"
);

const sparse = result.records.find((r) => r.songId === "s_sparse");
assert(sparse !== undefined, "应存在 s_sparse 记录");
assert(sparse!.similaritySparse !== null, "s_sparse 应触发相似度稀疏");
assert(
  sparse!.similaritySparse!.neighborCount < 3,
  "s_sparse 邻居数应 < 3"
);
assert(
  sparse!.similaritySparse!.source === "diagnosis_report",
  "相似度稀疏来源应为 diagnosis_report"
);
assert(
  sparse!.improvementSuggestions.some(
    (s) => s.includes("diagnosis_report") && s.includes("s_sparse")
  ),
  "s_sparse 改进建议应标注来源 diagnosis_report 和歌曲 s_sparse"
);
assert(sparse!.coldStartScore < 0.8, `s_sparse 冷启动评分应 < 0.8，实际 ${sparse!.coldStartScore}`);

assert(result.summary.tagMissingCount >= 2, `tagMissingCount 应 ≥ 2，实际 ${result.summary.tagMissingCount}`);
assert(result.summary.similaritySparseCount >= 1, `similaritySparseCount 应 ≥ 1，实际 ${result.summary.similaritySparseCount}`);
assert(result.summary.healthyCount >= 1, `healthyCount 应 ≥ 1，实际 ${result.summary.healthyCount}`);

console.log(`\n通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n全部通过 ✓");
}
