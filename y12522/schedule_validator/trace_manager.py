"""可追溯性管理器。

支持从任意一条校验结论，回溯到：
1. 组合枚举过程
2. 约束过滤步骤
3. 冲突解释详情

确保责任可追溯，问题可定位。
"""

from __future__ import annotations

import json
from typing import List, Dict, Optional, Any
from collections import defaultdict

from .models import (
    TraceStep,
    ValidationResult,
    ScheduleCombination,
    ScheduleReport,
    ValidationStatus,
    ConflictType,
)


class TraceManager:
    """追溯管理器。"""

    def __init__(self, trace_steps: Optional[List[TraceStep]] = None):
        self._all_steps: List[TraceStep] = trace_steps or []
        self._steps_by_combination: Dict[str, List[TraceStep]] = defaultdict(list)
        self._build_index()

    def _build_index(self) -> None:
        """构建按组合ID的索引。"""
        self._steps_by_combination.clear()
        for step in self._all_steps:
            if step.combination_ref:
                self._steps_by_combination[step.combination_ref].append(step)

    def add_steps(self, steps: List[TraceStep]) -> None:
        """添加追溯步骤。"""
        self._all_steps.extend(steps)
        self._build_index()

    def get_trace_for_result(self, result: ValidationResult) -> Dict[str, Any]:
        """获取校验结果的完整追溯链。"""
        trace_data = {
            "summary": {
                "status": result.status.value,
                "conflict_type": result.conflict_type.value if result.conflict_type else None,
                "message": result.message,
                "suggestion": result.suggestion,
            },
            "conflicting_combinations": [
                {
                    "combination_id": c.combination_id,
                    "course": c.course.course_name,
                    "teacher": c.teacher.teacher_name,
                    "classroom": c.classroom.room_name,
                    "time_slot": str(c.time_slot),
                }
                for c in result.conflicting_combinations
            ],
            "trace_path": [
                {
                    "phase": step.phase,
                    "action": step.action,
                    "detail": step.detail,
                    "timestamp": step.timestamp,
                }
                for step in result.trace_path
            ],
        }
        return trace_data

    def get_trace_for_combination(self, combination_id: str) -> Dict[str, Any]:
        """获取指定组合的完整追溯路径。"""
        steps = self._steps_by_combination.get(combination_id, [])

        return {
            "combination_id": combination_id,
            "step_count": len(steps),
            "phases": sorted(set(step.phase for step in steps)),
            "detailed_trace": [
                {
                    "step_id": step.step_id,
                    "phase": step.phase,
                    "action": step.action,
                    "detail": step.detail,
                    "timestamp": step.timestamp,
                }
                for step in steps
            ],
        }

    def get_failed_trace_report(
        self,
        report: ScheduleReport,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """获取失败案例的追溯报告。"""
        failed_results = [
            r for r in report.results
            if r.status in [ValidationStatus.FAIL, ValidationStatus.BLOCKED]
        ][:limit]

        return [
            self.get_trace_for_result(r)
            for r in failed_results
        ]

    def get_duplicate_failure_paths(self, report: ScheduleReport) -> List[Dict[str, Any]]:
        """获取重复计数失败的完整路径。"""
        duplicate_results = [
            r for r in report.results
            if r.conflict_type == ConflictType.DUPLICATE
        ]

        paths = []
        for result in duplicate_results:
            trace_data = self.get_trace_for_result(result)
            trace_data["failure_type"] = "重复计数"
            trace_data["severity"] = "拦截"

            if result.conflicting_combinations:
                first_combo = result.conflicting_combinations[0]
                trace_data["first_occurrence"] = {
                    "combination_id": first_combo.combination_id,
                    "iteration": first_combo.iteration,
                    "trace": self.get_trace_for_combination(first_combo.combination_id),
                }

                if len(result.conflicting_combinations) > 1:
                    duplicate_combo = result.conflicting_combinations[1]
                    trace_data["duplicate_occurrence"] = {
                        "combination_id": duplicate_combo.combination_id,
                        "iteration": duplicate_combo.iteration,
                        "trace": self.get_trace_for_combination(duplicate_combo.combination_id),
                    }

            paths.append(trace_data)

        return paths

    def get_trace_summary(self) -> Dict[str, Any]:
        """获取追溯统计摘要。"""
        phases = defaultdict(int)
        actions = defaultdict(int)
        combinations_with_trace = set()

        for step in self._all_steps:
            phases[step.phase] += 1
            actions[f"{step.phase}:{step.action}"] += 1
            if step.combination_ref:
                combinations_with_trace.add(step.combination_ref)

        return {
            "total_steps": len(self._all_steps),
            "combinations_traced": len(combinations_with_trace),
            "phase_distribution": dict(phases),
            "action_distribution": dict(actions),
        }

    def export_trace_to_json(self, filepath: str) -> None:
        """导出所有追溯数据到JSON文件。"""
        data = {
            "summary": self.get_trace_summary(),
            "all_steps": [
                {
                    "step_id": step.step_id,
                    "phase": step.phase,
                    "action": step.action,
                    "detail": step.detail,
                    "timestamp": step.timestamp,
                    "combination_ref": step.combination_ref,
                }
                for step in self._all_steps
            ],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def print_trace_chain(self, result: ValidationResult, max_depth: int = 20) -> str:
        """以可读格式打印追溯链。"""
        lines = [
            "=" * 70,
            "追溯链详情",
            "=" * 70,
            f"结果状态: {result.status.value}",
            f"冲突类型: {result.conflict_type.value if result.conflict_type else '无'}",
            f"核心信息: {result.message}",
            "",
            "决策路径:",
            "-" * 70,
        ]

        for i, step in enumerate(result.trace_path[:max_depth], 1):
            lines.append(
                f"{i:2d}. [{step.phase:8s}] {step.action:10s} - {step.detail[:80]}"
            )

        if len(result.trace_path) > max_depth:
            lines.append(f"    ... 还有 {len(result.trace_path) - max_depth} 步")

        if result.suggestion:
            lines.extend([
                "",
                "复核建议:",
                "-" * 70,
                result.suggestion,
            ])

        lines.append("=" * 70)
        return "\n".join(lines)
