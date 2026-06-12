import os
import time
from typing import List, Dict, Any, Optional
from convex_hull import HullResult
from sort_instability import InstabilityRecord
from draft_tracker import DraftTracker, SessionRecord


def _fmt_float(v: float, precision: int = 6) -> str:
    return f"{v:.{precision}f}"


def _fmt_time(ts: float) -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))


def generate_report(
    tracker: DraftTracker,
    hull_result: Optional[HullResult] = None,
    unstable_records: Optional[List[InstabilityRecord]] = None,
    stable_records: Optional[List[InstabilityRecord]] = None,
    comparison: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
) -> str:
    lines: List[str] = []
    lines.append("# 凸包面积图表解释报告")
    lines.append("")
    lines.append(f"生成时间: {_fmt_time(time.time())}")
    if session_id:
        lines.append(f"会话ID: {session_id}")
    lines.append("")

    if hull_result:
        lines.append("## 计算参数")
        lines.append("")
        for k, v in hull_result.parameters.items():
            lines.append(f"- **{k}**: {v}")
        lines.append("")

        lines.append("## 计算结果")
        lines.append("")
        lines.append(f"- 凸包面积: **{_fmt_float(hull_result.area)} {hull_result.area_unit}²**")
        if hull_result.area_converted is not None:
            lines.append(
                f"- 换算面积: **{_fmt_float(hull_result.area_converted)} "
                f"{hull_result.converted_unit}²** (换算系数: {hull_result.conversion_factor})"
            )
        lines.append(f"- 凸包顶点数: {len(hull_result.hull)}")
        lines.append(f"- 排序顺序: {hull_result.sort_order}")
        lines.append("")

        if hull_result.hull:
            lines.append("### 凸包顶点坐标")
            lines.append("")
            lines.append("| 序号 | X | Y |")
            lines.append("|------|------|------|")
            for i, (x, y) in enumerate(hull_result.hull):
                lines.append(f"| {i} | {_fmt_float(x)} | {_fmt_float(y)} |")
            lines.append("")

        if hull_result.failures:
            lines.append("### ⚠️ 计算失败/异常")
            lines.append("")
            for f in hull_result.failures:
                lines.append(f"- **{f['reason']}**: {f['detail']}")
            lines.append("")

        lines.append("## 中间计算过程")
        lines.append("")
        for step in hull_result.intermediate_steps:
            if step["step"] == "cross_product":
                pts = step.get("check_points", [])
                idxs = step.get("check_indices", [])
                lines.append(
                    f"- 叉积检查 点{idxs}: 值={_fmt_float(step['cross_value'], 9)}, "
                    f"判定={step['decision']}"
                )
            elif step["step"] == "collinear_detection":
                lines.append(
                    f"- 共线检测 组#{step['group_index']}: "
                    f"点索引={step['point_indices']}, 极角={_fmt_float(step['angle'], 9)}, "
                    f"共{step['count']}点"
                )
            elif step["step"] == "area_computation":
                lines.append(f"- 面积计算 (Shoelace公式):")
                lines.append(f"  - 原始绝对和: {_fmt_float(step['raw_abs_sum'])}")
                lines.append(f"  - 最终面积: {_fmt_float(step['final_area'])} {step['unit']}²")
                lines.append("")
                lines.append("  | i | j | xᵢ | yᵢ | xⱼ | yⱼ | 交叉项 | 累计和 |")
                lines.append("  |---|---|-----|-----|-----|-----|--------|--------|")
                for t in step["terms"]:
                    lines.append(
                        f"  | {t['i']} | {t['j']} | {_fmt_float(t['xi'])} "
                        f"| {_fmt_float(t['yi'])} | {_fmt_float(t['xj'])} "
                        f"| {_fmt_float(t['yj'])} | {_fmt_float(t['term'])} "
                        f"| {_fmt_float(t['running_sum'])} |"
                    )
                lines.append("")
            elif step["step"] == "unit_conversion":
                lines.append(f"- 单位换算:")
                lines.append(f"  - {step['from_unit']} → {step['to_unit']}")
                lines.append(f"  - 线性系数: {step['linear_factor']}")
                lines.append(f"  - 面积系数: {step['area_factor']}")
                lines.append(
                    f"  - {_fmt_float(step['original_area'])} {step['from_unit']}² "
                    f"= {_fmt_float(step['converted_area'])} {step['to_unit']}²"
                )
                lines.append("")

    if unstable_records:
        lines.append("## 🔴 排序不稳定记录（单独列出）")
        lines.append("")
        lines.append("> 以下记录涉及排序不稳定问题，不应与正常结果混同。")
        lines.append("")
        for i, rec in enumerate(unstable_records):
            lines.append(f"### 不稳定 #{i + 1}: {rec.category}")
            lines.append(f"- 点索引: {rec.point_indices}")
            lines.append(f"- 详情: {rec.detail}")
            lines.append(f"- {rec.metric_name}: {_fmt_float(rec.metric, 9)}")
            lines.append("")

    if stable_records:
        lines.append("## ✅ 稳定判定记录")
        lines.append("")
        for i, rec in enumerate(stable_records):
            lines.append(f"- **{rec.category}**: 点{rec.point_indices}, {rec.metric_name}={_fmt_float(rec.metric, 9)}")
        lines.append("")

    if comparison:
        lines.append("## 参数对照")
        lines.append("")
        lines.append(f"- 会话A: {comparison['session_a']}")
        lines.append(f"- 会话B: {comparison['session_b']}")
        lines.append("")
        if comparison["param_diff"]:
            lines.append("### 差异参数")
            lines.append("")
            lines.append("| 参数 | 会话A | 会话B |")
            lines.append("|------|-------|-------|")
            for k, diff in comparison["param_diff"].items():
                lines.append(f"| {k} | {diff['a']} | {diff['b']} |")
            lines.append("")
        else:
            lines.append("参数完全一致。")
            lines.append("")
        if comparison.get("area_diff"):
            ad = comparison["area_diff"]
            lines.append("### 面积差异")
            lines.append("")
            lines.append(f"| 指标 | 值 |")
            lines.append("|------|------|")
            lines.append(f"| 会话A面积 | {_fmt_float(ad['a'])} |")
            lines.append(f"| 会话B面积 | {_fmt_float(ad['b'])} |")
            lines.append(f"| 差值 | {_fmt_float(ad['delta'])} |")
            ratio_str = _fmt_float(ad["ratio"]) if ad["ratio"] is not None else "N/A"
            lines.append(f"| 比值(B/A) | {ratio_str} |")
            lines.append("")

    processed = []
    pending = []
    manual = []

    for sid, rec in tracker.sessions.items():
        if rec.status == "processed":
            processed.append(rec)
        elif rec.status == "pending":
            pending.append(rec)
        elif rec.status == "manual_override":
            manual.append(rec)

    lines.append("## 已处理")
    lines.append("")
    if processed:
        lines.append("| 会话ID | 创建时间 | 面积 | 单位 |")
        lines.append("|--------|----------|------|------|")
        for rec in processed:
            area_str = _fmt_float(rec.hull_result.area) if rec.hull_result else "N/A"
            unit_str = rec.hull_result.area_unit if rec.hull_result else ""
            lines.append(f"| {rec.session_id} | {_fmt_time(rec.created_at)} | {area_str} | {unit_str} |")
    else:
        lines.append("无")
    lines.append("")

    lines.append("## 待补材料")
    lines.append("")
    if pending:
        for rec in pending:
            lines.append(f"### 会话 {rec.session_id}")
            lines.append(f"- 创建时间: {_fmt_time(rec.created_at)}")
            if rec.hull_result and rec.hull_result.failures:
                lines.append("- 失败原因:")
                for f in rec.hull_result.failures:
                    lines.append(f"  - {f['reason']}: {f['detail']}")
            if rec.draft_notes:
                lines.append("- 草稿备注:")
                for dn in rec.draft_notes:
                    lines.append(f"  - [{_fmt_time(dn.timestamp)}] {dn.note}")
                    if dn.judgments_changed:
                        lines.append(f"    - 影响判断: {', '.join(dn.judgments_changed)}")
            lines.append("")
    else:
        lines.append("无")
    lines.append("")

    lines.append("## 人工改判")
    lines.append("")
    if manual:
        for rec in manual:
            lines.append(f"### 会话 {rec.session_id}")
            lines.append(f"- 创建时间: {_fmt_time(rec.created_at)}")
            lines.append(f"- 改判原因: {rec.manual_override}")
            if rec.hull_result:
                lines.append(
                    f"- 原计算面积: {_fmt_float(rec.hull_result.area)} {rec.hull_result.area_unit}²"
                )
            if rec.draft_notes:
                lines.append("- 草稿备注:")
                for dn in rec.draft_notes:
                    lines.append(f"  - [{_fmt_time(dn.timestamp)}] {dn.note}")
                    if dn.judgments_changed:
                        lines.append(f"    - 影响判断: {', '.join(dn.judgments_changed)}")
            lines.append("")
    else:
        lines.append("无")
    lines.append("")

    return "\n".join(lines)


def save_report(content: str, path: str) -> str:
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path
