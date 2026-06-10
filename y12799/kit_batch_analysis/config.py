"""配置管理模块"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
import yaml


@dataclass
class ValidationThresholds:
    """校验阈值配置"""
    max_batch_cv_percent: float = 10.0
    min_blank_control_count: int = 3
    reaction_time_tolerance_min: int = 2
    temp_curve_max_deviation: float = 2.0


@dataclass
class InputConfig:
    """输入文件配置"""
    reagent_ledger_filename: str = "试剂台账.xlsx"
    experiment_record_filename: str = "实验记录.xlsx"
    weighing_sheet_filename: str = "称量单.xlsx"
    reaction_time_filename: str = "反应时间.xlsx"
    temp_curve_filename: str = "温度曲线.xlsx"
    batch_info_filename: str = "批次信息.xlsx"


@dataclass
class OutputConfig:
    """输出文件配置"""
    report_filename: str = "批间差分析报告.xlsx"
    state_filename: str = ".analysis_state.json"
    anomaly_filename: str = "异常清单.xlsx"
    review_checklist_filename: str = "复核清单.xlsx"


@dataclass
class AppConfig:
    """应用主配置"""
    input_dir: Path = Path("./input")
    output_dir: Path = Path("./output")
    thresholds: ValidationThresholds = field(default_factory=ValidationThresholds)
    input_files: InputConfig = field(default_factory=InputConfig)
    output_files: OutputConfig = field(default_factory=OutputConfig)
    preserve_manual_notes: bool = True
    enable_idempotency: bool = True

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "AppConfig":
        cfg = cls()
        if config_path and config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            if "input_dir" in data:
                cfg.input_dir = Path(data["input_dir"])
            if "output_dir" in data:
                cfg.output_dir = Path(data["output_dir"])
            if "thresholds" in data:
                t = data["thresholds"]
                cfg.thresholds = ValidationThresholds(
                    max_batch_cv_percent=t.get("max_batch_cv_percent", 10.0),
                    min_blank_control_count=t.get("min_blank_control_count", 3),
                    reaction_time_tolerance_min=t.get("reaction_time_tolerance_min", 2),
                    temp_curve_max_deviation=t.get("temp_curve_max_deviation", 2.0),
                )
            if "input_files" in data:
                inf = data["input_files"]
                cfg.input_files = InputConfig(
                    reagent_ledger_filename=inf.get("reagent_ledger_filename", cfg.input_files.reagent_ledger_filename),
                    experiment_record_filename=inf.get("experiment_record_filename", cfg.input_files.experiment_record_filename),
                    weighing_sheet_filename=inf.get("weighing_sheet_filename", cfg.input_files.weighing_sheet_filename),
                    reaction_time_filename=inf.get("reaction_time_filename", cfg.input_files.reaction_time_filename),
                    temp_curve_filename=inf.get("temp_curve_filename", cfg.input_files.temp_curve_filename),
                    batch_info_filename=inf.get("batch_info_filename", cfg.input_files.batch_info_filename),
                )
            if "output_files" in data:
                outf = data["output_files"]
                cfg.output_files = OutputConfig(
                    report_filename=outf.get("report_filename", cfg.output_files.report_filename),
                    state_filename=outf.get("state_filename", cfg.output_files.state_filename),
                    anomaly_filename=outf.get("anomaly_filename", cfg.output_files.anomaly_filename),
                    review_checklist_filename=outf.get("review_checklist_filename", cfg.output_files.review_checklist_filename),
                )
            if "preserve_manual_notes" in data:
                cfg.preserve_manual_notes = bool(data["preserve_manual_notes"])
            if "enable_idempotency" in data:
                cfg.enable_idempotency = bool(data["enable_idempotency"])
        cfg.input_dir = Path(cfg.input_dir)
        cfg.output_dir = Path(cfg.output_dir)
        cfg.output_dir.mkdir(parents=True, exist_ok=True)
        return cfg

    def to_dict(self) -> Dict:
        return {
            "input_dir": str(self.input_dir),
            "output_dir": str(self.output_dir),
            "thresholds": {
                "max_batch_cv_percent": self.thresholds.max_batch_cv_percent,
                "min_blank_control_count": self.thresholds.min_blank_control_count,
                "reaction_time_tolerance_min": self.thresholds.reaction_time_tolerance_min,
                "temp_curve_max_deviation": self.thresholds.temp_curve_max_deviation,
            },
            "preserve_manual_notes": self.preserve_manual_notes,
            "enable_idempotency": self.enable_idempotency,
        }
