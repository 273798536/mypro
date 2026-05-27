"""
参数验证和异常处理模块
"""
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class ValidationSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ValidationMessage:
    severity: ValidationSeverity
    field: str
    message: str
    code: str
    suggestion: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity.value,
            "field": self.field,
            "message": self.message,
            "code": self.code,
            "suggestion": self.suggestion,
        }


@dataclass
class ValidationResult:
    valid: bool
    messages: List[ValidationMessage] = field(default_factory=list)
    corrected_params: Dict[str, Any] = field(default_factory=dict)

    def add(self, severity: ValidationSeverity, field: str, message: str, 
            code: str, suggestion: Optional[str] = None):
        self.messages.append(ValidationMessage(severity, field, message, code, suggestion))
        if severity == ValidationSeverity.ERROR:
            self.valid = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "messages": [m.to_dict() for m in self.messages],
            "corrected_params": self.corrected_params,
        }


class FractalValidator:
    """分形参数验证器"""

    # 参数约束
    CONSTRAINTS = {
        "mandelbrot": {
            "max_iter": {"min": 1, "max": 10000, "default": 100},
            "zoom": {"min": 0.1, "max": 100000, "default": 1.0},
            "center_x": {"min": -10, "max": 10, "default": -0.5},
            "center_y": {"min": -10, "max": 10, "default": 0.0},
            "escape_radius": {"min": 1.5, "max": 10, "default": 2.0},
        },
        "julia": {
            "max_iter": {"min": 1, "max": 10000, "default": 100},
            "zoom": {"min": 0.1, "max": 100000, "default": 1.0},
            "center_x": {"min": -10, "max": 10, "default": 0.0},
            "center_y": {"min": -10, "max": 10, "default": 0.0},
            "c_real": {"min": -2, "max": 2, "default": -0.7},
            "c_imag": {"min": -2, "max": 2, "default": 0.27015},
            "escape_radius": {"min": 1.5, "max": 10, "default": 2.0},
        },
        "sierpinski": {
            "depth": {"min": 1, "max": 10, "default": 6},
        },
        "burning_ship": {
            "max_iter": {"min": 1, "max": 10000, "default": 100},
            "zoom": {"min": 0.1, "max": 100000, "default": 1.0},
            "center_x": {"min": -10, "max": 10, "default": -0.5},
            "center_y": {"min": -10, "max": 10, "default": -0.5},
            "escape_radius": {"min": 1.5, "max": 10, "default": 2.0},
        },
    }

    # 性能预警阈值
    PERFORMANCE_THRESHOLDS = {
        "max_iter_warning": 500,
        "max_iter_danger": 2000,
        "zoom_warning": 1000,
        "zoom_danger": 10000,
        "size_warning": 1024,
        "size_danger": 2048,
    }

    @classmethod
    def validate(cls, fractal_type: str, params: Dict[str, Any],
                 width: int = 800, height: int = 600) -> ValidationResult:
        result = ValidationResult(valid=True)

        if fractal_type not in cls.CONSTRAINTS:
            result.add(
                ValidationSeverity.ERROR,
                "fractal_type",
                f"未知的分形类型: {fractal_type}",
                "UNKNOWN_FRACTAL",
                f"请选择以下类型之一: {list(cls.CONSTRAINTS.keys())}"
            )
            return result

        constraints = cls.CONSTRAINTS[fractal_type]

        cls._validate_dimensions(result, width, height)

        for param_name, constraint in constraints.items():
            if param_name not in params:
                params[param_name] = constraint["default"]
                result.corrected_params[param_name] = constraint["default"]
                result.add(
                    ValidationSeverity.INFO,
                    param_name,
                    f"使用默认值: {constraint['default']}",
                    "DEFAULT_USED"
                )
                continue

            value = params[param_name]
            cls._validate_numeric_param(result, param_name, value, constraint)
            cls._check_performance_warnings(result, param_name, value, width, height)

        return result

    @classmethod
    def _validate_dimensions(cls, result: ValidationResult, width: int, height: int):
        if not isinstance(width, int) or not isinstance(height, int):
            result.add(
                ValidationSeverity.ERROR,
                "dimensions",
                "图像尺寸必须是整数",
                "INVALID_DIMENSION_TYPE"
            )
            return

        if width <= 0 or height <= 0:
            result.add(
                ValidationSeverity.ERROR,
                "dimensions",
                "图像尺寸必须为正整数",
                "INVALID_DIMENSION_VALUE"
            )
            return

        if width > 4096 or height > 4096:
            result.add(
                ValidationSeverity.ERROR,
                "dimensions",
                f"图像尺寸过大 ({width}x{height})，最大支持4096x4096",
                "DIMENSION_TOO_LARGE",
                "建议缩小尺寸或使用分块渲染"
            )

    @classmethod
    def _validate_numeric_param(cls, result: ValidationResult, param_name: str,
                                 value: Any, constraint: Dict[str, Any]):
        try:
            num_value = float(value)
        except (TypeError, ValueError):
            result.add(
                ValidationSeverity.ERROR,
                param_name,
                f"参数 '{param_name}' 必须是数值类型，收到: {type(value).__name__}",
                "INVALID_TYPE",
                f"请输入介于 {constraint['min']} 和 {constraint['max']} 之间的数值"
            )
            result.corrected_params[param_name] = constraint["default"]
            return

        if num_value < constraint["min"]:
            result.add(
                ValidationSeverity.WARNING,
                param_name,
                f"参数 '{param_name}' = {num_value} 低于最小值 {constraint['min']}",
                "BELOW_MIN",
                f"已自动调整为 {constraint['min']}"
            )
            result.corrected_params[param_name] = constraint["min"]
        elif num_value > constraint["max"]:
            result.add(
                ValidationSeverity.WARNING,
                param_name,
                f"参数 '{param_name}' = {num_value} 高于最大值 {constraint['max']}",
                "ABOVE_MAX",
                f"已自动调整为 {constraint['max']}"
            )
            result.corrected_params[param_name] = constraint["max"]
        else:
            result.corrected_params[param_name] = num_value

    @classmethod
    def _check_performance_warnings(cls, result: ValidationResult, param_name: str,
                                     value: float, width: int, height: int):
        thresholds = cls.PERFORMANCE_THRESHOLDS

        if param_name == "max_iter":
            if value >= thresholds["max_iter_danger"]:
                result.add(
                    ValidationSeverity.WARNING,
                    param_name,
                    f"迭代次数 {int(value)} 可能导致严重卡顿",
                    "PERF_DANGER",
                    "建议降低迭代次数，或使用小尺寸预览"
                )
            elif value >= thresholds["max_iter_warning"]:
                result.add(
                    ValidationSeverity.INFO,
                    param_name,
                    f"迭代次数 {int(value)} 可能较慢",
                    "PERF_WARNING",
                    "如需更快渲染可降低迭代次数"
                )

        if param_name == "zoom":
            if value >= thresholds["zoom_danger"]:
                result.add(
                    ValidationSeverity.WARNING,
                    param_name,
                    f"缩放倍数 {value} 极高，可能导致精度不足或性能问题",
                    "ZOOM_DANGER",
                    "极高缩放可能出现像素化，考虑使用高精度模式"
                )
            elif value >= thresholds["zoom_warning"]:
                result.add(
                    ValidationSeverity.INFO,
                    param_name,
                    f"缩放倍数 {value} 较高，可能需要增加迭代次数",
                    "ZOOM_WARNING",
                    "高缩放时建议同步增加迭代次数"
                )

        if width >= thresholds["size_danger"] or height >= thresholds["size_danger"]:
            result.add(
                ValidationSeverity.WARNING,
                "dimensions",
                f"图像尺寸 {width}x{height} 很大，渲染会较慢",
                "SIZE_DANGER",
                "建议先使用小尺寸预览，确认后再导出大图"
            )


