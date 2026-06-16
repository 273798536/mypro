from typing import List, Dict, Any, Optional
from datetime import datetime

from ..core import AuditResult
from ..versioning import VersionTracker


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>长上下文截断审计报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            background: #f5f7fa;
            color: #333;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #4472C4, #2d5aa0);
            color: white;
            padding: 24px 32px;
            border-radius: 8px 8px 0 0;
        }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .subtitle { opacity: 0.9; font-size: 14px; }
        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            padding: 20px 32px;
            background: white;
            border-bottom: 1px solid #e8e8e8;
        }
        .stat-card {
            background: #f8f9fc;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #4472C4;
            margin-bottom: 4px;
        }
        .stat-card .label { font-size: 13px; color: #666; }
        .stat-card.danger .value { color: #c0392b; }
        .stat-card.warning .value { color: #e67e22; }
        .content {
            background: white;
            padding: 24px 32px;
            border-radius: 0 0 8px 8px;
        }
        .section { margin-bottom: 28px; }
        .section h2 {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #4472C4;
            display: inline-block;
        }
        .reason-bar {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .reason-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .reason-name { width: 120px; font-size: 14px; color: #555; }
        .reason-bar-bg {
            flex: 1;
            height: 24px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .reason-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #4472C4, #6ba3e5);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            min-width: 30px;
        }
        .reason-count { width: 60px; text-align: right; font-weight: 500; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e8e8e8;
        }
        th {
            background: #f5f7fa;
            font-weight: 600;
            color: #555;
            position: sticky;
            top: 0;
        }
        tr:hover { background: #f9fafc; }
        .tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 500;
        }
        .tag-yes { background: #ffeaea; color: #c0392b; }
        .tag-no { background: #eafaf1; color: #27ae60; }
        .tag-high { background: #ffeaea; color: #c0392b; }
        .tag-medium { background: #fff5e6; color: #e67e22; }
        .tag-low { background: #e8f4fd; color: #2980b9; }
        .preview {
            max-width: 300px;
            font-size: 12px;
            color: #666;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .change-section { margin-top: 20px; }
        .change-item {
            background: #fafbfc;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 12px;
        }
        .change-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .change-field {
            display: flex;
            gap: 16px;
            align-items: center;
            padding: 8px 0;
            border-top: 1px solid #eee;
        }
        .change-field:first-of-type { border-top: none; }
        .field-name { width: 100px; color: #888; font-size: 13px; }
        .field-before, .field-after {
            flex: 1;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 13px;
        }
        .field-before { background: #fff0f0; color: #c0392b; text-decoration: line-through; }
        .field-after { background: #f0fff4; color: #27ae60; font-weight: 500; }
        .arrow { color: #999; font-size: 18px; }
        .explanation {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin-top: 20px;
            border-radius: 0 6px 6px 0;
        }
        .explanation h3 { font-size: 15px; margin-bottom: 10px; color: #92400e; }
        .explanation ul { padding-left: 20px; }
        .explanation li { margin-bottom: 6px; font-size: 13px; color: #78350f; }
        .table-container { overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>长上下文截断审计报告</h1>
            <div class="subtitle">生成时间：{{ generate_time }}</div>
        </div>

        <div class="stats-row">
            <div class="stat-card">
                <div class="value">{{ total_records }}</div>
                <div class="label">总记录数</div>
            </div>
            <div class="stat-card danger">
                <div class="value">{{ truncated_count }}</div>
                <div class="label">截断记录数</div>
            </div>
            <div class="stat-card warning">
                <div class="value">{{ truncation_rate }}</div>
                <div class="label">截断率</div>
            </div>
            <div class="stat-card">
                <div class="value">{{ avg_tokens }}</div>
                <div class="label">平均Token数</div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>截断原因分布</h2>
                <div class="reason-bar">
                    {% for reason, count in reason_stats.items() %}
                    <div class="reason-item">
                        <div class="reason-name">{{ reason }}</div>
                        <div class="reason-bar-bg">
                            <div class="reason-bar-fill" style="width: {{ (count / max_reason_count * 100) if max_reason_count > 0 else 0 }}%">
                                {{ count }}
                            </div>
                        </div>
                        <div class="reason-count">{{ count }}条</div>
                    </div>
                    {% endfor %}
                </div>
            </div>

            <div class="section">
                <h2>详细记录</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>记录编号</th>
                                <th>是否截断</th>
                                <th>截断原因</th>
                                <th>原因说明</th>
                                <th>严重程度</th>
                                <th>数据来源</th>
                                <th>原始内容预览</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for record in records %}
                            <tr>
                                <td><strong>{{ record.记录编号 }}</strong></td>
                                <td>
                                    {% if record.是否截断 == "是" %}
                                    <span class="tag tag-yes">截断</span>
                                    {% else %}
                                    <span class="tag tag-no">正常</span>
                                    {% endif %}
                                </td>
                                <td>{{ record.截断原因 }}</td>
                                <td>{{ record.原因说明 }}</td>
                                <td>
                                    {% if record.严重程度.startswith("高") %}
                                    <span class="tag tag-high">高</span>
                                    {% elif record.严重程度.startswith("中") %}
                                    <span class="tag tag-medium">中</span>
                                    {% else %}
                                    <span class="tag tag-low">低</span>
                                    {% endif %}
                                </td>
                                <td>{{ record.数据来源 }}</td>
                                <td class="preview" title="{{ record.原始内容预览 }}">{{ record.原始内容预览 }}</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>

            {% if version_changes %}
            <div class="section">
                <h2>人工修正记录</h2>
                <div class="change-section">
                    {% for change in version_changes %}
                    <div class="change-item">
                        <div class="change-title">
                            📝 记录 {{ change.record_id }} - 版本 {{ change.version_from }} → {{ change.version_to }}
                        </div>
                        {% for field_name, field_data in change.changes.items() %}
                        <div class="change-field">
                            <div class="field-name">{{ field_name }}</div>
                            <div class="field-before">{{ field_data.旧值 }}</div>
                            <div class="arrow">→</div>
                            <div class="field-after">{{ field_data.新值 }}</div>
                        </div>
                        {% endfor %}
                    </div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}

            <div class="explanation">
                <h3>💡 名词说明</h3>
                <ul>
                    <li><strong>Token</strong>：模型处理文字的基本单位，中文大概1-2个字一个token</li>
                    <li><strong>上下文窗口</strong>：模型一次能处理的最大token数量</li>
                    <li><strong>截断</strong>：内容太长，模型处理不了，后面的部分被切掉</li>
                    <li><strong>工具调用参数错误</strong>：调用工具时参数传错，导致内容处理失败</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>
"""


class HtmlExporter:
    def __init__(self):
        pass

    def export_audit_results(
        self,
        results: List[AuditResult],
        output_path: str,
        statistics: Optional[Dict[str, Any]] = None,
        tracker: Optional[VersionTracker] = None,
    ):
        try:
            from jinja2 import Template
        except ImportError:
            self._export_simple_html(results, output_path, statistics)
            return

        template = Template(HTML_TEMPLATE)

        truncated = [r for r in results if r.is_truncated]
        reason_stats = {}
        for r in truncated:
            label = r.reason.value
            reason_stats[label] = reason_stats.get(label, 0) + 1

        max_reason_count = max(reason_stats.values()) if reason_stats else 0

        version_changes = []
        if tracker:
            version_changes = tracker.get_changed_records()

        avg_tokens = int(sum(r.token_count for r in results) / len(results)) if results else 0

        html_content = template.render(
            generate_time=datetime.now().strftime("%Y年%m月%d日 %H:%M:%S"),
            total_records=len(results),
            truncated_count=len(truncated),
            truncation_rate=f"{(len(truncated) / len(results) * 100):.1f}%" if results else "0%",
            avg_tokens=avg_tokens,
            reason_stats=dict(sorted(reason_stats.items(), key=lambda x: -x[1])),
            max_reason_count=max_reason_count,
            records=[r.to_dict() for r in results],
            version_changes=version_changes,
        )

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

    def _export_simple_html(
        self,
        results: List[AuditResult],
        output_path: str,
        statistics: Optional[Dict[str, Any]],
    ):
        html_parts = [
            "<!DOCTYPE html><html><head><meta charset='UTF-8'>",
            "<title>长上下文截断审计报告</title>",
            "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4472C4;color:white}.truncated{color:#c0392b;font-weight:bold}</style>",
            "</head><body>",
            f"<h1>长上下文截断审计报告</h1>",
            f"<p>生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>",
            f"<p>总记录数：{len(results)}，截断记录数：{sum(1 for r in results if r.is_truncated)}</p>",
            "<h2>详细记录</h2><table>",
            "<tr><th>记录编号</th><th>是否截断</th><th>截断原因</th><th>原因说明</th><th>数据来源</th></tr>",
        ]

        for r in results:
            html_parts.append(
                f"<tr><td>{r.record_id}</td>"
                f"<td class='truncated'>{'是' if r.is_truncated else '否'}</td>"
                f"<td>{r.reason.value}</td>"
                f"<td>{r.reason_detail}</td>"
                f"<td>{r.source}</td></tr>"
            )

        html_parts.append("</table></body></html>")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(html_parts))
