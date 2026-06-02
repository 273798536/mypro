const fs = require("fs")

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function deterministicRandom(seed, range = 1) {
  const hash = hashCode(seed)
  return (hash % 1000000) / 1000000 * range
}

function gini(values) {
  const counts = {}
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

function computeGiniImportance(samples, featureName) {
  const values = samples
    .map((s) => s.features[featureName])
    .filter((v) => v !== undefined && v !== null && v !== "")
  if (values.length === 0) return 0

  const targets = samples.filter((s) => s.target !== undefined).map((s) => s.target)
  if (targets.length < 2) return deterministicRandom(featureName + ":targets", 0.1)

  const numericValues = values.map(Number).filter((v) => !isNaN(v))
  if (numericValues.length < 2) return deterministicRandom(featureName + ":numeric", 0.05)

  const targetArr = samples
    .filter((s) => s.target !== undefined && s.features[featureName] !== undefined)
    .map((s) => ({ val: Number(s.features[featureName]), target: s.target }))

  if (targetArr.length < 2) return deterministicRandom(featureName + ":targetArr", 0.05)

  const median = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]

  const leftTargets = targetArr.filter((t) => t.val <= median).map((t) => t.target)
  const rightTargets = targetArr.filter((t) => t.val > median).map((t) => t.target)

  const giniFull = gini(targets)
  const giniLeft = leftTargets.length > 0 ? gini(leftTargets) : 0
  const giniRight = rightTargets.length > 0 ? gini(rightTargets) : 0

  const n = targetArr.length
  const nL = leftTargets.length
  const nR = rightTargets.length

  const importance = giniFull - (nL / n) * giniLeft - (nR / n) * giniRight
  return Math.max(0, importance)
}

function parseCSV(text) {
  const lines = text.trim().split("\n")
  const headers = lines[0].split(",")
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      const val = values[j].trim()
      row[headers[j].trim()] = isNaN(val) ? val : Number(val)
    }
    rows.push(row)
  }
  return { headers, rows, rowCount: rows.length, importedAt: Date.now() }
}

