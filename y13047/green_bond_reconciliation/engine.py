import csv
import re
import uuid
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from pathlib import Path

from .models import (
    ReconciliationRecord,
    ReconciliationStatus,
    ChangeHistory,
    ChangeType,
)


FIELD_ALIASES = {
    "bond_code": ["债券代码", "债券编码", "代码", "bond_code", "bondCode", "BondCode"],
    "bond_name": ["债券名称", "名称", "债券简称", "bond_name", "bondName", "BondName"],
    "raise_amount": ["募集金额", "募集款", "发行金额", "募集规模", "raise_amount", "raiseAmount"],
    "used_amount": ["已使用金额", "使用金额", "已用金额", "投放金额", "used_amount", "usedAmount"],
    "tax_amount": ["税费", "税金", "税额", "税", "tax_amount", "taxAmount", "tax"],
    "exchange_rate": ["汇率", "汇价", "兑换率", "exchange_rate", "exchangeRate", "rate"],
    "currency": ["币种", "货币", "currency", "Currency"],
    "source": ["来源", "数据来源", "提供方", "source", "Source"],
    "supplement": ["补充说明", "备注", "说明", "补充", "备注说明", "supplement", "remark", "Remark"],
}

SUPPLEMENT_PATTERNS = {
    "tax": [r"税费[：:]\s*([\d,.]+)", r"税金[：:]\s*([\d,.]+)", r"税[：:]\s*([\d,.]+)"],
    "exchange_rate": [r"汇率[：:]\s*([\d,.]+)", r"汇价[：:]\s*([\d,.]+)", r"兑换率[：:]\s*([\d,.]+)"],
    "late_document": [r"凭证晚到", r"晚到", r"后补凭证", r"凭证后补"],
    "pending": [r"待补件", r"待补充", r"缺少材料", r"缺材料", r"需补充"],
    "reject": [r"退回", r"不予确认", r"不通过", r"驳回"],
    "confirm": [r"已确认", r"确认无误", r"核对通过", r"没问题"],
}


def normalize_field_name(raw_name: str) -> Optional[str]:
    raw_name_stripped = raw_name.strip()
    for std_name, aliases in FIELD_ALIASES.items():
        if raw_name_stripped in aliases or raw_name_stripped.lower() == std_name.lower():
            return std_name
    return None


def parse_supplement_text(text: str) -> Dict:
    result = {
        "tax_amount": None,
        "exchange_rate": None,
        "late_document": False,
        "suggested_status": None,
        "matched_text": "",
    }
    if not text:
        return result

    for pattern in SUPPLEMENT_PATTERNS["tax"]:
        m = re.search(pattern, text)
        if m:
            try:
                result["tax_amount"] = float(m.group(1).replace(",", ""))
            except (ValueError, AttributeError):
                pass
            break

    for pattern in SUPPLEMENT_PATTERNS["exchange_rate"]:
        m = re.search(pattern, text)
        if m:
            try:
                result["exchange_rate"] = float(m.group(1).replace(",", ""))
            except (ValueError, AttributeError):
                pass
            break

    for pattern in SUPPLEMENT_PATTERNS["late_document"]:
        if re.search(pattern, text):
            result["late_document"] = True
            break

    for pattern in SUPPLEMENT_PATTERNS["confirm"]:
        m = re.search(pattern, text)
        if m:
            result["suggested_status"] = ReconciliationStatus.CONFIRMED
            result["matched_text"] = m.group(0)
            return result

    for pattern in SUPPLEMENT_PATTERNS["reject"]:
        m = re.search(pattern, text)
        if m:
            result["suggested_status"] = ReconciliationStatus.REJECTED
            result["matched_text"] = text.strip()
            return result

    for pattern in SUPPLEMENT_PATTERNS["pending"]:
        m = re.search(pattern, text)
        if m:
            result["suggested_status"] = ReconciliationStatus.PENDING_DOCUMENT
            result["matched_text"] = text.strip()
            return result

    return result


