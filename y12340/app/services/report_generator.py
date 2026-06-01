import io
import base64
from typing import List, Dict, Any
from datetime import datetime

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from app.services.fitting import SpringDamperFitter


class ReportGenerator:
    def __init__(self):
        self.fitter = SpringDamperFitter()

    def _generate_plot(self, data_points: List[Dict[str, Any]], fitting_result: Any = None) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))

        t = np.array([p["timestamp"] for p in data_points])
        y = np.array([p["displacement"] for p in data_points])

        ax.scatter(t, y, c='blue', alpha=0.6, label='实验数据', s=30)

        if fitting_result:
            t_fine = np.linspace(min(t), max(t), 500)
            y_fit = self.fitter.get_fitted_curve(fitting_result, t_fine)
            ax.plot(t_fine, y_fit, 'r-', linewidth=2, label='拟合曲线')

        ax.set_xlabel('时间 (s)', fontsize=12)
        ax.set_ylabel('位移 (m)', fontsize=12)
        ax.set_title('弹簧阻尼振动曲线', fontsize=14, fontweight='bold')
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()

        return img_base64

    def generate_html_report(self, experiment: Dict[str, Any], 
                            validation_results: List[Dict[str, Any]],
                            fitting_result: Dict[str, Any] = None,
                            data_points: List[Dict[str, Any]] = None) -> str:
        plot_img = ""
        if data_points and fitting_result:
            from app.services.fitting import FittingResult as FittingResultDC
            fr = FittingResultDC(**fitting_result) if fitting_result else None
            plot_img = self._generate_plot(data_points, fr)

        error_count = sum(1 for v in validation_results if v["severity"] == "error")
        warning_count = sum(1 for v in validation_results if v["severity"] == "warning")

        status_summary = "✅ 数据校验通过" if error_count == 0 else "❌ 存在严重问题"
        if error_count == 0 and warning_count > 0:
            status_summary = "⚠️ 有需要注意的问题"

        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>弹簧阻尼实验报告 - {experiment["name"]}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            background: #f5f7fa;
            padding: 40px;
            color: #333;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
        }}
        .header h1 {{
            font-size: 28px;
            margin-bottom: 8px;
        }}
        .header .subtitle {{
            opacity: 0.9;
            font-size: 14px;
        }}
        .content {{
            padding: 40px;
        }}
        .section {{
            margin-bottom: 32px;
        }}
        .section-title {{
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .section-title::before {{
            content: '';
            width: 4px;
            height: 20px;
            background: #667eea;
            border-radius: 2px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }}
        .info-card {{
            background: #f8fafc;
            padding: 16px;
            border-radius: 10px;
            border-left: 3px solid #667eea;
        }}
        .info-label {{
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
        }}
        .info-value {{
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
        }}
        .status-badge {{
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }}
        .status-success {{
            background: #dcfce7;
            color: #166534;
        }}
        .status-warning {{
            background: #fef3c7;
            color: #92400e;
        }}
        .status-error {{
            background: #fee2e2;
            color: #991b1b;
        }}
        .validation-item {{
            background: #f8fafc;
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 12px;
            border-left: 3px solid #cbd5e1;
        }}
        .validation-item.error {{
            border-left-color: #ef4444;
            background: #fef2f2;
        }}
        .validation-item.warning {{
            border-left-color: #f59e0b;
            background: #fffbeb;
        }}
        .validation-item.success {{
            border-left-color: #22c55e;
            background: #f0fdf4;
        }}
        .validation-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }}
        .validation-type {{
            font-weight: 600;
            font-size: 14px;
        }}
        .validation-message {{
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
        }}
        .param-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }}
        .param-card {{
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }}
        .param-label {{
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
        }}
        .param-value {{
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
        }}
        .param-unit {{
            font-size: 12px;
            color: #94a3b8;
            margin-top: 2px;
        }}
        .plot-container {{
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
        }}
        .plot-container img {{
            max-width: 100%;
            border-radius: 8px;
        }}
        .footer {{
            padding: 20px 40px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            text-align: center;
        }}
        .summary-box {{
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
        }}
        .summary-box.success {{
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }}
        .summary-box.warning {{
            background: #fffbeb;
            border: 1px solid #fde68a;
        }}
        .summary-box.error {{
            background: #fef2f2;
            border: 1px solid #fecaca;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 弹簧阻尼实验报告</h1>
            <div class="subtitle">{experiment["name"]}</div>
        </div>
        <div class="content">
            <div class="summary-box {('error' if error_count > 0 else 'warning' if warning_count > 0 else 'success')}">
                <strong>总体状态：</strong>{status_summary}
                <br>
                <span style="font-size: 14px; opacity: 0.8;">
                    严重问题：{error_count} 个 | 需要注意：{warning_count} 个
                </span>
            </div>

            <div class="section">
                <div class="section-title">实验基本信息</div>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">实验名称</div>
                        <div class="info-value">{experiment["name"]}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">物体质量</div>
                        <div class="info-value">{experiment["mass"]} {experiment["mass_unit"]}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">数据来源</div>
                        <div class="info-value">{experiment.get("data_source", "未知")}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">版本</div>
                        <div class="info-value">v{experiment.get("version", 1)}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">数据点数</div>
                        <div class="info-value">{len(data_points) if data_points else 0}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">创建时间</div>
                        <div class="info-value">{experiment.get("created_at", "未知")[:19]}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">数据校验结果</div>
"""

        for v in validation_results:
            severity_class = "success" if v["passed"] else v["severity"]
            status_icon = "✅" if v["passed"] else ("❌" if v["severity"] == "error" else "⚠️")
            type_names = {
                "unit_consistency": "单位一致性检查",
                "sampling_gaps": "采样间隔检查",
                "damping_anomaly": "阻尼异常检查",
                "outliers": "异常点检测"
            }
            type_name = type_names.get(v["check_type"], v["check_type"])
            
            html += f"""
                <div class="validation-item {severity_class}">
                    <div class="validation-header">
                        <span class="validation-type">{status_icon} {type_name}</span>
                        <span class="status-badge status-{severity_class}">{'通过' if v['passed'] else '未通过'}</span>
                    </div>
                    <div class="validation-message">{v["message"]}</div>
                </div>
"""

        html += """
            </div>
"""

        if fitting_result:
            html += f"""
            <div class="section">
                <div class="section-title">参数拟合结果</div>
                <div class="param-grid">
                    <div class="param-card">
                        <div class="param-label">弹簧常数 k</div>
                        <div class="param-value">{fitting_result['spring_constant']:.3f}</div>
                        <div class="param-unit">N/m</div>
                    </div>
                    <div class="param-card">
                        <div class="param-label">阻尼系数 c</div>
                        <div class="param-value">{fitting_result['damping_coefficient']:.4f}</div>
                        <div class="param-unit">Ns/m</div>
                    </div>
                    <div class="param-card">
                        <div class="param-label">固有频率</div>
                        <div class="param-value">{fitting_result['natural_frequency']:.3f}</div>
                        <div class="param-unit">Hz</div>
                    </div>
                    <div class="param-card">
                        <div class="param-label">阻尼比 ζ</div>
                        <div class="param-value">{fitting_result['damping_ratio']:.4f}</div>
                        <div class="param-unit">无量纲</div>
                    </div>
                    <div class="param-card">
                        <div class="param-label">拟合优度 R²</div>
                        <div class="param-value">{fitting_result['r_squared']:.4f}</div>
                        <div class="param-unit">越接近1越好</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 16px; background: #f1f5f9; border-radius: 10px; font-family: monospace; font-size: 13px;">
                    <strong>拟合方程：</strong><br>
                    {fitting_result['fitted_equation']}
                </div>
            </div>
"""

        if plot_img:
            html += f"""
            <div class="section">
                <div class="section-title">振动曲线图</div>
                <div class="plot-container">
                    <img src="data:image/png;base64,{plot_img}" alt="振动曲线">
                </div>
            </div>
"""

        html += f"""
        </div>
        <div class="footer">
            弹簧阻尼实验台 · 报告生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        </div>
    </div>
</body>
</html>
"""
        return html
