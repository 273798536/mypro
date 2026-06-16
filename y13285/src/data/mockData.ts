import type { ApprovalLedger } from '@/types';
import { generateId } from '@/utils/storage';

export const mockLedgers: ApprovalLedger[] = [
  {
    id: generateId(),
    projectName: '城东菜场升级改造',
    street: '城东路88号',
    pointLocation: '菜场南侧临时卸货区',
    applicant: '城东菜场管委会',
    approvalDate: '2026-06-10',
    schemeVersion: 'V1.0',
    status: 'pending',
    remarks: '早高峰6-8点卸货，避开人流',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    projectName: '城西便民点环境整治',
    street: '城西大道156号',
    pointLocation: '便民点西北侧卸货位',
    applicant: '城西街道办事处',
    approvalDate: '2026-06-12',
    schemeVersion: 'V1.0',
    status: 'pending',
    remarks: '需配备临时垃圾桶',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    projectName: '城南批发市场扩容',
    street: '城南工业园区23号',
    pointLocation: '批发市场东门卸货区',
    applicant: '城南批发市场有限公司',
    approvalDate: '2026-06-08',
    schemeVersion: 'V2.0',
    status: 'pending',
    remarks: 'V2方案新增夜间卸货许可',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    projectName: '城南批发市场扩容',
    street: '城南工业园区23号',
    pointLocation: '批发市场东门卸货区',
    applicant: '城南批发市场有限公司',
    approvalDate: '2026-06-15',
    schemeVersion: 'V1.0',
    status: 'pending',
    remarks: 'V1方案仅允许白天卸货',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    projectName: '城北老街口菜场治理',
    street: '城北老街口37号',
    pointLocation: '老街口北侧人行道',
    applicant: '城北菜场经营户联盟',
    approvalDate: '2026-06-05',
    schemeVersion: 'V1.0',
    status: 'pending',
    complaintContent: '附近居民投诉卸货噪音太大，凌晨4点开始扰民',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    projectName: '城北老街口菜场治理',
    street: '城北老街口37号',
    pointLocation: '老街口北侧人行道',
    applicant: '城北菜场经营户联盟',
    approvalDate: '2026-06-07',
    schemeVersion: 'V1.0',
    status: 'pending',
    complaintContent: '居民投诉卸货车辆占用消防通道，存在安全隐患',
    createdAt: new Date().toISOString(),
  },
];

export const statusLabelMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-gray-100 text-gray-700' },
  merged: { label: '已归并', color: 'bg-green-100 text-green-700' },
  pending_confirm: { label: '待确认', color: 'bg-orange-100 text-orange-700' },
  withdrawn: { label: '已撤回', color: 'bg-red-100 text-red-700' },
};

export const actionLabelMap: Record<string, string> = {
  merge: '归并',
  withdraw: '撤回',
  confirm: '确认',
  skip: '跳过',
};

export const exceptionTypeLabelMap: Record<string, string> = {
  old_override_new: '旧方案覆盖新意见',
  same_street_complaints: '同街口双投诉',
};
