import os
import html
from typing import List

from .models import ProcessedRecord, MaterialStatus, WarningLevel, RunConfig, TerminalSummary


_LEVEL_BG = {
    WarningLevel.NORMAL: "#22c55e",
    WarningLevel.CAUTION: "#facc15",
    WarningLevel.WARNING: "#f97316",
    WarningLevel.CRITICAL: "#ef4444",
}

_LEVEL_TEXT = {
    WarningLevel.NORMAL: "正常",
    WarningLevel.CAUTION: "注意",
    WarningLevel.WARNING: "预警",
    WarningLevel.CRITICAL: "严重",
}

_STATUS_CN = {
    MaterialStatus.PROCESSED: "已处理",
    MaterialStatus.PENDING_SUPPLEMENT: "待补材料",
    MaterialStatus.MANUAL_OVERRIDE: "人工改判",
}

_STATUS_COLOR = {
    MaterialStatus.PROCESSED: "#e0f2fe",
    MaterialStatus.PENDING_SUPPLEMENT: "#fef3c7",
    MaterialStatus.MANUAL_OVERRIDE: "#ede9fe",
}

_STATUS_BORDER = {
    MaterialStatus.PROCESSED: "#0ea5e9",
    MaterialStatus.PENDING_SUPPLEMENT: "#d97706",
    MaterialStatus.MANUAL_OVERRIDE: "#7c3aed",
}


def _group_by_status(records: List[ProcessedRecord]):
    g = {st: [] for st in MaterialStatus}
    for r in records:
        g[r.status].append(r)
    return g


def _card(record: ProcessedRecord, config: RunConfig) -> str:
    lv = record.warning_level
    st = record.status
    badge_bg = _LEVEL_BG[lv]

    ev_html = ""
    if record.extreme_values:
        items = "".join(
            f"<li>{e.timestamp} → <b>{e.value_nm:.1f} N·m</b> @ {e.rpm:.0f}rpm ({e.direction.value})</li>"
            for e in record.extreme_values
        )
        ev_html = f'<div class="ev"><b>⚠ 保留的极端值(不参与平均):</b><ul>{items}</ul></div>'

    bs_html = ""
    if record.boundary_samples:
        items = "".join(
            f"<li>{b.value_nm:.1f} N·m — {html.escape(b.boundary_reason)}</li>"
            for b in record.boundary_samples
        )
        bs_html = f'<div class="bs"><b>▤ 边界样本(±2%阈值):</b><ul>{items}</ul></div>'

    dr_html = ""
    if record.direction_issue:
        dr_html = f'<div class="dr"><b>⇄ 方向异常:</b> {html.escape(record.direction_issue_desc)}</div>'

    formulas_html = "".join(f"<li><code>{html.escape(f)}</code></li>" for f in record.formulas_applied)

    units_html = "".join(f"<tr><td>{k}</td><td>{html.escape(v)}</td></tr>" for k, v in record.units_ref.items())

    note_html = f'<div class="note">{html.escape(record.status_note)}</div>' if record.status_note else ""

    warn_marker = " (人工改判)" if record.override_applied else ""
    crit_marker = " (参数调整)" if abs(config.threshold_adjustment_pct) > 1e-6 else ""
    pct_info = f"{record.effective_warning_threshold_pct:.0f}%{warn_marker}"
    crit_pct = (record.nameplate.critical_threshold_pct + config.threshold_adjustment_pct)

    return f"""
    <div class="card" style="border-left:4px solid {_STATUS_BORDER[st]};">
      <div class="card-header">
        <span class="badge" style="background:{badge_bg};">{_LEVEL_TEXT[lv]}</span>
        <span class="eq-id">{html.escape(record.equipment_id)}</span>
        <span class="model">{html.escape(record.nameplate.model)} · {html.escape(record.nameplate.manufacturer)}</span>
      </div>
      <div class="card-body">
        <div class="grid">
          <div><label>额定扭矩</label><b>{record.nameplate.rated_torque_nm:.1f} N·m</b></div>
          <div><label>峰值扭矩</label><b>{record.peak_torque_nm:.1f} N·m</b> @ {record.peak_torque_rpm:.0f}rpm</div>
          <div><label>预警阈值</label>{record.effective_warning_threshold_nm:.1f} N·m ({pct_info})</div>
          <div><label>严重阈值</label>{record.effective_critical_threshold_nm:.1f} N·m ({crit_pct:.0f}%{crit_marker})</div>
          <div><label>读数条数</label>{len(record.readings)}</div>
          <div><label>出厂</label>{html.escape(record.nameplate.install_date)}</div>
        </div>
        {ev_html}{bs_html}{dr_html}{note_html}
        <details>
          <summary>计算依据 · 公式 · 单位</summary>
          <div class="sect">
            <h5>公式</h5>
            <ul>{formulas_html}</ul>
          </div>
          <div class="sect">
            <h5>单位对照</h5>
            <table>{units_html}</table>
          </div>
        </details>
      </div>
    </div>
    """


