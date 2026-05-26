"""P2P历史兑付清算 - 数据模型"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from enum import Enum
import hashlib
from datetime import datetime


class VoucherStatus(str, Enum):
    VALID = "valid"
    DUPLICATE = "duplicate"
    INVALID = "invalid"


class RepaymentStatus(str, Enum):
    CONFIRMED = "confirmed"
    PENDING = "pending"
    DISPUTED = "disputed"


class RepaymentType(str, Enum):
    PRINCIPAL = "principal"
    INTEREST = "interest"


class DisputeType(str, Enum):
    DUPLICATE_VOUCHER = "duplicate_voucher"
    INTEREST_CHANGE = "interest_change"
    NAME_CHANGE = "name_change"
    AMOUNT_MISMATCH = "amount_mismatch"
    MISSING_VOUCHER = "missing_voucher"


class DisputeStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    REJECTED = "rejected"


def voucher_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


@dataclass
class Investor:
    investor_id: str
    name: str
    aliases: List[str] = field(default_factory=list)
    id_card: Optional[str] = None
    merged_into: Optional[str] = None
    notes: str = ""

    def all_names(self) -> List[str]:
        names = [self.name] + self.aliases
        return [n for n in names if n]


@dataclass
class Contract:
    contract_id: str
    investor_id: str
    principal_amount: float
    interest_rate: float
    start_date: str
    maturity_date: str
    source: str = "contract_scan"
    notes: str = ""


@dataclass
class Voucher:
    voucher_id: str
    contract_id: str
    file_ref: str
    content_hash: str
    upload_date: str
    voucher_type: str = "receipt"
    status: VoucherStatus = VoucherStatus.VALID
    claimed_by: Optional[str] = None
    duplicate_of: Optional[str] = None
    source: str = ""
    notes: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class Repayment:
    repayment_id: str
    contract_id: str
    amount: float
    repayment_type: RepaymentType
    date: str
    voucher_id: Optional[str] = None
    status: RepaymentStatus = RepaymentStatus.PENDING
    source: str = ""
    notes: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["repayment_type"] = self.repayment_type.value
        d["status"] = self.status.value
        return d


@dataclass
class Dispute:
    dispute_id: str
    related_entity_id: str
    related_entity_type: str
    dispute_type: DisputeType
    description: str
    evidence: List[str] = field(default_factory=list)
    status: DisputeStatus = DisputeStatus.OPEN
    created_at: str = ""
    resolved_at: Optional[str] = None
    resolution_notes: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["dispute_type"] = self.dispute_type.value
        d["status"] = self.status.value
        return d


@dataclass
class AuditEntry:
    timestamp: str
    entity_type: str
    entity_id: str
    field: str
    old_value: str
    new_value: str
    operator: str
    reason: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Dataset:
    investors: Dict[str, Investor] = field(default_factory=dict)
    contracts: Dict[str, Contract] = field(default_factory=dict)
    vouchers: Dict[str, Voucher] = field(default_factory=dict)
    repayments: Dict[str, Repayment] = field(default_factory=dict)
    disputes: List[Dispute] = field(default_factory=list)
    audit_log: List[AuditEntry] = field(default_factory=list)

    def add_audit(self, entry: AuditEntry):
        self.audit_log.append(entry)

    def next_dispute_id(self) -> str:
        return f"D{len(self.disputes) + 1:04d}"

    def add_dispute(self, dispute: Dispute):
        self.disputes.append(dispute)
