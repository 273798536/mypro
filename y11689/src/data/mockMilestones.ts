import { Milestone } from '../types';

export const mockMilestones: Milestone[] = [
  {
    id: 'ms-001',
    projectId: 'proj-001',
    name: '需求分析完成',
    plannedDate: '2024-01-31',
    actualDate: '2024-02-05',
    status: 'delayed',
    owner: 'owner-001',
    description: '完成产品需求文档和技术方案设计',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-002',
    projectId: 'proj-001',
    name: 'UI设计完成',
    plannedDate: '2024-02-29',
    actualDate: '2024-02-25',
    status: 'completed',
    owner: 'owner-001',
    description: '完成所有页面UI设计和交互原型',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-003',
    projectId: 'proj-001',
    name: '核心功能开发',
    plannedDate: '2024-04-30',
    actualDate: '2024-05-10',
    status: 'delayed',
    owner: 'owner-002',
    description: '完成核心业务功能的前后端开发',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-004',
    projectId: 'proj-001',
    name: '内部测试完成',
    plannedDate: '2024-05-31',
    status: 'pending',
    owner: 'owner-002',
    description: '完成内部QA测试和Bug修复',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-005',
    projectId: 'proj-001',
    name: '公测版本发布',
    plannedDate: '2024-06-30',
    status: 'at_risk',
    owner: 'owner-001',
    description: '发布公测版本，收集用户反馈',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-006',
    projectId: 'proj-001',
    name: '正式版本发布',
    plannedDate: '2024-08-31',
    status: 'pending',
    owner: 'owner-001',
    description: '正式版本上线，全面推广',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-007',
    projectId: 'proj-001',
    name: '付费用户达到1000',
    plannedDate: '2024-10-31',
    status: 'pending',
    owner: 'owner-004',
    description: '实现付费用户突破1000人的目标',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ms-008',
    projectId: 'proj-001',
    name: '年度目标达成',
    plannedDate: '2024-12-31',
    status: 'pending',
    owner: 'owner-001',
    description: '完成年度营收和用户增长目标',
    createdAt: '2024-01-01T00:00:00Z'
  }
];
