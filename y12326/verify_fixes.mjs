import { parseCSV } from "./src/utils/dataParser.ts"
import {
  buildTrainingSamples,
  buildFeatureEntries,
  buildCustomerGroups,
  detectLeakage,
  analyzeSparsity,
  computeGiniImportance,
  parseGroupMetadata,
} from "./src/utils/featureAnalyzer.ts"
import fs from "fs"

async function runTest() {
  console.log("=" .repeat(60))
  console.log("  随机森林特征审计 - 修复验证测试")
  console.log("=" .repeat(60))
  console.log()

  const trainingText = fs.readFileSync("verify_test_training.csv", "utf-8")
  const featureText = fs.readFileSync("verify_test_features.csv", "utf-8")
  const groupText = fs.readFileSync("verify_test_groups.csv", "utf-8")

  const trainingFile = new File([trainingText], "verify_test_training.csv", { type: "text/csv" })
  const featureFile = new File([featureText], "verify_test_features.csv", { type: "text/csv" })
  const groupFile = new File([groupText], "verify_test_groups.csv", { type: "text/csv" })

  const trainingRaw = await parseCSV(trainingFile)
  const featureRaw = await parseCSV(featureFile)
  const groupRaw = await parseCSV(groupFile)

  console.log("📊 数据导入验证")
  console.log(`  训练样本: ${trainingRaw.rowCount} 行, ${trainingRaw.headers.length} 列`)
  console.log(`  特征列表: ${featureRaw.rowCount} 行`)
  console.log(`  客户分组: ${groupRaw.rowCount} 行`)
  console.log()

  const samples = buildTrainingSamples(trainingRaw)
  console.log("🧪 测试1: 客户分组数据是否被真正使用")
  console.log("  -" .repeat(30))

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
  console.log("  -" .repeat(30))

  const features1 = buildFeatureEntries(samples, featureRaw)
  const features2 = buildFeatureEntries(samples, featureRaw)
  const features3 = buildFeatureEntries(samples, featureRaw)

  const importanceMap1 = new Map(features1.map((f) => [f.name, f.importance]))
  const importanceMap2 = new Map(features2.map((f) => [f.name, f.importance]))
  const importanceMap3 = new Map(features3.map((f) => [f.name, f.importance]))

  let deterministic = true
  console.log("  三次运行的重要性值对比:")
  for (const f of features1.slice(0, 5)) {
    const v1 = importanceMap1.get(f.name)!.toFixed(6)
    const v2 = importanceMap2.get(f.name)!.toFixed(6)
    const v3 = importanceMap3.get(f.name)!.toFixed(6)
    const same = v1 === v2 && v2 === v3
    if (!same) deterministic = false
    console.log(`    ${f.name}: ${v1} | ${v2} | ${v3} ${same ? "✅" : "❌"}`)
  }

  console.log()
  console.log(`  ✅ 测试2通过（三次结果完全一致）: ${deterministic ? "是" : "否"}`)
  console.log()

  console.log("🔬 测试3: 稀疏分析使用正确分组")
  console.log("  -" .repeat(30))

  let features = buildFeatureEntries(samples, featureRaw)
  features = detectLeakage(samples, features)
  const groups = buildCustomerGroups(samples, groupRaw)
  features = analyzeSparsity(features, groups)

  const testFeature = features.find((f) => f.name === "age")
  console.log(`  特征 'age' 的分组稀疏性:`)
  groups.forEach((g) => {
    const cov = testFeature?.sparsityByGroup[g.groupId] ?? 0
    console.log(`    ${g.groupName} (${g.groupId}): ${(cov * 100).toFixed(0)}%`)
  })

  const sparsityKeys = Object.keys(testFeature?.sparsityByGroup || {})
  const hasFourGroups = sparsityKeys.includes("A") && sparsityKeys.includes("B") &&
                       sparsityKeys.includes("C") && sparsityKeys.includes("D")
  console.log()
  console.log(`  ✅ 包含4个分组的稀疏数据: ${hasFourGroups ? "是" : "否"}`)
  console.log()

  console.log("=" .repeat(60))
  const allPassed = hasCorrectNames && hasEmptyGroupD && deterministic && hasFourGroups
  console.log(`  总体验证结果: ${allPassed ? "✅ 全部通过" : "❌ 存在失败"}`)
  console.log("=" .repeat(60))

  return allPassed
}

runTest().then((passed) => {
  process.exit(passed ? 0 : 1)
}).catch((err) => {
  console.error("测试运行出错:", err)
  process.exit(1)
})
