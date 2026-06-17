"""HTML 报告生成器

生成单文件 HTML 巡检报告，包含图表+表格+文字说明三者对得上。
- 图表用 matplotlib 生成 base64 嵌入
- 表格保留来源行号可追溯
- 风险分级用颜色标识（绿/黄/红）
- 业务同事视角的总结区
"""

import os
import io
import base64
from datetime import datetime
from typing import Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
import os

_font_candidates = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
]
_available_font = None
for _f in _font_candidates:
    if os.path.exists(_f):
        _available_font = _f
        break

if _available_font:
    try:
        from matplotlib import font_manager
        font_manager.fontManager.addfont(_available_font)
        font_name = font_manager.FontProperties(fname=_available_font).get_name()
        rcParams["font.family"] = [font_name]
    except Exception:
        rcParams["font.family"] = ["DejaVu Sans"]
else:
    rcParams["font.family"] = ["DejaVu Sans"]

rcParams["axes.unicode_minus"] = False

from jinja2 import Template


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>慢查询归因巡检报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f5f7fa;
    color: #1f2937;
    line-height: 1.6;
    padding: 20px;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    margin-bottom: 20px 0;
  }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .header .subtitle { opacity: 0.85; font-size: 14px; }
  .header .meta { margin-top: 12px; font-size: 13px; opacity: 0.75; }

  .section {
    background: white;
    border-radius: 10px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .section h2 {
    font-size: 20px;
    color: #1e3a5f;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section h2 .badge {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 12px;
    background: #e0f2fe;
    color: #0369a1;
    font-weight: normal;
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  .card {
    background: #f8fafc;
    border-radius: 8px;
    padding: 18px;
    text-align: center;
    border-left: 4px solid #3b82f6;
  }
  .card.green { border-left-color: #10b981; }
  .card.yellow { border-left-color: #f59e0b; }
  .card.red { border-left-color: #ef4444; }
  .card .number {
    font-size: 28px;
    font-weight: bold;
    color: #1e3a5f;
  }
  .card .label {
    font-size: 13px;
    color: #6b7280;
    margin-top: 4px;
  }

  .chart-container {
    text-align: center;
    margin: 20px 0;
  }
  .chart-container img {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .chart-caption {
    font-size: 13px;
    color: #6b7280;
    margin-top: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 13px;
  }
  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #374151;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tr:hover { background: #f9fafb; }

  .risk-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .risk-green { background: #d1fae5; color: #065f46; }
  .risk-yellow { background: #fef3c7; color: #92400e; }
  .risk-red { background: #fee2e2; color: #991b1b; }

  .source-ref {
    font-family: "SFMono-Regular, Consolas, monospace;
    font-size: 11px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .sql-text {
    font-family: "SFMono-Regular, Consolas, monospace;
    font-size: 12px;
    background: #f9fafb;
    padding: 8px 12px;
    border-radius: 6px;
    color: #374151;
    word-break: break-all;
    line-height: 1.5;
  }

  .biz-summary {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .biz-summary h3 {
    color: #166534;
    margin-bottom: 10px;
    font-size: 16px;
  }
  .biz-summary .can-use { color: #166534; }
  .biz-summary .need-review { color: #991b1b; }

  .diff-list {
    list-style: none;
    padding: 0;
  }
  .diff-list li {
    padding: 8px 0;
    border-bottom: 1px dashed #e5e7eb;
  }
  .diff-list li:last-child { border-bottom: none; }
  .diff-icon {
    display: inline-block;
    width: 20px;
    text-align: center;
    font-weight: bold;
    margin-right: 8px;
  }
  .diff-add { color: #10b981; }
  .diff-del { color: #ef4444; }
  .diff-mod { color: #f59e0b; }

  .source-files {
    font-size: 12px;
    color: #6b7280;
    background: #f9fafb;
    padding: 12px 16px;
    border-radius: 6px;
    margin-top: 12px;
  }
  .source-files div { margin: 4px 0; }
  .source-files strong { color: #374151; }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
  }
  .tab {
    padding: 10px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
  }
  .tab.active {
    color: #1e3a5f;
    border-bottom-color: #3b82f6;
    font-weight: 600;
  }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  .note {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    margin: 12px 0;
    font-size: 13px;
    border-radius: 0 6px 6px 0;
  }

  details {
    margin: 8px 0;
  }
  summary {
    cursor: pointer;
    padding: 8px 0;
    font-weight: 500;
    color: #1e3a5f;
  }
  summary:hover { color: #3b82f6; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 768px) {
    .two-col { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>🔍 慢查询归因巡检报告</h1>
    <div class="subtitle">仓储系统慢查询日志分析 · Schema 对比 · 迁移状态 · 备份校验</div>
    <div class="meta">
      生成时间：{{ generated_at }} · 巡检范围：{{ scope_desc }}
    </div>
  </div>

  <div class="biz-summary">
    <h3>📋 业务同事快速查看</h3>
    <p>
      本次共巡检 <strong>{{ analysis.total }}</strong> 条慢查询，其中：
      <span class="can-use"><strong>{{ analysis.green_count }}</strong> 条可直接使用</span>（绿色标记），
      <span class="need-review"><strong>{{ analysis.red_count }}</strong> 条需工程师复核</span>（红色标记），
      <strong>{{ analysis.yellow_count }}</strong> 条建议关注（黄色标记）。
    </p>
    <p style="margin-top:8px;font-size:13px;color:#6b7280;">
      💡 红色标记的查询建议找仓储系统工程师确认后再使用，绿色标记可直接用于业务分析。
    </p>
  </div>

  <div class="section">
    <h2>📊 总览 <span class="badge">概览数据</span></h2>
    <div class="summary-cards">
      <div class="card">
        <div class="number">{{ analysis.total }}</div>
        <div class="label">慢查询总数</div>
      </div>
      <div class="card green">
        <div class="number">{{ analysis.green_count }}</div>
        <div class="label">可直接使用</div>
      </div>
      <div class="card yellow">
        <div class="number">{{ analysis.yellow_count }}</div>
        <div class="label">建议关注</div>
      </div>
      <div class="card red">
        <div class="number">{{ analysis.red_count }}</div>
        <div class="label">需工程师复核</div>
      </div>
    </div>

    <div class="two-col">
      <div class="chart-container">
        <img src="data:image/png;base64,{{ charts.risk_pie }}" alt="风险分布饼图">
        <div class="chart-caption">图1：慢查询风险等级分布</div>
      </div>
      <div class="chart-container">
        <img src="data:image/png;base64,{{ charts.time_dist }}" alt="耗时分布">
        <div class="chart-caption">图2：查询耗时分布（秒）</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🐢 Top {{ top_n }} 慢查询 <span class="badge">按耗时排序</span></h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
      下表按查询耗时从高到低排列，点击 SQL 可查看完整语句。来源列可定位到原始日志行号。
    </p>
    <table>
      <thead>
        <tr>
          <th style="width:50px;">#</th>
          <th style="width:90px;">风险</th>
          <th>SQL 摘要</th>
          <th style="width:90px;">耗时(s)</th>
          <th style="width:100px;">扫描行</th>
          <th style="width:80px;">返回行</th>
          <th style="width:180px;">来源</th>
        </tr>
      </thead>
      <tbody>
        {% for item in top_queries %}
        <tr>
          <td>{{ loop.index }}</td>
          <td><span class="risk-tag risk-{{ item.risk_level }}">
            {% if item.risk_level == 'green' %}可直接用
            {% elif item.risk_level == 'yellow' %}建议关注
            {% else %}需复核{% endif %}
          </span></td>
          <td>
            <details>
              <summary>{{ item.sql_summary }}</summary>
              <div class="sql-text" style="margin-top:8px;">{{ item.entry.sql_text }}</div>
            </details>
          </td>
          <td><strong>{{ "%.2f"|format(item.entry.query_time) }}</strong></td>
          <td>{{ item.entry.rows_examined }}</td>
          <td>{{ item.entry.rows_sent }}</td>
          <td><span class="source-ref">{{ item.source_ref }}</span></td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>🔑 索引失效分析 <span class="badge">归因分析</span></h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
      分析慢查询的索引失效原因，为优化提供方向。
    </p>

    <div class="chart-container">
      <img src="data:image/png;base64,{{ charts.index_bar }}" alt="索引失效原因统计" style="max-width:700px;">
      <div class="chart-caption">图3：索引失效原因分布</div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="switchTab('tab-red', this)">需复核 ({{ analysis.red_count }})</div>
      <div class="tab" onclick="switchTab('tab-yellow', this)">建议关注 ({{ analysis.yellow_count }})</div>
      <div class="tab" onclick="switchTab('tab-green', this)">可直接用 ({{ analysis.green_count }})</div>
    </div>

    <div id="tab-red" class="tab-content active">
      {% if analysis.red %}
      <table>
        <thead>
          <tr>
            <th>SQL 摘要</th>
            <th>风险原因</th>
            <th>优化建议</th>
            <th>涉及表</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          {% for item in analysis.red %}
          <tr>
            <td>
              <details>
                <summary>{{ item.sql_summary }}</summary>
                <div class="sql-text" style="margin-top:8px;">{{ item.entry.sql_text }}</div>
              </details>
            </td>
            <td>
              <ul style="padding-left:18px;font-size:12px;color:#991b1b;">
                {% for r in item.risk_reasons %}
                <li>{{ r }}</li>
                {% endfor %}
              </ul>
            </td>
            <td>
              <ul style="padding-left:18px;font-size:12px;color:#6b7280;">
                {% for s in item.suggestions %}
                <li>{{ s }}</li>
                {% endfor %}
              </ul>
            </td>
            <td>{{ ", ".join(item.tables_involved) if item.tables_involved else "-" }}</td>
            <td><span class="source-ref">{{ item.source_ref }}</span></td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
      {% else %}
      <p style="color:#6b7280;text-align:center;padding:20px;">暂无需工程师复核的查询 🎉</p>
      {% endif %}
    </div>

    <div id="tab-yellow" class="tab-content">
      {% if analysis.yellow %}
      <table>
        <thead>
          <tr>
            <th>SQL 摘要</th>
            <th>风险原因</th>
            <th>优化建议</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          {% for item in analysis.yellow %}
          <tr>
            <td>
              <details>
                <summary>{{ item.sql_summary }}</summary>
                <div class="sql-text" style="margin-top:8px;">{{ item.entry.sql_text }}</div>
              </details>
            </td>
            <td>
              <ul style="padding-left:18px;font-size:12px;color:#92400e;">
                {% for r in item.risk_reasons %}
                <li>{{ r }}</li>
                {% endfor %}
              </ul>
            </td>
            <td>
              <ul style="padding-left:18px;font-size:12px;color:#6b7280;">
                {% for s in item.suggestions %}
                <li>{{ s }}</li>
                {% endfor %}
              </ul>
            </td>
            <td><span class="source-ref">{{ item.source_ref }}</span></td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
      {% else %}
      <p style="color:#6b7280;text-align:center;padding:20px;">暂无建议关注的查询</p>
      {% endif %}
    </div>

    <div id="tab-green" class="tab-content">
      {% if analysis.green %}
      <table>
        <thead>
          <tr>
            <th>SQL 摘要</th>
            <th>耗时(s)</th>
            <th>涉及表</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          {% for item in analysis.green %}
          <tr>
            <td>
              <details>
                <summary>{{ item.sql_summary }}</summary>
                <div class="sql-text" style="margin-top:8px;">{{ item.entry.sql_text }}</div>
              </details>
            </td>
            <td>{{ "%.2f"|format(item.entry.query_time) }}</td>
            <td>{{ ", ".join(item.tables_involved) if item.tables_involved else "-" }}</td>
            <td><span class="source-ref">{{ item.source_ref }}</span></td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
      {% else %}
      <p style="color:#6b7280;text-align:center;padding:20px;">暂无可直接使用的查询</p>
      {% endif %}
    </div>
  </div>

  <div class="section">
    <h2>📐 Schema 对比 <span class="badge">基线 vs 当前</span></h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
      对比基线 Schema 与当前 Schema 的差异，追踪表结构变更。
    </p>

    <div class="summary-cards">
      <div class="card" style="border-left-color:#10b981;">
        <div class="number">{{ diff.added_tables|length }}</div>
        <div class="label">新增表</div>
      </div>
      <div class="card" style="border-left-color:#ef4444;">
        <div class="number">{{ diff.removed_tables|length }}</div>
        <div class="label">删除表</div>
      </div>
      <div class="card" style="border-left-color:#f59e0b;">
        <div class="number">{{ diff.modified_tables|length }}</div>
        <div class="label">结构变更</div>
      </div>
      <div class="card">
        <div class="number">{{ diff.total_changes }}</div>
        <div class="label">总变更数</div>
      </div>
    </div>

    {% if diff.added_tables or diff.removed_tables or diff.modified_tables %}
    <h3 style="margin:16px 0 10px;font-size:15px;">详细变更</h3>
    <ul class="diff-list">
      {% for t in diff.added_tables %}
      <li>
        <span class="diff-icon diff-add">+</span>
        <strong>{{ t.table_name }}</strong>
        <span style="color:#6b7280;font-size:12px;">新增表</span>
        <span class="source-ref" style="margin-left:8px;">当前 Schema L{{ t.source_new_line }}</span>
      </li>
      {% endfor %}
      {% for t in diff.removed_tables %}
      <li>
        <span class="diff-icon diff-del">-</span>
        <strong>{{ t.table_name }}</strong>
        <span style="color:#6b7280;font-size:12px;">删除表</span>
        <span class="source-ref" style="margin-left:8px;">基线 L{{ t.source_old_line }}</span>
      </li>
      {% endfor %}
      {% for t in diff.modified_tables %}
      <li>
        <span class="diff-icon diff-mod">~</span>
        <strong>{{ t.table_name }}</strong>
        <span style="color:#6b7280;font-size:12px;">
          {{ t.column_diffs|length }} 字段变更 · {{ t.index_diffs|length }} 索引变更
        </span>
        <details style="margin-left:28px;margin-top:4px;">
          <summary>查看详情</summary>
          <div style="padding:8px 0;font-size:12px;">
            {% for cd in t.column_diffs %}
            <div style="padding:2px 0;">
              {% if cd.change_type == 'added' %}
              <span class="diff-icon diff-add">+</span>字段 {{ cd.column_name }} ({{ cd.new_value }})
              {% elif cd.change_type == 'removed' %}
              <span class="diff-icon diff-del">-</span>字段 {{ cd.column_name }} ({{ cd.old_value }})
              {% else %}
              <span class="diff-icon diff-mod">~</span>字段 {{ cd.column_name }}:
              {% for d in cd.details %}{{ d }}{% if not loop.last %}; {% endif %}{% endfor %}
              {% endif %}
            </div>
            {% endfor %}
            {% for idx in t.index_diffs %}
            <div style="padding:2px 0;">
              {% if idx.change_type == 'added' %}
              <span class="diff-icon diff-add">+</span>索引 {{ idx.index_name }} ({{ idx.new_columns|join(', ') }})
              {% elif idx.change_type == 'removed' %}
              <span class="diff-icon diff-del">-</span>索引 {{ idx.index_name }} ({{ idx.old_columns|join(', ') }})
              {% else %}
              <span class="diff-icon diff-mod">~</span>索引 {{ idx.index_name }}:
              {{ idx.old_columns|join(', ') }} → {{ idx.new_columns|join(', ') }}
              {% endif %}
            </div>
            {% endfor %}
          </div>
        </details>
      </li>
      {% endfor %}
    </ul>
    {% else %}
    <p style="color:#10b981;text-align:center;padding:20px;">Schema 无差异 ✅</p>
    {% endif %}

    <div class="source-files">
      <div><strong>基线 Schema：</strong>{{ source_files.schema_baseline }}</div>
      <div><strong>当前 Schema：</strong>{{ source_files.schema_current }}</div>
    </div>
  </div>

  {% if migration %}
  <div class="section">
    <h2>🚀 迁移状态 <span class="badge">迁移脚本执行状态</span></h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
      检查迁移脚本与当前 Schema 的对应关系。
    </p>

    <div class="summary-cards">
      <div class="card green">
        <div class="number">{{ migration.applied_count }}</div>
        <div class="label">已执行</div>
      </div>
      <div class="card yellow">
        <div class="number">{{ migration.pending_count }}</div>
        <div class="label">待执行</div>
      </div>
      <div class="card red">
        <div class="number">{{ migration.failed_count }}</div>
        <div class="label">异常</div>
      </div>
      <div class="card">
        <div class="number">{{ migration.total_migrations }}</div>
        <div class="label">总脚本数</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:80px;">版本</th>
          <th>描述</th>
          <th style="width:80px;">状态</th>
          <th style="width:80px;">置信度</th>
          <th>证据</th>
          <th style="width:200px;">脚本文件</th>
        </tr>
      </thead>
      <tbody>
        {% for s in migration.all_statuses %}
        <tr>
          <td><strong>{{ s.script.version }}</strong></td>
          <td>{{ s.script.description }}</td>
          <td>
            {% if s.status == 'applied' %}
          <span class="risk-tag risk-green">已执行</span>
            {% elif s.status == 'pending' %}
          <span class="risk-tag risk-yellow">待执行</span>
            {% else %}
          <span class="risk-tag risk-red">异常</span>
            {% endif %}
          </td>
          <td>{{ "%.0f%%"|format(s.confidence * 100) }}</td>
          <td style="font-size:12px;color:#6b7280;">
            {{ s.evidence|join('; ') }}
          </td>
          <td><span class="source-ref">{{ s.script.file_name }}</span></td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <div class="source-files">
      <div><strong>迁移脚本目录：</strong>{{ source_files.migrations }}</div>
    </div>
  </div>
  {% endif %}

  {% if backup %}
  <div class="section">
    <h2>✅ 备份校验 <span class="badge">来源可追溯</span></h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
      校验备份与当前 Schema 的一致性，所有结论可追溯到源文件行号。
    </p>

    <div class="summary-cards">
      <div class="card green">
        <div class="number">{{ backup.match_rate|round(1) }}%</div>
        <div class="label">匹配率</div>
      </div>
      <div class="card">
        <div class="number">{{ backup.backup_table_count }}</div>
        <div class="label">备份表数</div>
      </div>
      <div class="card">
        <div class="number">{{ backup.current_table_count }}</div>
        <div class="label">当前表数</div>
      </div>
      <div class="card {% if backup.can_trust %}green{% else %}red{% endif %}">
        <div class="number">{% if backup.can_trust %}通过{% else %}不通过{% endif %}</div>
        <div class="label">校验结论</div>
      </div>
    </div>

    {% if backup.mismatched_tables %}
    <h3 style="margin:16px 0 10px;font-size:15px;">存在差异的表</h3>
    <ul class="diff-list">
      {% for t in backup.mismatched_tables %}
      <li>
        <span class="diff-icon diff-mod">⚠</span>
        <strong>{{ t.table_name }}</strong>
        <span style="color:#6b7280;font-size:12px;">
          字段匹配 {{ t.matched_columns }}/{{ t.total_columns }} ·
          索引匹配 {{ t.matched_indexes }}/{{ t.total_indexes }}
        </span>
        <details style="margin-left:28px;margin-top:4px;">
          <summary>查看差异详情</summary>
          <div style="padding:8px 0;font-size:12px;color:#6b7280;">
            {% for d in t.details %}
            <div style="padding:2px 0;">• {{ d }}</div>
            {% endfor %}
          </div>
        </details>
        <div style="margin-left:28px;margin-top:4px;font-size:11px;color:#9ca3af;">
          备份: <span class="source-ref">{{ t.backup_source }}</span>
          当前: <span class="source-ref">{{ t.current_source }}</span>
        </div>
      </li>
      {% endfor %}
    </ul>
    {% endif %}

    {% if backup.missing_in_backup %}
    <h3 style="margin:16px 0 10px;font-size:15px;">备份中缺失的表</h3>
    <ul class="diff-list">
      {% for t in backup.missing_in_backup %}
      <li>
        <span class="diff-icon diff-del">?</span>
        <strong>{{ t.table_name }}</strong>
        <span style="color:#6b7280;font-size:12px;">当前 Schema 有，备份中没有</span>
        <span class="source-ref" style="margin-left:8px;">{{ t.current_source }}</span>
      </li>
      {% endfor %}
    </ul>
    {% endif %}

    <div class="source-files">
      <div><strong>备份文件：</strong>{{ backup.backup_file }}</div>
      <div><strong>当前文件：</strong>{{ backup.current_file }}</div>
    </div>

    <div class="note">
      💡 备份校验结论可追溯：每条差异都标注了源文件和行号，需要核对时可直接定位到具体行。
    </div>
  </div>
  {% endif %}

  <div class="section">
    <h2>📝 巡检结论 <span class="badge">总结说明</span></h2>

    <h3 style="font-size:15px;margin:12px 0 8px;">给业务同事</h3>
    <ul style="padding-left:20px;font-size:14px;">
      <li><span class="risk-tag risk-green">绿色</span> 标记的查询结果可直接用于业务分析</li>
      <li><span class="risk-tag risk-red">红色</span> 标记的查询请先找仓储系统工程师确认后再使用</li>
      <li>Schema 变更和迁移状态如无红色标记，说明结构稳定</li>
    </ul>

    <h3 style="font-size:15px;margin:16px 0 8px;">给仓储系统工程师</h3>
    <ul style="padding-left:20px;font-size:14px;">
      <li>所有条目均保留了原始日志行号，来源可追溯</li>
      <li>索引失效分析为静态分析结果，最终结论请结合执行计划确认</li>
      <li>迁移状态为推断结果，以实际执行记录为准</li>
      <li>备份校验匹配率 ≥ 90% 认为通过</li>
    </ul>

    <div class="source-files" style="margin-top:16px;">
      <div style="font-weight:bold;margin-bottom:4px;">数据来源：</div>
      <div>• 慢查询日志：{{ source_files.slow_log }}</div>
      <div>• 基线 Schema：{{ source_files.schema_baseline }}</div>
      <div>• 当前 Schema：{{ source_files.schema_current }}</div>
      {% if source_files.migrations %}<div>• 迁移脚本：{{ source_files.migrations }}</div>{% endif %}
      {% if source_files.backup_schema %}<div>• 备份 Schema：{{ source_files.backup_schema }}</div>{% endif %}
    </div>
  </div>

</div>

<script>
function switchTab(tabId, elem) {
  document.querySelectorAll('.tab-content').forEach(function(el) {
    el.classList.remove('active');
  });
  document.querySelectorAll('.tab').forEach(function(el) {
    el.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  elem.classList.add('active');
}
</script>

</body>
</html>
"""


class HtmlReporter:
    """HTML 报告生成器"""

    def generate(
        self,
        output_path: str,
        slow_queries: list,
        analysis_result: dict,
        diff_result: dict,
        migration_result: Optional[dict] = None,
        backup_result: Optional[dict] = None,
        source_files: Optional[dict] = None,
        top_n: int = 20,
    ):
        charts = self._generate_charts(analysis_result, slow_queries)

        top_queries = analysis_result["top_by_time"][:top_n]

        scope_desc = f"{len(slow_queries)} 条慢查询 · "
        scope_desc += f"{diff_result['total_changes']} 项 Schema 变更"
        if migration_result:
            scope_desc += f" · {migration_result['total_migrations']} 个迁移脚本"
        if backup_result:
            scope_desc += f" · 备份校验"

        template = Template(HTML_TEMPLATE)
        html = template.render(
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            scope_desc=scope_desc,
            analysis=analysis_result,
            diff=diff_result,
            migration=migration_result,
            backup=backup_result,
            charts=charts,
            top_queries=top_queries,
            source_files=source_files or {},
            top_n=top_n,
        )

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

    def _generate_charts(self, analysis_result: dict, slow_queries: list) -> dict:
        charts = {}
        charts["risk_pie"] = self._risk_pie_chart(analysis_result)
        charts["time_dist"] = self._time_distribution_chart(slow_queries)
        charts["index_bar"] = self._index_risk_bar_chart(analysis_result)
        return charts

    def _risk_pie_chart(self, analysis_result: dict) -> str:
        labels = ["可直接使用", "建议关注", "需工程师复核"]
        sizes = [
            analysis_result["green_count"],
            analysis_result["yellow_count"],
            analysis_result["red_count"],
        ]
        colors = ["#10b981", "#f59e0b", "#ef4444"]

        fig, ax = plt.subplots(figsize=(6, 5))
        sum_sizes = sum(sizes)
        if sum_sizes > 0:
            wedges, texts, autotexts = ax.pie(
                sizes,
                labels=labels,
                colors=colors,
                autopct="%1.1f%%",
                startangle=90,
                wedgeprops=dict(width=0.5, edgecolor="white"),
                textprops=dict(fontsize=11),
            )
            for autotext in autotexts:
                autotext.set_color("white")
                autotext.set_fontsize(10)
                autotext.set_fontweight("bold")
        else:
            ax.text(0.5, 0.5, "无数据", ha="center", va="center")

        ax.set_title("风险等级分布", fontsize=14, fontweight="bold", pad=15)
        ax.axis("equal")

        return self._fig_to_base64(fig)

    def _time_distribution_chart(self, slow_queries: list) -> str:
        times = [q.query_time for q in slow_queries]

        fig, ax = plt.subplots(figsize=(7, 5))
        if times:
            bins = [0, 1, 2, 5, 10, 30, 60, float("inf")]
            labels = ["0-1s", "1-2s", "2-5s", "5-10s", "10-30s", "30-60s", "60s+"]
            counts = [0] * len(labels)
            for t in times:
                for i in range(len(bins) - 1):
                    if bins[i] <= t < bins[i + 1]:
                        counts[i] += 1
                        break

            bars = ax.bar(range(len(labels)), counts, color="#3b82f6", edgecolor="white")
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(labels, rotation=0, fontsize=10)
            ax.set_ylabel("查询数量", fontsize=11)
            ax.set_title("查询耗时分布", fontsize=14, fontweight="bold", pad=15)
            ax.grid(axis="y", alpha=0.3)

            for bar, count in zip(bars, counts):
                if count > 0:
                    height = bar.get_height()
                    ax.text(
                        bar.get_x() + bar.get_width() / 2.,
                        height,
                        str(count),
                        ha="center",
                        va="bottom",
                        fontsize=10,
                    )
        else:
            ax.text(0.5, 0.5, "无数据", ha="center", va="center", transform=ax.transAxes)

        plt.tight_layout()
        return self._fig_to_base64(fig)

    def _index_risk_bar_chart(self, analysis_result: dict) -> str:
        reason_counts = {}
        all_analyses = analysis_result.get("all", [])

        for analysis in all_analyses:
            for reason in analysis.risk_reasons:
                key = self._shorten_reason(reason)
                reason_counts[key] = reason_counts.get(key, 0) + 1

        fig, ax = plt.subplots(figsize=(9, 5))
        if reason_counts:
            sorted_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)
            labels = [r[0] for r in sorted_reasons]
            counts = [r[1] for r in sorted_reasons]

            colors = []
            for label in labels:
                if "索引失效" in label or "全表扫描" in label:
                    colors.append("#ef4444")
                elif "扫描" in label:
                    colors.append("#f59e0b")
                else:
                    colors.append("#3b82f6")

            bars = ax.barh(range(len(labels)), counts, color=colors, edgecolor="white")
            ax.set_yticks(range(len(labels)))
            ax.set_yticklabels(labels, fontsize=10)
            ax.set_xlabel("出现次数", fontsize=11)
            ax.set_title("索引失效/风险原因分布", fontsize=14, fontweight="bold", pad=15)
            ax.grid(axis="x", alpha=0.3)
            ax.invert_yaxis()

            for bar, count in zip(bars, counts):
                ax.text(
                    bar.get_width() + 0.1,
                    bar.get_y() + bar.get_height() / 2,
                    str(count),
                    va="center",
                    fontsize=10,
                )
        else:
            ax.text(0.5, 0.5, "无索引失效风险", ha="center", va="center", transform=ax.transAxes, fontsize=12, color="#10b981")

        plt.tight_layout()
        return self._fig_to_base64(fig)

    def _shorten_reason(self, reason: str) -> str:
        if "扫描效率极低" in reason:
            return "扫描效率低"
        if "查询耗时较长" in reason:
            return "查询耗时长"
        if "扫描行数过大" in reason:
            return "扫描行数大"
        if "LIKE" in reason:
            return "LIKE前缀通配索引失效"
        if "函数" in reason:
            return "对索引列使用函数"
        if "全表扫描" in reason:
            return "无WHERE条件全表扫描"
        if "前缀不匹配" in reason:
            return "WHERE列与索引前缀不匹配"
        if "OR" in reason:
            return "OR条件可能索引失效"
        if "NOT IN" in reason:
            return "NOT IN可能索引失效"
        return reason[:20]

    def _fig_to_base64(self, fig) -> str:
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return img_base64
