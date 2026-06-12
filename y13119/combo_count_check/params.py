"""
稳定参数配置
==============
参数名一旦发布不可随意修改，日常脚本依赖这些参数名。
如需修改请先通知所有下游脚本使用方，并保持向后兼容至少两个版本。
"""
from dataclasses import dataclass, field, asdict
from typing import Optional
import json


PARAM_VERSION = "v1.0.0"
PARAM_CHANGELOG = {
    "v1.0.0": "初始版本，定义全部稳定参数接口",
}


@dataclass
class VerifyParams:
    # 输入文件路径
    history_answers_path: str = "data/history_answers.csv"
    current_records_path: str = "data/current_records.csv"
    supplementary_notes_path: Optional[str] = "data/supplementary_notes.csv"

    # 组合计数维度
    combo_dimensions: list = field(default_factory=lambda: ["category", "region", "channel"])

    # 外推越界判定阈值（参数名长期稳定）
    extrapolation_lower_bound: float = 0.0
    extrapolation_upper_bound: float = 1e6
    extrapolation_relative_delta: float = 0.50

    # 容差
    count_absolute_tolerance: int = 1
    count_relative_tolerance: float = 0.01

    # 输出
    output_dir: str = "output"
    report_filename: str = "verify_report.txt"
    outliers_filename: str = "extrapolation_outliers.csv"
    history_log_filename: str = "verification_history.jsonl"

    # 运行模式
    raise_on_outlier: bool = False
    verbose: bool = True

    def to_dict(self):
        return {
            **asdict(self),
            "param_version": PARAM_VERSION,
        }

    @classmethod
    def from_json(cls, path: str) -> "VerifyParams":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data.pop("param_version", None)
        return cls(**data)