def parse_float(value) -> Optional[float]:
    if value is None or str(value).strip() == "":
        return None
    try:
        cleaned = str(value).strip().replace(",", "").replace("¥", "").replace("￥", "")
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def read_csv_with_any_header(file_path: str) -> Tuple[List[Dict], Dict[str, str]]:
    field_mappings = {}
    records = []

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        raw_headers = reader.fieldnames or []

        for raw_header in raw_headers:
            std_name = normalize_field_name(raw_header)
            if std_name:
                field_mappings[raw_header] = std_name

        for row in reader:
            normalized_row = {}
            for raw_key, value in row.items():
                std_key = field_mappings.get(raw_key, raw_key)
                normalized_row[std_key] = value
            normalized_row["_raw"] = dict(row)
            normalized_row["_field_mappings"] = dict(field_mappings)
            records.append(normalized_row)

    return records, field_mappings


def auto_determine_status(record: ReconciliationRecord, parsed_supp: Dict) -> ReconciliationStatus:
    if parsed_supp["suggested_status"]:
        status = parsed_supp["suggested_status"]
        if status == ReconciliationStatus.REJECTED:
            record.failed_reason = parsed_supp.get("matched_text", "") or "补充说明标注为退回"
        elif status == ReconciliationStatus.PENDING_DOCUMENT:
            record.failed_reason = parsed_supp.get("matched_text", "") or "补充说明标注为待补件"
        return status

    if parsed_supp["late_document"]:
        record.failed_reason = "凭证晚到，需后续补充核对"
        return ReconciliationStatus.PENDING_DOCUMENT

    if not record.bond_code or not record.bond_name:
        record.failed_reason = "缺少债券代码或名称"
        return ReconciliationStatus.UNMATCHED

    if record.raise_amount is None or record.used_amount is None:
        record.failed_reason = "缺少募集金额或使用金额"
        return ReconciliationStatus.PENDING_DOCUMENT

    if record.used_amount > record.raise_amount:
        record.failed_reason = "使用金额超过募集金额"
        return ReconciliationStatus.REJECTED

    return ReconciliationStatus.CONFIRMED


