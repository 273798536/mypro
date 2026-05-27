import { Project, Owner } from '../types';

export const mockProject: Project = {
  id: 'proj-001',
  name: '智能客服平台 V2.0',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  totalBudget: 5000000,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T10:30:00Z'
};

export const mockOwners: Owner[] = [
  {
    id: 'owner-001',
    name: '张明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangming',
    role: '产品负责人'
  },
  {
    id: 'owner-002',
    name: '李华',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    role: '技术负责人'
  },
  {
    id: 'owner-003',
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    role: '财务负责人'
  },
  {
    id: 'owner-004',
    name: '赵强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoqiang',
    role: '市场负责人'
  },
  {
    id: 'owner-005',
    name: '陈雪',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenxue',
    role: '运营负责人'
  }
];
