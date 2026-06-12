"""
复核报告生成
==============
复核最怕只剩结论，因此把：参数版本、异常点、解释、后补说明、历史答案都放在同一页。
"""
import os
import datetime
from typing import Dict

from .params import PARAM_VERSION, PARAM_CHANGELOG


SEPARATOR = "=" * 78
SUB_SEP = "-" * 78


def _df_to_table(df, max_rows=50) -> str:
    if df is None or len(df) == 0:
        return "  (无记录)\n"
    return df.to_string(index=False, max_rows=max_rows) + "\n"


def build_report_text(result: Dict) -> str:
    p = result["params_snapshot"]
    lines = []

    lines.append(SEPARATOR)
    lines.append("组合计数批量验算 复核报告")
    lines.append(f"生成时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(SEPARATOR)

    lines.append("")
    lines.append("【1】参数版本")
    lines.append(SUB_SEP)
    lines.append(f"  param_version = {p['param_version']}")
    lines.append(f"  combo_dimensions = {p['combo_dimensions']}")
    lines.append(
        f"  extrapolation_relative_delta = {p['extrapolation_relative_delta']} "
        f"(上下浮动阈值 {p['extrapolation_relative_delta']*100:.0f}%)"
    )
    lines.append(
        f"  extrapolation bounds = [{p['extrapolation_lower_bound']}, {p['extrapolation_upper_bound']}]"
    )
    lines.append(
        f"  count tolerance = abs<={p['count_absolute_tolerance']} "
        f"or rel<={p['count_relative_tolerance']*100:.1f}%"
    )
    lines.append("  变更日志：")
    for ver, log in PARAM_CHANGELOG.items():
        lines.append(f"    - {ver}: {log}")

    lines.append("")
    lines.append("【2】汇总结论")
    lines.append(SUB_SEP)
    total = len(result["current"])
    normal_pass = (
        result["check_result"]["check_passed"].sum()
        if "check_passed" in result["check_result"].columns else 0
    )
    lines.append(f"  总记录数          : {total}")
    lines.append(f"  外推越界(已拎出)   : {len(result['outlier_keys'])} -> {result['outlier_keys']}")
    lines.append(f"  正常范围内通过     : {int(normal_pass)}")
    lines.append(f"  正常范围内不通过   : {len(result['failed_keys'])} -> {result['failed_keys']}")

    lines.append("")
    lines.append("【3】外推越界明细（单独拎出，未并入正常结果）")
    lines.append(SUB_SEP)
    out_cols = ["combo_key", "current_count", "historical_count",
                "extrapolation_flag", "outlier_reason", "note"]
    outliers_show = result["outliers"].copy()
    for c in out_cols:
        if c not in outliers_show.columns:
            outliers_show[c] = ""
    lines.append(_df_to_table(outliers_show[out_cols]))

    lines.append("")
    lines.append("【4】组合计数一致性校验明细")
    lines.append(SUB_SEP)
    check_cols = ["combo_key", "historical_count", "current_count",
                  "count_diff", "count_diff_ratio", "check_passed", "fail_reason"]
    check_show = result["check_result"].copy()
    for c in check_cols:
        if c not in check_show.columns:
            check_show[c] = ""
    check_show["count_diff_ratio"] = check_show["count_diff_ratio"].map(
        lambda x: f"{x*100:.2f}%" if isinstance(x, (int, float)) else x
    )
    lines.append(_df_to_table(check_show[check_cols]))

    lines.append("")
    lines.append("【5】历史答案参考（含旧说法来源，可追溯）")
    lines.append(SUB_SEP)
    hist_cols = ["combo_key", "historical_count", "answer_version",
                 "answered_by", "answered_at", "note"]
    hist_show = result["history"].copy()
    for c in hist_cols:
        if c not in hist_show.columns:
            hist_show[c] = ""
    lines.append(_df_to_table(hist_show[hist_cols]))

    lines.append("")
    lines.append("【6】后补说明")
    lines.append(SUB_SEP)
    if len(result["notes"]) == 0:
        lines.append("  (无后补说明)")
    else:
        lines.append(_df_to_table(result["notes"]))

    lines.append("")
    lines.append(SEPARATOR)
    lines.append("报告结束。所有明细可回溯：参数 -> 异常点 -> 解释 -> 历史 -> 后补说明")
    lines.append(SEPARATOR)
    return "\n".join(lines)


def write_report(result: Dict, output_dir: str, filename: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    text = build_report_text(result)
    path = os.path.join(output_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def write_outliers_csv(result: Dict, output_dir: str, filename: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, filename)
    result["outliers"].to_csv(path, index=False, encoding="utf-8")
    return path
