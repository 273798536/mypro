from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict
from uuid import uuid4


class TransactionType(Enum):
    REIMBURSEMENT = "报销"
    SELF_PAY = "自费"
    ACCOUNT_TRANSFER = "账户划拨"
    SUPPLEMENTARY = "补划"


class RecordStatus(Enum):
    PENDING = "未处理"
    VERIFIED = "已确认"
    CORRECTED = "已修正"
    NEEDS_REVIEW = "需人工确认"
    DUPLICATE = "重复记录"
    CROSS_MONTH = "跨月报销"


class DataSource(Enum):
    MEDICAL_INSURANCE_FLOW = "医保流水"
    OUTPATIENT_RECEIPT = "门诊票据"
    SELF_PAY_ITEMS = "自费项目"
    ACCOUNT_BALANCE = "账户余额"
    SUPPLEMENTARY_REQUEST = "补划申请"
    EXPLANATION_DOC = "解释单"


@dataclass
class AuditTrail:
    timestamp: datetime
    action: str
    operator: str
    note: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None


@dataclass
class BaseRecord:
    source: DataSource
    source_file: str
    id: str = field(default_factory=lambda: str(uuid4()))
    status: RecordStatus = RecordStatus.PENDING
    audit_trail: List[AuditTrail] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    notes: List[str] = field(default_factory=list)

    def add_audit(self, action: str, operator: str, note: str,
                  previous_value: Optional[str] = None,
                  new_value: Optional[str] = None):
        self.audit_trail.append(AuditTrail(
            timestamp=datetime.now(),
            action=action,
            operator=operator,
            note=note,
            previous_value=previous_value,
            new_value=new_value
        ))


@dataclass
class MedicalInsuranceFlow(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    transaction_date: Optional[datetime] = None
    transaction_type: TransactionType = TransactionType.REIMBURSEMENT
    amount: float = 0.0
    department: str = ""
    hospital: str = ""


@dataclass
class OutpatientReceipt(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    receipt_date: Optional[datetime] = None
    receipt_no: str = ""
    total_amount: float = 0.0
    insurance_amount: float = 0.0
    self_pay_amount: float = 0.0
    department: str = ""
    hospital: str = ""


@dataclass
class SelfPayItem(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    item_date: Optional[datetime] = None
    item_name: str = ""
    item_code: str = ""
    amount: float = 0.0
    quantity: int = 1
    is_self_pay: bool = True


@dataclass
class AccountBalance(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    balance_date: Optional[datetime] = None
    previous_balance: float = 0.0
    current_balance: float = 0.0
    monthly_allocation: float = 0.0


@dataclass
class SupplementaryRequest(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    request_date: Optional[datetime] = None
    request_no: str = ""
    supplementary_amount: float = 0.0
    reason: str = ""
    is_processed: bool = False


@dataclass
class ExplanationDoc(BaseRecord):
    patient_name: str = ""
    id_card: str = ""
    doc_date: Optional[datetime] = None
    title: str = ""
    content: str = ""
    related_records: List[str] = field(default_factory=list)


@dataclass
class AccountLedger:
    patient_name: str
    id_card: str
    period: str
    opening_balance: float = 0.0
    closing_balance: float = 0.0
    total_reimbursement: float = 0.0
    total_self_pay: float = 0.0
    total_allocation: float = 0.0
    total_supplementary: float = 0.0
    transactions: List[Dict] = field(default_factory=list)
    discrepancies: List[Dict] = field(default_factory=list)
    warnings: List[Dict] = field(default_factory=list)


@dataclass
class ProcessingResult:
    run_id: str
    run_time: datetime
    input_dir: str
    output_dir: str
    total_records: int = 0
    pending_records: int = 0
    verified_records: int = 0
    corrected_records: int = 0
    needs_review_records: int = 0
    cross_month_records: int = 0
    duplicate_records: int = 0
    ledgers: List[AccountLedger] = field(default_factory=list)
    warnings: List[Dict] = field(default_factory=list)
    errors: List[Dict] = field(default_factory=list)
