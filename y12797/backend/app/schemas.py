from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ========== 反应条件 ==========
class ReactionConditionBase(BaseModel):
    condition_name: Optional[str] = None
    condition_value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    normalized_unit: Optional[str] = None
    normalized_value: Optional[float] = None
    is_unit_missing: Optional[bool] = False
    is_unit_mismatch: Optional[bool] = False
    is_abnormal: Optional[bool] = False
    issue_description: Optional[str] = None
    review_note: Optional[str] = None
    row_order: Optional[int] = 0


class ReactionConditionCreate(ReactionConditionBase):
    pass


class ReactionConditionOut(ReactionConditionBase):
    id: int

    class Config:
        from_attributes = True


# ========== 底物换算 ==========
class SubstrateConversionBase(BaseModel):
    substrate_name: Optional[str] = None
    cas_no: Optional[str] = None
    initial_concentration: Optional[float] = None
    initial_concentration_unit: Optional[str] = None
    initial_mass: Optional[float] = None
    initial_mass_unit: Optional[str] = None
    volume: Optional[float] = None
    volume_unit: Optional[str] = None
    molecular_weight: Optional[float] = None
    purity: Optional[float] = None
    final_concentration: Optional[float] = None
    final_concentration_unit: Optional[str] = None
    conversion_formula: Optional[str] = None
    conversion_note: Optional[str] = None
    is_weighing_insufficient: Optional[bool] = False
    weighing_precision: Optional[str] = None
    weighing_issue_explain: Optional[str] = None
    row_order: Optional[int] = 0


class SubstrateConversionCreate(SubstrateConversionBase):
    pass


class SubstrateConversionOut(SubstrateConversionBase):
    id: int

    class Config:
        from_attributes = True


# ========== 谱图数据 ==========
class SpectrumDataBase(BaseModel):
    spectrum_type: Optional[str] = None
    detection_wavelength: Optional[str] = None
    column_info: Optional[str] = None
    retention_time: Optional[float] = None
    peak_area: Optional[float] = None
    peak_height: Optional[float] = None
    peak_name: Optional[str] = None
    is_overlap: Optional[bool] = False
    overlap_with: Optional[str] = None
    overlap_severity: Optional[str] = None
    overlap_note: Optional[str] = None
    raw_data_json: Optional[Dict[str, Any]] = None
    interpretation: Optional[str] = None
    interpretation_linked: Optional[bool] = True
    row_order: Optional[int] = 0


class SpectrumDataCreate(SpectrumDataBase):
    pass


class SpectrumDataOut(SpectrumDataBase):
    id: int

    class Config:
        from_attributes = True


# ========== 状态日志 ==========
class StatusLogOut(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    operator: Optional[str] = None
    operation_note: Optional[str] = None
    operated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== 审计追踪 ==========
class AuditTrailOut(BaseModel):
    id: int
    action_type: Optional[str] = None
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    operator: Optional[str] = None
    trace_note: Optional[str] = None
    operated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== 处理记录主表 ==========
class ProcessingRecordBase(BaseModel):
    batch_no: Optional[str] = None
    material_name: Optional[str] = None
    source_file_name: Optional[str] = None
    source_format: Optional[str] = "manual"
    remark: Optional[str] = None
    supplementary_note: Optional[str] = None
    safety_note: Optional[str] = None
    processing_opinion: Optional[str] = None


class ProcessingRecordCreate(ProcessingRecordBase):
    reaction_conditions: List[ReactionConditionCreate] = []
    substrate_conversions: List[SubstrateConversionCreate] = []
    spectrum_data: List[SpectrumDataCreate] = []


class ProcessingRecordOut(ProcessingRecordBase):
    id: int
    record_no: str
    status: str
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    exporter: Optional[str] = None
    exported_at: Optional[datetime] = None
    has_temp_unit_mix: bool = False
    temp_unit_issue_detail: Optional[Dict[str, Any]] = None
    has_peak_overlap: bool = False
    peak_overlap_detail: Optional[Dict[str, Any]] = None
    has_weighing_issue: bool = False
    weighing_issue_detail: Optional[Dict[str, Any]] = None
    missing_unit_fields: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProcessingRecordDetailOut(ProcessingRecordOut):
    reaction_conditions: List[ReactionConditionOut] = []
    substrate_conversions: List[SubstrateConversionOut] = []
    spectrum_data: List[SpectrumDataOut] = []
    status_logs: List[StatusLogOut] = []
    audit_trails: List[AuditTrailOut] = []


class ProcessingRecordListOut(BaseModel):
    total: int
    items: List[ProcessingRecordOut]


# ========== 导入结果 ==========
class ImportResultOut(BaseModel):
    success: bool
    record_id: Optional[int] = None
    record_no: Optional[str] = None
    warnings: List[str] = []
    errors: List[str] = []
    missing_units: List[Dict[str, Any]] = []
    temp_unit_issues: List[Dict[str, Any]] = []


# ========== 复核提交 ==========
class ReviewSubmitIn(BaseModel):
    reviewer: str
    processing_opinion: Optional[str] = None
    safety_note: Optional[str] = None
    supplementary_note: Optional[str] = None
    reaction_condition_reviews: Optional[Dict[int, str]] = None  # {cond_id: review_note}
    spectrum_interpretations: Optional[Dict[int, str]] = None  # {spec_id: interpretation}
    pass_review: bool = True


# ========== 状态推进 ==========
class StatusTransitionIn(BaseModel):
    operator: str
    operation_note: Optional[str] = None


# ========== 导出结果 ==========
class ExportResultOut(BaseModel):
    success: bool
    file_name: Optional[str] = None
    download_url: Optional[str] = None
    report_plain_explain: Optional[str] = None
