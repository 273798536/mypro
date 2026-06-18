import type { Sample, ModelVersion, HistoryRecord, ReviewSession } from '@/types';
import { generateId } from '@/utils/format';

const attributes = ['品牌', '款式', '材质', '适用性别', '风格'];

const productNames = [
  '经典白色运动鞋',
  '真皮商务手提包',
  '纯棉印花T恤',
  '修身牛仔裤',
  '羊毛呢大衣',
  '运动休闲外套',
  '真丝连衣裙',
  '帆布双肩背包',
];

const categories = ['服装', '鞋靴', '箱包'];

function buildSample(
  index: number,
  versions: ModelVersion[],
  overrides: Partial<Sample> = {},
): Sample {
  const id = generateId('sample');
  const productId = `PROD${String(1001 + index).padStart(6, '0')}`;
  const productName = productNames[index % productNames.length];
  const category = categories[index % categories.length];

  const attributesMap: Record<string, import('@/types').AttributeOutput> = {};

  attributes.forEach((attr) => {
    const versionsMap: Record<string, import('@/types').AttributeVersionOutput> = {};

    versions.forEach((v, vi) => {
      const baseValue = getAttributeValue(attr, index + vi);
      const confidence = 0.6 + Math.random() * 0.35;
      versionsMap[v.id] = {
        value: baseValue,
        confidence: Math.round(confidence * 100) / 100,
        evidence: `基于图像特征提取，${attr}识别结果为「${baseValue}」`,
      };
    });

    attributesMap[attr] = {
      name: attr,
      versions: versionsMap,
    };
  });

  return {
    id,
    productId,
    productName,
    imageUrl: '',
    category,
    isBoundary: false,
    reviewStatus: 'pending',
    attributes: attributesMap,
    notes: [],
    leakRisk: 'none',
    createdAt: Date.now() - index * 3600000,
    updatedAt: Date.now() - index * 3600000,
    ...overrides,
  };
}

function getAttributeValue(attr: string, seed: number): string {
  const values: Record<string, string[]> = {
    品牌: ['Nike', 'Adidas', 'Uniqlo', 'Zara', 'Gucci', 'Nike', 'Adidas', 'HM'],
    款式: ['经典款', '运动款', '休闲款', '商务款', '复古款', '潮流款', '简约款', '工装款'],
    材质: ['棉', '涤纶', '真皮', '帆布', '羊毛', '真丝', '牛仔布', '尼龙'],
    适用性别: ['男', '女', '通用', '男', '女', '通用', '男', '女'],
    风格: ['运动风', '商务风', '休闲风', '复古风', '街头风', '简约风', '学院风', '工装风'],
  };
  const list = values[attr] || ['未知'];
  return list[seed % list.length];
}

export function createMockData(): {
  session: ReviewSession;
} {
  const baselineVersion: ModelVersion = {
    id: generateId('model'),
    name: 'v2.3.1 旧版',
    description: '基线模型，上一版本发布',
    importedAt: Date.now() - 86400000 * 3,
    isBaseline: true,
  };

  const newVersion: ModelVersion = {
    id: generateId('model'),
    name: 'v2.4.0 新版',
    description: '最新迭代版本，属性识别准确率提升',
    importedAt: Date.now() - 3600000 * 2,
    isBaseline: false,
  };

  const versions = [baselineVersion, newVersion];
  const samples = Array.from({ length: 8 }, (_, i) => buildSample(i, versions));

  samples[2].isBoundary = true;
  samples[2].reviewStatus = 'reviewing';
  samples[2].notes = [
    {
      id: generateId('note'),
      content: '这个样本模棱两可，需要人工确认',
      author: '小乔',
      createdAt: Date.now() - 3600000,
    },
  ];
  samples[2].leakRisk = 'medium';
  samples[2].leakReason = '相同商品ID在多个数据集中出现';

  samples[5].reviewStatus = 'confirmed';
  samples[5].attributes['品牌'].manualValue = 'Nike';
  samples[5].attributes['品牌'].finalValue = 'Nike';
  samples[5].attributes['款式'].manualValue = '经典款';
  samples[5].attributes['款式'].finalValue = '经典款';

  samples[0].reviewStatus = 'reviewing';

  const history: HistoryRecord[] = [
    {
      id: generateId('history'),
      type: 'import',
      operator: '系统',
      before: null,
      after: { version: baselineVersion.name, count: 8 },
      timestamp: baselineVersion.importedAt,
      reason: '导入基线模型输出',
    },
    {
      id: generateId('history'),
      type: 'import',
      operator: '系统',
      before: { version: baselineVersion.name, count: 8 },
      after: { version: newVersion.name, count: 8 },
      timestamp: newVersion.importedAt,
      reason: '导入新版本模型输出',
    },
    {
      id: generateId('history'),
      sampleId: samples[2].id,
      sampleName: samples[2].productName,
      type: 'boundary_mark',
      operator: '小乔',
      before: { isBoundary: false },
      after: { isBoundary: true },
      reason: '属性识别结果不稳定，标记为边界样本',
      timestamp: Date.now() - 7200000,
    },
    {
      id: generateId('history'),
      sampleId: samples[2].id,
      sampleName: samples[2].productName,
      type: 'note_add',
      operator: '小乔',
      before: { notes: [] },
      after: { notes: ['这个样本模棱两可，需要人工确认'] },
      timestamp: Date.now() - 3600000,
    },
    {
      id: generateId('history'),
      sampleId: samples[5].id,
      sampleName: samples[5].productName,
      type: 'verdict_change',
      operator: '小乔',
      before: { status: 'pending', brand: samples[5].attributes['品牌'].versions[newVersion.id].value },
      after: { status: 'confirmed', brand: 'Nike' },
      reason: '人工确认品牌为Nike，模型输出有误',
      timestamp: Date.now() - 1800000,
    },
  ];

  const session: ReviewSession = {
    id: generateId('session'),
    name: '6月属性模型迭代复核',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
    status: 'active',
    currentSampleId: samples[0].id,
    modelVersions: versions,
    samples,
    history,
  };

  return { session };
}
