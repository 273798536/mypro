from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from models import DataQuality, VersionSnapshot
from traceability import generate_traceability_report


def _esc(text: Any) -> str:
    return html.escape(str(text), quote=True)


def _quality_badge(quality: DataQuality) -> str:
    colors = {
        DataQuality.CLEAN: "#52c41a",
        DataQuality.MISSING: "#faad14",
        DataQuality.OUTLIER: "#f5222d",
        DataQuality.LATE: "#722ed1",
        DataQuality.INVALID: "#eb2f96",
    }
    labels = {
        DataQuality.CLEAN: "正常",
        DataQuality.MISSING: "缺失",
        DataQuality.OUTLIER: "越界",
        DataQuality.LATE: "迟到",
        DataQuality.INVALID: "无效",
    }
    color = colors.get(quality, "#999")
    label = labels.get(quality, quality.value)
    return f'<span style="background:{color};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">{label}</span>'


def _source_link(source: dict[str, Any] | None) -> str:
    if source is None:
        return '<span style="color:#999;">无来源</span>'
    row = source.get("original_row", "?")
    file = source.get("original_file", "?")
    task = source.get("source_task", "")
    task_label = f" <small>({_esc(task)})</small>" if task else ""
    return f'<span style="font-family:monospace;font-size:12px;">📄 {_esc(file)} #L{row}{task_label}</span>'


def _render_overview(snapshot: VersionSnapshot) -> str:
    total = snapshot.total_features
    clean = snapshot.clean_count
    dirty = snapshot.dirty_count
    oob = snapshot.out_of_boundary_count
    pct = (clean / total * 100) if total > 0 else 0

    bar_color = "#52c41a" if pct >= 90 else "#faad14" if pct >= 70 else "#f5222d"

    return f"""
    <div class="card">
        <h2>📊 总览</h2>
        <div class="overview-grid">
            <div class="stat-box">
                <div class="stat-value">{total}</div>
                <div class="stat-label">特征总数</div>
            </div>
            <div class="stat-box" style="border-left-color:#52c41a;">
                <div class="stat-value" style="color:#52c41a;">{clean}</div>
                <div class="stat-label">正常</div>
            </div>
            <div class="stat-box" style="border-left-color:#f5222d;">
                <div class="stat-value" style="color:#f5222d;">{dirty}</div>
                <div class="stat-label">异常</div>
            </div>
            <div class="stat-box" style="border-left-color:#faad14;">
                <div class="stat-value" style="color:#faad14;">{oob}</div>
                <div class="stat-label">越界</div>
            </div>
        </div>
        <div style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>数据质量</span>
                <span>{pct:.1f}% 正常</span>
            </div>
            <div style="background:#f0f0f0;border-radius:8px;height:12px;overflow:hidden;">
                <div style="background:{bar_color};height:100%;width:{pct}%;border-radius:8px;transition:width .3s;"></div>
            </div>
        </div>
        {f'<p style="margin-top:12px;color:#666;">📝 {_esc(snapshot.summary_note)}</p>' if snapshot.summary_note else ''}
    </div>
    """


