import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class ReportConfig:
    include_raw_data: bool = False
    include_plots: bool = True
    format: str = "html"
    language: str = "zh-CN"


class ReportExporter:
    def __init__(
        self,
        check_result: Any,
        output_dir: str = "reports",
        config: Optional[ReportConfig] = None,
    ):
        self.check_result = check_result
        self.output_dir = output_dir
        self.config = config or ReportConfig()
        os.makedirs(output_dir, exist_ok=True)

    def export_json(self, filename: Optional[str] = None) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"joint_check_report_{timestamp}.json"

        output_path = os.path.join(self.output_dir, filename)

        data = self.check_result.to_dict()

        if not self.config.include_raw_data:
            data.pop("raw_data", None)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return output_path

    def export_text(self, filename: Optional[str] = None) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"joint_check_report_{timestamp}.txt"

        output_path = os.path.join(self.output_dir, filename)

        lines = self._generate_text_report()

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return output_path

    def export_html(self, filename: Optional[str] = None, plots: Optional[Dict[str, str]] = None) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"joint_check_report_{timestamp}.html"

        output_path = os.path.join(self.output_dir, filename)

        html_content = self._generate_html_report(plots)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return output_path

    def _generate_text_report(self) -> List[str]:
        lines = []

        lines.append("=" * 80)
        lines.append("机器人关节力矩检查报告")
        lines.append("=" * 80)
        lines.append(f"生成时间: {self.check_result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("一、数据来源")
        lines.append("-" * 80)
        for i, source in enumerate(self.check_result.sources, 1):
            lines.append(f"  {i}. 类型: {source.source_type}")
            lines.append(f"     文件: {source.file_path}")
            lines.append(f"     导入时间: {source.import_time.strftime('%Y-%m-%d %H:%M:%S')}")
            if source.metadata:
                for k, v in source.metadata.items():
                    lines.append(f"     {k}: {v}")
            lines.append("")

        lines.append("-" * 80)
        lines.append("二、关节配置")
        lines.append("-" * 80)
        for joint_id, config in self.check_result.joint_configs.items():
            lines.append(f"  关节 {joint_id} ({config.name}):")
            lines.append(f"    连杆长度: {config.link_length} m")
            lines.append(f"    角度范围: {config.min_angle}° ~ {config.max_angle}°")
            lines.append(f"    最大角速度: {config.max_angular_velocity} °/s")
            lines.append(f"    最大力矩: {config.max_torque} Nm")
            lines.append(f"    连杆质量: {config.mass} kg")
            lines.append("")

        if self.check_result.load_config:
            lines.append("-" * 80)
            lines.append("三、载荷配置")
            lines.append("-" * 80)
            load = self.check_result.load_config
            lines.append(f"  载荷质量: {load.load_mass} kg")
            lines.append(f"  载荷位置: {load.load_position}")
            lines.append(f"  最大允许载荷: {load.max_load_mass} kg")
            lines.append(f"  最大允许半径: {load.max_load_radius} m")
            lines.append("")

        lines.append("-" * 80)
        lines.append("四、计算结果摘要")
        lines.append("-" * 80)

        if self.check_result.torque_results:
            lines.append("  力矩结果 (最大值):")
            for joint_id, torques in self.check_result.torque_results.items():
                max_torque = max(torques) if torques else 0
                config = self.check_result.joint_configs.get(joint_id)
                limit = config.max_torque if config else float("inf")
                status = "✓" if max_torque <= limit else "✗"
                lines.append(f"    关节 {joint_id}: {max_torque:.2f} Nm / {limit:.2f} Nm {status}")
            lines.append("")

        if self.check_result.velocity_results:
            lines.append("  角速度结果 (最大值):")
            for joint_id, velocities in self.check_result.velocity_results.items():
                max_vel = max(abs(v) for v in velocities) if velocities else 0
                config = self.check_result.joint_configs.get(joint_id)
                limit = config.max_angular_velocity if config else float("inf")
                status = "✓" if max_vel <= limit else "✗"
                lines.append(f"    关节 {joint_id}: {max_vel:.2f} °/s / {limit:.2f} °/s {status}")
            lines.append("")

        lines.append("-" * 80)
        lines.append("五、超限检测结果")
        lines.append("-" * 80)

        if self.check_result.violations:
            critical_count = sum(1 for v in self.check_result.violations if v["severity"] == "critical")
            warning_count = sum(1 for v in self.check_result.violations if v["severity"] == "warning")

            lines.append(f"  总超限数: {len(self.check_result.violations)}")
            lines.append(f"  严重超限 (critical): {critical_count}")
            lines.append(f"  警告 (warning): {warning_count}")
            lines.append("")

            lines.append("  详细超限信息:")
            for i, v in enumerate(self.check_result.violations, 1):
                severity_mark = "【严重】" if v["severity"] == "critical" else "【警告】"
                lines.append(f"    {i}. {severity_mark} {v['message']}")
                if v.get("joint_id") is not None:
                    lines.append(f"       关节: {v['joint_id']}")
                if v.get("time_value") is not None:
                    lines.append(f"       时间: {v['time_value']:.3f}s")
                lines.append(f"       实际值: {v['actual_value']:.4f}")
                lines.append(f"       限制值: {v['limit_value']:.4f}")
                if "excess_percent" in v.get("details", {}):
                    lines.append(f"       超出: {v['details']['excess_percent']:.1f}%")
                lines.append("")

            has_load_violation = any(v["violation_type"].startswith("load_") for v in self.check_result.violations)
            if has_load_violation:
                lines.append("  ⚠️  关键失败路径: 载荷越界检测失败，请检查载荷配置！")
                lines.append("")
        else:
            lines.append("  ✓ 未检测到任何超限")
            lines.append("")

        lines.append("=" * 80)
        lines.append("报告结束")
        lines.append("=" * 80)

        return lines

    def _generate_html_report(self, plots: Optional[Dict[str, str]] = None) -> str:
        violation_summary = self._get_violation_summary()
        status_color = "#dc3545" if violation_summary["total"] > 0 else "#28a745"
        status_text = "检测到超限" if violation_summary["total"] > 0 else "全部正常"

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>机器人关节力矩检查报告</title>
    <style>
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #555;
            margin-top: 30px;
            border-left: 4px solid #007bff;
            padding-left: 10px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 10px 20px;
            color: white;
            border-radius: 25px;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
        }}
        .critical {{ background-color: #dc3545; }}
        .warning {{ background-color: #ffc107; color: #333; }}
        .success {{ background-color: #28a745; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        .violation-item {{
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }}
        .violation-critical {{
            background-color: #f8d7da;
            border-color: #dc3545;
        }}
        .violation-warning {{
            background-color: #fff3cd;
            border-color: #ffc107;
        }}
        .plot-container {{
            margin: 20px 0;
            text-align: center;
        }}
        .plot-container img {{
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 5px;
        }}
        .summary-card {{
            display: inline-block;
            padding: 20px;
            margin: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            min-width: 150px;
            text-align: center;
        }}
        .summary-value {{
            font-size: 32px;
            font-weight: bold;
        }}
        .meta-info {{
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }}
        .source-item {{
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin: 5px 0;
        }}
        .key-finding {{
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #2196f3;
            margin: 15px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 机器人关节力矩检查报告</h1>
        <div class="meta-info">
            生成时间: {self.check_result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        </div>

        <div class="status-badge" style="background-color: {status_color};">
            {status_text}
        </div>

        <h2>📊 检查概览</h2>
        <div style="text-align: center;">
            <div class="summary-card">
                <div class="summary-value">{len(self.check_result.joint_configs)}</div>
                <div>关节数量</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">{len(self.check_result.sources)}</div>
                <div>数据来源</div>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <div class="summary-value">{violation_summary['total']}</div>
                <div>总超限数</div>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                <div class="summary-value">{violation_summary['critical']}</div>
                <div>严重超限</div>
            </div>
        </div>
"""

        if violation_summary["has_load_violation"]:
            html += f"""
        <div class="key-finding">
            <strong>🔴 关键失败路径检测:</strong>
            <p>检测到载荷越界！这会导致力矩计算结果失真，请优先检查载荷配置。</p>
            <p>超限类型: {', '.join(violation_summary['load_violation_types'])}</p>
        </div>
"""

        html += f"""
        <h2>📁 数据来源</h2>
"""
        for source in self.check_result.sources:
            html += f"""
        <div class="source-item">
            <strong>类型:</strong> {source.source_type}<br>
            <strong>文件:</strong> <code>{source.file_path}</code><br>
            <strong>导入时间:</strong> {source.import_time.strftime('%Y-%m-%d %H:%M:%S')}
        </div>
"""

        html += """
        <h2>⚙️ 关节配置</h2>
        <table>
            <tr>
                <th>关节ID</th>
                <th>名称</th>
                <th>连杆长度(m)</th>
                <th>角度范围(°)</th>
                <th>最大角速度(°/s)</th>
                <th>最大力矩(Nm)</th>
                <th>连杆质量(kg)</th>
            </tr>
"""
        for joint_id, config in self.check_result.joint_configs.items():
            html += f"""
            <tr>
                <td>{joint_id}</td>
                <td>{config.name}</td>
                <td>{config.link_length}</td>
                <td>{config.min_angle} ~ {config.max_angle}</td>
                <td>{config.max_angular_velocity}</td>
                <td>{config.max_torque}</td>
                <td>{config.mass}</td>
            </tr>
"""
        html += "</table>"

        if self.check_result.load_config:
            load = self.check_result.load_config
            load_violation_class = " violation-critical" if violation_summary["has_load_violation"] else ""
            html += f"""
        <h2>📦 载荷配置</h2>
        <div class="source-item{load_violation_class}">
            <table>
                <tr>
                    <th>参数</th>
                    <th>实际值</th>
                    <th>限制值</th>
                    <th>状态</th>
                </tr>
                <tr>
                    <td>载荷质量</td>
                    <td>{load.load_mass} kg</td>
                    <td>{load.max_load_mass} kg</td>
                    <td>{'✗ 超限' if load.load_mass > load.max_load_mass else '✓ 正常'}</td>
                </tr>
                <tr>
                    <td>载荷位置</td>
                    <td>{load.load_position}</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>最大允许半径</td>
                    <td>-</td>
                    <td>{load.max_load_radius} m</td>
                    <td>-</td>
                </tr>
            </table>
        </div>
"""

        html += """
        <h2>📈 计算结果</h2>
        <table>
            <tr>
                <th>关节ID</th>
                <th>最大力矩(Nm)</th>
                <th>力矩限制(Nm)</th>
                <th>力矩状态</th>
                <th>最大角速度(°/s)</th>
                <th>角速度限制(°/s)</th>
                <th>角速度状态</th>
            </tr>
"""
        for joint_id in self.check_result.joint_configs:
            config = self.check_result.joint_configs[joint_id]
            max_torque = max(self.check_result.torque_results.get(joint_id, [0])) if self.check_result.torque_results.get(joint_id) else 0
            max_vel = max(abs(v) for v in self.check_result.velocity_results.get(joint_id, [0])) if self.check_result.velocity_results.get(joint_id) else 0

            torque_ok = max_torque <= config.max_torque
            vel_ok = max_vel <= config.max_angular_velocity

            html += f"""
            <tr>
                <td>{joint_id}</td>
                <td>{max_torque:.2f}</td>
                <td>{config.max_torque}</td>
                <td style="color: {'#28a745' if torque_ok else '#dc3545'};">{'✓ 正常' if torque_ok else '✗ 超限'}</td>
                <td>{max_vel:.2f}</td>
                <td>{config.max_angular_velocity}</td>
                <td style="color: {'#28a745' if vel_ok else '#dc3545'};">{'✓ 正常' if vel_ok else '✗ 超限'}</td>
            </tr>
"""
        html += "</table>"

        html += """
        <h2>⚠️ 超限详情</h2>
"""
        if self.check_result.violations:
            for v in self.check_result.violations:
                v_class = "violation-critical" if v["severity"] == "critical" else "violation-warning"
                html += f"""
        <div class="violation-item {v_class}">
            <strong>[{v['severity'].upper()}] {v['violation_type']}</strong><br>
            <p>{v['message']}</p>
            <small>
"""
                if v.get("joint_id") is not None:
                    html += f"关节: {v['joint_id']} | "
                if v.get("time_value") is not None:
                    html += f"时间: {v['time_value']:.3f}s | "
                html += f"实际值: {v['actual_value']:.4f} | 限制值: {v['limit_value']:.4f}"
                html += """
            </small>
        </div>
"""
        else:
            html += """
        <div style="padding: 20px; background-color: #d4edda; border-radius: 5px; text-align: center;">
            <strong>✓ 未检测到任何超限</strong>
        </div>
"""

        if plots and self.config.include_plots:
            html += """
        <h2>🖼️ 可视化图表</h2>
"""
            for plot_name, plot_path in plots.items():
                if plot_path.endswith(".png") or plot_path.endswith(".gif"):
                    plot_filename = os.path.basename(plot_path)
                    html += f"""
        <div class="plot-container">
            <h3>{plot_name.replace('_', ' ').title()}</h3>
            <img src="{plot_filename}" alt="{plot_name}">
        </div>
"""

        html += """
    </div>
</body>
</html>
"""
        return html

    def _get_violation_summary(self) -> Dict[str, Any]:
        violations = self.check_result.violations
        load_violations = [v for v in violations if v["violation_type"].startswith("load_")]

        return {
            "total": len(violations),
            "critical": sum(1 for v in violations if v["severity"] == "critical"),
            "warning": sum(1 for v in violations if v["severity"] == "warning"),
            "has_load_violation": len(load_violations) > 0,
            "load_violation_types": [v["violation_type"] for v in load_violations],
            "has_angle_violation": any(v["violation_type"].startswith("angle_") for v in violations),
            "has_velocity_violation": any(v["violation_type"] == "velocity_exceeded" for v in violations),
            "has_torque_violation": any(v["violation_type"] == "torque_exceeded" for v in violations),
        }

    def export_all(self, base_filename: Optional[str] = None, plots: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        outputs = {}

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if base_filename:
            base = base_filename
        else:
            base = f"joint_check_report_{timestamp}"

        try:
            outputs["json"] = self.export_json(f"{base}.json")
        except Exception as e:
            outputs["json_error"] = str(e)

        try:
            outputs["text"] = self.export_text(f"{base}.txt")
        except Exception as e:
            outputs["text_error"] = str(e)

        try:
            outputs["html"] = self.export_html(f"{base}.html", plots)
        except Exception as e:
            outputs["html_error"] = str(e)

        return outputs
