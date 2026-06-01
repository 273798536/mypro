import type {
  TrainingSample,
  FeatureEntry,
  CustomerGroup,
  ConflictRecord,
  RawImportResult,
} from "@/types"

export function buildTrainingSamples(raw: RawImportResult): TrainingSample[] {
  return raw.rows.map((row, i) => {
    const features: Record<string, number | string> = {}
    let target: number | string | undefined
    let groupId: string | undefined
    let id: string = String(i)

    for (const [key, val] of Object.entries(row)) {
      const lower = key.toLowerCase().trim()
      if (lower === "id" || lower === "sample_id" || lower === "sampleid") {
        id = String(val)
      } else if (lower === "target" || lower === "label" || lower === "y") {
        target = val
      } else if (lower === "group_id" || lower === "groupid" || lower === "group") {
        groupId = String(val)
      } else {
        features[key] = val
      }
    }

    return { id, features, target, groupId }
  })
}

export function buildFeatureEntries(
  samples: TrainingSample[],
  featureRaw?: RawImportResult
): FeatureEntry[] {
  const featureNames = new Set<string>()
  for (const s of samples) {
    for (const k of Object.keys(s.features)) {
      featureNames.add(k)
    }
  }

  const featureImportanceMap: Record<string, number> = {}
  if (featureRaw) {
    for (const row of featureRaw.rows) {
      const name = String(row["feature"] || row["name"] || row["特征"] || "")
      const imp = Number(row["importance"] || row["重要性"] || 0)
      if (name) featureImportanceMap[name] = imp
    }
  }

  const featureEntries: FeatureEntry[] = []
  for (const name of featureNames) {
    const importance = featureImportanceMap[name] ?? computeGiniImportance(samples, name)
    featureEntries.push({
      name,
      importance,
      isLeakage: false,
      sparsityByGroup: {},
    })
  }

  featureEntries.sort((a, b) => b.importance - a.importance)
  return featureEntries
}

export function computeGiniImportance(samples: TrainingSample[], featureName: string): number {
  const values = samples
    .map((s) => s.features[featureName])
    .filter((v) => v !== undefined && v !== null && v !== "")
  if (values.length === 0) return 0

  const targets = samples.filter((s) => s.target !== undefined).map((s) => s.target)
  if (targets.length < 2) return Math.random() * 0.1

  const numericValues = values.map(Number).filter((v) => !isNaN(v))
  if (numericValues.length < 2) return Math.random() * 0.05

  const targetArr = samples
    .filter((s) => s.target !== undefined && s.features[featureName] !== undefined)
    .map((s) => ({ val: Number(s.features[featureName]), target: s.target! }))

  if (targetArr.length < 2) return Math.random() * 0.05

  const median = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]

  const leftTargets = targetArr.filter((t) => t.val <= median).map((t) => t.target)
  const rightTargets = targetArr.filter((t) => t.val > median).map((t) => t.target)

  const giniFull = gini(targets as string[])
  const giniLeft = leftTargets.length > 0 ? gini(leftTargets as string[]) : 0
  const giniRight = rightTargets.length > 0 ? gini(rightTargets as string[]) : 0

  const n = targetArr.length
  const nL = leftTargets.length
  const nR = rightTargets.length

  const importance = giniFull - (nL / n) * giniLeft - (nR / n) * giniRight
  return Math.max(0, importance)
}

function gini(values: string[]): number {
  const counts: Record<string, number> = {}
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1
  }
  let sum = 0
  const n = values.length
  for (const count of Object.values(counts)) {
    const p = count / n
    sum += p * p
  }
  return 1 - sum
}

export function buildCustomerGroups(samples: TrainingSample[]): CustomerGroup[] {
  const groupMap: Record<string, TrainingSample[]> = {}
  for (const s of samples) {
    const gid = s.groupId || "default"
    if (!groupMap[gid]) groupMap[gid] = []
    groupMap[gid].push(s)
  }

  return Object.entries(groupMap).map(([groupId, groupSamples]) => {
    const featureCoverage: Record<string, number> = {}
    const featureNames = new Set<string>()
    for (const s of groupSamples) {
      for (const k of Object.keys(s.features)) featureNames.add(k)
    }
    for (const fname of featureNames) {
      const nonEmpty = groupSamples.filter(
        (s) =>
          s.features[fname] !== undefined &&
          s.features[fname] !== null &&
          s.features[fname] !== ""
      ).length
      featureCoverage[fname] = nonEmpty / groupSamples.length
    }

    return {
      groupId,
      groupName: `分组 ${groupId}`,
      sampleCount: groupSamples.length,
      featureCoverage,
    }
  })
}

