"""数据模型定义 - 使用dataclass确保结构稳定"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@dataclass
class Material:
    """知识库材料 - 可追踪口径变更"""
    material_id: str = field(default_factory=_new_id)
    material_name: str = ""
    material_content: str = ""
    source_type: str = "model"  # model / manual / oral
    aliases: List[str] = field(default_factory=list)
    version: int = 1
    created_at: str = field(default_factory=_now_str)
    updated_at: str = field(default_factory=_now_str)
    change_note: str = ""  # 本次口径变更说明
    is_manual_override: bool = False
    override_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RecallResult:
    """单条召回结果"""
    sample_id: str
    query: str
    recalled_material_ids: List[str]
    recalled_scores: List[float]
    expected_material_id: Optional[str] = None
    expected_material_name: Optional[str] = None
    matched: Optional[bool] = None
    match_details: str = ""
    tags: List[str] = field(default_factory=list)  # leak / outlier / edge_case ...


@dataclass
class LeakInfo:
    """样本泄漏信息"""
    detected: bool = False
    suspected_samples: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)
    impact_scope: str = ""
    confirmed: bool = False
    confirmed_note: str = ""


@dataclass
class RunRecord:
    """一次完整的看板运行记录 - 稳定的对外数据结构"""
    run_id: str = field(default_factory=_new_id)
    run_name: str = ""
    created_at: str = field(default_factory=_now_str)
    status: str = "pending"  # pending / processing / paused_leak / done / error
    status_note: str = ""

    materials: Dict[str, Material] = field(default_factory=dict)
    recall_results: List[RecallResult] = field(default_factory=list)

    total_samples: int = 0
    recall_at_1: float = 0.0
    recall_at_3: float = 0.0
    recall_at_5: float = 0.0
    mrr: float = 0.0

    outlier_samples: List[str] = field(default_factory=list)  # 拉偏结论的样本
    changed_materials: List[str] = field(default_factory=list)  # 改过口径的材料id
    pending_evidences: List[str] = field(default_factory=list)  # 待补证据的条目
    processed_items: List[str] = field(default_factory=list)  # 已处理的条目

    leak_info: LeakInfo = field(default_factory=LeakInfo)

    manual_overrides: Dict[str, Dict[str, Any]] = field(default_factory=dict)  # sample_id -> override

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["recall_results"] = [asdict(r) for r in self.recall_results]
        d["materials"] = {k: v.to_dict() for k, v in self.materials.items()}
        return d