class ReconciliationEngine:
    def __init__(self):
        self.records: List[ReconciliationRecord] = []
        self.field_mappings: Dict[str, str] = {}

    def load_csv(self, file_path: str, source_tag: str = "") -> Tuple[int, List[str]]:
        errors = []
        path = Path(file_path)
        if not path.exists():
            errors.append(f"文件不存在: {file_path}")
            return 0, errors

        try:
            rows, mappings = read_csv_with_any_header(file_path)
            self.field_mappings.update(mappings)
        except Exception as e:
            errors.append(f"读取CSV失败: {str(e)}")
            return 0, errors

        for idx, row in enumerate(rows, start=2):
            try:
                record = self._row_to_record(row, path.name, idx, source_tag)
                self.records.append(record)
            except Exception as e:
                errors.append(f"第{idx}行解析失败: {str(e)}")

        return len(self.records), errors

    def _row_to_record(self, row: Dict, source_file: str, source_row: int, source_tag: str) -> ReconciliationRecord:
        raw_data = row.get("_raw", {})
        field_mappings = row.get("_field_mappings", {})

        bond_code = str(row.get("bond_code", "") or "").strip()
        bond_name = str(row.get("bond_name", "") or "").strip()
        raise_amount = parse_float(row.get("raise_amount"))
        used_amount = parse_float(row.get("used_amount"))
        tax_amount = parse_float(row.get("tax_amount"))
        exchange_rate = parse_float(row.get("exchange_rate"))
        currency = str(row.get("currency", "CNY") or "CNY").strip()
        source = str(row.get("source", source_tag) or source_tag).strip()
        supplement = str(row.get("supplement", "") or "").strip()

        parsed_supp = parse_supplement_text(supplement)
        if tax_amount is None and parsed_supp["tax_amount"] is not None:
            tax_amount = parsed_supp["tax_amount"]
        if exchange_rate is None and parsed_supp["exchange_rate"] is not None:
            exchange_rate = parsed_supp["exchange_rate"]

        record = ReconciliationRecord(
            record_id=str(uuid.uuid4()),
            source_file=source_file,
            source_row=source_row,
            bond_code=bond_code,
            bond_name=bond_name,
            raise_amount=raise_amount or 0.0,
            used_amount=used_amount or 0.0,
            tax_amount=tax_amount,
            exchange_rate=exchange_rate,
            currency=currency,
            source=source,
            raw_data=raw_data,
            supplement=supplement,
            late_document=parsed_supp["late_document"],
            field_mappings=field_mappings,
        )

        impact_parts = []
        if tax_amount is not None:
            impact_parts.append(f"税费:{tax_amount}")
        if exchange_rate is not None:
            impact_parts.append(f"汇率:{exchange_rate}")
        if parsed_supp["late_document"]:
            impact_parts.append("凭证晚到")
        record.impact_scope = ";".join(impact_parts)

        status = auto_determine_status(record, parsed_supp)
        record.status = status

        if status != ReconciliationStatus.UNMATCHED:
            record.add_history(ChangeHistory(
                timestamp=datetime.now().isoformat(),
                change_type=ChangeType.AUTO_DETECTED,
                old_status=None,
                new_status=status,
                operator="system",
                remark=f"自动识别状态，来源行:{source_row}",
                new_values={"status": status.value, "impact_scope": record.impact_scope},
            ))

        return record

    def run_reconciliation(self) -> Dict:
        summary = {
            "total": len(self.records),
            "confirmed": 0,
            "pending_document": 0,
            "rejected": 0,
            "unmatched": 0,
            "late_document": 0,
            "with_field_mappings": 0,
            "field_mappings": self.field_mappings,
        }

        for r in self.records:
            if r.status == ReconciliationStatus.CONFIRMED:
                summary["confirmed"] += 1
            elif r.status == ReconciliationStatus.PENDING_DOCUMENT:
                summary["pending_document"] += 1
            elif r.status == ReconciliationStatus.REJECTED:
                summary["rejected"] += 1
            else:
                summary["unmatched"] += 1

            if r.late_document:
                summary["late_document"] += 1
            if r.field_mappings:
                summary["with_field_mappings"] += 1

        return summary

    def manual_confirm(self, record_id: str, operator: str, new_status: ReconciliationStatus,
                       remark: str = "", **kwargs) -> bool:
        for r in self.records:
            if r.record_id == record_id:
                old_status = r.status
                old_values = {"status": old_status.value}
                if "tax_amount" in kwargs and kwargs["tax_amount"] is not None:
                    old_values["tax_amount"] = r.tax_amount
                    r.tax_amount = kwargs["tax_amount"]
                if "exchange_rate" in kwargs and kwargs["exchange_rate"] is not None:
                    old_values["exchange_rate"] = r.exchange_rate
                    r.exchange_rate = kwargs["exchange_rate"]
                if "late_document" in kwargs:
                    old_values["late_document"] = r.late_document
                    r.late_document = kwargs["late_document"]

                r.status = new_status
                r.failed_reason = ""

                change_type = ChangeType.MANUAL_CONFIRMED
                if old_status != ReconciliationStatus.UNMATCHED and old_status != new_status:
                    change_type = ChangeType.MANUAL_RECONSIDERED
                if kwargs.get("late_document") is False and old_values.get("late_document") is True:
                    change_type = ChangeType.DOCUMENT_ARRIVED_LATE

                new_values = {"status": new_status.value}
                if "tax_amount" in kwargs:
                    new_values["tax_amount"] = r.tax_amount
                if "exchange_rate" in kwargs:
                    new_values["exchange_rate"] = r.exchange_rate
                if "late_document" in kwargs:
                    new_values["late_document"] = r.late_document

                r.add_history(ChangeHistory(
                    timestamp=datetime.now().isoformat(),
                    change_type=change_type,
                    old_status=old_status,
                    new_status=new_status,
                    operator=operator,
                    remark=remark,
                    old_values=old_values,
                    new_values=new_values,
                ))
                return True
        return False

    def get_records_by_status(self, status: ReconciliationStatus) -> List[ReconciliationRecord]:
        return [r for r in self.records if r.status == status]

    def get_record_history(self, record_id: str) -> Optional[List[ChangeHistory]]:
        for r in self.records:
            if r.record_id == record_id:
                return r.history
        return None
