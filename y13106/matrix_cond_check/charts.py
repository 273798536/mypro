import os
from typing import List, Optional, Dict, Any
import math

from .core import CheckResult
from .validator import BoundaryValidator, ViolationRecord
from .source_tracker import SourceTracker


try:
    import matplotlib
    matplotlib.use("Agg")
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning, message="Glyph .* missing from current font")
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    from matplotlib import font_manager

    _cjk_candidates = [
        "PingFang SC", "Heiti SC", "STHeiti", "Hiragino Sans GB",
        "Microsoft YaHei", "SimHei", "WenQuanYi Micro Hei",
        "Noto Sans CJK SC", "Source Han Sans SC", "Arial Unicode MS",
    ]
    _available = {f.name for f in font_manager.fontManager.ttflist}
    for _name in _cjk_candidates:
        if _name in _available:
            plt.rcParams["font.sans-serif"] = [_name] + plt.rcParams.get("font.sans-serif", [])
            break
    plt.rcParams["axes.unicode_minus"] = False
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


STATUS_COLORS = {
    "valid_in_range": "#2ecc71",
    "valid_near_boundary": "#f39c12",
    "invalid_out_of_bound": "#e74c3c",
    "invalid_extrapolation": "#c0392b",
    "invalid_value": "#95a5a6",
    "extrapolation_valid": "#3498db",
    "extrapolation_near_boundary": "#e67e22",
    "extrapolation_out_of_bound": "#e74c3c",
}


def _classify_result(r: CheckResult) -> str:
    if r.condition_number is None or (isinstance(r.condition_number, float) and (math.isnan(r.condition_number) or math.isinf(r.condition_number))):
        return "invalid_value"
    if not r.is_valid:
        if r.is_extrapolated:
            return "extrapolation_out_of_bound"
        else:
            return "invalid_out_of_bound"
    if r.is_extrapolated:
        if r.is_near_boundary:
            return "extrapolation_near_boundary"
        else:
            return "extrapolation_valid"
    else:
        if r.is_near_boundary:
            return "valid_near_boundary"
        else:
            return "valid_in_range"


def _safe_value(v):
    if v is None:
        return 0.0
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return 0.0
    return float(v)


def generate_charts(
    check_results: List[CheckResult],
    validator: BoundaryValidator,
    tracker: SourceTracker,
    output_dir: str,
) -> Dict[str, str]:
    os.makedirs(output_dir, exist_ok=True)
    generated: Dict[str, str] = {}

    if not MATPLOTLIB_AVAILABLE:
        html_path = _generate_html_placeholder(output_dir, "matplotlib 未安装，请先 pip install matplotlib")
        generated["charts_summary"] = html_path
        return generated

    try:
        chart1 = _plot_condition_number_bars(check_results, output_dir)
        generated["condition_number_chart"] = chart1

        chart2 = _plot_violation_distribution(validator.violations, output_dir)
        if chart2:
            generated["violation_distribution"] = chart2

        chart3 = _plot_status_distribution(tracker, output_dir)
        generated["status_distribution"] = chart3

        chart4 = _plot_extrapolation_vs_interpolation(check_results, output_dir)
        generated["extrapolation_chart"] = chart4

        html_path = _generate_html_summary(generated, output_dir, check_results, validator, tracker)
        generated["charts_summary"] = html_path

    except Exception as e:
        html_path = _generate_html_placeholder(output_dir, f"图表生成异常：{e}")
        generated["charts_summary"] = html_path

    return generated


