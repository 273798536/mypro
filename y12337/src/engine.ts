import type {
  DiagnosisInput,
  DiagnosisEntry,
  DiagnosisResult,
  DiagnosisSummary,
  TagMissingDetail,
  PopularCrowdingDetail,
  SimilaritySparseDetail,
  SampleReplay,
} from "./types.js";

const TAG_MISSING_THRESHOLD = 1;
const POPULAR_CROWDING_TOP_K = 20;
const POPULAR_CROWDING_MIN_EXPOSURES = 50;
const SIMILARITY_SPARSE_NEIGHBOR_MIN = 3;
const SIMILARITY_SPARSE_AVG_THRESHOLD = 0.15;

function buildSongTagMap(
  songTags: DiagnosisInput["songTags"]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const st of songTags) {
    map.set(st.songId, st.tags);
  }
  return map;
}

function buildExposureStats(
  exposureLogs: DiagnosisInput["exposureLogs"]
): Map<string, { count: number; avgPosition: number }> {
  const map = new Map<string, { totalPos: number; count: number }>();
  for (const log of exposureLogs) {
    const existing = map.get(log.songId);
    if (existing) {
      existing.totalPos += log.position;
      existing.count += 1;
    } else {
      map.set(log.songId, { totalPos: log.position, count: 1 });
    }
  }
  const result = new Map<string, { count: number; avgPosition: number }>();
  for (const [songId, val] of map) {
    result.set(songId, {
      count: val.count,
      avgPosition: val.totalPos / val.count,
    });
  }
  return result;
}

function buildSimilarityInfo(
  diagnosisReports: DiagnosisInput["diagnosisReports"]
): Map<
  string,
  {
    neighborIds: string[];
    similarities: number[];
    avgSimilarity: number;
  }
> {
  const map = new Map<
    string,
    {
      neighborIds: string[];
      similarities: number[];
      avgSimilarity: number;
    }
  >();
  for (const report of diagnosisReports) {
    for (const entry of report.entries) {
      if (entry.similaritySparse) {
        const detail = entry.similaritySparse;
        map.set(entry.songId, {
          neighborIds: entry.sampleReplay.neighborIds,
          similarities: entry.sampleReplay.similarityScores,
          avgSimilarity: detail.avgSimilarity,
        });
      } else if (entry.sampleReplay.neighborIds.length > 0) {
        const sims = entry.sampleReplay.similarityScores;
        const avg = sims.length > 0 ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
        map.set(entry.songId, {
          neighborIds: entry.sampleReplay.neighborIds,
          similarities: sims,
          avgSimilarity: avg,
        });
      }
    }
  }
  return map;
}

function detectTagMissing(
  songId: string,
  tagMap: Map<string, string[]>
): TagMissingDetail | null {
  const tags = tagMap.get(songId);
  if (!tags || tags.length === 0) {
    return {
      missingTagNames: ["全部标签缺失"],
      source: "song_tag",
      message: `歌曲 ${songId} 在 song_tag 中标签完全缺失，无法参与协同过滤特征构建`,
    };
  }
  const missing = tags.filter((t) => t.trim() === "");
  if (missing.length >= TAG_MISSING_THRESHOLD) {
    return {
      missingTagNames: missing,
      source: "song_tag",
      message: `歌曲 ${songId} 在 song_tag 中存在 ${missing.length} 个空标签，影响特征向量质量`,
    };
  }
  return null;
}

function detectPopularCrowding(
  songId: string,
  exposureStats: Map<string, { count: number; avgPosition: number }>
): PopularCrowdingDetail | null {
  const stats = exposureStats.get(songId);
  if (!stats) {
    return null;
  }
  if (stats.count >= POPULAR_CROWDING_MIN_EXPOSURES && stats.avgPosition <= POPULAR_CROWDING_TOP_K) {
    return {
      exposurePosition: Math.round(stats.avgPosition * 100) / 100,
      exposureCount: stats.count,
      topKThreshold: POPULAR_CROWDING_TOP_K,
      source: "exposure_log",
      message: `歌曲 ${songId} 在 exposure_log 中曝光 ${stats.count} 次、平均位置 ${stats.avgPosition.toFixed(2)}，落入 Top-${POPULAR_CROWDING_TOP_K} 热门区间，冷启动样本被热门挤占`,
    };
  }
  return null;
}

function detectSimilaritySparse(
  songId: string,
  similarityInfo: Map<
    string,
    {
      neighborIds: string[];
      similarities: number[];
      avgSimilarity: number;
    }
  >
): SimilaritySparseDetail | null {
  const info = similarityInfo.get(songId);
  if (!info) {
    return null;
  }
  const maxSim = info.similarities.length > 0 ? Math.max(...info.similarities) : 0;
  if (
    info.neighborIds.length < SIMILARITY_SPARSE_NEIGHBOR_MIN ||
    info.avgSimilarity < SIMILARITY_SPARSE_AVG_THRESHOLD
  ) {
    return {
      neighborCount: info.neighborIds.length,
      maxSimilarity: Math.round(maxSim * 1000) / 1000,
      avgSimilarity: Math.round(info.avgSimilarity * 1000) / 1000,
      sparseThreshold: SIMILARITY_SPARSE_AVG_THRESHOLD,
      source: "diagnosis_report",
      message: `歌曲 ${songId} 在 diagnosis_report 中仅 ${info.neighborIds.length} 个相似邻居、平均相似度 ${info.avgSimilarity.toFixed(3)}（阈值 ${SIMILARITY_SPARSE_AVG_THRESHOLD}），相似度稀疏导致协同过滤推荐不可靠`,
    };
  }
  return null;
}

