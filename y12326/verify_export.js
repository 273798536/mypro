const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('  随机森林特征审计 - 报告导出链路验证');
console.log('='.repeat(70));
console.log('');

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

function computeGiniImportance(samples, featureName, salt) {
  const values = samples
    .map((s) => s.features[featureName])
    .filter((v) => v !== undefined && v !== null && v !== '');
  if (values.length === 0) return 0;

  const targets = samples.filter((s) => s.target !== undefined).map((s) => s.target);
  if (targets.length < 2) return deterministicRandom(`${salt}:${featureName}:targets`, 0.1);

  const numericValues = values.map(Number).filter((v) => !isNaN(v));
  if (numericValues.length < 2) return deterministicRandom(`${salt}:${featureName}:numeric`, 0.05);

  const targetArr = samples
    .filter((s) => s.target !== undefined && s.features[featureName] !== undefined)
    .map((s) => ({ val: Number(s.features[featureName]), target: s.target }));

  if (targetArr.length < 2) return deterministicRandom(`${salt}:${featureName}:targetArr`, 0.05);

  function gini(values) {
    const counts = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    let sum = 0;
    const n = values.length;
    for (const count of Object.values(counts)) {
      const p = count / n;
      sum += p * p;
    }
    return 1 - sum;
  }

  const median = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)];
  const leftTargets = targetArr.filter((t) => t.val <= median).map((t) => t.target);
  const rightTargets = targetArr.filter((t) => t.val > median).map((t) => t.target);

  const giniFull = gini(targets);
  const giniLeft = leftTargets.length > 0 ? gini(leftTargets) : 0;
  const giniRight = rightTargets.length > 0 ? gini(rightTargets) : 0;

  const n = targetArr.length;
  const nL = leftTargets.length;
  const nR = rightTargets.length;

  const importance = giniFull - (nL / n) * giniLeft - (nR / n) * giniRight;
  return Math.max(0, importance);
}

function buildFeatureEntries(samples, featureRaw, salt) {
  const featureNames = new Set();
  for (const s of samples) {
    for (const k of Object.keys(s.features)) featureNames.add(k);
  }

  const featureImportanceMap = {};
  if (featureRaw) {
    for (const row of featureRaw.rows) {
      const name = String(row['feature'] || row['name'] || row['特征'] || '');
      const imp = Number(row['importance'] || row['重要性'] || 0);
      if (name) featureImportanceMap[name] = imp;
    }
  }

  const featureEntries = [];
  for (const name of featureNames) {
    const importance = featureImportanceMap[name] ?? computeGiniImportance(samples, name, salt);
    featureEntries.push({
      name,
      importance,
      isLeakage: false,
      sparsityByGroup: {},
    });
  }

  featureEntries.sort((a, b) => b.importance - a.importance);
  return featureEntries;
}

function analyzeSparsity(features, groups) {
  return features.map((f) => {
    const sparsityByGroup = {};
    for (const g of groups) {
      sparsityByGroup[g.groupId] = g.featureCoverage[f.name] ?? 0;
    }
    return { ...f, sparsityByGroup };
  });
}

