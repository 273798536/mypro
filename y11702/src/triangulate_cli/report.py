from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from .models import (
    Correction,
    InputData,
    MapBounds,
    Observation,
    ObservationStatus,
    TriangulationResult,
)
from .parser import ParseError
from .triangulation import AlgorithmWarning


@dataclass
class ReportConfig:
    include_raw_data: bool = True
    include_corrections: bool = True
    include_warnings: bool = True
    max_decimal_places: int = 4


class ReportGenerator:
    def __init__(self, config: Optional[ReportConfig] = None):
        self.config = config or ReportConfig()

    def _format_timestamp(self, timestamp: float) -> str:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")

    def _observation_to_dict(self, obs: Observation) -> dict:
        return {
            "id": obs.id,
            "station_id": obs.station_id,
            "position": {
                "x": round(obs.position.x, self.config.max_decimal_places),
                "y": round(obs.position.y, self.config.max_decimal_places),
                "system": obs.position.system.value,
            },
            "bearing": {
                "angle": round(obs.bearing.angle, self.config.max_decimal_places),
                "unit": obs.bearing.unit.value,
                "angle_degrees": round(obs.bearing.to_degrees(), self.config.max_decimal_places),
                "error": round(obs.bearing.error, self.config.max_decimal_places),
            },
            "status": obs.status.value,
            "note": obs.note,
            "source": str(obs.source) if obs.source else None,
            "corrections": [self._correction_to_dict(c) for c in obs.corrections]
            if self.config.include_corrections
            else [],
        }

    def _correction_to_dict(self, corr: Correction) -> dict:
        return {
            "id": corr.id,
            "timestamp": self._format_timestamp(corr.timestamp),
            "reason": corr.reason,
            "old_value": corr.old_value,
            "new_value": corr.new_value,
            "source": str(corr.source) if corr.source else None,
        }

    def generate_text_report(
        self,
        result: TriangulationResult,
        input_data: InputData,
        parse_errors: List[ParseError],
        parse_warnings: List[ParseError],
        algorithm_warnings: List[AlgorithmWarning],
        title: str = "三角测量定位报告",
    ) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append(f"  {title}")
        lines.append("=" * 70)
        lines.append(f"生成时间: {self._format_timestamp(time.time())}")
        lines.append("")

        lines.append("-" * 70)
        lines.append("【一、定位结果摘要】")
        lines.append("-" * 70)
        lines.append(f"估计位置: X = {result.estimated_position.x:.4f}, Y = {result.estimated_position.y:.4f}")
        lines.append(f"置信度评分: {result.confidence_score * 100:.1f}%")
        lines.append(f"使用观测数: {len(result.used_observations)} / {len(input_data.observations)}")
        lines.append(f"排除观测数: {len(result.excluded_observations)}")

        if result.error_ellipse:
            lines.append("")
            lines.append("误差椭圆参数:")
            lines.append(f"  长轴: {result.error_ellipse.major_axis:.4f}")
            lines.append(f"  短轴: {result.error_ellipse.minor_axis:.4f}")
            lines.append(f"  方向: {result.error_ellipse.orientation * 180 / 3.14159:.2f}°")
            lines.append(f"  置信水平: {result.error_ellipse.confidence_level * 100:.0f}%")

        lines.append("")
        lines.append("-" * 70)
        lines.append("【二、观测数据详情】")
        lines.append("-" * 70)

        for i, obs in enumerate(input_data.observations, 1):
            status_symbol = {
                ObservationStatus.VALID: "✓",
                ObservationStatus.INVALID: "✗",
                ObservationStatus.OUTLIER: "⚡",
                ObservationStatus.PARALLEL: "∥",
            }.get(obs.status, "?")

            lines.append(f"{i}. {status_symbol} 测站 {obs.station_id}")
            lines.append(f"   坐标: ({obs.position.x:.4f}, {obs.position.y:.4f})")
            lines.append(
                f"   方位角: {obs.bearing.angle:.4f} {obs.bearing.unit.value} "
                f"(= {obs.bearing.to_degrees():.2f}°) ± {obs.bearing.error:.4f}"
            )
            if obs.source:
                lines.append(f"   来源: {obs.source}")
            if obs.note:
                lines.append(f"   备注: {obs.note}")
            lines.append(f"   状态: {obs.status.value}")

            if obs.corrections and self.config.include_corrections:
                lines.append("   修正记录:")
                for c in obs.corrections:
                    lines.append(f"     - [{c.id}] {c.reason}")
                    lines.append(f"       {c.old_value} → {c.new_value}")
            lines.append("")

        lines.append("-" * 70)
        lines.append("【三、数据处理信息】")
        lines.append("-" * 70)

        if parse_errors and self.config.include_warnings:
            lines.append("解析错误:")
            for err in parse_errors:
                lines.append(f"  ✗ {err}")
            lines.append("")

        all_warnings = parse_warnings + [
            AlgorithmWarning(w.message, w.observation_ids, w.severity)
            for w in algorithm_warnings
        ]

        if all_warnings and self.config.include_warnings:
            lines.append("警告信息:")
            for w in all_warnings:
                if isinstance(w, ParseError):
                    lines.append(f"  ⚠ {w}")
                else:
                    obs_info = ", ".join(w.observation_ids) if w.observation_ids else ""
                    lines.append(f"  ⚠ [{w.severity}] {w.message} {obs_info}")
            lines.append("")

        if input_data.corrections and self.config.include_corrections:
            lines.append("全局修正记录:")
            for c in input_data.corrections:
                lines.append(f"  - [{c.id}] {c.reason}")
                lines.append(f"    {c.old_value} → {c.new_value}")
                if c.source:
                    lines.append(f"    来源: {c.source}")
            lines.append("")

        if input_data.map_bounds:
            lines.append("地图边界:")
            lines.append(f"  X: [{input_data.map_bounds.min_x:.4f}, {input_data.map_bounds.max_x:.4f}]")
            lines.append(f"  Y: [{input_data.map_bounds.min_y:.4f}, {input_data.map_bounds.max_y:.4f}]")
            if input_data.map_bounds.name:
                lines.append(f"  名称: {input_data.map_bounds.name}")

        lines.append("")
        lines.append("=" * 70)
        lines.append("报告结束")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_json_report(
        self,
        result: TriangulationResult,
        input_data: InputData,
        parse_errors: List[ParseError],
        parse_warnings: List[ParseError],
        algorithm_warnings: List[AlgorithmWarning],
    ) -> str:
        report = {
            "metadata": {
                "generated_at": self._format_timestamp(time.time()),
                "version": "0.1.0",
            },
            "result": {
                "estimated_position": {
                    "x": round(result.estimated_position.x, self.config.max_decimal_places),
                    "y": round(result.estimated_position.y, self.config.max_decimal_places),
                },
                "confidence_score": round(result.confidence_score, 4),
                "error_ellipse": {
                    "center": {
                        "x": round(result.error_ellipse.center.x, self.config.max_decimal_places),
                        "y": round(result.error_ellipse.center.y, self.config.max_decimal_places),
                    },
                    "major_axis": round(result.error_ellipse.major_axis, self.config.max_decimal_places),
                    "minor_axis": round(result.error_ellipse.minor_axis, self.config.max_decimal_places),
                    "orientation": round(result.error_ellipse.orientation, self.config.max_decimal_places),
                    "confidence_level": result.error_ellipse.confidence_level,
                }
                if result.error_ellipse
                else None,
                "used_observation_ids": [o.id for o in result.used_observations],
                "excluded_observation_ids": [o.id for o in result.excluded_observations],
            },
            "observations": [self._observation_to_dict(o) for o in input_data.observations],
            "warnings": {
                "parse_errors": [
                    {"message": e.message, "source": str(e.source), "severity": e.severity}
                    for e in parse_errors
                ],
                "parse_warnings": [
                    {"message": w.message, "source": str(w.source), "severity": w.severity}
                    for w in parse_warnings
                ],
                "algorithm_warnings": [
                    {
                        "message": w.message,
                        "observation_ids": w.observation_ids,
                        "severity": w.severity,
                    }
                    for w in algorithm_warnings
                ],
            },
            "map_bounds": {
                "min_x": input_data.map_bounds.min_x,
                "max_x": input_data.map_bounds.max_x,
                "min_y": input_data.map_bounds.min_y,
                "max_y": input_data.map_bounds.max_y,
                "name": input_data.map_bounds.name,
            }
            if input_data.map_bounds
            else None,
        }

        if self.config.include_corrections:
            report["corrections"] = [self._correction_to_dict(c) for c in input_data.corrections]

        return json.dumps(report, ensure_ascii=False, indent=2)

    def save_text_report(
        self,
        output_path: str,
        result: TriangulationResult,
        input_data: InputData,
        parse_errors: List[ParseError],
        parse_warnings: List[ParseError],
        algorithm_warnings: List[AlgorithmWarning],
        title: str = "三角测量定位报告",
    ):
        content = self.generate_text_report(
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
            title,
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

    def save_json_report(
        self,
        output_path: str,
        result: TriangulationResult,
        input_data: InputData,
        parse_errors: List[ParseError],
        parse_warnings: List[ParseError],
        algorithm_warnings: List[AlgorithmWarning],
    ):
        content = self.generate_json_report(
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)


def generate_report(
    output_path: str,
    result: TriangulationResult,
    input_data: InputData,
    parse_errors: List[ParseError],
    parse_warnings: List[ParseError],
    algorithm_warnings: List[AlgorithmWarning],
    fmt: str = "text",
    title: str = "三角测量定位报告",
):
    generator = ReportGenerator()
    if fmt.lower() == "json":
        generator.save_json_report(
            output_path,
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
        )
    else:
        generator.save_text_report(
            output_path,
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
            title,
        )
