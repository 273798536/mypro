from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class WarningType(Enum):
    LOAD_OUT_OF_BOUNDS = "load_out_of_bounds"
    UNIT_MISMATCH = "unit_mismatch"
    NEGATIVE_REACTION = "negative_reaction"
    ZERO_LOAD = "zero_load"
    NON_STANDARD_BOUNDARY = "non_standard_boundary"
    UNIT_CONVERSION = "unit_conversion"
    OVERLAPPING_LOADS = "overlapping_loads"
    SINGULARITY = "singularity"
    STRESS_EXCEEDED = "stress_exceeded"
    MISSING_DATA = "missing_data"
    INVALID_INPUT = "invalid_input"
    MISSING_DEPENDENCY = "missing_dependency"


class WarningLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Warning:
    warning_type: WarningType
    level: WarningLevel
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "warning_type": self.warning_type.value,
            "level": self.level.value,
            "message": self.message,
            "details": {k: str(v) for k, v in self.details.items()},
            "source": self.source,
        }

    def __str__(self) -> str:
        src = f" [{self.source}]" if self.source else ""
        return f"[{self.level.value.upper()}]{src} {self.message}"


@dataclass
class WarningCollector:
    warnings: List[Warning] = field(default_factory=list)

    def add(self,
            warning_type: WarningType,
            level: WarningLevel,
            message: str,
            details: Optional[Dict[str, Any]] = None,
            source: Optional[str] = None) -> Warning:
        warning = Warning(
            warning_type=warning_type,
            level=level,
            message=message,
            details=details or {},
            source=source,
        )
        self.warnings.append(warning)
        return warning

    def load_out_of_bounds(self,
                           position: Any,
                           beam_length: Any,
                           source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.LOAD_OUT_OF_BOUNDS,
            level=WarningLevel.ERROR,
            message=f"载荷位置 {position} 超出梁范围 [0, {beam_length}]",
            details={"position": position, "beam_length": beam_length},
            source=source,
        )

    def unit_mismatch(self,
                      parameter: str,
                      actual_unit: str,
                      expected_unit: str,
                      source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.UNIT_MISMATCH,
            level=WarningLevel.WARNING,
            message=f"参数 '{parameter}' 使用单位 {actual_unit}，与系统单位 {expected_unit} 不一致，将自动转换",
            details={"parameter": parameter, "actual_unit": actual_unit, "expected_unit": expected_unit},
            source=source,
        )

    def negative_reaction(self,
                          support: str,
                          reaction_value: Any,
                          source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.NEGATIVE_REACTION,
            level=WarningLevel.WARNING,
            message=f"{support} 支座反力为负值 ({reaction_value})，可能表示梁有抬升趋势或需要锚固",
            details={"support": support, "reaction_value": reaction_value},
            source=source,
        )

    def zero_load(self, load_index: int, source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.ZERO_LOAD,
            level=WarningLevel.WARNING,
            message=f"载荷 #{load_index} 大小为零，将被忽略",
            details={"load_index": load_index},
            source=source,
        )

    def non_standard_boundary(self,
                              left_support: str,
                              right_support: str,
                              source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.NON_STANDARD_BOUNDARY,
            level=WarningLevel.INFO,
            message=f"边界条件 ({left_support}, {right_support}) 非标准简支梁 (铰支+滚动支座)",
            details={"left_support": left_support, "right_support": right_support},
            source=source,
        )

    def unit_conversion(self,
                        original: Any,
                        converted: Any,
                        source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.UNIT_CONVERSION,
            level=WarningLevel.INFO,
            message=f"单位转换: {original} → {converted}",
            details={"original": original, "converted": converted},
            source=source,
        )

    def stress_exceeded(self,
                        stress_type: str,
                        stress_value: Any,
                        allowable: Any,
                        source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.STRESS_EXCEEDED,
            level=WarningLevel.CRITICAL,
            message=f"{stress_type} {stress_value} 超过许用应力 {allowable}",
            details={"stress_type": stress_type, "stress_value": stress_value, "allowable": allowable},
            source=source,
        )

    def missing_data(self,
                     parameter: str,
                     calculation: str,
                     source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.MISSING_DATA,
            level=WarningLevel.WARNING,
            message=f"缺少参数 '{parameter}'，{calculation} 将被跳过",
            details={"parameter": parameter, "calculation": calculation},
            source=source,
        )

    def invalid_input(self,
                      parameter: str,
                      value: Any,
                      reason: str,
                      source: Optional[str] = None) -> Warning:
        return self.add(
            warning_type=WarningType.INVALID_INPUT,
            level=WarningLevel.ERROR,
            message=f"参数 '{parameter}' = {value} 无效: {reason}",
            details={"parameter": parameter, "value": value, "reason": reason},
            source=source,
        )

    def get_by_type(self, warning_type: WarningType) -> List[Warning]:
        return [w for w in self.warnings if w.warning_type == warning_type]

    def get_by_level(self, level: WarningLevel) -> List[Warning]:
        return [w for w in self.warnings if w.level == level]

    def has_errors(self) -> bool:
        return any(w.level in [WarningLevel.ERROR, WarningLevel.CRITICAL] for w in self.warnings)

    def to_dict(self) -> List[Dict[str, Any]]:
        return [w.to_dict() for w in self.warnings]

    def clear(self) -> None:
        self.warnings.clear()

    def __iter__(self):
        return iter(self.warnings)

    def __len__(self) -> int:
        return len(self.warnings)

    def __str__(self) -> str:
        if not self.warnings:
            return "无警告"
        return "\n".join(str(w) for w in self.warnings)
