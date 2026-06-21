import type { Exception } from '@/types';

export const mockExceptions: Exception[] = [
  {
    id: 'ex-001',
    type: 'grayscale_ratio',
    parameterName: '灰度比例',
    currentValue: 85,
    expectedValue: 30,
    impact: '导致参与训练的客户端数量超出预期46%，总成本增加48%，约42,330元',
    steps: [
      '打开实验配置平台，进入"灰度实验管理"页面',
      '找到ID为 exp-2024-06-20-001 的实验配置',
      '将"灰度比例"字段从 85% 修改为 30%',
      '点击"保存并同步"按钮，确认配置生效',
      '返回成本看板，点击"重新计算"按钮验证修正结果',
      '在备注中补充修改说明和操作截图'
    ],
    status: 'open'
  },
  {
    id: 'ex-002',
    type: 'parameter_out_of_bound',
    parameterName: '单轮训练时长',
    currentValue: 4.1,
    expectedValue: 3.5,
    impact: '单轮训练时长超出基准值17%，可能导致训练周期延长，需排查客户端网络状况',
    steps: [
      '登录训练监控系统，查看客户端网络延迟分布',
      '筛选出延迟超过 500ms 的客户端列表',
      '联系运维团队排查对应区域的CDN节点状态',
      '如果是偶发波动，在备注中说明原因后可放行',
      '如果是持续问题，考虑剔除异常客户端后重新计算'
    ],
    status: 'resolved'
  }
];
