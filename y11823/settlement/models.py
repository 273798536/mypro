from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


def _uid() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class Contract:
    contract_id: str
    artist_name: str
    tour_name: str
    guarantee_amount: float
    artist_split_ratio: float
    sponsor_deduction_order: str
    refund_cross_show: bool = False
    notes: str = ""

    def __post_init__(self):
        if self.artist_split_ratio < 0 or self.artist_split_ratio > 1:
            raise ValueError(
                f"artist_split_ratio must be 0~1, got {self.artist_split_ratio}"
            )
        if self.sponsor_deduction_order not in ("before_split", "after_split"):
            raise ValueError(
                f"sponsor_deduction_order must be 'before_split' or 'after_split', "
                f"got '{self.sponsor_deduction_order}'"
            )


@dataclass
class Show:
    show_id: str
    contract_id: str
    city: str
    show_date: str
    gross_box_office: Optional[float] = None
    refunds: Optional[float] = None
    notes: str = ""

    @property
    def net_box_office(self) -> float:
        gross = self.gross_box_office if self.gross_box_office is not None else 0.0
        ref = self.refunds if self.refunds is not None else 0.0
        return max(gross - ref, 0.0)


@dataclass
class Sponsorship:
    sponsorship_id: str
    contract_id: str
    sponsor_name: str
    amount: Optional[float] = None
    show_id: Optional[str] = None
    deduction_order: int = 0
    notes: str = ""

    @property
    def effective_amount(self) -> float:
        return self.amount if self.amount is not None else 0.0


@dataclass
class RefundTransfer:
    transfer_id: str = field(default_factory=_uid)
    from_show_id: str = ""
    to_show_id: str = ""
    amount: float = 0.0
    reason: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Settlement:
    settlement_id: str = field(default_factory=_uid)
    contract_id: str = ""
    show_id: str = ""
    city: str = ""
    show_date: str = ""
    gross_box_office: float = 0.0
    total_refunds: float = 0.0
    net_box_office: float = 0.0
    sponsor_deduction: float = 0.0
    base_for_split: float = 0.0
    artist_raw_share: float = 0.0
    guarantee_amount: float = 0.0
    is_guarantee_triggered: bool = False
    final_artist_payment: float = 0.0
    promoter_share: float = 0.0
    refund_transfers_in: float = 0.0
    refund_transfers_out: float = 0.0
    exception_notes: list = field(default_factory=list)
    sponsor_details: list = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "settlement_id": self.settlement_id,
            "contract_id": self.contract_id,
            "show_id": self.show_id,
            "city": self.city,
            "show_date": self.show_date,
            "gross_box_office": self.gross_box_office,
            "total_refunds": self.total_refunds,
            "net_box_office": self.net_box_office,
            "sponsor_deduction": self.sponsor_deduction,
            "base_for_split": self.base_for_split,
            "artist_raw_share": self.artist_raw_share,
            "guarantee_amount": self.guarantee_amount,
            "is_guarantee_triggered": self.is_guarantee_triggered,
            "final_artist_payment": self.final_artist_payment,
            "promoter_share": self.promoter_share,
            "refund_transfers_in": self.refund_transfers_in,
            "refund_transfers_out": self.refund_transfers_out,
            "exception_notes": self.exception_notes,
            "sponsor_details": self.sponsor_details,
        }
        return d


@dataclass
class AmendmentLog:
    log_id: str = field(default_factory=_uid)
    settlement_id: str = ""
    field_name: str = ""
    old_value: str = ""
    new_value: str = ""
    reason: str = ""
    operator: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "log_id": self.log_id,
            "settlement_id": self.settlement_id,
            "field_name": self.field_name,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "reason": self.reason,
            "operator": self.operator,
            "timestamp": self.timestamp,
        }
