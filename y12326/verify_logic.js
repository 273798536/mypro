const fs = require('fs');

// 测试修复的核心逻辑
console.log('='.repeat(60));
console.log('  随机森林特征审计 - 修复验证 (纯逻辑测试)');
console.log('='.repeat(60));
console.log('');

// 测试1: hashCode 函数
console.log('🧪 测试1: hashCode 确定性哈希函数');
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const testStrs = ['age', 'income', 'credit_score', 'age', 'income'];
const results = testStrs.map(s => hashCode(s));
const deterministic1 = results[0] === results[3] && results[1] === results[4];
console.log(`  hashCode('age') = ${results[0]}, 再次调用 = ${results[3]} ${deterministic1 ? '✅' : '❌'}`);
console.log(`  hashCode('income') = ${results[1]}, 再次调用 = ${results[4]} ${deterministic1 ? '✅' : '❌'}`);
console.log(`  ✅ 哈希函数确定性: ${deterministic1 ? '是' : '否'}`);
console.log('');

// 测试2: deterministicRandom 函数
console.log('🎲 测试2: deterministicRandom 确定性随机数');
function deterministicRandom(seed, range = 1) {
  const hash = hashCode(seed);
  return (hash % 1000000) / 1000000 * range;
}

const seeds = ['age:targets', 'income:numeric', 'credit_score:targetArr'];
for (const seed of seeds) {
  const v1 = deterministicRandom(seed, 0.1);
  const v2 = deterministicRandom(seed, 0.1);
  const v3 = deterministicRandom(seed, 0.1);
  const same = v1 === v2 && v2 === v3;
  console.log(`  ${seed}: ${v1.toFixed(6)} | ${v2.toFixed(6)} | ${v3.toFixed(6)} ${same ? '✅' : '❌'}`);
}
console.log('');

// 测试3: buildCustomerGroups 使用 groupRaw
console.log('📊 测试3: buildCustomerGroups 使用 groupRaw 数据');

const mockSamples = [
  { id: '1', features: { age: 25, income: 45000 }, target: 0, groupId: 'A' },
  { id: '2', features: { age: 34, income: 72000 }, target: 0, groupId: 'A' },
  { id: '3', features: { age: 28, income: 38000 }, target: 1, groupId: 'B' },
  { id: '4', features: { age: 52, income: 110000 }, target: 0, groupId: 'B' },
  { id: '5', features: { age: 29, income: 42000 }, target: 1, groupId: 'C' },
];

const mockGroupRaw = {
  headers: ['group_id', 'group_name', 'description'],
  rows: [
    { group_id: 'A', group_name: '高价值客户', description: '年收入大于70000' },
    { group_id: 'B', group_name: '成长型客户', description: '年收入40000-70000' },
    { group_id: 'C', group_name: '培育型客户', description: '年收入小于40000' },
    { group_id: 'D', group_name: '待激活客户', description: '尚未产生交易记录' },
  ],
  rowCount: 4,
  importedAt: Date.now(),
};

function parseGroupMetadata(groupRaw) {
  return groupRaw.rows.map((row, idx) => {
    const groupId = String(
      row['group_id'] || row['groupid'] || row['id'] || row['groupId'] || ''
    ).trim();
    const groupName = String(
      row['group_name'] || row['groupname'] || row['name'] || row['描述'] || row['description'] || ''
    ).trim() || `分组 ${groupId}`;
    return { groupId, groupName, order: idx };
  }).filter((g) => g.groupId);
}

