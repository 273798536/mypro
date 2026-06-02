"""排课调度器。

整合组合枚举、约束过滤、追溯管理的核心调度器，
提供完整的排课校验工作流。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from .models import (
    InputData,
    ScheduleCombination,
    ScheduleReport,
    ValidationResult,
    ValidationStatus,
    ConflictType,
)
from .combination_engine import CombinationEngine
from .constraint_filter import ConstraintFilter
from .trace_manager import TraceManager
from .data_io import DataIO


class ScheduleValidator:
    """排课校验核心调度器。"""

    def __init__(self, input_data: Optional[InputData] = None):
        self.input_data = input_data
        self.engine: Optional[CombinationEngine] = None
        self.filter: Optional[ConstraintFilter] = None
        self.trace_manager: Optional[TraceManager] = None
        self.combinations: List[ScheduleCombination] = []
        self.report: Optional[ScheduleReport] = None

    @classmethod
    def from_files(
        cls,
        courses_file: str,
        teachers_file: str,
        classrooms_file: str,
    ) -> "ScheduleValidator":
        """从文件加载数据创建校验器。"""
        input_data = DataIO.load_input_data(courses_file, teachers_file, classrooms_file)
        return cls(input_data)

    def generate_combinations(self) -> List[ScheduleCombination]:
        """生成所有排课组合。"""
        if not self.input_data:
            raise ValueError("未加载输入数据")

        self.engine = CombinationEngine(self.input_data)
        self.combinations = list(self.engine.generate_combinations())
        return self.combinations

    def validate(self) -> ScheduleReport:
        """执行完整的排课校验。"""
        if not self.combinations:
            self.generate_combinations()

        engine_trace = self.engine.get_trace_steps() if self.engine else []

        self.filter = ConstraintFilter(trace_steps=engine_trace)
        self.report = self.filter.validate_all(self.combinations)

        all_trace = self.filter.get_all_trace_steps()
        self.trace_manager = TraceManager(all_trace)

        return self.report

    def run_full_workflow(self) -> ScheduleReport:
        """运行完整工作流：生成组合 -> 校验 -> 报告。"""
        self.generate_combinations()
        return self.validate()

    def get_trace_for_combination(self, combination_id: str) -> Dict[str, Any]:
        """获取指定组合的追溯信息。"""
        if not self.trace_manager:
            raise ValueError("尚未执行校验，请先调用 validate()")
        return self.trace_manager.get_trace_for_combination(combination_id)

    def get_trace_for_result(self, result: ValidationResult) -> Dict[str, Any]:
        """获取校验结果的追溯链。"""
        if not self.trace_manager:
            raise ValueError("尚未执行校验，请先调用 validate()")
        return self.trace_manager.get_trace_for_result(result)

    def get_duplicate_failure_paths(self) -> List[Dict[str, Any]]:
        """获取重复计数的失败路径。"""
        if not self.report or not self.trace_manager:
            raise ValueError("尚未执行校验，请先调用 validate()")
        return self.trace_manager.get_duplicate_failure_paths(self.report)

    def print_duplicate_failure_paths(self) -> str:
        """以可读格式打印重复计数失败路径。"""
        paths = self.get_duplicate_failure_paths()
        if not paths:
            return "未检测到重复计数。"

        lines = [
            "=" * 70,
            "重复计数失败路径分析",
            "=" * 70,
            f"共检测到 {len(paths)} 处重复计数",
            "",
        ]

        for i, path in enumerate(paths, 1):
            lines.extend([
                f"--- 重复组 #{i} ---",
                f"冲突类型: {path.get('failure_type', '重复计数')}",
                f"严重等级: {path.get('severity', '拦截')}",
                f"核心信息: {path.get('summary', {}).get('message', '')}",
                "",
            ])

            first = path.get("first_occurrence", {})
            if first:
                lines.extend([
                    "首次出现:",
                    f"  组合ID: {first.get('combination_id')}",
                    f"  迭代序号: {first.get('iteration')}",
                    f"  追溯步数: {first.get('trace', {}).get('step_count', 0)}",
                ])
                trace = first.get("trace", {}).get("detailed_trace", [])
                for j, step in enumerate(trace, 1):
                    lines.append(
                        f"    {j}. [{step['phase']}] {step['action']}: {step['detail'][:60]}"
                    )

            duplicate = path.get("duplicate_occurrence", {})
            if duplicate:
                lines.extend([
                    "",
                    "重复出现:",
                    f"  组合ID: {duplicate.get('combination_id')}",
                    f"  迭代序号: {duplicate.get('iteration')}",
                    f"  追溯步数: {duplicate.get('trace', {}).get('step_count', 0)}",
                ])
                trace = duplicate.get("trace", {}).get("detailed_trace", [])
                for j, step in enumerate(trace, 1):
                    lines.append(
                        f"    {j}. [{step['phase']}] {step['action']}: {step['detail'][:60]}"
                    )

            suggestion = path.get("summary", {}).get("suggestion", "")
            if suggestion:
                lines.extend([
                    "",
                    "复核建议:",
                ])
                for sl in suggestion.split("\n"):
                    lines.append(f"  {sl}")

            lines.append("")

        lines.append("=" * 70)
        return "\n".join(lines)

    def export_reports(self, output_dir: str, prefix: str = "schedule_report") -> Dict[str, str]:
        """导出所有报告。"""
        if not self.report:
            raise ValueError("尚未执行校验，请先调用 validate()")
        return DataIO.export_report(self.report, output_dir, prefix)

    def export_trace(self, filepath: str) -> None:
        """导出追溯数据。"""
        if not self.trace_manager:
            raise ValueError("尚未执行校验，请先调用 validate()")
        self.trace_manager.export_trace_to_json(filepath)

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息。"""
        stats = {
            "input": {
                "courses": len(self.input_data.courses) if self.input_data else 0,
                "teachers": len(self.input_data.teachers) if self.input_data else 0,
                "classrooms": len(self.input_data.classrooms) if self.input_data else 0,
            },
            "combinations": len(self.combinations),
        }

        if self.report:
            stats["report"] = {
                "total_combinations": self.report.total_combinations_generated,
                "valid_combinations": self.report.valid_combinations,
                "blocked_count": self.report.blocked_count,
                "failed_count": self.report.failed_count,
                "warning_count": self.report.warning_count,
            }

        if self.trace_manager:
            stats["trace"] = self.trace_manager.get_trace_summary()

        return stats

    def get_blocked_results(self) -> List[ValidationResult]:
        """获取被拦截的结果。"""
        if not self.report:
            return []
        return [
            r for r in self.report.results
            if r.status == ValidationStatus.BLOCKED
        ]

    def get_failed_results(self) -> List[ValidationResult]:
        """获取失败的结果。"""
        if not self.report:
            return []
        return [
            r for r in self.report.results
            if r.status == ValidationStatus.FAIL
        ]

    def get_results_by_conflict_type(
        self, conflict_type: ConflictType
    ) -> List[ValidationResult]:
        """按冲突类型获取结果。"""
        if not self.report:
            return []
        return [
            r for r in self.report.results
            if r.conflict_type == conflict_type
        ]