def _plot_condition_number_bars(results: List[CheckResult], output_dir: str) -> str:
    if not results:
        return ""

    fig, ax = plt.subplots(figsize=(max(10, len(results) * 0.8), 6))

    labels = [r.matrix_name for r in results]
    values = [_safe_value(r.condition_number) for r in results]
    categories = [_classify_result(r) for r in results]
    colors = [STATUS_COLORS.get(c, "#7f8c8d") for c in categories]

    lower_bounds = [r.lower_bound for r in results]
    upper_bounds = [r.upper_bound for r in results]
    x_pos = range(len(results))

    bars = ax.bar(x_pos, values, color=colors, edgecolor="white", linewidth=0.5)

    ax.plot(x_pos, upper_bounds, color="#e74c3c", linestyle="--", linewidth=1.5, label="上界")
    ax.plot(x_pos, lower_bounds, color="#e74c3c", linestyle="--", linewidth=1.5, label="下界")

    for i, (r, bar) in enumerate(zip(results, bars)):
        val = r.condition_number
        if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
            ax.text(i, bar.get_height() + max(upper_bounds) * 0.02, "无效", ha="center", va="bottom",
                    fontsize=8, color="#e74c3c", fontweight="bold")
        elif val > r.upper_bound:
            ax.text(i, r.upper_bound + max(upper_bounds) * 0.02, f"+{val - r.upper_bound:.1f}",
                    ha="center", va="bottom", fontsize=8, color="#e74c3c", fontweight="bold")
        elif val < r.lower_bound:
            ax.text(i, max(0, val) + max(upper_bounds) * 0.02, f"{val - r.lower_bound:.1f}",
                    ha="center", va="bottom", fontsize=8, color="#e74c3c", fontweight="bold")

    ax.set_xticks(x_pos)
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=9)
    ax.set_ylabel("条件数", fontsize=11)
    ax.set_title("矩阵条件数边界校验图（与 check_details.csv 同口径）", fontsize=12, fontweight="bold")
    ax.grid(axis="y", linestyle=":", alpha=0.6)

    legend_patches = [
        mpatches.Patch(color=STATUS_COLORS["valid_in_range"], label="内插·在界内"),
        mpatches.Patch(color=STATUS_COLORS["valid_near_boundary"], label="内插·接近边界"),
        mpatches.Patch(color=STATUS_COLORS["extrapolation_valid"], label="外推·在界内"),
        mpatches.Patch(color=STATUS_COLORS["extrapolation_near_boundary"], label="外推·接近边界"),
        mpatches.Patch(color=STATUS_COLORS["extrapolation_out_of_bound"], label="外推·越界"),
        mpatches.Patch(color=STATUS_COLORS["invalid_out_of_bound"], label="内插·越界"),
        mpatches.Patch(color=STATUS_COLORS["invalid_value"], label="数值无效"),
        mpatches.Patch(color="#e74c3c", label="上下界参考线", linestyle="--"),
    ]
    ax.legend(handles=legend_patches, loc="upper left", bbox_to_anchor=(1, 1), fontsize=8, framealpha=0.9)

    ax.set_ylim(bottom=0)

    plt.tight_layout()
    out_path = os.path.join(output_dir, "chart_condition_numbers.png")
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path


def _plot_violation_distribution(violations: List[ViolationRecord], output_dir: str) -> Optional[str]:
    if not violations:
        return None

    from collections import Counter
    type_counts = Counter(v.violation_type.value for v in violations)
    labels = list(type_counts.keys())
    sizes = list(type_counts.values())
    colors_list = ["#e74c3c", "#e67e22", "#c0392b", "#95a5a6", "#f39c12"]

    fig, ax = plt.subplots(figsize=(7, 6))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, autopct="%1.1f%%", startangle=90,
        colors=colors_list[:len(labels)], textprops={"fontsize": 10},
    )
    for autotext in autotexts:
        autotext.set_color("white")
        autotext.set_fontweight("bold")
    ax.set_title("违规类型分布", fontsize=12, fontweight="bold")
    ax.axis("equal")

    out_path = os.path.join(output_dir, "chart_violation_distribution.png")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path


def _plot_status_distribution(tracker: SourceTracker, output_dir: str) -> str:
    summary = tracker.status_summary()
    labels = list(summary.keys())
    values = list(summary.values())

    color_map = {
        "已处理": "#2ecc71",
        "待补材料": "#f39c12",
        "人工改判": "#9b59b6",
        "待处理": "#3498db",
        "已跳过": "#95a5a6",
        "处理异常": "#e74c3c",
    }
    bar_colors = [color_map.get(l, "#7f8c8d") for l in labels]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(labels, values, color=bar_colors, edgecolor="white")

    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(values) * 0.02,
                str(val), ha="center", va="bottom", fontweight="bold")

    ax.set_ylabel("条数")
    ax.set_title("处理状态分布", fontsize=12, fontweight="bold")
    ax.grid(axis="y", linestyle=":", alpha=0.5)
    ax.set_ylim(bottom=0)

    out_path = os.path.join(output_dir, "chart_status_distribution.png")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path