def _render_features_table(snapshot: VersionSnapshot) -> str:
    rows = []
    for i, feat in enumerate(snapshot.features):
        boundary_str = ""
        if feat.boundary_low is not None and feat.boundary_high is not None:
            boundary_str = f"[{feat.boundary_low}, {feat.boundary_high}]"
        elif feat.boundary_low is not None:
            boundary_str = f"≥ {feat.boundary_low}"
        elif feat.boundary_high is not None:
            boundary_str = f"≤ {feat.boundary_high}"

        value_style = ""
        if feat.is_in_boundary is False:
            value_style = 'style="color:#f5222d;font-weight:bold;"'
        elif feat.quality != DataQuality.CLEAN:
            value_style = 'style="color:#faad14;"'

        source_html = _source_link(feat.source.to_dict() if feat.source else None)
        badge = _quality_badge(feat.quality)

        late_cell = ""
        if feat.late_reason:
            late_cell = f'<td><span style="color:#722ed1;font-size:12px;">⚡ {_esc(feat.late_reason)}</span><br><small style="color:#999;">来源: {source_html}</small></td>'
        else:
            late_cell = f"<td>{source_html}</td>"

        screenshot_cell = ""
        if feat.screenshot_note:
            screenshot_cell = f'<td><span style="font-size:12px;">📸 {_esc(feat.screenshot_note)}</span></td>'
        else:
            screenshot_cell = "<td>—</td>"

        rows.append(f"""
        <tr id="feat-{i}">
            <td><strong>{_esc(feat.feature_name)}</strong></td>
            <td {value_style}>{_esc(feat.value)}</td>
            <td><code>{_esc(feat.unit)}</code></td>
            <td><code style="font-size:11px;">{_esc(feat.formula)}</code></td>
            <td>{boundary_str}</td>
            <td>{badge}</td>
            {late_cell}
            {screenshot_cell}
        </tr>
        """)

    return f"""
    <div class="card">
        <h2>📋 特征明细 <small style="color:#999;font-weight:normal;">（公式 · 单位 · 边界值 · 原始来源 · 截图说明）</small></h2>
        <div style="overflow-x:auto;">
        <table>
            <thead>
                <tr>
                    <th>特征名</th>
                    <th>值</th>
                    <th>单位</th>
                    <th>公式</th>
                    <th>边界值</th>
                    <th>状态</th>
                    <th>原始来源 / 迟到原因</th>
                    <th>截图说明</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
        </div>
    </div>
    """


def _render_late_features(report: dict[str, Any]) -> str:
    late = report["late_features"]
    if late["count"] == 0:
        return """
        <div class="card">
            <h2>⚡ 特征迟到追溯</h2>
            <p style="color:#52c41a;">✅ 无迟到特征</p>
        </div>
        """

    rows = []
    for item in late["details"]:
        source_link = _source_link({
            "original_row": item.get("original_row"),
            "original_file": item.get("original_file"),
            "source_task": item.get("source_task"),
        })
        rows.append(f"""
        <tr>
            <td><strong>{_esc(item['feature_name'])}</strong></td>
            <td><span style="color:#722ed1;">⚡ {_esc(item['late_reason'])}</span></td>
            <td>{_esc(item.get('original_value', ''))}</td>
            <td>{source_link}</td>
            <td><code>{_esc(item.get('unit', ''))}</code></td>
            <td><code style="font-size:11px;">{_esc(item.get('formula', ''))}</code></td>
            <td style="font-size:12px;">📸 {_esc(item.get('screenshot_note', '—'))}</td>
        </tr>
        """)

    return f"""
    <div class="card">
        <h2>⚡ 特征迟到追溯 <span style="background:#722ed1;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">{late['count']}</span></h2>
        <p style="color:#666;font-size:13px;margin-bottom:12px;">每条迟到特征均可追溯到原始来源行，含公式、单位与截图说明</p>
        <div style="overflow-x:auto;">
        <table>
            <thead>
                <tr>
                    <th>特征名</th>
                    <th>迟到原因</th>
                    <th>原始值</th>
                    <th>来源定位</th>
                    <th>单位</th>
                    <th>公式</th>
                    <th>截图说明</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
        </div>
    </div>
    """


