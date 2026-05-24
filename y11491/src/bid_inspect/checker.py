from datetime import datetime
from typing import Dict, List, Callable, Any
from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from .models import BidRecord, RecordStatus, RecordType, CheckRule, CheckResult


class CheckRuleBase(ABC):
    code: str
    name: str
    rule_type: str

    @abstractmethod
    def check(self, record: BidRecord) -> tuple[bool, str]:
        pass


class QualificationValidityCheck(CheckRuleBase):
    code = "QUAL_VALIDITY"
    name = "资质有效期检查"
    rule_type = "qualification"

    def check(self, record: BidRecord) -> tuple[bool, str]:
        if record.record_type != RecordType.QUALIFICATION:
            return True, "跳过非资质记录"

        if not record.valid_until:
            return False, "缺少有效期信息"

        if record.valid_until < datetime.now():
            return False, f"资质已过期 (过期日期: {record.valid_until.date()})"

        return True, "资质在有效期内"


class PriceAmountCheck(CheckRuleBase):
    code = "PRICE_AMOUNT"
    name = "报价金额检查"
    rule_type = "price"

    def check(self, record: BidRecord) -> tuple[bool, str]:
        if record.record_type != RecordType.PRICE_VERSION:
            return True, "跳过非报价记录"

        if record.total_amount is None:
            return False, "金额为空"

        if record.total_amount <= 0:
            return False, f"金额异常: {record.total_amount}"

        return True, f"金额正常: {record.total_amount}"


class ScanPageCheck(CheckRuleBase):
    code = "SCAN_PAGE"
    name = "扫描件页码检查"
    rule_type = "scan"

    def check(self, record: BidRecord) -> tuple[bool, str]:
        if record.record_type != RecordType.SEALED_SCAN:
            return True, "跳过非扫描记录"

        if record.scan_page is None:
            return False, "页码为空"

        if record.scan_page <= 0:
            return False, f"页码异常: {record.scan_page}"

        return True, f"页码正常: {record.scan_page}"


class SupplierNameCheck(CheckRuleBase):
    code = "SUPPLIER_NAME"
    name = "供应商名称检查"
    rule_type = "general"

    def check(self, record: BidRecord) -> tuple[bool, str]:
        if not record.supplier_name or not record.supplier_name.strip():
            return False, "供应商名称为空"

        if len(record.supplier_name) < 2:
            return False, f"供应商名称过短: {record.supplier_name}"

        return True, f"供应商名称正常: {record.supplier_name}"


class CheckRuleRegistry:
    _rules: Dict[str, CheckRuleBase] = {}

    @classmethod
    def register(cls, rule_class):
        rule = rule_class()
        cls._rules[rule.code] = rule
        return rule_class

    @classmethod
    def get_all_rules(cls) -> List[CheckRuleBase]:
        return list(cls._rules.values())

    @classmethod
    def get_rule(cls, code: str) -> CheckRuleBase:
        return cls._rules.get(code)

    @classmethod
    def get_rules_by_type(cls, rule_type: str) -> List[CheckRuleBase]:
        return [r for r in cls._rules.values() if r.rule_type == rule_type]


CheckRuleRegistry.register(QualificationValidityCheck)
CheckRuleRegistry.register(PriceAmountCheck)
CheckRuleRegistry.register(ScanPageCheck)
CheckRuleRegistry.register(SupplierNameCheck)


class CheckService:
    def __init__(self, db: Session):
        self.db = db

    def init_rules(self):
        for rule in CheckRuleRegistry.get_all_rules():
            existing = (
                self.db.query(CheckRule)
                .filter(CheckRule.rule_code == rule.code)
                .first()
            )
            if not existing:
                db_rule = CheckRule(
                    rule_code=rule.code,
                    rule_name=rule.name,
                    rule_type=rule.rule_type,
                    is_enabled=True,
                )
                self.db.add(db_rule)
        self.db.commit()

    def check_record(self, record: BidRecord) -> Dict[str, Any]:
        results = []
        all_passed = True

        self.db.query(CheckResult).filter(CheckResult.record_id == record.id).delete()

        for rule in CheckRuleRegistry.get_all_rules():
            db_rule = (
                self.db.query(CheckRule)
                .filter(CheckRule.rule_code == rule.code)
                .first()
            )
            if not db_rule or not db_rule.is_enabled:
                continue

            passed, detail = rule.check(record)
            if not passed:
                all_passed = False

            result = CheckResult(
                record_id=record.id,
                rule_code=rule.code,
                is_passed=passed,
                detail=detail,
            )
            self.db.add(result)
            results.append({
                "rule_code": rule.code,
                "rule_name": rule.name,
                "passed": passed,
                "detail": detail,
            })

        if all_passed:
            record.status = RecordStatus.VALID
        else:
            record.status = RecordStatus.INVALID

        self.db.commit()

        return {
            "record_id": record.id,
            "all_passed": all_passed,
            "results": results,
        }

    def check_all(self, record_type: RecordType = None) -> Dict[str, Any]:
        query = self.db.query(BidRecord)
        if record_type:
            query = query.filter(BidRecord.record_type == record_type)

        records = query.all()
        total = len(records)
        passed = 0
        failed = 0
        results = []

        for record in records:
            result = self.check_record(record)
            results.append(result)
            if result["all_passed"]:
                passed += 1
            else:
                failed += 1

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "details": results,
        }
