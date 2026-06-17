import type { ModelVersion } from '@/types';

export const mockVersions: ModelVersion[] = [
  {
    id: 'v2.3.1',
    version: 'v2.3.1',
    trainDate: '2026-06-10',
    commitHash: 'a7f3d9b',
    description: '最新稳定版本，优化低分样本召回',
    batchCount: 4,
    sampleCount: 500,
  },
  {
    id: 'v2.3.0',
    version: 'v2.3.0',
    trainDate: '2026-05-28',
    commitHash: 'c1e8f42',
    description: '灰度版本，新增OCR图片处理',
    batchCount: 4,
    sampleCount: 480,
  },
  {
    id: 'v2.2.5',
    version: 'v2.2.5',
    trainDate: '2026-05-15',
    commitHash: '9b2e1a7',
    description: '历史稳定版本，基线参考',
    batchCount: 3,
    sampleCount: 420,
  },
  {
    id: 'v2.2.0',
    version: 'v2.2.0',
    trainDate: '2026-04-20',
    commitHash: 'd4c6f81',
    description: '架构重构版本',
    batchCount: 3,
    sampleCount: 380,
  },
];
