from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SampleMaterialBase(BaseModel):
    material_name: str
    material_type: Optional[str] = None
    material_value: Optional[str] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    is_original: Optional[bool] = True
    is_dirty: Optional[bool] = False
    is_name_mismatch: Optional[bool] = False
    raw_value: Optional[str] = None


class SampleMaterialCreate(SampleMaterialBase):
    pass


class SampleMaterial(SampleMaterialBase):
    id: int
    sample_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LabelConflictBase(BaseModel):
    field_name: str
    field_label: str
    source_a: str
    value_a: str
    source_b: str
    value_b: str
    conflict_type: Optional[str] = "value_mismatch"
    is_resolved: Optional[bool] = False
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None


class LabelConflictCreate(LabelConflictBase):
    pass


class LabelConflict(LabelConflictBase):
    id: int
    sample_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ManualAdjustmentBase(BaseModel):
    adjuster: str
    reason: str
    score_after: float
    status_after: str
    risk_level_after: Optional[str] = None
    source: Optional[str] = "manual_review"
    source_ref: Optional[str] = None


class ManualAdjustmentCreate(ManualAdjustmentBase):
    pass


class ManualAdjustment(ManualAdjustmentBase):
    id: int
    sample_id: int
    score_before: float
    status_before: str
    risk_level_before: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SampleSnapshotBase(BaseModel):
    snapshot_type: str
    snapshot_data: dict
    created_by: Optional[str] = None


class SampleSnapshotCreate(SampleSnapshotBase):
    pass


class SampleSnapshot(SampleSnapshotBase):
    id: int
    sample_id: int
    adjustment_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SampleBase(BaseModel):
    sample_no: str
    customer_name: Optional[str] = None
    id_card: Optional[str] = None
    original_score: Optional[float] = None
    current_score: Optional[float] = None
    status: Optional[str] = "pending_review"
    risk_level: Optional[str] = None
    has_label_conflict: Optional[bool] = False
    has_name_mismatch: Optional[bool] = False
    has_material_mismatch: Optional[bool] = False


class SampleCreate(SampleBase):
    materials: Optional[List[SampleMaterialCreate]] = []
    label_conflicts: Optional[List[LabelConflictCreate]] = []


class SampleUpdate(BaseModel):
    customer_name: Optional[str] = None
    id_card: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None


class SampleList(BaseModel):
    id: int
    sample_no: str
    customer_name: Optional[str] = None
    id_card: Optional[str] = None
    original_score: Optional[float] = None
    current_score: Optional[float] = None
    status: str
    risk_level: Optional[str] = None
    has_label_conflict: bool
    has_name_mismatch: bool
    has_material_mismatch: bool
    review_count: int
    adjustment_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SampleDetail(SampleList):
    materials: List[SampleMaterial] = []
    adjustments: List[ManualAdjustment] = []
    label_conflicts: List[LabelConflict] = []
    snapshots: List[SampleSnapshot] = []

    class Config:
        from_attributes = True


class SampleListResponse(BaseModel):
    total: int
    items: List[SampleList]


class ReviewStats(BaseModel):
    total: int
    processed: int
    material_missing: int
    manual_adjusted: int
    pending_review: int
    has_label_conflict: int
    has_name_mismatch: int
    avg_score_change: float
    total_adjustments: int


class AnomalySample(BaseModel):
    id: int
    sample_no: str
    customer_name: Optional[str]
    current_score: Optional[float]
    original_score: Optional[float]
    score_change: float
    adjustment_count: int
    anomaly_type: str
    anomaly_reason: str
