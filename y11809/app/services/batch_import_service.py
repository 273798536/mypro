from sqlalchemy.orm import Session
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import traceback
from app.models.models import (
    StudentCard, RechargeRecord, ConsumeRevoke, SubsidyRule,
    BatchImportLog, CardMergeRecord
)
from app.services.refund_service import BalanceService


class DirtyDataHandler:

    REQUIRED_FIELDS = {
        "student_card": ["card_no"],
        "recharge_record": ["card_no", "recharge_no", "amount"],
        "consume_revoke": ["card_no", "revoke_no", "amount"],
        "subsidy_rule": ["rule_code"],
    }

    FIELD_ALIASES = {
        "card_no": ["卡号", "card_no", "cardno", "cardNumber", "卡编号"],
        "student_id": ["学号", "student_id", "studentid", "studentNo"],
        "student_name": ["姓名", "student_name", "name", "学生姓名"],
        "department": ["院系", "department", "dept", "学院"],
        "recharge_no": ["充值单号", "recharge_no", "rechargeno", "流水号"],
        "amount": ["金额", "amount", "money", "交易金额"],
        "subsidy_amount": ["补贴金额", "subsidy_amount", "补贴"],
        "self_amount": ["自付金额", "self_amount", "自付"],
        "subsidy_rule_code": ["补贴规则", "subsidy_rule_code", "rule_code"],
        "is_subsidy": ["是否补贴", "is_subsidy", "补贴标记"],
        "is_refundable": ["是否可退", "is_refundable", "可退"],
        "recharge_time": ["充值时间", "recharge_time", "time", "交易时间"],
        "operator": ["操作员", "operator", "操作人"],
        "window_no": ["窗口号", "window_no", "window"],
        "revoke_no": ["撤销单号", "revoke_no", "撤销编号"],
        "original_consume_no": ["原消费单号", "original_consume_no"],
        "consume_time": ["消费时间", "consume_time"],
        "revoke_time": ["撤销时间", "revoke_time"],
        "rule_code": ["规则编号", "rule_code", "规则代码"],
        "rule_name": ["规则名称", "rule_name", "规则名"],
        "subsidy_type": ["补贴类型", "subsidy_type"],
        "effective_date": ["生效日期", "effective_date"],
        "expiry_date": ["失效日期", "expiry_date"],
        "remark": ["备注", "remark", "说明", "note"],
    }

    @staticmethod
    def normalize_row(row_data: Dict[str, Any], import_type: str) -> Dict[str, Any]:
        """字段别名映射和数据清洗"""
        normalized: Dict[str, Any] = {}

        for std_field, aliases in DirtyDataHandler.FIELD_ALIASES.items():
            for alias in aliases:
                if alias in row_data and row_data[alias] is not None:
                    value = row_data[alias]
                    if isinstance(value, str):
                        value = value.strip()
                        if value == "" or value.lower() in ["null", "none", "nan"]:
                            value = None
                    normalized[std_field] = value
                    break

        for k, v in row_data.items():
            if k not in normalized and k not in [a for aliases in DirtyDataHandler.FIELD_ALIASES.values() for a in aliases]:
                if "remark" in normalized and normalized["remark"]:
                    normalized["remark"] = f"{normalized['remark']}; {k}:{v}"
                else:
                    normalized["remark"] = f"{k}:{v}"

        return normalized

    @staticmethod
    def validate_row(normalized: Dict[str, Any], import_type: str) -> Tuple[bool, Optional[str]]:
        """校验必填字段，缺失则返回错误"""
        required = DirtyDataHandler.REQUIRED_FIELDS.get(import_type, [])
        for field in required:
            if field not in normalized or normalized[field] is None:
                return False, f"必填字段缺失: {field}"
        return True, None

    @staticmethod
    def is_empty_row(row_data: Dict[str, Any]) -> bool:
        """判断是否空行"""
        if not row_data:
            return True
        for k, v in row_data.items():
            if v is not None and str(v).strip() != "":
                return False
        return True

    @staticmethod
    def parse_datetime(value: Any) -> Optional[datetime]:
        """容错解析日期时间"""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
                "%Y/%m/%d %H:%M:%S",
                "%Y/%m/%d %H:%M",
                "%Y/%m/%d",
                "%Y%m%d%H%M%S",
                "%Y%m%d",
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        return None

    @staticmethod
    def parse_float(value: Any) -> float:
        """容错解析数值"""
        if value is None or value == "":
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return 0.0
            value = value.replace(",", "").replace("￥", "").replace("¥", "")
            try:
                return float(value)
            except ValueError:
                return 0.0
        return 0.0

    @staticmethod
    def parse_bool(value: Any, default: bool = False) -> bool:
        """容错解析布尔值"""
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            v = value.strip().lower()
            if v in ["是", "true", "1", "yes", "y", "可退"]:
                return True
            if v in ["否", "false", "0", "no", "n", "不可退"]:
                return False
        return default


