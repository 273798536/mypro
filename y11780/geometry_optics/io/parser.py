"""输入解析模块 - 支持JSON格式输入"""

from __future__ import annotations
import json
from typing import List, Dict, Any, Optional, Tuple
from ..core.models import (
    Point, Vector, LineSegment, Ray, BoundingBox,
    ProblemInput, AngleUnit, CorrectionRecord
)
from ..core.boundary import detect_angle_unit_issue, validate_geometry_inputs


class InputParser:
    """输入解析器，负责将JSON数据转换为ProblemInput对象"""

    def __init__(self, auto_correct: bool = True):
        self.auto_correct = auto_correct
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def parse_file(self, filepath: str) -> ProblemInput:
        """从JSON文件解析输入"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return self.parse_dict(data)
        except FileNotFoundError:
            raise ValueError(f"文件不存在: {filepath}")
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON解析错误: {e}")

    def parse_string(self, json_str: str) -> ProblemInput:
        """从JSON字符串解析输入"""
        try:
            data = json.loads(json_str)
            return self.parse_dict(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON解析错误: {e}")

    def parse_dict(self, data: Dict[str, Any]) -> ProblemInput:
        """从字典解析输入"""
        self.warnings = []
        self.errors = []

        problem_id = data.get('problem_id', '')
        if not problem_id:
            self.errors.append("缺少题目编号 problem_id")

        source = data.get('source', 'unknown')

        angle_unit_str = data.get('angle_unit', 'degree').lower()
        if angle_unit_str in ['degree', 'degrees', 'deg', '°']:
            angle_unit = AngleUnit.DEGREE
        elif angle_unit_str in ['radian', 'radians', 'rad']:
            angle_unit = AngleUnit.RADIAN
        else:
            self.errors.append(f"无效的角度单位: {angle_unit_str}，使用默认值 degree")
            angle_unit = AngleUnit.DEGREE

        refractive_index = float(data.get('refractive_index_env', 1.0))
        if refractive_index < 1.0:
            self.warnings.append(f"环境折射率 {refractive_index} < 1.0，可能不正确")

        bbox = self._parse_bounding_box(data.get('bounding_box'))
        segments = self._parse_segments(data.get('mirror_segments', []))
        rays = self._parse_rays(data.get('incident_rays', []), angle_unit)

        input_errors, input_warnings = validate_geometry_inputs(segments, rays, bbox)
        self.errors.extend(input_errors)
        self.warnings.extend(input_warnings)

        metadata = data.get('metadata', {})

        problem_input = ProblemInput(
            problem_id=problem_id,
            source=source,
            mirror_segments=segments,
            incident_rays=rays,
            bounding_box=bbox,
            angle_unit=angle_unit,
            refractive_index_env=refractive_index,
            metadata=metadata
        )

        for warning in self.warnings:
            if '自动修正' in warning or '已修正' in warning:
                pass

        if self.errors:
            raise ValueError("输入解析错误:\n" + "\n".join(f"  - {e}" for e in self.errors))

        return problem_input

    def _parse_point(self, data: Any, context: str = "") -> Point:
        """解析点坐标"""
        if isinstance(data, (list, tuple)):
            if len(data) == 2:
                return Point(float(data[0]), float(data[1]))
            elif len(data) == 3:
                return Point(float(data[0]), float(data[1]), float(data[2]))
            else:
                raise ValueError(f"{context}: 点坐标需要2或3个数值，得到{len(data)}个")
        elif isinstance(data, dict):
            x = float(data.get('x', 0))
            y = float(data.get('y', 0))
            z = data.get('z')
            if z is not None:
                return Point(x, y, float(z))
            return Point(x, y)
        else:
            raise ValueError(f"{context}: 无效的点格式: {data}")

    def _parse_vector(self, data: Any, context: str = "") -> Vector:
        """解析向量"""
        if isinstance(data, (list, tuple)):
            if len(data) == 2:
                return Vector(float(data[0]), float(data[1]))
            elif len(data) == 3:
                return Vector(float(data[0]), float(data[1]), float(data[2]))
            else:
                raise ValueError(f"{context}: 向量需要2或3个数值，得到{len(data)}个")
        elif isinstance(data, dict):
            x = float(data.get('x', 0))
            y = float(data.get('y', 0))
            z = data.get('z')
            if z is not None:
                return Vector(x, y, float(z))
            return Vector(x, y)
        else:
            raise ValueError(f"{context}: 无效的向量格式: {data}")

    def _parse_bounding_box(self, data: Optional[Dict[str, Any]]) -> Optional[BoundingBox]:
        """解析边界框"""
        if data is None:
            return None

        try:
            x_min = float(data.get('x_min', 0))
            x_max = float(data.get('x_max', 0))
            y_min = float(data.get('y_min', 0))
            y_max = float(data.get('y_max', 0))
            z_min = data.get('z_min')
            z_max = data.get('z_max')

            if z_min is not None and z_max is not None:
                return BoundingBox(
                    x_min=x_min, x_max=x_max,
                    y_min=y_min, y_max=y_max,
                    z_min=float(z_min), z_max=float(z_max)
                )
            return BoundingBox(
                x_min=x_min, x_max=x_max,
                y_min=y_min, y_max=y_max
            )
        except (ValueError, TypeError) as e:
            self.errors.append(f"边界框解析错误: {e}")
            return None

    def _parse_segments(self, data: List[Dict[str, Any]]) -> List[LineSegment]:
        """解析镜面线段"""
        segments = []
        for i, seg_data in enumerate(data):
            try:
                label = seg_data.get('label', f'M{i+1}')
                start = self._parse_point(seg_data.get('start'), f"镜面{label}起点")
                end = self._parse_point(seg_data.get('end'), f"镜面{label}终点")
                material = seg_data.get('material', 'mirror')
                n = float(seg_data.get('refractive_index', 1.0))

                segments.append(LineSegment(
                    start=start, end=end,
                    label=label,
                    material=material,
                    refractive_index=n
                ))
            except Exception as e:
                self.errors.append(f"镜面线段{i+1}解析错误: {e}")

        if not segments:
            self.warnings.append("没有定义任何镜面线段")

        return segments

    def _parse_rays(self, data: List[Dict[str, Any]], angle_unit: AngleUnit) -> List[Ray]:
        """解析入射光线"""
        rays = []
        for i, ray_data in enumerate(data):
            try:
                label = ray_data.get('label', f'R{i+1}')
                origin = self._parse_point(ray_data.get('origin'), f"光线{label}起点")

                direction = None
                angle = ray_data.get('angle')
                direction_data = ray_data.get('direction')
                through_data = ray_data.get('through')

                if angle is not None:
                    angle_val = float(angle)
                    is_suspicious, issue_msg = detect_angle_unit_issue(angle_val, angle_unit)
                    if is_suspicious and self.auto_correct:
                        self.warnings.append(
                            f"光线{label}: {issue_msg}。已自动修正角度单位。"
                        )
                        if angle_unit == AngleUnit.RADIAN:
                            corrected_angle = angle_val
                        else:
                            corrected_angle = math.radians(angle_val) if angle_val < 0.01 else angle_val
                        direction = Vector.from_angle(corrected_angle, AngleUnit.RADIAN if angle_val < 0.01 else angle_unit)
                    else:
                        if issue_msg:
                            self.warnings.append(f"光线{label}: {issue_msg}")
                        direction = Vector.from_angle(angle_val, angle_unit)

                elif direction_data is not None:
                    direction = self._parse_vector(direction_data, f"光线{label}方向")
                    direction = direction.normalize()

                elif through_data is not None:
                    through = self._parse_point(through_data, f"光线{label}通过点")
                    direction = Vector.from_points(origin, through).normalize()

                else:
                    raise ValueError("需要指定 angle、direction 或 through 之一来定义光线方向")

                wavelength = ray_data.get('wavelength')
                if wavelength is not None:
                    wavelength = float(wavelength)

                rays.append(Ray(
                    origin=origin,
                    direction=direction,
                    label=label,
                    wavelength=wavelength
                ))

            except Exception as e:
                self.errors.append(f"入射光线{i+1}解析错误: {e}")

        if not rays:
            self.warnings.append("没有定义任何入射光线")

        return rays


import math
