import os
import json
from typing import Dict
from datetime import datetime
from jinja2 import Template
from sqlalchemy.orm import Session
from var_backtest.reporting import build_operator_report, classify_anomalies


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT_DIR = os.path.join(BASE_DIR, "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


REPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>风险价值分位回测报告 - {{ batch_id }}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1e293b; }
  h1 { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
  h2 { margin: 32px 0 16px; font-size: 18px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  h3 { margin: 16px 0 8px; font-size: 15px; color: #334155; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .summary-card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .summary-card .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
  .summary-card .value { font-size: 24px; font-weight: 600; color: #0f172a; }
  .summary-card.blocker .value { color: #dc2626; }
  .summary-card.warning .value { color: #f59e0b; }
  .summary-card.success .value { color: #16a34a; }
  .section { background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge.blocker { background: #fee2e2; color: #991b1b; }
  .badge.critical { background: #fed7aa; color: #9a3412; }
  .badge.warning { background: #fef3c7; color: #92400e; }
  .badge.info { background: #dbeafe; color: #1e40af; }
  .badge.success { background: #dcfce7; color: #166534; }
  .badge.action { background: #ede9fe; color: #5b21b6; }
  .explanation { background: #f8fafc; border-left: 3px solid #6366f1; padding: 10px 14px; margin: 8px 0; border-radius: 4px; font-size: 13px; line-height: 1.6; }
  .explanation.blocked { border-left-color: #dc2626; background: #fef2f2; }
  .next-step { background: #ecfdf5; border-left: 3px solid #10b981; padding: 8px 12px; margin-top: 6px; border-radius: 4px; font-size: 12px; color: #065f46; }
  .legend { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .muted { color: #64748b; font-size: 12px; }
</style>
</head>
<body>
<h1>风险价值分位回测报告</h1>
<div class="subtitle">批次: <code>{{ batch_id }}</code> · 生成时间: {{ generated_at }}</div>

<h2>一、总览</h2>
<div class="summary-grid">
  <div class="summary-card success">
    <div class="label">题目总数</div>
    <div class="value">{{ summary.total_questions }}</div>
  </div>
  <div class="summary-card success">
    <div class="label">通过数</div>
    <div class="value">{{ summary.passed }}</div>
  </div>
  <div class="summary-card warning">
    <div class="label">外推模式</div>
    <div class="value">{{ summary.extrapolation_count }}</div>
  </div>
  <div class="summary-card blocker">
    <div class="label">外推越界(拦截)</div>
    <div class="value">{{ summary.extrapolation_breached }}</div>
  </div>
  <div class="summary-card blocker">
    <div class="label">答案不匹配</div>
    <div class="value">{{ summary.answer_mismatch }}</div>
  </div>
  <div class="summary-card warning">
    <div class="label">图表缺失</div>
    <div class="value">{{ summary.chart_missing }}</div>
  </div>
</div>

<h2>二、外推越界说明</h2>
<div class="legend">
  <div class="legend-item"><span class="legend-dot" style="background:#16a34a"></span>样本充足</div>
  <div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>外推但合规</div>
  <div class="legend-item"><span class="legend-dot" style="background:#dc2626"></span>外推越界(已拦截)</div>
</div>

{% if extrapolation_explanations %}
<table>
  <thead>
    <tr>
      <th>题目</th>
      <th>状态</th>
      <th>计算值</th>
      <th>历史答案</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
  {% for item in extrapolation_explanations %}
    <tr>
      <td><code>{{ item.question_external_id }}</code></td>
      <td>
        {% if item.extrapolation_bounds_breached %}
          <span class="badge blocker">外推越界(已拦截)</span>
        {% elif item.is_extrapolation %}
          <span class="badge warning">外推</span>
        {% else %}
          <span class="badge success">正常</span>
        {% endif %}
      </td>
      <td>{{ '%.6f'|format(item.var_value) if item.var_value is not none else '-' }}</td>
      <td>{{ '%.6f'|format(item.historical_var_value) if item.historical_var_value is not none else '-' }}</td>
      <td>
        <div class="explanation {{ 'blocked' if item.extrapolation_bounds_breached else '' }}">
          {{ item.explanation }}
        </div>
        <div class="next-step"><strong>下一步：</strong>{{ item.next_step }}</div>
      </td>
    </tr>
  {% endfor %}
  </tbody>
</table>
{% else %}
<p class="muted">本次回测未触发外推越界。</p>
{% endif %}

<h2>三、待办事项（教研编辑）</h2>
{% if action_items %}
  {% for action in action_items %}
    <div class="section">
      <h3>
        <span class="badge action">{{ action.action_required }}</span>
        共 {{ action.count }} 项
      </h3>
      <p class="muted">{{ action.hint }}</p>
    </div>
  {% endfor %}
{% else %}
<p class="muted">所有校验均通过，无待办事项。</p>
{% endif %}

<h2>四、题目清单变更影响</h2>
{% if question_impact %}
  {% if question_impact.needs_rerun_count > 0 %}
  <div class="section" style="border-left: 4px solid #dc2626;">
    <h3 style="color: #991b1b;">⚠ 需要重新回测的题目（{{ question_impact.needs_rerun_count }} 项）</h3>
    <table>
      <thead><tr><th>题目</th><th>影响类型</th><th>说明</th></tr></thead>
      <tbody>
      {% for item in question_impact.needs_rerun %}
        <tr>
          <td><code>{{ item.question_external_id }}</code></td>
          <td><span class="badge critical">{{ item.impact_type }}</span></td>
          <td>{{ item.description }}</td>
        </tr>
      {% endfor %}
      </tbody>
    </table>
  </div>
  {% endif %}
  {% if question_impact.info_only %}
  <div class="section" style="border-left: 4px solid #3b82f6;">
    <h3 style="color: #1e40af;">ℹ 信息类变更（无需重跑）</h3>
    <table>
      <thead><tr><th>题目</th><th>影响类型</th><th>说明</th></tr></thead>
      <tbody>
      {% for item in question_impact.info_only %}
        <tr>
          <td><code>{{ item.question_external_id }}</code></td>
          <td><span class="badge info">{{ item.impact_type }}</span></td>
          <td>{{ item.description }}</td>
        </tr>
      {% endfor %}
      </tbody>
    </table>
  </div>
  {% endif %}
{% else %}
<p class="muted">无题目清单变更。</p>
{% endif %}

</body>
</html>
"""


def export_html_report(
    db: Session,
    backtest_run_id: int,
    batch_id: str,
) -> Dict:
    operator_report = build_operator_report(db, backtest_run_id)
    anomaly_classification = classify_anomalies(db, backtest_run_id)

    action_items = [
        a for a in anomaly_classification["by_action"]
        if a["count"] > 0 and a["action_required"] != "无需处理"
    ]

    from var_backtest.reporting import build_researcher_dashboard
    dashboard = build_researcher_dashboard(db, backtest_run_id)
    question_impact = dashboard["question_list_impact"]

    template = Template(REPORT_TEMPLATE)
    html = template.render(
        batch_id=batch_id,
        generated_at=operator_report["generated_at"],
        summary=operator_report["summary"],
        extrapolation_explanations=operator_report["extrapolation_explanations"],
        action_items=action_items,
        question_impact=question_impact,
    )

    filename = f"var_report_{batch_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    filepath = os.path.join(EXPORT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    json_path = filepath.replace(".html", ".json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "operator_report": operator_report,
            "anomaly_classification": anomaly_classification,
            "dashboard": dashboard,
        }, f, ensure_ascii=False, indent=2, default=str)

    return {
        "html_path": filepath,
        "json_path": json_path,
        "summary": operator_report["summary"],
    }
