from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Template

from .models import ArchiveResult, LineStatus


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>合唱声部清单归档 - {{ date_str }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
            background: #f5f7fa;
            color: #333;
            padding: 30px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            font-size: 28px;
            color: #1a1a2e;
            margin-bottom: 8px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 24px;
            font-size: 14px;
        }
        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .summary-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a2e;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 16px;
        }
        .stat-item {
            text-align: center;
            padding: 16px 8px;
            background: #f8f9fc;
            border-radius: 8px;
        }
        .stat-number {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .stat-label {
            font-size: 13px;
            color: #666;
        }
        .stat-total .stat-number { color: #1a1a2e; }
        .stat-processed .stat-number { color: #27ae60; }
        .stat-bad .stat-number { color: #e74c3c; }
        .stat-skipped .stat-number { color: #f39c12; }
        .stat-timecode .stat-number { color: #9b59b6; }
        .stat-manual .stat-number { color: #3498db; }

        .section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .section-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1a1a2e;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .section-title .badge {
            font-size: 12px;
            padding: 2px 10px;
            border-radius: 12px;
            font-weight: 500;
        }
        .badge-processed { background: #d5f5e3; color: #27ae60; }
        .badge-bad { background: #fadbd8; color: #e74c3c; }
        .badge-skipped { background: #fdebd0; color: #f39c12; }
        .badge-timecode { background: #ebdef0; color: #9b59b6; }
        .badge-manual { background: #d6eaf8; color: #3498db; }

        .auth-note {
            background: #fef9e7;
            border-left: 4px solid #f39c12;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 14px;
            color: #7d6608;
        }
        .auth-note strong { color: #b7950b; }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fc;
            font-weight: 600;
            color: #555;
            font-size: 13px;
        }
        tr:hover td { background: #fafbfd; }
        .status-tag {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-已处理 { background: #d5f5e3; color: #1e8449; }
        .status-坏行 { background: #fadbd8; color: #c0392b; }
        .status-跳过 { background: #fdebd0; color: #b9770e; }
        .status-时码偏差 { background: #ebdef0; color: #7d3c98; }
        .status-人工改判 { background: #d6eaf8; color: #2471a3; }

        .manual-note {
            font-size: 12px;
            color: #2471a3;
            background: #ebf5fb;
            padding: 4px 8px;
            border-radius: 4px;
            margin-top: 4px;
        }
        .timecode-dev {
            font-size: 12px;
            color: #7d3c98;
            background: #f5eef8;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 6px;
        }
        .original-status {
            font-size: 11px;
            color: #999;
            text-decoration: line-through;
            margin-right: 6px;
        }
        .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>合唱声部清单归档</h1>
        <p class="subtitle">归档日期：{{ date_str }} | 共 {{ result.total }} 条记录</p>

        {% if result.authorization_note %}
        <div class="auth-note">
            <strong>授权备注：</strong>{{ result.authorization_note }}
        </div>
        {% endif %}

        <div class="summary-card">
            <div class="summary-title">归档统计</div>
            <div class="stats-grid">
                <div class="stat-item stat-total">
                    <div class="stat-number">{{ result.total }}</div>
                    <div class="stat-label">总记录</div>
                </div>
                <div class="stat-item stat-processed">
                    <div class="stat-number">{{ result.processed }}</div>
                    <div class="stat-label">已处理</div>
                </div>
                <div class="stat-item stat-bad">
                    <div class="stat-number">{{ result.bad_lines }}</div>
                    <div class="stat-label">坏行</div>
                </div>
                <div class="stat-item stat-skipped">
                    <div class="stat-number">{{ result.skipped_lines }}</div>
                    <div class="stat-label">跳过</div>
                </div>
                <div class="stat-item stat-timecode">
                    <div class="stat-number">{{ result.timecode_off_lines }}</div>
                    <div class="stat-label">时码偏差</div>
                </div>
                <div class="stat-item stat-manual">
                    <div class="stat-number">{{ result.manual_overridden_lines }}</div>
                    <div class="stat-label">人工改判</div>
                </div>
            </div>
        </div>

        {% if result.timecode_off_records %}
        <div class="section">
            <div class="section-title">
                时码偏差记录
                <span class="badge badge-timecode">{{ result.timecode_off_lines }} 条</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>曲目编号</th>
                        <th>声部</th>
                        <th>演唱者</th>
                        <th>时码</th>
                        <th>偏差情况</th>
                        <th>备注</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    {% for p in result.timecode_off_records %}
                    <tr>
                        <td>{{ p.track_no }}</td>
                        <td>{{ p.part_name }}</td>
                        <td>{{ p.singer }}</td>
                        <td>{{ p.timecode }}</td>
                        <td>{{ p.timecode_deviation }}</td>
                        <td>{{ p.remark }}</td>
                        <td>
                            {% if p.is_manual_overridden %}
                            <span class="original-status">{{ p.original_status.value }}</span>
                            {% endif %}
                            <span class="status-tag status-{{ p.status.value }}">{{ p.status.value }}</span>
                            {% if p.manual_note %}
                            <div class="manual-note">人工改判：{{ p.manual_note }}</div>
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        {% if result.manual_overridden_records %}
        <div class="section">
            <div class="section-title">
                人工改判记录
                <span class="badge badge-manual">{{ result.manual_overridden_lines }} 条</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>曲目编号</th>
                        <th>声部</th>
                        <th>演唱者</th>
                        <th>原状态</th>
                        <th>改判后</th>
                        <th>改判说明</th>
                    </tr>
                </thead>
                <tbody>
                    {% for p in result.manual_overridden_records %}
                    <tr>
                        <td>{{ p.track_no }}</td>
                        <td>{{ p.part_name }}</td>
                        <td>{{ p.singer }}</td>
                        <td><span class="original-status">{{ p.original_status.value }}</span></td>
                        <td><span class="status-tag status-{{ p.status.value }}">{{ p.status.value }}</span></td>
                        <td>{{ p.manual_note }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <div class="section">
            <div class="section-title">
                全部声部清单
                <span class="badge badge-processed">{{ result.processed + result.timecode_off_lines }} 条有效</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>曲目编号</th>
                        <th>声部</th>
                        <th>演唱者</th>
                        <th>时码</th>
                        <th>授权期限</th>
                        <th>备注</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    {% for p in result.parts %}
                    <tr>
                        <td>{{ p.track_no }}</td>
                        <td>{{ p.part_name }}</td>
                        <td>{{ p.singer }}</td>
                        <td>
                            {{ p.timecode }}
                            {% if p.has_timecode_issue %}
                            <span class="timecode-dev">{{ p.timecode_deviation }}</span>
                            {% endif %}
                        </td>
                        <td>{{ p.authorization_period }}</td>
                        <td>{{ p.remark }}</td>
                        <td>
                            {% if p.is_manual_overridden %}
                            <span class="original-status">{{ p.original_status.value }}</span>
                            {% endif %}
                            <span class="status-tag status-{{ p.status.value }}">{{ p.status.value }}</span>
                            {% if p.manual_note %}
                            <div class="manual-note">改判：{{ p.manual_note }}</div>
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>

        {% if result.bad_records %}
        <div class="section">
            <div class="section-title">
                坏行记录
                <span class="badge badge-bad">{{ result.bad_lines }} 条</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>行号</th>
                        <th>曲目编号</th>
                        <th>声部</th>
                        <th>演唱者</th>
                        <th>原因</th>
                    </tr>
                </thead>
                <tbody>
                    {% for r in result.bad_records %}
                    <tr>
                        <td>{{ r.行号 }}</td>
                        <td>{{ r.曲目编号 }}</td>
                        <td>{{ r.声部 }}</td>
                        <td>{{ r.演唱者 }}</td>
                        <td>{{ r.原因 }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        {% if result.skipped_records %}
        <div class="section">
            <div class="section-title">
                跳过记录
                <span class="badge badge-skipped">{{ result.skipped_lines }} 条</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>行号</th>
                        <th>曲目编号</th>
                        <th>声部</th>
                        <th>演唱者</th>
                        <th>原因</th>
                    </tr>
                </thead>
                <tbody>
                    {% for r in result.skipped_records %}
                    <tr>
                        <td>{{ r.行号 }}</td>
                        <td>{{ r.曲目编号 }}</td>
                        <td>{{ r.声部 }}</td>
                        <td>{{ r.演唱者 }}</td>
                        <td>{{ r.原因 }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <div class="footer">
            合唱声部清单归档系统 | 生成时间：{{ datetime_str }}
        </div>
    </div>
</body>
</html>
"""


def generate_html_report(result: ArchiveResult, output_path: str) -> str:
    now = datetime.now()
    template = Template(HTML_TEMPLATE)
    html_content = template.render(
        result=result,
        date_str=now.strftime("%Y年%m月%d日"),
        datetime_str=now.strftime("%Y-%m-%d %H:%M:%S"),
    )

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(html_content, encoding="utf-8")

    return str(output_file)
