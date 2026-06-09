"""
容错处理模块
参数表缺失时不整批失败，先计算能算的，再把缺口列给算法工程师补
"""

from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum


class GapSeverity(str, Enum):
    """缺口严重程度"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ParameterGap:
    """参数缺口"""
    parameter_name: str
    description: str
    severity: GapSeverity
    current_value: Optional[Any] = None
    suggested_value: Optional[Any] = None
    recoverable: bool = True
    affected_items: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parameter": self.parameter_name,
            "description": self.description,
            "severity": self.severity.value,
            "current_value": str(self.current_value) if self.current_value is not None else None,
            "suggested_value": str(self.suggested_value) if self.suggested_value is not None else None,
            "recoverable": self.recoverable,
            "affected_items": self.affected_items
        }


@dataclass
class FaultTolerantResult:
    """容错处理结果"""
    success_count: int = 0
    partial_count: int = 0
    failed_count: int = 0
    total_count: int = 0
    gaps: List[ParameterGap] = field(default_factory=list)
    process_notes: List[str] = field(default_factory=list)
    results: List[Any] = field(default_factory=list)

    @property
    def has_gaps(self) -> bool:
        return len(self.gaps) > 0

    @property
    def critical_gaps(self) -> List[ParameterGap]:
        return [g for g in self.gaps if g.severity == GapSeverity.CRITICAL]

    @property
    def warning_gaps(self) -> List[ParameterGap]:
        return [g for g in self.gaps if g.severity == GapSeverity.WARNING]

    def generate_gap_report(self) -> List[str]:
        """生成缺口报告，供算法工程师补全"""
        lines = []
        lines.append("=" * 60)
        lines.append("参数缺口报告（请算法工程师补全）")
        lines.append("=" * 60)
        lines.append(f"\n处理概况: 成功 {self.success_count} / 部分成功 {self.partial_count} / 失败 {self.failed_count} / 总计 {self.total_count}")

        if not self.gaps:
            lines.append("\n✓ 无参数缺口，所有项目处理完成")
            return lines

        lines.append(f"\n共发现 {len(self.gaps)} 个参数缺口:")

        critical = self.critical_gaps
        if critical:
            lines.append(f"\n【严重】({len(critical)} 个) - 可能影响结果正确性:")
            for i, g in enumerate(critical, 1):
                lines.append(f"  {i}. {g.parameter_name}")
                lines.append(f"     描述: {g.description}")
                if g.current_value is not None:
                    lines.append(f"     当前值: {g.current_value}")
                if g.suggested_value is not None:
                    lines.append(f"     建议值: {g.suggested_value}")
                if g.affected_items:
                    lines.append(f"     影响项: {', '.join(g.affected_items)}")
                lines.append(f"     是否可恢复: {'是' if g.recoverable else '否'}")

        warning = self.warning_gaps
        if warning:
            lines.append(f"\n【警告】({len(warning)} 个) - 建议补充但不影响运行:")
            for i, g in enumerate(warning, 1):
                lines.append(f"  {i}. {g.parameter_name}")
                lines.append(f"     描述: {g.description}")
                if g.suggested_value is not None:
                    lines.append(f"     建议值: {g.suggested_value}")

        info = [g for g in self.gaps if g.severity == GapSeverity.INFO]
        if info:
            lines.append(f"\n【提示】({len(info)} 个):")
            for i, g in enumerate(info, 1):
                lines.append(f"  {i}. {g.parameter_name}: {g.description}")

        if self.process_notes:
            lines.append("\n处理说明:")
            for note in self.process_notes:
                lines.append(f"  - {note}")

        lines.append("\n建议操作:")
        lines.append("  1. 优先修复【严重】级别的缺口")
        lines.append("  2. 补充缺失参数后可使用 --continue 参数继续处理")
        lines.append("  3. 导出缺口报告: euler-inspect gaps --export gaps.json")
        lines.append("\n" + "=" * 60)
        return lines


class FaultTolerantProcessor:
    """容错处理器"""

    def __init__(self):
        self._gaps: List[ParameterGap] = []
        self._notes: List[str] = []

    def add_gap(self, gap: ParameterGap) -> None:
        """添加一个参数缺口"""
        self._gaps.append(gap)

    def add_note(self, note: str) -> None:
        """添加处理说明"""
        self._notes.append(note)

    def check_required(
        self,
        params: Dict[str, Any],
        required: List[str],
        defaults: Optional[Dict[str, Any]] = None,
        context: str = ""
    ) -> Dict[str, Any]:
        """
        检查必需参数，缺失时用默认值并记录缺口
        不会让整个批次失败
        """
        defaults = defaults or {}
        result = dict(params)
        missing_used = []

        for name in required:
            if name not in params or params[name] is None:
                if name in defaults:
                    result[name] = defaults[name]
                    self._gaps.append(ParameterGap(
                        parameter_name=name,
                        description=f"参数 '{name}' 缺失，已使用默认值",
                        severity=GapSeverity.WARNING,
                        current_value=None,
                        suggested_value=defaults[name],
                        recoverable=True,
                        affected_items=[context] if context else []
                    ))
                    missing_used.append(name)
                else:
                    self._gaps.append(ParameterGap(
                        parameter_name=name,
                        description=f"必需参数 '{name}' 缺失且无默认值",
                        severity=GapSeverity.CRITICAL,
                        current_value=None,
                        recoverable=False,
                        affected_items=[context] if context else []
                    ))

        if missing_used:
            ctx = f"[{context}] " if context else ""
            self._notes.append(f"{ctx}参数 {', '.join(missing_used)} 使用了默认值")

        return result

    def process_with_fallback(
        self,
        items: List[Any],
        process_fn: Callable[[Any, Dict[str, Any]], Any],
        params: Optional[Dict[str, Any]] = None,
        required_params: Optional[List[str]] = None,
        default_params: Optional[Dict[str, Any]] = None
    ) -> FaultTolerantResult:
        """
        容错式批量处理
        单个项目失败不影响其他项目
        参数缺失时尝试用默认值继续
        """
        params = params or {}
        required_params = required_params or []
        default_params = default_params or {}

        result = FaultTolerantResult()
        result.total_count = len(items)

        effective_params = self.check_required(
            params, required_params, default_params, "批量处理"
        )

        for i, item in enumerate(items):
            item_context = f"第{i+1}项"
            try:
                item_params = effective_params.copy()
                processed = process_fn(item, item_params)

                if processed is None:
                    result.partial_count += 1
                    self._notes.append(f"{item_context}: 部分处理完成")
                elif hasattr(processed, 'errors') and processed.errors:
                    result.partial_count += 1
                    self._notes.append(f"{item_context}: 处理完成但有错误: {'; '.join(processed.errors)}")
                else:
                    result.success_count += 1

                result.results.append(processed)

            except Exception as e:
                result.failed_count += 1
                self._notes.append(f"{item_context}: 处理失败 - {str(e)}")
                self._gaps.append(ParameterGap(
                    parameter_name=f"item_{i}_processing",
                    description=f"处理异常: {str(e)}",
                    severity=GapSeverity.CRITICAL,
                    recoverable=False,
                    affected_items=[item_context]
                ))
                result.results.append(None)

        result.gaps = self._gaps.copy()
        result.process_notes = self._notes.copy()
        return result

    def reset(self) -> None:
        """重置状态"""
        self._gaps.clear()
        self._notes.clear()