function computeColdStartScore(
  tagMissing: TagMissingDetail | null,
  popularCrowding: PopularCrowdingDetail | null,
  similaritySparse: SimilaritySparseDetail | null
): number {
  let score = 1.0;
  if (tagMissing) {
    if (tagMissing.missingTagNames.includes("全部标签缺失")) {
      score -= 0.4;
    } else {
      score -= 0.15 * Math.min(tagMissing.missingTagNames.length, 3);
    }
  }
  if (popularCrowding) {
    score -= 0.25;
  }
  if (similaritySparse) {
    if (similaritySparse.neighborCount < SIMILARITY_SPARSE_NEIGHBOR_MIN) {
      score -= 0.35;
    } else {
      score -= 0.2;
    }
  }
  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
}

function buildSampleReplay(
  songId: string,
  tagMap: Map<string, string[]>,
  similarityInfo: Map<
    string,
    {
      neighborIds: string[];
      similarities: number[];
      avgSimilarity: number;
    }
  >
): SampleReplay {
  const info = similarityInfo.get(songId);
  const neighborIds = info ? info.neighborIds : [];
  const similarityScores = info ? info.similarities : [];

  const songTags = tagMap.get(songId) ?? [];
  const tagIntersection: string[] = [];
  if (neighborIds.length > 0) {
    const allNeighborTags = new Set<string>();
    for (const nid of neighborIds) {
      for (const t of tagMap.get(nid) ?? []) {
        allNeighborTags.add(t);
      }
    }
    for (const tag of songTags) {
      if (allNeighborTags.has(tag)) {
        tagIntersection.push(tag);
      }
    }
  }

  return { neighborIds, similarityScores, tagIntersection };
}

function buildSuggestions(
  songId: string,
  tagMissing: TagMissingDetail | null,
  popularCrowding: PopularCrowdingDetail | null,
  similaritySparse: SimilaritySparseDetail | null,
  score: number
): string[] {
  const suggestions: string[] = [];

  if (tagMissing) {
    if (tagMissing.missingTagNames.includes("全部标签缺失")) {
      suggestions.push(
        `[song_tag] 歌曲=${songId}：需补充完整标签，当前标签全部缺失，协同过滤无法建立特征向量`
      );
    } else {
      suggestions.push(
        `[song_tag] 歌曲=${songId}：${tagMissing.missingTagNames.length} 个空标签需填充，否则影响特征向量的区分度`
      );
    }
  }

  if (popularCrowding) {
    suggestions.push(
      `[exposure_log] 歌曲=${songId}：曝光 ${popularCrowding.exposureCount} 次落入 Top-${popularCrowding.topKThreshold}，建议降低曝光权重或引入探索因子，避免冷启动样本被热门挤占`
    );
  }

  if (similaritySparse) {
    if (similaritySparse.neighborCount < SIMILARITY_SPARSE_NEIGHBOR_MIN) {
      suggestions.push(
        `[diagnosis_report] 歌曲=${songId}：相似邻居仅 ${similaritySparse.neighborCount} 个（需 ≥${SIMILARITY_SPARSE_NEIGHBOR_MIN}），建议补充交互行为或用内容相似度扩展邻居池`
      );
    } else {
      suggestions.push(
        `[diagnosis_report] 歌曲=${songId}：平均相似度 ${similaritySparse.avgSimilarity.toFixed(3)} 低于阈值 ${SIMILARITY_SPARSE_AVG_THRESHOLD}，建议检查交互数据覆盖率或调低相似度门槛`
      );
    }
  }

  if (score >= 0.8) {
    suggestions.push(
      `歌曲=${songId}：冷启动评分 ${score} 正常，协同过滤可正常推荐`
    );
  }

  return suggestions;
}

export function diagnose(input: DiagnosisInput): DiagnosisResult {
  const tagMap = buildSongTagMap(input.songTags);
  const exposureStats = buildExposureStats(input.exposureLogs);
  const similarityInfo = buildSimilarityInfo(input.diagnosisReports);

  const allSongIds = new Set<string>();
  for (const st of input.songTags) allSongIds.add(st.songId);
  for (const log of input.exposureLogs) allSongIds.add(log.songId);
  for (const report of input.diagnosisReports) {
    for (const entry of report.entries) allSongIds.add(entry.songId);
  }

  const records: DiagnosisEntry[] = [];

  for (const songId of allSongIds) {
    const tagMissing = detectTagMissing(songId, tagMap);
    const popularCrowding = detectPopularCrowding(songId, exposureStats);
    const similaritySparse = detectSimilaritySparse(songId, similarityInfo);

    const coldStartScore = computeColdStartScore(
      tagMissing,
      popularCrowding,
      similaritySparse
    );

    const sampleReplay = buildSampleReplay(songId, tagMap, similarityInfo);

    const improvementSuggestions = buildSuggestions(
      songId,
      tagMissing,
      popularCrowding,
      similaritySparse,
      coldStartScore
    );

    records.push({
      songId,
      tagMissing,
      popularCrowding,
      similaritySparse,
      coldStartScore,
      sampleReplay,
      improvementSuggestions,
    });
  }

  const summary: DiagnosisSummary = {
    totalAnalyzed: records.length,
    tagMissingCount: records.filter((r) => r.tagMissing !== null).length,
    popularCrowdingCount: records.filter((r) => r.popularCrowding !== null).length,
    similaritySparseCount: records.filter((r) => r.similaritySparse !== null).length,
    healthyCount: records.filter(
      (r) =>
        r.tagMissing === null &&
        r.popularCrowding === null &&
        r.similaritySparse === null
    ).length,
  };

  return { records, summary };
}
