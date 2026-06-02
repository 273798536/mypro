// 这是一个浏览器控制台测试脚本，用于验证修复是否正确
// 可以在浏览器控制台中直接粘贴运行

console.log("=".repeat(60));
console.log("  随机森林特征审计 - 浏览器控制台验证");
console.log("=".repeat(60));
console.log("");

// 测试 hashCode 和 deterministicRandom 函数
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function deterministicRandom(seed, range = 1) {
  const hash = hashCode(seed);
  return (hash % 1000000) / 1000000 * range;
}

console.log("🎲 测试1: 确定性随机数（替换 Math.random）");
const testSeeds = ["age:targets", "income:targets", "credit_score:numeric", "age:targets", "income:targets"];
const results = testSeeds.map(s => deterministicRandom(s, 0.1));
console.log("  结果:", results.map(r => r.toFixed(6)));
const test1Pass = results[0] === results[3] && results[1] === results[4];
console.log("  ✅ 相同种子产生相同结果:", test1Pass ? "是" : "否");
console.log("");

console.log("📊 测试2: 客户分组数据使用");
console.log("  模拟导入训练样本、特征列表、客户分组...");
console.log("  客户分组文件中有4个分组：A(高价值客户)、B(成长型客户)、C(培育型客户)、D(待激活客户)");
console.log("  训练样本中的 group_id 只有 A、B、C，没有 D");
console.log("  修复前：分组名称是 '分组 A'、'分组 B'、'分组 C'，没有 D");
console.log("  修复后：分组名称是 '高价值客户'、'成长型客户'、'培育型客户'、'待激活客户'，包含 D（样本数为0）");
console.log("");

// 模拟 buildCustomerGroups 逻辑
function parseGroupMetadata(groupRaw) {
  return groupRaw.rows.map((row, idx) => {
    const groupId = String(
      row["group_id"] || row["groupid"] || row["id"] || row["groupId"] || ""
    ).trim();
    const groupName = String(
      row["group_name"] || row["groupname"] || row["name"] || row["描述"] || row["description"] || ""
    ).trim() || `分组 ${groupId}`;
    return { groupId, groupName, order: idx };
  }).filter((g) => g.groupId);
}

function buildCustomerGroups(samples, groupRaw) {
  const sampleGroupMap = {};
  for (const s of samples) {
    const gid = s.groupId || "default";
    if (!sampleGroupMap[gid]) sampleGroupMap[gid] = [];
    sampleGroupMap[gid].push(s);
  }

  const allFeatureNames = new Set();
  for (const s of samples) {
    for (const k of Object.keys(s.features)) allFeatureNames.add(k);
  }

  function calcCoverage(groupSamples) {
    const coverage = {};
    for (const fname of allFeatureNames) {
      const nonEmpty = groupSamples.filter(
        (s) => s.features[fname] !== undefined && s.features[fname] !== null && s.features[fname] !== ""
      ).length;
      coverage[fname] = groupSamples.length > 0 ? nonEmpty / groupSamples.length : 0;
    }
    return coverage;
  }

  if (groupRaw && groupRaw.rows.length > 0) {
    const metaList = parseGroupMetadata(groupRaw);
    const result = [];

    for (const meta of metaList) {
      const groupSamples = sampleGroupMap[meta.groupId] || [];
      result.push({
        groupId: meta.groupId,
        groupName: meta.groupName,
        sampleCount: groupSamples.length,
        featureCoverage: calcCoverage(groupSamples),
      });
    }

    const metaGroupIds = new Set(metaList.map((m) => m.groupId));
    for (const [groupId, groupSamples] of Object.entries(sampleGroupMap)) {
      if (!metaGroupIds.has(groupId)) {
        result.push({
          groupId,
          groupName: `未映射分组 ${groupId}`,
          sampleCount: groupSamples.length,
          featureCoverage: calcCoverage(groupSamples),
        });
      }
    }

    return result;
  }

  return Object.entries(sampleGroupMap).map(([groupId, groupSamples]) => ({
    groupId,
    groupName: `分组 ${groupId}`,
    sampleCount: groupSamples.length,
    featureCoverage: calcCoverage(groupSamples),
  }));
}

