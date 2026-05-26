"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRechargeToCSV = exportRechargeToCSV;
exports.exportRefundToCSV = exportRefundToCSV;
exports.exportHandoverToCSV = exportHandoverToCSV;
exports.exportReceiptToCSV = exportReceiptToCSV;
const plainjs_1 = require("@json2csv/plainjs");
const schema_1 = require("../database/schema");
const rechargeService_1 = require("./rechargeService");
const refundService_1 = require("./refundService");
const handoverService_1 = require("./handoverService");
const receiptService_1 = require("./receiptService");
const sensitiveFields = ['member_phone', 'member_id', 'applicant_id', 'operator_id'];
function maskPhone(phone) {
    if (!phone || phone.length < 11)
        return phone;
    return phone.slice(0, 3) + '****' + phone.slice(7);
}
function maskId(id) {
    if (!id || id.length < 8)
        return id;
    return id.slice(0, 4) + '****' + id.slice(-4);
}
function applyDataMasking(data, role) {
    if (role === schema_1.RoleType.AUDITOR || role === schema_1.RoleType.FINANCE) {
        return data;
    }
    const masked = { ...data };
    if (masked.member_phone) {
        masked.member_phone = maskPhone(masked.member_phone);
    }
    if (masked.member_id) {
        masked.member_id = maskId(masked.member_id);
    }
    if (masked.applicant_id && role !== schema_1.RoleType.STORE_MANAGER) {
        masked.applicant_id = maskId(masked.applicant_id);
    }
    if (masked.operator_id && role !== schema_1.RoleType.STORE_MANAGER) {
        masked.operator_id = maskId(masked.operator_id);
    }
    return masked;
}
async function exportRechargeToCSV(role, options) {
    const records = await (0, rechargeService_1.getRechargeList)({
        ...options,
        status: options?.status || schema_1.RecordStatus.AUDITED
    });
    const maskedRecords = records.map(r => applyDataMasking({
        订单号: r.order_no,
        门店ID: r.store_id,
        门店名称: r.store_name,
        会员ID: r.member_id,
        会员手机号: r.member_phone,
        充值金额: r.amount,
        充值前余额: r.before_balance,
        充值后余额: r.after_balance,
        操作人ID: r.operator_id,
        操作人: r.operator_name,
        状态: r.status,
        来源: r.source,
        备注: r.remark,
        创建时间: new Date(r.created_at).toISOString()
    }, role));
    const parser = new plainjs_1.Parser();
    return parser.parse(maskedRecords);
}
async function exportRefundToCSV(role, options) {
    const records = await (0, refundService_1.getRefundList)({
        ...options,
        status: options?.status || schema_1.RecordStatus.AUDITED
    });
    const maskedRecords = records.map(r => applyDataMasking({
        申请单号: r.apply_no,
        门店ID: r.store_id,
        门店名称: r.store_name,
        关联充值订单: r.recharge_order_no,
        会员ID: r.member_id,
        会员手机号: r.member_phone,
        退款金额: r.refund_amount,
        退款原因: r.refund_reason,
        申请人: r.applicant_name,
        审核人: r.reviewer_name,
        审核备注: r.review_remark,
        状态: r.status,
        库存是否回滚: r.inventory_rollback === 1 ? '是' : '否',
        创建时间: new Date(r.created_at).toISOString()
    }, role));
    const parser = new plainjs_1.Parser();
    return parser.parse(maskedRecords);
}
async function exportHandoverToCSV(role, options) {
    const records = await (0, handoverService_1.getHandoverList)({
        ...options,
        status: options?.status || schema_1.RecordStatus.AUDITED
    });
    const maskedRecords = records.map(r => ({
        交接单号: r.handover_no,
        门店ID: r.store_id,
        门店名称: r.store_name,
        原店长: r.previous_manager_name,
        新任店长: r.new_manager_name,
        交接日期: new Date(r.handover_date).toISOString(),
        储值余额总额: r.total_balance,
        现金金额: r.cash_amount,
        待处理退款数: r.pending_refund_count,
        状态: r.status,
        见证人: r.witness_name,
        备注: r.remark,
        创建时间: new Date(r.created_at).toISOString()
    }));
    const parser = new plainjs_1.Parser();
    return parser.parse(maskedRecords);
}
async function exportReceiptToCSV(role, options) {
    const records = await (0, receiptService_1.getReceiptList)({
        ...options,
        status: options?.status || schema_1.RecordStatus.AUDITED
    });
    const maskedRecords = records.map(r => ({
        回执单号: r.receipt_no,
        关联记录ID: r.related_record_id,
        关联记录类型: r.related_record_type,
        门店ID: r.store_id,
        门店名称: r.store_name,
        回执类型: r.receipt_type,
        金额: r.amount,
        渠道: r.channel,
        渠道交易号: r.channel_transaction_id,
        操作人: r.operator_name,
        状态: r.status,
        备注: r.remark,
        创建时间: new Date(r.created_at).toISOString()
    }));
    const parser = new plainjs_1.Parser();
    return parser.parse(maskedRecords);
}
