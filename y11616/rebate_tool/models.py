from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum


class ImportConflictStrategy(Enum):
    SKIP = "skip"
    OVERWRITE = "overwrite"
    APPEND = "append"


class RecordStatus(Enum):
    VALID = "valid"
    CANCELLED = "cancelled"
    CORRECTED = "corrected"
    PENDING = "pending"


class RebateAnomalyType(Enum):
    INVITER_CHANGED = "inviter_changed"
    TIER_CHANGED = "tier_changed"
    TRADE_CANCELLED = "trade_cancelled"
    CROSS_WEEK_TIER = "cross_week_tier"
    DUPLICATE_IMPORT = "duplicate_import"
    MISSING_DATA = "missing_data"


@dataclass
class SourceInfo:
    source_file: str
    import_batch_id: str
    imported_at: str = field(default_factory=lambda: datetime.now().isoformat())
    import_index: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_file": self.source_file,
            "import_batch_id": self.import_batch_id,
            "imported_at": self.imported_at,
            "import_index": self.import_index,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SourceInfo":
        return cls(
            source_file=d.get("source_file", ""),
            import_batch_id=d.get("import_batch_id", ""),
            imported_at=d.get("imported_at", ""),
            import_index=d.get("import_index", 0),
        )


@dataclass
class TradeAccount:
    account_id: str
    agent_name: str
    created_at: str = ""
    source: SourceInfo = field(default_factory=lambda: SourceInfo("", ""))
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "account_id": self.account_id,
            "agent_name": self.agent_name,
            "created_at": self.created_at,
            "source": self.source.to_dict(),
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TradeAccount":
        return cls(
            account_id=d["account_id"],
            agent_name=d["agent_name"],
            created_at=d.get("created_at", ""),
            source=SourceInfo.from_dict(d.get("source", {})),
            version=d.get("version", 1),
        )


@dataclass
class ReferralLink:
    account_id: str
    inviter_id: Optional[str]
    week: str
    effective_from: str
    effective_to: Optional[str] = None
    is_active: bool = True
    source: SourceInfo = field(default_factory=lambda: SourceInfo("", ""))
    version: int = 1
    link_id: str = ""

    def __post_init__(self):
        if not self.link_id:
            self.link_id = f"{self.account_id}_{self.inviter_id or 'root'}_{self.week}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "link_id": self.link_id,
            "account_id": self.account_id,
            "inviter_id": self.inviter_id,
            "week": self.week,
            "effective_from": self.effective_from,
            "effective_to": self.effective_to,
            "is_active": self.is_active,
            "source": self.source.to_dict(),
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ReferralLink":
        return cls(
            account_id=d["account_id"],
            inviter_id=d.get("inviter_id"),
            week=d["week"],
            effective_from=d.get("effective_from", ""),
            effective_to=d.get("effective_to"),
            is_active=d.get("is_active", True),
            source=SourceInfo.from_dict(d.get("source", {})),
            version=d.get("version", 1),
            link_id=d.get("link_id", ""),
        )


@dataclass
class TradeVolume:
    account_id: str
    week: str
    trade_amount: float
    fee_amount: float
    volume_id: str = ""
    trade_count: int = 0
    status: RecordStatus = RecordStatus.VALID
    cancelled_id: Optional[str] = None
    source: SourceInfo = field(default_factory=lambda: SourceInfo("", ""))

    def __post_init__(self):
        if not self.volume_id:
            self.volume_id = f"{self.account_id}_{self.week}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "volume_id": self.volume_id,
            "account_id": self.account_id,
            "week": self.week,
            "trade_amount": self.trade_amount,
            "fee_amount": self.fee_amount,
            "trade_count": self.trade_count,
            "status": self.status.value,
            "cancelled_id": self.cancelled_id,
            "source": self.source.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TradeVolume":
        return cls(
            account_id=d["account_id"],
            week=d["week"],
            trade_amount=float(d.get("trade_amount", 0)),
            fee_amount=float(d.get("fee_amount", 0)),
            volume_id=d.get("volume_id", ""),
            trade_count=int(d.get("trade_count", 0)),
            status=RecordStatus(d.get("status", "valid")),
            cancelled_id=d.get("cancelled_id"),
            source=SourceInfo.from_dict(d.get("source", {})),
        )


