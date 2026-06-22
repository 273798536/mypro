from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class RecordStatus(str, Enum):
    SUCCESS = 'success'
    BAD_FORMAT = 'bad_format'
    MISSING_FIELD = 'missing_field'
    BUSINESS_RULE = 'business_rule'
    PENDING_REVIEW = 'pending_review'
    DUPLICATE = 'duplicate'


class BadCategory(str, Enum):
    FORMAT = '格式问题'
    MISSING = '缺字段'
    BUSINESS = '业务规则'


@dataclass
class EquationRecord:
    record_id: str = ''
    source: str = ''
    equation_type: str = ''
    input_params: dict = field(default_factory=dict)
    solution: str = ''
    remark: str = ''
    raw_data: dict = field(default_factory=dict)
    status: RecordStatus = RecordStatus.PENDING_REVIEW
    last_manual_note: str = ''
    anomalies: List[str] = field(default_factory=list)
    is_duplicate_of: str = ''

    def to_dict(self):
        return {
            'record_id': self.record_id,
            'source': self.source,
            'equation_type': self.equation_type,
            'input_params': self.input_params,
            'solution': self.solution,
            'remark': self.remark,
            'raw_data': self.raw_data,
            'status': self.status.value,
            'last_manual_note': self.last_manual_note,
            'anomalies': self.anomalies,
            'is_duplicate_of': self.is_duplicate_of,
        }


@dataclass
class BadRecord(EquationRecord):
    bad_category: BadCategory = BadCategory.FORMAT
    error_detail: str = ''
    error_fields: List[str] = field(default_factory=list)

    def to_dict(self):
        d = super().to_dict()
        d['bad_category'] = self.bad_category.value
        d['error_detail'] = self.error_detail
        d['error_fields'] = self.error_fields
        return d


@dataclass
class ValidationResult:
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    bad_category: Optional[BadCategory] = None
