from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models import TaskStatus, CheckType, SeverityLevel, SplitType, ActionType


class QuestionBankCreate(BaseModel):
    name: str
    description: str = ""
    source: str = ""


class QuestionBankOut(BaseModel):
    id: int
    name: str
    description: str
    source: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionItem(BaseModel):
    question_id: str
    content: str
    answer: str = ""
    category: str = ""
    difficulty: str = ""
    split_type: SplitType = SplitType.TEST
    human_note: str = ""
    metadata: dict = {}


class QuestionOut(BaseModel):
    id: int
    bank_id: int
    question_id: str
    content: str
    answer: str
    category: str
    difficulty: str
    split_type: SplitType
    human_note: str
    dedup_fingerprint: Optional[str] = None
    is_duplicate: bool
    duplicate_of: Optional[int] = None
    metadata_json: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    bank_id: int
    total_imported: int
    duplicates_found: int
    new_unique: int


class DataSplitOut(BaseModel):
    id: int
    bank_id: int
    split_name: str
    split_type: SplitType
    question_count: int
    updated_at: datetime

    class Config:
        from_attributes = True


class SplitUpdateItem(BaseModel):
    question_id: str
    split_type: SplitType


class CheckTaskCreate(BaseModel):
    bank_id: int
    task_name: str
    check_types: List[CheckType] = [CheckType.LEAKAGE, CheckType.DISTRIBUTION, CheckType.DUPLICATE]


class CheckTaskStatusUpdate(BaseModel):
    status: TaskStatus
    reviewer: str = ""
    review_comment: str = ""


class CheckTaskOut(BaseModel):
    id: int
    bank_id: int
    task_name: str
    status: TaskStatus
    check_types: list = []
    reviewer: str
    review_comment: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CheckResultOut(BaseModel):
    id: int
    task_id: int
    check_type: CheckType
    severity: SeverityLevel
    question_id: Optional[str] = None
    detail: str
    plain_explanation: str
    action_hint: str
    original_human_note: str
    is_blocking: bool
    resolved: bool
    resolution: str
    metadata_json: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True


class CheckResultResolve(BaseModel):
    resolved: bool
    resolution: str = ""


class AuditLogOut(BaseModel):
    id: int
    task_id: Optional[int] = None
    bank_id: Optional[int] = None
    action: ActionType
    actor: str
    detail: str
    snapshot: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True


class ReportExportRequest(BaseModel):
    task_id: int
    format: str = "markdown"


LEAKAGE_ACTION_HINTS = {
    "train_test_overlap": "需要从测试集中移除该题目，或在训练集中替换为不同样本",
    "val_test_overlap": "需要确认验证集与测试集的划分是否正确，可能需要重新切分",
    "train_val_overlap": "建议检查数据切分流程，确保训练集与验证集无交叉",
}

LEAKAGE_PLAIN_EXPLANATIONS = {
    "train_test_overlap": "这道题同时出现在训练集和测试集中，模型可能已经'背过答案'，评测结果不能真实反映模型能力。",
    "val_test_overlap": "这道题同时出现在验证集和测试集中，验证集本应用来调参，如果和测试集重叠，调出来的参数可能对测试集过拟合。",
    "train_val_overlap": "这道题同时出现在训练集和验证集中，用这样的验证集来监控训练进度可能会给出过于乐观的信号。",
}

BLOCKING_REASONS = {
    "train_test_overlap": "训练-测试重叠是最严重的数据泄漏，直接导致评测结果不可信",
    "val_test_overlap": "验证-测试重叠会导致模型选择偏向上测试集的配置",
    "train_val_overlap": "训练-验证重叠虽然不如前两者严重，但也会影响训练监控的准确性",
}
