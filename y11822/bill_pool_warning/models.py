from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import date, timedelta
from enum import Enum
from typing import Optional


class BillStatus(Enum):
    ACCEPTED = "承兑"
    DISCOUNTED = "贴现"
    PLEDGED = "质押"
    MATURITY_PENDING = "即将到期"
    MATURED = "到期"
    RELEASED = "释放"
    OVERDUE = "逾期"


class PledgeStatus(Enum):
    ACTIVE = "生效中"
    RELEASED = "已释放"
    OVERDUE_RELEASE = "释放延迟"


_VALID_TRANSITIONS = {
    BillStatus.ACCEPTED: {BillStatus.DISCOUNTED, BillStatus.PLEDGED},
    BillStatus.DISCOUNTED: {BillStatus.MATURITY_PENDING},
    BillStatus.PLEDGED: {BillStatus.MATURITY_PENDING, BillStatus.RELEASED},
    BillStatus.MATURITY_PENDING: {BillStatus.MATURED, BillStatus.RELEASED},
    BillStatus.MATURED: {BillStatus.RELEASED, BillStatus.OVERDUE},
    BillStatus.OVERDUE: {BillStatus.RELEASED},
    BillStatus.RELEASED: set(),
}


class StateMachineError(Exception):
    pass


@dataclass
class Bill:
    bill_id: str
    bill_type: str
    amount: float
    issue_date: date
    maturity_date: date
    status: BillStatus = BillStatus.ACCEPTED
    pool_id: str = ""
    pledge_contract_id: Optional[str] = None
    extended_maturity_date: Optional[date] = None
    discount_date: Optional[date] = None
    pledge_date: Optional[date] = None
    release_date: Optional[date] = None
    _transition_log: list = field(default_factory=list)

    @property
    def effective_maturity_date(self) -> date:
        return self.extended_maturity_date or self.maturity_date

    def can_transition_to(self, target: BillStatus) -> bool:
        return target in _VALID_TRANSITIONS.get(self.status, set())

    def transition_to(self, target: BillStatus, reason: str = "") -> None:
        if not self.can_transition_to(target):
            raise StateMachineError(
                f"票据 {self.bill_id}: 不允许从 {self.status.value} 转换到 {target.value}"
            )
        old = self.status
        self.status = target
        self._transition_log.append({
            "from": old.value,
            "to": target.value,
            "reason": reason,
        })

    def days_to_maturity(self, reference_date: date) -> int:
        return (self.effective_maturity_date - reference_date).days

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        d["issue_date"] = self.issue_date.isoformat()
        d["maturity_date"] = self.maturity_date.isoformat()
        d["effective_maturity_date"] = self.effective_maturity_date.isoformat()
        if self.extended_maturity_date:
            d["extended_maturity_date"] = self.extended_maturity_date.isoformat()
        if self.discount_date:
            d["discount_date"] = self.discount_date.isoformat()
        if self.pledge_date:
            d["pledge_date"] = self.pledge_date.isoformat()
        if self.release_date:
            d["release_date"] = self.release_date.isoformat()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> Bill:
        d = dict(d)
        d["status"] = BillStatus(d["status"])
        d["issue_date"] = date.fromisoformat(d["issue_date"])
        d["maturity_date"] = date.fromisoformat(d["maturity_date"])
        if d.get("extended_maturity_date"):
            d["extended_maturity_date"] = date.fromisoformat(d["extended_maturity_date"])
        else:
            d["extended_maturity_date"] = None
        for key in ("discount_date", "pledge_date", "release_date"):
            if d.get(key):
                d[key] = date.fromisoformat(d[key])
            else:
                d[key] = None
        d.pop("effective_maturity_date", None)
        log = d.pop("_transition_log", [])
        obj = cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})
        obj._transition_log = log
        return obj


@dataclass
class PledgeContract:
    contract_id: str
    bill_ids: list[str] = field(default_factory=list)
    pledged_amount: float = 0.0
    pool_id: str = ""
    start_date: Optional[date] = None
    expected_release_date: Optional[date] = None
    actual_release_date: Optional[date] = None
    status: PledgeStatus = PledgeStatus.ACTIVE

    @property
    def is_overdue_release(self) -> bool:
        if self.actual_release_date and self.expected_release_date:
            return self.actual_release_date > self.expected_release_date
        return False

    @property
    def release_delay_days(self) -> int:
        if self.is_overdue_release:
            return (self.actual_release_date - self.expected_release_date).days
        return 0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        if self.start_date:
            d["start_date"] = self.start_date.isoformat()
        if self.expected_release_date:
            d["expected_release_date"] = self.expected_release_date.isoformat()
        if self.actual_release_date:
            d["actual_release_date"] = self.actual_release_date.isoformat()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> PledgeContract:
        d = dict(d)
        d["status"] = PledgeStatus(d["status"])
        for key in ("start_date", "expected_release_date", "actual_release_date"):
            if d.get(key):
                d[key] = date.fromisoformat(d[key])
            else:
                d[key] = None
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class PoolQuota:
    pool_id: str
    total_quota: float
    used_quota: float = 0.0
    pledged_quota: float = 0.0
    discounted_quota: float = 0.0

    @property
    def available_quota(self) -> float:
        return self.total_quota - self.used_quota

    @property
    def usage_ratio(self) -> float:
        if self.total_quota == 0:
            return 0.0
        return self.used_quota / self.total_quota

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> PoolQuota:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class BillPool:
    pool_id: str
    total_quota: float
    bills: list[Bill] = field(default_factory=list)
    pledge_contracts: list[PledgeContract] = field(default_factory=list)

    def compute_quota(self) -> PoolQuota:
        pledged = sum(b.amount for b in self.bills if b.status == BillStatus.PLEDGED)
        discounted = sum(b.amount for b in self.bills if b.status == BillStatus.DISCOUNTED)
        used = pledged + discounted
        return PoolQuota(
            pool_id=self.pool_id,
            total_quota=self.total_quota,
            used_quota=used,
            pledged_quota=pledged,
            discounted_quota=discounted,
        )

    def to_dict(self) -> dict:
        return {
            "pool_id": self.pool_id,
            "total_quota": self.total_quota,
            "bills": [b.to_dict() for b in self.bills],
            "pledge_contracts": [p.to_dict() for p in self.pledge_contracts],
        }

    @classmethod
    def from_dict(cls, d: dict) -> BillPool:
        bills = [Bill.from_dict(b) for b in d.get("bills", [])]
        pledges = [PledgeContract.from_dict(p) for p in d.get("pledge_contracts", [])]
        return cls(
            pool_id=d["pool_id"],
            total_quota=d["total_quota"],
            bills=bills,
            pledge_contracts=pledges,
        )
