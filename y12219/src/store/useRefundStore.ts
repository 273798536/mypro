import { create } from 'zustand'
import type { RefundRecord, FilterState, ProgressChangeRecord } from '@/types'

const mockRecords: RefundRecord[] = [
  {
    id: 'RF-001',
    studentName: '张三',
    courseName: '高等数学',
    order: { id: 'ORD-001', studentName: '张三', courseName: '高等数学', orderAmount: 12000, paidAmount: 12000, payMethod: '微信支付', orderDate: '2025-09-15', courseId: 'C-001' },
    coupon: { id: 'CPN-001', orderId: 'ORD-001', couponName: '秋季满减券', couponAmount: 500, usageCondition: '满10000减500', recoveryStatus: '待追回', recoveryAmount: 500 },
    progress: { id: 'PRG-001', orderId: 'ORD-001', totalHours: 60, consumedHours: 20, remainingHours: 40, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-001', orderId: 'ORD-001', totalRefund: 8000, courseFeeRefund: 8000, materialDeduction: 0, discountRecovery: 500, progressAdjustment: 0, actualRefund: 7500 },
    explanations: [
      { id: 'EX-001-1', refundId: 'RF-001', type: '优惠追回', title: '秋季满减券追回', description: '退课后已使用优惠券需追回', amount: 500, calculationBasis: '优惠券面额全额追回' }
    ],
    changeHistory: [],
    status: '待处理',
    createDate: '2025-11-20'
  },
  {
    id: 'RF-002',
    studentName: '李四',
    courseName: '英语写作',
    order: { id: 'ORD-002', studentName: '李四', courseName: '英语写作', orderAmount: 8000, paidAmount: 8000, payMethod: '支付宝', orderDate: '2025-08-10', courseId: 'C-002' },
    coupon: { id: 'CPN-002', orderId: 'ORD-002', couponName: '新用户专享券', couponAmount: 300, usageCondition: '无门槛', recoveryStatus: '已追回', recoveryAmount: 300 },
    progress: { id: 'PRG-002', orderId: 'ORD-002', totalHours: 40, consumedHours: 25, remainingHours: 15, isManuallyModified: true, lastModifiedDate: '2025-10-05' },
    breakdown: { id: 'BD-002', orderId: 'ORD-002', totalRefund: 3000, courseFeeRefund: 3000, materialDeduction: 200, discountRecovery: 300, progressAdjustment: -800, actualRefund: 2300 },
    explanations: [
      { id: 'EX-002-1', refundId: 'RF-002', type: '进度补录', title: '课时进度人工补录', description: '人工将已消耗课时从15调整为25', amount: -800, calculationBasis: '(25-15)/40 × 8000 = 2000，差额调整-800' },
      { id: 'EX-002-2', refundId: 'RF-002', type: '优惠追回', title: '新用户专享券追回', description: '退课后需追回已使用优惠券', amount: 300, calculationBasis: '优惠券面额全额追回' },
      { id: 'EX-002-3', refundId: 'RF-002', type: '资料已发', title: '课程资料扣费', description: '已发放教材及讲义', amount: 200, calculationBasis: '教材费150+讲义费50' }
    ],
    changeHistory: [
      { id: 'CH-001', progressId: 'PRG-002', changeDate: '2025-10-05', previousConsumedHours: 15, newConsumedHours: 25, changeReason: '补录漏登记的10课时', refundImpactAmount: -800, discountRollbackBefore: 300, discountRollbackAfter: 600 }
    ],
    status: '已计算',
    createDate: '2025-11-18'
  },
  {
    id: 'RF-003',
    studentName: '王五',
    courseName: 'Python编程',
    order: { id: 'ORD-003', studentName: '王五', courseName: 'Python编程', orderAmount: 9800, paidAmount: 9800, payMethod: '银行卡', orderDate: '2025-07-22', courseId: 'C-003' },
    coupon: { id: 'CPN-003', orderId: 'ORD-003', couponName: '暑期特惠券', couponAmount: 800, usageCondition: '满8000减800', recoveryStatus: '无需追回', recoveryAmount: 0 },
    progress: { id: 'PRG-003', orderId: 'ORD-003', totalHours: 48, consumedHours: 10, remainingHours: 38, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-003', orderId: 'ORD-003', totalRefund: 7758, courseFeeRefund: 7758, materialDeduction: 350, discountRecovery: 0, progressAdjustment: 0, actualRefund: 7408 },
    explanations: [
      { id: 'EX-003-1', refundId: 'RF-003', type: '资料已发', title: '编程教材扣费', description: '已发放Python编程教材', amount: 350, calculationBasis: '教材费350' }
    ],
    changeHistory: [],
    status: '已导出',
    createDate: '2025-10-30'
  },
  {
    id: 'RF-004',
    studentName: '赵六',
    courseName: '物理实验',
    order: { id: 'ORD-004', studentName: '赵六', courseName: '物理实验', orderAmount: 15000, paidAmount: 15000, payMethod: '微信支付', orderDate: '2025-06-01', courseId: 'C-004' },
    coupon: { id: 'CPN-004', orderId: 'ORD-004', couponName: 'VIP学员折扣券', couponAmount: 1000, usageCondition: 'VIP学员专享', recoveryStatus: '待追回', recoveryAmount: 1000 },
    progress: { id: 'PRG-004', orderId: 'ORD-004', totalHours: 80, consumedHours: 35, remainingHours: 45, isManuallyModified: true, lastModifiedDate: '2025-09-12' },
    breakdown: { id: 'BD-004', orderId: 'ORD-004', totalRefund: 8438, courseFeeRefund: 8438, materialDeduction: 500, discountRecovery: 1000, progressAdjustment: -1200, actualRefund: 6738 },
    explanations: [
      { id: 'EX-004-1', refundId: 'RF-004', type: '进度补录', title: '实验课时补录', description: '补录3次实验课共6课时', amount: -1200, calculationBasis: '6/80 × 15000 = 1125，含实验材料费差额-1200' },
      { id: 'EX-004-2', refundId: 'RF-004', type: '优惠追回', title: 'VIP折扣券追回', description: '退课后VIP折扣需追回', amount: 1000, calculationBasis: '折扣券面额全额追回' },
      { id: 'EX-004-3', refundId: 'RF-004', type: '资料已发', title: '实验器材扣费', description: '已发放实验器材套装', amount: 500, calculationBasis: '器材费500' }
    ],
    changeHistory: [
      { id: 'CH-002', progressId: 'PRG-004', changeDate: '2025-09-12', previousConsumedHours: 29, newConsumedHours: 35, changeReason: '补录9月3次实验课', refundImpactAmount: -1200, discountRollbackBefore: 1000, discountRollbackAfter: 1500 }
    ],
    status: '待处理',
    createDate: '2025-12-01'
  },
  {
    id: 'RF-005',
    studentName: '孙七',
    courseName: '油画入门',
    order: { id: 'ORD-005', studentName: '孙七', courseName: '油画入门', orderAmount: 6800, paidAmount: 6800, payMethod: '支付宝', orderDate: '2025-10-01', courseId: 'C-005' },
    coupon: { id: 'CPN-005', orderId: 'ORD-005', couponName: '艺术类满减券', couponAmount: 400, usageCondition: '满5000减400', recoveryStatus: '已追回', recoveryAmount: 400 },
    progress: { id: 'PRG-005', orderId: 'ORD-005', totalHours: 30, consumedHours: 8, remainingHours: 22, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-005', orderId: 'ORD-005', totalRefund: 4987, courseFeeRefund: 4987, materialDeduction: 600, discountRecovery: 400, progressAdjustment: 0, actualRefund: 4787 },
    explanations: [
      { id: 'EX-005-1', refundId: 'RF-005', type: '优惠追回', title: '艺术类满减券追回', description: '退课后满减券需追回', amount: 400, calculationBasis: '优惠券面额全额追回' },
      { id: 'EX-005-2', refundId: 'RF-005', type: '资料已发', title: '画具材料扣费', description: '已发放油画颜料和画布', amount: 600, calculationBasis: '颜料300+画布300' }
    ],
    changeHistory: [],
    status: '已计算',
    createDate: '2025-12-05'
  },
  {
    id: 'RF-006',
    studentName: '周八',
    courseName: '高等数学',
    order: { id: 'ORD-006', studentName: '周八', courseName: '高等数学', orderAmount: 12000, paidAmount: 12000, payMethod: '银行卡', orderDate: '2025-05-20', courseId: 'C-001' },
    coupon: { id: 'CPN-006', orderId: 'ORD-006', couponName: '老学员回馈券', couponAmount: 600, usageCondition: '老学员专享', recoveryStatus: '无需追回', recoveryAmount: 0 },
    progress: { id: 'PRG-006', orderId: 'ORD-006', totalHours: 60, consumedHours: 45, remainingHours: 15, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-006', orderId: 'ORD-006', totalRefund: 3000, courseFeeRefund: 3000, materialDeduction: 0, discountRecovery: 0, progressAdjustment: 0, actualRefund: 3000 },
    explanations: [],
    changeHistory: [],
    status: '已导出',
    createDate: '2025-09-28'
  },
  {
    id: 'RF-007',
    studentName: '吴九',
    courseName: '日语N2',
    order: { id: 'ORD-007', studentName: '吴九', courseName: '日语N2', orderAmount: 11000, paidAmount: 11000, payMethod: '微信支付', orderDate: '2025-04-15', courseId: 'C-006' },
    coupon: { id: 'CPN-007', orderId: 'ORD-007', couponName: '语言类优惠券', couponAmount: 700, usageCondition: '满10000减700', recoveryStatus: '待追回', recoveryAmount: 700 },
    progress: { id: 'PRG-007', orderId: 'ORD-007', totalHours: 55, consumedHours: 30, remainingHours: 25, isManuallyModified: true, lastModifiedDate: '2025-07-20' },
    breakdown: { id: 'BD-007', orderId: 'ORD-007', totalRefund: 5000, courseFeeRefund: 5000, materialDeduction: 300, discountRecovery: 700, progressAdjustment: -600, actualRefund: 4400 },
    explanations: [
      { id: 'EX-007-1', refundId: 'RF-007', type: '进度补录', title: '听力课时补录', description: '补录4课时听力训练', amount: -600, calculationBasis: '4/55 × 11000 ≈ 800，扣除已算部分后-600' },
      { id: 'EX-007-2', refundId: 'RF-007', type: '优惠追回', title: '语言类优惠券追回', description: '退课后需追回优惠', amount: 700, calculationBasis: '优惠券面额全额追回' },
      { id: 'EX-007-3', refundId: 'RF-007', type: '资料已发', title: '日语教材扣费', description: '已发放N2教材及练习册', amount: 300, calculationBasis: '教材200+练习册100' }
    ],
    changeHistory: [
      { id: 'CH-003', progressId: 'PRG-007', changeDate: '2025-07-20', previousConsumedHours: 26, newConsumedHours: 30, changeReason: '补录4课时听力课', refundImpactAmount: -600, discountRollbackBefore: 700, discountRollbackAfter: 900 }
    ],
    status: '待处理',
    createDate: '2025-11-10'
  },
  {
    id: 'RF-008',
    studentName: '郑十',
    courseName: 'Web前端开发',
    order: { id: 'ORD-008', studentName: '郑十', courseName: 'Web前端开发', orderAmount: 13500, paidAmount: 13500, payMethod: '支付宝', orderDate: '2025-03-10', courseId: 'C-007' },
    coupon: { id: 'CPN-008', orderId: 'ORD-008', couponName: 'IT课程直减券', couponAmount: 900, usageCondition: '满10000减900', recoveryStatus: '已追回', recoveryAmount: 900 },
    progress: { id: 'PRG-008', orderId: 'ORD-008', totalHours: 70, consumedHours: 50, remainingHours: 20, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-008', orderId: 'ORD-008', totalRefund: 3857, courseFeeRefund: 3857, materialDeduction: 450, discountRecovery: 900, progressAdjustment: 0, actualRefund: 3407 },
    explanations: [
      { id: 'EX-008-1', refundId: 'RF-008', type: '优惠追回', title: 'IT课程直减券追回', description: '退课后直减券需追回', amount: 900, calculationBasis: '优惠券面额全额追回' },
      { id: 'EX-008-2', refundId: 'RF-008', type: '资料已发', title: '前端开发教材扣费', description: '已发放前端开发教材及工具包', amount: 450, calculationBasis: '教材250+工具包200' }
    ],
    changeHistory: [],
    status: '已计算',
    createDate: '2025-10-15'
  },
  {
    id: 'RF-009',
    studentName: '张三',
    courseName: 'Python编程',
    order: { id: 'ORD-009', studentName: '张三', courseName: 'Python编程', orderAmount: 9800, paidAmount: 9800, payMethod: '微信支付', orderDate: '2025-11-01', courseId: 'C-003' },
    coupon: { id: 'CPN-009', orderId: 'ORD-009', couponName: '双十一特惠券', couponAmount: 1200, usageCondition: '满8000减1200', recoveryStatus: '待追回', recoveryAmount: 1200 },
    progress: { id: 'PRG-009', orderId: 'ORD-009', totalHours: 48, consumedHours: 5, remainingHours: 43, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-009', orderId: 'ORD-009', totalRefund: 8779, courseFeeRefund: 8779, materialDeduction: 0, discountRecovery: 1200, progressAdjustment: 0, actualRefund: 7579 },
    explanations: [
      { id: 'EX-009-1', refundId: 'RF-009', type: '优惠追回', title: '双十一特惠券追回', description: '退课后特惠券需追回', amount: 1200, calculationBasis: '优惠券面额全额追回' }
    ],
    changeHistory: [],
    status: '待处理',
    createDate: '2025-12-10'
  },
  {
    id: 'RF-010',
    studentName: '陈十一',
    courseName: '英语写作',
    order: { id: 'ORD-010', studentName: '陈十一', courseName: '英语写作', orderAmount: 8000, paidAmount: 8000, payMethod: '银行卡', orderDate: '2025-09-05', courseId: 'C-002' },
    coupon: { id: 'CPN-010', orderId: 'ORD-010', couponName: '开学季优惠券', couponAmount: 350, usageCondition: '满5000减350', recoveryStatus: '无需追回', recoveryAmount: 0 },
    progress: { id: 'PRG-010', orderId: 'ORD-010', totalHours: 40, consumedHours: 18, remainingHours: 22, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-010', orderId: 'ORD-010', totalRefund: 4400, courseFeeRefund: 4400, materialDeduction: 150, discountRecovery: 0, progressAdjustment: 0, actualRefund: 4250 },
    explanations: [
      { id: 'EX-010-1', refundId: 'RF-010', type: '资料已发', title: '写作教材扣费', description: '已发放写作技巧手册', amount: 150, calculationBasis: '手册费150' }
    ],
    changeHistory: [],
    status: '已导出',
    createDate: '2025-11-25'
  },
  {
    id: 'RF-011',
    studentName: '林十二',
    courseName: '数据结构',
    order: { id: 'ORD-011', studentName: '林十二', courseName: '数据结构', orderAmount: 10500, paidAmount: 10500, payMethod: '支付宝', orderDate: '2025-01-18', courseId: 'C-008' },
    coupon: { id: 'CPN-011', orderId: 'ORD-011', couponName: '计算机类满减券', couponAmount: 650, usageCondition: '满8000减650', recoveryStatus: '已追回', recoveryAmount: 650 },
    progress: { id: 'PRG-011', orderId: 'ORD-011', totalHours: 50, consumedHours: 38, remainingHours: 12, isManuallyModified: true, lastModifiedDate: '2025-04-10' },
    breakdown: { id: 'BD-011', orderId: 'ORD-011', totalRefund: 2520, courseFeeRefund: 2520, materialDeduction: 280, discountRecovery: 650, progressAdjustment: -500, actualRefund: 2390 },
    explanations: [
      { id: 'EX-011-1', refundId: 'RF-011', type: '进度补录', title: '上机课时补录', description: '补录4课时上机实践', amount: -500, calculationBasis: '4/50 × 10500 = 840，扣除已算部分后-500' },
      { id: 'EX-011-2', refundId: 'RF-011', type: '优惠追回', title: '计算机类满减券追回', description: '退课后需追回优惠', amount: 650, calculationBasis: '优惠券面额全额追回' },
      { id: 'EX-011-3', refundId: 'RF-011', type: '资料已发', title: '上机教材扣费', description: '已发放数据结构教材', amount: 280, calculationBasis: '教材280' }
    ],
    changeHistory: [
      { id: 'CH-004', progressId: 'PRG-011', changeDate: '2025-04-10', previousConsumedHours: 34, newConsumedHours: 38, changeReason: '补录4课时上机实践', refundImpactAmount: -500, discountRollbackBefore: 650, discountRollbackAfter: 850 }
    ],
    status: '已计算',
    createDate: '2025-08-22'
  },
  {
    id: 'RF-012',
    studentName: '黄十三',
    courseName: '钢琴基础',
    order: { id: 'ORD-012', studentName: '黄十三', courseName: '钢琴基础', orderAmount: 16000, paidAmount: 16000, payMethod: '微信支付', orderDate: '2025-02-14', courseId: 'C-009' },
    coupon: { id: 'CPN-012', orderId: 'ORD-012', couponName: '音乐类折扣券', couponAmount: 1200, usageCondition: '满12000减1200', recoveryStatus: '待追回', recoveryAmount: 1200 },
    progress: { id: 'PRG-012', orderId: 'ORD-012', totalHours: 80, consumedHours: 55, remainingHours: 25, isManuallyModified: false, lastModifiedDate: null },
    breakdown: { id: 'BD-012', orderId: 'ORD-012', totalRefund: 5000, courseFeeRefund: 5000, materialDeduction: 800, discountRecovery: 1200, progressAdjustment: 0, actualRefund: 4200 },
    explanations: [
      { id: 'EX-012-1', refundId: 'RF-012', type: '优惠追回', title: '音乐类折扣券追回', description: '退课后需追回优惠', amount: 1200, calculationBasis: '折扣券面额全额追回' },
      { id: 'EX-012-2', refundId: 'RF-012', type: '资料已发', title: '钢琴教材扣费', description: '已发放钢琴教材及乐谱', amount: 800, calculationBasis: '教材500+乐谱300' }
    ],
    changeHistory: [],
    status: '待处理',
    createDate: '2025-12-15'
  }
]

interface RefundStore {
  records: RefundRecord[]
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  resetFilters: () => void
  getFilteredRecords: () => RefundRecord[]
  getRecordById: (id: string) => RefundRecord | undefined
  updateCourseProgress: (recordId: string, newConsumedHours: number, changeReason: string) => void
}

const defaultFilters: FilterState = {
  studentName: '',
  courseName: '',
  dateRange: ['', ''],
  status: '全部',
}

export const useRefundStore = create<RefundStore>((set, get) => ({
  records: mockRecords,
  filters: { ...defaultFilters },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  getFilteredRecords: () => {
    const { records, filters } = get()
    return records.filter((r) => {
      if (filters.studentName && !r.studentName.includes(filters.studentName)) return false
      if (filters.courseName && !r.courseName.includes(filters.courseName)) return false
      if (filters.status !== '全部' && r.status !== filters.status) return false
      if (filters.dateRange[0] && r.createDate < filters.dateRange[0]) return false
      if (filters.dateRange[1] && r.createDate > filters.dateRange[1]) return false
      return true
    })
  },

  getRecordById: (id: string) => {
    return get().records.find((r) => r.id === id)
  },

  updateCourseProgress: (recordId: string, newConsumedHours: number, changeReason: string) => {
    set((state) => ({
      records: state.records.map((record) => {
        if (record.id !== recordId) return record

        const previousConsumedHours = record.progress.consumedHours
        const totalHours = record.progress.totalHours
        const remainingHours = totalHours - newConsumedHours
        const hourlyRate = record.order.orderAmount / totalHours

        const hoursDiff = newConsumedHours - previousConsumedHours
        const progressAdjustment = hoursDiff * hourlyRate

        const newCourseFeeRefund = (totalHours - newConsumedHours) * hourlyRate

        const consumedRatio = newConsumedHours / totalHours
        const newDiscountRecovery = record.coupon.couponAmount * consumedRatio

        const newActualRefund =
          newCourseFeeRefund -
          record.breakdown.materialDeduction -
          newDiscountRecovery +
          progressAdjustment

        const changeRecord: ProgressChangeRecord = {
          id: `CH${Date.now()}`,
          progressId: record.progress.id,
          changeDate: new Date().toISOString().split('T')[0],
          previousConsumedHours,
          newConsumedHours,
          changeReason,
          refundImpactAmount: newActualRefund - record.breakdown.actualRefund,
          discountRollbackBefore: record.breakdown.discountRecovery,
          discountRollbackAfter: newDiscountRecovery,
        }

        return {
          ...record,
          progress: {
            ...record.progress,
            consumedHours: newConsumedHours,
            remainingHours,
            isManuallyModified: true,
            lastModifiedDate: changeRecord.changeDate,
          },
          breakdown: {
            ...record.breakdown,
            courseFeeRefund: newCourseFeeRefund,
            discountRecovery: newDiscountRecovery,
            progressAdjustment,
            actualRefund: newActualRefund,
          },
          changeHistory: [...record.changeHistory, changeRecord],
        }
      }),
    }))
  },
}))