class BatchImportService:

    @staticmethod
    def import_student_cards(db: Session, items: List[Dict[str, Any]],
                             operator: str) -> BatchImportResult:
        batch_no = f"IMP-SC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        total = len(items)
        success = 0
        failed = 0
        skipped = 0
        failed_items = []
        skipped_items = []

        for item in items:
            row_num = item.get("row_number", 0)
            row_data = item.get("row_data", {})

            try:
                if DirtyDataHandler.is_empty_row(row_data):
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": "空行"})
                    continue

                normalized = DirtyDataHandler.normalize_row(row_data, "student_card")
                valid, err = DirtyDataHandler.validate_row(normalized, "student_card")
                if not valid:
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": err, "data": row_data})
                    continue

                card = db.query(StudentCard).filter(
                    StudentCard.card_no == normalized["card_no"]
                ).first()

                if card:
                    card.student_id = normalized.get("student_id") or card.student_id
                    card.student_name = normalized.get("student_name") or card.student_name
                    card.department = normalized.get("department") or card.department
                    if normalized.get("remark"):
                        card.remark = normalized["remark"]
                    card.updated_at = datetime.now()
                else:
                    card = StudentCard(
                        card_no=normalized["card_no"],
                        student_id=normalized.get("student_id"),
                        student_name=normalized.get("student_name"),
                        department=normalized.get("department"),
                        remark=normalized.get("remark"),
                        status="normal"
                    )
                    db.add(card)

                db.flush()
                BalanceService.update_card_balance(db, normalized["card_no"])
                success += 1

            except Exception as e:
                db.rollback()
                failed += 1
                failed_items.append({
                    "row": row_num,
                    "reason": str(e),
                    "traceback": traceback.format_exc()[:500],
                    "data": row_data
                })
                continue

        db.commit()

        log = BatchImportLog(
            batch_no=batch_no,
            import_type="student_card",
            total_count=total,
            success_count=success,
            failed_count=failed,
            skipped_count=skipped,
            operator=operator,
            error_details=str(failed_items + skipped_items)[:2000]
        )
        db.add(log)
        db.commit()

        return {
            "batch_no": batch_no,
            "total_count": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
            "failed_items": failed_items,
            "skipped_items": skipped_items
        }

    @staticmethod
    def import_recharge_records(db: Session, items: List[Dict[str, Any]],
                                operator: str) -> BatchImportResult:
        batch_no = f"IMP-RC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        total = len(items)
        success = 0
        failed = 0
        skipped = 0
        failed_items = []
        skipped_items = []

        for item in items:
            row_num = item.get("row_number", 0)
            row_data = item.get("row_data", {})

            try:
                if DirtyDataHandler.is_empty_row(row_data):
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": "空行"})
                    continue

                normalized = DirtyDataHandler.normalize_row(row_data, "recharge_record")
                valid, err = DirtyDataHandler.validate_row(normalized, "recharge_record")
                if not valid:
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": err, "data": row_data})
                    continue

                card_no = normalized["card_no"]
                card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
                if not card:
                    card = StudentCard(
                        card_no=card_no,
                        status="normal",
                        remark=f"自动创建: 充值导入 {batch_no}"
                    )
                    db.add(card)
                    db.flush()

                existing = db.query(RechargeRecord).filter(
                    RechargeRecord.recharge_no == normalized["recharge_no"]
                ).first()

                if existing:
                    skipped += 1
                    skipped_items.append({
                        "row": row_num,
                        "reason": f"充值单号已存在: {normalized['recharge_no']}",
                        "data": row_data
                    })
                    continue

                amount = DirtyDataHandler.parse_float(normalized.get("amount"))
                subsidy_amount = DirtyDataHandler.parse_float(normalized.get("subsidy_amount"))
                self_amount = DirtyDataHandler.parse_float(normalized.get("self_amount"))

                if self_amount == 0 and subsidy_amount == 0 and amount > 0:
                    is_subsidy = DirtyDataHandler.parse_bool(normalized.get("is_subsidy"), False)
                    if is_subsidy:
                        subsidy_amount = amount
                    else:
                        self_amount = amount

                record = RechargeRecord(
                    card_no=card_no,
                    recharge_no=normalized["recharge_no"],
                    recharge_type=normalized.get("recharge_type"),
                    amount=round(amount, 2),
                    subsidy_amount=round(subsidy_amount, 2),
                    self_amount=round(self_amount, 2),
                    subsidy_rule_code=normalized.get("subsidy_rule_code"),
                    is_subsidy=DirtyDataHandler.parse_bool(normalized.get("is_subsidy"), subsidy_amount > 0),
                    is_refundable=DirtyDataHandler.parse_bool(normalized.get("is_refundable"), True),
                    recharge_time=DirtyDataHandler.parse_datetime(normalized.get("recharge_time")) or datetime.now(),
                    operator=normalized.get("operator") or operator,
                    window_no=normalized.get("window_no"),
                    remark=normalized.get("remark")
                )
                db.add(record)
                db.flush()
                BalanceService.update_card_balance(db, card_no)
                success += 1

            except Exception as e:
                db.rollback()
                failed += 1
                failed_items.append({
                    "row": row_num,
                    "reason": str(e),
                    "traceback": traceback.format_exc()[:500],
                    "data": row_data
                })
                continue

        db.commit()

        log = BatchImportLog(
            batch_no=batch_no,
            import_type="recharge_record",
            total_count=total,
            success_count=success,
            failed_count=failed,
            skipped_count=skipped,
            operator=operator,
            error_details=str(failed_items + skipped_items)[:2000]
        )
        db.add(log)
        db.commit()

        return {
            "batch_no": batch_no,
            "total_count": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
            "failed_items": failed_items,
            "skipped_items": skipped_items
        }

    @staticmethod
    def import_consume_revokes(db: Session, items: List[Dict[str, Any]],
                               operator: str) -> BatchImportResult:
        batch_no = f"IMP-CR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        total = len(items)
        success = 0
        failed = 0
        skipped = 0
        failed_items = []
        skipped_items = []

        for item in items:
            row_num = item.get("row_number", 0)
            row_data = item.get("row_data", {})

            try:
                if DirtyDataHandler.is_empty_row(row_data):
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": "空行"})
                    continue

                normalized = DirtyDataHandler.normalize_row(row_data, "consume_revoke")
                valid, err = DirtyDataHandler.validate_row(normalized, "consume_revoke")
                if not valid:
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": err, "data": row_data})
                    continue

                card_no = normalized["card_no"]
                card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
                if not card:
                    card = StudentCard(
                        card_no=card_no,
                        status="normal",
                        remark=f"自动创建: 撤销导入 {batch_no}"
                    )
                    db.add(card)
                    db.flush()

                existing = db.query(ConsumeRevoke).filter(
                    ConsumeRevoke.revoke_no == normalized["revoke_no"]
                ).first()

                if existing:
                    skipped += 1
                    skipped_items.append({
                        "row": row_num,
                        "reason": f"撤销单号已存在: {normalized['revoke_no']}",
                        "data": row_data
                    })
                    continue

                consume_time = DirtyDataHandler.parse_datetime(normalized.get("consume_time"))
                revoke_time = DirtyDataHandler.parse_datetime(normalized.get("revoke_time")) or datetime.now()
                is_cross_day = False
                if consume_time and revoke_time:
                    is_cross_day = consume_time.date() != revoke_time.date()

                record = ConsumeRevoke(
                    card_no=card_no,
                    revoke_no=normalized["revoke_no"],
                    original_consume_no=normalized.get("original_consume_no"),
                    amount=round(DirtyDataHandler.parse_float(normalized.get("amount")), 2),
                    consume_time=consume_time,
                    revoke_time=revoke_time,
                    is_cross_day=is_cross_day,
                    operator=normalized.get("operator") or operator,
                    window_no=normalized.get("window_no"),
                    remark=normalized.get("remark")
                )
                db.add(record)
                db.flush()
                BalanceService.update_card_balance(db, card_no)
                success += 1

            except Exception as e:
                db.rollback()
                failed += 1
                failed_items.append({
                    "row": row_num,
                    "reason": str(e),
                    "traceback": traceback.format_exc()[:500],
                    "data": row_data
                })
                continue

        db.commit()

        log = BatchImportLog(
            batch_no=batch_no,
            import_type="consume_revoke",
            total_count=total,
            success_count=success,
            failed_count=failed,
            skipped_count=skipped,
            operator=operator,
            error_details=str(failed_items + skipped_items)[:2000]
        )
        db.add(log)
        db.commit()

        return {
            "batch_no": batch_no,
            "total_count": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
            "failed_items": failed_items,
            "skipped_items": skipped_items
        }

    @staticmethod
    def import_subsidy_rules(db: Session, items: List[Dict[str, Any]],
                             operator: str) -> BatchImportResult:
        batch_no = f"IMP-SR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        total = len(items)
        success = 0
        failed = 0
        skipped = 0
        failed_items = []
        skipped_items = []

        for item in items:
            row_num = item.get("row_number", 0)
            row_data = item.get("row_data", {})

            try:
                if DirtyDataHandler.is_empty_row(row_data):
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": "空行"})
                    continue

                normalized = DirtyDataHandler.normalize_row(row_data, "subsidy_rule")
                valid, err = DirtyDataHandler.validate_row(normalized, "subsidy_rule")
                if not valid:
                    skipped += 1
                    skipped_items.append({"row": row_num, "reason": err, "data": row_data})
                    continue

                existing = db.query(SubsidyRule).filter(
                    SubsidyRule.rule_code == normalized["rule_code"]
                ).first()

                if existing:
                    existing.rule_name = normalized.get("rule_name") or existing.rule_name
                    existing.subsidy_type = normalized.get("subsidy_type") or existing.subsidy_type
                    existing.is_refundable = DirtyDataHandler.parse_bool(
                        normalized.get("is_refundable"), existing.is_refundable
                    )
                    if normalized.get("effective_date"):
                        existing.effective_date = DirtyDataHandler.parse_datetime(normalized["effective_date"])
                    if normalized.get("expiry_date"):
                        existing.expiry_date = DirtyDataHandler.parse_datetime(normalized["expiry_date"])
                    existing.department = normalized.get("department") or existing.department
                    existing.student_level = normalized.get("student_level") or existing.student_level
                    if normalized.get("remark"):
                        existing.remark = normalized["remark"]
                else:
                    rule = SubsidyRule(
                        rule_code=normalized["rule_code"],
                        rule_name=normalized.get("rule_name"),
                        subsidy_type=normalized.get("subsidy_type"),
                        is_refundable=DirtyDataHandler.parse_bool(normalized.get("is_refundable"), True),
                        effective_date=DirtyDataHandler.parse_datetime(normalized.get("effective_date")),
                        expiry_date=DirtyDataHandler.parse_datetime(normalized.get("expiry_date")),
                        department=normalized.get("department"),
                        student_level=normalized.get("student_level"),
                        remark=normalized.get("remark")
                    )
                    db.add(rule)

                db.flush()
                success += 1

            except Exception as e:
                db.rollback()
                failed += 1
                failed_items.append({
                    "row": row_num,
                    "reason": str(e),
                    "traceback": traceback.format_exc()[:500],
                    "data": row_data
                })
                continue

        db.commit()

        log = BatchImportLog(
            batch_no=batch_no,
            import_type="subsidy_rule",
            total_count=total,
            success_count=success,
            failed_count=failed,
            skipped_count=skipped,
            operator=operator,
            error_details=str(failed_items + skipped_items)[:2000]
        )
        db.add(log)
        db.commit()

        return {
            "batch_no": batch_no,
            "total_count": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
            "failed_items": failed_items,
            "skipped_items": skipped_items
        }
