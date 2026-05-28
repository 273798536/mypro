"""输入校验模块 - 验证输入数据的完整性和正确性"""

from __future__ import annotations
from typing import List, Dict, Any, Tuple, Optional
from ..core.models import ProblemInput, ResultStatus
from ..core.boundary import validate_geometry_inputs


class InputValidator:
    """输入验证器"""

    def __init__(self, strict: bool = False):
        self.strict = strict
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate(self, problem_input: ProblemInput) -> Tuple[ResultStatus, List[str], List[str]]:
        """验证ProblemInput的完整性和正确性"""
        self.errors = []
        self.warnings = []

        self._validate_basic_info(problem_input)
        self._validate_geometric_objects(problem_input)
        self._validate_boundary(problem_input)
        self._validate_physical_params(problem_input)

        if self.errors:
            status = ResultStatus.ERROR
        elif self.warnings:
            status = ResultStatus.WARNING
        else:
            status = ResultStatus.SUCCESS

        return status, self.errors, self.warnings

    def _validate_basic_info(self, p: ProblemInput):
        """验证基本信息"""
        if not p.problem_id:
            self.errors.append("题目编号(problem_id)不能为空")

        if not p.source:
            self.warnings.append("题目来源(source)未指定")

    def _validate_geometric_objects(self, p: ProblemInput):
        """验证几何对象"""
        if not p.mirror_segments:
            self.errors.append("至少需要定义一个镜面线段")

        if not p.incident_rays:
            self.errors.append("至少需要定义一条入射光线")

        geo_errors, geo_warnings = validate_geometry_inputs(
            p.mirror_segments, p.incident_rays, p.bounding_box
        )
        self.errors.extend(geo_errors)
        self.warnings.extend(geo_warnings)

        for i, seg in enumerate(p.mirror_segments):
            length = seg.length()
            if length < 1e-3:
                self.errors.append(f"镜面{seg.label}长度过小({length:.6f})，可能为退化线段")

        labels = set()
        for seg in p.mirror_segments:
            if seg.label in labels:
                self.warnings.append(f"镜面标签重复: {seg.label}")
            labels.add(seg.label)

        labels.clear()
        for ray in p.incident_rays:
            if ray.label in labels:
                self.warnings.append(f"光线标签重复: {ray.label}")
            labels.add(ray.label)

    def _validate_boundary(self, p: ProblemInput):
        """验证边界框"""
        bbox = p.bounding_box
        if bbox is None:
            self.warnings.append("未设置边界框，将不进行边界检查")
            return

        for seg in p.mirror_segments:
            if not bbox.contains(seg.start):
                self.warnings.append(f"镜面{seg.label}起点{seg.start}在边界框外")
            if not bbox.contains(seg.end):
                self.warnings.append(f"镜面{seg.label}终点{seg.end}在边界框外")

        for ray in p.incident_rays:
            if not bbox.contains(ray.origin):
                self.warnings.append(f"光线{ray.label}起点{ray.origin}在边界框外")

    def _validate_physical_params(self, p: ProblemInput):
        """验证物理参数"""
        if p.refractive_index_env < 1.0:
            self.errors.append(f"环境折射率 {p.refractive_index_env} 不能小于1")
        elif p.refractive_index_env > 3.0:
            self.warnings.append(f"环境折射率 {p.refractive_index_env} 过大，检查是否正确")

        for seg in p.mirror_segments:
            if seg.refractive_index < 1.0:
                self.errors.append(f"镜面{seg.label}折射率 {seg.refractive_index} 不能小于1")
            if seg.material.lower() == 'mirror' and seg.refractive_index != 1.0:
                self.warnings.append(f"镜面{seg.label}是反射镜，折射率通常为1.0，当前值为{seg.refractive_index}")


def validate_json_schema(data: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    """验证JSON数据是否符合预期的schema"""
    errors = []
    warnings = []

    required_fields = ['problem_id', 'mirror_segments', 'incident_rays']
    for field in required_fields:
        if field not in data:
            errors.append(f"缺少必填字段: {field}")

    if 'mirror_segments' in data:
        if not isinstance(data['mirror_segments'], list):
            errors.append("mirror_segments 必须是数组")
        else:
            for i, seg in enumerate(data['mirror_segments']):
                if not isinstance(seg, dict):
                    errors.append(f"mirror_segments[{i}] 必须是对象")
                else:
                    if 'start' not in seg:
                        errors.append(f"mirror_segments[{i}] 缺少 start 字段")
                    if 'end' not in seg:
                        errors.append(f"mirror_segments[{i}] 缺少 end 字段")

    if 'incident_rays' in data:
        if not isinstance(data['incident_rays'], list):
            errors.append("incident_rays 必须是数组")
        else:
            for i, ray in enumerate(data['incident_rays']):
                if not isinstance(ray, dict):
                    errors.append(f"incident_rays[{i}] 必须是对象")
                else:
                    if 'origin' not in ray:
                        errors.append(f"incident_rays[{i}] 缺少 origin 字段")
                    has_direction = any(k in ray for k in ['angle', 'direction', 'through'])
                    if not has_direction:
                        errors.append(f"incident_rays[{i}] 缺少方向定义（需要 angle、direction 或 through）")

    if 'angle_unit' in data:
        valid_units = ['degree', 'degrees', 'deg', 'radian', 'radians', 'rad', '°']
        if data['angle_unit'].lower() not in valid_units:
            warnings.append(f"angle_unit '{data['angle_unit']}' 不是标准值，建议使用 'degree' 或 'radian'")

    return len(errors) == 0, errors, warnings
