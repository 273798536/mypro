import os
import json
import html
from typing import List, Optional

from .models import ProcessedRecord, RunConfig, TerminalSummary, ConfirmationRequest


def _dump_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, default=str)


def export_json_report(
    records: List[ProcessedRecord],
    summary: TerminalSummary,
    confirms: List[ConfirmationRequest],
    config: RunConfig,
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "torque_warning_report.json")

    data = {
        "run_config": {
            "input_dir": config.input_dir,
            "output_dir": config.output_dir,
            "param_level": config.param_level,
            "threshold_adjustment_pct": config.threshold_adjustment_pct,
            "require_confirmation": config.require_confirmation,
        },
        "terminal_summary": {
            "timestamp": summary.timestamp,
            "total_equipment": summary.total_equipment,
            "normal_count": summary.normal_count,
            "caution_count": summary.caution_count,
            "warning_count": summary.warning_count,
            "critical_count": summary.critical_count,
            "direction_issue_count": summary.direction_issue_count,
            "extreme_value_count": summary.extreme_value_count,
            "boundary_sample_count": summary.boundary_sample_count,
            "pending_material_count": summary.pending_material_count,
            "manual_override_count": summary.manual_override_count,
            "processed_count": summary.processed_count,
            "flagged_records": summary.flagged_records,
        },
        "records": [],
        "confirmations": [],
    }

    for r in records:
        data["records"].append({
            "equipment_id": r.equipment_id,
            "nameplate": {
                "model": r.nameplate.model,
                "rated_torque_nm": r.nameplate.rated_torque_nm,
                "max_torque_nm": r.nameplate.max_torque_nm,
                "warning_threshold_pct": r.nameplate.warning_threshold_pct,
                "critical_threshold_pct": r.nameplate.critical_threshold_pct,
                "manufacturer": r.nameplate.manufacturer,
                "rated_speed_rpm": r.nameplate.rated_speed_rpm,
                "install_date": r.nameplate.install_date,
            },
            "warning_level": r.warning_level.value,
            "material_status": r.status.value,
            "material_status_note": r.status_note,
            "peak_torque_nm": r.peak_torque_nm,
            "peak_torque_rpm": r.peak_torque_rpm,
            "peak_torque_ratio_pct": round(r.peak_torque_nm / r.nameplate.rated_torque_nm * 100, 2) if r.nameplate.rated_torque_nm else 0,
            "readings_count": len(r.readings),
            "direction_issue": r.direction_issue,
            "direction_issue_desc": r.direction_issue_desc,
            "override_applied": r.override_applied,
            "override_note": r.override_note,
            "formulas_applied": r.formulas_applied,
            "units_ref": r.units_ref,
            "boundary_samples": [
                {
                    "timestamp": b.timestamp,
                    "value_nm": b.value_nm,
                    "direction": b.direction.value,
                    "rpm": b.rpm,
                    "reason": b.boundary_reason,
                }
                for b in r.boundary_samples
            ],
            "extreme_values": [
                {
                    "timestamp": e.timestamp,
                    "value_nm": e.value_nm,
                    "direction": e.direction.value,
                    "rpm": e.rpm,
                    "temperature_c": e.temperature_c,
                    "sensor_id": e.sensor_id,
                }
                for e in r.extreme_values
            ],
        })

    for c in confirms:
        data["confirmations"].append({
            "equipment_id": c.equipment_id,
            "reason": c.reason,
            "next_step": c.next_step,
            "original_level": c.original_level.value,
            "suggested_level": c.suggested_level.value,
            "context": c.context,
        })

    _dump_json(data, path)
    return path


