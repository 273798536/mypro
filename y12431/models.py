from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum


class MaterialType(str, Enum):
    CONTRACT = "授权合同"
    DEPOSIT = "保证金记录"
    PAYMENT = "回款报告"


class SourceReference(BaseModel):
    file_name: str
    sheet_name: Optional[str] = None
    row_number: int
    material_type: MaterialType


class AuthorizationContract(BaseModel):
    id: str
    brand_name: str
    partner_name: str
    contract_no: str
    start_date: date
    end_date: date
    guaranteed_amount: float
    royalty_rate: float
    payment_cycle: str
    source: SourceReference


class DepositRecord(BaseModel):
    id: str
    contract_no: str
    deposit_type: str
    amount: float
    receive_date: date
    is_verified: bool = False
    verified_date: Optional[date] = None
    verified_amount: float = 0
    source: SourceReference


class PaymentReport(BaseModel):
    id: str
    contract_no: str
    period: str
    report_date: date
    channel: str
    sales_amount: float
    return_amount: float
    actual_payment: float
    royalty_amount: float
    source: SourceReference


class AnomalyType(str, Enum):
    GUARANTEE_SHORTAGE = "保底不足"
    CROSS_PERIOD_RETURN = "退货跨期"
    CHANNEL_MISSING = "渠道漏报"
    DEPOSIT_MISMATCH = "保证金不匹配"
    ROYALTY_CALCULATION_ERROR = "授权分成计算错误"


class AnomalyDetail(BaseModel):
    id: str
    type: AnomalyType
    description: str
    contract_no: str
    period: Optional[str] = None
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    difference: Optional[float] = None
    sources: List[SourceReference]
    correction_suggestion: str
    related_data: Dict[str, Any] = Field(default_factory=dict)


class RoyaltySplit(BaseModel):
    period: str
    contract_no: str
    brand_name: str
    channel: str
    sales_amount: float
    return_amount: float
    net_sales: float
    royalty_rate: float
    calculated_royalty: float
    actual_royalty: float
    difference: float
    guarantee_deduction: float
    deposit_verification: float
    final_receivable: float
    is_anomaly: bool
    anomaly_ids: List[str] = Field(default_factory=list)
    sources: List[SourceReference]


class AnalysisResult(BaseModel):
    report_id: str
    analysis_date: datetime
    total_contracts: int
    total_deposits: int
    total_payments: int
    total_royalty: float
    total_guarantee_deduction: float
    total_deposit_verification: float
    total_final_receivable: float
    anomalies: List[AnomalyDetail]
    royalty_splits: List[RoyaltySplit]
    summary_by_brand: Dict[str, Dict[str, float]]
    summary_by_period: Dict[str, Dict[str, float]]
    source_files: List[str]
