import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WorkflowStep(str, Enum):
    IMPORT = "import"
    ANNOTATE = "annotate"
    EXPORT_CHECK = "export_check"


class MaterialStatus(str, Enum):
    RAW = "raw"
    ANNOTATED = "annotated"
    TRACKED = "tracked"
    REVIEWED = "reviewed"
    EXPORTED = "exported"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Material(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    batch_id: str
    original_text: str
    import_time: datetime = Field(default_factory=datetime.now)
    raw_json_path: Optional[str] = None
    status: MaterialStatus = MaterialStatus.RAW
    source_label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DraftImage(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    material_id: str
    image_path: str
    graph_visual_match: bool = Field(
        description="图上看着顺，但明细对不回去时为 False"
    )
    detail_mismatch_description: Optional[str] = None
    noted_at: datetime = Field(default_factory=datetime.now)


class Edit(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    material_id: str
    field: str
    old_value: str
    new_value: str
    editor: str
    edit_time: datetime = Field(default_factory=datetime.now)
    reason: str


class AuditEntry(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    material_id: str
    reviewer: str
    action: str
    reason: str
    timestamp: datetime = Field(default_factory=datetime.now)
    rule_violation: Optional[str] = Field(
        default=None,
        description="触发的规则描述，不藏到日志里，直接可见",
    )


class ReviewDecision(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    material_id: str
    reviewer: str
    approved: bool
    reason: str
    timestamp: datetime = Field(default_factory=datetime.now)
    previous_reviewer: Optional[str] = Field(
        default=None,
        description="上一次处理人",
    )
    previous_reason: Optional[str] = Field(
        default=None,
        description="上一次未通过的原因",
    )
    extrapolation_boundary: bool = Field(
        default=False,
        description="是否涉及外推越界",
    )


class WorkflowState(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    batch_id: str
    step: WorkflowStep
    completed: bool = False
    timestamp: datetime = Field(default_factory=datetime.now)
    operator: Optional[str] = None
    note: Optional[str] = None


class ErrorNode(BaseModel):
    node_id: str
    step_label: str
    formula: Optional[str] = Field(
        default=None,
        description="该节点的关键公式（LaTeX）",
    )
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    explanation: Optional[str] = Field(
        default=None,
        description="错因解释——接口和报告都返回此字段",
    )
    unit_conversion: Optional[str] = Field(
        default=None,
        description="涉及单位换算时写出换算过程",
    )
    counter_example: Optional[str] = Field(
        default=None,
        description="反例说明",
    )


class TrackingResult(BaseModel):
    material_id: str
    path_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    error_nodes: List["ErrorNode"] = Field(default_factory=list)
    explanation: str = Field(
        description="整条拓扑路径的错因综合解释——接口必返"
    )
    anomalous_samples: List[str] = Field(
        default_factory=list,
        description="异常样本描述列表，与公式和换算放在同一处",
    )
    tracked_at: datetime = Field(default_factory=datetime.now)


class ExportSnapshot(BaseModel):
    material_id: str
    exported_at: datetime = Field(default_factory=datetime.now)
    content_hash: str
    annotation_count: int
    edit_count: int
    synced: bool = Field(
        description="导出内容是否与当前标注/编辑同步"
    )
    sync_details: Optional[str] = None
