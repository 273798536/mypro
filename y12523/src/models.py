from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class SourceType(Enum):
    HR_SYSTEM = "HR系统"
    MANUAL_ENTRY = "人工录入"
    FINANCE_SYSTEM = "财务系统"
    TAX_BUREAU = "税务局发布"
    SUPPLEMENT = "事后补录"
    UNKNOWN = "未知来源"


class AnomalyType(Enum):
    BOUNDARY_VALUE = "边界值异常"
    MISSING_DEDUCTION = "扣除项缺失"
    LATE_SUPPLEMENT = "逾期补录"
    OVERWRITE_HISTORY = "历史数据覆盖"
    UNIT_MISMATCH = "单位不匹配"
    CALCULATION_ERROR = "计算异常"


@dataclass
class SourceInfo:
    source_type: SourceType
    source_id: str = ""
    entry_time: datetime = field(default_factory=datetime.now)
    operator: str = ""
    remark: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "source_type": self.source_type.value,
            "source_id": self.source_id,
            "entry_time": self.entry_time.strftime("%Y-%m-%d %H:%M:%S"),
            "operator": self.operator,
            "remark": self.remark
        }


@dataclass
class DeductionItem:
    deduction_id: str
    name: str
    amount: float
    unit: str = "元"
    month: int = 0
    source: SourceInfo = field(default_factory=lambda: SourceInfo(SourceType.UNKNOWN))
    is_supplement: bool = False
    supplement_reason: str = ""
    version: int = 1
    previous_amount: Optional[float] = None
    
    def to_dict(self) -> Dict:
        return {
            "deduction_id": self.deduction_id,
            "name": self.name,
            "amount": self.amount,
            "unit": self.unit,
            "month": self.month,
            "source": self.source.to_dict(),
            "is_supplement": self.is_supplement,
            "supplement_reason": self.supplement_reason,
            "version": self.version,
            "previous_amount": self.previous_amount
        }


@dataclass
class EmployeeIncome:
    employee_id: str
    employee_name: str
    year: int
    month: int
    salary: float
    bonus: float = 0.0
    other_income: float = 0.0
    unit: str = "元"
    source: SourceInfo = field(default_factory=lambda: SourceInfo(SourceType.UNKNOWN))
    deductions: List[DeductionItem] = field(default_factory=list)
    version: int = 1
    previous_total: Optional[float] = None
    
    @property
    def total_income(self) -> float:
        return self.salary + self.bonus + self.other_income
    
    @property
    def total_deductions(self) -> float:
        return sum(d.amount for d in self.deductions)
    
    @property
    def taxable_income(self) -> float:
        return max(0.0, self.total_income - self.total_deductions)
    
    def to_dict(self) -> Dict:
        return {
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "year": self.year,
            "month": self.month,
            "salary": self.salary,
            "bonus": self.bonus,
            "other_income": self.other_income,
            "unit": self.unit,
            "total_income": self.total_income,
            "total_deductions": self.total_deductions,
            "taxable_income": self.taxable_income,
            "source": self.source.to_dict(),
            "deductions": [d.to_dict() for d in self.deductions],
            "version": self.version,
            "previous_total": self.previous_total
        }


@dataclass
class TaxBracket:
    lower_bound: float
    upper_bound: Optional[float]
    rate: float
    quick_deduction: float
    source: SourceInfo = field(default_factory=lambda: SourceInfo(SourceType.TAX_BUREAU))
    
    def contains(self, amount: float) -> bool:
        if self.upper_bound is None:
            return amount >= self.lower_bound
        return self.lower_bound <= amount < self.upper_bound
    
    def to_dict(self) -> Dict:
        return {
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "rate": self.rate,
            "quick_deduction": self.quick_deduction,
            "source": self.source.to_dict()
        }


@dataclass
class AnomalyRecord:
    anomaly_id: str
    anomaly_type: AnomalyType
    employee_id: str
    employee_name: str
    description: str
    month: int
    related_field: str
    old_value: Optional[float] = None
    new_value: Optional[float] = None
    source: SourceInfo = field(default_factory=lambda: SourceInfo(SourceType.UNKNOWN))
    detected_time: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            "anomaly_id": self.anomaly_id,
            "anomaly_type": self.anomaly_type.value,
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "description": self.description,
            "month": self.month,
            "related_field": self.related_field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "source": self.source.to_dict(),
            "detected_time": self.detected_time.strftime("%Y-%m-%d %H:%M:%S")
        }


@dataclass
class TaxCalculationResult:
    employee_id: str
    employee_name: str
    year: int
    month: int
    total_income: float
    total_deductions: float
    taxable_income: float
    tax_amount: float
    unit: str = "元"
    applicable_bracket: Optional[TaxBracket] = None
    calculation_log: List[str] = field(default_factory=list)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    source_refs: Dict[str, SourceInfo] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "year": self.year,
            "month": self.month,
            "total_income": self.total_income,
            "total_deductions": self.total_deductions,
            "taxable_income": self.taxable_income,
            "tax_amount": self.tax_amount,
            "unit": self.unit,
            "applicable_bracket": self.applicable_bracket.to_dict() if self.applicable_bracket else None,
            "calculation_log": self.calculation_log,
            "anomalies": [a.to_dict() for a in self.anomalies],
            "source_refs": {k: v.to_dict() for k, v in self.source_refs.items()}
        }
