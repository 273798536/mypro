from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import ParamVersion, WarningResult
from .warning_calculator import compare_results


PRESET_PARAMS: dict[str, ParamVersion] = {
    "v1.0-strict": ParamVersion(
        version_tag="v1.0-strict",
        description="社区公示前严格档：阈值系数高、缺口容忍度低，用于初期评审",
        threshold_coefficient=1.05,
        min_sample_count=6,
        max_gap_ratio=0.1,
    ),
    "v1.1-normal": ParamVersion(
        version_tag="v1.1-normal",
        description="常规档：中等阈值系数，用于日常复核",
        threshold_coefficient=1.10,
        min_sample_count=5,
        max_gap_ratio=0.2,
    ),
    "v1.2-relaxed": ParamVersion(
        version_tag="v1.2-relaxed",
        description="宽松档：较低阈值系数、较大缺口容忍，用于初步筛查",
        threshold_coefficient=1.20,
        min_sample_count=4,
        max_gap_ratio=0.3,
    ),
    "v2.0-tightened": ParamVersion(
        version_tag="v2.0-tightened",
        description="收紧档：提高最小样本数、降低缺口容忍，用于最终公示前终审",
        threshold_coefficient=1.00,
        min_sample_count=8,
        max_gap_ratio=0.05,
    ),
}


def get_param_version(tag: str, parent: Optional[str] = None) -> ParamVersion:
    if tag in PRESET_PARAMS:
        base = PRESET_PARAMS[tag]
        if parent:
            base.parent_version = parent
        return base
    raise ValueError(
        f"未知参数版本: {tag}，可用版本: {', '.join(PRESET_PARAMS.keys())}"
    )


def list_available_versions() -> list[dict[str, str]]:
    return [
        {
            "version_tag": p.version_tag,
            "description": p.description,
            "formula": p.formula_text(),
        }
        for p in PRESET_PARAMS.values()
    ]


def shift_param_tier(current_tag: str, direction: int = 1) -> ParamVersion:
    keys = list(PRESET_PARAMS.keys())
    try:
        idx = keys.index(current_tag)
    except ValueError:
        idx = 1
    new_idx = max(0, min(len(keys) - 1, idx + direction))
    new_tag = keys[new_idx]
    return get_param_version(new_tag, parent=current_tag)


class ResultHistory:
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.history_dir = self.output_dir / "history"
        self.history_dir.mkdir(parents=True, exist_ok=True)

    def record(self, result: WarningResult, params: ParamVersion) -> Path:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = self.history_dir / f"result_{params.version_tag}_{stamp}.json"
        payload = {
            "params": params.model_dump(mode="json"),
            "result": result.model_dump(mode="json"),
        }
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    def latest(self) -> Optional[tuple[WarningResult, ParamVersion]]:
        files = sorted(self.history_dir.glob("result_*.json"))
        if not files:
            return None
        data = json.loads(files[-1].read_text(encoding="utf-8"))
        return WarningResult(**data["result"]), ParamVersion(**data["params"])

    def diff_with_latest(
        self, current_result: WarningResult, current_params: ParamVersion
    ) -> Optional[dict]:
        previous = self.latest()
        if previous is None:
            return None
        prev_result, prev_params = previous
        return compare_results(prev_result, current_result, prev_params, current_params)
