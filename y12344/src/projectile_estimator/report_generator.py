"""报告生成器：透明展示所有公式、单位、边界值和中间量"""

import os
import json
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
from pathlib import Path

from .models import AnalysisReport, Anomaly, Event
from .physics import FORMULAS


class ReportGenerator:
    """报告生成器"""

    def __init__(self, output_dir: str = "./reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_all(
        self,
        report: AnalysisReport,
        formats: List[str] = None,
    ) -> Dict[str, str]:
        """
        生成所有格式的报告

        formats: ["txt", "json", "html"]
        """
        formats = formats or ["txt", "json"]
        output_files = {}

        if "txt" in formats:
            output_files["txt"] = self.generate_text_report(report)
        if "json" in formats:
            output_files["json"] = self.generate_json_report(report)
        if "html" in formats:
            output_files["html"] = self.generate_html_report(report)
        if "csv" in formats:
            output_files["csv"] = self.generate_csv_reports(report)

        return output_files

    def generate_text_report(self, report: AnalysisReport) -> str:
        """生成文本报告，所有细节透明展示"""
        lines = []
        lines.append("=" * 80)
        lines.append("抛体运动风阻估计分析报告")
        lines.append("=" * 80)
        lines.append(f"报告ID: {report.report_id}")
        lines.append(f"生成时间: {report.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("一、边界配置 (Bounds)")
        lines.append("-" * 80)
        bounds_dict = report.bounds_config.to_dict()
        for param, info in bounds_dict.items():
            lines.append(f"  {param:15s}: [{info['min']:8.2f}, {info['max']:8.2f}] {info['unit']}")
        lines.append("")

        lines.append("-" * 80)
        lines.append(f"二、事件汇总 (共 {len(report.events)} 个事件)")
        lines.append("-" * 80)
        lines.append(f"{'时间(s)':>8} {'轨迹点':>6} {'角度':>8} {'风速':>6} {'关联材料'}")
        lines.append("-" * 80)
        for event in report.events:
            has_traj = "✓" if event.trajectory_point else "✗"
            has_angle = "✓" if event.angle_record else "✗"
            has_wind = "✓" if event.wind_record else "✗"
            materials = ", ".join([s.material_name for s in event.sources])
            lines.append(f"{event.t:>8.2f} {has_traj:>6} {has_angle:>8} {has_wind:>6} {materials}")
        lines.append("")

        lines.append("-" * 80)
        lines.append(f"三、异常检测 (共 {len(report.anomalies)} 个异常)")
        lines.append("-" * 80)

        if not report.anomalies:
            lines.append("  未检测到异常 ✓")
        else:
            type_counts = {}
            for a in report.anomalies:
                type_counts[a.anomaly_type] = type_counts.get(a.anomaly_type, 0) + 1
            lines.append("  异常类型统计:")
            for atype, count in type_counts.items():
                lines.append(f"    - {atype}: {count} 个")
            lines.append("")

            for i, anomaly in enumerate(report.anomalies, 1):
                lines.append(f"  【异常 #{i}】 {anomaly.anomaly_id}")
                lines.append(f"    类型: {anomaly.anomaly_type}")
                lines.append(f"    严重程度: {anomaly.severity}")
                lines.append(f"    时间: {anomaly.t:.2f}s" if anomaly.t is not None else "    时间: 未知")
                lines.append(f"    描述: {anomaly.message}")
                if anomaly.value is not None:
                    lines.append(
                        f"    数值: {anomaly.value:.4f} {anomaly.unit or ''} "
                        f"(边界: [{anomaly.bound_min}, {anomaly.bound_max}])"
                    )
                if anomaly.source:
                    lines.append(f"    触发材料: {anomaly.source.material_name}")
                    lines.append(f"    文件路径: {anomaly.source.file_path}")
                if anomaly.next_step:
                    lines.append(f"    下一步操作:")
                    for step_line in anomaly.next_step.split("\n"):
                        lines.append(f"      {step_line}")
                lines.append("")

        if report.fitting_result:
            lines.append("-" * 80)
            lines.append("四、轨迹拟合结果")
            lines.append("-" * 80)
            fr = report.fitting_result
            lines.append(f"  拟合方法: {fr.method}")
            lines.append(f"  R²: {fr.r_squared:.6f}")
            lines.append(f"  RMSE: {fr.rmse:.6f} m")
            if fr.estimated_drag_coeff is not None:
                lines.append(f"  估计风阻系数 C_d: {fr.estimated_drag_coeff:.6f} (无量纲)")
            lines.append("")
            lines.append(f"  拟合公式:")
            for formula_line in fr.formula.split("\n"):
                lines.append(f"    {formula_line}")
            lines.append("")
            lines.append(f"  拟合参数 (含单位):")
            for param_name, param_value in fr.params.items():
                unit = fr.params_units.get(param_name, "")
                if isinstance(param_value, list):
                    val_str = ", ".join([f"{v:.6f}" for v in param_value])
                else:
                    val_str = f"{param_value:.6f}"
                lines.append(f"    {param_name:25s} = {val_str} {unit}")
            lines.append("")

        if report.drag_estimation:
            lines.append("-" * 80)
            lines.append("五、风阻估计详情")
            lines.append("-" * 80)
            de = report.drag_estimation
            lines.append(f"  估计风阻系数 C_d: {de['estimated_cd']:.6f}")
            lines.append(f"  拟合优度 R²: {de['r_squared']:.6f}")
            lines.append(f"  均方根误差 RMSE: {de['rmse']:.6f} m")
            lines.append(f"  初速度 v0: {de['v0']:.4f} m/s")
            lines.append(f"  初始抛射角 θ0: {de['theta0_deg']:.4f} deg")
            lines.append(f"  平均风速: {de['avg_wind_speed']:.4f} m/s")
            lines.append(f"  平均风向: {de['avg_wind_direction_deg']:.4f} deg")
            lines.append("")

            lines.append(f"  相关公式:")
            for formula in de["formulas"]:
                lines.append(f"    [{formula['name']}]")
                for eq in formula["equations"]:
                    lines.append(f"      {eq}")
            lines.append("")

            if "intermediate" in de:
                inter = de["intermediate"]
                lines.append(f"  中间量值 (含单位):")
                for key, val in inter["values"].items():
                    unit = inter["units"].get(key, "")
                    if isinstance(val, (int, float)):
                        lines.append(f"    {key:25s} = {val:.6f} {unit}")
                    else:
                        lines.append(f"    {key:25s} = {val} {unit}")
            lines.append("")

        if report.error_analysis:
            lines.append("-" * 80)
            lines.append("六、误差分析")
            lines.append("-" * 80)
            ea = report.error_analysis

            for metric in ["position", "velocity", "trajectory_angle"]:
                info = ea[metric]
                lines.append(f"  {metric}:")
                for stat_name, stat_val in info.items():
                    if stat_name == "unit":
                        continue
                    unit = info.get("unit", "")
                    lines.append(f"    {stat_name:15s} = {stat_val:.6f} {unit}")
            lines.append("")

            if ea.get("measured_angle_comparison"):
                lines.append(f"  实测角度 vs 模拟角度对比:")
                lines.append(f"    {'时间(s)':>8} {'实测角(°)':>10} {'模拟角(°)':>10} {'误差(°)':>10}")
                lines.append(f"    {'-'*8} {'-'*10} {'-'*10} {'-'*10}")
                for comp in ea["measured_angle_comparison"]:
                    lines.append(
                        f"    {comp['t']:>8.2f} "
                        f"{comp['measured_angle_deg']:>10.2f} "
                        f"{comp['simulated_angle_deg']:>10.2f} "
                        f"{comp['error_deg']:>10.2f}"
                    )
                lines.append("")

            lines.append(f"  逐点误差:")
            lines.append(
                f"    {'时间(s)':>8} {'x_obs(m)':>10} {'x_sim(m)':>10} {'x_err(m)':>10} "
                f"{'y_obs(m)':>10} {'y_sim(m)':>10} {'y_err(m)':>10} {'θ_err(°)':>10}"
            )
            lines.append(f"    {'-'*8} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
            for pp in ea["per_point"]:
                lines.append(
                    f"    {pp['t']:>8.2f} "
                    f"{pp['x_obs']:>10.3f} {pp['x_sim']:>10.3f} {pp['x_error']:>10.3f} "
                    f"{pp['y_obs']:>10.3f} {pp['y_sim']:>10.3f} {pp['y_error']:>10.3f} "
                    f"{pp['theta_error_deg']:>10.2f}"
                )
            lines.append("")

        lines.append("-" * 80)
        lines.append("七、物理公式参考")
        lines.append("-" * 80)
        for key, formula in FORMULAS.items():
            lines.append(f"  [{formula['name']}]")
            for eq in formula["equations"]:
                lines.append(f"    {eq}")
            lines.append(f"  参数说明:")
            for pname, pdesc in formula["parameters"].items():
                lines.append(f"    {pname}: {pdesc}")
            lines.append("")

        lines.append("=" * 80)
        lines.append("报告结束")
        lines.append("=" * 80)

        content = "\n".join(lines)
        file_path = self.output_dir / f"{report.report_id}_report.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return str(file_path)

    def generate_json_report(self, report: AnalysisReport) -> str:
        """生成JSON格式报告，便于程序读取"""
        report_dict = {
            "report_id": report.report_id,
            "created_at": report.created_at.isoformat(),
            "bounds_config": report.bounds_config.to_dict(),
            "events_summary": [
                {
                    "event_id": e.event_id,
                    "t": e.t,
                    "has_trajectory": e.trajectory_point is not None,
                    "has_angle": e.angle_record is not None,
                    "has_wind": e.wind_record is not None,
                    "sources": [
                        {"material_id": s.material_id, "material_name": s.material_name}
                        for s in e.sources
                    ],
                    "trajectory_point": {
                        "t": e.trajectory_point.t,
                        "x": e.trajectory_point.x,
                        "y": e.trajectory_point.y,
                        "vx": e.trajectory_point.vx,
                        "vy": e.trajectory_point.vy,
                    } if e.trajectory_point else None,
                    "angle_record": {
                        "t": e.angle_record.t,
                        "angle_deg": e.angle_record.angle_deg,
                    } if e.angle_record else None,
                    "wind_record": {
                        "t": e.wind_record.t,
                        "wind_speed": None if np.isnan(e.wind_record.wind_speed) else e.wind_record.wind_speed,
                        "wind_direction_deg": None if np.isnan(e.wind_record.wind_direction_deg) else e.wind_record.wind_direction_deg,
                    } if e.wind_record else None,
                }
                for e in report.events
            ],
            "anomalies": [a.to_dict() for a in report.anomalies],
            "fitting_result": {
                "method": report.fitting_result.method,
                "params": report.fitting_result.params,
                "params_units": report.fitting_result.params_units,
                "r_squared": report.fitting_result.r_squared,
                "rmse": report.fitting_result.rmse,
                "estimated_drag_coeff": report.fitting_result.estimated_drag_coeff,
                "formula": report.fitting_result.formula,
                "intermediate_values": self._serialize_intermediate(report.fitting_result.intermediate_values),
            } if report.fitting_result else None,
            "drag_estimation": {
                "estimated_cd": report.drag_estimation["estimated_cd"],
                "r_squared": report.drag_estimation["r_squared"],
                "rmse": report.drag_estimation["rmse"],
                "v0": report.drag_estimation["v0"],
                "theta0_deg": report.drag_estimation["theta0_deg"],
                "avg_wind_speed": report.drag_estimation["avg_wind_speed"],
                "avg_wind_direction_deg": report.drag_estimation["avg_wind_direction_deg"],
                "intermediate": self._serialize_intermediate(report.drag_estimation["intermediate"]),
            } if report.drag_estimation else None,
            "error_analysis": self._serialize_error_analysis(report.error_analysis) if report.error_analysis else None,
            "formulas_reference": FORMULAS,
        }

        file_path = self.output_dir / f"{report.report_id}_report.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(report_dict, f, indent=2, ensure_ascii=False, default=str)
        return str(file_path)

    def generate_csv_reports(self, report: AnalysisReport) -> Dict[str, str]:
        """生成CSV格式报告，便于Excel打开"""
        import csv
        output_files = {}

        events_file = self.output_dir / f"{report.report_id}_events.csv"
        with open(events_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "时间(s)", "轨迹x(m)", "轨迹y(m)", "速度vx(m/s)", "速度vy(m/s)",
                "角度(deg)", "风速(m/s)", "风向(deg)", "关联材料"
            ])
            for e in report.events:
                writer.writerow([
                    e.t,
                    e.trajectory_point.x if e.trajectory_point else "",
                    e.trajectory_point.y if e.trajectory_point else "",
                    e.trajectory_point.vx if e.trajectory_point else "",
                    e.trajectory_point.vy if e.trajectory_point else "",
                    e.angle_record.angle_deg if e.angle_record else "",
                    e.wind_record.wind_speed if e.wind_record and not np.isnan(e.wind_record.wind_speed) else "",
                    e.wind_record.wind_direction_deg if e.wind_record and not np.isnan(e.wind_record.wind_direction_deg) else "",
                    ", ".join([s.material_name for s in e.sources]),
                ])
        output_files["events"] = str(events_file)

        anomalies_file = self.output_dir / f"{report.report_id}_anomalies.csv"
        with open(anomalies_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "异常ID", "类型", "严重程度", "时间(s)", "描述", "数值", "单位",
                "边界下限", "边界上限", "触发材料", "文件路径", "下一步操作"
            ])
            for a in report.anomalies:
                writer.writerow([
                    a.anomaly_id, a.anomaly_type, a.severity, a.t or "",
                    a.message, a.value or "", a.unit or "",
                    a.bound_min or "", a.bound_max or "",
                    a.source.material_name if a.source else "",
                    a.source.file_path if a.source else "",
                    a.next_step.replace("\n", " | "),
                ])
        output_files["anomalies"] = str(anomalies_file)

        if report.error_analysis and report.error_analysis.get("per_point"):
            errors_file = self.output_dir / f"{report.report_id}_errors.csv"
            with open(errors_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "时间(s)", "x观测(m)", "x模拟(m)", "x误差(m)",
                    "y观测(m)", "y模拟(m)", "y误差(m)", "位置误差(m)",
                    "θ观测(deg)", "θ模拟(deg)", "θ误差(deg)", "来源"
                ])
                for pp in report.error_analysis["per_point"]:
                    writer.writerow([
                        pp["t"], pp["x_obs"], pp["x_sim"], pp["x_error"],
                        pp["y_obs"], pp["y_sim"], pp["y_error"], pp["pos_error"],
                        pp["theta_obs_deg"], pp["theta_sim_deg"], pp["theta_error_deg"],
                        pp["source"],
                    ])
            output_files["errors"] = str(errors_file)

        return output_files

    def generate_html_report(self, report: AnalysisReport) -> str:
        """生成HTML格式报告，带样式"""
        html_template = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>抛体运动风阻估计分析报告 - {{ report_id }}</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #3498db; padding-left: 10px; }
    h3 { color: #555; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #3498db; color: white; }
    tr:nth-child(even) { background: #f8f9fa; }
    .anomaly-error { border-left: 4px solid #e74c3c; background: #ffebee; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .anomaly-warning { border-left: 4px solid #f39c12; background: #fff8e1; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .metric { display: inline-block; background: #ecf0f1; padding: 10px 15px; margin: 5px; border-radius: 4px; }
    .metric-value { font-size: 1.2em; font-weight: bold; color: #2980b9; }
    .metric-label { font-size: 0.9em; color: #7f8c8d; }
    .formula { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: 'Courier New', monospace; margin: 10px 0; }
    .next-step { background: #e8f5e9; border-left: 4px solid #27ae60; padding: 15px; margin-top: 10px; border-radius: 4px; }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold; }
    .tag-error { background: #e74c3c; color: white; }
    .tag-warning { background: #f39c12; color: white; }
    .tag-ok { background: #27ae60; color: white; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .source { color: #7f8c8d; font-size: 0.9em; }
</style>
</head>
<body>
<div class="container">
    <h1>🚀 抛体运动风阻估计分析报告</h1>
    <p class="source">报告ID: {{ report_id }} | 生成时间: {{ created_at }}</p>

    <h2>📋 边界配置</h2>
    <table>
        <tr><th>参数</th><th>单位</th><th>下限</th><th>上限</th></tr>
        {% for param, info in bounds.items() %}
        <tr><td>{{ param }}</td><td>{{ info.unit }}</td><td>{{ info.min }}</td><td>{{ info.max }}</td></tr>
        {% endfor %}
    </table>

    <h2>📊 事件汇总 ({{ event_count }} 个事件)</h2>
    <table>
        <tr><th>时间(s)</th><th>轨迹</th><th>角度</th><th>风速</th><th>关联材料</th></tr>
        {% for e in events %}
        <tr>
            <td>{{ "%.2f"|format(e.t) }}</td>
            <td>{% if e.trajectory_point %}<span class="tag tag-ok">✓</span>{% else %}<span class="tag tag-error">✗</span>{% endif %}</td>
            <td>{% if e.angle_record %}<span class="tag tag-ok">✓</span>{% else %}<span class="tag tag-error">✗</span>{% endif %}</td>
            <td>{% if e.wind_record %}<span class="tag tag-ok">✓</span>{% else %}<span class="tag tag-warning">✗</span>{% endif %}</td>
            <td>{{ e.sources|map(attribute='material_name')|join(', ') }}</td>
        </tr>
        {% endfor %}
    </table>

    <h2>⚠️ 异常检测 ({{ anomaly_count }} 个异常)</h2>
    {% if anomaly_count == 0 %}
    <div class="anomaly-error" style="background: #e8f5e9; border-left-color: #27ae60;">
        <strong>✓ 未检测到任何异常</strong>
    </div>
    {% else %}
        {% for a in anomalies %}
        <div class="anomaly-{{ a.severity }}">
            <h3>
                <span class="tag tag-{{ a.severity }}">{{ a.anomaly_type }}</span>
                #{{ loop.index }} {{ a.anomaly_id }}
                {% if a.t is not none %}
                <span class="source">t = {{ "%.2f"|format(a.t) }}s</span>
                {% endif %}
            </h3>
            <p><strong>描述:</strong> {{ a.message }}</p>
            {% if a.value is not none %}
            <p><strong>数值:</strong> <span class="metric-value">{{ "%.4f"|format(a.value) }} {{ a.unit or '' }}</span>
            (边界: [{{ a.bound_min }}, {{ a.bound_max }}])</p>
            {% endif %}
            {% if a.source %}
            <p><strong>触发材料:</strong> {{ a.source.material_name }}
            <span class="source">({{ a.source.file_path }})</span></p>
            {% endif %}
            {% if a.next_step %}
            <div class="next-step">
                <strong>📌 下一步操作:</strong>
                <pre>{{ a.next_step }}</pre>
            </div>
            {% endif %}
        </div>
        {% endfor %}
    {% endif %}

    {% if fitting %}
    <h2>📈 轨迹拟合结果</h2>
    <div class="metric">
        <div class="metric-label">拟合方法</div>
        <div class="metric-value">{{ fitting.method }}</div>
    </div>
    <div class="metric">
        <div class="metric-label">R²</div>
        <div class="metric-value">{{ "%.6f"|format(fitting.r_squared) }}</div>
    </div>
    <div class="metric">
        <div class="metric-label">RMSE</div>
        <div class="metric-value">{{ "%.6f"|format(fitting.rmse) }} m</div>
    </div>
    {% if fitting.estimated_drag_coeff is not none %}
    <div class="metric">
        <div class="metric-label">估计风阻系数 C_d</div>
        <div class="metric-value">{{ "%.6f"|format(fitting.estimated_drag_coeff) }}</div>
    </div>
    {% endif %}

    <h3>拟合公式</h3>
    <div class="formula">{{ fitting.formula|replace('\n', '<br>') }}</div>

    <h3>拟合参数</h3>
    <table>
        <tr><th>参数</th><th>值</th><th>单位</th></tr>
        {% for pname, pval in fitting.params.items() %}
        <tr>
            <td>{{ pname }}</td>
            <td>{% if pval is iterable and pval is not string %}{{ pval|join(', ') }}{% else %}{{ "%.6f"|format(pval) }}{% endif %}</td>
            <td>{{ fitting.params_units.get(pname, '') }}</td>
        </tr>
        {% endfor %}
    </table>
    {% endif %}

    {% if drag %}
    <h2>🌬️ 风阻估计详情</h2>
    <div class="metric">
        <div class="metric-label">估计C_d</div>
        <div class="metric-value">{{ "%.6f"|format(drag.estimated_cd) }}</div>
    </div>
    <div class="metric">
        <div class="metric-label">R²</div>
        <div class="metric-value">{{ "%.6f"|format(drag.r_squared) }}</div>
    </div>
    <div class="metric">
        <div class="metric-label">RMSE</div>
        <div class="metric-value">{{ "%.6f"|format(drag.rmse) }} m</div>
    </div>
    <div class="metric">
        <div class="metric-label">初速度v0</div>
        <div class="metric-value">{{ "%.2f"|format(drag.v0) }} m/s</div>
    </div>
    <div class="metric">
        <div class="metric-label">初始角θ0</div>
        <div class="metric-value">{{ "%.2f"|format(drag.theta0_deg) }}°</div>
    </div>

    <h3>中间量计算</h3>
    <table>
        <tr><th>中间量</th><th>值</th><th>单位</th></tr>
        {% for key, val in drag.intermediate['values'].items() %}
        {% if val is number %}
        <tr>
            <td>{{ key }}</td>
            <td>{{ "%.6f"|format(val) }}</td>
            <td>{{ drag.intermediate['units'].get(key, '') }}</td>
        </tr>
        {% endif %}
        {% endfor %}
    </table>
    {% endif %}

    {% if error %}
    <h2>📉 误差分析</h2>
    <h3>总体误差</h3>
    <table>
        <tr><th>指标</th><th>MAE</th><th>RMSE</th><th>MAX</th><th>单位</th></tr>
        <tr><td>位置</td><td>{{ "%.4f"|format(error.position.mae) }}</td><td>{{ "%.4f"|format(error.position.rmse) }}</td><td>{{ "%.4f"|format(error.position.max) }}</td><td>m</td></tr>
        <tr><td>速度</td><td>{{ "%.4f"|format(error.velocity.mae) }}</td><td>{{ "%.4f"|format(error.velocity.rmse) }}</td><td>{{ "%.4f"|format(error.velocity.max) }}</td><td>m/s</td></tr>
        <tr><td>轨迹角</td><td>{{ "%.4f"|format(error.trajectory_angle.mae_deg) }}</td><td>{{ "%.4f"|format(error.trajectory_angle.rmse_deg) }}</td><td>{{ "%.4f"|format(error.trajectory_angle.max_deg) }}</td><td>deg</td></tr>
    </table>

    {% if error.measured_angle_comparison %}
    <h3>实测角度 vs 模拟角度</h3>
    <table>
        <tr><th>时间(s)</th><th>实测角(°)</th><th>模拟角(°)</th><th>误差(°)</th></tr>
        {% for c in error.measured_angle_comparison %}
        <tr><td>{{ "%.2f"|format(c.t) }}</td><td>{{ "%.2f"|format(c.measured_angle_deg) }}</td><td>{{ "%.2f"|format(c.simulated_angle_deg) }}</td><td>{{ "%.2f"|format(c.error_deg) }}</td></tr>
        {% endfor %}
    </table>
    {% endif %}
    {% endif %}

    <h2>📚 物理公式参考</h2>
    {% for key, formula in formulas.items() %}
    <h3>{{ formula.name }}</h3>
    <div class="formula">
        {% for eq in formula.equations %}{{ eq }}<br>{% endfor %}
    </div>
    <p><strong>参数说明:</strong></p>
    <ul>
    {% for pname, pdesc in formula.parameters.items() %}
        <li><code>{{ pname }}</code>: {{ pdesc }}</li>
    {% endfor %}
    </ul>
    {% endfor %}

</div>
</body>
</html>"""

        from jinja2 import Template
        template = Template(html_template)

        html_content = template.render(
            report_id=report.report_id,
            created_at=report.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            bounds=report.bounds_config.to_dict(),
            event_count=len(report.events),
            events=report.events,
            anomaly_count=len(report.anomalies),
            anomalies=report.anomalies,
            fitting=report.fitting_result,
            drag=report.drag_estimation,
            error=report.error_analysis,
            formulas=FORMULAS,
        )

        file_path = self.output_dir / f"{report.report_id}_report.html"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        return str(file_path)

    def _serialize_intermediate(self, intermediate: Any) -> Any:
        """序列化中间量，处理numpy类型"""
        if isinstance(intermediate, dict):
            result = {}
            for key, val in intermediate.items():
                if isinstance(val, np.ndarray):
                    result[key] = val.tolist()
                elif isinstance(val, (np.floating, np.integer)):
                    result[key] = float(val)
                elif isinstance(val, dict):
                    result[key] = self._serialize_intermediate(val)
                elif isinstance(val, list):
                    result[key] = [self._serialize_intermediate(v) for v in val]
                else:
                    result[key] = val
            return result
        elif isinstance(intermediate, list):
            return [self._serialize_intermediate(v) for v in intermediate]
        elif isinstance(intermediate, np.ndarray):
            return intermediate.tolist()
        else:
            return intermediate

    def _serialize_error_analysis(self, ea: Dict[str, Any]) -> Dict[str, Any]:
        """序列化误差分析数据"""
        result = {}
        for key, val in ea.items():
            if isinstance(val, dict):
                if key == "per_point" or key == "measured_angle_comparison":
                    result[key] = val
                else:
                    result[key] = self._serialize_intermediate(val)
            elif isinstance(val, list):
                result[key] = val
            else:
                result[key] = val
        return result
