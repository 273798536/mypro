from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any

from .models import CheckResult, WindowConfig


@dataclass
class DiffEntry:
    field: str
    old_value: Any
    new_value: Any
    impact: str = ""


@dataclass
class ParamDiff:
    config_before: dict[str, Any]
    config_after: dict[str, Any]
    fields_changed: list[DiffEntry] = field(default_factory=list)
    result_before_summary: dict[str, Any] = field(default_factory=dict)
    result_after_summary: dict[str, Any] = field(default_factory=dict)
    result_diff: dict[str, Any] = field(default_factory=dict)


class ChangeTracer:
    def __init__(self) -> None:
        self._snapshots: list[tuple[WindowConfig, CheckResult]] = []

    def record(self, config: WindowConfig, result: CheckResult) -> None:
        self._snapshots.append((copy.deepcopy(config), copy.deepcopy(result)))

    @property
    def has_history(self) -> bool:
        return len(self._snapshots) >= 2

    def latest(self) -> tuple[WindowConfig, CheckResult] | None:
        if not self._snapshots:
            return None
        return self._snapshots[-1]

    def diff_latest_two(self) -> ParamDiff | None:
        if len(self._snapshots) < 2:
            return None
        cfg_before, res_before = self._snapshots[-2]
        cfg_after, res_after = self._snapshots[-1]
        return self._build_diff(cfg_before, res_before, cfg_after, res_after)

    def diff_all(self) -> list[ParamDiff]:
        diffs: list[ParamDiff] = []
        for i in range(1, len(self._snapshots)):
            cb, rb = self._snapshots[i - 1]
            ca, ra = self._snapshots[i]
            diffs.append(self._build_diff(cb, rb, ca, ra))
        return diffs

    @staticmethod
    def _build_diff(
        cfg_before: WindowConfig,
        res_before: CheckResult,
        cfg_after: WindowConfig,
        res_after: CheckResult,
    ) -> ParamDiff:
        before = cfg_before.to_dict()
        after = cfg_after.to_dict()
        diff = ParamDiff(
            config_before=before,
            config_after=after,
            result_before_summary=res_before.summary(),
            result_after_summary=res_after.summary(),
        )
        for key in set(before.keys()) | set(after.keys()):
            old = before.get(key)
            new = after.get(key)
            if old != new:
                impact = ChangeTracer._explain_impact(key, old, new)
                diff.fields_changed.append(DiffEntry(
                    field=key,
                    old_value=old,
                    new_value=new,
                    impact=impact,
                ))
        if res_before.computed_value != res_after.computed_value:
            diff.result_diff["computed_value"] = {
                "before": res_before.computed_value,
                "after": res_after.computed_value,
            }
        if res_before.status != res_after.status:
            diff.result_diff["status"] = {
                "before": res_before.status.value,
                "after": res_after.status.value,
            }
        before_types = {a.anomaly_type.value for a in res_before.anomalies}
        after_types = {a.anomaly_type.value for a in res_after.anomalies}
        if before_types != after_types:
            diff.result_diff["anomaly_types"] = {
                "added": list(after_types - before_types),
                "removed": list(before_types - after_types),
            }
        return diff

    @staticmethod
    def _explain_impact(field: str, old: Any, new: Any) -> str:
        mapping = {
            "window_size": (
                f"窗口大小从 {old} 变为 {new}，"
                f"将直接改变分母，从而改变平均吞吐量计算结果"
            ),
            "window_unit": (
                f"窗口单位从 {old} 变为 {new}，"
                f"换算为基准单位（分钟）的系数变化会影响计算值"
            ),
            "lower_bound": (
                f"窗口下限从 {old} 变为 {new}，"
                f"边界判定的通过区间将{'扩大' if new < old else '收窄'}"
            ),
            "upper_bound": (
                f"窗口上限从 {old} 变为 {new}，"
                f"边界判定的通过区间将{'扩大' if new > old else '收窄'}"
            ),
            "value_unit": (
                f"目标单位从 {old} 变为 {new}，"
                f"会影响单位换算和边界样本展示"
            ),
            "formula": (
                f"公式从 {old} 变为 {new}，"
                f"将改变计算逻辑，可能显著影响校验结果"
            ),
            "tolerance": (
                f"容差从 {old} 变为 {new}，"
                f"边界判定的容错范围将{'放宽' if new > old else '收紧'}"
            ),
        }
        return mapping.get(field, f"参数 {field} 变化，可能影响校验结果")
