import type { CostSnapshot } from '@/types';

export const mockSnapshots: CostSnapshot[] = [
  {
    id: 'snap-001',
    version: 'v2.4.1',
    modelVersion: 'rec-2024-06-hotfix',
    createdAt: '2024-06-20T14:30:00Z',
    operator: '许工',
    totalCost: 128750.5,
    status: 'error',
    parameters: [
      {
        id: 'p1',
        name: '客户端数量',
        formula: 'active_devices * 0.85',
        unit: '台',
        value: 12500,
        minBoundary: 5000,
        maxBoundary: 15000,
        source: '设备注册中心',
        description: '参与联邦训练的活跃客户端设备数'
      },
      {
        id: 'p2',
        name: '单轮训练时长',
        formula: 'batch_size * epochs / throughput',
        unit: '小时',
        value: 3.5,
        minBoundary: 1,
        maxBoundary: 8,
        source: '训练监控系统',
        description: '每轮联邦训练的平均耗时'
      },
      {
        id: 'p3',
        name: '灰度比例',
        formula: 'gray_clients / total_clients',
        unit: '%',
        value: 85,
        minBoundary: 10,
        maxBoundary: 50,
        source: '实验配置平台',
        description: '参与灰度实验的客户端占比，正常应控制在10%-50%'
      },
      {
        id: 'p4',
        name: '算力单价',
        formula: 'gpu_hour_cost * utilization_rate',
        unit: '元/小时',
        value: 12.5,
        minBoundary: 8,
        maxBoundary: 20,
        source: '云服务账单',
        description: '客户端设备算力使用单价'
      },
      {
        id: 'p5',
        name: '通信成本',
        formula: 'data_size * bandwidth_cost * transmission_times',
        unit: '元',
        value: 8500,
        minBoundary: 2000,
        maxBoundary: 10000,
        source: '网络流量监控',
        description: '模型参数传输产生的网络通信成本'
      },
      {
        id: 'p6',
        name: '训练轮次',
        formula: 'convergence_threshold / improvement_rate',
        unit: '轮',
        value: 45,
        minBoundary: 20,
        maxBoundary: 100,
        source: '训练日志',
        description: '模型达到收敛所需的训练轮次数'
      }
    ],
    notes: [
      {
        id: 'n1',
        content: '灰度比例配置错误，应为30%，误写为85%，已同步至训练日志',
        author: '许工',
        createdAt: '2024-06-20T15:10:00Z',
        isSupplement: false
      },
      {
        id: 'n2',
        content: '后续补记：6月21日排查确认是配置平台UI bug导致数值溢出，已提交修复PR',
        author: '许工',
        createdAt: '2024-06-21T10:30:00Z',
        isSupplement: true
      }
    ],
    screenshots: [
      {
        id: 's1',
        url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=training%20dashboard%20showing%20grayscale%20ratio%2085%20percent%20error%20alert&image_size=square',
        description: '训练监控面板异常截图',
        createdAt: '2024-06-20T14:35:00Z'
      },
      {
        id: 's2',
        url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=configuration%20platform%20UI%20bug%20showing%20wrong%20percentage%20value&image_size=square',
        description: '配置平台bug截图（后补）',
        createdAt: '2024-06-21T10:45:00Z'
      }
    ],
    manualJudgment: {
      id: 'j1',
      content: '本次成本异常由灰度比例配置错误导致，建议回滚配置后重新计算',
      author: '排班审核-李姐',
      createdAt: '2024-06-20T16:00:00Z',
      decision: 'pending'
    }
  },
  {
    id: 'snap-002',
    version: 'v2.4.0',
    modelVersion: 'rec-2024-06-base',
    createdAt: '2024-06-18T09:00:00Z',
    operator: '许工',
    totalCost: 86420.0,
    status: 'normal',
    parameters: [
      {
        id: 'p1',
        name: '客户端数量',
        formula: 'active_devices * 0.85',
        unit: '台',
        value: 11200,
        minBoundary: 5000,
        maxBoundary: 15000,
        source: '设备注册中心',
        description: '参与联邦学习的活跃客户端设备数'
      },
      {
        id: 'p2',
        name: '单轮训练时长',
        formula: 'batch_size * epochs / throughput',
        unit: '小时',
        value: 3.2,
        minBoundary: 1,
        maxBoundary: 8,
        source: '训练监控系统',
        description: '每轮联邦训练的平均耗时'
      },
      {
        id: 'p3',
        name: '灰度比例',
        formula: 'gray_clients / total_clients',
        unit: '%',
        value: 30,
        minBoundary: 10,
        maxBoundary: 50,
        source: '实验配置平台',
        description: '参与灰度实验的客户端占比'
      },
      {
        id: 'p4',
        name: '算力单价',
        formula: 'gpu_hour_cost * utilization_rate',
        unit: '元/小时',
        value: 12.5,
        minBoundary: 8,
        maxBoundary: 20,
        source: '云服务账单',
        description: '客户端设备算力使用单价'
      },
      {
        id: 'p5',
        name: '通信成本',
        formula: 'data_size * bandwidth_cost * transmission_times',
        unit: '元',
        value: 7200,
        minBoundary: 2000,
        maxBoundary: 10000,
        source: '网络流量监控',
        description: '模型参数传输产生的网络通信成本'
      },
      {
        id: 'p6',
        name: '训练轮次',
        formula: 'convergence_threshold / improvement_rate',
        unit: '轮',
        value: 42,
        minBoundary: 20,
        maxBoundary: 100,
        source: '训练日志',
        description: '模型达到收敛所需的训练轮次数'
      }
    ],
    notes: [
      {
        id: 'n1',
        content: 'v2.4.0 版本基线，模型收敛速度较v2.3.0提升8%',
        author: '许工',
        createdAt: '2024-06-18T09:30:00Z',
        isSupplement: false
      }
    ],
    screenshots: [
      {
        id: 's1',
        url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=machine%20learning%20training%20convergence%20graph%20showing%20improvement&image_size=square',
        description: '训练收敛曲线截图',
        createdAt: '2024-06-18T09:15:00Z'
      }
    ],
    manualJudgment: {
      id: 'j1',
      content: 'v2.4.0 版本成本正常，可作为后续版本对比基准',
      author: '排班审核-李姐',
      createdAt: '2024-06-18T14:00:00Z',
      decision: 'approve'
    }
  },
  {
    id: 'snap-003',
    version: 'v2.3.1',
    modelVersion: 'rec-2024-05-patch',
    createdAt: '2024-06-10T11:00:00Z',
    operator: '许工',
    totalCost: 92150.5,
    status: 'warning',
    parameters: [
      {
        id: 'p1',
        name: '客户端数量',
        formula: 'active_devices * 0.85',
        unit: '台',
        value: 10800,
        minBoundary: 5000,
        maxBoundary: 15000,
        source: '设备注册中心',
        description: '参与联邦学习的活跃客户端设备数'
      },
      {
        id: 'p2',
        name: '单轮训练时长',
        formula: 'batch_size * epochs / throughput',
        unit: '小时',
        value: 4.1,
        minBoundary: 1,
        maxBoundary: 8,
        source: '训练监控系统',
        description: '每轮联邦训练的平均耗时'
      },
      {
        id: 'p3',
        name: '灰度比例',
        formula: 'gray_clients / total_clients',
        unit: '%',
        value: 25,
        minBoundary: 10,
        maxBoundary: 50,
        source: '实验配置平台',
        description: '参与灰度实验的客户端占比'
      },
      {
        id: 'p4',
        name: '算力单价',
        formula: 'gpu_hour_cost * utilization_rate',
        unit: '元/小时',
        value: 13.2,
        minBoundary: 8,
        maxBoundary: 20,
        source: '云服务账单',
        description: '客户端设备算力使用单价'
      },
      {
        id: 'p5',
        name: '通信成本',
        formula: 'data_size * bandwidth_cost * transmission_times',
        unit: '元',
        value: 6800,
        minBoundary: 2000,
        maxBoundary: 10000,
        source: '网络流量监控',
        description: '模型参数传输产生的网络通信成本'
      },
      {
        id: 'p6',
        name: '训练轮次',
        formula: 'convergence_threshold / improvement_rate',
        unit: '轮',
        value: 48,
        minBoundary: 20,
        maxBoundary: 100,
        source: '训练日志',
        description: '模型达到收敛所需的训练轮次数'
      }
    ],
    notes: [
      {
        id: 'n1',
        content: '单轮训练时长偏高，已排查为部分客户端网络波动导致',
        author: '许工',
        createdAt: '2024-06-10T11:45:00Z',
        isSupplement: false
      },
      {
        id: 'n2',
        content: '后续补记：已与运维确认网络波动原因是CDN节点故障，不影响成本核算逻辑',
        author: '许工',
        createdAt: '2024-06-12T16:20:00Z',
        isSupplement: true
      }
    ],
    screenshots: [
      {
        id: 's1',
        url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=network%20latency%20spike%20monitoring%20dashboard%20graph&image_size=square',
        description: '网络延迟监控截图',
        createdAt: '2024-06-10T11:30:00Z'
      }
    ],
    manualJudgment: {
      id: 'j1',
      content: '训练时长偏高为偶发网络问题，不影响成本公式合理性，予以放行',
      author: '排班审核-李姐',
      createdAt: '2024-06-11T10:00:00Z',
      decision: 'approve'
    }
  },
  {
    id: 'snap-004',
    version: 'v2.3.0',
    modelVersion: 'rec-2024-05-base',
    createdAt: '2024-06-01T14:00:00Z',
    operator: '许工',
    totalCost: 78560.0,
    status: 'normal',
    parameters: [
      {
        id: 'p1',
        name: '客户端数量',
        formula: 'active_devices * 0.85',
        unit: '台',
        value: 9800,
        minBoundary: 5000,
        maxBoundary: 15000,
        source: '设备注册中心',
        description: '参与联邦学习的活跃客户端设备数'
      },
      {
        id: 'p2',
        name: '单轮训练时长',
        formula: 'batch_size * epochs / throughput',
        unit: '小时',
        value: 3.8,
        minBoundary: 1,
        maxBoundary: 8,
        source: '训练监控系统',
        description: '每轮联邦训练的平均耗时'
      },
      {
        id: 'p3',
        name: '灰度比例',
        formula: 'gray_clients / total_clients',
        unit: '%',
        value: 20,
        minBoundary: 10,
        maxBoundary: 50,
        source: '实验配置平台',
        description: '参与灰度实验的客户端占比'
      },
      {
        id: 'p4',
        name: '算力单价',
        formula: 'gpu_hour_cost * utilization_rate',
        unit: '元/小时',
        value: 12.8,
        minBoundary: 8,
        maxBoundary: 20,
        source: '云服务账单',
        description: '客户端设备算力使用单价'
      },
      {
        id: 'p5',
        name: '通信成本',
        formula: 'data_size * bandwidth_cost * transmission_times',
        unit: '元',
        value: 6200,
        minBoundary: 2000,
        maxBoundary: 10000,
        source: '网络流量监控',
        description: '模型参数传输产生的网络通信成本'
      },
      {
        id: 'p6',
        name: '训练轮次',
        formula: 'convergence_threshold / improvement_rate',
        unit: '轮',
        value: 52,
        minBoundary: 20,
        maxBoundary: 100,
        source: '训练日志',
        description: '模型达到收敛所需的训练轮次数'
      }
    ],
    notes: [
      {
        id: 'n1',
        content: 'v2.3.0 正式版本，修复了v2.2.x系列的内存泄漏问题',
        author: '许工',
        createdAt: '2024-06-01T14:30:00Z',
        isSupplement: false
      }
    ],
    screenshots: [
      {
        id: 's1',
        url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=memory%20usage%20comparison%20graph%20showing%20leak%20fix&image_size=square',
        description: '内存泄漏修复前后对比图',
        createdAt: '2024-06-01T14:15:00Z'
      }
    ],
    manualJudgment: {
      id: 'j1',
      content: 'v2.3.0 版本正常，内存优化效果明显，成本下降合理',
      author: '排班审核-李姐',
      createdAt: '2024-06-02T09:00:00Z',
      decision: 'approve'
    }
  }
];
