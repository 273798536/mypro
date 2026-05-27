import json
import csv
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..core.models import (
    AnalysisResult, AnomalySeverity, Status,
    InputData, DataPoint
)


class ReportGenerator:
    @staticmethod
    def generate(result: AnalysisResult, format: str = "text") -> str:
        if format == "text":
            return ReportGenerator._generate_text(result)
        elif format == "json":
            return ReportGenerator._generate_json(result)
        elif format == "csv":
            return ReportGenerator._generate_csv(result)
        else:
            raise ValueError(f"不支持的报告格式: {format}")

    @staticmethod
    def _generate_text(result: AnalysisResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("抛体运动参数复盘报告")
        lines.append("=" * 60)
        lines.append("")

        lines.append("【一、参数估计结果】")
        lines.append("-" * 40)
        params = result.params
        lines.append(f"  初速度 v0:     {params.v0:.2f} m/s  "
                      f"(置信度: {result.params_confidence.get('v0', 0):.2f})")
        lines.append(f"  投射角度:      {params.angle_deg:.1f}°  "
                      f"(置信度: {result.params_confidence.get('angle', 0):.2f})")
        lines.append(f"  出手高度:      {params.release_height:.2f} m")
        lines.append(f"  重力加速度:    {params.g:.2f} m/s²")
        lines.append(f"  空气阻力:      {'考虑' if params.air_resistance_enabled else '忽略'}")
        if params.air_resistance_enabled:
            lines.append(f"    阻力系数:    {params.drag_coefficient}")
            lines.append(f"    质量:        {params.mass} kg")
            lines.append(f"    截面积:      {params.cross_sectional_area} m²")
        lines.append(f"  预测落点:      {result.landing_position:.2f} m")
        lines.append(f"  飞行时间:      {result.flight_time:.2f} s")
        lines.append(f"  最大高度:      {result.max_height:.2f} m")
        lines.append("")

        lines.append("【二、拟合质量】")
        lines.append("-" * 40)
        conf = result.params_confidence
        if "r_squared_x" in conf:
            lines.append(f"  X方向拟合优度 (R²): {conf['r_squared_x']:.4f}")
        if "r_squared_y" in conf:
            lines.append(f"  Y方向拟合优度 (R²): {conf['r_squared_y']:.4f}")
        if "rmse_x" in conf:
            lines.append(f"  X方向均方根误差:    {conf['rmse_x']:.4f} m")
        if "rmse_y" in conf:
            lines.append(f"  Y方向均方根误差:    {conf['rmse_y']:.4f} m")
        lines.append("")

        lines.append("【三、异常提示】")
        lines.append("-" * 40)
        ReportGenerator._append_anomalies(lines, result.anomalies)
        lines.append("")

        lines.append("【四、处理步骤】")
        lines.append("-" * 40)
        for i, step in enumerate(result.processing_steps, 1):
            lines.append(f"  {i}. {step}")
        lines.append("")

        lines.append("【五、数据状态分类】")
        lines.append("-" * 40)
        ReportGenerator._append_data_status(lines, result.input_data)
        lines.append("")

        lines.append("【六、修正痕迹】")
        lines.append("-" * 40)
        ReportGenerator._append_correction_history(lines, result.input_data)

        return "\n".join(lines)

    @staticmethod
    def _append_anomalies(lines: List[str], anomalies: List) -> None:
        severity_order = [AnomalySeverity.CRITICAL, AnomalySeverity.ERROR,
                          AnomalySeverity.WARNING, AnomalySeverity.INFO]

        severity_labels = {
            AnomalySeverity.CRITICAL: "【严重】",
            AnomalySeverity.ERROR: "【错误】",
            AnomalySeverity.WARNING: "【警告】",
            AnomalySeverity.INFO: "【信息】"
        }

        grouped = {s: [] for s in severity_order}
        for a in anomalies:
            grouped[a.severity].append(a)

        has_anomalies = False
        for sev in severity_order:
            for a in grouped[sev]:
                has_anomalies = True
                lines.append(f"  {severity_labels[sev]} {a.message}")
                if a.suggestion:
                    lines.append(f"     → 建议: {a.suggestion}")

        if not has_anomalies:
            lines.append("  未检测到异常")

    @staticmethod
    def _append_data_status(lines: List[str], input_data: InputData) -> None:
        status_items = []

        def check_point(name: str, point: Optional[DataPoint]) -> None:
            if point is None:
                status_items.append(("未处理", f"{name}: 未提供"))
                return

            if point.status == Status.RAW:
                status_items.append(("未处理", f"{name}: {point.value} (来源: {point.source}, 置信度: {point.confidence:.2f})"))
            elif point.status == Status.CORRECTED:
                status_items.append(("已修正", f"{name}: {point.raw_value} → {point.value}"))
            elif point.status == Status.NEEDS_REVIEW:
                status_items.append(("需要人工确认", f"{name}: {point.value} - {'; '.join(point.notes)}"))
            elif point.status == Status.PROCESSED:
                status_items.append(("已处理", f"{name}: {point.value}"))

        check_point("帧率", input_data.frame_rate)
        check_point("比例尺", input_data.scale)
        check_point("出手高度", input_data.release_height)
        check_point("落点", input_data.landing_point)

        traj_points = input_data.trajectory
        total = len(traj_points)
        outliers = sum(1 for p in traj_points if p.is_outlier)
        if outliers > 0:
            status_items.append(("已修正", f"轨迹: {outliers}/{total} 个点标记为离群点"))
        else:
            status_items.append(("未处理", f"轨迹: {total} 个点"))

        lines.append("  未处理的原始数据:")
        unprocessed = [item for cat, item in status_items if cat == "未处理"]
        if unprocessed:
            for item in unprocessed:
                lines.append(f"    - {item}")
        else:
            lines.append("    - 无")

        lines.append("")
        lines.append("  已自动修正的数据:")
        corrected = [item for cat, item in status_items if cat == "已修正"]
        if corrected:
            for item in corrected:
                lines.append(f"    - {item}")
        else:
            lines.append("    - 无")

        lines.append("")
        lines.append("  需要人工确认:")
        needs_review = [item for cat, item in status_items if cat == "需要人工确认"]
        if needs_review:
            for item in needs_review:
                lines.append(f"    - {item}")
        else:
            lines.append("    - 无")

    @staticmethod
    def _append_correction_history(lines: List[str], input_data: InputData) -> None:
        has_corrections = False

        def check_corrections(name: str, point: Optional[DataPoint]) -> None:
            nonlocal has_corrections
            if point and point.correction_history:
                has_corrections = True
                lines.append(f"  {name}:")
                for corr in point.correction_history:
                    lines.append(f"    - {corr.timestamp.strftime('%Y-%m-%d %H:%M:%S')}: "
                                  f"{corr.old_value} → {corr.new_value}")
                    lines.append(f"      类型: {corr.correction_type}, 原因: {corr.reason}")
                    if corr.author:
                        lines.append(f"      操作人: {corr.author}")

        check_corrections("帧率", input_data.frame_rate)
        check_corrections("比例尺", input_data.scale)
        check_corrections("出手高度", input_data.release_height)
        check_corrections("落点", input_data.landing_point)

        if not has_corrections:
            lines.append("  暂无修正记录")

    @staticmethod
    def _generate_json(result: AnalysisResult) -> str:
        data = {
            "report_timestamp": datetime.now().isoformat(),
            "parameters": {
                "v0": result.params.v0,
                "angle_deg": result.params.angle_deg,
                "release_height": result.params.release_height,
                "g": result.params.g,
                "air_resistance_enabled": result.params.air_resistance_enabled,
                "drag_coefficient": result.params.drag_coefficient,
                "mass": result.params.mass,
                "cross_sectional_area": result.params.cross_sectional_area
            },
            "parameter_confidence": result.params_confidence,
            "results": {
                "landing_position": result.landing_position,
                "flight_time": result.flight_time,
                "max_height": result.max_height
            },
            "anomalies": [
                {
                    "severity": a.severity,
                    "category": a.category,
                    "message": a.message,
                    "details": a.details,
                    "affected_fields": a.affected_fields,
                    "suggestion": a.suggestion
                }
                for a in result.anomalies
            ],
            "processing_steps": result.processing_steps,
            "predicted_trajectory": result.predicted_trajectory
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    @staticmethod
    def _generate_csv(result: AnalysisResult) -> str:
        import io
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["项目", "数值", "置信度/备注"])
        writer.writerow(["初速度 v0 (m/s)", f"{result.params.v0:.4f}",
                          f"{result.params_confidence.get('v0', 0):.4f}"])
        writer.writerow(["角度 (°)", f"{result.params.angle_deg:.4f}",
                          f"{result.params_confidence.get('angle', 0):.4f}"])
        writer.writerow(["出手高度 (m)", f"{result.params.release_height:.4f}", ""])
        writer.writerow(["落点 (m)", f"{result.landing_position:.4f}", ""])
        writer.writerow(["飞行时间 (s)", f"{result.flight_time:.4f}", ""])
        writer.writerow(["最大高度 (m)", f"{result.max_height:.4f}", ""])
        writer.writerow([])
        writer.writerow(["预测轨迹点"])
        writer.writerow(["时间 (s)", "X (m)", "Y (m)", "VX (m/s)", "VY (m/s)", "V (m/s)"])
        for p in result.predicted_trajectory:
            writer.writerow([p["t"], p["x"], p["y"], p["vx"], p["vy"], p["v"]])

        return output.getvalue()

    @staticmethod
    def save_report(result: AnalysisResult, file_path: str, format: Optional[str] = None) -> None:
        if format is None:
            if file_path.endswith(".json"):
                format = "json"
            elif file_path.endswith(".csv"):
                format = "csv"
            else:
                format = "text"

        content = ReportGenerator.generate(result, format)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