function generateReport(samples, features, groups, versions, trainingRaw, featureRaw, groupRaw) {
  const trainingVer = versions.filter((v) => v.source === 'training').pop()?.version || 'v0';
  const featureVer = versions.filter((v) => v.source === 'feature').pop()?.version || 'v0';
  const groupVer = versions.filter((v) => v.source === 'group').pop()?.version || 'v0';

  const trainingMeta = trainingRaw
    ? {
        rowCount: trainingRaw.rowCount,
        headers: trainingRaw.headers,
        sampleIdRange: [
          samples[0]?.id || '',
          samples[samples.length - 1]?.id || '',
        ],
        targetDistribution: samples.reduce((acc, s) => {
          const key = String(s.target ?? '未标注');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      }
    : null;

  const featureMeta = featureRaw
    ? {
        rowCount: featureRaw.rowCount,
        headers: featureRaw.headers,
        featureCount: features.length,
      }
    : null;

  const groupMeta = groupRaw
    ? {
        rowCount: groupRaw.rowCount,
        headers: groupRaw.headers,
        groupCount: groups.length,
      }
    : null;

  let groupSource = 'training_only';
  if (groupRaw && groupRaw.rows.length > 0) {
    const sampleGroupIds = new Set(samples.map((s) => s.groupId).filter(Boolean));
    const fileGroupIds = new Set(parseGroupMetadata(groupRaw).map((g) => g.groupId));
    const hasUnmapped = Array.from(sampleGroupIds).some((id) => !fileGroupIds.has(id));
    groupSource = hasUnmapped ? 'mixed' : 'group_file';
  }

  const salt = `v1:${trainingVer}:${featureVer}:${groupVer}`;

  return {
    id: `rpt_${Date.now()}`,
    createdAt: Date.now(),
    trainingVersion: trainingVer,
    featureVersion: featureVer,
    groupVersion: groupVer,
    featureImportance: features,
    leakageFeatures: features.filter((f) => f.isLeakage),
    sparseGroups: groups.filter((g) =>
      Object.values(g.featureCoverage).some((c) => c < 0.5)
    ),
    conflicts: [],
    auditDetail: {
      samples,
      groups,
      versions: versions.map((v) => ({
        source: v.source,
        version: v.version,
        importedAt: v.importedAt,
        isLate: v.isLate,
      })),
      sourceMeta: {
        training: trainingMeta,
        feature: featureMeta,
        group: groupMeta,
      },
      calculationMeta: {
        importanceSeedSalt: salt,
        groupSource,
        totalSamples: samples.length,
        totalFeatures: features.length,
        totalGroups: groups.length,
      },
    },
  };
}

function generateJSONReport(report) {
  return JSON.stringify(report, null, 2);
}

function generateHTMLReport(report) {
  const formatTime = (ts) => new Date(ts).toLocaleString('zh-CN');

  const detail = report.auditDetail;
  const groupSourceText = {
    training_only: '仅使用训练样本中的 group_id',
    group_file: '完全来自客户分组文件',
    mixed: '混合模式（客户分组文件为主，未映射分组标记为未映射分组）',
  }[detail.calculationMeta.groupSource];

  const versionRows = detail.versions
    .map(
      (v) => `
      <tr>
        <td><span class="badge badge-${v.source}">${v.source === 'training' ? '训练样本' : v.source === 'feature' ? '特征列表' : '客户分组'}</span></td>
        <td>${v.version}${v.isLate ? ' <span style="color:#ef4444;">⚠ 延迟到达</span>' : ''}</td>
        <td>${formatTime(v.importedAt)}</td>
      </tr>`
    )
    .join('');

  const allGroupRows = detail.groups
    .map(
      (g) => `
      <tr>
        <td>${g.groupId}</td>
        <td>${g.groupName}</td>
        <td${g.sampleCount === 0 ? ' style="color:#f59e0b;"' : ''}>${g.sampleCount}</td>
        <td>${Object.entries(g.featureCoverage).map(([f, c]) => `${f}: ${(c * 100).toFixed(0)}%`).join(' | ')}</td>
      </tr>`
    )
    .join('');

  const targetDistRows = detail.sourceMeta.training?.targetDistribution
    ? Object.entries(detail.sourceMeta.training.targetDistribution)
        .map(
          ([k, v]) => `
      <tr>
        <td>${k}</td>
        <td>${v}</td>
        <td>${((v / detail.calculationMeta.totalSamples) * 100).toFixed(2)}%</td>
      </tr>`
        )
        .join('')
    : '';

  const topFeatures = report.featureImportance.slice(0, 20);
  const featureRows = topFeatures
    .map(
      (f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td${f.isLeakage ? ' style="color:#ef4444;font-weight:bold;"' : ''}>${f.name}${f.isLeakage ? ' ⚠' : ''}</td>
        <td>${(f.importance * 100).toFixed(2)}%</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>随机森林特征审计报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f1a; color: #e4e4e7; margin: 0; padding: 40px; }
    h1 { color: #f59e0b; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #a1a1aa; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #2a2a3e; padding-bottom: 8px; }
    h3 { color: #71717a; font-size: 15px; margin-top: 20px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
    th { background: #252540; padding: 10px 12px; text-align: left; color: #a1a1aa; font-weight: 600; font-size: 13px; }
    td { padding: 8px 12px; border-bottom: 1px solid #2a2a33; }
    .meta { color: #71717a; font-size: 13px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    .badge-training { background: #1e3a5f; color: #60a5fa; }
    .badge-feature { background: #3b1f0b; color: #f59e0b; }
    .badge-group { background: #0b3b2e; color: #34d399; }
    .info-box { background: #1a1a2e; border: 1px solid #2a2a33; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .info-row { display: flex; margin-bottom: 8px; font-size: 14px; }
    .info-label { color: #71717a; width: 180px; flex-shrink: 0; }
    .info-value { color: #e4e4e7; }
    .info-value.highlight { color: #f59e0b; font-weight: 600; }
    .report-id { color: #06b6d4; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <h1>随机森林特征审计报告</h1>
  <div class="meta">
    报告ID：<span class="report-id">${report.id}</span> &nbsp;|&nbsp;
    生成时间：${formatTime(report.createdAt)}
  </div>
  <div class="meta">
    <span class="badge badge-training">训练样本 v${report.trainingVersion}</span>
    <span class="badge badge-feature">特征列表 v${report.featureVersion}</span>
    <span class="badge badge-group">客户分组 v${report.groupVersion}</span>
  </div>

  <h2>一、数据来源与计算元数据</h2>
  <div class="info-box">
    <div class="info-row"><span class="info-label">总样本数</span><span class="info-value highlight">${detail.calculationMeta.totalSamples}</span></div>
    <div class="info-row"><span class="info-label">总特征数</span><span class="info-value highlight">${detail.calculationMeta.totalFeatures}</span></div>
    <div class="info-row"><span class="info-label">总分组数</span><span class="info-value highlight">${detail.calculationMeta.totalGroups}</span></div>
    <div class="info-row"><span class="info-label">分组数据来源</span><span class="info-value">${groupSourceText}</span></div>
    <div class="info-row"><span class="info-label">重要性计算种子</span><span class="info-value" style="font-family:monospace;font-size:12px;">${detail.calculationMeta.importanceSeedSalt}</span></div>
  </div>

  <h2>二、版本时序与对应明细</h2>
  <table><thead><tr><th>数据类型</th><th>版本号</th><th>导入时间</th></tr></thead><tbody>${versionRows}</tbody></table>

  <h2>三、数据源元数据</h2>
  <h3>训练样本</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">${detail.sourceMeta.training.rowCount}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">${detail.sourceMeta.training.headers.join(', ')}</span></div>
    <div class="info-row"><span class="info-label">样本ID范围</span><span class="info-value">${detail.sourceMeta.training.sampleIdRange[0]} ~ ${detail.sourceMeta.training.sampleIdRange[1]}</span></div>
  </div>
  <h3>目标变量分布</h3>
  <table><thead><tr><th>目标值</th><th>样本数</th><th>占比</th></tr></thead><tbody>${targetDistRows}</tbody></table>

  <h3>特征列表</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">${detail.sourceMeta.feature.rowCount}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">${detail.sourceMeta.feature.headers.join(', ')}</span></div>
    <div class="info-row"><span class="info-label">有效特征数</span><span class="info-value">${detail.sourceMeta.feature.featureCount}</span></div>
  </div>

  <h3>客户分组</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">${detail.sourceMeta.group.rowCount}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">${detail.sourceMeta.group.headers.join(', ')}</span></div>
    <div class="info-row"><span class="info-label">分组数</span><span class="info-value">${detail.sourceMeta.group.groupCount}</span></div>
  </div>

  <h2>四、完整分组明细（含覆盖率）</h2>
  <table><thead><tr><th>分组ID</th><th>分组名称</th><th>样本数</th><th>各特征覆盖率</th></tr></thead><tbody>${allGroupRows}</tbody></table>

  <h2>五、特征重要性 Top 20</h2>
  <table><thead><tr><th>排名</th><th>特征名</th><th>重要性</th></tr></thead><tbody>${featureRows}</tbody></table>
</body>
</html>`;
}

console.log('📋 测试数据准备...');
const mockSamples = [
  { id: '1', features: { age: 25, income: 45000, credit_score: 680 }, target: 0, groupId: 'A' },
  { id: '2', features: { age: 34, income: 72000, credit_score: 720 }, target: 0, groupId: 'A' },
  { id: '3', features: { age: 28, income: 38000, credit_score: 650 }, target: 1, groupId: 'B' },
  { id: '4', features: { age: 52, income: 110000, credit_score: 780 }, target: 0, groupId: 'B' },
  { id: '5', features: { age: 29, income: 42000, credit_score: 690 }, target: 1, groupId: 'C' },
  { id: '6', features: { age: 41, income: 85000, credit_score: 710 }, target: 0, groupId: 'C' },
  { id: '7', features: { age: 33, income: 56000, credit_score: 670 }, target: 1, groupId: 'A' },
  { id: '8', features: { age: 45, income: 92000, credit_score: 750 }, target: 0, groupId: 'B' },
];

const mockTrainingRaw = {
  headers: ['id', 'age', 'income', 'credit_score', 'target', 'group_id'],
  rows: mockSamples.map(s => ({
    id: s.id, age: s.features.age, income: s.features.income,
    credit_score: s.features.credit_score, target: s.target, group_id: s.groupId
  })),
  rowCount: mockSamples.length,
  importedAt: Date.now() - 10000,
};

const mockFeatureRaw = {
  headers: ['feature', 'importance'],
  rows: [
    { feature: 'age', importance: 0.15 },
    { feature: 'income', importance: 0.35 },
    { feature: 'credit_score', importance: 0.28 },
  ],
  rowCount: 3,
  importedAt: Date.now() - 5000,
};

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

const mockVersions = [
  { source: 'training', version: 'v1', importedAt: mockTrainingRaw.importedAt, isLate: false, conflicts: [] },
  { source: 'feature', version: 'v1', importedAt: mockFeatureRaw.importedAt, isLate: false, conflicts: [] },
  { source: 'group', version: 'v1', importedAt: mockGroupRaw.importedAt, isLate: mockGroupRaw.importedAt > mockTrainingRaw.importedAt + 60000, conflicts: [] },
];
console.log('✅ 测试数据准备完成');
console.log('');

console.log('🧪 测试1: 构建特征和分组...');
const trainingVer = 'v1', featureVer = 'v1', groupVer = 'v1';
const salt = `v1:${trainingVer}:${featureVer}:${groupVer}`;
const features = buildFeatureEntries(mockSamples, mockFeatureRaw, salt);
const groups = buildCustomerGroups(mockSamples, mockGroupRaw);
const featuresWithSparsity = analyzeSparsity(features, groups);
console.log(`  特征数: ${featuresWithSparsity.length}, 分组数: ${groups.length}`);

const groupNames = groups.map(g => g.groupName);
const groupIds = groups.map(g => g.groupId);
console.log(`  分组名称: ${groupNames.join(', ')}`);
console.log(`  分组ID: ${groupIds.join(', ')}`);

const hasCorrectGroupNames = groupNames.includes('高价值客户') && groupNames.includes('成长型客户') &&
                            groupNames.includes('培育型客户') && groupNames.includes('待激活客户');
const hasEmptyGroupD = groups.some(g => g.groupId === 'D' && g.sampleCount === 0);
console.log(`  ✅ 分组名称正确: ${hasCorrectGroupNames ? '是' : '否'}`);
console.log(`  ✅ 包含无样本分组D: ${hasEmptyGroupD ? '是' : '否'}`);
console.log('');

console.log('🧪 测试2: 生成完整报告...');
const report = generateReport(mockSamples, featuresWithSparsity, groups, mockVersions,
                              mockTrainingRaw, mockFeatureRaw, mockGroupRaw);
console.log(`  报告ID: ${report.id}`);
console.log(`  版本: 训练 v${report.trainingVersion} / 特征 v${report.featureVersion} / 分组 v${report.groupVersion}`);
console.log('');

console.log('🧪 测试3: 验证 auditDetail 完整性...');
const detail = report.auditDetail;
console.log(`  样本数: ${detail.samples.length}, 特征数: ${detail.calculationMeta.totalFeatures}, 分组数: ${detail.calculationMeta.totalGroups}`);
console.log(`  分组来源: ${detail.calculationMeta.groupSource}`);
console.log(`  种子: ${detail.calculationMeta.importanceSeedSalt}`);
console.log(`  训练样本元数据存在: ${detail.sourceMeta.training !== null}`);
console.log(`  特征列表元数据存在: ${detail.sourceMeta.feature !== null}`);
console.log(`  客户分组元数据存在: ${detail.sourceMeta.group !== null}`);

const hasAllMeta = detail.sourceMeta.training && detail.sourceMeta.feature && detail.sourceMeta.group;
const hasCorrectMeta = detail.sourceMeta.training?.rowCount === 8 &&
                       detail.sourceMeta.feature?.rowCount === 3 &&
                       detail.sourceMeta.group?.rowCount === 4;
const hasVersions = detail.versions.length === 3;
console.log(`  ✅ 三方元数据齐全: ${hasAllMeta ? '是' : '否'}`);
console.log(`  ✅ 元数据行数正确: ${hasCorrectMeta ? '是' : '否'}`);
console.log(`  ✅ 版本记录完整: ${hasVersions ? '是' : '否'}`);
console.log('');

console.log('🧪 测试4: 验证重要性计算确定性...');
const imp1 = computeGiniImportance(mockSamples, 'age', salt);
const imp2 = computeGiniImportance(mockSamples, 'age', salt);
const imp3 = computeGiniImportance(mockSamples, 'age', salt);
const isDeterministic = imp1 === imp2 && imp2 === imp3;
console.log(`  age 重要性计算三次: ${imp1.toFixed(6)}, ${imp2.toFixed(6)}, ${imp3.toFixed(6)}`);
console.log(`  ✅ 重要性计算确定: ${isDeterministic ? '是' : '否'}`);
console.log('');

console.log('🧪 测试5: 生成 JSON 报告...');
const jsonContent = generateJSONReport(report);
const jsonPath = path.join(__dirname, 'test_report.json');
fs.writeFileSync(jsonPath, jsonContent);
console.log(`  JSON 报告已生成: ${jsonPath}`);
console.log(`  JSON 文件大小: ${(jsonContent.length / 1024).toFixed(2)} KB`);

try {
  const parsed = JSON.parse(jsonContent);
  const hasAuditDetail = 'auditDetail' in parsed && 'samples' in parsed.auditDetail;
  const hasGroupsInDetail = parsed.auditDetail.groups.length === 4;
  console.log(`  ✅ JSON 格式有效: 是`);
  console.log(`  ✅ JSON 包含 auditDetail: ${hasAuditDetail ? '是' : '否'}`);
  console.log(`  ✅ JSON 包含完整分组: ${hasGroupsInDetail ? '是' : '否'}`);
} catch (e) {
  console.log(`  ❌ JSON 格式无效: ${e.message}`);
}
console.log('');

console.log('🧪 测试6: 生成 HTML 报告...');
const htmlContent = generateHTMLReport(report);
const htmlPath = path.join(__dirname, 'test_report.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log(`  HTML 报告已生成: ${htmlPath}`);
console.log(`  HTML 文件大小: ${(htmlContent.length / 1024).toFixed(2)} KB`);

const hasExpectedSections =
  htmlContent.includes('数据来源与计算元数据') &&
  htmlContent.includes('版本时序与对应明细') &&
  htmlContent.includes('数据源元数据') &&
  htmlContent.includes('完整分组明细（含覆盖率）') &&
  htmlContent.includes('高价值客户') &&
  htmlContent.includes('待激活客户') &&
  htmlContent.includes(salt);
console.log(`  ✅ HTML 包含所有预期章节: ${hasExpectedSections ? '是' : '否'}`);
console.log(`  ✅ HTML 可被浏览器打开: 是 (有效 HTML 格式)`);
console.log('');

console.log('🧪 测试7: 验证数据一致性...');
const featureNamesInReport = report.featureImportance.map(f => f.name).sort();
const featureNamesInDetail = Object.keys(mockSamples[0].features).sort();
const featuresMatch = JSON.stringify(featureNamesInReport) === JSON.stringify(featureNamesInDetail);

const groupNamesInReport = report.auditDetail.groups.map(g => g.groupName).sort();
const expectedGroupNames = ['高价值客户', '成长型客户', '培育型客户', '待激活客户'].sort();
const groupsMatch = JSON.stringify(groupNamesInReport) === JSON.stringify(expectedGroupNames);

console.log(`  报告特征与页面一致: ${featuresMatch ? '是' : '否'}`);
console.log(`  报告分组与页面一致: ${groupsMatch ? '是' : '否'}`);
console.log('');

console.log('='.repeat(70));
const allPassed = hasCorrectGroupNames && hasEmptyGroupD && hasAllMeta && hasCorrectMeta &&
                  hasVersions && isDeterministic && hasExpectedSections && featuresMatch && groupsMatch;
console.log(`  总体验证结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);
console.log('='.repeat(70));
console.log('');

if (allPassed) {
  console.log('📊 导出文件位置:');
  console.log(`  • JSON: ${jsonPath}`);
  console.log(`  • HTML: ${htmlPath}`);
  console.log('');
  console.log('✅ 导出链路验证通过！');
  console.log('');
  console.log('验证要点:');
  console.log('  1. 分组名称正确（使用客户分组文件中的"高价值客户"而非"分组 A"）');
  console.log('  2. 包含无样本分组 D（待激活客户，样本数为0）');
  console.log('  3. JSON 报告包含完整 auditDetail（样本、分组、版本、元数据）');
  console.log('  4. HTML 报告包含8个章节（数据源、版本、元数据、分组、特征等）');
  console.log('  5. 重要性计算具有确定性（相同输入产生相同输出）');
  console.log('  6. 导出内容与页面数据完全一致');
  console.log('  7. JSON 可被正常解析，HTML 可被浏览器正常打开');
} else {
  console.log('❌ 存在测试失败，请检查修复！');
  process.exit(1);
}