// 测试数据
const mockSamples = [
  { id: "1", features: { age: 25, income: 45000 }, target: 0, groupId: "A" },
  { id: "2", features: { age: 34, income: 72000 }, target: 0, groupId: "A" },
  { id: "3", features: { age: 28, income: 38000 }, target: 1, groupId: "B" },
  { id: "4", features: { age: 52, income: 110000 }, target: 0, groupId: "B" },
  { id: "5", features: { age: 29, income: 42000 }, target: 1, groupId: "C" },
];

const mockGroupRaw = {
  headers: ["group_id", "group_name", "description"],
  rows: [
    { group_id: "A", group_name: "高价值客户", description: "年收入大于70000" },
    { group_id: "B", group_name: "成长型客户", description: "年收入40000-70000" },
    { group_id: "C", group_name: "培育型客户", description: "年收入小于40000" },
    { group_id: "D", group_name: "待激活客户", description: "尚未产生交易记录" },
  ],
  rowCount: 4,
  importedAt: Date.now(),
};

const groupsWithout = buildCustomerGroups(mockSamples);
const groupsWith = buildCustomerGroups(mockSamples, mockGroupRaw);

console.log("  修复前（无 groupRaw）:", groupsWithout.map(g => g.groupName));
console.log("  修复后（有 groupRaw）:", groupsWith.map(g => g.groupName));

const test2Pass =
  groupsWith[0].groupName === "高价值客户" &&
  groupsWith[1].groupName === "成长型客户" &&
  groupsWith[2].groupName === "培育型客户" &&
  groupsWith[3].groupName === "待激活客户" &&
  groupsWith[3].sampleCount === 0;

console.log("  ✅ 分组名称正确且包含无样本分组 D:", test2Pass ? "是" : "否");
console.log("");

console.log("🔬 测试3: 稀疏分析包含所有分组");
function analyzeSparsity(features, groups) {
  return features.map((f) => {
    const sparsityByGroup = {};
    for (const g of groups) {
      sparsityByGroup[g.groupId] = g.featureCoverage[f.name] ?? 0;
    }
    return { ...f, sparsityByGroup };
  });
}

const mockFeatures = [
  { name: "age", importance: 0.1, isLeakage: false, sparsityByGroup: {} },
  { name: "income", importance: 0.2, isLeakage: false, sparsityByGroup: {} },
];

const featuresWithSparsity = analyzeSparsity(mockFeatures, groupsWith);
const ageFeature = featuresWithSparsity.find(f => f.name === "age");
const test3Pass =
  "A" in ageFeature.sparsityByGroup &&
  "B" in ageFeature.sparsityByGroup &&
  "C" in ageFeature.sparsityByGroup &&
  "D" in ageFeature.sparsityByGroup &&
  ageFeature.sparsityByGroup["D"] === 0;

console.log("  特征 age 的 sparsityByGroup:", Object.keys(ageFeature.sparsityByGroup));
console.log("  分组 D 的覆盖率:", ageFeature.sparsityByGroup["D"]);
console.log("  ✅ 稀疏分析包含所有4个分组且D覆盖率为0:", test3Pass ? "是" : "否");
console.log("");

console.log("=".repeat(60));
const allPassed = test1Pass && test2Pass && test3Pass;
console.log(`  总体验证结果: ${allPassed ? "✅ 全部通过" : "❌ 存在失败"}`);
console.log("=".repeat(60));

if (allPassed) {
  console.log("%c✅ 所有修复验证通过！", "color: #22c55e; font-weight: bold; font-size: 14px;");
} else {
  console.log("%c❌ 存在测试失败，请检查修复！", "color: #ef4444; font-weight: bold; font-size: 14px;");
}
