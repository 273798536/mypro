"""报告导出模块 - 生成可追溯到来源材料的校验报告"""

import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from jinja2 import Template
import pandas as pd

from .models import Sample, ValidationResult, DatasetVersion


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OCR 文档问答校验报告 - {{ version_name }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif;
            background: #f5f7fa;
            color: #1f2937;
            padding: 24px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 24px; margin-bottom: 8px; color: #111827; }
        h2 { font-size: 18px; margin: 24px 0 12px; color: #1f2937; border-left: 4px solid #3b82f6; padding-left: 12px; }
        h3 { font-size: 15px; margin: 16px 0 8px; color: #374151; }
        .subtitle { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
        .metric-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        .metric-value { font-size: 28px; font-weight: 600; color: #111827; }
        .metric-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .passed .metric-value { color: #059669; }
        .blocked .metric-value { color: #dc2626; }
        .review .metric-value { color: #d97706; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        tr:hover { background: #f9fafb; }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-passed { background: #d1fae5; color: #065f46; }
        .status-blocked { background: #fee2e2; color: #991b1b; }
        .status-needs_review { background: #fef3c7; color: #92400e; }
        .status-pending { background: #e5e7eb; color: #374151; }
        .source-trace {
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            color: #4b5563;
            margin-top: 8px;
        }
        .source-trace code {
            background: #e5e7eb;
            padding: 1px 6px;
            border-radius: 3px;
        }
        .reason-list { color: #dc2626; font-size: 12px; }
        .reason-list li { margin-left: 16px; }
        .sample-detail {
            background: #fafafa;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-top: 8px;
        }
        .sample-detail .label { font-weight: 600; color: #374151; font-size: 12px; }
        .sample-detail .content { color: #4b5563; font-size: 13px; margin-top: 4px; }
        .bias-alert {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 8px;
        }
        .bias-high { background: #fee2e2; border-left-color: #ef4444; }
        .bias-tag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            margin-right: 6px;
        }
        .tag-direct { background: #d1fae5; color: #065f46; }
        .tag-review { background: #fef3c7; color: #92400e; }
        .toc { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .toc ul { list-style: none; }
        .toc li { padding: 4px 0; }
        .toc a { color: #3b82f6; text-decoration: none; font-size: 14px; }
        .toc a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 OCR 文档问答校验报告</h1>
        <p class="subtitle">
            数据集版本: <strong>{{ version_name }}</strong>
            &nbsp;|&nbsp;
            生成时间: {{ generated_at }}
            &nbsp;|&nbsp;
            校验样本数: {{ overall.total }}
        </p>

        <div class="toc card">
            <h3 style="margin-top:0;">目录</h3>
            <ul>
                <li><a href="#overview">一、整体概览</a></li>
                <li><a href="#grouped">二、分组指标</a></li>
                <li><a href="#bias">三、偏科检测</a></li>
                <li><a href="#passed">四、通过校验的样本</a></li>
                <li><a href="#review">五、待人工复核的样本</a></li>
                <li><a href="#blocked">六、被拦截的坏数据</a></li>
            </ul>
        </div>

        <h2 id="overview">一、整体概览</h2>
        <div class="card">
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{{ overall.total }}</div>
                    <div class="metric-label">总样本数</div>
                </div>
                <div class="metric-card passed">
                    <div class="metric-value">{{ overall.passed }}</div>
                    <div class="metric-label">通过 ({{ overall.pass_rate }})</div>
                </div>
                <div class="metric-card review">
                    <div class="metric-value">{{ overall.needs_review }}</div>
                    <div class="metric-label">待复核 ({{ overall.review_rate }})</div>
                </div>
                <div class="metric-card blocked">
                    <div class="metric-value">{{ overall.blocked }}</div>
                    <div class="metric-label">被拦截 ({{ overall.block_rate }})</div>
                </div>
            </div>
        </div>

        <h2 id="grouped">二、分组指标</h2>
        {% for field, df in grouped_stats.items() %}
        <div class="card">
            <h3>按 {{ field }} 分组</h3>
            <table>
                <thead>
                    <tr>
                        <th>{{ field }}</th>
                        <th>样本数</th>
                        <th>通过</th>
                        <th>待复核</th>
                        <th>被拦截</th>
                        <th>通过率</th>
                        <th>平均置信度</th>
                    </tr>
                </thead>
                <tbody>
                    {% for _, row in df.iterrows() %}
                    <tr>
                        <td><strong>{{ row[field] }}</strong></td>
                        <td>{{ row['total'] }}</td>
                        <td>{{ row['passed'] }}</td>
                        <td>{{ row['needs_review'] }}</td>
                        <td>{{ row['blocked'] }}</td>
                        <td>{{ row['pass_rate'] }}</td>
                        <td>{{ row['avg_confidence'] }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endfor %}

        <h2 id="bias">三、偏科检测</h2>
        <div class="card">
            {% if biases %}
                {% for bias in biases %}
                <div class="bias-alert {{ 'bias-high' if bias.severity == 'high' else '' }}">
                    <div>
                        <strong>{{ bias.dimension }}: {{ bias.group }}</strong>
                        &nbsp;&nbsp;
                        组通过率 {{ bias.group_pass_rate }}
                        （整体 {{ bias.overall_pass_rate }}，偏差 {{ bias.deviation }}）
                        &nbsp;&nbsp;
                        样本数: {{ bias.sample_count }}
                    </div>
                    <div style="margin-top: 6px;">
                        {% if bias.can_use_directly %}
                        <span class="bias-tag tag-direct">✓ 可直接用于训练</span>
                        {% endif %}
                        {% if bias.needs_kr_review %}
                        <span class="bias-tag tag-review">⚠ 需知识库运营复核</span>
                        {% endif %}
                        <span style="font-size: 12px; color: #6b7280;">严重程度: {{ bias.severity }}</span>
                    </div>
                </div>
                {% endfor %}
            {% else %}
                <p style="color: #059669;">✓ 未检测到明显偏科，各分组表现均衡。</p>
            {% endif %}
        </div>

        <h2 id="passed">四、通过校验的样本 ({{ passed_samples|length }})</h2>
        <div class="card">
            {% for item in passed_samples %}
            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <span class="status-badge status-passed">通过</span>
                    <strong>样本 {{ loop.index }}:</strong> {{ item.sample.question[:50] }}{% if item.sample.question|length > 50 %}...{% endif %}
                </div>
                <div class="source-trace">
                    📁 来源: <code>{{ item.sample.source_trace.source_file or '未知' }}</code>
                    {% if item.sample.source_trace.source_row %}
                    &nbsp;|&nbsp; 📝 行号: <code>第 {{ item.sample.source_trace.source_row }} 行</code>
                    {% endif %}
                    {% if item.sample.source_trace.image_name %}
                    &nbsp;|&nbsp; 🖼 图片: <code>{{ item.sample.source_trace.image_name }}</code>
                    {% endif %}
                    {% if item.sample.source_trace.source_note %}
                    &nbsp;|&nbsp; 📌 备注: {{ item.sample.source_trace.source_note }}
                    {% endif %}
                </div>
                {% if include_raw_sample %}
                <div class="sample-detail">
                    <div class="label">问题:</div>
                    <div class="content">{{ item.sample.question }}</div>
                    <div class="label" style="margin-top: 8px;">答案:</div>
                    <div class="content">{{ item.sample.answer }}</div>
                </div>
                {% endif %}
            </div>
            {% endfor %}
            {% if not passed_samples %}
            <p style="color: #6b7280;">暂无通过校验的样本。</p>
            {% endif %}
        </div>

        <h2 id="review">五、待人工复核的样本 ({{ review_samples|length }})</h2>
        <div class="card">
            {% for item in review_samples %}
            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <span class="status-badge status-needs_review">待复核</span>
                    <strong>样本 {{ loop.index }}:</strong> {{ item.sample.question[:50] }}{% if item.sample.question|length > 50 %}...{% endif %}
                </div>
                <div class="source-trace">
                    📁 来源: <code>{{ item.sample.source_trace.source_file or '未知' }}</code>
                    {% if item.sample.source_trace.source_row %}
                    &nbsp;|&nbsp; 📝 行号: <code>第 {{ item.sample.source_trace.source_row }} 行</code>
                    {% endif %}
                    {% if item.sample.source_trace.image_name %}
                    &nbsp;|&nbsp; 🖼 图片: <code>{{ item.sample.source_trace.image_name }}</code>
                    {% endif %}
                    {% if item.sample.source_trace.source_note %}
                    &nbsp;|&nbsp; 📌 备注: {{ item.sample.source_trace.source_note }}
                    {% endif %}
                </div>
                <ul class="reason-list" style="margin-top: 8px;">
                    {% for reason in item.result.safety_check.blocked_reasons %}
                    <li>{{ reason }}</li>
                    {% endfor %}
                </ul>
                {% if include_raw_sample %}
                <div class="sample-detail">
                    <div class="label">问题:</div>
                    <div class="content">{{ item.sample.question }}</div>
                    <div class="label" style="margin-top: 8px;">答案:</div>
                    <div class="content">{{ item.sample.answer }}</div>
                </div>
                {% endif %}
            </div>
            {% endfor %}
            {% if not review_samples %}
            <p style="color: #6b7280;">暂无待复核的样本。</p>
            {% endif %}
        </div>

        <h2 id="blocked">六、被拦截的坏数据 ({{ blocked_samples|length }})</h2>
        <div class="card">
            {% for item in blocked_samples %}
            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <span class="status-badge status-blocked">已拦截</span>
                    <strong>样本 {{ loop.index }}:</strong> {{ item.sample.question[:50] }}{% if item.sample.question|length > 50 %}...{% endif %}
                    &nbsp;&nbsp;
                    <span style="font-size: 12px; color: #dc2626;">风险等级: {{ item.result.safety_check.risk_level }}</span>
                </div>
                <div class="source-trace">
                    📁 来源: <code>{{ item.sample.source_trace.source_file or '未知' }}</code>
                    {% if item.sample.source_trace.source_row %}
                    &nbsp;|&nbsp; 📝 行号: <code>第 {{ item.sample.source_trace.source_row }} 行</code>
                    {% endif %}
                    {% if item.sample.source_trace.image_name %}
                    &nbsp;|&nbsp; 🖼 图片: <code>{{ item.sample.source_trace.image_name }}</code>
                    {% endif %}
                    {% if item.sample.source_trace.source_note %}
                    &nbsp;|&nbsp; 📌 备注: {{ item.sample.source_trace.source_note }}
                    {% endif %}
                </div>
                <ul class="reason-list" style="margin-top: 8px;">
                    {% for reason in item.result.safety_check.blocked_reasons %}
                    <li>{{ reason }}</li>
                    {% endfor %}
                </ul>
                {% if include_raw_sample %}
                <div class="sample-detail">
                    <div class="label">问题:</div>
                    <div class="content">{{ item.sample.question }}</div>
                    <div class="label" style="margin-top: 8px;">答案:</div>
                    <div class="content">{{ item.sample.answer }}</div>
                </div>
                {% endif %}
            </div>
            {% endfor %}
            {% if not blocked_samples %}
            <p style="color: #6b7280;">暂无被拦截的样本。</p>
            {% endif %}
        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; padding: 16px;">
            OCR 文档问答校验工具 · 报告生成于 {{ generated_at }}
        </div>
    </div>
</body>
</html>
"""


class ReportExporter:
    """报告导出器 - 生成可追溯到来源材料的校验报告"""

    def __init__(self, config: dict):
        self.report_config = config.get("report", {})
        self.include_raw_sample = self.report_config.get("include_raw_sample", True)
        self.include_source_trace = self.report_config.get("include_source_trace", True)
        self.output_format = self.report_config.get("format", "html")

    def export(
        self,
        version_name: str,
        samples: List[Sample],
        results: List[ValidationResult],
        overall_metrics: dict,
        grouped_stats: Dict[str, "pd.DataFrame"],
        biases: List[dict],
        output_dir: str,
    ) -> str:
        """导出生成校验报告

        Args:
            version_name: 数据集版本名
            samples: 所有样本
            results: 所有校验结果
            overall_metrics: 整体指标
            grouped_stats: 分组统计
            biases: 偏科检测结果
            output_dir: 输出目录

        Returns:
            报告文件路径
        """
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        result_map = {r.sample_id: r for r in results}
        sample_items = [(s, result_map.get(s.sample_id)) for s in samples]

        passed_samples = [(s, r) for s, r in sample_items
                          if r and r.validation_status == ValidationResult.STATUS_PASSED]
        review_samples = [(s, r) for s, r in sample_items
                          if r and r.validation_status == ValidationResult.STATUS_NEEDS_REVIEW]
        blocked_samples = [(s, r) for s, r in sample_items
                           if r and r.validation_status == ValidationResult.STATUS_BLOCKED]

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"validation_report_{version_name}_{timestamp}.html"
        output_path = Path(output_dir) / filename

        template = Template(HTML_TEMPLATE)
        html_content = template.render(
            version_name=version_name,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            overall=overall_metrics,
            grouped_stats=grouped_stats,
            biases=biases,
            passed_samples=[{"sample": s, "result": r} for s, r in passed_samples],
            review_samples=[{"sample": s, "result": r} for s, r in review_samples],
            blocked_samples=[{"sample": s, "result": r} for s, r in blocked_samples],
            include_raw_sample=self.include_raw_sample,
            include_source_trace=self.include_source_trace,
        )

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return str(output_path)
