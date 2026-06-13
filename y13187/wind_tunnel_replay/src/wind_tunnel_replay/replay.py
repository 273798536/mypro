from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any

from .types import AnomalyRecord, LogEntry, LogKind, ReplayParam, ReplayResult


class ParamReplay:
    def __init__(self, replay_cfg: dict[str, Any], thresholds_cfg: dict[str, Any]):
        self.stable_names: list[str] = list(replay_cfg.get("stable_param_names", []))
        self.require_all: bool = bool(replay_cfg.get("require_all_params", True))
        self.thresholds: dict[str, float] = dict(thresholds_cfg)

    def build_result(self, entries: list[LogEntry], anomalies: list[AnomalyRecord]) -> ReplayResult:
        result = ReplayResult(
            run_id=uuid.uuid4().hex[:10],
            generated_at=datetime.now(),
            anomalies=anomalies,
        )
        withdrawn: set[int] = set()
        for e in entries:
            if e.kind == LogKind.WITHDRAW and e.withdraw_target_line:
                withdrawn.add(e.withdraw_target_line)
        result.withdrawn_lines = withdrawn

        excluded: list[LogEntry] = []
        effective: list[LogEntry] = []
        for e in entries:
            if e.kind in (LogKind.REMARK, LogKind.UNKNOWN):
                excluded.append(e)
                continue
            if e.kind == LogKind.WITHDRAW:
                excluded.append(e)
                continue
            if e.line_no in withdrawn:
                excluded.append(e)
                continue
            effective.append(e)

        result.effective_logs = effective
        result.excluded_logs = excluded

        param_map: dict[str, ReplayParam] = {n: ReplayParam(name=n) for n in self.stable_names}
        for e in effective:
            for name, value in e.params.items():
                if name not in param_map:
                    param_map[name] = ReplayParam(name=name)
                p = param_map[name]
                p.values.append(value)
                p.timestamps.append(e.timestamp or datetime.min)
                p.source_lines.append(e.line_no)
                p.versions.append(e.version or "unmarked")
                p.final_value = value

        for name, p in param_map.items():
            if p.values:
                p.baseline_value = self._compute_baseline(p.values)

        result.param_versions = param_map

        missing = [n for n in self.stable_names if not param_map[n].values]
        if self.require_all and missing:
            result.anomalies.append(AnomalyRecord(
                level="error",
                category="missing_param",
                param_name=None,
                message=f"缺少稳定参数: {', '.join(missing)}",
                evidence={"missing": missing},
                impact="结论不完整，需补录对应参数日志",
            ))

        result.conclusion = self._make_conclusion(result)
        result.meta = {
            "total_lines": len(entries),
            "effective_lines": len(effective),
            "excluded_lines": len(excluded),
            "withdrawn_lines": sorted(withdrawn),
            "stable_names": self.stable_names,
        }
        return result

    def _compute_baseline(self, values: list[float]) -> float:
        if not values:
            return 0.0
        if len(values) <= 2:
            return values[-1]
        sorted_v = sorted(values)
        trimmed = sorted_v[1:-1] if len(sorted_v) > 4 else sorted_v
        return round(sum(trimmed) / len(trimmed), 4)

    def _make_conclusion(self, result: ReplayResult) -> str:
        errs = [a for a in result.anomalies if a.level == "error"]
        warns = [a for a in result.anomalies if a.level == "warning"]
        parts = []
        if errs:
            parts.append(f"失败（{len(errs)} 项错误）")
        elif warns:
            parts.append(f"通过但需复核（{len(warns)} 项告警）")
        else:
            parts.append("通过")
        parts.append(f"有效参数 {len(result.effective_logs)} 条，排除 {len(result.excluded_logs)} 条")
        return "；".join(parts)