def _render_skewing_samples(report: dict[str, Any]) -> str:
    skew = report["skewing_samples"]
    if skew["count"] == 0:
        return """
        <div class="card">
            <h2>🎯 拉偏样本定位</h2>
            <p style="color:#52c41a;">✅ 无拉偏样本</p>
        </div>
        """

    rows = []
    for item in skew["details"]:
        source_link = _source_link({
            "original_row": item.get("original_row"),
            "original_file": item.get("original_file"),
            "source_task": item.get("source_task"),
        })
        score_pct = item["contribution_score"] * 100
        bar_w = min(score_pct, 100)
        bar_color = "#f5222d" if score_pct > 50 else "#faad14" if score_pct > 20 else "#52c41a"

        rows.append(f"""
        <tr>
            <td><strong>{_esc(item['sample_id'])}</strong></td>
            <td>{_esc(item['feature_name'])}</td>
            <td style="color:#f5222d;font-weight:bold;">{_esc(item['sample_value'])}</td>
            <td><code>{_esc(item['expected_range'])}</code></td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;background:#f0f0f0;border-radius:4px;height:8px;">
                        <div style="background:{bar_color};height:100%;width:{bar_w}%;border-radius:4px;"></div>
                    </div>
                    <span style="font-size:12px;color:{bar_color};">{score_pct:.1f}%</span>
                </div>
            </td>
            <td>{source_link}</td>
        </tr>
        """)

    return f"""
    <div class="card">
        <h2>🎯 拉偏样本定位 <span style="background:#f5222d;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">Top {skew['top_n']}</span></h2>
        <p style="color:#666;font-size:13px;margin-bottom:12px;">贡献度越高，该样本对总指标的拉偏作用越大；点击来源可定位原始行</p>
        <div style="overflow-x:auto;">
        <table>
            <thead>
                <tr>
                    <th>样本ID</th>
                    <th>特征名</th>
                    <th>样本值</th>
                    <th>期望范围</th>
                    <th>拉偏贡献度</th>
                    <th>来源定位</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
        </div>
    </div>
    """


def _render_bad_data(report: dict[str, Any]) -> str:
    bad = report["bad_data_pointers"]
    if bad["count"] == 0:
        return """
        <div class="card">
            <h2>🗑️ 坏数据指针</h2>
            <p style="color:#52c41a;">✅ 无坏数据</p>
        </div>
        """

    rows = []
    for item in bad["details"]:
        rows.append(f"""
        <tr>
            <td><strong>{_esc(item['feature_name'])}</strong></td>
            <td><span style="color:#eb2f96;">{_esc(item['issue'])}</span></td>
            <td><code style="color:#f5222d;">{_esc(item['raw_value'])}</code></td>
            <td style="font-family:monospace;font-size:12px;">📄 {_esc(item['original_file'])} #L{item['original_row']}</td>
            <td><code>{_esc(item['column_name'])}</code></td>
        </tr>
        """)

    return f"""
    <div class="card">
        <h2>🗑️ 坏数据指针 <span style="background:#eb2f96;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">{bad['count']}</span></h2>
        <p style="color:#666;font-size:13px;margin-bottom:12px;">每条坏数据均指向原始文件行与列名，保留原始值不做修饰</p>
        <div style="overflow-x:auto;">
        <table>
            <thead>
                <tr>
                    <th>特征名</th>
                    <th>问题</th>
                    <th>原始值</th>
                    <th>来源定位</th>
                    <th>列名</th>
                </tr>
            </thead>
            <tbody>
                {"".join(rows)}
            </tbody>
        </table>
        </div>
    </div>
    """


def _render_screenshot_section(snapshot: VersionSnapshot) -> str:
    items = []
    for i, feat in enumerate(snapshot.features):
        if not feat.screenshot_note:
            continue
        source_html = _source_link(feat.source.to_dict() if feat.source else None)
        badge = _quality_badge(feat.quality)
        items.append(f"""
        <div class="screenshot-item" id="ss-{i}">
            <div class="screenshot-header">
                <strong>{_esc(feat.feature_name)}</strong> {badge}
                <span style="float:right;font-size:12px;">{source_html}</span>
            </div>
            <div class="screenshot-body">
                <p>📸 {_esc(feat.screenshot_note)}</p>
                <table style="width:100%;font-size:13px;">
                    <tr><td style="width:80px;color:#999;">值</td><td>{_esc(feat.value)} <code>{_esc(feat.unit)}</code></td></tr>
                    <tr><td style="color:#999;">公式</td><td><code>{_esc(feat.formula)}</code></td></tr>
                    <tr><td style="color:#999;">边界</td><td>{_esc(f'[ {feat.boundary_low}, {feat.boundary_high} ]' if feat.boundary_low is not None and feat.boundary_high is not None else '')}</td></tr>
                    {f'<tr><td style="color:#999;">迟到</td><td style="color:#722ed1;">⚡ {_esc(feat.late_reason)}</td></tr>' if feat.late_reason else ''}
                </table>
            </div>
        </div>
        """)

    if not items:
        return """
        <div class="card">
            <h2>📸 截图说明（沟通用）</h2>
            <p style="color:#999;">暂无带截图说明的特征</p>
        </div>
        """

    return f"""
    <div class="card">
        <h2>📸 截图说明（沟通用）</h2>
        <p style="color:#666;font-size:13px;margin-bottom:12px;">可直接截图发到群里，每条含特征名、值、单位、公式、边界值与原始来源</p>
        <div class="screenshot-list">
            {"".join(items)}
        </div>
    </div>
    """