function buildCustomerGroups(samples, groupRaw) {
  const sampleGroupMap = {};
  for (const s of samples) {
    const gid = s.groupId || 'default';
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
        (s) => s.features[fname] !== undefined && s.features[fname] !== null && s.features[fname] !== ''
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

const groupsWithoutRaw = buildCustomerGroups(mockSamples);
const groupsWithRaw = buildCustomerGroups(mockSamples, mockGroupRaw);

console.log('  未传入 groupRaw:');
groupsWithoutRaw.forEach((g, i) => {
  console.log(`    ${i + 1}. ${g.groupName} (${g.groupId}) - ${g.sampleCount} 样本`);
});

console.log('');
console.log('  传入 groupRaw 后:');
groupsWithRaw.forEach((g, i) => {
  console.log(`    ${i + 1}. ${g.groupName} (${g.groupId}) - ${g.sampleCount} 样本`);
});

const hasCorrectNames = groupsWithRaw[0].groupName === '高价值客户' &&
                        groupsWithRaw[1].groupName === '成长型客户' &&
                        groupsWithRaw[2].groupName === '培育型客户';
const hasEmptyGroupD = groupsWithRaw.some((g) => g.groupId === 'D' && g.sampleCount === 0 && g.groupName === '待激活客户');
const groupOrderPreserved = groupsWithRaw[0].groupId === 'A' &&
                           groupsWithRaw[1].groupId === 'B' &&
                           groupsWithRaw[2].groupId === 'C' &&
                           groupsWithRaw[3].groupId === 'D';

console.log('');
console.log(`  ✅ 分组名称正确（使用客户分组文件中的名称）: ${hasCorrectNames ? '是' : '否'}`);
console.log(`  ✅ 包含无样本分组 D（样本数为0）: ${hasEmptyGroupD ? '是' : '否'}`);
console.log(`  ✅ 分组顺序与客户分组文件一致: ${groupOrderPreserved ? '是' : '否'}`);
console.log('');

// 测试4: 稀疏分析使用正确的分组
console.log('🔬 测试4: 稀疏分析使用正确的分组');
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
  { name: 'age', importance: 0.1, isLeakage: false, sparsityByGroup: {} },
  { name: 'income', importance: 0.2, isLeakage: false, sparsityByGroup: {} },
];

const featuresWithSparsity = analyzeSparsity(mockFeatures, groupsWithRaw);
const ageFeature = featuresWithSparsity.find((f) => f.name === 'age');
const hasFourGroupSparsity = Object.keys(ageFeature.sparsityByGroup).length === 4 &&
                            'A' in ageFeature.sparsityByGroup &&
                            'B' in ageFeature.sparsityByGroup &&
                            'C' in ageFeature.sparsityByGroup &&
                            'D' in ageFeature.sparsityByGroup;
const groupDHasZeroCoverage = ageFeature.sparsityByGroup['D'] === 0;

console.log('  特征 age 的稀疏性数据:');
groupsWithRaw.forEach((g) => {
  console.log(`    ${g.groupName} (${g.groupId}): ${(ageFeature.sparsityByGroup[g.groupId] * 100).toFixed(0)}%`);
});
console.log(`  ✅ 包含4个分组的稀疏数据: ${hasFourGroupSparsity ? '是' : '否'}`);
console.log(`  ✅ 分组D覆盖率为0: ${groupDHasZeroCoverage ? '是' : '否'}`);
console.log('');

// 测试5: 报告包含正确的分组名称
console.log('📝 测试5: 报告生成包含正确的分组名称');
const mockReport = {
  groups: groupsWithRaw,
  groupNames: groupsWithRaw.map((g) => g.groupName),
};
console.log('  报告中的分组名称:', mockReport.groupNames);
const reportHasCorrectNames = mockReport.groupNames[0] === '高价值客户' &&
                             mockReport.groupNames[1] === '成长型客户' &&
                             mockReport.groupNames[2] === '培育型客户' &&
                             mockReport.groupNames[3] === '待激活客户';
console.log(`  ✅ 报告包含正确的分组名称: ${reportHasCorrectNames ? '是' : '否'}`);
console.log('');

console.log('='.repeat(60));
const allPassed = deterministic1 && hasCorrectNames && hasEmptyGroupD &&
                  groupOrderPreserved && hasFourGroupSparsity &&
                  groupDHasZeroCoverage && reportHasCorrectNames;
console.log(`  总体验证结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);
console.log('='.repeat(60));

if (!allPassed) {
  process.exit(1);
}
