"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusChangeSchema = exports.secondConfirmationSchema = exports.userReviewSchema = exports.technicianLocationSchema = exports.appointmentOrderSchema = void 0;
const zod_1 = require("zod");
exports.appointmentOrderSchema = zod_1.z.object({
    appointmentNo: zod_1.z.string().min(1, '预约单号不能为空'),
    batchNo: zod_1.z.string().min(1, '批次号不能为空'),
    customerName: zod_1.z.string().min(1, '客户姓名不能为空'),
    customerPhone: zod_1.z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
    customerAddress: zod_1.z.string().min(1, '客户地址不能为空'),
    area: zod_1.z.string().min(1, '区域不能为空'),
    applianceType: zod_1.z.string().min(1, '家电类型不能为空'),
    appointmentTime: zod_1.z.string().min(1, '预约时间不能为空'),
    technicianId: zod_1.z.string().min(1, '师傅ID不能为空'),
    technicianName: zod_1.z.string().min(1, '师傅姓名不能为空'),
    status: zod_1.z.string().min(1, '状态不能为空'),
    operatorId: zod_1.z.string().min(1, '操作人ID不能为空'),
    operatorName: zod_1.z.string().min(1, '操作人姓名不能为空'),
});
exports.technicianLocationSchema = zod_1.z.object({
    appointmentNo: zod_1.z.string().min(1, '预约单号不能为空'),
    batchNo: zod_1.z.string().min(1, '批次号不能为空'),
    technicianId: zod_1.z.string().min(1, '师傅ID不能为空'),
    checkInTime: zod_1.z.string().min(1, '签到时间不能为空'),
    checkOutTime: zod_1.z.string().optional(),
    locationAddress: zod_1.z.string().min(1, '位置地址不能为空'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    distanceToCustomer: zod_1.z.number().min(0, '距离不能为负数'),
});
exports.userReviewSchema = zod_1.z.object({
    appointmentNo: zod_1.z.string().min(1, '预约单号不能为空'),
    batchNo: zod_1.z.string().min(1, '批次号不能为空'),
    rating: zod_1.z.number().int().min(1).max(5, '评分必须在1-5之间'),
    reviewContent: zod_1.z.string().min(1, '评价内容不能为空'),
    negativeReason: zod_1.z.string().optional(),
    reviewTime: zod_1.z.string().min(1, '评价时间不能为空'),
    reviewerPhone: zod_1.z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});
exports.secondConfirmationSchema = zod_1.z.object({
    appointmentNo: zod_1.z.string().min(1, '预约单号不能为空'),
    batchNo: zod_1.z.string().min(1, '批次号不能为空'),
    confirmType: zod_1.z.enum(['reschedule', 'second_visit', 'other']),
    confirmResult: zod_1.z.string().min(1, '确认结果不能为空'),
    confirmTime: zod_1.z.string().min(1, '确认时间不能为空'),
    operatorId: zod_1.z.string().min(1, '操作人ID不能为空'),
    operatorName: zod_1.z.string().min(1, '操作人姓名不能为空'),
    remark: zod_1.z.string().optional(),
});
exports.statusChangeSchema = zod_1.z.object({
    ledgerId: zod_1.z.string().min(1, '台账ID不能为空'),
    targetStatus: zod_1.z.enum(['draft', 'submitted', 'rejected', 'second_confirm', 'audit_only']),
    changeReason: zod_1.z.string().min(1, '变更原因不能为空'),
    operatorId: zod_1.z.string().min(1, '操作人ID不能为空'),
    operatorName: zod_1.z.string().min(1, '操作人姓名不能为空'),
    role: zod_1.z.enum(['admin', 'area_manager', 'after_sales', 'auditor']),
});
//# sourceMappingURL=schemas.js.map