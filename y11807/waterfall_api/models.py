from pydantic import BaseModel
from typing import Optional
from datetime import date


class InvestorIn(BaseModel):
    name: str
    share_percentage: float
    commitment_amount: float
    investor_type: str = "lp"


class HurdleTier(BaseModel):
    threshold: float
    rate: float
    label: str


class DistributionRuleIn(BaseModel):
    effective_date: str
    preferred_return_rate: float = 0.08
    catch_up_rate: float = 1.0
    carried_interest_rate: float = 0.20
    residual_split_gp: float = 0.20
    residual_split_lp: float = 0.80
    hurdle_tiers: list[HurdleTier] = []


class CoInvestmentIn(BaseModel):
    investor_name: str
    co_invest_amount: float
    discount_rate: float = 0.0
    batch_number: int = 1


class ImportPayload(BaseModel):
    fund_name: str
    total_commitment: float
    investors: list[InvestorIn]
    rule: DistributionRuleIn
    co_investments: list[CoInvestmentIn] = []


class AdvanceRequest(BaseModel):
    action: str = "advance"
    confirmation_ids: list[int] = []
    confirm_action: str = ""


class DisputeNoteIn(BaseModel):
    investor_id: Optional[int] = None
    note: str
    created_by: str = "fund_secretary"


class ConfirmationResolve(BaseModel):
    status: str
    note: Optional[str] = None


class DistributionCreate(BaseModel):
    fund_id: int
    rule_id: int
    total_amount: float


class InvestorOut(BaseModel):
    id: int
    name: str
    share_percentage: float
    commitment_amount: float
    investor_type: str


class WaterfallStepOut(BaseModel):
    id: int
    step_order: int
    step_type: str
    total_amount: float
    description: Optional[str]


class DistributionDetailOut(BaseModel):
    investor_id: int
    investor_name: str
    step_type: str
    amount: float
    percentage: float
    is_co_invest: bool


class PendingConfirmationOut(BaseModel):
    id: int
    investor_id: int
    investor_name: str
    reason_type: str
    reason_detail: Optional[str]
    status: str
    next_action: Optional[str]


class DisputeNoteOut(BaseModel):
    id: int
    investor_id: Optional[int]
    note: str
    created_by: str
    created_at: str


class DistributionSummary(BaseModel):
    id: int
    fund_id: int
    fund_name: str
    rule_id: int
    rule_version: int
    total_amount: float
    status: str
    hurdle_cross_tier_blocked: bool
    steps: list[WaterfallStepOut]
    details: list[DistributionDetailOut]
    pending_confirmations: list[PendingConfirmationOut]
    dispute_notes: list[DisputeNoteOut]


class ExportRow(BaseModel):
    investor_name: str
    step_type: str
    amount: float
    percentage: float
    is_co_invest: bool
    hurdle_cross_tier_blocked: Optional[bool] = None
    pending_reason: Optional[str] = None


class ExportResult(BaseModel):
    distribution_id: int
    fund_name: str
    rule_version: int
    total_amount: float
    status: str
    hurdle_cross_tier_intercepted: bool
    rows: list[ExportRow]


class ImportResult(BaseModel):
    fund_id: int
    rule_id: int
    investor_ids: list[int]
    co_investment_ids: list[int]
    pending_confirmations: list[PendingConfirmationOut]
