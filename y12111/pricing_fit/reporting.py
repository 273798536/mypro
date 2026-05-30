from typing import Any, Dict, List, Optional, Union
"""Report generation module for creating human-readable and shareable reports."""

import json
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.cm as cm
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

try:
    from jinja2 import Template
    HAS_JINJA = True
except ImportError:
    HAS_JINJA = False


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>非线性定价拟合分析报告 - {{ title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f7fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .meta { opacity: 0.9; font-size: 14px; }
        .section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .section h2 {
            font-size: 20px;
            color: #2c3e50;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 16px;
            border-radius: 8px;
        }
        .summary-card .label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card .value { font-size: 24px; font-weight: 600; color: #2c3e50; margin-top: 4px; }
        .summary-card .change { font-size: 12px; margin-top: 4px; }
        .change.positive { color: #27ae60; }
        .change.negative { color: #e74c3c; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e8e8e8; }
        th { background: #f8f9ff; font-weight: 600; color: #2c3e50; }
        tr:hover { background: #f8f9ff; }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge.success { background: #d4edda; color: #155724; }
        .badge.warning { background: #fff3cd; color: #856404; }
        .badge.danger { background: #f8d7da; color: #721c24; }
        .badge.info { background: #d1ecf1; color: #0c5460; }
        .outlier-item, .customer-item {
            background: #fdfdfd;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
        }
        .outlier-item .reason, .customer-item .metrics { color: #666; font-size: 13px; margin-top: 4px; }
        .chart-container {
            text-align: center;
            margin: 20px 0;
        }
        .chart-container img {
            max-width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .recommendation {
            background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
            border-left: 4px solid #667eea;
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
        }
        .recommendation h3 { color: #667eea; font-size: 16px; margin-bottom: 8px; }
        .comparison-table { overflow-x: auto; }
        .comparison-table td, .comparison-table th { font-size: 13px; }
        .improved { color: #27ae60; font-weight: 500; }
        .declined { color: #e74c3c; font-weight: 500; }
        .correction-info {
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .correction-info h3 { color: #ff9800; font-size: 16px; margin-bottom: 8px; }
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 768px) {
            .two-column { grid-template-columns: 1fr; }
        }
        .stage-change {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px;
            border-radius: 8px;
            margin-top: 12px;
        }
        .footer {
            text-align: center;
            color: #95a5a6;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e8e8e8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 非线性定价拟合分析报告</h1>
        <div class="meta">
            报告标题: {{ title }} | 生成时间: {{ generated_at }} | 运行哈希: {{ run_hash }} | 阶段: {{ stage }}
        </div>
    </div>

    {% if correction_info %}
    <div class="correction-info">
        <h3>📝 手动修正信息</h3>
        <p><strong>修正序号:</strong> #{{ correction_info.correction_number }}</p>
        <p><strong>记录ID:</strong> {{ correction_info.record_id }}</p>
        <p><strong>修正字段:</strong> {{ correction_info.field }}</p>
        <p><strong>原值 → 新值:</strong> {{ correction_info.old_value }} → {{ correction_info.new_value }}</p>
        <p><strong>原因:</strong> {{ correction_info.reason }}</p>
    </div>
    {% endif %}

    <div class="section">
        <h2>📈 拟合结果摘要</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">最佳模型</div>
                <div class="value">{{ fit_results.model_type }}</div>
            </div>
            <div class="summary-card">
                <div class="label">R² 分数</div>
                <div class="value">{{ "%.4f"|format(fit_results.r2_score) }}</div>
                {% if stage_changes %}
                <div class="change {{ 'positive' if stage_changes.r2_score.diff > 0 else 'negative' }}">
                    {{ "%+.4f"|format(stage_changes.r2_score.diff) }} ({{ "%+.1f"|format(stage_changes.r2_score.pct_change) }}%)
                </div>
                {% endif %}
            </div>
            <div class="summary-card">
                <div class="label">RMSE</div>
                <div class="value">{{ "%.2f"|format(fit_results.rmse) }}</div>
                {% if stage_changes %}
                <div class="change {{ 'negative' if stage_changes.rmse.diff > 0 else 'positive' }}">
                    {{ "%+.2f"|format(stage_changes.rmse.diff) }} ({{ "%+.1f"|format(stage_changes.rmse.pct_change) }}%)
                </div>
                {% endif %}
            </div>
            <div class="summary-card">
                <div class="label">平均弹性</div>
                <div class="value">{{ "%.3f"|format(fit_results.elasticity.average) }}</div>
            </div>
        </div>

        {% if elasticity_interpretation %}
        <div class="recommendation">
            <h3>💡 弹性解读</h3>
            <p>{{ elasticity_interpretation }}</p>
        </div>
        {% endif %}

        {% if charts.fit_curve %}
        <div class="chart-container">
            <img src="{{ charts.fit_curve }}" alt="拟合曲线">
        </div>
        {% endif %}
    </div>

    <div class="section">
        <h2>🎯 数据质量分析</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">转化记录数</div>
                <div class="value">{{ data_summary.conversion_count }}</div>
            </div>
            <div class="summary-card">
                <div class="label">客户数</div>
                <div class="value">{{ data_summary.customer_count }}</div>
            </div>
            <div class="summary-card">
                <div class="label">总营收</div>
                <div class="value">{{ "%.0f"|format(data_summary.total_revenue) }}</div>
            </div>
            <div class="summary-card">
                <div class="label">转化率</div>
                <div class="value">{{ "%.1f"|format(data_summary.conversion_rate * 100) }}%</div>
            </div>
            <div class="summary-card">
                <div class="label">异常值</div>
                <div class="value">
                    <span class="badge {{ 'danger' if anomaly_report.summary.outlier_count > 5 else 'warning' }}">
                        {{ anomaly_report.summary.outlier_count }}
                    </span>
                </div>
            </div>
            <div class="summary-card">
                <div class="label">大客户</div>
                <div class="value">
                    <span class="badge {{ 'warning' if anomaly_report.summary.large_customer_count > 0 else 'info' }}">
                        {{ anomaly_report.summary.large_customer_count }}
                    </span>
                </div>
            </div>
            <div class="summary-card">
                <div class="label">折扣记录</div>
                <div class="value">
                    <span class="badge info">{{ anomaly_report.summary.discount_count }}</span>
                </div>
            </div>
            <div class="summary-card">
                <div class="label">稀疏组</div>
                <div class="value">
                    <span class="badge {{ 'warning' if anomaly_report.summary.sparse_group_count > 0 else 'success' }}">
                        {{ anomaly_report.summary.sparse_group_count }}
                    </span>
                </div>
            </div>
        </div>

        {% if charts.residuals %}
        <div class="chart-container">
            <img src="{{ charts.residuals }}" alt="残差图">
        </div>
        {% endif %}
    </div>

    {% if anomaly_report.outliers %}
    <div class="section">
        <h2>⚠️ 异常值详情</h2>
        {% for outlier in anomaly_report.outliers[:20] %}
        <div class="outlier-item">
            <strong>{{ outlier.record_id }}</strong>
            <span class="badge danger">{{ outlier.method }}</span>
            {% if outlier.z_score %}
            <span class="badge warning">z={{ "%.2f"|format(outlier.z_score) }}</span>
            {% endif %}
            <div class="reason">{{ outlier.reason }}</div>
        </div>
        {% endfor %}
        {% if anomaly_report.outliers|length > 20 %}
        <p style="color: #7f8c8d; margin-top: 8px;">... 还有 {{ anomaly_report.outliers|length - 20 }} 条异常值</p>
        {% endif %}
    </div>
    {% endif %}

    {% if anomaly_report.large_customers %}
    <div class="section">
        <h2>🏢 异常大客户详情</h2>
        {% for customer in anomaly_report.large_customers[:15] %}
        <div class="customer-item">
            <strong>{{ customer.customer_id }}</strong>
            {% if customer.is_extreme %}
            <span class="badge danger">极端大客户</span>
            {% endif %}
            <span class="badge info">{{ "%.1f"|format(customer.revenue_multiple) }}x 中位数</span>
            <div class="metrics">
                总营收: {{ "%.0f"|format(customer.total_revenue) }} |
                总用量: {{ "%.0f"|format(customer.total_quantity) }} |
                订单数: {{ customer.order_count }} |
                ARPU: {{ "%.0f"|format(customer.arpu) }}
            </div>
        </div>
        {% endfor %}
        {% if anomaly_report.large_customers|length > 15 %}
        <p style="color: #7f8c8d; margin-top: 8px;">... 还有 {{ anomaly_report.large_customers|length - 15 }} 个大客户</p>
        {% endif %}
    </div>
    {% endif %}

    {% if sensitivity_results.outlier_removal_sensitivity %}
    <div class="section">
        <h2>🧹 异常剔除影响分析</h2>
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>剔除方案</th>
                        <th>剔除数量</th>
                        <th>R²</th>
                        <th>R² 变化</th>
                        <th>RMSE</th>
                        <th>RMSE 变化</th>
                    </tr>
                </thead>
                <tbody>
                    {% for name, scenario in sensitivity_results.outlier_removal_sensitivity.scenarios.items() %}
                    <tr>
                        <td>
                            {% if name == sensitivity_results.outlier_removal_sensitivity.recommended_scenario %}
                            <span class="badge success">推荐</span>
                            {% endif %}
                            {{ name }}
                        </td>
                        <td>{{ scenario.removed_count }}</td>
                        <td>{{ "%.4f"|format(scenario.r2_score) }}</td>
                        <td class="{{ 'improved' if scenario.r2_change > 0 else 'declined' }}">
                            {{ "%+.4f"|format(scenario.r2_change) }}
                        </td>
                        <td>{{ "%.2f"|format(scenario.rmse) }}</td>
                        <td class="{{ 'improved' if scenario.rmse_change < 0 else 'declined' }}">
                            {{ "%+.2f"|format(scenario.rmse_change) }}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        <div class="recommendation">
            <h3>💡 建议</h3>
            <p>{{ sensitivity_results.outlier_removal_sensitivity.recommendation }}</p>
        </div>
    </div>
    {% endif %}

    {% if sensitivity_results.group_comparison %}
    <div class="section">
        <h2>👥 分组对比分析</h2>
        <p><strong>分组字段:</strong> {{ sensitivity_results.group_comparison.group_by }}</p>
        
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>分组</th>
                        <th>样本数</th>
                        <th>模型</th>
                        <th>R²</th>
                        <th>与整体R²差</th>
                        <th>平均弹性</th>
                    </tr>
                </thead>
                <tbody>
                    {% for group_name, group_data in sensitivity_results.group_comparison.groups.items() %}
                    <tr>
                        <td>
                            {% if group_name == sensitivity_results.group_comparison.best_group %}
                            <span class="badge success">最佳</span>
                            {% elif group_name == sensitivity_results.group_comparison.worst_group %}
                            <span class="badge danger">最差</span>
                            {% endif %}
                            {{ group_name }}
                        </td>
                        <td>{{ group_data.count }}</td>
                        <td>{{ group_data.model_type or '-' }}</td>
                        <td>{{ "%.4f"|format(group_data.r2_score) if group_data.r2_score else '-' }}</td>
                        <td class="{{ 'improved' if group_data.overall_r2_diff > 0 else 'declined' }}">
                            {{ "%+.4f"|format(group_data.overall_r2_diff) if group_data.overall_r2_diff is defined else '-' }}
                        </td>
                        <td>{{ "%.3f"|format(group_data.elasticity_avg) if group_data.elasticity_avg is defined else '-' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>

        {% if sensitivity_results.group_comparison.anova_test %}
        <div style="margin-top: 16px;">
            <strong>ANOVA 检验:</strong>
            F = {{ "%.4f"|format(sensitivity_results.group_comparison.anova_test.f_statistic) }},
            p = {{ "%.4f"|format(sensitivity_results.group_comparison.anova_test.p_value) }}
            <span class="badge {{ 'success' if not sensitivity_results.group_comparison.anova_test.significant else 'danger' }}">
                {{ '显著' if sensitivity_results.group_comparison.anova_test.significant else '不显著' }}
            </span>
            <p style="margin-top: 8px; color: #555;">{{ sensitivity_results.group_comparison.anova_test.interpretation }}</p>
        </div>
        {% endif %}

        <div class="recommendation">
            <h3>💡 建议</h3>
            <p>{{ sensitivity_results.group_comparison.recommendation }}</p>
        </div>
    </div>
    {% endif %}

    {% if sensitivity_results.scenario_analysis and sensitivity_results.scenario_analysis.volume_discount %}
    <div class="section">
        <h2>💰 批量折扣分析</h2>
        <p>
            <strong>基准用量:</strong> {{ "%.0f"|format(sensitivity_results.scenario_analysis.volume_discount.base_quantity) }} |
            <strong>基准单价:</strong> {{ "%.2f"|format(sensitivity_results.scenario_analysis.volume_discount.base_unit_price) }} |
            <strong>最大折扣:</strong> {{ "%.1f"|format(sensitivity_results.scenario_analysis.volume_discount.max_discount) }}%
        </p>
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>用量</th>
                        <th>预测总价</th>
                        <th>单价</th>
                        <th>相对基准折扣</th>
                        <th>弹性</th>
                    </tr>
                </thead>
                <tbody>
                    {% for discount in sensitivity_results.scenario_analysis.volume_discount.discount_schedule %}
                    <tr>
                        <td>{{ "%.0f"|format(discount.quantity) }}</td>
                        <td>{{ "%.2f"|format(discount.unit_price * discount.quantity) }}</td>
                        <td>{{ "%.2f"|format(discount.unit_price) }}</td>
                        <td class="improved">{{ "%.1f"|format(discount.discount_vs_base) }}%</td>
                        <td>{{ "%.3f"|format(discount.elasticity) if discount.elasticity else '-' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
    {% endif %}

    {% if sensitivity_results.sensitivity %}
    <div class="section">
        <h2>🔍 参数敏感度分析</h2>
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>参数</th>
                        <th>参数值</th>
                        <th>±{{ sensitivity_range * 100 }}% 扰动对RMSE影响</th>
                    </tr>
                </thead>
                <tbody>
                    {% for param, impact in sensitivity_results.sensitivity.items() %}
                    <tr>
                        <td>{{ param }}</td>
                        <td>{{ "%.4f"|format(fit_results.parameters.get(param, 0)) }}</td>
                        <td>
                            <div style="background: #e8e8e8; border-radius: 4px; height: 20px; overflow: hidden;">
                                <div style="background: {% if impact > 0.1 %}#e74c3c{% elif impact > 0.05 %}#f39c12{% else %}#27ae60{% endif %};
                                            height: 100%; width: {{ [impact * 500, 100]|min }}%;"></div>
                            </div>
                            {{ "%.2f"|format(impact * 100) }}%
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% if charts.sensitivity %}
        <div class="chart-container">
            <img src="{{ charts.sensitivity }}" alt="敏感度分析图">
        </div>
        {% endif %}
    </div>
    {% endif %}

    {% if charts.elasticity_curve %}
    <div class="section">
        <h2>📉 弹性曲线</h2>
        <div class="chart-container">
            <img src="{{ charts.elasticity_curve }}" alt="弹性曲线">
        </div>
    </div>
    {% endif %}

    {% if stage_changes %}
    <div class="section">
        <h2>🔄 阶段变化对比</h2>
        <div class="stage-change">
            {% for key, change in stage_changes.items() %}
            <p>
                <strong>{{ key }}:</strong>
                {{ "%.4f"|format(change.old) }} → {{ "%.4f"|format(change.new) }}
                <span class="{{ 'positive' if (key == 'r2_score' and change.diff > 0) or (key != 'r2_score' and change.diff < 0) else 'negative' }}">
                    ({{ "%+.4f"|format(change.diff) }}, {{ "%+.1f"|format(change.pct_change) }}%)
                </span>
            </p>
            {% endfor %}
        </div>
    </div>
    {% endif %}

    {% if is_comparison %}
    <div class="section">
        <h2>⚖️  新旧结果并排对比</h2>
        <div class="two-column">
            <div>
                <h3 style="color: #e74c3c; margin-bottom: 12px;">📅 旧结果 ({{ run1_hash }})</h3>
                <div class="summary-grid" style="grid-template-columns: 1fr;">
                    <div class="summary-card">
                        <div class="label">模型类型</div>
                        <div class="value">{{ comparison.old.model_type }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">R² 分数</div>
                        <div class="value">{{ "%.4f"|format(comparison.old.r2_score) }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">RMSE</div>
                        <div class="value">{{ "%.2f"|format(comparison.old.rmse) }}</div>
                    </div>
                </div>
            </div>
            <div>
                <h3 style="color: #27ae60; margin-bottom: 12px;">✨ 新结果 ({{ run2_hash }})</h3>
                <div class="summary-grid" style="grid-template-columns: 1fr;">
                    <div class="summary-card">
                        <div class="label">模型类型</div>
                        <div class="value">{{ comparison.new.model_type }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">R² 分数</div>
                        <div class="value" style="color: #27ae60;">
                            {{ "%.4f"|format(comparison.new.r2_score) }}
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="label">RMSE</div>
                        <div class="value" style="color: #27ae60;">
                            {{ "%.2f"|format(comparison.new.rmse) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="comparison-table" style="margin-top: 20px;">
            <table>
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>旧值</th>
                        <th>新值</th>
                        <th>变化量</th>
                        <th>变化率</th>
                    </tr>
                </thead>
                <tbody>
                    {% for metric in comparison.metrics %}
                    <tr>
                        <td>{{ metric.name }}</td>
                        <td>{{ metric.value1 }}</td>
                        <td>{{ metric.value2 }}</td>
                        <td class="{{ 'improved' if metric.improved else 'declined' }}">
                            {{ "%+.4f"|format(metric.diff) if metric.diff is defined else (metric.changed and '变化' or '无变化') }}
                        </td>
                        <td>
                            {% if metric.pct_change is defined %}
                            {{ "%+.1f"|format(metric.pct_change) }}%
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>

        {% if charts.comparison %}
        <div class="chart-container" style="margin-top: 20px;">
            <img src="{{ charts.comparison }}" alt="新旧结果对比图">
        </div>
        {% endif %}
    </div>
    {% endif %}

    <div class="footer">
        <p>非线性定价拟合分析工具 v1.0.0 | 报告生成于 {{ generated_at }}</p>
        <p>本报告可转发分享，所有数据均已脱敏处理</p>
    </div>
</body>
</html>
"""


class ReportGenerator:
    """Generate comprehensive reports from fitting results."""
    
    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.charts_dir = output_dir / "charts"
        self.reports_dir = output_dir / "reports"
        self.charts_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
    
    def generate(self, results: Dict[str, Any], stage: str) -> Dict[str, str]:
        """Generate all reports for a single run."""
        run_hash = results.get("run_hash", "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        charts = self._generate_charts(results, run_hash, timestamp)
        
        stage_changes = results.get("stage_changes")
        
        html_content = self._render_template({
            "title": f"定价分析报告 - {stage}",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "run_hash": run_hash,
            "stage": stage,
            "fit_results": results.get("fit_results", {}),
            "data_summary": results.get("data_summary", {}),
            "anomaly_report": results.get("anomaly_report", {}),
            "sensitivity_results": results.get("sensitivity_results", {}),
            "sensitivity_range": results.get("params", {}).get("sensitivity_range", 0.2),
            "stage_changes": self._format_stage_changes(stage_changes),
            "elasticity_interpretation": results.get("sensitivity_results", {})
                .get("price_elasticity", {})
                .get("interpretation", ""),
            "charts": charts,
            "correction_info": results.get("correction_info"),
            "is_comparison": False,
        })
        
        html_file = self.reports_dir / f"report_{run_hash}_{timestamp}.html"
        html_file.write_text(html_content, encoding="utf-8")
        
        summary_file = self.reports_dir / f"summary_{run_hash}_{timestamp}.md"
        summary_content = self._generate_markdown_summary(results, stage)
        summary_file.write_text(summary_content, encoding="utf-8")
        
        json_file = self.reports_dir / f"data_{run_hash}_{timestamp}.json"
        with open(json_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        return {
            "HTML报告": str(html_file),
            "Markdown摘要": str(summary_file),
            "原始数据JSON": str(json_file),
        }
    
    def generate_comparison(self, results1: Dict[str, Any], results2: Dict[str, Any],
                           name: str) -> Dict[str, str]:
        """Generate a comparison report between two runs."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        from .correction import CorrectionManager
        manager = CorrectionManager(self.output_dir)
        comparison = manager.get_comparison_data(results1, results2)
        
        charts = self._generate_comparison_charts(results1, results2, name)
        
        html_content = self._render_template({
            "title": f"结果对比报告 - {name}",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "run_hash": f"{results1.get('run_hash', 'r1')}_vs_{results2.get('run_hash', 'r2')}",
            "stage": results2.get("stage", "unknown"),
            "fit_results": results2.get("fit_results", {}),
            "data_summary": results2.get("data_summary", {}),
            "anomaly_report": results2.get("anomaly_report", {}),
            "sensitivity_results": results2.get("sensitivity_results", {}),
            "sensitivity_range": 0.2,
            "stage_changes": None,
            "elasticity_interpretation": "",
            "charts": charts,
            "correction_info": results2.get("correction_info"),
            "is_comparison": True,
            "comparison": {
                "old": {
                    "model_type": results1.get("fit_results", {}).get("model_type", "N/A"),
                    "r2_score": results1.get("fit_results", {}).get("r2_score", 0),
                    "rmse": results1.get("fit_results", {}).get("rmse", 0),
                },
                "new": {
                    "model_type": results2.get("fit_results", {}).get("model_type", "N/A"),
                    "r2_score": results2.get("fit_results", {}).get("r2_score", 0),
                    "rmse": results2.get("fit_results", {}).get("rmse", 0),
                },
                "metrics": comparison["metrics"],
            },
            "run1_hash": results1.get("run_hash", "r1")[:12],
            "run2_hash": results2.get("run_hash", "r2")[:12],
        })
        
        html_file = self.reports_dir / f"comparison_{name}_{timestamp}.html"
        html_file.write_text(html_content, encoding="utf-8")
        
        summary_file = self.reports_dir / f"comparison_summary_{name}_{timestamp}.md"
        summary_content = self._generate_comparison_markdown(results1, results2, comparison)
        summary_file.write_text(summary_content, encoding="utf-8")
        
        return {
            "对比HTML报告": str(html_file),
            "对比Markdown摘要": str(summary_file),
        }
    
    def _generate_charts(self, results: Dict[str, Any], run_hash: str,
                        timestamp: str) -> Dict[str, str]:
        """Generate visualization charts."""
        if not HAS_MATPLOTLIB:
            return {}
        
        charts = {}
        fit_results = results.get("fit_results", {})
        conversions = results.get("original_data", {}).get("conversions", [])
        
        if isinstance(conversions, list) and len(conversions) > 0:
            df = pd.DataFrame(conversions)
        else:
            return charts
        
        fit_curve_path = self._plot_fit_curve(df, fit_results, run_hash, timestamp)
        if fit_curve_path:
            charts["fit_curve"] = fit_curve_path
        
        residuals_path = self._plot_residuals(df, fit_results, run_hash, timestamp)
        if residuals_path:
            charts["residuals"] = residuals_path
        
        elasticity_path = self._plot_elasticity_curve(results, run_hash, timestamp)
        if elasticity_path:
            charts["elasticity_curve"] = elasticity_path
        
        sensitivity = results.get("sensitivity_results", {}).get("sensitivity", {})
        if sensitivity:
            sensitivity_path = self._plot_sensitivity(sensitivity, run_hash, timestamp)
            if sensitivity_path:
                charts["sensitivity"] = sensitivity_path
        
        return charts
    
    def _plot_fit_curve(self, df: pd.DataFrame, fit_results: Dict[str, Any],
                       run_hash: str, timestamp: str) -> Optional[str]:
        """Plot the fitted curve against actual data."""
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            quantity = df["quantity"].values
            price = df["price"].values
            
            ax.scatter(quantity, price, alpha=0.6, label="实际数据", s=40,
                      color="#667eea", edgecolors="white", linewidth=0.5)
            
            if "predictions" in fit_results:
                sort_idx = np.argsort(quantity)
                ax.plot(quantity[sort_idx], np.array(fit_results["predictions"])[sort_idx],
                       color="#e74c3c", linewidth=2.5, label=f"拟合曲线 ({fit_results.get('model_type', '')})")
            
            if fit_results.get("large_customer_fit"):
                lc_mask = df["customer_id"].isin(
                    {lc["customer_id"] for lc in 
                     fit_results.get("large_customer_fit", {}).get("customer_ids", [])}
                )
                if lc_mask.any():
                    ax.scatter(quantity[lc_mask], price[lc_mask], s=100, marker="*",
                              color="#f39c12", label="大客户", zorder=5)
            
            ax.set_xlabel("用量", fontsize=12)
            ax.set_ylabel("价格", fontsize=12)
            ax.set_title(f"价格-用量拟合曲线 (R²={fit_results.get('r2_score', 0):.4f})",
                        fontsize=14, fontweight="bold")
            ax.legend(fontsize=11)
            ax.grid(True, alpha=0.3, linestyle="--")
            
            ax.set_xscale("log")
            ax.set_yscale("log")
            
            path = self.charts_dir / f"fit_curve_{run_hash}_{timestamp}.png"
            fig.tight_layout()
            fig.savefig(path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            
            return str(path)
        except Exception:
            return None
    
    def _plot_residuals(self, df: pd.DataFrame, fit_results: Dict[str, Any],
                       run_hash: str, timestamp: str) -> Optional[str]:
        """Plot residuals analysis."""
        try:
            fig, axes = plt.subplots(1, 2, figsize=(14, 5))
            
            if "residuals" not in fit_results:
                return None
            
            residuals = np.array(fit_results["residuals"])
            predictions = np.array(fit_results["predictions"])
            
            axes[0].scatter(predictions, residuals, alpha=0.6, color="#667eea",
                          edgecolors="white", linewidth=0.5)
            axes[0].axhline(y=0, color="#e74c3c", linestyle="--", linewidth=2)
            axes[0].set_xlabel("预测值", fontsize=11)
            axes[0].set_ylabel("残差", fontsize=11)
            axes[0].set_title("残差 vs 预测值", fontsize=12, fontweight="bold")
            axes[0].grid(True, alpha=0.3, linestyle="--")
            
            axes[1].hist(residuals, bins=30, color="#667eea", alpha=0.7, edgecolor="white")
            axes[1].axvline(x=0, color="#e74c3c", linestyle="--", linewidth=2)
            axes[1].set_xlabel("残差", fontsize=11)
            axes[1].set_ylabel("频次", fontsize=11)
            axes[1].set_title("残差分布", fontsize=12, fontweight="bold")
            axes[1].grid(True, alpha=0.3, linestyle="--")
            
            path = self.charts_dir / f"residuals_{run_hash}_{timestamp}.png"
            fig.tight_layout()
            fig.savefig(path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            
            return str(path)
        except Exception:
            return None
    
    def _plot_elasticity_curve(self, results: Dict[str, Any], run_hash: str,
                              timestamp: str) -> Optional[str]:
        """Plot elasticity curve."""
        try:
            elasticity_data = results.get("sensitivity_results", {})\
                .get("price_elasticity", {}).get("curve", {})
            points = elasticity_data.get("points", [])
            
            if not points:
                return None
            
            fig, ax = plt.subplots(figsize=(10, 5))
            
            quantities = [p["quantity"] for p in points]
            elasticities = [p["elasticity"] for p in points]
            
            ax.plot(quantities, elasticities, color="#667eea", linewidth=2.5,
                   marker="o", markersize=5)
            ax.axhline(y=-1, color="#e74c3c", linestyle="--", linewidth=2, label="单位弹性 (ε=-1)")
            
            unit_q = elasticity_data.get("unit_elastic_quantity")
            if unit_q:
                ax.axvline(x=unit_q, color="#27ae60", linestyle=":", linewidth=2,
                          label=f"单位弹性点 (q={unit_q:.0f})")
            
            ax.set_xlabel("用量", fontsize=11)
            ax.set_ylabel("价格弹性", fontsize=11)
            ax.set_title("价格弹性曲线", fontsize=12, fontweight="bold")
            ax.legend(fontsize=10)
            ax.grid(True, alpha=0.3, linestyle="--")
            ax.set_xscale("log")
            
            path = self.charts_dir / f"elasticity_curve_{run_hash}_{timestamp}.png"
            fig.tight_layout()
            fig.savefig(path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            
            return str(path)
        except Exception:
            return None
    
    def _plot_sensitivity(self, sensitivity: Dict[str, float], run_hash: str,
                         timestamp: str) -> Optional[str]:
        """Plot parameter sensitivity."""
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            params = list(sensitivity.keys())
            impacts = [v * 100 for v in sensitivity.values()]
            
            colors = ["#e74c3c" if v > 10 else "#f39c12" if v > 5 else "#27ae60"
                     for v in impacts]
            
            bars = ax.barh(params, impacts, color=colors, alpha=0.8)
            
            for bar, impact in zip(bars, impacts):
                ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                       f"{impact:.1f}%", va="center", fontsize=10)
            
            ax.set_xlabel("对RMSE的影响 (%)", fontsize=11)
            ax.set_title("参数敏感度分析", fontsize=12, fontweight="bold")
            ax.grid(True, alpha=0.3, linestyle="--", axis="x")
            
            path = self.charts_dir / f"sensitivity_{run_hash}_{timestamp}.png"
            fig.tight_layout()
            fig.savefig(path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            
            return str(path)
        except Exception:
            return None
    
    def _generate_comparison_charts(self, results1: Dict[str, Any], results2: Dict[str, Any],
                                   name: str) -> Dict[str, str]:
        """Generate comparison charts."""
        if not HAS_MATPLOTLIB:
            return {}
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        charts = {}
        
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            fit1 = results1.get("fit_results", {})
            fit2 = results2.get("fit_results", {})
            
            models = ["R²", "RMSE"]
            old_values = [fit1.get("r2_score", 0), fit1.get("rmse", 0)]
            new_values = [fit2.get("r2_score", 0), fit2.get("rmse", 0)]
            
            x = np.arange(len(models))
            width = 0.35
            
            bars1 = ax.bar(x - width/2, old_values, width, label="旧结果",
                          color="#e74c3c", alpha=0.7)
            bars2 = ax.bar(x + width/2, new_values, width, label="新结果",
                          color="#27ae60", alpha=0.7)
            
            for bars in [bars1, bars2]:
                for bar in bars:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f"{height:.3f}", ha="center", va="bottom", fontsize=10)
            
            ax.set_xticks(x)
            ax.set_xticklabels(models, fontsize=11)
            ax.set_title("新旧结果指标对比", fontsize=12, fontweight="bold")
            ax.legend(fontsize=10)
            ax.grid(True, alpha=0.3, linestyle="--", axis="y")
            
            path = self.charts_dir / f"comparison_{name}_{timestamp}.png"
            fig.tight_layout()
            fig.savefig(path, dpi=150, bbox_inches="tight")
            plt.close(fig)
            
            charts["comparison"] = str(path)
        except Exception:
            pass
        
        return charts
    
    def _render_template(self, context: Dict[str, Any]) -> str:
        """Render the HTML template."""
        if not HAS_JINJA:
            return self._render_simple_html(context)
        
        template = Template(REPORT_TEMPLATE)
        return template.render(**context)
    
    def _render_simple_html(self, context: Dict[str, Any]) -> str:
        """Fallback HTML rendering without Jinja."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head><title>{context['title']}</title></head>
        <body>
            <h1>{context['title']}</h1>
            <p>生成时间: {context['generated_at']}</p>
            <p>运行哈希: {context['run_hash']}</p>
            <h2>拟合结果</h2>
            <p>模型: {context['fit_results'].get('model_type', 'N/A')}</p>
            <p>R²: {context['fit_results'].get('r2_score', 0):.4f}</p>
            <p>RMSE: {context['fit_results'].get('rmse', 0):.2f}</p>
            <p>请安装 jinja2 以获取完整报告功能。</p>
        </body>
        </html>
        """
    
    def _format_stage_changes(self, stage_changes: Optional[Dict]) -> Optional[Dict]:
        """Format stage changes for template."""
        if not stage_changes:
            return None
        
        formatted = {}
        for key, change in stage_changes.items():
            if isinstance(change, dict) and "old" in change and "new" in change:
                diff = change["new"] - change["old"]
                pct = (diff / change["old"] * 100) if change["old"] != 0 else float("inf")
                formatted[key] = {
                    "old": change["old"],
                    "new": change["new"],
                    "diff": diff,
                    "pct_change": pct,
                }
        return formatted
    
    def _generate_markdown_summary(self, results: Dict[str, Any], stage: str) -> str:
        """Generate a markdown summary for quick sharing."""
        fit = results.get("fit_results", {})
        anom = results.get("anomaly_report", {})
        ds = results.get("data_summary", {})
        sens = results.get("sensitivity_results", {})
        
        lines = [
            "# 非线性定价拟合分析摘要",
            "",
            f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"- **运行阶段**: {stage}",
            f"- **运行哈希**: {results.get('run_hash', 'N/A')}",
            "",
            "## 📈 拟合结果",
            "",
            f"| 指标 | 值 |",
            f"|------|-----|",
            f"| 最佳模型 | {fit.get('model_type', 'N/A')} |",
            f"| R² 分数 | {fit.get('r2_score', 0):.4f} |",
            f"| RMSE | {fit.get('rmse', 0):.2f} |",
            f"| 平均弹性 | {fit.get('elasticity', {}).get('average', 0):.3f} |",
            "",
            "## 📊 数据质量",
            "",
            f"| 指标 | 值 |",
            f"|------|-----|",
            f"| 转化记录数 | {ds.get('conversion_count', 0)} |",
            f"| 客户数 | {ds.get('customer_count', 0)} |",
            f"| 总营收 | {ds.get('total_revenue', 0):.0f} |",
            f"| 转化率 | {ds.get('conversion_rate', 0)*100:.1f}% |",
            f"| 异常值 | {anom.get('summary', {}).get('outlier_count', 0)} |",
            f"| 大客户 | {anom.get('summary', {}).get('large_customer_count', 0)} |",
            f"| 折扣记录 | {anom.get('summary', {}).get('discount_count', 0)} |",
            "",
        ]
        
        if sens.get("outlier_removal_sensitivity"):
            ors = sens["outlier_removal_sensitivity"]
            lines.extend([
                "## 🧹 异常剔除建议",
                "",
                f"{ors.get('recommendation', '')}",
                "",
            ])
        
        if sens.get("group_comparison"):
            gc = sens["group_comparison"]
            lines.extend([
                "## 👥 分组对比建议",
                "",
                f"{gc.get('recommendation', '')}",
                "",
            ])
        
        if sens.get("price_elasticity"):
            pe = sens["price_elasticity"]
            lines.extend([
                "## 💡 弹性解读",
                "",
                f"{pe.get('interpretation', '')}",
                "",
            ])
        
        if results.get("correction_info"):
            ci = results["correction_info"]
            lines.extend([
                "## 📝 手动修正信息",
                "",
                f"- **修正序号**: #{ci['correction_number']}",
                f"- **记录ID**: {ci['record_id']}",
                f"- **字段**: {ci['field']}",
                f"- **原值 → 新值**: {ci['old_value']} → {ci['new_value']}",
                f"- **原因**: {ci['reason']}",
                "",
            ])
        
        if results.get("stage_changes"):
            lines.extend([
                "## 🔄 阶段变化",
                "",
            ])
            for key, change in results["stage_changes"].items():
                if isinstance(change, dict) and "old" in change:
                    diff = change["new"] - change["old"]
                    pct = (diff / change["old"] * 100) if change["old"] != 0 else float("inf")
                    lines.append(f"- **{key}**: {change['old']:.4f} → {change['new']:.4f} ({diff:+.4f}, {pct:+.1f}%)")
            lines.append("")
        
        lines.extend([
            "---",
            "*本摘要由非线性定价拟合工具自动生成*",
        ])
        
        return "\n".join(lines)
    
    def _generate_comparison_markdown(self, results1: Dict[str, Any], results2: Dict[str, Any],
                                     comparison: Dict[str, Any]) -> str:
        """Generate a markdown comparison summary."""
        fit1 = results1.get("fit_results", {})
        fit2 = results2.get("fit_results", {})
        
        lines = [
            "# 新旧结果对比摘要",
            "",
            f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"- **旧结果哈希**: {results1.get('run_hash', 'N/A')[:12]}",
            f"- **新结果哈希**: {results2.get('run_hash', 'N/A')[:12]}",
            "",
            "## ⚖️  核心指标对比",
            "",
            f"| 指标 | 旧结果 | 新结果 | 变化 |",
            f"|------|--------|--------|------|",
        ]
        
        for metric in comparison["metrics"]:
            if metric.get("diff") is not None:
                change = f"{metric['diff']:+.4f} ({metric['pct_change']:+.1f}%)"
            else:
                change = "变化" if metric.get("changed") else "无变化"
            
            v1 = metric.get("value1", "N/A")
            v2 = metric.get("value2", "N/A")
            if isinstance(v1, float):
                v1 = f"{v1:.4f}"
            if isinstance(v2, float):
                v2 = f"{v2:.4f}"
            
            lines.append(f"| {metric['name']} | {v1} | {v2} | {change} |")
        
        if results2.get("correction_info"):
            ci = results2["correction_info"]
            lines.extend([
                "",
                "## 📝 修正详情",
                "",
                f"- **修正序号**: #{ci['correction_number']}",
                f"- **记录ID**: {ci['record_id']}",
                f"- **字段**: {ci['field']}",
                f"- **原值 → 新值**: {ci['old_value']} → {ci['new_value']}",
                f"- **原因**: {ci['reason']}",
            ])
        
        lines.extend([
            "",
            "---",
            "*本对比摘要由非线性定价拟合工具自动生成*",
        ])
        
        return "\n".join(lines)