def _plot_extrapolation_vs_interpolation(results: List[CheckResult], output_dir: str) -> str:
    extrap = [r for r in results if r.is_extrapolated]
    interp = [r for r in results if not r.is_extrapolated]

    def count_states(rs):
        valid = sum(1 for r in rs if r.is_valid)
        invalid = len(rs) - valid
        near = sum(1 for r in rs if r.is_near_boundary and r.is_valid)
        return {"有效": valid, "越界": invalid, "临界": near}

    extrap_stats = count_states(extrap)
    interp_stats = count_states(interp)

    categories = ["有效", "越界", "临界"]
    extrap_vals = [extrap_stats[k] for k in categories]
    interp_vals = [interp_stats[k] for k in categories]

    fig, ax = plt.subplots(figsize=(8, 5))
    x = range(len(categories))
    width = 0.35

    bars1 = ax.bar([i - width / 2 for i in x], extrap_vals, width, label="外推", color="#3498db", edgecolor="white")
    bars2 = ax.bar([i + width / 2 for i in x], interp_vals, width, label="内插", color="#2ecc71", edgecolor="white")

    for bars in [bars1, bars2]:
        for bar in bars:
            if bar.get_height() > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                        str(int(bar.get_height())), ha="center", va="bottom", fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels(categories)
    ax.set_ylabel("条数")
    ax.set_title("外推 vs 内插 状态对比", fontsize=12, fontweight="bold")
    ax.legend()
    ax.grid(axis="y", linestyle=":", alpha=0.5)
    ax.set_ylim(bottom=0)

    out_path = os.path.join(output_dir, "chart_extrap_vs_interp.png")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out_path


