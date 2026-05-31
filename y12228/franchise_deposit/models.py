from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from pathlib import Path
from typing import Optional


class BreachType(Enum):
    STORE_CLOSURE = "store_closure"
    EARLY_TERMINATION = "early_termination"
    QUALITY_VIOLATION = "quality_violation"
    PAYMENT_DEFAULT = "payment_default"
    UNAUTHORIZED_OPERATION = "unauthorized_operation"
    OTHER = "other"


class StoreChangeStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class AdDeductionStatus(Enum):
    APPLIED = "applied"
    REVERSED = "reversed"
    SUPERSEDED = "superseded"


class ClearanceConclusion(Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    INSUFFICIENT_DATA = "insufficient_data"


@dataclass
class FranchiseContract:
    franchisee_id: str
    contract_id: str
    version: str
    deposit_standard: float
    effective_date: date
    expiry_date: date
    breach_penalty_rate: float
    ad_fund_rate: float
    allows_store_change: bool
    store_change_fee: float = 0.0
    notes: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> FranchiseContract:
        return cls(
            franchisee_id=d["franchisee_id"],
            contract_id=d["contract_id"],
            version=d["version"],
            deposit_standard=float(d["deposit_standard"]),
            effective_date=date.fromisoformat(d["effective_date"]),
            expiry_date=date.fromisoformat(d["expiry_date"]),
            breach_penalty_rate=float(d["breach_penalty_rate"]),
            ad_fund_rate=float(d["ad_fund_rate"]),
            allows_store_change=d.get("allows_store_change", False),
            store_change_fee=float(d.get("store_change_fee", 0.0)),
            notes=d.get("notes", ""),
        )


@dataclass
class DepositEntry:
    franchisee_id: str
    entry_id: str
    entry_date: date
    amount: float
    entry_type: str
    reference_contract_version: str
    description: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> DepositEntry:
        return cls(
            franchisee_id=d["franchisee_id"],
            entry_id=d["entry_id"],
            entry_date=date.fromisoformat(d["entry_date"]),
            amount=float(d["amount"]),
            entry_type=d["entry_type"],
            reference_contract_version=d.get("reference_contract_version", ""),
            description=d.get("description", ""),
        )


@dataclass
class DepositLedger:
    franchisee_id: str
    opening_balance: float
    entries: list[DepositEntry] = field(default_factory=list)

    @property
    def closing_balance(self) -> float:
        return self.opening_balance + sum(e.amount for e in self.entries)

    @classmethod
    def from_dict(cls, d: dict) -> DepositLedger:
        entries = [DepositEntry.from_dict(e) for e in d.get("entries", [])]
        return cls(
            franchisee_id=d["franchisee_id"],
            opening_balance=float(d["opening_balance"]),
            entries=entries,
        )


@dataclass
class StoreChangeApplication:
    application_id: str
    franchisee_id: str
    original_store: str
    new_store: str
    application_date: date
    approval_date: Optional[date]
    status: StoreChangeStatus
    transfer_amount: float
    contract_version_at_application: str
    reason: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> StoreChangeApplication:
        return cls(
            application_id=d["application_id"],
            franchisee_id=d["franchisee_id"],
            original_store=d["original_store"],
            new_store=d["new_store"],
            application_date=date.fromisoformat(d["application_date"]),
            approval_date=date.fromisoformat(d["approval_date"]) if d.get("approval_date") else None,
            status=StoreChangeStatus(d["status"]),
            transfer_amount=float(d["transfer_amount"]),
            contract_version_at_application=d.get("contract_version_at_application", ""),
            reason=d.get("reason", ""),
        )


@dataclass
class BreachPenalty:
    penalty_id: str
    franchisee_id: str
    breach_type: BreachType
    penalty_date: date
    penalty_amount: float
    contract_version: str
    description: str = ""
    disputed: bool = False

    @classmethod
    def from_dict(cls, d: dict) -> BreachPenalty:
        return cls(
            penalty_id=d["penalty_id"],
            franchisee_id=d["franchisee_id"],
            breach_type=BreachType(d["breach_type"]),
            penalty_date=date.fromisoformat(d["penalty_date"]),
            penalty_amount=float(d["penalty_amount"]),
            contract_version=d.get("contract_version", ""),
            description=d.get("description", ""),
            disputed=d.get("disputed", False),
        )


@dataclass
class AdFundDeduction:
    deduction_id: str
    franchisee_id: str
    deduction_date: date
    deduction_amount: float
    contract_version: str
    status: AdDeductionStatus
    superseded_by: Optional[str] = None
    description: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> AdFundDeduction:
        return cls(
            deduction_id=d["deduction_id"],
            franchisee_id=d["franchisee_id"],
            deduction_date=date.fromisoformat(d["deduction_date"]),
            deduction_amount=float(d["deduction_amount"]),
            contract_version=d.get("contract_version", ""),
            status=AdDeductionStatus(d["status"]),
            superseded_by=d.get("superseded_by"),
            description=d.get("description", ""),
        )


@dataclass
class EvidenceLink:
    source_type: str
    source_id: str
    description: str
    contract_version: str = ""
    raw_data: dict = field(default_factory=dict)


@dataclass
class ClearanceResult:
    franchisee_id: str
    conclusion: ClearanceConclusion
    contract_deposit_standard: float
    ledger_closing_balance: float
    discrepancy_amount: float
    evidence_chain: list[EvidenceLink] = field(default_factory=list)
    breach_penalties: list[BreachPenalty] = field(default_factory=list)
    ad_deductions: list[AdFundDeduction] = field(default_factory=list)
    store_changes: list[StoreChangeApplication] = field(default_factory=list)
    applied_contract: Optional[FranchiseContract] = None
    plain_language_summary: str = ""
    detail_notes: list[str] = field(default_factory=list)


def load_contracts(path: Path) -> list[FranchiseContract]:
    data = _load_json(path)
    return [FranchiseContract.from_dict(d) for d in data]


def load_ledgers(path: Path) -> list[DepositLedger]:
    data = _load_json(path)
    return [DepositLedger.from_dict(d) for d in data]


def load_store_changes(path: Path) -> list[StoreChangeApplication]:
    data = _load_json(path)
    return [StoreChangeApplication.from_dict(d) for d in data]


def load_breach_penalties(path: Path) -> list[BreachPenalty]:
    data = _load_json(path)
    return [BreachPenalty.from_dict(d) for d in data]


def load_ad_deductions(path: Path) -> list[AdFundDeduction]:
    data = _load_json(path)
    return [AdFundDeduction.from_dict(d) for d in data]


def _load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = json.load(f)
    if isinstance(content, list):
        return content
    return [content]