_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; padding: 24px; }
.container { max-width: 1200px; margin: 0 auto; }
h1 { font-size: 24px; margin-bottom: 8px; }
.header-meta { color: #999; font-size: 14px; margin-bottom: 24px; }
.card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.card h2 { font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; font-weight: 600; color: #666; font-size: 13px; white-space: nowrap; }
tr:hover { background: #fafafa; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-box { background: #fafafa; border-radius: 8px; padding: 16px; text-align: center; border-left: 4px solid #1890ff; }
.stat-value { font-size: 32px; font-weight: bold; color: #1890ff; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.screenshot-list { display: grid; gap: 12px; }
.screenshot-item { border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; }
.screenshot-header { background: #fafafa; padding: 10px 14px; border-bottom: 1px solid #e8e8e8; }
.screenshot-body { padding: 12px 14px; }
.screenshot-body table td { padding: 4px 8px; border: none; }
.screenshot-body table tr { background: transparent; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.nav { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.nav a { padding: 6px 14px; background: #fff; border: 1px solid #d9d9d9; border-radius: 20px; text-decoration: none; color: #333; font-size: 13px; transition: all .2s; }
.nav a:hover { border-color: #1890ff; color: #1890ff; }
@media (max-width: 768px) { .overview-grid { grid-template-columns: repeat(2, 1fr); } }
"""


def render_html_report(snapshot: VersionSnapshot, output_path: str | Path = "snapshot_report.html") -> Path:
    report = generate_traceability_report(snapshot)
    output = Path(output_path)

    sections = [
        _render_overview(snapshot),
        _render_features_table(snapshot),
        _render_late_features(report),
        _render_skewing_samples(report),
        _render_bad_data(report),
        _render_screenshot_section(snapshot),
    ]

    page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>联邦客户端版本快照 - {_esc(snapshot.client_name)} v{_esc(snapshot.version)}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="container">
    <h1>📑 联邦客户端版本快照</h1>
    <div class="header-meta">
        客户端: <strong>{_esc(snapshot.client_name)}</strong> &nbsp;|&nbsp;
        版本: <strong>{_esc(snapshot.version)}</strong> &nbsp;|&nbsp;
        时间: {_esc(snapshot.snapshot_time)}
    </div>
    <div class="nav">
        <a href="#overview">📊 总览</a>
        <a href="#features">📋 特征明细</a>
        <a href="#late">⚡ 迟到追溯</a>
        <a href="#skew">🎯 拉偏样本</a>
        <a href="#bad">🗑️ 坏数据</a>
        <a href="#screenshot">📸 截图说明</a>
    </div>
    <div id="overview">{sections[0]}</div>
    <div id="features">{sections[1]}</div>
    <div id="late">{sections[2]}</div>
    <div id="skew">{sections[3]}</div>
    <div id="bad">{sections[4]}</div>
    <div id="screenshot">{sections[5]}</div>
    <div style="text-align:center;color:#ccc;font-size:12px;margin-top:32px;padding-bottom:16px;">
        联邦客户端版本快照 · 自动生成 · {datetime.now().strftime('%Y-%m-%d %H:%M')}
    </div>
</div>
</body>
</html>"""

    output.write_text(page, encoding="utf-8")
    return output
