from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class WeighingFormBase(BaseModel):
    batch_no: str
    tank_no: str
    reagent_name: str
    required_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    unit: Optional[str] = None
    weighing_operator: Optional[str] = None
    weighing_date: Optional[datetime] = None
    weighing_time: Optional[str] = None
    balance_no: Optional[str] = None
    remarks: Optional[str] = None
    supplement_remarks: Optional[str] = None
    is_supplement: bool = False
    supplement_source: Optional[str] = None
    is_bad_data: bool = False
    bad_data_reason: Optional[str] = None


class WeighingFormCreate(WeighingFormBase):
    pass


class WeighingFormUpdate(BaseModel):
    batch_no: Optional[str] = None
    tank_no: Optional[str] = None
    reagent_name: Optional[str] = None
    required_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    unit: Optional[str] = None
    weighing_operator: Optional[str] = None
    weighing_date: Optional[datetime] = None
    weighing_time: Optional[str] = None
    balance_no: Optional[str] = None
    remarks: Optional[str] = None
    supplement_remarks: Optional[str] = None
    is_supplement: Optional[bool] = None
    supplement_source: Optional[str] = None
    is_bad_data: Optional[bool] = None
    bad_data_reason: Optional[str] = None


class WeighingForm(WeighingFormBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReagentLedgerBase(BaseModel):
    weighing_form_id: int
    reagent_batch_no: Optional[str] = None
    reagent_cas_no: Optional[str] = None
    purity: Optional[str] = None
    concentration: Optional[str] = None
    concentration_value: Optional[float] = None
    concentration_unit: Optional[str] = None
    manufacturer: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    storage_condition: Optional[str] = None
    receiver: Optional[str] = None
    receive_date: Optional[datetime] = None
    usage_record: Optional[str] = None
    remarks: Optional[str] = None


class ReagentLedgerCreate(ReagentLedgerBase):
    pass


class ReagentLedgerUpdate(BaseModel):
    reagent_batch_no: Optional[str] = None
    reagent_cas_no: Optional[str] = None
    purity: Optional[str] = None
    concentration: Optional[str] = None
    concentration_value: Optional[float] = None
    concentration_unit: Optional[str] = None
    manufacturer: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    storage_condition: Optional[str] = None
    receiver: Optional[str] = None
    receive_date: Optional[datetime] = None
    usage_record: Optional[str] = None
    remarks: Optional[str] = None


class ReagentLedger(ReagentLedgerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TreatmentOpinionBase(BaseModel):
    weighing_form_id: int
    inspector: Optional[str] = None
    inspection_date: Optional[datetime] = None
    original_concentration: Optional[float] = None
    target_concentration: Optional[float] = None
    calculated_supplement: Optional[float] = None
    actual_supplement: Optional[float] = None
    spectrum_peak_overlap: bool = False
    overlap_material: Optional[str] = None
    overlap_details: Optional[str] = None
    preliminary_judgment: Optional[str] = None
    final_judgment: Optional[str] = None
    judgment_changed: bool = False
    change_reason: Optional[str] = None
    manual_confirm: bool = False
    confirmer: Optional[str] = None
    confirm_date: Optional[datetime] = None
    confirm_remarks: Optional[str] = None
    report_exported: bool = False
    report_export_time: Optional[datetime] = None
    report_version: int = 1
    run_count: int = 1
    last_run_time: Optional[datetime] = None
    processing_remarks: Optional[str] = None


class TreatmentOpinionCreate(TreatmentOpinionBase):
    pass


class TreatmentOpinionUpdate(BaseModel):
    inspector: Optional[str] = None
    inspection_date: Optional[datetime] = None
    original_concentration: Optional[float] = None
    target_concentration: Optional[float] = None
    calculated_supplement: Optional[float] = None
    actual_supplement: Optional[float] = None
    spectrum_peak_overlap: Optional[bool] = None
    overlap_material: Optional[str] = None
    overlap_details: Optional[str] = None
    preliminary_judgment: Optional[str] = None
    final_judgment: Optional[str] = None
    judgment_changed: Optional[bool] = None
    change_reason: Optional[str] = None
    manual_confirm: Optional[bool] = None
    confirmer: Optional[str] = None
    confirm_date: Optional[datetime] = None
    confirm_remarks: Optional[str] = None
    report_exported: Optional[bool] = None
    report_export_time: Optional[datetime] = None
    report_version: Optional[int] = None
    run_count: Optional[int] = None
    last_run_time: Optional[datetime] = None
    processing_remarks: Optional[str] = None


class TreatmentOpinion(TreatmentOpinionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchTrackBase(BaseModel):
    weighing_form_id: int
    treatment_opinion_id: Optional[int] = None
    batch_no: str
    track_type: str
    operation_type: str
    before_judgment: Optional[str] = None
    after_judgment: Optional[str] = None
    judgment_difference: Optional[str] = None
    operator: Optional[str] = None
    operation_remarks: Optional[str] = None
    data_version: int = 1


class BatchTrackCreate(BatchTrackBase):
    pass


class BatchTrack(BatchTrackBase):
    id: int
    operation_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class WeighingFormDetail(WeighingForm):
    reagent_ledger: Optional[ReagentLedger] = None
    treatment_opinion: Optional[TreatmentOpinion] = None
    batch_tracks: List[BatchTrack] = []