def _generate_html_summary(
    chart_paths: Dict[str, str],
    output_dir: str,
    results: List[CheckResult],
    validator: BoundaryValidator,
    tracker: SourceTracker,
) -> str:
    out_path = os.path.join(output_dir, "charts_summary.html")

    def rel_path(p):
        return os.path.basename(p) if p else ""

    from .source_tracker import ProcessingStatus
    check_summary = {
        "总数": len(results),
        "有效": sum(1 for r in results if r.is_valid),
        "越界": sum(1 for r in results if not r.is_valid),
        "外推": sum(1 for r in results if r.is_extrapolated),
        "外推越界": sum(1 for r in results if r.is_extrapolated and not r.is_valid),
        "单位不一致": sum(
            1 for rec in tracker.records.values()
            if not rec.unit_consistent and rec.status != ProcessingStatus.SUPERSEDED
        ),
    }

    html_parts = [
        "<!DOCTYPE html>",
        "<html lang='zh-CN'><head><meta charset='UTF-8'>",
        "<title>矩阵条件数边界校验 · 图表与明细口径一致性验证</title>",
        "<style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;margin:20px;}",
        "h1{color:#2c3e50;border-bottom:2px solid #3498db;padding-bottom:8px;}",
        "h2{color:#2980b9;margin-top:30px;}",
        ".summary{background:#ecf0f1;padding:15px;border-radius:8px;margin:15px 0;}",
        ".summary span{display:inline-block;margin:5px 15px 5px 0;font-weight:bold;}",
        ".chart-box{margin:20px 0;padding:10px;border:1px solid #ddd;border-radius:8px;}",
        "img{max-width:100%;height:auto;border:1px solid #eee;border-radius:4px;}",
        ".consistency{background:#dff9fb;padding:12px;border-left:4px solid #2ecc71;margin:15px 0;}",
        "table{border-collapse:collapse;width:100%;margin:10px 0;font-size:12px;}",
        "th,td{border:1px solid #ddd;padding:6px;text-align:left;}",
        "th{background:#f8f9fa;}",
        ".ok{color:#27ae60;font-weight:bold;}",
        ".bad{color:#e74c3c;font-weight:bold;}",
        "</style></head><body>",
        "<h1>📊 矩阵条件数边界校验 · 图表与明细口径一致性验证</h1>",
        "<div class='consistency'>✅ <strong>口径一致性声明：</strong>本页所有图表与 <code>check_details.csv</code>、<code>violations.csv</code>、<code>timeline.*</code> 使用同一组 <code>CheckResult</code> 数据源渲染，确保图表和明细同一口径。</div>",
        "<div class='summary'>",
        "<h3>📈 校验概览</h3>",
    ]

    for k, v in check_summary.items():
        cls = "bad" if k in ("越界", "外推越界", "单位不一致") and v > 0 else "ok"
        html_parts.append(f"<span>{k}: <span class='{cls}'>{v}</span></span>")
    html_parts.append("</div>")

    for key, path in chart_paths.items():
        if not path or path.endswith(".html"):
            continue
        title_map = {
            "condition_number_chart": "图1：各矩阵条件数与边界对比（核心校验图）",
            "violation_distribution": "图2：违规类型分布",
            "status_distribution": "图3：处理状态分布",
            "extrapolation_chart": "图4：外推 vs 内插 状态对比",
        }
        title = title_map.get(key, key)
        html_parts.append(f"<div class='chart-box'><h2>{title}</h2>")
        html_parts.append(f"<img src='{rel_path(path)}' alt='{title}'>")
        html_parts.append(f"<p style='color:#7f8c8d;font-size:12px;'>图片文件：{rel_path(path)}</p></div>")

    html_parts.append("<h2>📋 明细抽样（与 check_details.csv 同源，验证口径）</h2>")
    html_parts.append("<table><tr><th>矩阵</th><th>来源行</th><th>条件数</th><th>区间</th><th>外推</th><th>是否通过</th><th>处理状态</th></tr>")

    for r in results:
        rec = tracker.get_record(r.source_file, r.source_line, r.matrix_name)
        status_val = rec.status.value if rec else ""
        cls = "ok" if r.is_valid else "bad"
        pass_val = "✅ 通过" if r.is_valid else "❌ 未通过"
        html_parts.append(
            f"<tr><td>{r.matrix_name}</td><td>{r.source_file} L{r.source_line}</td>"
            f"<td>{r.condition_number}</td><td>[{r.lower_bound}, {r.upper_bound}]</td>"
            f"<td>{'是' if r.is_extrapolated else '否'}</td>"
            f"<td class='{cls}'>{pass_val}</td><td>{status_val}</td></tr>"
        )
    html_parts.append("</table>")

    if validator.violations:
        html_parts.append("<h2>⚠️ 违规明细（与 violations.csv 同源）</h2>")
        html_parts.append("<table><tr><th>违规ID</th><th>矩阵</th><th>类型</th><th>严重程度</th><th>来源行</th><th>描述</th></tr>")
        for v in validator.violations:
            html_parts.append(
                f"<tr><td>{v.violation_id}</td><td>{v.matrix_name}</td>"
                f"<td>{v.violation_type.value}</td><td>{v.severity}</td>"
                f"<td>{v.source_file} L{v.source_line}</td><td>{v.description}</td></tr>"
            )
        html_parts.append("</table>")

    html_parts.append("<h2>🔍 图表 ↔ 明细 核对清单</h2>")
    html_parts.append("<ul>")
    html_parts.append("<li>图1每个柱状图的数值、颜色、上下界参考线 ↔ check_details.csv 每一行的条件数、是否通过、是否外推</li>")
    html_parts.append("<li>图2饼图各类型计数 ↔ violations.csv 按违规类型 group by 的 count</li>")
    html_parts.append("<li>图3处理状态分布 ↔ timeline.txt 末尾总计数字</li>")
    html_parts.append("<li>图4外推/内插对比 ↔ check_details.csv 按『是否外推』+『是否通过』交叉统计</li>")
    html_parts.append("</ul>")

    html_parts.append("<p style='color:#7f8c8d;margin-top:30px;'>本页由 matrix_cond_check 自动生成。</p>")
    html_parts.append("</body></html>")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html_parts))
    return out_path


def _generate_html_placeholder(output_dir: str, message: str) -> str:
    out_path = os.path.join(output_dir, "charts_summary.html")
    html = f"""<!DOCTYPE html>
<html lang='zh-CN'><head><meta charset='UTF-8'>
<title>图表生成提示</title>
<style>body{{font-family:sans-serif;margin:40px;}} .warn{{background:#fff3cd;padding:20px;border-left:4px solid #ffc107;border-radius:4px;}}</style>
</head><body>
<div class='warn'>
<h2>⚠️  {message}</h2>
<p>安装命令：<code>pip install matplotlib</code> 或 <code>pip install -r requirements.txt</code></p>
<p>安装完成后重新运行即可生成 PNG 图表。</p>
</div></body></html>"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path
