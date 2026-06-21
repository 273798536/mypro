import type { ReviewItem } from '@/types';

export const mockReviewItems: ReviewItem[] = [
  {
    id: 'r1',
    snapshotId: 'snap-001',
    material: '灰度比例配置错误的根因分析报告',
    isComplete: false,
    action: 'supplement',
    remark: '需补充配置平台UI bug的具体复现步骤和修复方案'
  },
  {
    id: 'r2',
    snapshotId: 'snap-001',
    material: '异常成本回滚后的重新计算结果',
    isComplete: false,
    action: 'supplement',
    remark: '修正灰度比例为30%后，重新生成成本快照'
  },
  {
    id: 'r3',
    snapshotId: 'snap-001',
    material: '训练日志中的异常时间段标注',
    isComplete: true,
    action: 'release',
    remark: '已在2024-06-20 14:30-15:00时间段标注异常'
  },
  {
    id: 'r4',
    snapshotId: 'snap-001',
    material: '与运维团队的沟通记录截图',
    isComplete: true,
    action: 'release',
    remark: '已确认配置平台bug，PR已提交待合并'
  },
  {
    id: 'r5',
    snapshotId: 'snap-002',
    material: 'v2.4.0版本性能测试报告',
    isComplete: true,
    action: 'release',
    remark: '收敛速度提升8%，符合预期'
  },
  {
    id: 'r6',
    snapshotId: 'snap-002',
    material: '与上一版本的成本对比分析',
    isComplete: true,
    action: 'release',
    remark: '成本下降6.2%，主要来自训练效率提升'
  },
  {
    id: 'r7',
    snapshotId: 'snap-003',
    material: '网络波动事件的正式说明文档',
    isComplete: false,
    action: 'supplement',
    remark: '需运维团队出具官方说明文件'
  },
  {
    id: 'r8',
    snapshotId: 'snap-003',
    material: '受影响客户端列表及排除方案',
    isComplete: true,
    action: 'release',
    remark: '已确认不影响整体成本核算逻辑'
  }
];
