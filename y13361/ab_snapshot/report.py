import os
from typing import Dict, List, Any, Optional
from .models import (
    VersionSnapshot, SnapCompareResult, ReviewReport, ReviewSection,
    now_iso, save_json
)


STATUS_PROCESSED = "processed"
STATUS_PENDING_MATERIAL = "pending_material"
STATUS_MANUAL_REVIEW = "manual_review"
STATUS_ALERT = "alert"


def _sample_link(sid: str, text: Optional[str] = None) -> str:
    display = text if text else sid
    return f'<a href="#sample-{sid}" class="sample-link" title="跳转样本证据">{display}</a>'


def _sample_refs_html(refs: List[str]) -> str:
    if not refs:
        return ""
    links = [_sample_link(r) for r in refs]
    return " ".join(links)


def _build_processed_section(
    old: VersionSnapshot, new: VersionSnapshot, result: SnapCompareResult
) -> ReviewSection:
    items = []
    changed_sample_ids = set()
    for d in result.sample_diffs:
        changed_sample_ids.update(d.sample_refs)
    for d in result.manual_correction_diffs:
        changed_sample_ids.update(d.sample_refs)

    stable_samples = [s for s in new.samples if s.sample_id not in changed_sample_ids]
    if stable_samples:
        items.append({
            "label": "稳定样本",
            "value": f"{len(stable_samples)} 条样本特征/标签/预测无变化",
            "detail": "、".join([s.sample_id for s in stable_samples[:5]]) + ("..." if len(stable_samples) > 5 else "")
        })

    changed_metric_names = {d.field for d in result.metric_diffs}
    stable_metrics = [m for m in new.metrics if m.name not in changed_metric_names]
    if stable_metrics:
        items.append({
            "label": "稳定指标",
            "value": f"{len(stable_metrics)} 项指标值未变",
            "detail": "、".join([m.name for m in stable_metrics])
        })

    changed_th_names = {d.field for d in result.threshold_diffs}
    stable_ths = [m for m in new.metrics if m.name not in changed_th_names and m.threshold is not None]
    if stable_ths:
        items.append({
            "label": "稳定阈值",
            "value": f"{len(stable_ths)} 项阈值未变",
            "detail": "、".join([f"{m.name}={m.threshold}" for m in stable_ths])
        })

    return ReviewSection(status=STATUS_PROCESSED, title="✅ 已处理 · 无变化项", items=items)


def _build_pending_material_section(
    result: SnapCompareResult
) -> ReviewSection:
    items = []
    for cc in result.caliber_changes:
        if cc.change_type in ("material_removed", "material_added"):
            items.append({
                "label": f"材料异动 · {cc.change_type}",
                "value": cc.material_name,
                "detail": cc.evidence
            })
    if len(result.caliber_changes) == 0:
        items.append({
            "label": "材料完整性",
            "value": "训练日志 / 正常记录 / 口头说明 三份材料齐全且hash一致",
            "detail": ""
        })
    return ReviewSection(status=STATUS_PENDING_MATERIAL, title="📋 待补材料 · 口径一致性核查", items=items)


def _build_manual_review_section(
    old: VersionSnapshot, new: VersionSnapshot, result: SnapCompareResult
) -> ReviewSection:
    items = []
    for d in result.manual_correction_diffs:
        items.append({
            "label": "人工修正",
            "value": d.field,
            "detail": f"{d.note} | 涉及样本: {_sample_refs_html(d.sample_refs)}",
            "old": d.old_value,
            "new": d.new_value
        })
    for cc in result.caliber_changes:
        if cc.change_type in ("material_modified", "log_caliber_hint", "note_caliber_hint"):
            items.append({
                "label": f"口径疑似变更 · {cc.change_type}",
                "value": f"{cc.material_name}:{cc.field_path}",
                "detail": cc.evidence
            })
    if not items:
        items.append({
            "label": "人工修正与口径",
            "value": "无人工改判，无口径关键词异动",
            "detail": ""
        })
    return ReviewSection(status=STATUS_MANUAL_REVIEW, title="✏️ 人工改判 · 口径/修正记录", items=items)