def render_page_summary(
    records: List[ProcessedRecord],
    summary: TerminalSummary,
    config: RunConfig,
    output_dir: str,
) -> str:
    groups = _group_by_status(records)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "page_summary.html")

    sections_html = ""
    for st, name in [
        (MaterialStatus.PROCESSED, "已处理 (蓝色)"),
        (MaterialStatus.PENDING_SUPPLEMENT, "待补材料 (琥珀色)"),
        (MaterialStatus.MANUAL_OVERRIDE, "人工改判 (紫色)"),
    ]:
        cards = "".join(_card(r, config) for r in groups[st]) or '<p class="empty">本分区暂无记录</p>'
        sections_html += f"""
        <section class="zone" style="background:{_STATUS_COLOR[st]}; border:2px solid {_STATUS_BORDER[st]};">
          <h2>{name} · {len(groups[st])}台</h2>
          <div class="cards">{cards}</div>
        </section>
        """

    flagged = "、".join(html.escape(x) for x in summary.flagged_records) or "无"

    doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>电机扭矩阈值预警 · 页面摘要</title>
<style>
  body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 24px; background:#f8fafc; color:#0f172a; }}
  h1 {{ margin:0 0 8px; }}
  .sub {{ color:#64748b; margin-bottom:24px; }}
  .overview {{ background:#fff; border-radius:8px; padding:16px 20px; margin-bottom:24px; box-shadow:0 1px 2px rgba(0,0,0,.06); }}
  .stats {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px; }}
  .stat {{ padding:10px 14px; border-radius:6px; background:#f1f5f9; }}
  .stat .k {{ font-size:12px; color:#64748b; }}
  .stat .v {{ font-size:22px; font-weight:700; }}
  .zone {{ border-radius:10px; padding:16px 20px; margin-bottom:20px; }}
  .zone h2 {{ margin:0 0 12px; font-size:18px; }}
  .cards {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(360px,1fr)); gap:14px; }}
  .card {{ background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }}
  .card-header {{ padding:10px 14px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #f1f5f9; }}
  .badge {{ color:#fff; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }}
  .eq-id {{ font-weight:700; }}
  .model {{ color:#64748b; font-size:12px; margin-left:auto; }}
  .card-body {{ padding:12px 14px; }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; margin-bottom:10px; }}
  .grid > div {{ display:flex; justify-content:space-between; font-size:13px; border-bottom:1px dashed #e2e8f0; padding:3px 0; }}
  .grid label {{ color:#64748b; }}
  .ev, .bs, .dr, .note {{ background:#f8fafc; border-left:3px solid #f59e0b; padding:8px 10px; margin:6px 0; font-size:13px; border-radius:4px; }}
  .bs {{ border-left-color:#0ea5e9; }}
  .dr {{ border-left-color:#ef4444; }}
  .note {{ border-left-color:#64748b; }}
  .ev ul, .bs ul {{ margin:4px 0 0 20px; padding:0; }}
  details {{ margin-top:10px; background:#f8fafc; padding:6px 10px; border-radius:4px; }}
  summary {{ cursor:pointer; font-weight:600; }}
  .sect {{ margin:8px 0; }}
  .sect h5 {{ margin:4px 0; font-size:13px; color:#475569; }}
  .sect code {{ background:#fff; padding:1px 6px; border-radius:3px; font-size:12px; }}
  .sect table {{ width:100%; border-collapse:collapse; font-size:13px; }}
  .sect td {{ border:1px solid #e2e8f0; padding:3px 8px; }}
  .empty {{ color:#94a3b8; font-style:italic; }}
  .flag {{ background:#fff7ed; padding:10px 14px; border-radius:6px; margin-top:12px; }}
</style>
</head>
<body>
  <h1>电机扭矩阈值预警 · 页面摘要</h1>
  <div class="sub">运行时间: {summary.timestamp} · 参数档 L{config.param_level} · 阈值调整 {config.threshold_adjustment_pct:+.1f}% · 输入: <code>{html.escape(config.input_dir)}</code> · 输出: <code>{html.escape(config.output_dir)}</code></div>

  <div class="overview">
    <div class="stats">
      <div class="stat"><div class="k">设备总数</div><div class="v">{summary.total_equipment}</div></div>
      <div class="stat" style="background:#dcfce7;"><div class="k">正常</div><div class="v" style="color:#16a34a;">{summary.normal_count}</div></div>
      <div class="stat" style="background:#fef9c3;"><div class="k">注意</div><div class="v" style="color:#ca8a04;">{summary.caution_count}</div></div>
      <div class="stat" style="background:#ffedd5;"><div class="k">预警</div><div class="v" style="color:#ea580c;">{summary.warning_count}</div></div>
      <div class="stat" style="background:#fee2e2;"><div class="k">严重</div><div class="v" style="color:#dc2626;">{summary.critical_count}</div></div>
      <div class="stat"><div class="k">方向异常</div><div class="v" style="color:#ef4444;">{summary.direction_issue_count}</div></div>
      <div class="stat"><div class="k">保留的极端值</div><div class="v">{summary.extreme_value_count}</div></div>
      <div class="stat"><div class="k">边界样本</div><div class="v">{summary.boundary_sample_count}</div></div>
    </div>
    <div class="flag"><b>重点关注清单(预警/严重):</b> {flagged}</div>
  </div>

  {sections_html}
</body>
</html>
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(doc)
    return out_path
