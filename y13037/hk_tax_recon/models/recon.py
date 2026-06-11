from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Any
import hashlib
import json


class ProcessStatus(str, Enum):
    PENDING = "待处理"
    MATCHED = "已匹配"
    MISMATCH = "不匹配"
    NEED_MANUAL = "需人工确认"
    VOUCHER_LATE = "凭证晚到"
    RESOLVED = "已解决"
    HISTORY_MISMATCH = "历史不一致"


@dataclass
class ApprovalEmail:
    source_file: str
    raw_fields: Dict[str, Any]
    batch_id: str = ""
    trade_date: Optional[str] = None
    approval_subject: Optional[str] = None
    approval_sender: Optional[str] = None
    approval_date: Optional[str] = None
    tax_amount: Optional[float] = None
    exchange_rate: Optional[float] = None
    ccy: Optional[str] = None
    remarks: Optional[str] = None
    normalized: bool = False
    normalized_field_map: Dict[str, str] = field(default_factory=dict)

    def row_key(self) -> str:
        key_parts = [
            str(self.batch_id or ""),
            str(self.trade_date or ""),
            str(self.tax_amount or ""),
            str(self.exchange_rate or ""),
        ]
        return hashlib.md5("|".join(key_parts).encode("utf-8")).hexdigest()[:12]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = "email"
        return d


@dataclass
class TaxRecord:
    source_file: str
    raw_fields: Dict[str, Any]
    batch_id: str = ""
    trade_date: Optional[str] = None
    settlement_date: Optional[str] = None
    tax_type: Optional[str] = None
    tax_amount_hkd: Optional[float] = None
    tax_amount_cny: Optional[float] = None
    exchange_rate: Optional[float] = None
    ccy: Optional[str] = None
    voucher_no: Optional[str] = None
    voucher_date: Optional[str] = None
    remarks: Optional[str] = None
    normalized: bool = False
    normalized_field_map: Dict[str, str] = field(default_factory=dict)

    def row_key(self) -> str:
        key_parts = [
            str(self.batch_id or ""),
            str(self.trade_date or ""),
            str(self.tax_amount_hkd or ""),
            str(self.tax_amount_cny or ""),
        ]
        return hashlib.md5("|".join(key_parts).encode("utf-8")).hexdigest()[:12]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = "tax"
        return d


@dataclass
class ReconItem:
    item_key: str
    batch_id: str
    trade_date: Optional[str] = None
    status: ProcessStatus = ProcessStatus.PENDING
    reason: Optional[str] = None
    next_step: Optional[str] = None
    email_row_key: Optional[str] = None
    tax_row_key: Optional[str] = None
    approval_subject: Optional[str] = None
    tax_type: Optional[str] = None
    tax_amount_hkd: Optional[float] = None
    tax_amount_cny: Optional[float] = None
    exchange_rate_from_email: Optional[float] = None
    exchange_rate_from_tax: Optional[float] = None
    exchange_rate_diff: Optional[float] = None
    run_round: int = 1
    remark: Optional[str] = None
    sources: List[str] = field(default_factory=list)
    voucher_no: Optional[str] = None
    voucher_date: Optional[str] = None
    voucher_expected_by: Optional[str] = None
    history_check: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class ReconBatch:
    batch_id: str
    created_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    filter_criteria: Dict[str, Any] = field(default_factory=dict)
    emails: List[ApprovalEmail] = field(default_factory=list)
    tax_records: List[TaxRecord] = field(default_factory=list)
    items: List[ReconItem] = field(default_factory=list)
    run_count: int = 0
    last_run_at: Optional[str] = None
    extra_remarks: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "created_at": self.created_at,
            "filter_criteria": self.filter_criteria,
            "run_count": self.run_count,
            "last_run_at": self.last_run_at,
            "extra_remarks": self.extra_remarks,
            "emails_count": len(self.emails),
            "tax_records_count": len(self.tax_records),
            "items_count": len(self.items),
            "status_summary": self.status_summary(),
        }

    def status_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for it in self.items:
            k = it.status.value
            summary[k] = summary.get(k, 0) + 1
        return summary

    def save(self, path: str) -> None:
        data = {
            "batch_id": self.batch_id,
            "created_at": self.created_at,
            "filter_criteria": self.filter_criteria,
            "run_count": self.run_count,
            "last_run_at": self.last_run_at,
            "extra_remarks": self.extra_remarks,
            "emails": [e.to_dict() for e in self.emails],
            "tax_records": [t.to_dict() for t in self.tax_records],
            "items": [i.to_dict() for i in self.items],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> "ReconBatch":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        batch = cls(
            batch_id=data["batch_id"],
            created_at=data.get("created_at", ""),
            filter_criteria=data.get("filter_criteria", {}),
            run_count=data.get("run_count", 0),
            last_run_at=data.get("last_run_at"),
            extra_remarks=data.get("extra_remarks", []),
        )
        for e in data.get("emails", []):
            batch.emails.append(ApprovalEmail(**{k: v for k, v in e.items() if k != "status"}))
        for t in data.get("tax_records", []):
            batch.tax_records.append(TaxRecord(**{k: v for k, v in t.items() if k != "status"}))
        for i in data.get("items", []):
            status = ProcessStatus(i["status"]) if "status" in i else ProcessStatus.PENDING
            item_data = {k: v for k, v in i.items() if k != "status"}
            item_data["status"] = status
            batch.items.append(ReconItem(**item_data))
        return batch
