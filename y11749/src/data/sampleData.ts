import { MemberContract, SalesAssignment, TransferRecord, RefundRecord, PTPackage, Store, SalesPerson } from '../types';

export const stores: Store[] = [
  { id: 'store-001', name: '朝阳门店' },
  { id: 'store-002', name: '国贸店' },
  { id: 'store-003', name: '中关村店' },
];

export const salesPersons: SalesPerson[] = [
  { id: 'sales-001', name: '张伟', storeId: 'store-001' },
  { id: 'sales-002', name: '李娜', storeId: 'store-001' },
  { id: 'sales-003', name: '王强', storeId: 'store-002' },
  { id: 'sales-004', name: '刘芳', storeId: 'store-003' },
];

export const memberContracts: MemberContract[] = [
  {
    id: 'contract-001',
    memberName: '陈明',
    memberPhone: '13800138001',
    contractDate: '2024-01-15',
    totalAmount: 5800,
    storeId: 'store-001',
    storeName: '朝阳门店',
    source: 'contract',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'contract-002',
    memberName: '林小红',
    memberPhone: '13800138002',
    contractDate: '2024-01-20',
    totalAmount: 12800,
    storeId: 'store-001',
    storeName: '朝阳门店',
    source: 'contract',
    createdAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'contract-003',
    memberName: '赵大伟',
    memberPhone: 'invalid-phone',
    contractDate: '2024-02-10',
    totalAmount: -500,
    storeId: 'store-003',
    storeName: '中关村店',
    source: 'contract',
    createdAt: '2024-02-10T09:00:00Z',
  },
  {
    id: 'contract-004',
    memberName: '孙丽',
    memberPhone: '13800138004',
    contractDate: '2024-01-25',
    totalAmount: 8800,
    storeId: 'store-002',
    storeName: '国贸店',
    source: 'transfer',
    createdAt: '2024-01-25T11:00:00Z',
  },
];

export const salesAssignments: SalesAssignment[] = [
  {
    id: 'assign-001',
    contractId: 'contract-001',
    salesId: 'sales-001',
    salesName: '张伟',
    storeId: 'store-001',
    effectiveDate: '2024-01-15',
    version: 1,
    isActive: true,
    createdBy: '系统',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'assign-002',
    contractId: 'contract-002',
    salesId: 'sales-001',
    salesName: '张伟',
    storeId: 'store-001',
    effectiveDate: '2024-01-20',
    version: 1,
    isActive: false,
    changeReason: '销售离职',
    createdBy: '主管',
    createdAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'assign-003',
    contractId: 'contract-002',
    salesId: 'sales-002',
    salesName: '李娜',
    storeId: 'store-001',
    effectiveDate: '2024-02-01',
    version: 2,
    isActive: true,
    changeReason: '张伟离职，转交李娜',
    createdBy: '主管',
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'assign-004',
    contractId: 'contract-003',
    salesId: 'sales-004',
    salesName: '刘芳',
    storeId: 'store-003',
    effectiveDate: '2024-02-10',
    version: 1,
    isActive: true,
    createdBy: '系统',
    createdAt: '2024-02-10T09:00:00Z',
  },
  {
    id: 'assign-005',
    contractId: 'contract-004',
    salesId: 'sales-003',
    salesName: '王强',
    storeId: 'store-002',
    effectiveDate: '2024-01-25',
    version: 1,
    isActive: true,
    createdBy: '系统',
    createdAt: '2024-01-25T11:00:00Z',
  },
];

export const transferRecords: TransferRecord[] = [
  {
    id: 'transfer-001',
    contractId: 'contract-004',
    fromStoreId: 'store-001',
    fromStoreName: '朝阳门店',
    toStoreId: 'store-002',
    toStoreName: '国贸店',
    transferDate: '2024-01-25',
    transferFee: 500,
    createdBy: '主管',
    createdAt: '2024-01-25T11:00:00Z',
  },
];

export const refundRecords: RefundRecord[] = [
  {
    id: 'refund-001',
    contractId: 'contract-002',
    refundAmount: 2000,
    refundDate: '2024-03-15',
    refundMonth: '2024-03',
    reason: '会员搬迁',
    isRolledBack: false,
    createdBy: '前台',
    createdAt: '2024-03-15T16:00:00Z',
  },
];

export const ptPackages: PTPackage[] = [
  {
    id: 'pt-001',
    contractId: 'contract-002',
    packageName: '高级私教30课时',
    totalSessions: 30,
    usedSessions: 10,
    totalAmount: 9000,
    assignedSales: ['sales-002', 'sales-003'],
    splitRatio: { 'sales-002': 0.6, 'sales-003': 0.4 },
    isSplit: true,
    createdBy: '私教主管',
    createdAt: '2024-02-05T10:00:00Z',
  },
];
