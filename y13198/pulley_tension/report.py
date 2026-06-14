import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from .analyzer import AttributionResult, RecordStatus


class ReportGenerator:
    def __init__(self, title: str = "滑轮组张力误差归因报告"):
        self.title = title

    def generate_html(
        self,
        result: AttributionResult,
        output_path: str,
        meta: Optional[dict] = None,
    ) -> None:
        html = self._build_html(result, meta)
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

    def _build_html(self, result: AttributionResult, meta: Optional[dict]) -> str:
        summary = result.summary
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        batch_id = meta.get("batch_id", "未知批次") if meta else "未知批次"
        site_name = meta.get("site_name", "未知站点") if meta else "未知站点"
        inspector = meta.get("inspector", "") if meta else ""

        processed_count = len(result.processed_records)
        pending_count = len(result.pending_records)
        manual_count = len(result.manual_records)

        unit_issues_dicts = [u.to_dict() for u in result.unit_issues]
        direction_issues_dicts = [d.to_dict() for d in result.direction_issues]
        boundary_dicts = [b.to_dict() for b in result.boundary_samples]

        unit_issues_html = self._render_unit_issues(unit_issues_dicts)
        direction_issues_html = self._render_direction_issues(direction_issues_dicts)
        boundary_html = self._render_boundary_samples(boundary_dicts)
        formulas_html = self._render_formulas(result.formulas)
        processed_html = self._render_record_list(result.processed_records, "processed")
        pending_html = self._render_record_list(result.pending_records, "pending")
        manual_html = self._render_record_list(result.manual_records, "manual")

        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{self.title}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f0f2f5;
    color: #1f2937;
    padding: 24px;
    line-height: 1.6;
  }}
  .report-container {{
    max-width: 1100px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    overflow: hidden;
  }}
  .report-header {{
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    color: white;
    padding: 28px 32px;
  }}
  .report-header h1 {{
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }}
  .report-header .subtitle {{
    font-size: 14px;
    opacity: 0.85;
  }}
  .report-header .meta-row {{
    display: flex;
    gap: 24px;
    margin-top: 16px;
    font-size: 13px;
    opacity: 0.9;
  }}
  .report-header .meta-item {{
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .report-body {{
    padding: 24px 32px;
  }}
  .summary-section {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }}
  .summary-card {{
    background: #f8fafc;
    border-radius: 8px;
    padding: 18px;
    border-left: 4px solid #3b82f6;
  }}
  .summary-card.total {{ border-left-color: #1e3a5f; }}
  .summary-card.normal {{ border-left-color: #10b981; }}
  .summary-card.issue {{ border-left-color: #f59e0b; }}
  .summary-card.pending {{ border-left-color: #ef4444; }}
  .summary-card .label {{
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 6px;
  }}
  .summary-card .value {{
    font-size: 28px;
    font-weight: 600;
    color: #1f2937;
  }}
  .summary-card .unit {{
    font-size: 12px;
    color: #9ca3af;
    margin-left: 4px;
  }}
  .section {{
    margin-bottom: 28px;
  }}
  .section-title {{
    font-size: 17px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .section-title .badge {{
    font-size: 12px;
    font-weight: 500;
    padding: 2px 10px;
    border-radius: 12px;
    background: #e5e7eb;
    color: #4b5563;
  }}
  .section-title .badge.success {{ background: #d1fae5; color: #065f46; }}
  .section-title .badge.warning {{ background: #fef3c7; color: #92400e; }}
  .section-title .badge.danger {{ background: #fee2e2; color: #991b1b; }}
  .section-title .badge.info {{ background: #dbeafe; color: #1e40af; }}

  .status-tabs {{
    display: flex;
    gap: 0;
    margin-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
  }}
  .status-tab {{
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }}
  .status-tab.active {{
    color: #1e3a5f;
    border-bottom-color: #1e3a5f;
  }}
  .status-tab .count {{
    display: inline-block;
    min-width: 22px;
    text-align: center;
    padding: 0 6px;
    font-size: 12px;
    border-radius: 10px;
    background: #e5e7eb;
    color: #4b5563;
    margin-left: 6px;
  }}
  .status-tab.active .count {{
    background: #1e3a5f;
    color: white;
  }}
  .tab-panel {{
    display: none;
  }}
  .tab-panel.active {{
    display: block;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }}
  th {{
    text-align: left;
    padding: 10px 12px;
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }}
  td {{
    padding: 10px 12px;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
  }}
  tr:hover td {{
    background: #f9fafb;
  }}
  .tag {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }}
  .tag-processed {{ background: #d1fae5; color: #065f46; }}
  .tag-pending {{ background: #fef3c7; color: #92400e; }}
  .tag-manual {{ background: #fee2e2; color: #991b1b; }}
  .tag-normal {{ background: #dbeafe; color: #1e40af; }}
  .tag-unit {{ background: #ede9fe; color: #5b21b6; }}
  .tag-direction {{ background: #ffedd5; color: #9a3412; }}
  .tag-boundary {{ background: #d1fae5; color: #047857; }}

  .issue-card {{
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }}
  .issue-card .issue-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }}
  .issue-card .issue-id {{
    font-weight: 600;
    color: #92400e;
    font-size: 14px;
  }}
  .issue-card .issue-line {{
    font-size: 12px;
    color: #9ca3af;
  }}
  .issue-card .issue-desc {{
    font-size: 13px;
    color: #4b5563;
    line-height: 1.5;
  }}
  .issue-card .issue-detail {{
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #fde68a;
    font-size: 12px;
    color: #6b7280;
  }}

  .direction-issue {{
    background: #fff7ed;
    border-color: #fdba74;
  }}
  .direction-issue .issue-id {{
    color: #9a3412;
  }}

  .formula-card {{
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }}
  .formula-card .formula-name {{
    font-weight: 600;
    color: #1e40af;
    font-size: 14px;
    margin-bottom: 6px;
  }}
  .formula-card .formula-expr {{
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    font-size: 14px;
    color: #1e3a5f;
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 8px;
    border: 1px solid #dbeafe;
  }}
  .formula-card .formula-desc {{
    font-size: 13px;
    color: #4b5563;
  }}
  .formula-card .formula-params {{
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
  }}

  .boundary-card {{
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }}
  .boundary-card .boundary-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }}
  .boundary-card .boundary-type {{
    font-weight: 600;
    color: #047857;
  }}
  .boundary-card .boundary-line {{
    font-size: 12px;
    color: #9ca3af;
  }}

  .param-list {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    font-size: 13px;
  }}
  .param-item {{
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
  }}
  .param-item .param-name {{
    color: #6b7280;
  }}
  .param-item .param-value {{
    font-weight: 500;
    color: #1f2937;
    font-family: "SF Mono", monospace;
  }}

  .empty-state {{
    text-align: center;
    padding: 32px;
    color: #9ca3af;
    font-size: 14px;
  }}

  .note-box {{
    background: #f0fdf4;
    border-left: 4px solid #22c55e;
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: 0 8px 8px 0;
    font-size: 13px;
    color: #166534;
  }}
  .note-box .note-title {{
    font-weight: 600;
    margin-bottom: 4px;
  }}

  .legend {{
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    font-size: 12px;
  }}
  .legend-item {{
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .legend-dot {{
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }}

  .footer {{
    text-align: center;
    padding: 16px 32px;
    font-size: 12px;
    color: #9ca3af;
    border-top: 1px solid #f3f4f6;
  }}
</style>
</head>
<body>
<div class="report-container">
  <div class="report-header">
    <h1>🔧 {self.title}</h1>
    <div class="subtitle">滑轮组张力误差自动归因分析 · 现场照片数据整理</div>
    <div class="meta-row">
      <div class="meta-item">📋 批次: {batch_id}</div>
      <div class="meta-item">📍 站点: {site_name}</div>
      <div class="meta-item">👤 现场: {inspector}</div>
      <div class="meta-item">🕐 生成时间: {generated_at}</div>
    </div>
  </div>

  <div class="report-body">
    <div class="note-box">
      <div class="note-title">📌 沟通说明</div>
      <div>本报告由「滑轮组张力误差归因」脚本自动生成，数据来自现场照片整理。已处理记录可直接引用，待补材料需确认后更新，人工改判项请结合现场情况复核。</div>
    </div>

    <div class="summary-section">
      <div class="summary-card total">
        <div class="label">总记录数</div>
        <div class="value">{summary['total_records']}<span class="unit">条</span></div>
      </div>
      <div class="summary-card normal">
        <div class="label">正常记录</div>
        <div class="value">{summary['normal_count']}<span class="unit">条</span></div>
      </div>
      <div class="summary-card issue">
        <div class="label">发现问题</div>
        <div class="value">{summary['unit_issue_count'] + summary['direction_issue_count']}<span class="unit">项</span></div>
      </div>
      <div class="summary-card pending">
        <div class="label">待补材料</div>
        <div class="value">{summary['pending_count']}<span class="unit">条</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        📂 记录分类总览
        <span class="badge info">点击切换</span>
      </div>
      <div class="status-tabs">
        <div class="status-tab active" data-tab="processed" onclick="switchTab('processed')">
          ✅ 已处理 <span class="count">{processed_count}</span>
        </div>
        <div class="status-tab" data-tab="pending" onclick="switchTab('pending')">
          ⏳ 待补材料 <span class="count">{pending_count}</span>
        </div>
        <div class="status-tab" data-tab="manual" onclick="switchTab('manual')">
          ✋ 人工改判 <span class="count">{manual_count}</span>
        </div>
      </div>

      <div class="tab-panel active" id="tab-processed">
        {processed_html if result.processed_records else '<div class="empty-state">暂无已处理记录</div>'}
      </div>
      <div class="tab-panel" id="tab-pending">
        {pending_html if result.pending_records else '<div class="empty-state">暂无待补材料</div>'}
      </div>
      <div class="tab-panel" id="tab-manual">
        {manual_html if result.manual_records else '<div class="empty-state">暂无人工作改判记录</div>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        🔢 单位换算问题
        <span class="badge warning">{len(result.unit_issues)} 项</span>
      </div>
      {unit_issues_html if result.unit_issues else '<div class="empty-state">未检测到单位混写问题</div>'}
    </div>

    <div class="section">
      <div class="section-title">
        ↔️ 方向符号反转
        <span class="badge danger">{len(result.direction_issues)} 项</span>
      </div>
      {direction_issues_html if result.direction_issues else '<div class="empty-state">未检测到方向符号写反</div>'}
    </div>

    <div class="section">
      <div class="section-title">
        📊 边界样本分析
        <span class="badge success">{len(result.boundary_samples)} 个</span>
      </div>
      {boundary_html if result.boundary_samples else '<div class="empty-state">未发现边界样本</div>'}
    </div>

    <div class="section">
      <div class="section-title">
        📐 计算公式与参数
        <span class="badge info">复算参考</span>
      </div>
      {formulas_html}
      <div style="margin-top: 16px;">
        <div class="section-title" style="font-size: 14px; border-bottom: 1px solid #e5e7eb;">
          当前参数配置
        </div>
        <div class="param-list">
          <div class="param-item">
            <span class="param-name">standard_unit (标准单位)</span>
            <span class="param-value">{result.parameters.get('standard_unit', 'N')}</span>
          </div>
          <div class="param-item">
            <span class="param-name">tension_tolerance (张力容差)</span>
            <span class="param-value">{result.parameters.get('tension_tolerance', 0.15)}</span>
          </div>
          <div class="param-item">
            <span class="param-name">unit_confidence_threshold (单位置信度)</span>
            <span class="param-value">{result.parameters.get('unit_confidence_threshold', 0.4)}</span>
          </div>
          <div class="param-item">
            <span class="param-name">direction_confidence_threshold (方向置信度)</span>
            <span class="param-value">{result.parameters.get('direction_confidence_threshold', 0.5)}</span>
          </div>
          <div class="param-item">
            <span class="param-name">boundary_sigma (边界判定倍数)</span>
            <span class="param-value">{result.parameters.get('boundary_sigma', 2.0)}σ</span>
          </div>
          <div class="param-item">
            <span class="param-name">均值 μ</span>
            <span class="param-value">{round(summary.get('mean_tension', 0), 2)} {summary.get('standard_unit', 'N')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    滑轮组张力误差归因系统 · 自动化分析报告 · 参数调档后可重新生成
  </div>
</div>

<script>
function switchTab(tabName) {{
  document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');
}}
</script>
</body>
</html>
"""

    def _render_unit_issues(self, issues: list) -> str:
        cards = []
        for issue in issues:
            cards.append(f"""
            <div class="issue-card">
              <div class="issue-header">
                <span class="issue-id">📏 {issue['record_id']} · 单位混写</span>
                <span class="issue-line">来源行: 第{issue['source_line']}行</span>
              </div>
              <div class="issue-desc">{issue['description']}</div>
              <div class="issue-detail">
                原始值: <code>{issue['raw_value']}</code> → 
                标准值: <code>{issue['converted_value']} {issue['standard_unit']}</code> · 
                换算系数: <code>×{round(issue['magnitude_factor'], 4)}</code> · 
                置信度: <code>{round(issue['confidence'] * 100, 1)}%</code>
              </div>
            </div>
            """)
        return "\n".join(cards)

    def _render_direction_issues(self, issues: list) -> str:
        cards = []
        for issue in issues:
            impact = "<br>".join(issue.get("impact_scope", []))
            cards.append(f"""
            <div class="issue-card direction-issue">
              <div class="issue-header">
                <span class="issue-id">↔️ {issue['record_id']} · 方向符号写反</span>
                <span class="issue-line">来源行: 第{issue['source_line']}行</span>
              </div>
              <div class="issue-desc">{issue['description']}</div>
              <div class="issue-detail">
                标注方向: <strong>{issue['declared_direction']}</strong> → 
                实际符号暗示: <strong>{issue['implied_direction']}</strong><br>
                张力值: <code>{issue['tension_value']}</code><br>
                <strong>影响范围:</strong><br>{impact}
              </div>
            </div>
            """)
        return "\n".join(cards)

    def _render_boundary_samples(self, samples: list) -> str:
        cards = []
        for sample in samples:
            cards.append(f"""
            <div class="boundary-card">
              <div class="boundary-header">
                <span class="boundary-type">📈 {sample['record_id']} · {sample['boundary_type']}</span>
                <span class="boundary-line">来源行: 第{sample['source_line']}行</span>
              </div>
              <div class="issue-desc">{sample['reason']}</div>
              <div class="issue-detail">
                <strong>参数敏感性:</strong> {sample['parameter_effect']}
              </div>
            </div>
            """)
        return "\n".join(cards)

    def _render_formulas(self, formulas: list) -> str:
        cards = []
        for f in formulas:
            params = ", ".join(f.get("parameters", []))
            cards.append(f"""
            <div class="formula-card">
              <div class="formula-name">{f['name']}</div>
              <div class="formula-expr">{f['formula']}</div>
              <div class="formula-desc">{f['description']}</div>
              <div class="formula-params">
                示例: {f.get('example', '')}<br>
                关联参数: <code>{params}</code>
              </div>
            </div>
            """)
        return "\n".join(cards)

    def _render_record_list(self, records: list, status_type: str) -> str:
        if not records:
            return '<div class="empty-state">暂无记录</div>'

        status_tag = {
            "processed": "tag-processed",
            "pending": "tag-pending",
            "manual": "tag-manual",
            "normal": "tag-normal",
        }

        rows = []
        for rec in records:
            status = rec.get("status", "")
            tag_class = status_tag.get(status_type, "tag-normal")
            tension_std = rec.get("tension_std", "-")
            unit_orig = rec.get("unit_original", "-")
            notes = rec.get("notes", "-")
            direction = rec.get("direction", "-")
            photo = rec.get("photo_ref", "-")

            rows.append(f"""
            <tr>
              <td><strong>{rec.get('id', '')}</strong></td>
              <td>{rec.get('pulley_name', '-')}</td>
              <td><code>{rec.get('tension', '-')}</code></td>
              <td>{tension_std}</td>
              <td>{unit_orig}</td>
              <td>{direction}</td>
              <td><span class="tag {tag_class}">{status}</span></td>
              <td style="max-width: 200px; font-size: 12px; color: #6b7280;">{notes}</td>
            </tr>
            """)

        return f"""
        <table>
          <thead>
            <tr>
              <th>编号</th>
              <th>滑轮名称</th>
              <th>原始值</th>
              <th>标准值(N)</th>
              <th>原单位</th>
              <th>方向</th>
              <th>状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {''.join(rows)}
          </tbody>
        </table>
        """