function buildTrainingSamples(raw) {
  return raw.rows.map((row, i) => {
    const features = {}
    let target, groupId
    let id = String(i)

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

function parseGroupMetadata(groupRaw) {
  return groupRaw.rows.map((row, idx) => {
    const groupId = String(
      row["group_id"] || row["groupid"] || row["id"] || row["groupId"] || ""
    ).trim()
    const groupName = String(
      row["group_name"] || row["groupname"] || row["name"] || row["描述"] || row["description"] || ""
    ).trim() || `分组 ${groupId}`
    return { groupId, groupName, order: idx }
  }).filter((g) => g.groupId)
}

function buildCustomerGroups(samples, groupRaw) {
  const sampleGroupMap = {}
  for (const s of samples) {
    const gid = s.groupId || "default"
    if (!sampleGroupMap[gid]) sampleGroupMap[gid] = []
    sampleGroupMap[gid].push(s)
  }

  const allFeatureNames = new Set()
  for (const s of samples) {
    for (const k of Object.keys(s.features)) allFeatureNames.add(k)
  }

  function calcCoverage(groupSamples) {
    const coverage = {}
    for (const fname of allFeatureNames) {
      const nonEmpty = groupSamples.filter(
        (s) => s.features[fname] !== undefined && s.features[fname] !== null && s.features[fname] !== ""
      ).length
      coverage[fname] = groupSamples.length > 0 ? nonEmpty / groupSamples.length : 0
    }
    return coverage
  }

  if (groupRaw && groupRaw.rows.length > 0) {
    const metaList = parseGroupMetadata(groupRaw)
    const result = []

    for (const meta of metaList) {
      const groupSamples = sampleGroupMap[meta.groupId] || []
      result.push({
        groupId: meta.groupId,
        groupName: meta.groupName,
        sampleCount: groupSamples.length,
        featureCoverage: calcCoverage(groupSamples),
      })
    }

    const metaGroupIds = new Set(metaList.map((m) => m.groupId))
    for (const [groupId, groupSamples] of Object.entries(sampleGroupMap)) {
      if (!metaGroupIds.has(groupId)) {
        result.push({
          groupId,
          groupName: `未映射分组 ${groupId}`,
          sampleCount: groupSamples.length,
          featureCoverage: calcCoverage(groupSamples),
        })
      }
    }
    return result
  }

  return Object.entries(sampleGroupMap).map(([groupId, groupSamples]) => ({
    groupId,
    groupName: `分组 ${groupId}`,
    sampleCount: groupSamples.length,
    featureCoverage: calcCoverage(groupSamples),
  }))
}

function buildFeatureEntries(samples, featureRaw) {
  const featureNames = new Set()
  for (const s of samples) {
    for (const k of Object.keys(s.features)) featureNames.add(k)
  }

  const featureImportanceMap = {}
  if (featureRaw) {
    for (const row of featureRaw.rows) {
      const name = String(row["feature"] || row["name"] || row["特征"] || "")
      const imp = Number(row["importance"] || row["重要性"] || 0)
      if (name) featureImportanceMap[name] = imp
    }
  }

  const featureEntries = []
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

console.log("=".repeat(60))
console.log("  随机森林特征审计 - 修复验证测试 (Node.js 版本)")
console.log("=".repeat(60))
console.log()

const trainingText = fs.readFileSync("verify_test_training.csv", "utf-8")
const featureText = fs.readFileSync("verify_test_features.csv", "utf-8")
const groupText = fs.readFileSync("verify_test_groups.csv", "utf-8")

const trainingRaw = parseCSV(trainingText)
const featureRaw = parseCSV(featureText)
const groupRaw = parseCSV(groupText)

console.log("📊 数据导入验证")
console.log(`  训练样本: ${trainingRaw.rowCount} 行, ${trainingRaw.headers.length} 列`)
console.log(`  特征列表: ${featureRaw.rowCount} 行`)
console.log(`  客户分组: ${groupRaw.rowCount} 行`)
console.log()

const samples = buildTrainingSamples(trainingRaw)
console.log("🧪 测试1: 客户分组数据是否被真正使用")
console.log("  " + "-".repeat(58))

const groupsWithoutGroupRaw = buildCustomerGroups(samples)
console.log("  未传入 groupRaw 时:")
groupsWithoutGroupRaw.forEach((g, i) => {
  console.log(`    ${i + 1}. ${g.groupName} (ID: ${g.groupId}) - ${g.sampleCount} 样本`)
})

const groupsWithGroupRaw = buildCustomerGroups(samples, groupRaw)
console.log()
console.log("  传入 groupRaw 后:")
groupsWithGroupRaw.forEach((g, i) => {
  console.log(`    ${i + 1}. ${g.groupName} (ID: ${g.groupId}) - ${g.sampleCount} 样本`)
})

const groupMetadata = parseGroupMetadata(groupRaw)
const groupNames = groupMetadata.map((m) => m.groupName)
const hasCorrectNames = groupsWithGroupRaw.slice(0, 3).every((g, i) => g.groupName === groupNames[i])
const hasEmptyGroupD = groupsWithGroupRaw.some((g) => g.groupId === "D" && g.sampleCount === 0)

console.log()
console.log(`  ✅ 分组名称正确: ${hasCorrectNames ? "是" : "否"}`)
console.log(`  ✅ 包含无样本分组 D: ${hasEmptyGroupD ? "是" : "否"}`)
console.log(`  ✅ 测试1通过: ${hasCorrectNames && hasEmptyGroupD ? "是" : "否"}`)
console.log()

console.log("🎲 测试2: 重要性计算是否具有确定性")
console.log("  " + "-".repeat(58))

const features1 = buildFeatureEntries(samples, featureRaw)
const features2 = buildFeatureEntries(samples, featureRaw)
const features3 = buildFeatureEntries(samples, featureRaw)

const importanceMap1 = new Map(features1.map((f) => [f.name, f.importance]))
const importanceMap2 = new Map(features2.map((f) => [f.name, f.importance]))
const importanceMap3 = new Map(features3.map((f) => [f.name, f.importance]))

let deterministic = true
console.log("  三次运行的重要性值对比:")
for (const f of features1.slice(0, 5)) {
  const v1 = importanceMap1.get(f.name).toFixed(6)
  const v2 = importanceMap2.get(f.name).toFixed(6)
  const v3 = importanceMap3.get(f.name).toFixed(6)
  const same = v1 === v2 && v2 === v3
  if (!same) deterministic = false
  console.log(`    ${f.name}: ${v1} | ${v2} | ${v3} ${same ? "✅" : "❌"}`)
}

console.log()
console.log(`  ✅ 测试2通过（三次结果完全一致）: ${deterministic ? "是" : "否"}`)
console.log()

console.log("🎯 测试3: 确定性哈希验证 - 相同输入应产生相同输出")
console.log("  " + "-".repeat(58))
const testSeeds = ["age:targets", "income:targets", "credit_score:targets"]
for (const seed of testSeeds) {
  const val1 = deterministicRandom(seed, 0.1)
  const val2 = deterministicRandom(seed, 0.1)
  const val3 = deterministicRandom(seed, 0.1)
  const same = val1 === val2 && val2 === val3
  console.log(`  ${seed}: ${val1.toFixed(6)} | ${val2.toFixed(6)} | ${val3.toFixed(6)} ${same ? "✅" : "❌"}`)
}
console.log()

console.log("📋 测试4: 生成报告时分组信息正确")
console.log("  " + "-".repeat(58))
const reportGroups = groupsWithGroupRaw
console.log("  报告中的分组列表:")
reportGroups.forEach((g) => {
  console.log(`    - ${g.groupName} (ID: ${g.groupId}): ${g.sampleCount} 样本`)
})
const groupD = reportGroups.find((g) => g.groupId === "D")
const hasGroupDWithCorrectName = groupD && groupD.groupName === "待激活客户" && groupD.sampleCount === 0
console.log()
console.log(`  ✅ 分组D正确显示为'待激活客户'且样本数为0: ${hasGroupDWithCorrectName ? "是" : "否"}`)
console.log()

console.log("=" .repeat(60))
const allPassed = hasCorrectNames && hasEmptyGroupD && deterministic && hasGroupDWithCorrectName
console.log(`  总体验证结果: ${allPassed ? "✅ 全部通过" : "❌ 存在失败"}`)
console.log("=" .repeat(60))

process.exit(allPassed ? 0 : 1)