def _build_alert_section(result: SnapCompareResult) -> ReviewSection:
    items = []
    old_late = set(result.late_feature_records_old)
    new_late = set(result.late_feature_records_new)
    added_late = new_late - old_late
    kept_late = new_late & old_late

    for sid in sorted(added_late):
        items.append({
            "label": "⚠️ 新增特征迟到",
            "value": sid,
            "detail": f"该样本特征到达延迟超标，建议单独复核是否被揉进正常结果 | {_sample_link(sid)}",
            "alert": True
        })
    for sid in sorted(kept_late):
        items.append({
            "label": "🔶 延续特征迟到",
            "value": sid,
            "detail": f"两版都存在特征迟到，需确认是否已被排除 | {_sample_link(sid)}",
            "alert": True
        })

    for d in result.metric_diffs:
        items.append({
            "label": "指标变化",
            "value": d.field,
            "detail": d.note,
            "old": d.old_value,
            "new": d.new_value
        })
    for d in result.threshold_diffs:
        items.append({
            "label": "阈值变化",
            "value": d.field,
            "detail": d.note,
            "old": d.old_value,
            "new": d.new_value
        })
    for d in result.sample_diffs:
        items.append({
            "label": "样本变化",
            "value": d.field,
            "detail": f"{d.note} | 涉及: {_sample_refs_html(d.sample_refs)}",
            "old": d.old_value,
            "new": d.new_value
        })

    if not items:
        items.append({
            "label": "异常项",
            "value": "无特征迟到 / 无指标 / 无阈值 / 无样本异动",
            "detail": ""
        })
    return ReviewSection(status=STATUS_ALERT, title="🚨 需重点复核 · 异常/变化项", items=items)


def _sample_evidence_block(snapshot: VersionSnapshot, result: SnapCompareResult) -> str:
    changed_ids = set()
    for d in result.sample_diffs + result.manual_correction_diffs:
        changed_ids.update(d.sample_refs)
    changed_ids.update(result.late_feature_records_new)
    changed_ids.update(result.late_feature_records_old)
    if not changed_ids:
        changed_ids = {s.sample_id for s in snapshot.samples[:3]}

    rows = []
    for s in sorted(snapshot.samples, key=lambda x: x.sample_id):
        if s.sample_id not in changed_ids:
            continue
        late_tag = '<span class="tag tag-alert">特征迟到</span>' if s.is_feature_late else ""
        man_tag = '<span class="tag tag-manual">有人工修正</span>' if s.manual_correction else ""
        feats = "<br>".join([f"{k}={v}" for k, v in list(s.features.items())[:6]])
        evs = "<br>".join(s.evidence_refs) if s.evidence_refs else "（无）"
        rows.append(f"""
        <tr id="sample-{s.sample_id}" class="sample-row">
          <td><b>{s.sample_id}</b><br>{late_tag} {man_tag}</td>
          <td>{feats}</td>
          <td>{s.label}</td>
          <td>{s.prediction}</td>
          <td>{s.feature_arrival_latency_ms}ms</td>
          <td>{evs}</td>
        </tr>
        """)
    return "\n".join(rows)


def build_review_report(
    old: VersionSnapshot, new: VersionSnapshot, result: SnapCompareResult, snapshot_id: str
) -> ReviewReport:
    report = ReviewReport(snapshot_id=snapshot_id, generated_at=now_iso())
    report.sections.append(_build_processed_section(old, new, result))
    report.sections.append(_build_alert_section(result))
    report.sections.append(_build_manual_review_section(old, new, result))
    report.sections.append(_build_pending_material_section(result))
    return report


