import type { BoundaryScenario } from '../types';

export const boundaryScenarios: BoundaryScenario[] = [
  {
    id: 'conflict-001',
    name: '岗位冲突场景',
    description: '同一志愿者在同一时段被分配到两个不同的岗位',
    category: 'conflict',
    setupData: {
      volunteers: [
        {
          id: 'vol-conflict-01',
          name: '张测试',
          phone: '13800000001',
          skills: ['检票', '引导'],
          availableSlots: ['18:00-20:00'],
          isOnLeave: false
        }
      ],
      positions: [
        {
          id: 'pos-conflict-01',
          name: '主入口检票',
          requiredSkills: ['检票', '引导'],
          requiredTraining: [],
          timeSlot: '18:00-20:00',
          capacity: 4
        },
        {
          id: 'pos-conflict-02',
          name: '侧入口引导',
          requiredSkills: ['引导'],
          requiredTraining: [],
          timeSlot: '18:00-20:00',
          capacity: 3
        }
      ],
      trainingRecords: []
    },
    expectedIssues: ['conflict'],
    expectedSampleType: 'bad'
  },
  
  {
    id: 'training-001',
    name: '培训缺失场景',
    description: '志愿者缺少岗位要求的必要培训资质',
    category: 'missing_training',
    setupData: {
      volunteers: [
        {
          id: 'vol-training-01',
          name: '李测试',
          phone: '13800000002',
          skills: ['安检', '应急'],
          availableSlots: ['18:00-20:00'],
          isOnLeave: false
        }
      ],
      positions: [
        {
          id: 'pos-training-01',
          name: '侧入口安检',
          requiredSkills: ['安检', '应急'],
          requiredTraining: ['安检规范', '应急处理'],
          timeSlot: '18:00-20:00',
          capacity: 3
        }
      ],
      trainingRecords: [
        {
          volunteerId: 'vol-training-01',
          trainingName: '安检规范',
          completedAt: '2026-05-20',
          status: 'passed'
        }
      ]
    },
    expectedIssues: ['missing_training'],
    expectedSampleType: 'bad'
  },
  
  {
    id: 'leave-001',
    name: '临时请假场景',
    description: '志愿者在排班时段临时请假',
    category: 'leave',
    setupData: {
      volunteers: [
        {
          id: 'vol-leave-01',
          name: '王测试',
          phone: '13800000003',
          skills: ['引导'],
          availableSlots: ['19:00-21:00'],
          isOnLeave: true,
          leaveReason: '突发身体不适',
          leaveSlots: ['19:00-21:00']
        }
      ],
      positions: [
        {
          id: 'pos-leave-01',
          name: '观众厅引导',
          requiredSkills: ['引导'],
          requiredTraining: [],
          timeSlot: '19:00-21:00',
          capacity: 6
        }
      ],
      trainingRecords: []
    },
    expectedIssues: ['leave'],
    expectedSampleType: 'bad'
  },
  
  {
    id: 'capacity-001',
    name: '岗位容量超限场景',
    description: '岗位分配人数超过容量上限',
    category: 'capacity',
    setupData: {
      volunteers: [
        {
          id: 'vol-cap-01',
          name: '赵测试1',
          phone: '13800000011',
          skills: ['票务', '后台'],
          availableSlots: ['18:00-20:00'],
          isOnLeave: false
        },
        {
          id: 'vol-cap-02',
          name: '赵测试2',
          phone: '13800000012',
          skills: ['票务', '后台'],
          availableSlots: ['18:00-20:00'],
          isOnLeave: false
        },
        {
          id: 'vol-cap-03',
          name: '赵测试3',
          phone: '13800000013',
          skills: ['票务', '后台'],
          availableSlots: ['18:00-20:00'],
          isOnLeave: false
        }
      ],
      positions: [
        {
          id: 'pos-cap-01',
          name: '票务服务台',
          requiredSkills: ['票务', '后台'],
          requiredTraining: [],
          timeSlot: '18:00-20:00',
          capacity: 2
        }
      ],
      trainingRecords: []
    },
    expectedIssues: ['capacity'],
    expectedSampleType: 'boundary'
  },
  
  {
    id: 'mixed-001',
    name: '混合边界场景',
    description: '同时存在培训缺失和容量超限等多种问题',
    category: 'mixed',
    setupData: {
      volunteers: [
        {
          id: 'vol-mix-01',
          name: '孙测试',
          phone: '13800000021',
          skills: ['后台', '应急'],
          availableSlots: ['19:00-21:00'],
          isOnLeave: false
        },
        {
          id: 'vol-mix-02',
          name: '周测试',
          phone: '13800000022',
          skills: ['后台', '应急'],
          availableSlots: ['19:00-21:00'],
          isOnLeave: true,
          leaveReason: '家中有急事',
          leaveSlots: ['19:00-21:00']
        },
        {
          id: 'vol-mix-03',
          name: '吴测试',
          phone: '13800000023',
          skills: ['后台', '应急'],
          availableSlots: ['19:00-21:00'],
          isOnLeave: false
        },
        {
          id: 'vol-mix-04',
          name: '郑测试',
          phone: '13800000024',
          skills: ['后台', '应急'],
          availableSlots: ['19:00-21:00'],
          isOnLeave: false
        }
      ],
      positions: [
        {
          id: 'pos-mix-01',
          name: '后台协助',
          requiredSkills: ['后台', '应急'],
          requiredTraining: ['消防培训', '应急处理'],
          timeSlot: '19:00-21:00',
          capacity: 2
        }
      ],
      trainingRecords: [
        {
          volunteerId: 'vol-mix-01',
          trainingName: '消防培训',
          completedAt: '2026-05-20',
          status: 'passed'
        },
        {
          volunteerId: 'vol-mix-03',
          trainingName: '消防培训',
          completedAt: '2026-05-20',
          status: 'passed'
        },
        {
          volunteerId: 'vol-mix-03',
          trainingName: '应急处理',
          completedAt: '2026-05-22',
          status: 'passed'
        },
        {
          volunteerId: 'vol-mix-04',
          trainingName: '消防培训',
          completedAt: '2026-05-20',
          status: 'passed'
        },
        {
          volunteerId: 'vol-mix-04',
          trainingName: '应急处理',
          completedAt: '2026-05-22',
          status: 'passed'
        }
      ]
    },
    expectedIssues: ['missing_training', 'leave', 'capacity'],
    expectedSampleType: 'bad'
  },
  
  {
    id: 'training-expiry-001',
    name: '培训即将过期场景',
    description: '志愿者的培训资质即将在30天内过期',
    category: 'missing_training',
    setupData: {
      volunteers: [
        {
          id: 'vol-expiry-01',
          name: '冯测试',
          phone: '13800000031',
          skills: ['引导', '应急'],
          availableSlots: ['20:00-22:00'],
          isOnLeave: false
        }
      ],
      positions: [
        {
          id: 'pos-expiry-01',
          name: '散场引导',
          requiredSkills: ['引导', '应急'],
          requiredTraining: ['应急处理', '服务礼仪'],
          timeSlot: '20:00-22:00',
          capacity: 5
        }
      ],
      trainingRecords: [
        {
          volunteerId: 'vol-expiry-01',
          trainingName: '应急处理',
          completedAt: '2025-12-01',
          status: 'passed',
          expiresAt: '2026-06-15'
        },
        {
          volunteerId: 'vol-expiry-01',
          trainingName: '服务礼仪',
          completedAt: '2026-01-15',
          status: 'passed',
          expiresAt: '2026-12-31'
        }
      ]
    },
    expectedIssues: ['training_expiring'],
    expectedSampleType: 'boundary'
  }
];

export function getBoundaryScenarioById(id: string): BoundaryScenario | undefined {
  return boundaryScenarios.find(s => s.id === id);
}

export function getBoundaryScenariosByCategory(
  category: BoundaryScenario['category']
): BoundaryScenario[] {
  return boundaryScenarios.filter(s => s.category === category);
}
