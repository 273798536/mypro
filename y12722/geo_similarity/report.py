import os
import csv
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import Optional

from .models import ProcessingRecord, JudgementRecord, Triangle


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
SCREENSHOT_DIR = os.path.join(OUTPUT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def _triangle_coords(t: Triangle):
    a, b, c = sorted([t.a, t.b, t.c], reverse=True)
    A = (0.0, 0.0)
    B = (c, 0.0)
    if c == 0:
        return [A, B, (0, 0)]
    cos_C = (a * a + b * b - c * c) / (2 * a * b) if a * b != 0 else 0
    cos_C = max(-1.0, min(1.0, cos_C))
    sin_C = math.sqrt(1 - cos_C * cos_C)
    Cx = b * cos_C
    Cy = b * sin_C
    return [A, B, (Cx, Cy)]


def generate_triangle_plot(rec: JudgementRecord, batch_id: str) -> Optional[str]:
    try:
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        coords1 = _triangle_coords(rec.triangle_1)
        xs1 = [p[0] for p in coords1] + [coords1[0][0]]
        ys1 = [p[1] for p in coords1] + [coords1[0][1]]
        axes[0].fill(xs1, ys1, alpha=0.3, color="blue", edgecolor="blue", linewidth=2)
        axes[0].plot(xs1, ys1, "bo-")
        label1 = rec.triangle_1.label or "Triangle 1"
        axes[0].set_title(f"{label1}\na={rec.triangle_1.a}, b={rec.triangle_1.b}, c={rec.triangle_1.c}")
        axes[0].set_aspect("equal", adjustable="datalim")
        axes[0].grid(True, alpha=0.3)

        coords2 = _triangle_coords(rec.triangle_2)
        xs2 = [p[0] for p in coords2] + [coords2[0][0]]
        ys2 = [p[1] for p in coords2] + [coords2[0][1]]
        axes[1].fill(xs2, ys2, alpha=0.3, color="red", edgecolor="red", linewidth=2)
        axes[1].plot(xs2, ys2, "ro-")
        label2 = rec.triangle_2.label or "Triangle 2"
        axes[1].set_title(f"{label2}\na={rec.triangle_2.a}, b={rec.triangle_2.b}, c={rec.triangle_2.c}")
        axes[1].set_aspect("equal", adjustable="datalim")
        axes[1].grid(True, alpha=0.3)

        status = "UNKNOWN"
        if rec.result:
            if rec.result.is_similar is True:
                status = "SIMILAR"
            elif rec.result.is_similar is False:
                status = "NOT SIMILAR"
            else:
                status = "FAILED"
        fig.suptitle(f"[{rec.record_id}] Geometric Similarity: {status}", fontsize=14, fontweight="bold")
        plt.tight_layout()

        fname = f"batch_{batch_id}_record_{rec.record_id}.png"
        fpath = os.path.join(SCREENSHOT_DIR, fname)
        plt.savefig(fpath, dpi=100, bbox_inches="tight")
        plt.close(fig)
        rec.screenshot_path = fpath
        return fpath
    except Exception as e:
        plt.close("all")
        return None


def export_result_csv(pr: ProcessingRecord, output_path: Optional[str] = None) -> str:
    if output_path is None:
        output_path = os.path.join(OUTPUT_DIR, f"batch_{pr.batch_id}_results.csv")
    headers = [
        "record_id", "source_row", "source_file", "判定方法", "是否相似",
        "误差幅度", "失败原因", "警告", "复核状态", "复核意见", "截图路径",
        "△1_a", "△1_b", "△1_c", "△1_角A", "△1_角B", "△1_角C",
        "△2_a", "△2_b", "△2_c", "△2_角A", "△2_角B", "△2_角C",
        "处理时间",
    ]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for rec in pr.judgement_records:
            r = rec.result
            is_sim = ""
            err_mag = ""
            method = ""
            err_reason = ""
            warning = ""
            if r:
                if r.is_similar is True:
                    is_sim = "是"
                elif r.is_similar is False:
                    is_sim = "否"
                else:
                    is_sim = "失败"
                err_mag = f"{r.error_magnitude:.6e}" if r.error_magnitude else ""
                method = r.method
                err_reason = r.error_reason or ""
                warning = r.warning or ""
            writer.writerow([
                rec.record_id,
                rec.source_row or "",
                rec.source_file or "",
                method,
                is_sim,
                err_mag,
                err_reason,
                warning,
                "已复核" if rec.reviewed else "未复核",
                rec.review_note or "",
                rec.screenshot_path or "",
                rec.triangle_1.a, rec.triangle_1.b, rec.triangle_1.c,
                rec.triangle_1.angle_A if rec.triangle_1.angle_A is not None else "",
                rec.triangle_1.angle_B if rec.triangle_1.angle_B is not None else "",
                rec.triangle_1.angle_C if rec.triangle_1.angle_C is not None else "",
                rec.triangle_2.a, rec.triangle_2.b, rec.triangle_2.c,
                rec.triangle_2.angle_A if rec.triangle_2.angle_A is not None else "",
                rec.triangle_2.angle_B if rec.triangle_2.angle_B is not None else "",
                rec.triangle_2.angle_C if rec.triangle_2.angle_C is not None else "",
                rec.timestamp,
            ])
    return output_path


def _fmt_bool(v):
    if v is True:
        return '<span style="color:green;font-weight:bold;">相似 ✓</span>'
    if v is False:
        return '<span style="color:red;font-weight:bold;">不相似 ✗</span>'
    return '<span style="color:gray;font-weight:bold;">判定失败</span>'


def export_html_report(pr: ProcessingRecord, output_path: Optional[str] = None) -> str:
    if output_path is None:
        output_path = os.path.join(OUTPUT_DIR, f"batch_{pr.batch_id}_report.html")
    summary = pr.summary()
    abnormal = pr.abnormal_records()

    rows_html = []
    for idx, rec in enumerate(pr.judgement_records, 1):
        r = rec.result
        row_class = ""
        if r:
            if r.is_similar is None:
                row_class = ' class="row-fail"'
            elif r.warning:
                row_class = ' class="row-warn"'
        review_tag = "已复核" if rec.reviewed else '<span style="color:#c00;">未复核</span>'
        sim_html = _fmt_bool(r.is_similar) if r else ""
        formula_html = ""
        scope_html = ""
        details_html = ""
        if r:
            formula_html = f"<pre>{r.formula}</pre>"
            scope_html = f"<pre>{r.scope}</pre>"
            if r.details:
                import json
                details_html = f"<pre>{json.dumps(r.details, ensure_ascii=False, indent=2)}</pre>"
        err_reason = r.error_reason if r and r.error_reason else ""
        warning = r.warning if r and r.warning else ""
        err_mag = f"{r.error_magnitude:.6e}" if r and r.error_magnitude else ""
        screenshot_cell = ""
        if rec.screenshot_path and os.path.exists(rec.screenshot_path):
            rel = os.path.relpath(rec.screenshot_path, os.path.dirname(output_path))
            screenshot_cell = f'<a href="{rel}" target="_blank">📷 查看截图</a>'
        review_note = rec.review_note or ""
        rows_html.append(f"""
        <tr{row_class}>
            <td>{idx}</td>
            <td><code>{rec.record_id}</code></td>
            <td>{rec.source_row or '-'}</td>
            <td>{r.method if r else ''}</td>
            <td>{sim_html}</td>
            <td><code>{err_mag}</code></td>
            <td style="color:#c00;">{err_reason}</td>
            <td style="color:#e67e22;">{warning}</td>
            <td>{formula_html}</td>
            <td>{scope_html}</td>
            <td>{details_html}</td>
            <td>{review_tag}</td>
            <td>{review_note}</td>
            <td>{screenshot_cell}</td>
            <td>{rec.timestamp}</td>
        </tr>
        """)

    abnormal_rows = ""
    if abnormal:
        ab_items = []
        for rec in abnormal:
            r = rec.result
            ab_items.append(f"""
            <li>
                <strong>记录 <code>{rec.record_id}</code></strong>
                (来源: 第 {rec.source_row} 行)
                — 判定方法: {r.method if r else 'N/A'}
                — {_fmt_bool(r.is_similar) if r else '未知'}
                — 误差: <code>{r.error_magnitude:.6e}</code>
                {'<br>失败原因: ' + r.error_reason if r and r.error_reason else ''}
                {'<br>警告: <span style="color:#e67e22;">' + r.warning + '</span>' if r and r.warning else ''}
                {'<br>复核意见: ' + rec.review_note if rec.review_note else ''}
                {'<br>📷 ' + rec.screenshot_path if rec.screenshot_path else ''}
            </li>
            """)
        abnormal_rows = "<ol>" + "".join(ab_items) + "</ol>"

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>几何相似判定报告 - 批次 {pr.batch_id}</title>
<style>
    body {{ font-family: -apple-system, "Segoe UI", "PingFang SC", sans-serif; margin: 24px; color: #222; }}
    h1 {{ color: #2c3e50; }}
    h2 {{ color: #34495e; border-bottom: 1px solid #ddd; padding-bottom: 6px; }}
    table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
    th, td {{ border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }}
    th {{ background: #2c3e50; color: #fff; position: sticky; top: 0; }}
    tr.row-warn {{ background: #fff8e1; }}
    tr.row-fail {{ background: #ffebee; }}
    pre {{ background: #f6f8fa; padding: 8px; border-radius: 4px; margin: 0; font-size: 12px; white-space: pre-wrap; max-width: 360px; }}
    code {{ background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }}
    .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 12px 0 24px; }}
    .summary-card {{ background: #3498db; color: #fff; padding: 12px; border-radius: 6px; text-align: center; }}
    .summary-card .num {{ font-size: 28px; font-weight: bold; }}
    .summary-card .label {{ font-size: 13px; opacity: 0.9; }}
    .card-warn {{ background: #e67e22; }}
    .card-fail {{ background: #e74c3c; }}
    .card-ok {{ background: #27ae60; }}
    a {{ color: #2980b9; }}
</style>
</head>
<body>
<h1>🔺 几何相似判定报告</h1>
<p>批次号: <code>{pr.batch_id}</code> | 来源文件: <code>{pr.source_file}</code> | 创建时间: {pr.created_at} | 状态: {pr.status}</p>
<p>容差设置: 比例相对偏差 ≤ <code>{pr.tolerance:.2e}</code>，角度差 ≤ <code>{pr.angle_tolerance:.4f}°</code></p>

<h2>📊 批次概览</h2>
<div class="summary-grid">
    <div class="summary-card"><div class="num">{summary['total']}</div><div class="label">总记录数</div></div>
    <div class="summary-card card-ok"><div class="num">{summary['similar']}</div><div class="label">判定相似</div></div>
    <div class="summary-card"><div class="num">{summary['different']}</div><div class="label">判定不相似</div></div>
    <div class="summary-card card-fail"><div class="num">{summary['failed']}</div><div class="label">判定失败</div></div>
    <div class="summary-card card-warn"><div class="num">{summary['warnings']}</div><div class="label">警告/需复核</div></div>
    <div class="summary-card"><div class="num">{summary['reviewed']}</div><div class="label">已复核</div></div>
</div>

<h2>⚠️ 异常/需复核记录 ({len(abnormal)})</h2>
{abnormal_rows if abnormal_rows else '<p>✅ 本批次无异常记录。</p>'}

<h2>📋 详细判定记录</h2>
<table>
<thead>
<tr>
    <th>#</th><th>记录ID</th><th>来源行</th><th>判定方法</th><th>结果</th><th>误差幅度</th>
    <th>失败原因</th><th>警告</th><th>公式</th><th>适用范围</th><th>计算详情</th>
    <th>复核状态</th><th>复核意见</th><th>截图</th><th>处理时间</th>
</tr>
</thead>
<tbody>
{''.join(rows_html)}
</tbody>
</table>

<h2>🔍 反查入口</h2>
<p>从本报告可直接追溯：每条记录的 <code>记录ID</code> 与 <code>来源行</code> 对应原始 CSV 数据，截图保存于 <code>output/screenshots/</code>，处理记录保存于 <code>data/batch_{pr.batch_id}.json</code>。</p>
<p>复核命令示例：<code>python -m geo_similarity.cli review --batch {pr.batch_id} --record [记录ID] --note "复核意见"</code></p>

</body>
</html>"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    return output_path


def generate_abnormal_screenshots(pr: ProcessingRecord) -> int:
    count = 0
    for rec in pr.abnormal_records():
        if generate_triangle_plot(rec, pr.batch_id):
            count += 1
    return count
