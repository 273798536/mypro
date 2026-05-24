import { z } from 'zod';
export declare const appointmentOrderSchema: z.ZodObject<{
    appointmentNo: z.ZodString;
    batchNo: z.ZodString;
    customerName: z.ZodString;
    customerPhone: z.ZodString;
    customerAddress: z.ZodString;
    area: z.ZodString;
    applianceType: z.ZodString;
    appointmentTime: z.ZodString;
    technicianId: z.ZodString;
    technicianName: z.ZodString;
    status: z.ZodString;
    operatorId: z.ZodString;
    operatorName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appointmentNo: string;
    batchNo: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    area: string;
    applianceType: string;
    appointmentTime: string;
    technicianId: string;
    technicianName: string;
    status: string;
    operatorId: string;
    operatorName: string;
}, {
    appointmentNo: string;
    batchNo: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    area: string;
    applianceType: string;
    appointmentTime: string;
    technicianId: string;
    technicianName: string;
    status: string;
    operatorId: string;
    operatorName: string;
}>;
export declare const technicianLocationSchema: z.ZodObject<{
    appointmentNo: z.ZodString;
    batchNo: z.ZodString;
    technicianId: z.ZodString;
    checkInTime: z.ZodString;
    checkOutTime: z.ZodOptional<z.ZodString>;
    locationAddress: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    distanceToCustomer: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    appointmentNo: string;
    batchNo: string;
    technicianId: string;
    checkInTime: string;
    locationAddress: string;
    latitude: number;
    longitude: number;
    distanceToCustomer: number;
    checkOutTime?: string | undefined;
}, {
    appointmentNo: string;
    batchNo: string;
    technicianId: string;
    checkInTime: string;
    locationAddress: string;
    latitude: number;
    longitude: number;
    distanceToCustomer: number;
    checkOutTime?: string | undefined;
}>;
export declare const userReviewSchema: z.ZodObject<{
    appointmentNo: z.ZodString;
    batchNo: z.ZodString;
    rating: z.ZodNumber;
    reviewContent: z.ZodString;
    negativeReason: z.ZodOptional<z.ZodString>;
    reviewTime: z.ZodString;
    reviewerPhone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    appointmentNo: string;
    batchNo: string;
    rating: number;
    reviewContent: string;
    reviewTime: string;
    reviewerPhone: string;
    negativeReason?: string | undefined;
}, {
    appointmentNo: string;
    batchNo: string;
    rating: number;
    reviewContent: string;
    reviewTime: string;
    reviewerPhone: string;
    negativeReason?: string | undefined;
}>;
export declare const secondConfirmationSchema: z.ZodObject<{
    appointmentNo: z.ZodString;
    batchNo: z.ZodString;
    confirmType: z.ZodEnum<["reschedule", "second_visit", "other"]>;
    confirmResult: z.ZodString;
    confirmTime: z.ZodString;
    operatorId: z.ZodString;
    operatorName: z.ZodString;
    remark: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    appointmentNo: string;
    batchNo: string;
    operatorId: string;
    operatorName: string;
    confirmType: "reschedule" | "second_visit" | "other";
    confirmResult: string;
    confirmTime: string;
    remark?: string | undefined;
}, {
    appointmentNo: string;
    batchNo: string;
    operatorId: string;
    operatorName: string;
    confirmType: "reschedule" | "second_visit" | "other";
    confirmResult: string;
    confirmTime: string;
    remark?: string | undefined;
}>;
export declare const statusChangeSchema: z.ZodObject<{
    ledgerId: z.ZodString;
    targetStatus: z.ZodEnum<["draft", "submitted", "rejected", "second_confirm", "audit_only"]>;
    changeReason: z.ZodString;
    operatorId: z.ZodString;
    operatorName: z.ZodString;
    role: z.ZodEnum<["admin", "area_manager", "after_sales", "auditor"]>;
}, "strip", z.ZodTypeAny, {
    operatorId: string;
    operatorName: string;
    ledgerId: string;
    targetStatus: "draft" | "submitted" | "rejected" | "second_confirm" | "audit_only";
    changeReason: string;
    role: "admin" | "area_manager" | "after_sales" | "auditor";
}, {
    operatorId: string;
    operatorName: string;
    ledgerId: string;
    targetStatus: "draft" | "submitted" | "rejected" | "second_confirm" | "audit_only";
    changeReason: string;
    role: "admin" | "area_manager" | "after_sales" | "auditor";
}>;
export type AppointmentOrderInput = z.infer<typeof appointmentOrderSchema>;
export type TechnicianLocationInput = z.infer<typeof technicianLocationSchema>;
export type UserReviewInput = z.infer<typeof userReviewSchema>;
export type SecondConfirmationInput = z.infer<typeof secondConfirmationSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