class ColorSchemeValidator:
    """颜色方案验证器"""

    VALID_SCHEMES = {
        "rainbow": "彩虹色",
        "ocean": "海洋蓝",
        "fire": "火焰红",
        "forest": "森林绿",
        "sunset": "日落橙",
        "neon": "霓虹色",
        "grayscale": "灰度",
        "inferno": "地狱火",
        "viridis": "青绿渐变",
        "plasma": "等离子",
    }

    CONTRAST_THRESHOLD = 50

    @classmethod
    def validate(cls, scheme: str, colors: Optional[List[str]] = None) -> ValidationResult:
        result = ValidationResult(valid=True)

        if scheme not in cls.VALID_SCHEMES:
            result.add(
                ValidationSeverity.ERROR,
                "color_scheme",
                f"未知的颜色方案: {scheme}",
                "UNKNOWN_SCHEME",
                f"可用方案: {list(cls.VALID_SCHEMES.keys())}"
            )
            return result

        if colors:
            for i, color in enumerate(colors):
                if not cls._is_valid_hex_color(color):
                    result.add(
                        ValidationSeverity.WARNING,
                        f"custom_color_{i}",
                        f"颜色 {color} 不是有效的十六进制颜色",
                        "INVALID_COLOR",
                        "请使用 #RRGGBB 格式"
                    )

        return result

    @classmethod
    def _is_valid_hex_color(cls, color: str) -> bool:
        if not isinstance(color, str):
            return False
        color = color.strip()
        if not color.startswith("#"):
            return False
        if len(color) not in (4, 7):
            return False
        hex_chars = set("0123456789abcdefABCDEF")
        return all(c in hex_chars for c in color[1:])


def validate_student_note(note: str, max_length: int = 500) -> ValidationResult:
    """验证学生备注"""
    result = ValidationResult(valid=True)

    if not note:
        result.add(
            ValidationSeverity.INFO,
            "note",
            "备注为空",
            "EMPTY_NOTE",
            "建议添加备注以记录创作思路"
        )
        return result

    if len(note) > max_length:
        result.add(
            ValidationSeverity.WARNING,
            "note",
            f"备注过长 ({len(note)}字符)，最大支持{max_length}字符",
            "NOTE_TOO_LONG",
            f"已截取前{max_length}字符"
        )
        result.corrected_params["note"] = note[:max_length]

    return result
