export interface StudentOrder {
  id: string;
  studentName: string;
  courseName: string;
  orderAmount: number;
  paidAmount: number;
  payMethod: string;
  orderDate: string;
  courseId: string;
}

export interface Coupon {
  id: string;
  orderId: string;
  couponName: string;
  couponAmount: number;
  usageCondition: string;
  recoveryStatus: '待追回' | '已追回' | '无需追回';
  recoveryAmount: number;
}

export interface CourseProgress {
  id: string;
  orderId: string;
  totalHours: number;
  consumedHours: number;
  remainingHours: number;
  isManuallyModified: boolean;
  lastModifiedDate: string | null;
}

export interface ProgressChangeRecord {
  id: string;
  progressId: string;
  changeDate: string;
  previousConsumedHours: number;
  newConsumedHours: number;
  changeReason: string;
  refundImpactAmount: number;
  discountRollbackBefore: number;
  discountRollbackAfter: number;
}

export interface RefundBreakdown {
  id: string;
  orderId: string;
  totalRefund: number;
  courseFeeRefund: number;
  materialDeduction: number;
  discountRecovery: number;
  progressAdjustment: number;
  actualRefund: number;
}

export interface RefundExplanation {
  id: string;
  refundId: string;
  type: '进度补录' | '优惠追回' | '资料已发';
  title: string;
  description: string;
  amount: number;
  calculationBasis: string;
}

export interface RefundRecord {
  id: string;
  studentName: string;
  courseName: string;
  order: StudentOrder;
  coupon: Coupon;
  progress: CourseProgress;
  breakdown: RefundBreakdown;
  explanations: RefundExplanation[];
  changeHistory: ProgressChangeRecord[];
  status: '待处理' | '已计算' | '已导出';
  createDate: string;
}

export interface FilterState {
  studentName: string;
  courseName: string;
  dateRange: [string, string];
  status: '全部' | '待处理' | '已计算' | '已导出';
}
