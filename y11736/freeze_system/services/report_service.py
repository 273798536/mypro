import os
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy import func, and_
from ..models import (
    FreezeRecord,
    UnfreezeRecord,
    MerchantBalance,
    Merchant,
    Order,
    ViolationRecord,
    AppealRecord,
    AuditLog,
)
from ..database import get_db
from ..config import EXPORT_DIR


class ReportService:
    @staticmethod
    def _ensure_dir():
        os.makedirs(EXPORT_DIR, exist_ok=True)

    @staticmethod
    def export_freeze_summary(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        merchant_code: Optional[str] = None,
        format: str = "xlsx",
    ) -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"freeze_summary_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        with get_db() as db:
            query = (
                db.query(FreezeRecord, Merchant, Order)
                .join(Merchant, FreezeRecord.merchant_id == Merchant.id)
                .join(Order, FreezeRecord.order_id == Order.id)
            )

            if start_date:
                query = query.filter(FreezeRecord.freeze_time >= start_date)
            if end_date:
                query = query.filter(FreezeRecord.freeze_time <= end_date)
            if status:
                query = query.filter(FreezeRecord.freeze_status == status)
            if merchant_code:
                query = query.filter(Merchant.merchant_code == merchant_code)

            records = query.order_by(FreezeRecord.freeze_time.desc()).all()

            data = []
            for freeze, merchant, order in records:
                data.append(
                    {
                        "冻结单号": freeze.freeze_no,
                        "商家编码": merchant.merchant_code,
                        "商家名称": merchant.merchant_name,
                        "订单号": order.order_no,
                        "订单金额": order.order_amount,
                        "冻结金额": freeze.freeze_amount,
                        "已解冻金额": freeze.unfreeze_amount,
                        "剩余冻结": freeze.remain_frozen_amount,
                        "冻结状态": freeze.freeze_status,
                        "冻结原因": freeze.freeze_reason,
                        "冻结时间": freeze.freeze_time,
                        "最后解冻时间": freeze.last_unfreeze_time,
                        "操作人": freeze.operator,
                        "数据来源": freeze.data_source,
                    }
                )

            df = pd.DataFrame(data)

            if format == "xlsx":
                with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
                    df.to_excel(writer, sheet_name="冻结明细", index=False)

                    summary = {
                        "冻结订单数": len(df),
                        "冻结总金额": df["冻结金额"].sum() if len(df) > 0 else 0,
                        "已解冻总金额": df["已解冻金额"].sum() if len(df) > 0 else 0,
                        "剩余冻结总金额": df["剩余冻结"].sum() if len(df) > 0 else 0,
                        "已完成解冻数": len(df[df["冻结状态"] == "unfrozen"]),
                        "部分解冻数": len(df[df["冻结状态"] == "partially_unfrozen"]),
                        "仍在冻结数": len(df[df["冻结状态"].isin(["frozen", "appealing"])]),
                    }
                    pd.DataFrame([summary]).T.to_excel(writer, sheet_name="汇总", header=["数值"])
            else:
                df.to_csv(filepath, index=False)

        return {"success": True, "filepath": filepath, "filename": filename, "count": len(data)}

    @staticmethod
    def export_unfreeze_detail(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: str = "xlsx",
    ) -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"unfreeze_detail_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        with get_db() as db:
            query = (
                db.query(UnfreezeRecord, FreezeRecord, Merchant)
                .join(FreezeRecord, UnfreezeRecord.freeze_id == FreezeRecord.id)
                .join(Merchant, FreezeRecord.merchant_id == Merchant.id)
            )

            if start_date:
                query = query.filter(UnfreezeRecord.operate_time >= start_date)
            if end_date:
                query = query.filter(UnfreezeRecord.operate_time <= end_date)

            records = query.order_by(UnfreezeRecord.operate_time.desc()).all()

            data = []
            for unfreeze, freeze, merchant in records:
                data.append(
                    {
                        "解冻单号": unfreeze.unfreeze_no,
                        "关联冻结单号": freeze.freeze_no,
                        "商家编码": merchant.merchant_code,
                        "商家名称": merchant.merchant_name,
                        "解冻金额": unfreeze.unfreeze_amount,
                        "解冻类型": unfreeze.unfreeze_type,
                        "解冻原因": unfreeze.unfreeze_reason,
                        "解冻时间": unfreeze.operate_time,
                        "操作人": unfreeze.operator,
                        "备注": unfreeze.remark,
                        "数据来源": unfreeze.data_source,
                    }
                )

            df = pd.DataFrame(data)

            if format == "xlsx":
                with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
                    df.to_excel(writer, sheet_name="解冻明细", index=False)

                    summary = {
                        "解冻笔数": len(df),
                        "解冻总金额": df["解冻金额"].sum() if len(df) > 0 else 0,
                        "部分解冻笔数": len(df[df["解冻类型"] == "partial"]),
                        "全额解冻笔数": len(df[df["解冻类型"] == "full"]),
                    }
                    pd.DataFrame([summary]).T.to_excel(writer, sheet_name="汇总", header=["数值"])
            else:
                df.to_csv(filepath, index=False)

        return {"success": True, "filepath": filepath, "filename": filename, "count": len(data)}

    @staticmethod
    def export_balance_report(format: str = "xlsx") -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"balance_report_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        with get_db() as db:
            query = db.query(MerchantBalance, Merchant).join(
                Merchant, MerchantBalance.merchant_id == Merchant.id
            )
            records = query.all()

            data = []
            for balance, merchant in records:
                data.append(
                    {
                        "商家编码": merchant.merchant_code,
                        "商家名称": merchant.merchant_name,
                        "冻结余额": balance.total_frozen,
                        "已解冻金额": balance.total_unfrozen,
                        "罚金总额": balance.total_penalty,
                        "可用余额": balance.available_balance,
                        "最后审计时间": balance.last_audit_time,
                        "最后审计人": balance.last_auditor,
                    }
                )

            df = pd.DataFrame(data)

            if format == "xlsx":
                with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
                    df.to_excel(writer, sheet_name="商家余额", index=False)

                    summary = {
                        "商家总数": len(df),
                        "冻结总余额": df["冻结余额"].sum() if len(df) > 0 else 0,
                        "已解冻总金额": df["已解冻金额"].sum() if len(df) > 0 else 0,
                        "可用总余额": df["可用余额"].sum() if len(df) > 0 else 0,
                    }
                    pd.DataFrame([summary]).T.to_excel(writer, sheet_name="汇总", header=["数值"])
            else:
                df.to_csv(filepath, index=False)

        return {"success": True, "filepath": filepath, "filename": filename, "count": len(data)}

    @staticmethod
    def export_appeal_report(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        format: str = "xlsx",
    ) -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"appeal_report_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        with get_db() as db:
            query = (
                db.query(AppealRecord, ViolationRecord, Merchant)
                .join(ViolationRecord, AppealRecord.violation_id == ViolationRecord.id)
                .join(Merchant, ViolationRecord.merchant_id == Merchant.id)
            )

            if start_date:
                query = query.filter(AppealRecord.appeal_time >= start_date)
            if end_date:
                query = query.filter(AppealRecord.appeal_time <= end_date)
            if status:
                query = query.filter(AppealRecord.appeal_status == status)

            records = query.order_by(AppealRecord.appeal_time.desc()).all()

            data = []
            for appeal, violation, merchant in records:
                data.append(
                    {
                        "申诉单号": appeal.appeal_no,
                        "违规单号": violation.violation_no,
                        "商家编码": merchant.merchant_code,
                        "商家名称": merchant.merchant_name,
                        "违规类型": violation.violation_type,
                        "申诉原因": appeal.appeal_reason,
                        "申诉证据": appeal.appeal_evidence,
                        "申诉时间": appeal.appeal_time,
                        "申诉人": appeal.appellant,
                        "申诉状态": appeal.appeal_status,
                        "审核意见": appeal.audit_opinion,
                        "审核人": appeal.auditor,
                        "审核时间": appeal.audit_time,
                        "审核结果": appeal.appeal_result,
                        "建议解冻金额": appeal.unfreeze_suggestion,
                    }
                )

            df = pd.DataFrame(data)

            if format == "xlsx":
                with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
                    df.to_excel(writer, sheet_name="申诉明细", index=False)

                    summary = {
                        "申诉总数": len(df),
                        "待处理": len(df[df["申诉状态"] == "pending"]),
                        "处理中": len(df[df["申诉状态"] == "processing"]),
                        "申诉通过": len(df[df["申诉状态"] == "approved"]),
                        "部分通过": len(df[df["申诉状态"] == "partial_approved"]),
                        "申诉驳回": len(df[df["申诉状态"] == "rejected"]),
                    }
                    pd.DataFrame([summary]).T.to_excel(writer, sheet_name="汇总", header=["数值"])
            else:
                df.to_csv(filepath, index=False)

        return {"success": True, "filepath": filepath, "filename": filename, "count": len(data)}

    @staticmethod
    def export_audit_logs(
        operation_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000,
        format: str = "xlsx",
    ) -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"audit_logs_{timestamp}.{format}"
        filepath = os.path.join(EXPORT_DIR, filename)

        with get_db() as db:
            query = db.query(AuditLog)
            if operation_type:
                query = query.filter(AuditLog.operation_type == operation_type)
            if risk_level:
                query = query.filter(AuditLog.risk_level == risk_level)
            if start_date:
                query = query.filter(AuditLog.operate_time >= start_date)
            if end_date:
                query = query.filter(AuditLog.operate_time <= end_date)

            records = query.order_by(AuditLog.operate_time.desc()).limit(limit).all()

            data = []
            for log in records:
                data.append(
                    {
                        "操作时间": log.operate_time,
                        "操作类型": log.operation_type,
                        "操作子类型": log.operation_subtype,
                        "目标类型": log.target_type,
                        "目标ID": log.target_id,
                        "操作前": log.before_value,
                        "操作后": log.after_value,
                        "操作人": log.operator,
                        "备注": log.remark,
                        "数据来源": log.data_source,
                        "风险等级": log.risk_level,
                        "风险描述": log.risk_desc,
                    }
                )

            df = pd.DataFrame(data)

            if format == "xlsx":
                df.to_excel(filepath, sheet_name="审计日志", index=False)
            else:
                df.to_csv(filepath, index=False)

        return {"success": True, "filepath": filepath, "filename": filename, "count": len(data)}

    @staticmethod
    def export_full_report(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict:
        ReportService._ensure_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"full_freeze_report_{timestamp}.xlsx"
        filepath = os.path.join(EXPORT_DIR, filename)

        freeze_result = ReportService.export_freeze_summary(start_date, end_date, format="xlsx")
        unfreeze_result = ReportService.export_unfreeze_detail(start_date, end_date, format="xlsx")
        balance_result = ReportService.export_balance_report(format="xlsx")
        appeal_result = ReportService.export_appeal_report(start_date, end_date, format="xlsx")

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            if freeze_result["count"] > 0:
                pd.read_excel(freeze_result["filepath"], sheet_name="冻结明细").to_excel(
                    writer, sheet_name="冻结明细", index=False
                )
                pd.read_excel(freeze_result["filepath"], sheet_name="汇总").to_excel(
                    writer, sheet_name="冻结汇总", index=False
                )
            if unfreeze_result["count"] > 0:
                pd.read_excel(unfreeze_result["filepath"], sheet_name="解冻明细").to_excel(
                    writer, sheet_name="解冻明细", index=False
                )
            if balance_result["count"] > 0:
                pd.read_excel(balance_result["filepath"], sheet_name="商家余额").to_excel(
                    writer, sheet_name="商家余额", index=False
                )
            if appeal_result["count"] > 0:
                pd.read_excel(appeal_result["filepath"], sheet_name="申诉明细").to_excel(
                    writer, sheet_name="申诉明细", index=False
                )

            overview = {
                "报告时间": datetime.now(),
                "统计开始": start_date,
                "统计结束": end_date,
                "冻结笔数": freeze_result["count"],
                "解冻笔数": unfreeze_result["count"],
                "申诉笔数": appeal_result["count"],
                "商家数": balance_result["count"],
            }
            pd.DataFrame([overview]).T.to_excel(writer, sheet_name="报告概览", header=["数值"])

        return {"success": True, "filepath": filepath, "filename": filename}
