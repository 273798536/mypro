from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    EASY = "简单"
    MEDIUM = "中等"
    HARD = "困难"
    EXTREME = "极难"


class DataSource(str, Enum):
    MODEL_LOG = "模型日志"
    SAFETY_RULE = "安全规则"
    TRAINING_SAMPLE = "训练样本"


class ConflictType(str, Enum):
    LABEL_MISMATCH = "标签不一致"
    SAFETY_RULE_MISSING = "安全规则漏配"
    UNIT_MISSING = "单位漏填"
    OLD_FORMAT = "旧表格式"
    SUPPLEMENT_NOTE = "补录备注"
    DUPLICATE = "重复样本"


@dataclass
class SafetyRule:
    rule_id: str
    rule_name: str
    description: str
    category: str
    risk_level: str
    required_fields: List[str]
    created_at: str
    source: str = DataSource.SAFETY_RULE


@dataclass
class ModelLog:
    log_id: str
    sample_id: str
    model_version: str
    prediction: str
    confidence: float
    features: Dict[str, Any]
    timestamp: str
    source: str = DataSource.MODEL_LOG


@dataclass
class TrainingSample:
    sample_id: str
    content: str
    label: str
    annotator: str
    annotation_time: str
    remarks: str
    source: str = DataSource.TRAINING_SAMPLE


@dataclass
class AnalysisRecord:
    sample_id: str
    difficulty: DifficultyLevel
    conflicts: List[ConflictType]
    conflict_details: List[str]
    safety_rule_matches: List[str]
    safety_rule_missing: List[str]
    label_conflict_sources: List[str]
    source_materials: List[str]
    is_duplicate: bool
    duplicate_of: Optional[str]
    difficulty_score: float
    raw_data: Dict[str, Any]


@dataclass
class EvaluationRecord:
    record_id: str
    sample_id: str
    original_judgment: str
    reviewed_judgment: str
    judgment_changed: bool
    change_reason: str
    reviewer: str
    review_time: str
    before_dedup: Optional[Dict[str, Any]]
    after_dedup: Optional[Dict[str, Any]]
