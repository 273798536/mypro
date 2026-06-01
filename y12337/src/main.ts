import type { DiagnosisInput } from "./types.js";
import { diagnose } from "./engine.js";

const NORMAL_SONG_ID = "song_001";
const SPARSE_SONG_ID = "song_002";

const sampleInput: DiagnosisInput = {
  songTags: [
    {
      songId: NORMAL_SONG_ID,
      tags: ["流行", "华语", "抒情", "2024"],
    },
    {
      songId: SPARSE_SONG_ID,
      tags: ["小众", "实验"],
    },
    { songId: "song_010", tags: ["流行", "华语", "摇滚"] },
    { songId: "song_015", tags: ["流行", "华语", "电子"] },
    { songId: "song_022", tags: ["流行", "华语", "民谣"] },
    { songId: "song_030", tags: ["流行", "英文", "R&B"] },
    { songId: "song_041", tags: ["华语", "说唱"] },
    { songId: "song_099", tags: ["古典", "纯音乐"] },
  ],
  exposureLogs: [
    {
      songId: NORMAL_SONG_ID,
      userId: "user_a",
      timestamp: 1717200000,
      position: 45,
      clicked: true,
    },
    {
      songId: NORMAL_SONG_ID,
      userId: "user_b",
      timestamp: 1717200100,
      position: 38,
      clicked: false,
    },
    {
      songId: NORMAL_SONG_ID,
      userId: "user_c",
      timestamp: 1717200200,
      position: 52,
      clicked: true,
    },
  ],
  diagnosisReports: [
    {
      reportId: "rpt_20240601",
      generatedAt: 1717200000,
      entries: [
        {
          songId: NORMAL_SONG_ID,
          tagMissing: null,
          popularCrowding: null,
          similaritySparse: null,
          coldStartScore: 0.92,
          sampleReplay: {
            neighborIds: ["song_010", "song_015", "song_022", "song_030", "song_041"],
            similarityScores: [0.78, 0.72, 0.65, 0.61, 0.55],
            tagIntersection: ["流行", "华语"],
          },
          improvementSuggestions: [],
        },
        {
          songId: SPARSE_SONG_ID,
          tagMissing: null,
          popularCrowding: null,
          similaritySparse: {
            neighborCount: 1,
            maxSimilarity: 0.12,
            avgSimilarity: 0.12,
            sparseThreshold: 0.15,
            source: "diagnosis_report",
            message: `歌曲 ${SPARSE_SONG_ID} 在 diagnosis_report 中仅 1 个相似邻居、平均相似度 0.120（阈值 0.15），相似度稀疏导致协同过滤推荐不可靠`,
          },
          coldStartScore: 0.65,
          sampleReplay: {
            neighborIds: ["song_099"],
            similarityScores: [0.12],
            tagIntersection: [],
          },
          improvementSuggestions: [
            `[diagnosis_report] 歌曲=${SPARSE_SONG_ID}：相似邻居仅 1 个（需 ≥3），建议补充交互行为或用内容相似度扩展邻居池`,
          ],
        },
      ],
    },
  ],
};

function printRecord(record: (typeof sampleInput)["diagnosisReports"][number]["entries"][number] & { songId: string }, idx: number) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  记录 #${idx + 1}  歌曲=${record.songId}`);
  console.log(`${"=".repeat(72)}`);
  console.log(`  冷启动评分  : ${record.coldStartScore}`);

  if (record.tagMissing) {
    console.log(`  ▸ 标签缺失   : ${record.tagMissing.message}`);
  } else {
    console.log(`  ▸ 标签缺失   : 无`);
  }

  if (record.popularCrowding) {
    console.log(`  ▸ 热门挤占   : ${record.popularCrowding.message}`);
  } else {
    console.log(`  ▸ 热门挤占   : 无`);
  }

  if (record.similaritySparse) {
    console.log(`  ▸ 相似度稀疏 : ${record.similaritySparse.message}`);
  } else {
    console.log(`  ▸ 相似度稀疏 : 无`);
  }

  console.log(`\n  样本回放:`);
  console.log(`    邻居列表   : [${record.sampleReplay.neighborIds.join(", ")}]`);
  console.log(`    相似度分数 : [${record.sampleReplay.similarityScores.map((s) => s.toFixed(3)).join(", ")}]`);
  console.log(`    标签交集   : [${record.sampleReplay.tagIntersection.join(", ")}]`);

  console.log(`\n  改进建议:`);
  for (const sug of record.improvementSuggestions) {
    console.log(`    - ${sug}`);
  }
}

function main() {
  const result = diagnose(sampleInput);

  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║             协同过滤冷启动诊断报告                                  ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");

  console.log(`\n  总览:`);
  console.log(`    分析歌曲数   : ${result.summary.totalAnalyzed}`);
  console.log(`    标签缺失     : ${result.summary.tagMissingCount}`);
  console.log(`    热门挤占     : ${result.summary.popularCrowdingCount}`);
  console.log(`    相似度稀疏   : ${result.summary.similaritySparseCount}`);
  console.log(`    健康         : ${result.summary.healthyCount}`);

  for (let i = 0; i < result.records.length; i++) {
    printRecord(result.records[i]!, i);
  }

  console.log(`\n${"─".repeat(72)}`);
  console.log(`  分支确认指南（推荐算法实习生参考）:`);
  console.log(`    记录 #1 歌曲=${NORMAL_SONG_ID} → 正常分支（三项检测均无异常，评分 ≥ 0.8）`);
  console.log(`    记录 #2 歌曲=${SPARSE_SONG_ID} → 相似度稀疏分支（邻居 < 3 且均相似度 < 阈值）`);
  console.log(`${"─".repeat(72)}\n`);
}

main();