@dataclass
class FeeTier:
    tier_id: str
    week: str
    volume_min: float
    volume_max: float
    fee_rate: float
    rebate_rate: float
    tier_name: str = ""
    is_snapshot: bool = False
    snapshot_of: Optional[str] = None
    source: SourceInfo = field(default_factory=lambda: SourceInfo("", ""))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tier_id": self.tier_id,
            "tier_name": self.tier_name,
            "week": self.week,
            "volume_min": self.volume_min,
            "volume_max": self.volume_max,
            "fee_rate": self.fee_rate,
            "rebate_rate": self.rebate_rate,
            "is_snapshot": self.is_snapshot,
            "snapshot_of": self.snapshot_of,
            "source": self.source.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "FeeTier":
        return cls(
            tier_id=d["tier_id"],
            week=d["week"],
            volume_min=float(d.get("volume_min", 0)),
            volume_max=float(d.get("volume_max", float("inf"))),
            fee_rate=float(d.get("fee_rate", 0)),
            rebate_rate=float(d.get("rebate_rate", 0)),
            tier_name=d.get("tier_name", ""),
            is_snapshot=d.get("is_snapshot", False),
            snapshot_of=d.get("snapshot_of"),
            source=SourceInfo.from_dict(d.get("source", {})),
        )


@dataclass
class RebateRecord:
    record_id: str
    account_id: str
    week: str
    base_rebate: float
    adjusted_rebate: float
    fee_rate: float
    rebate_rate: float
    trade_amount: float
    fee_amount: float
    inviter_chain: List[str] = field(default_factory=list)
    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    status: RecordStatus = RecordStatus.VALID
    is_corrected: bool = False
    corrected_from: Optional[str] = None
    source: SourceInfo = field(default_factory=lambda: SourceInfo("", ""))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "account_id": self.account_id,
            "week": self.week,
            "base_rebate": self.base_rebate,
            "adjusted_rebate": self.adjusted_rebate,
            "fee_rate": self.fee_rate,
            "rebate_rate": self.rebate_rate,
            "trade_amount": self.trade_amount,
            "fee_amount": self.fee_amount,
            "inviter_chain": self.inviter_chain,
            "anomalies": self.anomalies,
            "status": self.status.value,
            "is_corrected": self.is_corrected,
            "corrected_from": self.corrected_from,
            "source": self.source.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RebateRecord":
        return cls(
            record_id=d["record_id"],
            account_id=d["account_id"],
            week=d["week"],
            base_rebate=float(d.get("base_rebate", 0)),
            adjusted_rebate=float(d.get("adjusted_rebate", 0)),
            fee_rate=float(d.get("fee_rate", 0)),
            rebate_rate=float(d.get("rebate_rate", 0)),
            trade_amount=float(d.get("trade_amount", 0)),
            fee_amount=float(d.get("fee_amount", 0)),
            inviter_chain=d.get("inviter_chain", []),
            anomalies=d.get("anomalies", []),
            status=RecordStatus(d.get("status", "valid")),
            is_corrected=d.get("is_corrected", False),
            corrected_from=d.get("corrected_from"),
            source=SourceInfo.from_dict(d.get("source", {})),
        )


@dataclass
class SettlementReport:
    report_id: str
    week: str
    total_volume: float
    total_rebate: float
    account_count: int
    anomaly_count: int
    cancelled_rebate: float
    corrected_rebate: float
    records: List[Dict[str, Any]] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "week": self.week,
            "total_volume": self.total_volume,
            "total_rebate": self.total_rebate,
            "account_count": self.account_count,
            "anomaly_count": self.anomaly_count,
            "cancelled_rebate": self.cancelled_rebate,
            "corrected_rebate": self.corrected_rebate,
            "records": self.records,
            "generated_at": self.generated_at,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SettlementReport":
        return cls(
            report_id=d["report_id"],
            week=d["week"],
            total_volume=float(d.get("total_volume", 0)),
            total_rebate=float(d.get("total_rebate", 0)),
            account_count=int(d.get("account_count", 0)),
            anomaly_count=int(d.get("anomaly_count", 0)),
            cancelled_rebate=float(d.get("cancelled_rebate", 0)),
            corrected_rebate=float(d.get("corrected_rebate", 0)),
            records=d.get("records", []),
            generated_at=d.get("generated_at", ""),
        )


@dataclass
class CorrectionLog:
    correction_id: str
    target_type: str
    target_id: str
    field: str
    old_value: Any
    new_value: Any
    reason: str
    corrected_at: str = field(default_factory=lambda: datetime.now().isoformat())
    operator: str = "system"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "correction_id": self.correction_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "reason": self.reason,
            "corrected_at": self.corrected_at,
            "operator": self.operator,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CorrectionLog":
        return cls(
            correction_id=d["correction_id"],
            target_type=d["target_type"],
            target_id=d["target_id"],
            field=d["field"],
            old_value=d.get("old_value"),
            new_value=d.get("new_value"),
            reason=d.get("reason", ""),
            corrected_at=d.get("corrected_at", ""),
            operator=d.get("operator", "system"),
        )


@dataclass
class RebateAnomaly:
    anomaly_type: RebateAnomalyType
    account_id: str
    week: str
    description: str
    details: Dict[str, Any] = field(default_factory=dict)
    record_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_type": self.anomaly_type.value,
            "account_id": self.account_id,
            "week": self.week,
            "description": self.description,
            "details": self.details,
            "record_id": self.record_id,
        }
