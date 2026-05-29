from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel


class FarmerCreate(BaseModel):
    farmer_code: str
    name: str
    id_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    cooperative_id: Optional[str] = None


class FarmerOut(BaseModel):
    id: int
    farmer_code: str
    name: str
    id_number: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    cooperative_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QualityGradeCreate(BaseModel):
    grade_code: str
    grade_name: str
    price_multiplier: float
    description: Optional[str] = None


class QualityGradeOut(BaseModel):
    id: int
    grade_code: str
    grade_name: str
    price_multiplier: float
    description: Optional[str]

    class Config:
        from_attributes = True


class DeliveryTicketCreate(BaseModel):
    ticket_no: str
    farmer_code: str
    product_type: str
    gross_weight: float
    tare_weight: float = 0.0
    deduction_amount: float = 0.0
    deduction_reason: Optional[str] = None
    grade_code: Optional[str] = None
    market_price: Optional[float] = None
    delivery_date: date


class DeliveryTicketOut(BaseModel):
    id: int
    ticket_no: str
    farmer_id: int
    product_type: str
    gross_weight: float
    tare_weight: float
    deduction_amount: float
    deduction_reason: Optional[str]
    quality_grade_id: Optional[int]
    market_price: Optional[float]
    delivery_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FloorPriceAgreementCreate(BaseModel):
    agreement_no: str
    product_type: str
    floor_price: float
    start_date: date
    end_date: date


class FloorPriceAgreementOut(BaseModel):
    id: int
    agreement_no: str
    product_type: str
    floor_price: float
    start_date: date
    end_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class SettlementOut(BaseModel):
    id: int
    ticket_id: int
    farmer_id: int
    agreement_id: Optional[int]
    net_weight: Optional[float]
    adjusted_weight: Optional[float]
    market_price: Optional[float]
    floor_price: Optional[float]
    applied_price: Optional[float]
    price_source: Optional[str]
    net_amount: Optional[float]
    floor_difference: Optional[float]
    status: str
    verification_status: str
    verification_note: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChangeLogOut(BaseModel):
    id: int
    settlement_id: int
    change_type: str
    field_changed: str
    old_value: Optional[str]
    new_value: Optional[str]
    explanation: Optional[str]
    operator: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Phase1ImportRequest(BaseModel):
    farmers: list[FarmerCreate]
    tickets: list[DeliveryTicketCreate]
    grades: list[QualityGradeCreate]


class Phase2ImportRequest(BaseModel):
    agreements: list[FloorPriceAgreementCreate]


class PhaseImportSummary(BaseModel):
    created_farmers: int
    skipped_farmers: int
    created_tickets: int
    skipped_tickets: int
    created_settlements: int
    created_grades: int
    skipped_grades: int


class Phase2ImportSummary(BaseModel):
    created_agreements: int
    skipped_agreements: int
    updated_settlements: int
    unchanged_settlements: int
    change_details: list[dict]


class DeductionDisputeRequest(BaseModel):
    dispute_reason: str
    operator: str


class GradeReverifyRequest(BaseModel):
    new_grade_code: str
    reason: str
    operator: str


class ManualCorrectionRequest(BaseModel):
    corrections: dict[str, float]
    reason: str
    operator: str


class SettlementComparisonField(BaseModel):
    field: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    explanation: Optional[str] = None


class SettlementComparison(BaseModel):
    settlement_id: int
    ticket_no: str
    old_values: dict
    new_values: dict
    changed_fields: list[SettlementComparisonField]
    summary: Optional[str] = None


class PhaseImportResult(BaseModel):
    phase: str
    summary: PhaseImportSummary
    settlements: list[SettlementOut]


class Phase2ImportResult(BaseModel):
    phase: str
    summary: Phase2ImportSummary
    updated_settlements: list[SettlementOut]
