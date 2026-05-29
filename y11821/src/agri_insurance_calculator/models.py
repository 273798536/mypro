from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field, field_validator


class DamageLevel(str, Enum):
    NONE = "无损失"
    MILD = "轻度"
    MODERATE = "中度"
    SEVERE = "重度"
    TOTAL = "绝收"


class VoucherStatus(str, Enum):
    PENDING = "待审核"
    VERIFIED = "已核实"
    DISPUTED = "有争议"
    REJECTED = "已驳回"
    APPROVED = "已通过"


class DataSource(str, Enum):
    FARMER_ARCHIVE = "农户档案"
    SATELLITE_POLYGON = "卫星图斑"
    SIGNATURE_FORM = "签字表"
    FIELD_INVESTIGATION = "现场勘查"
    CALCULATION = "系统测算"


class SourceReference(BaseModel):
    source: DataSource
    file_path: str
    field: Optional[str] = None
    line_number: Optional[int] = None
    raw_value: Optional[str] = None

    def format(self) -> str:
        ref = f"[{self.source.value}] {self.file_path}"
        if self.field:
            ref += f" → {self.field}"
        if self.raw_value:
            ref += f" = {self.raw_value}"
        return ref


class FarmerArchive(BaseModel):
    farmer_id: str
    name: str
    id_card: str
    village: str
    phone: str
    insurance_type: str
    insured_area: float
    premium_amount: float
    insurance_amount: float
    source_ref: SourceReference
    file_path: str

    @field_validator('insured_area')
    def area_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("投保面积必须大于0")
        return v


class Point(BaseModel):
    x: float
    y: float


class LandParcel(BaseModel):
    parcel_id: str
    farmer_id: str
    farmer_name: str
    village: str
    area: float
    boundary: List[Point]
    crop_type: str
    damage_level: DamageLevel = DamageLevel.NONE
    source_ref: SourceReference
    file_path: str
    is_overlapping: bool = False
    overlapping_with: List[str] = Field(default_factory=list)
    overlapping_area: float = 0.0


class SignatureRecord(BaseModel):
    record_id: str
    farmer_id: str
    farmer_name: str
    village: str
    reported_area: float
    reported_damage: str
    has_signature: bool
    signatory: Optional[str] = None
    signature_date: Optional[datetime] = None
    notes: Optional[str] = None
    source_ref: SourceReference
    file_path: str


class ConclusionTrace(BaseModel):
    conclusion_id: str
    conclusion: str
    value: Optional[Any] = None
    sources: List[SourceReference] = Field(default_factory=list)
    calculation_steps: List[str] = Field(default_factory=list)

    def add_source(self, source: SourceReference):
        self.sources.append(source)

    def add_step(self, step: str):
        self.calculation_steps.append(step)


class ActionItem(BaseModel):
    action_id: str
    type: str
    description: str
    responsible_person: str
    contact: Optional[str] = None
    file_to_modify: str
    field_to_fix: str
    priority: str = "高"
    status: str = "待处理"
    related_conclusion: str


class VoucherRecord(BaseModel):
    voucher_id: str
    farmer_id: str
    farmer_name: str
    village: str
    status: VoucherStatus
    area: float
    damage_level: DamageLevel
    compensation_amount: float
    traces: List[ConclusionTrace] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class DedupResult(BaseModel):
    original_parcel_id: str
    farmer_name: str
    original_area: float
    overlapping_area: float
    deduplicated_area: float
    overlapping_with: List[str]
    applied: bool = False
    trace: ConclusionTrace


class LevelChangeRecord(BaseModel):
    farmer_id: str
    farmer_name: str
    original_level: DamageLevel
    new_level: DamageLevel
    reason: str
    trace: ConclusionTrace
    action_item: ActionItem


class CalculationResult(BaseModel):
    batch_id: str
    calculated_at: datetime = Field(default_factory=datetime.now)
    total_farmers: int
    total_original_area: float
    total_deduplicated_area: float
    total_compensation: float
    status_summary: Dict[VoucherStatus, int] = Field(default_factory=dict)
    damage_summary: Dict[DamageLevel, float] = Field(default_factory=dict)
    vouchers: List[VoucherRecord] = Field(default_factory=list)
    dedup_results: List[DedupResult] = Field(default_factory=list)
    level_changes: List[LevelChangeRecord] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)
    missing_signatures: List[SignatureRecord] = Field(default_factory=list)
