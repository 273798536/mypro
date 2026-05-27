import os
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Callable
from sqlalchemy.exc import IntegrityError
from ..models import (
    Merchant,
    Order,
    ViolationRecord,
    AppealRecord,
    FreezeRecord,
    UnfreezeRecord,
    DataImportRecord,
)
from ..database import get_db
from .audit_service import AuditService


class DataImporter:
    def __init__(self, batch_no: str = None, operator: str = "system"):
        self.batch_no = batch_no or f"IMP{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.operator = operator
        self.stats = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "dirty": 0,
            "errors": [],
            "warnings": [],
        }

    def _validate_row(self, row: pd.Series, required_fields: List[str]) -> Tuple[bool, List[str]]:
        errors = []
        for field in required_fields:
            if field not in row or pd.isna(row[field]) or str(row[field]).strip() == "":
                errors.append(f"缺少必填字段: {field}")
        return len(errors) == 0, errors

    def _parse_date(self, value) -> Optional[datetime]:
        if pd.isna(value) or value == "":
            return None
        if isinstance(value, datetime):
            return value
        try:
            return pd.to_datetime(value).to_pydatetime()
        except Exception:
            return None

    def _parse_float(self, value) -> float:
        if pd.isna(value) or value == "":
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            cleaned = str(value).replace(",", "").replace("￥", "").replace("¥", "")
            try:
                return float(cleaned)
            except (ValueError, TypeError):
                return 0.0

    def _parse_int(self, value) -> int:
        if pd.isna(value) or value == "":
            return 0
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def import_merchants(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["merchant_code", "merchant_name"],
            self._import_merchant_row,
            "merchant",
        )

    def _import_merchant_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        merchant_code = str(row["merchant_code"]).strip()

        with get_db() as db:
            existing = db.query(Merchant).filter(Merchant.merchant_code == merchant_code).first()
            if existing:
                existing.merchant_name = row.get("merchant_name", existing.merchant_name)
                existing.shop_name = row.get("shop_name", existing.shop_name)
                existing.category = row.get("category", existing.category)
                existing.contact = row.get("contact", existing.contact)
                existing.phone = row.get("phone", existing.phone)
                existing.status = row.get("status", existing.status)
                return True, f"商家{merchant_code}已更新"
            else:
                merchant = Merchant(
                    merchant_code=merchant_code,
                    merchant_name=str(row.get("merchant_name", "")).strip(),
                    shop_name=str(row.get("shop_name", "")).strip(),
                    category=str(row.get("category", "")).strip(),
                    contact=str(row.get("contact", "")).strip(),
                    phone=str(row.get("phone", "")).strip(),
                    status=str(row.get("status", "normal")).strip(),
                )
                db.add(merchant)
                return True, f"商家{merchant_code}已创建"

    def import_orders(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["order_no", "merchant_code", "order_amount"],
            self._import_order_row,
            "order",
        )

    def _import_order_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        order_no = str(row["order_no"]).strip()
        merchant_code = str(row["merchant_code"]).strip()

        with get_db() as db:
            merchant = db.query(Merchant).filter(Merchant.merchant_code == merchant_code).first()
            if not merchant:
                return False, f"商家{merchant_code}不存在"

            existing = db.query(Order).filter(Order.order_no == order_no).first()
            if existing:
                existing.order_amount = self._parse_float(row.get("order_amount", existing.order_amount))
                existing.goods_amount = self._parse_float(row.get("goods_amount", existing.goods_amount))
                existing.shipping_fee = self._parse_float(row.get("shipping_fee", existing.shipping_fee))
                existing.order_status = row.get("order_status", existing.order_status)
                existing.payment_method = row.get("payment_method", existing.payment_method)
                existing.buyer_account = row.get("buyer_account", existing.buyer_account)
                existing.order_time = self._parse_date(row.get("order_time", existing.order_time))
                existing.receipt_time = self._parse_date(row.get("receipt_time", existing.receipt_time))
                existing.settlement_amount = self._parse_float(
                    row.get("settlement_amount", existing.settlement_amount)
                )
                existing.settlement_time = self._parse_date(
                    row.get("settlement_time", existing.settlement_time)
                )
                return True, f"订单{order_no}已更新"
            else:
                order = Order(
                    order_no=order_no,
                    merchant_id=merchant.id,
                    order_amount=self._parse_float(row.get("order_amount", 0)),
                    goods_amount=self._parse_float(row.get("goods_amount", 0)),
                    shipping_fee=self._parse_float(row.get("shipping_fee", 0)),
                    order_status=str(row.get("order_status", "completed")).strip(),
                    payment_method=str(row.get("payment_method", "")).strip(),
                    buyer_account=str(row.get("buyer_account", "")).strip(),
                    order_time=self._parse_date(row.get("order_time")),
                    receipt_time=self._parse_date(row.get("receipt_time")),
                    settlement_amount=self._parse_float(row.get("settlement_amount", 0)),
                    settlement_time=self._parse_date(row.get("settlement_time")),
                    data_source=data_source,
                )
                db.add(order)
                return True, f"订单{order_no}已创建"

    def import_violations(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["violation_no", "merchant_code", "violation_type"],
            self._import_violation_row,
            "violation",
        )

    def _import_violation_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        violation_no = str(row["violation_no"]).strip()
        merchant_code = str(row["merchant_code"]).strip()

        with get_db() as db:
            merchant = db.query(Merchant).filter(Merchant.merchant_code == merchant_code).first()
            if not merchant:
                return False, f"商家{merchant_code}不存在"

            order_id = None
            order_no = str(row.get("order_no", "")).strip()
            if order_no:
                order = db.query(Order).filter(Order.order_no == order_no).first()
                if order:
                    order_id = order.id
                else:
                    self.stats["warnings"].append(f"违规{violation_no}关联订单{order_no}不存在")

            existing = (
                db.query(ViolationRecord).filter(ViolationRecord.violation_no == violation_no).first()
            )
            if existing:
                existing.violation_type = row.get("violation_type", existing.violation_type)
                existing.violation_desc = row.get("violation_desc", existing.violation_desc)
                existing.violation_time = self._parse_date(
                    row.get("violation_time", existing.violation_time)
                )
                existing.report_source = row.get("report_source", existing.report_source)
                existing.violation_status = row.get("violation_status", existing.violation_status)
                existing.penalty_amount = self._parse_float(
                    row.get("penalty_amount", existing.penalty_amount)
                )
                existing.handler = row.get("handler", existing.handler)
                existing.handle_time = self._parse_date(row.get("handle_time", existing.handle_time))
                existing.remark = row.get("remark", existing.remark)
                return True, f"违规{violation_no}已更新"
            else:
                violation = ViolationRecord(
                    violation_no=violation_no,
                    merchant_id=merchant.id,
                    order_id=order_id,
                    violation_type=str(row.get("violation_type", "")).strip(),
                    violation_desc=str(row.get("violation_desc", "")).strip(),
                    violation_time=self._parse_date(row.get("violation_time")),
                    report_source=str(row.get("report_source", "")).strip(),
                    violation_status=str(row.get("violation_status", "pending")).strip(),
                    penalty_amount=self._parse_float(row.get("penalty_amount", 0)),
                    handler=str(row.get("handler", "")).strip(),
                    handle_time=self._parse_date(row.get("handle_time")),
                    remark=str(row.get("remark", "")).strip(),
                    data_source=data_source,
                )
                db.add(violation)
                return True, f"违规{violation_no}已创建"

    def import_appeals(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["appeal_no", "violation_no", "appeal_reason"],
            self._import_appeal_row,
            "appeal",
        )

    def _import_appeal_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        appeal_no = str(row["appeal_no"]).strip()
        violation_no = str(row["violation_no"]).strip()

        with get_db() as db:
            violation = (
                db.query(ViolationRecord).filter(ViolationRecord.violation_no == violation_no).first()
            )
            if not violation:
                return False, f"违规记录{violation_no}不存在"

            existing = db.query(AppealRecord).filter(AppealRecord.appeal_no == appeal_no).first()
            if existing:
                existing.appeal_reason = row.get("appeal_reason", existing.appeal_reason)
                existing.appeal_evidence = row.get("appeal_evidence", existing.appeal_evidence)
                existing.appeal_time = self._parse_date(row.get("appeal_time", existing.appeal_time))
                existing.appellant = row.get("appellant", existing.appellant)
                existing.appeal_status = row.get("appeal_status", existing.appeal_status)
                existing.audit_opinion = row.get("audit_opinion", existing.audit_opinion)
                existing.auditor = row.get("auditor", existing.auditor)
                existing.audit_time = self._parse_date(row.get("audit_time", existing.audit_time))
                existing.appeal_result = row.get("appeal_result", existing.appeal_result)
                existing.unfreeze_suggestion = self._parse_float(
                    row.get("unfreeze_suggestion", existing.unfreeze_suggestion)
                )
                return True, f"申诉{appeal_no}已更新"
            else:
                appeal = AppealRecord(
                    appeal_no=appeal_no,
                    violation_id=violation.id,
                    appeal_reason=str(row.get("appeal_reason", "")).strip(),
                    appeal_evidence=str(row.get("appeal_evidence", "")).strip(),
                    appeal_time=self._parse_date(row.get("appeal_time")),
                    appellant=str(row.get("appellant", "merchant")).strip(),
                    appeal_status=str(row.get("appeal_status", "pending")).strip(),
                    audit_opinion=str(row.get("audit_opinion", "")).strip(),
                    auditor=str(row.get("auditor", "")).strip(),
                    audit_time=self._parse_date(row.get("audit_time")),
                    appeal_result=str(row.get("appeal_result", "")).strip(),
                    unfreeze_suggestion=self._parse_float(row.get("unfreeze_suggestion", 0)),
                    data_source=data_source,
                )
                db.add(appeal)
                return True, f"申诉{appeal_no}已创建"

    def import_freezes(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["freeze_no", "merchant_code", "order_no", "freeze_amount"],
            self._import_freeze_row,
            "freeze",
        )

    def _import_freeze_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        freeze_no = str(row["freeze_no"]).strip()
        merchant_code = str(row["merchant_code"]).strip()
        order_no = str(row["order_no"]).strip()

        with get_db() as db:
            merchant = db.query(Merchant).filter(Merchant.merchant_code == merchant_code).first()
            if not merchant:
                return False, f"商家{merchant_code}不存在"

            order = db.query(Order).filter(Order.order_no == order_no).first()
            if not order:
                return False, f"订单{order_no}不存在"

            violation_id = None
            violation_no = str(row.get("violation_no", "")).strip()
            if violation_no:
                violation = (
                    db.query(ViolationRecord)
                    .filter(ViolationRecord.violation_no == violation_no)
                    .first()
                )
                if violation:
                    violation_id = violation.id

            freeze_amount = self._parse_float(row.get("freeze_amount", 0))
            existing = db.query(FreezeRecord).filter(FreezeRecord.freeze_no == freeze_no).first()
            if existing:
                existing.freeze_amount = freeze_amount
                existing.freeze_reason = row.get("freeze_reason", existing.freeze_reason)
                existing.freeze_type = row.get("freeze_type", existing.freeze_type)
                existing.freeze_status = row.get("freeze_status", existing.freeze_status)
                existing.freeze_time = self._parse_date(row.get("freeze_time", existing.freeze_time))
                existing.unfreeze_amount = self._parse_float(
                    row.get("unfreeze_amount", existing.unfreeze_amount)
                )
                existing.remain_frozen_amount = self._parse_float(
                    row.get("remain_frozen_amount", freeze_amount - existing.unfreeze_amount)
                )
                existing.operator = row.get("operator", existing.operator)
                return True, f"冻结{freeze_no}已更新"
            else:
                unfreeze_amount = self._parse_float(row.get("unfreeze_amount", 0))
                remain = self._parse_float(row.get("remain_frozen_amount", freeze_amount - unfreeze_amount))
                freeze = FreezeRecord(
                    freeze_no=freeze_no,
                    merchant_id=merchant.id,
                    order_id=order.id,
                    violation_id=violation_id,
                    freeze_amount=freeze_amount,
                    freeze_reason=str(row.get("freeze_reason", "")).strip(),
                    freeze_type=str(row.get("freeze_type", "violation")).strip(),
                    freeze_status=str(row.get("freeze_status", "frozen")).strip(),
                    freeze_time=self._parse_date(row.get("freeze_time")),
                    unfreeze_amount=unfreeze_amount,
                    remain_frozen_amount=remain,
                    operator=str(row.get("operator", "system")).strip(),
                    data_source=data_source,
                )
                db.add(freeze)
                return True, f"冻结{freeze_no}已创建"

    def import_unfreezes(self, file_path: str) -> Dict:
        return self._import_data(
            file_path,
            ["unfreeze_no", "freeze_no", "unfreeze_amount"],
            self._import_unfreeze_row,
            "unfreeze",
        )

    def _import_unfreeze_row(self, row: pd.Series, data_source: str) -> Tuple[bool, str]:
        unfreeze_no = str(row["unfreeze_no"]).strip()
        freeze_no = str(row["freeze_no"]).strip()

        with get_db() as db:
            freeze = db.query(FreezeRecord).filter(FreezeRecord.freeze_no == freeze_no).first()
            if not freeze:
                return False, f"冻结记录{freeze_no}不存在"

            appeal_id = None
            appeal_no = str(row.get("appeal_no", "")).strip()
            if appeal_no:
                appeal = db.query(AppealRecord).filter(AppealRecord.appeal_no == appeal_no).first()
                if appeal:
                    appeal_id = appeal.id

            existing = (
                db.query(UnfreezeRecord).filter(UnfreezeRecord.unfreeze_no == unfreeze_no).first()
            )
            if existing:
                existing.unfreeze_amount = self._parse_float(
                    row.get("unfreeze_amount", existing.unfreeze_amount)
                )
                existing.unfreeze_reason = row.get("unfreeze_reason", existing.unfreeze_reason)
                existing.unfreeze_type = row.get("unfreeze_type", existing.unfreeze_type)
                existing.unfreeze_status = row.get("unfreeze_status", existing.unfreeze_status)
                existing.operator = row.get("operator", existing.operator)
                existing.operate_time = self._parse_date(
                    row.get("operate_time", existing.operate_time)
                )
                existing.remark = row.get("remark", existing.remark)
                return True, f"解冻{unfreeze_no}已更新"
            else:
                unfreeze = UnfreezeRecord(
                    unfreeze_no=unfreeze_no,
                    freeze_id=freeze.id,
                    appeal_id=appeal_id,
                    unfreeze_amount=self._parse_float(row.get("unfreeze_amount", 0)),
                    unfreeze_reason=str(row.get("unfreeze_reason", "")).strip(),
                    unfreeze_type=str(row.get("unfreeze_type", "partial")).strip(),
                    unfreeze_status=str(row.get("unfreeze_status", "completed")).strip(),
                    operator=str(row.get("operator", "system")).strip(),
                    operate_time=self._parse_date(row.get("operate_time")),
                    remark=str(row.get("remark", "")).strip(),
                    data_source=data_source,
                )
                db.add(unfreeze)
                return True, f"解冻{unfreeze_no}已创建"

    def _import_data(
        self,
        file_path: str,
        required_fields: List[str],
        row_processor: Callable,
        import_type: str,
    ) -> Dict:
        if not os.path.exists(file_path):
            return {"success": False, "error": f"文件不存在: {file_path}"}

        try:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path, dtype=str)
            elif file_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_path, dtype=str)
            else:
                return {"success": False, "error": "不支持的文件格式"}
        except Exception as e:
            return {"success": False, "error": f"读取文件失败: {str(e)}"}

        self.stats["total"] = len(df)
        self.stats["success"] = 0
        self.stats["failed"] = 0
        self.stats["dirty"] = 0
        self.stats["errors"] = []
        self.stats["warnings"] = []

        file_name = os.path.basename(file_path)
        data_source = f"import:{file_name}"

        for idx, row in df.iterrows():
            row_num = idx + 2
            is_valid, errors = self._validate_row(row, required_fields)

            if not is_valid:
                self.stats["dirty"] += 1
                error_msg = f"第{row_num}行脏数据: {'; '.join(errors)}"
                self.stats["errors"].append(error_msg)
                AuditService.log(
                    operation_type="data_import",
                    operation_subtype="dirty_data",
                    target_type=import_type,
                    target_id=row_num,
                    before_value=row.to_dict(),
                    operator=self.operator,
                    data_source=data_source,
                    risk_level="warning",
                    risk_desc=error_msg,
                )
                continue

            try:
                success, message = row_processor(row, data_source)
                if success:
                    self.stats["success"] += 1
                else:
                    self.stats["failed"] += 1
                    error_msg = f"第{row_num}行处理失败: {message}"
                    self.stats["errors"].append(error_msg)
                    AuditService.log(
                        operation_type="data_import",
                        operation_subtype="failed",
                        target_type=import_type,
                        target_id=row_num,
                        before_value=row.to_dict(),
                        operator=self.operator,
                        data_source=data_source,
                        risk_level="warning",
                        risk_desc=error_msg,
                    )
            except IntegrityError as e:
                self.stats["failed"] += 1
                error_msg = f"第{row_num}行数据冲突: {str(e)}"
                self.stats["errors"].append(error_msg)
            except Exception as e:
                self.stats["failed"] += 1
                error_msg = f"第{row_num}行异常: {str(e)}"
                self.stats["errors"].append(error_msg)

        with get_db() as db:
            import_record = DataImportRecord(
                batch_no=self.batch_no,
                import_type=import_type,
                file_name=file_name,
                total_count=self.stats["total"],
                success_count=self.stats["success"],
                failed_count=self.stats["failed"],
                dirty_count=self.stats["dirty"],
                operator=self.operator,
                remark="; ".join(self.stats["errors"][:10]),
            )
            db.add(import_record)

        AuditService.log(
            operation_type="data_import",
            operation_subtype="batch_complete",
            target_type=import_type,
            after_value=self.stats,
            operator=self.operator,
            data_source=data_source,
            remark=f"批量导入完成: {import_type}",
        )

        return {
            "success": True,
            "batch_no": self.batch_no,
            "stats": self.stats,
        }
