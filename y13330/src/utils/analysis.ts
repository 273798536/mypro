import type {
  Sample,
  ModelVersion,
  VersionComparison,
  VerdictExplanation,
  ExplanationFactor,
  LeakRiskLevel,
  LeakGuidance,
  AttributeOutput,
} from '@/types';

export function compareModelVersions(
  samples: Sample[],
  oldVersionId: string,
  newVersionId: string,
): VersionComparison[] {
  return samples
    .map((sample) => {
      const changed: string[] = [];
      const added: string[] = [];
      const removed: string[] = [];
      const confidenceChanges: Record<string, number> = {};

      Object.entries(sample.attributes).forEach(([attrName, attr]) => {
        const oldVal = attr.versions[oldVersionId];
        const newVal = attr.versions[newVersionId];

        if (oldVal && !newVal) {
          removed.push(attrName);
        } else if (!oldVal && newVal) {
          added.push(attrName);
        } else if (oldVal && newVal) {
          if (oldVal.value !== newVal.value) {
            changed.push(attrName);
          }
          confidenceChanges[attrName] = newVal.confidence - oldVal.confidence;
        }
      });

      return {
        sampleId: sample.id,
        changedAttributes: changed,
        addedAttributes: added,
        removedAttributes: removed,
        confidenceChanges,
      };
    })
    .filter(
      (c) =>
        c.changedAttributes.length > 0 ||
        c.addedAttributes.length > 0 ||
        c.removedAttributes.length > 0,
    );
}

export function hasAttributeChanged(
  attr: AttributeOutput,
  versionA: string,
  versionB: string,
): boolean {
  const a = attr.versions[versionA];
  const b = attr.versions[versionB];
  if (!a || !b) return a !== b;
  return a.value !== b.value;
}

export function generateVerdictExplanation(
  sample: Sample,
  modelVersions: ModelVersion[],
  history: import('@/types').HistoryRecord[],
): VerdictExplanation {
  const factors: ExplanationFactor[] = [];
  const sampleHistory = history.filter((h) => h.sampleId === sample.id);

  modelVersions.forEach((mv) => {
    const firstAttr = Object.values(sample.attributes)[0];
    if (firstAttr?.versions[mv.id]) {
      factors.push({
        type: 'model_version',
        description: `模型版本「${mv.name}」输出结果`,
        weight: 40,
        timestamp: mv.importedAt,
      });
    }
  });

  sampleHistory.forEach((record) => {
    if (record.type === 'verdict_change' || record.type === 'attribute_edit') {
      factors.push({
        type: 'manual_edit',
        description: `人工修改属性判定`,
        weight: 35,
        timestamp: record.timestamp,
        operator: record.operator,
      });
    }
    if (record.type === 'boundary_mark') {
      factors.push({
        type: 'boundary_mark',
        description: '标记为边界样本',
        weight: 15,
        timestamp: record.timestamp,
        operator: record.operator,
      });
    }
    if (record.type === 'note_add') {
      factors.push({
        type: 'note',
        description: '添加了备注说明',
        weight: 10,
        timestamp: record.timestamp,
        operator: record.operator,
      });
    }
  });

  factors.sort((a, b) => b.weight - a.weight);

  const firstVersion = modelVersions[0];
  const initialVerdict = firstVersion
    ? Object.values(sample.attributes)
        .map((a) => a.versions[firstVersion.id]?.value ?? '未知')
        .join(' / ')
    : '无';

  const currentVerdict = Object.values(sample.attributes)
    .map((a) => a.finalValue ?? a.manualValue ?? Object.values(a.versions)[0]?.value ?? '未知')
    .join(' / ');

  const topFactors = factors.slice(0, 3).map((f) => f.description).join('、');
  const summary = factors.length > 0
    ? `该样本的判定主要受${topFactors}影响，共经历${sampleHistory.length}次操作。`
    : '该样本尚未进行任何人工操作，判定完全基于模型输出。';

  return {
    sampleId: sample.id,
    initialVerdict,
    currentVerdict,
    factors,
    summary,
  };
}

export function detectLeakRisk(sample: Sample, allSamples: Sample[]): LeakRiskLevel {
  const sameProductId = allSamples.filter(
    (s) => s.productId === sample.productId && s.id !== sample.id,
  );

  if (sameProductId.length >= 3) return 'high';
  if (sameProductId.length >= 1) return 'medium';

  const sameName = allSamples.filter(
    (s) =>
      s.productName === sample.productName &&
      s.id !== sample.id &&
      s.productId !== sample.productId,
  );
  if (sameName.length >= 2) return 'low';

  return 'none';
}

export function getLeakGuidance(level: LeakRiskLevel): LeakGuidance {
  switch (level) {
    case 'high':
      return {
        level: 'high',
        title: '高风险：疑似训练集泄漏',
        severity: 'danger',
        steps: [
          '立即核对该样本ID是否存在于训练集中',
          '检查该样本是否在多个版本中重复出现且置信度异常高',
          '联系数据负责人确认数据划分是否正确',
          '如确认泄漏，从测试集中移除该样本并重新评估指标',
          '在历史记录中备注泄漏原因和处理结果',
        ],
      };
    case 'medium':
      return {
        level: 'medium',
        title: '中风险：需要关注的样本重叠',
        severity: 'warning',
        steps: [
          '检查相同商品ID是否同时出现在训练/测试集',
          '对比该样本在不同版本的置信度变化趋势',
          '确认是否为重复标注导致的同名不同ID',
          '在备注中记录核查结果',
        ],
      };
    case 'low':
      return {
        level: 'low',
        title: '低风险：轻微相似性提示',
        severity: 'info',
        steps: [
          '快速浏览相似样本，确认是否为正常数据分布',
          '可结合业务场景判断是否需要进一步排查',
          '如有疑问可在备注中 @相关同事确认',
        ],
      };
    default:
      return {
        level: 'none',
        title: '无泄漏风险',
        severity: 'info',
        steps: ['该样本未检测到明显的泄漏特征'],
      };
  }
}
