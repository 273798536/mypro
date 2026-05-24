import { z } from 'zod';

export const appointmentOrderSchema = z.object({
  appointmentNo: z.string().min(1, '预约单号不能为空'),
  batchNo: z.string().min(1, '批次号不能为空'),
  customerName: z.string().min(1, '客户姓名不能为空'),
  customerPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  customerAddress: z.string().min(1, '客户地址不能为空'),
  area: z.string().min(1, '区域不能为空'),
  applianceType: z.string().min(1, '家电类型不能为空'),
  appointmentTime: z.string().min(1, '预约时间不能为空'),
  technicianId: z.string().min(1, '师傅ID不能为空'),
  technicianName: z.string().min(1, '师傅姓名不能为空'),
  status: z.string().min(1, '状态不能为空'),
  operatorId: z.string().min(1, '操作人ID不能为空'),
  operatorName: z.string().min(1, '操作人姓名不能为空'),
});

export const technicianLocationSchema = z.object({
  appointmentNo: z.string().min(1, '预约单号不能为空'),
  batchNo: z.string().min(1, '批次号不能为空'),
  technicianId: z.string().min(1, '师傅ID不能为空'),
  checkInTime: z.string().min(1, '签到时间不能为空'),
  checkOutTime: z.string().optional(),
  locationAddress: z.string().min(1, '位置地址不能为空'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceToCustomer: z.number().min(0, '距离不能为负数'),
});

export const userReviewSchema = z.object({
  appointmentNo: z.string().min(1, '预约单号不能为空'),
  batchNo: z.string().min(1, '批次号不能为空'),
  rating: z.number().int().min(1).max(5, '评分必须在1-5之间'),
  reviewContent: z.string().min(1, '评价内容不能为空'),
  negativeReason: z.string().optional(),
  reviewTime: z.string().min(1, '评价时间不能为空'),
  reviewerPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

export const secondConfirmationSchema = z.object({
  appointmentNo: z.string().min(1, '预约单号不能为空'),
  batchNo: z.string().min(1, '批次号不能为空'),
  confirmType: z.enum(['reschedule', 'second_visit', 'other']),
  confirmResult: z.string().min(1, '确认结果不能为空'),
  confirmTime: z.string().min(1, '确认时间不能为空'),
  operatorId: z.string().min(1, '操作人ID不能为空'),
  operatorName: z.string().min(1, '操作人姓名不能为空'),
  remark: z.string().optional(),
});

export const statusChangeSchema = z.object({
  ledgerId: z.string().min(1, '台账ID不能为空'),
  targetStatus: z.enum(['draft', 'submitted', 'rejected', 'second_confirm', 'audit_only']),
  changeReason: z.string().min(1, '变更原因不能为空'),
  operatorId: z.string().min(1, '操作人ID不能为空'),
  operatorName: z.string().min(1, '操作人姓名不能为空'),
  role: z.enum(['admin', 'area_manager', 'after_sales', 'auditor']),
});

export type AppointmentOrderInput = z.infer<typeof appointmentOrderSchema>;
export type TechnicianLocationInput = z.infer<typeof technicianLocationSchema>;
export type UserReviewInput = z.infer<typeof userReviewSchema>;
export type SecondConfirmationInput = z.infer<typeof secondConfirmationSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
