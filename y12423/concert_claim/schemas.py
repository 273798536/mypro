from pydantic import BaseModel
from typing import Optional


class ClauseCreate(BaseModel):
    clause_code: str
    content: str
    deductible_rate: float = 0.0
    cross_city_clause: str = ""
    effective_date: str

class ClauseUpdate(BaseModel):
    content: Optional[str] = None
    deductible_rate: Optional[float] = None
    cross_city_clause: Optional[str] = None
    effective_date: Optional[str] = None

class RefundCreate(BaseModel):
    concert_name: str
    refund_amount: float
    refund_reason: str
    ticket_count: int = 0
    clause_code: str

class RefundUpdate(BaseModel):
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    ticket_count: Optional[int] = None
    clause_code: Optional[str] = None

class ContractCreate(BaseModel):
    concert_name: str
    venue_name: str
    rent_amount: float
    contract_terms: str
    penalty_rate: float = 0.0
    clause_code: str

class ContractUpdate(BaseModel):
    venue_name: Optional[str] = None
    rent_amount: Optional[float] = None
    contract_terms: Optional[str] = None
    penalty_rate: Optional[float] = None
    clause_code: Optional[str] = None

class CalculationCreate(BaseModel):
    concert_name: str
    ticket_refund_id: int
    venue_contract_id: int
    clause_code: str
    cross_city_delay: bool = False
    cross_city_delay_reason: str = ""
    deductible_correct: bool = True
    deductible_misapply_reason: str = ""

class CalculationRecalc(BaseModel):
    cross_city_delay: Optional[bool] = None
    cross_city_delay_reason: Optional[str] = None
    deductible_correct: Optional[bool] = None
    deductible_misapply_reason: Optional[str] = None
    clause_code: Optional[str] = None

class DisputeNoteCreate(BaseModel):
    calculation_id: int
    note_content: str
    author: str = "system"

class ReportExportRequest(BaseModel):
    calculation_id: int
