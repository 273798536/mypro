from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class WeighingForm(Base):
    __tablename__ = "weighing_forms"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), index=True, nullable=False)
    tank_no = Column(String(20), nullable=False)
    reagent_name = Column(String(100), nullable=False)
    required_amount = Column(Float, nullable=True)
    actual_amount = Column(Float, nullable=True)
    unit = Column(String(20), nullable=True)
    weighing_operator = Column(String(50), nullable=True)
    weighing_date = Column(DateTime, nullable=True)
    weighing_time = Column(String(20), nullable=True)
    balance_no = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    supplement_remarks = Column(Text, nullable=True)
    is_supplement = Column(Boolean, default=False)
    supplement_source = Column(String(100), nullable=True)
    is_bad_data = Column(Boolean, default=False)
    bad_data_reason = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reagent_ledger = relationship("ReagentLedger", back_populates="weighing_form", uselist=False)
    treatment_opinion = relationship("TreatmentOpinion", back_populates="weighing_form", uselist=False)
    batch_tracks = relationship("BatchTrack", back_populates="weighing_form")


class ReagentLedger(Base):
    __tablename__ = "reagent_ledgers"

    id = Column(Integer, primary_key=True, index=True)
    weighing_form_id = Column(Integer, ForeignKey("weighing_forms.id"), nullable=False)
    reagent_batch_no = Column(String(100), nullable=True)
    reagent_cas_no = Column(String(50), nullable=True)
    purity = Column(String(50), nullable=True)
    concentration = Column(String(50), nullable=True)
    concentration_value = Column(Float, nullable=True)
    concentration_unit = Column(String(20), nullable=True)
    manufacturer = Column(String(100), nullable=True)
    production_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    storage_condition = Column(String(200), nullable=True)
    receiver = Column(String(50), nullable=True)
    receive_date = Column(DateTime, nullable=True)
    usage_record = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    weighing_form = relationship("WeighingForm", back_populates="reagent_ledger")


class TreatmentOpinion(Base):
    __tablename__ = "treatment_opinions"

    id = Column(Integer, primary_key=True, index=True)
    weighing_form_id = Column(Integer, ForeignKey("weighing_forms.id"), nullable=False)
    inspector = Column(String(50), nullable=True)
    inspection_date = Column(DateTime, nullable=True)
    original_concentration = Column(Float, nullable=True)
    target_concentration = Column(Float, nullable=True)
    calculated_supplement = Column(Float, nullable=True)
    actual_supplement = Column(Float, nullable=True)
    spectrum_peak_overlap = Column(Boolean, default=False)
    overlap_material = Column(String(200), nullable=True)
    overlap_details = Column(Text, nullable=True)
    preliminary_judgment = Column(String(50), nullable=True)
    final_judgment = Column(String(50), nullable=True)
    judgment_changed = Column(Boolean, default=False)
    change_reason = Column(Text, nullable=True)
    manual_confirm = Column(Boolean, default=False)
    confirmer = Column(String(50), nullable=True)
    confirm_date = Column(DateTime, nullable=True)
    confirm_remarks = Column(Text, nullable=True)
    report_exported = Column(Boolean, default=False)
    report_export_time = Column(DateTime, nullable=True)
    report_version = Column(Integer, default=1)
    run_count = Column(Integer, default=1)
    last_run_time = Column(DateTime, nullable=True)
    processing_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    weighing_form = relationship("WeighingForm", back_populates="treatment_opinion")
    batch_tracks = relationship("BatchTrack", back_populates="treatment_opinion")


class BatchTrack(Base):
    __tablename__ = "batch_tracks"

    id = Column(Integer, primary_key=True, index=True)
    weighing_form_id = Column(Integer, ForeignKey("weighing_forms.id"), nullable=False)
    treatment_opinion_id = Column(Integer, ForeignKey("treatment_opinions.id"), nullable=True)
    batch_no = Column(String(50), index=True, nullable=False)
    track_type = Column(String(50), nullable=False)
    operation_type = Column(String(50), nullable=False)
    before_judgment = Column(String(50), nullable=True)
    after_judgment = Column(String(50), nullable=True)
    judgment_difference = Column(Text, nullable=True)
    operator = Column(String(50), nullable=True)
    operation_time = Column(DateTime, default=datetime.utcnow)
    operation_remarks = Column(Text, nullable=True)
    data_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    weighing_form = relationship("WeighingForm", back_populates="batch_tracks")
    treatment_opinion = relationship("TreatmentOpinion", back_populates="batch_tracks")
