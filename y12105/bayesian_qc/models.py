"""数据模型定义"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib
import json


@dataclass
class SampleRecord:
    """抽样记录"""
    sample_id: str
    batch_id: str
    is_defective: bool
    source_file: str
    recorded_at: Optional[str] = None
    inspector: Optional[str] = None
    notes: Optional[str] = None

    def __post_init__(self):
        if self.recorded_at is None:
            self.recorded_at = datetime.now().isoformat()


@dataclass
class PriorParams:
    """Beta分布先验参数"""
    alpha: float
    beta: float
    description: str = "无信息先验"
    source: str = "默认配置"
    updated_at: Optional[str] = None

    def __post_init__(self):
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()

    @property
    def mean(self) -> float:
        """先验均值"""
        return self.alpha / (self.alpha + self.beta)

    @property
    def effective_sample_size(self) -> float:
        """等效样本量"""
        return self.alpha + self.beta


@dataclass
class TraceInfo:
    """溯源信息 - 每条判断都能追到原始来源"""
    batch_id: str
    source_files: List[str]
    sample_ids: List[str]
    prior_source: str
    calculation_steps: List[str] = field(default_factory=list)

    def add_step(self, step: str):
        """添加计算步骤"""
        self.calculation_steps.append(f"[{datetime.now().isoformat()}] {step}")


@dataclass
class BayesianResult:
    """贝叶斯分析结果"""
    batch_id: str
    total_samples: int
    defective_count: int
    prior: PriorParams
    posterior_alpha: float
    posterior_beta: float
    mean_defect_rate: float
    credible_interval_low: float
    credible_interval_high: float
    credible_level: float
    decision: str
    recommendation: str
    trace: TraceInfo
    warnings: List[str] = field(default_factory=list)
    compared_batches: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "batch_id": self.batch_id,
            "total_samples": self.total_samples,
            "defective_count": self.defective_count,
            "prior": asdict(self.prior),
            "posterior_alpha": self.posterior_alpha,
            "posterior_beta": self.posterior_beta,
            "mean_defect_rate": self.mean_defect_rate,
            "credible_interval": [self.credible_interval_low, self.credible_interval_high],
            "credible_level": self.credible_level,
            "decision": self.decision,
            "recommendation": self.recommendation,
            "trace": asdict(self.trace),
            "warnings": self.warnings,
            "compared_batches": self.compared_batches,
        }


@dataclass
class HistoryRecord:
    """历史记录 - 用于持久化和去重"""
    result_hash: str
    batch_id: str
    executed_at: str
    result: BayesianResult

    @classmethod
    def compute_hash(cls, batch_id: str, samples: List[SampleRecord], prior: PriorParams) -> str:
        """计算结果哈希，用于去重"""
        data = {
            "batch_id": batch_id,
            "samples": [(s.sample_id, s.is_defective) for s in sorted(samples, key=lambda x: x.sample_id)],
            "prior": (prior.alpha, prior.beta, prior.source),
        }
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()