def export_param_compare_markdown(
    prev_records: Optional[List[ProcessedRecord]],
    curr_records: List[ProcessedRecord],
    prev_config: Optional[RunConfig],
    curr_config: RunConfig,
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "param_compare.md")

    lines = []
    lines.append("# 参数调档复算对比报告")
    lines.append("")
    if prev_config:
        lines.append(f"- **上一档 (L{prev_config.param_level})**: 阈值调整 `{prev_config.threshold_adjustment_pct:+.1f}%`")
    lines.append(f"- **当前档 (L{curr_config.param_level})**: 阈值调整 `{curr_config.threshold_adjustment_pct:+.1f}%`")
    lines.append("")
    lines.append("## 单台设备变化详情")
    lines.append("")

    prev_map = {r.equipment_id: r for r in (prev_records or [])}
    for r in curr_records:
        prev = prev_map.get(r.equipment_id)
        lines.append(f"### {r.equipment_id} ({r.nameplate.model})")
        lines.append("")
        lines.append("| 指标 | 上一档 | 当前档 | 变化说明 |")
        lines.append("|------|--------|--------|----------|")
        if prev:
            prev_peak_ratio = prev.peak_torque_nm / prev.nameplate.rated_torque_nm * 100 if prev.nameplate.rated_torque_nm else 0
            curr_peak_ratio = r.peak_torque_nm / r.nameplate.rated_torque_nm * 100 if r.nameplate.rated_torque_nm else 0
            diff_lv = "等级相同" if prev.warning_level == r.warning_level else f"{prev.warning_level.value} → {r.warning_level.value}"
            lines.append(f"| 预警等级 | {prev.warning_level.value} | {r.warning_level.value} | {diff_lv} |")
            lines.append(f"| 峰值扭矩 | {prev.peak_torque_nm:.2f} N·m | {r.peak_torque_nm:.2f} N·m | 峰值保留策略不变 |")
            lines.append(f"| 峰值/额定比 | {prev_peak_ratio:.2f}% | {curr_peak_ratio:.2f}% |  |")
            lines.append(f"| 预警阈值 | {prev.nameplate.rated_torque_nm * (prev.nameplate.warning_threshold_pct + prev_config.threshold_adjustment_pct)/100:.2f} N·m | {r.nameplate.rated_torque_nm * (r.nameplate.warning_threshold_pct + curr_config.threshold_adjustment_pct)/100:.2f} N·m | 阈值调整 {curr_config.threshold_adjustment_pct - prev_config.threshold_adjustment_pct:+.1f}% |")
        else:
            curr_peak_ratio = r.peak_torque_nm / r.nameplate.rated_torque_nm * 100 if r.nameplate.rated_torque_nm else 0
            lines.append(f"| 预警等级 | — | {r.warning_level.value} | 首次运行 |")
            lines.append(f"| 峰值扭矩 | — | {r.peak_torque_nm:.2f} N·m | 峰值保留 |")
            lines.append(f"| 峰值/额定比 | — | {curr_peak_ratio:.2f}% |  |")
            lines.append(f"| 预警阈值 | — | {r.nameplate.rated_torque_nm * (r.nameplate.warning_threshold_pct + curr_config.threshold_adjustment_pct)/100:.2f} N·m | 参数档 L{curr_config.param_level} |")
        lines.append("")

        if r.boundary_samples:
            lines.append("**边界样本说明(为什么结果会变):**")
            lines.append("")
            for b in r.boundary_samples:
                lines.append(f"- 读数 `{b.value_nm:.1f} N·m` ({b.timestamp}): {b.boundary_reason}")
                if prev_config:
                    old_warn = r.nameplate.rated_torque_nm * (r.nameplate.warning_threshold_pct + prev_config.threshold_adjustment_pct) / 100
                    old_crit = r.nameplate.rated_torque_nm * (r.nameplate.critical_threshold_pct + prev_config.threshold_adjustment_pct) / 100
                    new_warn = r.nameplate.rated_torque_nm * (r.nameplate.warning_threshold_pct + curr_config.threshold_adjustment_pct) / 100
                    new_crit = r.nameplate.rated_torque_nm * (r.nameplate.critical_threshold_pct + curr_config.threshold_adjustment_pct) / 100
                    lines.append(f"  · 旧阈值预警={old_warn:.1f}/严重={old_crit:.1f} → 新阈值预警={new_warn:.1f}/严重={new_crit:.1f}")
                    lines.append(f"  · 差值使该样本在新旧阈值中的归属可能变化,从而拉动整体预警等级。")
            lines.append("")

        if r.extreme_values:
            lines.append("**保留的极端值(不被平均掩盖):**")
            lines.append("")
            for e in r.extreme_values:
                lines.append(f"- {e.timestamp} | {e.value_nm:.1f} N·m | {e.direction.value} | {e.rpm:.0f}rpm | 传感器 {e.sensor_id}")
            lines.append("")

        lines.append("**公式:**")
        for f in r.formulas_applied:
            lines.append(f"- `{f}`")
        lines.append("")
        lines.append("**单位:**")
        for k, v in r.units_ref.items():
            lines.append(f"- {k}: {v}")
        lines.append("")
        lines.append("---")
        lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path
