from typing import Optional
from datetime import datetime

from .models import DriftSnapshot, GrayDecomposition, DriftStatus
from .snapshot_manager import SnapshotManager
from .gray_analyzer import GrayAnalyzer


STATUS_ICON = {
    DriftStatus.NORMAL: "✓",
    DriftStatus.WARNING: "⚠",
    DriftStatus.DRIFTED: "✗",
    DriftStatus.GRAY: "?"
}


def _hr(width: int = 60) -> str:
    return "─" * width


def format_snapshot_report(snapshot: DriftSnapshot,
                           manager: Optional[SnapshotManager] = None,
                           compare_version: Optional[str] = None) -> str:
    lines = []
    lines.append(_hr())
    lines.append(f"  漂移监控版本快照")
    lines.append(_hr())
    lines.append(f"  Run ID    : {snapshot.run_id}")
    lines.append(f"  版本号     : v{snapshot.version}")
    lines.append(f"  生成时间   : {snapshot.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  样本总量   : {snapshot.sample_count}")
    lines.append(f"  最终结论   : {STATUS_ICON.get(snapshot.final_status(), '?')} "
                 f"{snapshot.final_status().value.upper()}")
    lines.append(f"  原始结论   : {STATUS_ICON.get(snapshot.overall_status, '?')} "
                 f"{snapshot.overall_status.value.upper()}")
    if snapshot.is_gray:
        lines.append(f"  ⚑ 灰度结果 : 是")
    if snapshot.duplicate_run_ids:
        lines.append(f"  ⚠ 重复记录  : {len(snapshot.duplicate_run_ids)} 条 "
                     f"(已自动去重)")
    lines.append(_hr())

    lines.append("")
    lines.append("  【特征快照】")
    lines.append(f"  {'特征':<18} {'PSI':>7} {'KS':>7} {'状态':<10} {'样本数':>6} {'备注'}")
    lines.append("  " + _hr(56))

    for fd in snapshot.feature_drifts:
        status_icon = STATUS_ICON.get(fd.status, "?")
        note = fd.note or ""
        if fd.current_stats.sample_count < snapshot.params.threshold.min_samples:
            note = (note + " 小样本").strip()
        lines.append(f"  {fd.feature_name:<18} "
                     f"{fd.psi:>7.4f} {fd.ks_stat:>7.4f} "
                     f"{status_icon} {fd.status.value:<8} "
                     f"{fd.current_stats.sample_count:>6} {note}")

    lines.append("")
    lines.append("  【边界样本】(p5 以下 / p95 以上)")
    has_boundary = False
    for fd in snapshot.feature_drifts:
        bs = fd.current_stats.boundary_samples
        if not bs:
            continue
        has_boundary = True
        lines.append(f"  ▸ {fd.feature_name}:")
        for b in bs[:4]:
            tag = "低" if b["position"] == "low" else "高"
            dev = b["deviation_from_p50"]
            sign = "+" if dev >= 0 else ""
            lines.append(f"      [{tag}] 值={b['value']:.4f}  偏离中位数={sign}{dev:.4f}")
    if not has_boundary:
        lines.append("    (无边界样本)")

    lines.append("")
    lines.append("  【参数配置】")
    t = snapshot.params.threshold
    lines.append(f"    PSI  预警={t.psi_warning}  漂移={t.psi_drift}")
    lines.append(f"    KS   预警={t.ks_warning}  漂移={t.ks_drift}")
    lines.append(f"    最少样本数 = {t.min_samples}")
    if snapshot.params.extra_params:
        for k, v in snapshot.params.extra_params.items():
            lines.append(f"    {k} = {v}")

    if compare_version and manager is not None:
        lines.append("")
        lines.append(f"  【对比 v{compare_version} → v{snapshot.version}】")
        try:
            diffs = manager.compare_params(snapshot.run_id, compare_version, snapshot.version)
            changes = manager.compare_results(snapshot.run_id, compare_version, snapshot.version)

            if diffs:
                lines.append("    参数变化:")
                for k, v in diffs.items():
                    lines.append(f"      {k}: {v['from']} → {v['to']}")
            else:
                lines.append("    参数变化: (无)")

            if changes.get("overall_status", {}).get("changed"):
                lines.append(f"    总体结论: "
                             f"{changes['overall_status']['from']} → "
                             f"{changes['overall_status']['to']}")

            feat_changes = changes.get("features", {})
            if feat_changes:
                lines.append("    特征变化:")
                for fname, fc in feat_changes.items():
                    if "status" in fc:
                        lines.append(f"      {fname} 状态: "
                                     f"{fc['status']['from']} → {fc['status']['to']}")
                    if "psi" in fc:
                        lines.append(f"      {fname} PSI:  "
                                     f"{fc['psi']['from']} → {fc['psi']['to']}")
        except Exception as e:
            lines.append(f"    (对比失败: {e})")

    if snapshot.human_judgments:
        lines.append("")
        lines.append("  【人工改判历史】")
        for i, hj in enumerate(snapshot.human_judgments, 1):
            lines.append(f"    [{i}] {hj.timestamp.strftime('%H:%M:%S')} "
                         f"{hj.judge}: {hj.original_status.value} → {hj.new_status.value}")
            lines.append(f"        理由: {hj.reason}")

    if snapshot.notes:
        lines.append("")
        lines.append("  【后补说明】")
        for n in snapshot.notes:
            lines.append(f"    • {n}")

    if manager is not None:
        history = manager.get_history(snapshot.run_id, snapshot.version)
        if history:
            lines.append("")
            lines.append("  【完整操作轨迹】")
            for r in history:
                ts = r["timestamp"].strftime("%H:%M:%S") if hasattr(r["timestamp"], "strftime") else str(r["timestamp"])
                if r["type"] == "audit":
                    lines.append(f"    {ts} {r['operator']} 修改 "
                                 f"{r['field']}: {r['old_value']} → {r['new_value']}")
                    if r.get("note"):
                        lines.append(f"      备注: {r['note']}")

    lines.append("")
    lines.append(_hr())
    return "\n".join(lines)


def format_gray_decomposition(decomp: GrayDecomposition) -> str:
    lines = []
    lines.append(_hr())
    lines.append(f"  灰度结果拆解报告")
    lines.append(_hr())
    lines.append(f"  基线: {decomp.baseline_snapshot}")
    lines.append(f"  当前: {decomp.current_snapshot}")
    lines.append(_hr())

    lines.append("")
    lines.append("  ① 样本变化影响")
    sc = {k: v for k, v in decomp.sample_change_effect.items() if v != DriftStatus.NORMAL}
    if sc:
        for fname, status in sc.items():
            lines.append(f"    {fname}: 变化为 {status.value}")
    else:
        lines.append("    (无显著样本变化影响)")

    lines.append("")
    lines.append("  ② 阈值变化影响")
    if decomp.threshold_change_effect:
        for fname, status in decomp.threshold_change_effect.items():
            lines.append(f"    {fname}: 阈值变化后为 {status.value}")
    else:
        lines.append("    (无阈值变化影响)")

    lines.append("")
    lines.append("  ③ 人工改判影响")
    if decomp.human_judgment_effect:
        for key, info in decomp.human_judgment_effect.items():
            lines.append(f"    {info['judge']}: {info['from']} → {info['to']}")
            lines.append(f"      理由: {info['reason']}")
    else:
        lines.append("    (无人工改判)")

    lines.append("")
    lines.append(_hr())
    return "\n".join(lines)
