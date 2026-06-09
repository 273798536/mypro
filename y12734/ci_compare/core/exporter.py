"""结果导出模块

导出运营友好的 Excel 报告，特点：
1. 所有 Sheet 的数据均来自同一份 ComparisonSummary，确保口径一致
2. 近似误差过大的记录会被红色标注，并在"说明"Sheet 中解释原因
3. 异常按"需补材料 / 需改口径"分类列出，附处理建议
4. 即使只看导出报告，也能理解为什么某些结果被拦截
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

from .models import (
    ComparisonSummary,
    CI_METHOD,
    ANOMALY_TYPE,
    ANOMALY_SEVERITY,
)
from .ci_engine import results_to_pivot


EXPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)


def _ci_results_to_dataframe(summary: ComparisonSummary) -> pd.DataFrame:
    """置信区间对比表（宽表：每行一个分组，每列一个口径的上下限）"""
    pivot = results_to_pivot(summary.ci_results)
    blocked_groups = {
        e.group_key for e in summary.error_analyses if e.is_approx_error_too_large
    }
    affected_groups = set(summary.diff.affected_groups) if summary.diff else set()

    rows = []
    for group_key in sorted(pivot.keys()):
        methods = pivot[group_key]
        first = list(methods.values())[0]
        row = {
            "分组": group_key,
            "样本量 n": first["n"],
            "正确数 k": first["k"],
            "正确率 p": round(first["p"], 4),
            "近似误差拦截": "是" if group_key in blocked_groups else "否",
            "本次是否更新": "是" if group_key in affected_groups else "否",
        }
        for method in CI_METHOD:
            m = methods.get(method.value)
            if m:
                row[f"{method.display_name} 下限"] = round(m["lower"], 4)
                row[f"{method.display_name} 上限"] = round(m["upper"], 4)
                row[f"{method.display_name} 宽度"] = round(m["width"], 4)
        rows.append(row)

    return pd.DataFrame(rows)


def _anomalies_to_dataframe(summary: ComparisonSummary) -> pd.DataFrame:
    """异常清单"""
    rows = []
    for a in summary.anomalies:
        rows.append({
            "异常类型": a.anomaly_type.display_name,
            "下一步操作": a.anomaly_type.action_hint,
            "严重程度": a.severity.value,
            "标题": a.title,
            "详细说明": a.description,
            "关联分组": a.group_key or "（全局）",
            "受影响口径": "、".join(m.display_name for m in a.affected_methods) or "所有口径",
        })
    if not rows:
        rows.append({
            "异常类型": "无",
            "下一步操作": "——",
            "严重程度": "info",
            "标题": "未检测到异常",
            "详细说明": "当前数据未发现需要处理的异常。",
            "关联分组": "——",
            "受影响口径": "——",
        })
    return pd.DataFrame(rows)


def _error_analysis_to_dataframe(summary: ComparisonSummary) -> pd.DataFrame:
    """近似误差分析表"""
    rows = []
    for e in summary.error_analyses:
        rows.append({
            "分组": e.group_key,
            "参考口径": e.reference_method.display_name,
            "近似口径": e.approx_method.display_name,
            "下限差异": round(e.lower_diff, 4),
            "上限差异": round(e.upper_diff, 4),
            "宽度差异": round(e.width_diff, 4),
            "判定阈值": e.threshold,
            "是否超过阈值": "是" if e.is_approx_error_too_large else "否",
            "是否拦截": "✓ 已拦截" if e.is_approx_error_too_large else "— 正常",
        })
    return pd.DataFrame(rows)


def _counter_examples_to_dataframe(summary: ComparisonSummary) -> pd.DataFrame:
    """反例清单"""
    rows = []
    for ce in summary.counter_examples:
        rows.append({
            "分组": ce.group_key,
            "影响级别": ce.impact_level,
            "描述": ce.description,
            "各口径结果": " | ".join(
                f"{m}: [{v.get('lower', '?'):.3f}, {v.get('upper', '?'):.3f}] (p={v.get('p', '?'):.3f}, n={v.get('n', '?')})"
                for m, v in ce.method_results.items()
            ),
        })
    if not rows:
        rows.append({
            "分组": "——",
            "影响级别": "——",
            "描述": "未发现口径结论分歧的反例",
            "各口径结果": "——",
        })
    return pd.DataFrame(rows)


def _overview_to_dataframe(summary: ComparisonSummary) -> pd.DataFrame:
    """总览统计"""
    n_answers = len(summary.answers)
    n_rated = sum(1 for a in summary.answers if a.is_correct is not None)
    n_groups = len({r.group_key for r in summary.ci_results})
    n_anomalies = len(summary.anomalies)
    n_need_material = sum(1 for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_MATERIAL)
    n_need_method = sum(1 for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_METHOD)
    n_blocked = sum(1 for e in summary.error_analyses if e.is_approx_error_too_large)
    n_counter = len(summary.counter_examples)

    data = [
        ("数据来源", summary.snapshot.source_name or "（未命名）"),
        ("快照 ID", summary.snapshot.snapshot_id),
        ("生成时间", summary.generated_at.strftime("%Y-%m-%d %H:%M:%S")),
        ("答题记录总数", n_answers),
        ("已评分记录数", n_rated),
        ("未评分记录数", n_answers - n_rated),
        ("分组数量", n_groups),
        ("异常总数", n_anomalies),
        ("  其中：需补材料", n_need_material),
        ("  其中：需改口径", n_need_method),
        ("近似误差过大（已拦截）", n_blocked),
        ("口径结论反例数", n_counter),
    ]
    if summary.previous_snapshot and summary.diff and summary.diff.has_changes:
        data += [
            ("", ""),
            ("对比上一快照", ""),
            ("  上一快照 ID", summary.previous_snapshot.snapshot_id),
            ("  新增记录", len(summary.diff.added_records)),
            ("  删除记录", len(summary.diff.removed_records)),
            ("  评分更新记录", len(summary.diff.updated_records)),
            ("  受影响分组数", len(summary.diff.affected_groups)),
        ]

    return pd.DataFrame(data, columns=["项目", "值"])


def _explanation_dataframe() -> pd.DataFrame:
    """给运营同事看的说明表"""
    data = [
        ("📌 关于置信区间口径",
         "本报告同时展示三种口径的置信区间。Wilson 得分区间为推荐口径，"
         "Clopper-Pearson 为保守精确口径，正态近似区间仅适用于大样本。"),
        ("📌 为什么有些结果标红（近似误差拦截）",
         "当正态近似区间相对于参考口径（Clopper-Pearson）的宽度差异超过 5% 时，"
         "该分组的正态近似结果会被标红拦截。这是因为小样本或极端概率下，"
         "正态近似的假设不成立，结果不可靠。请以 Wilson 或 Clopper-Pearson 口径为准。"),
        ("📌 异常类型说明",
         "需补材料 → 答题记录或评分缺失，补充数据后重算即可；"
         "需改口径 → 方法选择或参数阈值问题，需评估切换口径或调整判定标准。"),
        ("📌 本次是否更新列",
         '如果本次导入相对上一次有新增/修改记录，受影响的分组会标注为"是"，'
         "便于快速定位哪些结论可能发生了变化。"),
    ]
    return pd.DataFrame(data, columns=["主题", "说明"])


def export_excel(
    summary: ComparisonSummary,
    output_path: Optional[str | Path] = None,
) -> Path:
    """导出完整的 Excel 报告

    Args:
        summary: 对比汇总结果
        output_path: 输出文件路径，默认自动生成到 exports/ 目录

    Returns:
        输出文件路径
    """
    if output_path is None:
        ts = summary.generated_at.strftime("%Y%m%d_%H%M%S")
        output_path = EXPORTS_DIR / f"置信区间口径对比_{summary.snapshot.snapshot_id}_{ts}.xlsx"
    output_path = Path(output_path)

    blocked_groups = {
        e.group_key for e in summary.error_analyses if e.is_approx_error_too_large
    }

    with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
        wb = writer.book
        fmt_header = wb.add_format({
            "bold": True, "bg_color": "#4472C4", "font_color": "white",
            "border": 1, "align": "center", "valign": "vcenter",
        })
        fmt_red = wb.add_format({"bg_color": "#FFC7CE", "font_color": "#9C0006"})
        fmt_yellow = wb.add_format({"bg_color": "#FFEB9C", "font_color": "#9C5700"})
        fmt_green = wb.add_format({"bg_color": "#C6EFCE", "font_color": "#006100"})
        fmt_wrap = wb.add_format({"text_wrap": True, "valign": "top"})

        # 1. 总览
        df_overview = _overview_to_dataframe(summary)
        df_overview.to_excel(writer, sheet_name="总览", index=False)
        ws = writer.sheets["总览"]
        ws.set_column("A:A", 25)
        ws.set_column("B:B", 40)
        for row_idx in range(1, len(df_overview) + 1):
            ws.write(row_idx, 0, df_overview.iloc[row_idx - 1, 0], fmt_header if row_idx == 1 else None)

        # 2. 口径对比明细
        df_ci = _ci_results_to_dataframe(summary)
        df_ci.to_excel(writer, sheet_name="口径对比明细", index=False)
        ws = writer.sheets["口径对比明细"]
        for col_idx, col_name in enumerate(df_ci.columns):
            ws.write(0, col_idx, col_name, fmt_header)
        ws.set_column("A:A", 18)
        ws.set_column("B:E", 12)
        ws.set_column("F:Z", 18)

        block_col_idx = list(df_ci.columns).index("近似误差拦截")
        updated_col_idx = list(df_ci.columns).index("本次是否更新")
        for row_idx, row in df_ci.iterrows():
            excel_row = row_idx + 1
            if row["近似误差拦截"] == "是":
                ws.set_row(excel_row, None, fmt_red)
            if row["本次是否更新"] == "是" and row["近似误差拦截"] != "是":
                ws.set_row(excel_row, None, fmt_yellow)

        # 3. 异常清单
        df_anom = _anomalies_to_dataframe(summary)
        df_anom.to_excel(writer, sheet_name="异常清单", index=False)
        ws = writer.sheets["异常清单"]
        for col_idx, col_name in enumerate(df_anom.columns):
            ws.write(0, col_idx, col_name, fmt_header)
        ws.set_column("A:B", 15)
        ws.set_column("C:C", 12)
        ws.set_column("D:D", 30)
        ws.set_column("E:E", 80, fmt_wrap)
        ws.set_column("F:G", 20)

        type_col_idx = list(df_anom.columns).index("异常类型")
        sev_col_idx = list(df_anom.columns).index("严重程度")
        for row_idx, row in df_anom.iterrows():
            excel_row = row_idx + 1
            if row["异常类型"] == "需补材料":
                ws.write(excel_row, type_col_idx, row["异常类型"], fmt_yellow)
            elif row["异常类型"] == "需改口径":
                ws.write(excel_row, type_col_idx, row["异常类型"], fmt_red)
            if row["严重程度"] == "critical":
                ws.write(excel_row, sev_col_idx, row["严重程度"], fmt_red)
            elif row["严重程度"] == "warning":
                ws.write(excel_row, sev_col_idx, row["严重程度"], fmt_yellow)
            elif row["严重程度"] == "info":
                ws.write(excel_row, sev_col_idx, row["严重程度"], fmt_green)

        # 4. 近似误差分析
        df_err = _error_analysis_to_dataframe(summary)
        df_err.to_excel(writer, sheet_name="近似误差分析", index=False)
        ws = writer.sheets["近似误差分析"]
        for col_idx, col_name in enumerate(df_err.columns):
            ws.write(0, col_idx, col_name, fmt_header)
        ws.set_column("A:B", 15)
        ws.set_column("C:H", 15)
        over_col_idx = list(df_err.columns).index("是否超过阈值")
        for row_idx, row in df_err.iterrows():
            excel_row = row_idx + 1
            if row["是否超过阈值"] == "是":
                ws.set_row(excel_row, None, fmt_red)

        # 5. 反例清单
        df_ce = _counter_examples_to_dataframe(summary)
        df_ce.to_excel(writer, sheet_name="反例清单", index=False)
        ws = writer.sheets["反例清单"]
        for col_idx, col_name in enumerate(df_ce.columns):
            ws.write(0, col_idx, col_name, fmt_header)
        ws.set_column("A:A", 18)
        ws.set_column("B:B", 12)
        ws.set_column("C:C", 80, fmt_wrap)
        ws.set_column("D:D", 80, fmt_wrap)

        # 6. 说明（给运营看）
        df_exp = _explanation_dataframe()
        df_exp.to_excel(writer, sheet_name="说明", index=False)
        ws = writer.sheets["说明"]
        ws.set_column("A:A", 30)
        ws.set_column("B:B", 100, fmt_wrap)
        for col_idx, col_name in enumerate(df_exp.columns):
            ws.write(0, col_idx, col_name, fmt_header)

    return output_path
