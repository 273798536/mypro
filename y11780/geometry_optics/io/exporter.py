"""结果导出模块 - 支持JSON和文本格式报告"""

from __future__ import annotations
import json
from typing import Dict, Any, List
from ..core.models import (
    ProblemResult, SingleRayResult,
    Point, Vector, LineSegment, Ray, BoundingBox,
    IntersectionResult, ReflectionResult, CorrectionRecord
)


class ResultExporter:
    """结果导出器"""

    @staticmethod
    def to_dict(result: ProblemResult, include_details: bool = True) -> Dict[str, Any]:
        """转换为字典格式"""
        data = {
            "problem_id": result.problem_id,
            "source": result.source,
            "status": result.status,
            "total_score": result.total_score,
            "max_score": result.max_score,
            "processing_time": result.processing_time,
            "summary": result.summary
        }

        if result.input_corrections:
            data["input_corrections"] = [c.to_dict() for c in result.input_corrections]

        if include_details:
            data["ray_results"] = [
                ResultExporter._ray_result_to_dict(rr)
                for rr in result.ray_results
            ]

        return data

    @staticmethod
    def _ray_result_to_dict(rr: SingleRayResult) -> Dict[str, Any]:
        data = {
            "ray_label": rr.ray_label,
            "status": rr.status,
            "warnings": rr.warnings,
            "errors": rr.errors,
            "explanations": rr.explanations,
            "score_deductions": [
                {"code": d[0], "points": d[1], "reason": d[2]}
                for d in rr.score_deductions
            ]
        }

        if rr.intersection:
            data["intersection"] = ResultExporter._intersection_to_dict(rr.intersection)

        if rr.reflection:
            data["reflection"] = ResultExporter._reflection_to_dict(rr.reflection)

        return data

    @staticmethod
    def _intersection_to_dict(ir: IntersectionResult) -> Dict[str, Any]:
        data = {
            "type": ir.intersection_type,
            "is_valid": ir.is_valid(),
            "ray_label": ir.ray.label,
            "segment_label": ir.segment.label
        }

        if ir.intersection_point:
            data["point"] = {
                "x": round(ir.intersection_point.x, 6),
                "y": round(ir.intersection_point.y, 6)
            }
            if ir.intersection_point.z is not None:
                data["point"]["z"] = round(ir.intersection_point.z, 6)

        if ir.parameter_t is not None:
            data["parameter_t"] = round(ir.parameter_t, 6)
        if ir.parameter_s is not None:
            data["parameter_s"] = round(ir.parameter_s, 6)

        return data

    @staticmethod
    def _reflection_to_dict(rr: ReflectionResult) -> Dict[str, Any]:
        data = {
            "angle_unit": rr.angle_unit,
            "incident_angle": round(rr.incident_angle, 4) if rr.incident_angle is not None else None,
            "reflection_angle": round(rr.reflection_angle, 4) if rr.reflection_angle is not None else None
        }

        if rr.normal:
            data["normal"] = {
                "x": round(rr.normal.x, 6),
                "y": round(rr.normal.y, 6)
            }
            if rr.normal.z is not None:
                data["normal"]["z"] = round(rr.normal.z, 6)

        if rr.reflected_ray:
            data["reflected_ray"] = {
                "origin": {
                    "x": round(rr.reflected_ray.origin.x, 6),
                    "y": round(rr.reflected_ray.origin.y, 6)
                },
                "direction": {
                    "x": round(rr.reflected_ray.direction.x, 6),
                    "y": round(rr.reflected_ray.direction.y, 6)
                }
            }
            if rr.reflected_ray.origin.z is not None:
                data["reflected_ray"]["origin"]["z"] = round(rr.reflected_ray.origin.z, 6)
            if rr.reflected_ray.direction.z is not None:
                data["reflected_ray"]["direction"]["z"] = round(rr.reflected_ray.direction.z, 6)

        return data

    @staticmethod
    def to_json(result: ProblemResult, filepath: str, indent: int = 2, include_details: bool = True):
        """导出为JSON文件"""
        data = ResultExporter.to_dict(result, include_details)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=indent)

    @staticmethod
    def to_json_string(result: ProblemResult, indent: int = 2, include_details: bool = True) -> str:
        """导出为JSON字符串"""
        data = ResultExporter.to_dict(result, include_details)
        return json.dumps(data, ensure_ascii=False, indent=indent)

    @staticmethod
    def to_text(result: ProblemResult, filepath: str, show_details: bool = True):
        """导出为文本报告文件"""
        text = ResultExporter.to_text_string(result, show_details)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)

    @staticmethod
    def to_text_string(result: ProblemResult, show_details: bool = True) -> str:
        """导出为文本报告字符串"""
        lines = []

        lines.append("=" * 70)
        lines.append("  几何光路求交计算报告")
        lines.append("=" * 70)
        lines.append("")

        lines.append(f"📌 题目编号: {result.problem_id}")
        lines.append(f"📚 来源: {result.source}")
        lines.append(f"⏱️  处理时间: {result.processing_time:.4f}秒")
        lines.append("")

        status_emoji = {
            "success": "✅",
            "warning": "⚠️ ",
            "error": "❌",
            "skipped": "⏭️ "
        }
        lines.append(f"📊 整体状态: {status_emoji.get(result.status, '❓')} {result.status.upper()}")
        lines.append(f"🏆 总分: {result.total_score:.2f} / {result.max_score:.2f}")
        if result.max_score > 0:
            lines.append(f"📈 正确率: {result.total_score / result.max_score * 100:.1f}%")
        lines.append("")

        if result.input_corrections:
            lines.append("🔧 输入修正记录:")
            for corr in result.input_corrections:
                lines.append(f"   [{corr.timestamp.strftime('%H:%M:%S')}] {corr.field}:")
                lines.append(f"      旧值: {corr.old_value}")
                lines.append(f"      新值: {corr.new_value}")
                lines.append(f"      原因: {corr.reason}")
            lines.append("")

        lines.append("-" * 70)
        lines.append("📋 处理摘要")
        lines.append("-" * 70)
        for line in result.summary:
            lines.append(line)
        lines.append("")

        if show_details:
            lines.append("=" * 70)
            lines.append("🔍 详细结果")
            lines.append("=" * 70)
            lines.append("")

            for i, rr in enumerate(result.ray_results):
                lines.append(ResultExporter._ray_result_to_text(rr, i + 1))

        lines.append("=" * 70)
        lines.append("  报告结束")
        lines.append("=" * 70)

        return "\n".join(lines)

    @staticmethod
    def _ray_result_to_text(rr: SingleRayResult, index: int) -> str:
        lines = []

        status_emoji = {
            "success": "✅",
            "warning": "⚠️ ",
            "error": "❌",
            "skipped": "⏭️ "
        }

        lines.append(f"[{index}] 光线 {rr.ray_label} - {status_emoji.get(rr.status, '❓')} {rr.status.upper()}")
        lines.append("-" * 50)

        if rr.errors:
            lines.append("  ❌ 错误:")
            for e in rr.errors:
                lines.append(f"     {e}")

        if rr.warnings:
            lines.append("  ⚠️  警告:")
            for w in rr.warnings:
                lines.append(f"     {w}")

        if rr.intersection:
            lines.append("  📐 交点信息:")
            ir = rr.intersection
            lines.append(f"     类型: {ir.intersection_type}")
            if ir.intersection_point:
                p = ir.intersection_point
                coord_str = f"({p.x:.4f}, {p.y:.4f}"
                if p.z is not None:
                    coord_str += f", {p.z:.4f}"
                coord_str += ")"
                lines.append(f"     坐标: {coord_str}")
            lines.append(f"     镜面: {ir.segment.label}")
            if ir.parameter_t is not None:
                lines.append(f"     射线参数 t = {ir.parameter_t:.6f}")
            if ir.parameter_s is not None:
                lines.append(f"     线段参数 s = {ir.parameter_s:.6f}")

        if rr.reflection:
            lines.append("  🔄 反射信息:")
            r = rr.reflection
            unit = "°" if r.angle_unit == "degree" else " rad"
            if r.incident_angle is not None:
                lines.append(f"     入射角: {r.incident_angle:.4f}{unit}")
            if r.reflection_angle is not None:
                lines.append(f"     反射角: {r.reflection_angle:.4f}{unit}")
            if r.reflected_ray:
                d = r.reflected_ray.direction
                dir_str = f"({d.x:.4f}, {d.y:.4f}"
                if d.z is not None:
                    dir_str += f", {d.z:.4f}"
                dir_str += ")"
                lines.append(f"     反射方向: {dir_str}")

        if rr.explanations:
            lines.append("  💡 解释:")
            for e in rr.explanations:
                lines.append(f"     {e}")

        if rr.score_deductions:
            lines.append("  📊 扣分明细:")
            has_deduction = False
            for code, points, reason in rr.score_deductions:
                if points > 0:
                    has_deduction = True
                    lines.append(f"     - {code}: -{points:.2f}分 - {reason}")
            if not has_deduction:
                lines.append("     无扣分")

        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def to_csv(result: ProblemResult, filepath: str):
        """导出为CSV格式（简化版，适合批量处理）"""
        import csv

        rows = []
        headers = [
            "题目编号", "光线标签", "状态", "交点类型",
            "交点X", "交点Y", "镜面",
            "入射角(°)", "反射角(°)",
            "参数t", "参数s",
            "扣分", "得分", "备注"
        ]

        for rr in result.ray_results:
            ir = rr.intersection
            r = rr.reflection

            incident_angle = ""
            reflection_angle = ""
            if r:
                incident_angle = f"{r.incident_angle:.4f}" if r.incident_angle is not None else ""
                reflection_angle = f"{r.reflection_angle:.4f}" if r.reflection_angle is not None else ""

            intersection_type = ""
            point_x = ""
            point_y = ""
            mirror_label = ""
            param_t = ""
            param_s = ""
            if ir:
                intersection_type = ir.intersection_type
                if ir.intersection_point:
                    point_x = f"{ir.intersection_point.x:.6f}"
                    point_y = f"{ir.intersection_point.y:.6f}"
                mirror_label = ir.segment.label if ir.segment else ""
                param_t = f"{ir.parameter_t:.6f}" if ir.parameter_t is not None else ""
                param_s = f"{ir.parameter_s:.6f}" if ir.parameter_s is not None else ""

            total_deduct = sum(d[1] for d in rr.score_deductions)
            score = max(0.0, 1.0 - total_deduct)

            notes = []
            if rr.warnings:
                notes.append("警告")
            if rr.errors:
                notes.append("错误")
            note_str = ";".join(notes) if notes else ""

            row = [
                result.problem_id,
                rr.ray_label,
                rr.status,
                intersection_type,
                point_x,
                point_y,
                mirror_label,
                incident_angle,
                reflection_angle,
                param_t,
                param_s,
                f"{total_deduct:.2f}",
                f"{score:.2f}",
                note_str
            ]
            rows.append(row)

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