def render_html_report(
    report: ReviewReport,
    old: VersionSnapshot,
    new: VersionSnapshot,
    result: SnapCompareResult,
    output_dir: str
) -> str:
    sections_html = []
    for sec in report.sections:
        items_html = []
        for it in sec.items:
            detail_html = f'<div class="detail">{it.get("detail", "")}</div>' if it.get("detail") else ""
            oldnew_html = ""
            if "old" in it or "new" in it:
                oldnew_html = f'<div class="oldnew"><span class="old">旧: {it.get("old")}</span> → <span class="new">新: {it.get("new")}</span></div>'
            cls_extra = " item-alert" if it.get("alert") else ""
            items_html.append(f"""
            <div class="item{cls_extra}">
              <div class="label">{it.get("label","")}</div>
              <div class="value">{it.get("value","")}</div>
              {oldnew_html}
              {detail_html}
            </div>
            """)
        sections_html.append(f"""
        <section class="section section-{sec.status}">
          <h2>{sec.title}</h2>
          <div class="items">{"".join(items_html)}</div>
        </section>
        """)

    sample_table = _sample_evidence_block(new, result)

    css = """
    body { font-family: -apple-system, "PingFang SC", sans-serif; max-width: 1180px; margin: 24px auto; padding: 0 16px; color:#222; }
    h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom:8px; }
    h2 { font-size: 17px; margin: 0 0 12px; }
    .meta { color:#666; font-size:13px; margin-bottom: 18px; }
    .section { border:1px solid #ddd; border-radius:8px; padding:16px; margin-bottom:16px; }
    .section-processed { border-color: #34a853; background: #f6fff8; }
    .section-alert { border-color: #ea4335; background: #fff7f7; }
    .section-manual_review { border-color: #fbbc04; background: #fffdf5; }
    .section-pending_material { border-color: #4285f4; background: #f6faff; }
    .items { display: grid; grid-template-columns: 1fr; gap: 10px; }
    .item { background:#fff; border:1px solid #eee; border-radius:6px; padding:10px 12px; }
    .item-alert { border-left: 4px solid #ea4335; }
    .label { font-weight: 600; font-size:13px; color:#555; }
    .value { font-size:15px; margin-top: 2px; }
    .oldnew { font-size:13px; margin-top:4px; }
    .old { color:#b44; } .new { color:#272; }
    .detail { color:#666; font-size:12px; margin-top:6px; line-height:1.5; }
    .tag { display:inline-block; padding:1px 6px; border-radius:3px; font-size:11px; margin-right:4px; }
    .tag-alert { background:#ea4335; color:#fff; }
    .tag-manual { background:#fbbc04; color:#333; }
    .sample-link { color:#1a73e8; text-decoration:none; border-bottom:1px dashed #1a73e8; }
    table.evidence { width:100%; border-collapse:collapse; font-size:12px; background:#fff; }
    table.evidence th, table.evidence td { border:1px solid #ddd; padding:6px 8px; vertical-align:top; text-align:left; }
    table.evidence th { background:#f0f0f0; }
    .sample-row:target { background:#fff8c5; }
    .legend { font-size:12px; color:#666; margin-top: 4px; }
    """

    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>AB实验版本快照 · {report.snapshot_id}</title>
<style>{css}</style>
</head>
<body>
<h1>AB 实验版本快照复核说明</h1>
<div class="meta">
快照ID: <b>{report.snapshot_id}</b> &nbsp;|&nbsp;
版本对比: <b>{result.old_version}</b> → <b>{result.new_version}</b> &nbsp;|&nbsp;
生成时间: {report.generated_at} &nbsp;|&nbsp;
总体状态: <b>{result.overall_status}</b>
</div>
<div class="legend">👉 点击蓝色样本链接可直接跳转到底部样本证据行查看明细。红色标签=特征迟到，黄色标签=含人工修正。</div>

{"".join(sections_html)}

<section class="section">
<h2>🔍 样本证据回溯表（点击上方链接跳转至此）</h2>
<table class="evidence">
<thead>
<tr><th>样本ID</th><th>特征(top6)</th><th>标签</th><th>预测</th><th>特征延迟</th><th>证据路径/来源</th></tr>
</thead>
<tbody>
{sample_table}
</tbody>
</table>
</section>

</body>
</html>"""

    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"review_{report.snapshot_id}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)

    json_path = os.path.join(output_dir, f"report_{report.snapshot_id}.json")
    save_json(report.to_dict(), json_path)
    return path
