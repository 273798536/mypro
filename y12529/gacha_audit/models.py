from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


@dataclass
class ProbEntry:
    item_id: str
    item_name: str
    rarity: str
    probability: float

    def to_dict(self) -> dict:
        return {
            "item_id": self.item_id,
            "item_name": self.item_name,
            "rarity": self.rarity,
            "probability": self.probability,
        }

    @classmethod
    def from_dict(cls, d: dict) -> ProbEntry:
        return cls(
            item_id=d["item_id"],
            item_name=d["item_name"],
            rarity=d["rarity"],
            probability=d["probability"],
        )


@dataclass
class ProbConfig:
    pool_id: str
    pool_name: str
    version: str
    entries: list[ProbEntry] = field(default_factory=list)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "pool_id": self.pool_id,
            "pool_name": self.pool_name,
            "version": self.version,
            "entries": [e.to_dict() for e in self.entries],
            "valid_from": self.valid_from,
            "valid_to": self.valid_to,
        }

    @classmethod
    def from_dict(cls, d: dict) -> ProbConfig:
        return cls(
            pool_id=d["pool_id"],
            pool_name=d.get("pool_name", d["pool_id"]),
            version=d.get("version", "1"),
            entries=[ProbEntry.from_dict(e) for e in d.get("entries", [])],
            valid_from=d.get("valid_from"),
            valid_to=d.get("valid_to"),
        )

    @classmethod
    def load(cls, path: str) -> list[ProbConfig]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [cls.from_dict(d) for d in data]
        return [cls.from_dict(data)]


@dataclass
class PityRule:
    pool_id: str
    pity_type: str
    threshold: int
    guaranteed_rarity: str
    soft_pity_start: Optional[int] = None
    soft_pity_slope: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "pool_id": self.pool_id,
            "pity_type": self.pity_type,
            "threshold": self.threshold,
            "guaranteed_rarity": self.guaranteed_rarity,
            "soft_pity_start": self.soft_pity_start,
            "soft_pity_slope": self.soft_pity_slope,
        }

    @classmethod
    def from_dict(cls, d: dict) -> PityRule:
        return cls(
            pool_id=d["pool_id"],
            pity_type=d.get("pity_type", "hard"),
            threshold=d["threshold"],
            guaranteed_rarity=d["guaranteed_rarity"],
            soft_pity_start=d.get("soft_pity_start"),
            soft_pity_slope=d.get("soft_pity_slope"),
        )

    @classmethod
    def load(cls, path: str) -> list[PityRule]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [cls.from_dict(d) for d in data]
        return [cls.from_dict(data)]


@dataclass
class GachaRecord:
    seq: int
    player_id: str
    pool_id: str
    timestamp: str
    item_id: str
    item_name: str
    rarity: str
    is_guaranteed: Optional[bool] = None

    def to_dict(self) -> dict:
        return {
            "seq": self.seq,
            "player_id": self.player_id,
            "pool_id": self.pool_id,
            "timestamp": self.timestamp,
            "item_id": self.item_id,
            "item_name": self.item_name,
            "rarity": self.rarity,
            "is_guaranteed": self.is_guaranteed,
        }

    @classmethod
    def from_dict(cls, d: dict) -> GachaRecord:
        return cls(
            seq=d["seq"],
            player_id=d["player_id"],
            pool_id=d["pool_id"],
            timestamp=d["timestamp"],
            item_id=d["item_id"],
            item_name=d["item_name"],
            rarity=d["rarity"],
            is_guaranteed=d.get("is_guaranteed"),
        )


@dataclass
class GachaLog:
    records: list[GachaRecord] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"records": [r.to_dict() for r in self.records]}

    @classmethod
    def from_dict(cls, d: dict) -> GachaLog:
        return cls(records=[GachaRecord.from_dict(r) for r in d.get("records", [])])

    @classmethod
    def load(cls, path: str) -> GachaLog:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    def filter(
        self,
        pool_id: Optional[str] = None,
        player_id: Optional[str] = None,
        rarity: Optional[str] = None,
        time_from: Optional[str] = None,
        time_to: Optional[str] = None,
    ) -> GachaLog:
        filtered = self.records
        if pool_id:
            filtered = [r for r in filtered if r.pool_id == pool_id]
        if player_id:
            filtered = [r for r in filtered if r.player_id == player_id]
        if rarity:
            filtered = [r for r in filtered if r.rarity == rarity]
        if time_from:
            filtered = [r for r in filtered if r.timestamp >= time_from]
        if time_to:
            filtered = [r for r in filtered if r.timestamp <= time_to]
        return GachaLog(records=filtered)


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass
class AuditIssue:
    severity: Severity
    category: str
    pool_id: str
    description: str
    location: str
    detail: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "severity": self.severity.value,
            "category": self.category,
            "pool_id": self.pool_id,
            "description": self.description,
            "location": self.location,
            "detail": self.detail,
        }


@dataclass
class PityCounterSnapshot:
    player_id: str
    pool_id: str
    pity_type: str
    current_count: int
    threshold: int
    last_reset_seq: Optional[int] = None
    last_reset_timestamp: Optional[str] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "pool_id": self.pool_id,
            "pity_type": self.pity_type,
            "current_count": self.current_count,
            "threshold": self.threshold,
            "last_reset_seq": self.last_reset_seq,
            "last_reset_timestamp": self.last_reset_timestamp,
            "is_anomaly": self.is_anomaly,
            "anomaly_reason": self.anomaly_reason,
        }


@dataclass
class AuditVersion:
    version_id: str
    created_at: str
    prob_configs: list[ProbConfig] = field(default_factory=list)
    pity_rules: list[PityRule] = field(default_factory=list)
    issues: list[AuditIssue] = field(default_factory=list)
    pity_snapshots: list[PityCounterSnapshot] = field(default_factory=list)
    supplemental_for: Optional[str] = None
    filter_applied: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "version_id": self.version_id,
            "created_at": self.created_at,
            "prob_configs": [c.to_dict() for c in self.prob_configs],
            "pity_rules": [r.to_dict() for r in self.pity_rules],
            "issues": [i.to_dict() for i in self.issues],
            "pity_snapshots": [s.to_dict() for s in self.pity_snapshots],
            "supplemental_for": self.supplemental_for,
            "filter_applied": self.filter_applied,
        }

    @classmethod
    def from_dict(cls, d: dict) -> AuditVersion:
        return cls(
            version_id=d["version_id"],
            created_at=d["created_at"],
            prob_configs=[ProbConfig.from_dict(c) for c in d.get("prob_configs", [])],
            pity_rules=[PityRule.from_dict(r) for r in d.get("pity_rules", [])],
            issues=[
                AuditIssue(
                    severity=Severity(i["severity"]),
                    category=i["category"],
                    pool_id=i["pool_id"],
                    description=i["description"],
                    location=i["location"],
                    detail=i.get("detail", {}),
                )
                for i in d.get("issues", [])
            ],
            pity_snapshots=[
                PityCounterSnapshot(**s) for s in d.get("pity_snapshots", [])
            ],
            supplemental_for=d.get("supplemental_for"),
            filter_applied=d.get("filter_applied", {}),
        )
