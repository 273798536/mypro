import type { ReviewRecord } from '@/types';

export const reviewRecords: ReviewRecord[] = [
  {
    id: 'REC-001',
    status: 'normal',
    title: 'A03测站8时低层风场',
    reviewer: '算法值班-小林',
    reviewedAt: '2025-06-09 09:12',
    comment: '风速随高度递增正常，风向稳定在ENE向，与沿岸季风特征吻合，剖面连续性良好。',
    sourceMaterial: {
      type: 'model',
      name: 'WRF_3km_A03_2025060908.nc',
      path: '/data/model/wrf/2025/06/09/A03/',
    },
    linkedPointIds: ['P-001', 'P-002', 'P-003'],
  },
  {
    id: 'REC-002',
    status: 'supplement',
    title: '补录：A03 6月8日遗漏批次',
    reviewer: '评审助理-阿乔',
    reviewedAt: '2025-06-09 10:05',
    comment: '6月8日20时剖面数据因CSV编码问题未入库，现已用现场手持设备备份补录，数值与模型偏差在±5%以内。',
    sourceMaterial: {
      type: 'csv',
      name: 'A03_handheld_20250608_backup.csv',
      path: '/data/supplement/2025-06/',
    },
    linkedPointIds: ['P-004', 'P-005', 'P-006', 'P-007'],
  },
  {
    id: 'REC-003',
    status: 'anomaly',
    title: 'A03 25F 风速突跳 + 风向偏转',
    reviewer: '算法值班-小林',
    reviewedAt: '2025-06-09 09:28',
    comment: '25层(约75m)处风速从6.0跳至11.2 m/s，风向同步由71°偏转至142°，疑似受到步道北侧临时施工塔吊尾流干扰，需核对现场日志。',
    sourceMaterial: {
      type: 'field-photo',
      name: 'A03_north_construction_20250609.jpg',
      path: '/photo/field/A03/2025-06-09/',
    },
    linkedPointIds: ['P-008'],
  },
  {
    id: 'REC-004',
    status: 'anomaly',
    title: 'A03 18层 反向回流异常',
    reviewer: '评审助理-阿乔',
    reviewedAt: '2025-06-09 10:41',
    comment: '18层剖面点出现215°西南向风，与整层ENE向背景风场完全相反，结合滨海地形分析为步道架空段下方空腔回流，建议复核测杆安装高度是否落入空腔区。',
    sourceMaterial: {
      type: 'model',
      name: 'CFD_cavity_A03_rerun_v2.f3d',
      path: '/data/model/cfd/runs/',
    },
    linkedPointIds: ['P-013'],
  },
];
