"""
分形生成服务 - 整合所有组件的核心服务
"""
import io
import time
from typing import Dict, Any, Optional, Tuple
from PIL import Image

from fractal_generator import create_fractal, FRACTAL_CLASSES
from validator import FractalValidator, ColorSchemeValidator, validate_student_note
from color_schemes import apply_color_scheme, array_to_image, save_image
from storage import FractalStorage, FractalRecord
from presets import PerformanceGuard, ParameterPresetManager, FractalPreset


class FractalGenerationError(Exception):
    """分形生成异常"""
    def __init__(self, message: str, code: str, details: Dict[str, Any] = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


class FractalService:
    """分形生成服务"""

    def __init__(self, data_dir: str = "data"):
        self.storage = FractalStorage(data_dir)
        self.performance_guard = PerformanceGuard()
        self.preset_manager = ParameterPresetManager()

    def generate_fractal(self, fractal_type: str, params: Dict[str, Any],
                         color_scheme: str, width: int = 800, height: int = 600,
                         student_note: str = "", save: bool = True,
                         parent_id: Optional[str] = None,
                         source: str = "manual",
                         auto_safe: bool = True) -> Dict[str, Any]:
        """
        生成分形图案

        Args:
            fractal_type: 分形类型
            params: 分形参数
            color_scheme: 颜色方案
            width: 图像宽度
            height: 图像高度
            student_note: 学生备注
            save: 是否保存记录
            parent_id: 父记录ID（用于迭代追踪）
            source: 来源标识
            auto_safe: 是否自动应用安全参数

        Returns:
            生成结果字典
        """
        validation_msgs = []

        v_result = FractalValidator.validate(fractal_type, dict(params), width, height)
        validation_msgs.extend(v_result.to_dict()["messages"])

        if not v_result.valid:
            error_msg = "; ".join([m["message"] for m in v_result.to_dict()["messages"] if m["severity"] == "error"])
            raise FractalGenerationError(
                f"参数验证失败: {error_msg}",
                "VALIDATION_ERROR",
                {"validation_messages": validation_msgs}
            )

        safe_params = dict(params)
        if auto_safe:
            safe_params = self.performance_guard.get_safe_params(
                fractal_type, v_result.corrected_params, width, height
            )

        cs_result = ColorSchemeValidator.validate(color_scheme)
        validation_msgs.extend(cs_result.to_dict()["messages"])

        if not cs_result.valid:
            raise FractalGenerationError(
                f"颜色方案验证失败: {cs_result.to_dict()['messages']}",
                "COLOR_SCHEME_ERROR",
                {"validation_messages": validation_msgs}
            )

        note_result = validate_student_note(student_note)
        validation_msgs.extend(note_result.to_dict()["messages"])
        final_note = note_result.corrected_params.get("note", student_note)

        self.performance_guard.start()

        try:
            fractal = create_fractal(fractal_type, width, height)
            iterations, mask = fractal.generate(**safe_params)

            max_iter = safe_params.get("max_iter", safe_params.get("depth", 100))
            rgb_array = apply_color_scheme(iterations, mask, max_iter, color_scheme)
            image = array_to_image(rgb_array)

            render_time_ms = self.performance_guard.stop()

            if image.width != width or image.height != height:
                width, height = image.width, image.height

            image_bytes = None
            if save:
                img_buffer = io.BytesIO()
                image.save(img_buffer, format='PNG')
                image_bytes = img_buffer.getvalue()

            record = None
            if save:
                record = self.storage.save_record(
                    fractal_type=fractal_type,
                    params=safe_params,
                    color_scheme=color_scheme,
                    width=width,
                    height=height,
                    student_note=final_note,
                    validation_messages=validation_msgs,
                    render_time_ms=render_time_ms,
                    image_data=image_bytes,
                    parent_id=parent_id,
                    source=source,
                )

            return {
                "success": True,
                "image": image,
                "record": record,
                "render_time_ms": render_time_ms,
                "validation_messages": validation_msgs,
                "params_used": safe_params,
            }

        except Exception as e:
            self.performance_guard.stop()
            raise FractalGenerationError(
                f"分形生成失败: {str(e)}",
                "GENERATION_ERROR",
                {"original_error": str(e), "validation_messages": validation_msgs}
            )

    def generate_from_preset(self, preset_name: str, save: bool = True) -> Dict[str, Any]:
        """从预设生成分形"""
        preset = self.preset_manager.get_preset(preset_name)
        if not preset:
            raise FractalGenerationError(
                f"预设不存在: {preset_name}",
                "PRESET_NOT_FOUND"
            )

        return self.generate_fractal(
            fractal_type=preset.fractal_type,
            params=preset.params,
            color_scheme=preset.color_scheme,
            width=preset.width,
            height=preset.height,
            student_note=f"使用预设: {preset.name}",
            save=save,
            source="preset",
        )

    def revise_record(self, record_id: str, new_params: Dict[str, Any],
                       new_color_scheme: Optional[str] = None,
                       new_note: str = "") -> Dict[str, Any]:
        """基于现有记录创建修订版本"""
        original = self.storage.get_record(record_id)
        if not original:
            raise FractalGenerationError(
                f"记录不存在: {record_id}",
                "RECORD_NOT_FOUND"
            )

        params = dict(original.params)
        params.update(new_params)
        color_scheme = new_color_scheme or original.color_scheme

        return self.generate_fractal(
            fractal_type=original.fractal_type,
            params=params,
            color_scheme=color_scheme,
            width=original.width,
            height=original.height,
            student_note=new_note,
            save=True,
            parent_id=record_id,
            source="revision",
        )

    def export_image(self, record_id: str, output_path: str,
                     format: str = 'PNG', scale: float = 1.0) -> bool:
        """导出记录的图像"""
        record = self.storage.get_record(record_id)
        if not record or not record.image_path:
            return False

        try:
            image = Image.open(record.image_path)
            if scale != 1.0:
                new_size = (int(image.width * scale), int(image.height * scale))
                image = image.resize(new_size, Image.LANCZOS)
            image.save(output_path, format=format)
            return True
        except Exception:
            return False

    def get_estimate(self, fractal_type: str, params: Dict[str, Any],
                     width: int, height: int) -> Dict[str, Any]:
        """获取渲染预估信息"""
        max_iter = params.get("max_iter", params.get("depth", 100))
        v_result = FractalValidator.validate(fractal_type, dict(params), width, height)
        
        safe_params = self.performance_guard.get_safe_params(
            fractal_type, v_result.corrected_params, width, height
        )
        safe_max_iter = safe_params.get("max_iter", safe_params.get("depth", max_iter))

        estimate = self.performance_guard.estimate_render_time(
            fractal_type, safe_max_iter, width, height
        )

        return {
            "estimate": estimate,
            "validation": v_result.to_dict(),
            "safe_params": safe_params,
        }

    def list_presets(self, difficulty: Optional[str] = None) -> list:
        """列出预设"""
        presets = self.preset_manager.list_presets(difficulty)
        return [
            {
                "name": p.name,
                "description": p.description,
                "fractal_type": p.fractal_type,
                "difficulty": p.difficulty,
                "params": p.params,
                "color_scheme": p.color_scheme,
            }
            for p in presets
        ]

    def get_fractal_info(self) -> Dict[str, Any]:
        """获取支持的分形类型信息"""
        return {
            "fractal_types": list(FRACTAL_CLASSES.keys()),
            "color_schemes": list(ColorSchemeValidator.VALID_SCHEMES.keys()),
            "color_scheme_names": ColorSchemeValidator.VALID_SCHEMES,
        }

    def get_statistics(self) -> Dict[str, Any]:
        """获取系统统计信息"""
        return self.storage.get_statistics()