export function detectLeakage(
  samples: TrainingSample[],
  features: FeatureEntry[]
): FeatureEntry[] {
  const targets = samples.filter((s) => s.target !== undefined)
  if (targets.length < 5) return features

  const targetValues = targets.map((s) => String(s.target))
  const uniqueTargets = new Set(targetValues)
  if (uniqueTargets.size < 2) return features

  return features.map((f) => {
    const featureVals = targets
      .filter((s) => s.features[f.name] !== undefined && s.features[f.name] !== "")
      .map((s) => ({ fval: String(s.features[f.name]), tval: String(s.target) }))

    if (featureVals.length < 5) return { ...f, isLeakage: false }

    const fValCounts: Record<string, Set<string>> = {}
    for (const { fval, tval } of featureVals) {
      if (!fValCounts[fval]) fValCounts[fval] = new Set()
      fValCounts[fval].add(tval)
    }

    let pureCount = 0
    for (const targetSet of Object.values(fValCounts)) {
      if (targetSet.size === 1) pureCount++
    }

    const purityRatio = pureCount / Object.keys(fValCounts).length
    const isLeakage = purityRatio > 0.95 && f.importance > 0.1

    return {
      ...f,
      isLeakage,
      leakageReason: isLeakage
        ? `特征值与目标变量高度一致（纯度 ${(purityRatio * 100).toFixed(1)}%），疑似信息泄漏`
        : undefined,
    }
  })
}

export function analyzeSparsity(
  features: FeatureEntry[],
  groups: CustomerGroup[]
): FeatureEntry[] {
  return features.map((f) => {
    const sparsityByGroup: Record<string, number> = {}
    for (const g of groups) {
      sparsityByGroup[g.groupId] = g.featureCoverage[f.name] ?? 0
    }
    return { ...f, sparsityByGroup }
  })
}

export function detectConflicts(
  trainingRaw: RawImportResult | null,
  featureRaw: RawImportResult | null,
  groupRaw: RawImportResult | null,
  existingVersions: { source: string; version: string; importedAt: number }[]
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = []
  let conflictId = 0

  if (trainingRaw && featureRaw) {
    const trainingFeatures = new Set(
      trainingRaw.headers.filter(
        (h) =>
          !["id", "sample_id", "sampleid", "target", "label", "y", "group_id", "groupid", "group"]
            .map((x) => x.toLowerCase())
            .includes(h.toLowerCase())
      )
    )
    const featureNames = new Set(
      featureRaw.rows.map(
        (r) => String(r["feature"] || r["name"] || r["特征"] || "")
      ).filter(Boolean)
    )

    const inTrainingNotInFeature = [...trainingFeatures].filter((f) => !featureNames.has(f))
    const inFeatureNotInTraining = [...featureNames].filter((f) => !trainingFeatures.has(f))

    if (inTrainingNotInFeature.length > 0 || inFeatureNotInTraining.length > 0) {
      conflicts.push({
        id: `conflict_${++conflictId}`,
        type: "feature_mismatch",
        severity: "high",
        description: `特征列表不匹配：训练样本有 ${inTrainingNotInFeature.length} 个特征未在特征列表中，特征列表有 ${inFeatureNotInTraining.length} 个特征未在训练样本中`,
        detectedAt: Date.now(),
        relatedSources: [
          { source: "training", version: `v${existingVersions.filter((v) => v.source === "training").length + 1}`, importedAt: trainingRaw.importedAt },
          { source: "feature", version: `v${existingVersions.filter((v) => v.source === "feature").length + 1}`, importedAt: featureRaw.importedAt },
        ],
      })
    }
  }

  if (trainingRaw && groupRaw) {
    const trainingGroupIds = new Set(
      trainingRaw.rows.map((r) => String(r["group_id"] || r["groupid"] || r["group"] || "")).filter(Boolean)
    )
    const groupIds = new Set(
      groupRaw.rows.map((r) => String(r["group_id"] || r["groupid"] || r["id"] || "")).filter(Boolean)
    )

    const inTrainingNotInGroup = [...trainingGroupIds].filter((g) => !groupIds.has(g))
    if (inTrainingNotInGroup.length > 0) {
      conflicts.push({
        id: `conflict_${++conflictId}`,
        type: "group_key_missing",
        severity: "medium",
        description: `训练样本中有 ${inTrainingNotInGroup.length} 个分组ID未在客户分组中找到：${inTrainingNotInGroup.slice(0, 3).join(", ")}${inTrainingNotInGroup.length > 3 ? "..." : ""}`,
        detectedAt: Date.now(),
        relatedSources: [
          { source: "training", version: `v${existingVersions.filter((v) => v.source === "training").length + 1}`, importedAt: trainingRaw.importedAt },
          { source: "group", version: `v${existingVersions.filter((v) => v.source === "group").length + 1}`, importedAt: groupRaw.importedAt },
        ],
      })
    }
  }

  if (trainingRaw) {
    const ids = trainingRaw.rows.map((r) => String(r["id"] || r["sample_id"] || r["sampleid"] || ""))
    const uniqueIds = new Set(ids.filter(Boolean))
    if (ids.length > 0 && uniqueIds.size < ids.filter(Boolean).length) {
      conflicts.push({
        id: `conflict_${++conflictId}`,
        type: "sample_id_inconsistent",
        severity: "low",
        description: `训练样本中有 ${ids.filter(Boolean).length - uniqueIds.size} 个重复ID`,
        detectedAt: Date.now(),
        relatedSources: [
          { source: "training", version: `v${existingVersions.filter((v) => v.source === "training").length + 1}`, importedAt: trainingRaw.importedAt },
        ],
      })
    }
  }

  return conflicts
}
