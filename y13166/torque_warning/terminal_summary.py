import datetime
from typing import List, Tuple

from .models import ProcessedRecord, TerminalSummary, RunConfig, WarningLevel, MaterialStatus, ConfirmationRequest


_LEVEL_COLOR = {
    WarningLevel.NORMAL: "\033[92m",
    WarningLevel.CAUTION: "\033[93m",
    WarningLevel.WARNING: "\033[33m",
    WarningLevel.CRITICAL: "\033[91m",
}
_RESET = "\033[0m"


def _level_tag(lv: WarningLevel) -> str:
    cn = {
        WarningLevel.NORMAL: "正常",
        WarningLevel.CAUTION: "注意",
        WarningLevel.WARNING: "预警",
        WarningLevel.CRITICAL: "严重",
    }
    return f"{_LEVEL_COLOR[lv]}{cn[lv]}({lv.value}){_RESET}"


def _status_cn(st: MaterialStatus) -> str:
    return {
        MaterialStatus.PROCESSED: "已处理",
        MaterialStatus.PENDING_SUPPLEMENT: "待补材料",
        MaterialStatus.MANUAL_OVERRIDE: "人工改判",
    }[st]


def build_terminal_summary(records: List[ProcessedRecord], config: RunConfig) -> TerminalSummary:
    total = len(records)
    counts = {lv: 0 for lv in WarningLevel}
    status_counts = {st: 0 for st in MaterialStatus}
    dir_issues = 0
    extreme_cnt = 0
    boundary_cnt = 0
    flagged = []

    for r in records:
        counts[r.warning_level] += 1
        status_counts[r.status] += 1
        if r.direction_issue:
            dir_issues += 1
        extreme_cnt += len(r.extreme_values)
        boundary_cnt += len(r.boundary_samples)
        if r.warning_level in (WarningLevel.WARNING, WarningLevel.CRITICAL):
            flagged.append(f"{r.equipment_id}[峰值{r.peak_torque_nm:.1f}N·m]")

    return TerminalSummary(
        total_equipment=total,
        normal_count=counts[WarningLevel.NORMAL],
        caution_count=counts[WarningLevel.CAUTION],
        warning_count=counts[WarningLevel.WARNING],
        critical_count=counts[WarningLevel.CRITICAL],
        direction_issue_count=dir_issues,
        extreme_value_count=extreme_cnt,
        boundary_sample_count=boundary_cnt,
        pending_material_count=status_counts[MaterialStatus.PENDING_SUPPLEMENT],
        manual_override_count=status_counts[MaterialStatus.MANUAL_OVERRIDE],
        processed_count=status_counts[MaterialStatus.PROCESSED],
        run_config=config,
        flagged_records=flagged,
        timestamp=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )


def print_terminal_summary(summary: TerminalSummary, records: List[ProcessedRecord], confirms: List[ConfirmationRequest]):
    bar = "=" * 60
    sep = "-" * 60
    print()
    print(bar)
    print("  电机扭矩阈值预警 — 终端摘要")
    print(f"  运行时间: {summary.timestamp}")
    print(f"  参数档: L{summary.run_config.param_level}  阈值调整: {summary.run_config.threshold_adjustment_pct:+.1f}%")
    print(f"  输入目录: {summary.run_config.input_dir}")
    print(f"  输出目录: {summary.run_config.output_dir}")
    print(bar)

    print(f"  设备总数: {summary.total_equipment}")
    print(f"    正常: {summary.normal_count}  注意: {summary.caution_count}  预警: {summary.warning_count}  严重: {summary.critical_count}")
    print(f"  方向异常: {summary.direction_issue_count}  极端值: {summary.extreme_value_count}  边界样本: {summary.boundary_sample_count}")
    print(f"  已处理: {summary.processed_count}  待补材料: {summary.pending_material_count}  人工改判: {summary.manual_override_count}")
    print(sep)

    for r in records:
        print(f"  [{r.equipment_id}] {_level_tag(r.warning_level)}  {_status_cn(r.status)}")
        print(f"    铭牌额定扭矩: {r.nameplate.rated_torque_nm:.1f}N·m  峰值: {r.peak_torque_nm:.1f}N·m @ {r.peak_torque_rpm:.0f}rpm")
        if r.extreme_values:
            evs = ", ".join(f"{e.value_nm:.1f}N·m({e.timestamp})" for e in r.extreme_values)
            print(f"    ⚠ 保留的极端值(未被平均): {evs}")
        if r.boundary_samples:
            bs = ", ".join(f"{b.value_nm:.1f}N·m" for b in r.boundary_samples)
            print(f"    ▤ 边界样本(±2%阈值): {bs}")
        if r.direction_issue:
            print(f"    ⇄ 方向问题: {r.direction_issue_desc}")
        if r.status_note:
            print(f"    · {r.status_note}")
        print()

    if confirms:
        print(sep)
        print("  !!! 需人工确认事项 !!!")
        for c in confirms:
            print(f"  设备 {c.equipment_id}:")
            print(f"    原因: {c.reason}")
            print(f"    原等级: {c.original_level.value}  建议: {c.suggested_level.value}")
            print(f"    下一步: {c.next_step}")
            print(f"    上下文: {c.context}")
            print()

    if summary.flagged_records:
        print(sep)
        print(f"  重点关注清单(预警/严重): {', '.join(summary.flagged_records)}")
    print(bar)
