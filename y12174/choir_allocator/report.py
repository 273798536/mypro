import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    AllocationResult,
    SongAllocation,
    PART_LABELS,
    SECTION_LABELS,
    PART_SECTION,
    SKILL_ORDER,
)


SKILL_LABELS = {
    "beginner": "初级",
    "intermediate": "中级",
    "advanced": "高级",
}

CLUSTER_LABELS = {
    "none": "无风险",
    "low": "低风险",
    "medium": "偏科",
    "high": "扎堆",
}


def _format_fill_bar(rate: float, width: int = 10) -> str:
    filled = int(round(rate * width))
    return "█" * filled + "░" * (width - filled)


def format_terminal_summary(result: AllocationResult) -> str:
    lines: list[str] = []
    lines.append("=" * 56)
    lines.append("  合唱声部分配结果摘要")
    lines.append("=" * 56)

    if result.global_warnings:
        lines.append("")
        lines.append("⚠ 全局提示:")
        for w in result.global_warnings:
            lines.append(f"  · {w}")

    for sa in result.songs:
        lines.append("")
        lines.append(f"▸ 曲目: {sa.song_name} ({sa.song_id})")
        lines.append("-" * 48)

        part_groups: dict[str, list] = {}
        for a in sa.assignments:
            part_groups.setdefault(a.voice_part, []).append(a)

        for part_key in sorted(part_groups.keys(), key=lambda p: list(PART_LABELS.keys()).index(p) if p in PART_LABELS else 99):
            assignments = part_groups[part_key]
            label = PART_LABELS.get(part_key, part_key)
            names = ", ".join(
                f"{a.member_name}({SKILL_LABELS.get(a.skill_level.value, a.skill_level.value)})"
                for a in assignments
            )
            lines.append(f"  {label:　<4} {len(assignments)}人: {names}")

        if sa.warnings:
            lines.append("")
            lines.append("  ⚠ 问题:")
            for w in sa.warnings:
                lines.append(f"    {w}")

        if sa.adjustments:
            lines.append("")
            lines.append("  ↻ 调整建议:")
            for adj in sa.adjustments:
                lines.append(
                    f"    #{adj.step} {adj.member_name}: "
                    f"{PART_LABELS.get(adj.from_part, adj.from_part) if adj.from_part else '(未分配)'}"
                    f" → {PART_LABELS.get(adj.to_part, adj.to_part)} — {adj.reason}"
                )

        if sa.balance:
            lines.append("")
            lines.append("  平衡评分:")
            for pb in sa.balance.part_balances:
                label = PART_LABELS.get(pb.part, pb.part)
                bar = _format_fill_bar(pb.fill_rate)
                cluster = CLUSTER_LABELS.get(pb.cluster_risk, pb.cluster_risk)
                fill_pct = f"{pb.fill_rate * 100:.0f}%"
                dist_parts = []
                for sk, cnt in pb.skill_distribution.items():
                    if cnt > 0:
                        dist_parts.append(f"{SKILL_LABELS.get(sk, sk)}{cnt}")
                dist_str = " ".join(dist_parts)
                lines.append(
                    f"    {label:　<4} [{bar}] {fill_pct:>3} "
                    f"| {dist_str:<12} | 扎堆:{cluster}"
                )
            lines.append(
                f"    总体填充率: {sa.balance.overall_fill_rate * 100:.0f}%  "
                f"整体扎堆风险: {CLUSTER_LABELS.get(sa.balance.overall_cluster_risk, sa.balance.overall_cluster_risk)}"
            )

    lines.append("")
    lines.append("=" * 56)
    return "\n".join(lines)


def _assignment_to_dict(a) -> dict:
    return {
        "序号": a.seq,
        "成员ID": a.member_id,
        "成员姓名": a.member_name,
        "水平": a.skill_level.value,
        "曲目ID": a.song_id,
        "曲目": a.song_name,
        "声部": a.voice_part,
        "声部名称": PART_LABELS.get(a.voice_part, a.voice_part),
        "是否首选声部": a.is_primary,
    }


def _part_balance_to_dict(b) -> dict:
    return {
        "声部": b.part,
        "声部名称": PART_LABELS.get(b.part, b.part),
        "声部组": SECTION_LABELS.get(PART_SECTION.get(b.part, ""), ""),
        "已分配": b.assigned_count,
        "需求": b.required_count,
        "填充率": round(b.fill_rate, 2),
        "水平分布": b.skill_distribution,
        "平均水平分": round(b.avg_skill_score, 2),
        "扎堆风险": b.cluster_risk,
        "缺失": b.gap,
    }


def _song_balance_to_dict(b) -> dict:
    return {
        "总体填充率": round(b.overall_fill_rate, 2),
        "整体扎堆风险": b.overall_cluster_risk,
        "各声部": [_part_balance_to_dict(pb) for pb in b.part_balances],
    }


def _adjustment_to_dict(adj) -> dict:
    return {
        "步骤": adj.step,
        "成员ID": adj.member_id,
        "成员姓名": adj.member_name,
        "曲目ID": adj.song_id,
        "曲目": adj.song_name,
        "原声部": adj.from_part,
        "原声部名称": PART_LABELS.get(adj.from_part, adj.from_part) if adj.from_part else None,
        "调整至": adj.to_part,
        "调整至名称": PART_LABELS.get(adj.to_part, adj.to_part),
        "原因": adj.reason,
    }


def _song_alloc_to_dict(sa: SongAllocation) -> dict:
    return {
        "曲目ID": sa.song_id,
        "曲目": sa.song_name,
        "分配明细": [_assignment_to_dict(a) for a in sa.assignments],
        "平衡评分": _song_balance_to_dict(sa.balance) if sa.balance else None,
        "调整记录": [_adjustment_to_dict(adj) for adj in sa.adjustments],
        "问题提示": sa.warnings,
    }


def format_detail_json(result: AllocationResult) -> str:
    data = {
        "生成时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "全局提示": result.global_warnings,
        "曲目分配": [_song_alloc_to_dict(sa) for sa in result.songs],
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def format_text_report(result: AllocationResult) -> str:
    lines: list[str] = []
    lines.append(f"合唱声部分配报告 — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("")

    if result.global_warnings:
        lines.append("【全局提示】")
        for w in result.global_warnings:
            lines.append(f"  {w}")
        lines.append("")

    for sa in result.songs:
        lines.append(f"【{sa.song_name}】")
        lines.append("")

        section_num = 1
        lines.append(f"  {['一','二','三','四','五'][section_num - 1]}、声部分配")
        part_groups: dict[str, list] = {}
        for a in sa.assignments:
            part_groups.setdefault(a.voice_part, []).append(a)

        for part_key in sorted(part_groups.keys(), key=lambda p: list(PART_LABELS.keys()).index(p) if p in PART_LABELS else 99):
            assignments = part_groups[part_key]
            label = PART_LABELS.get(part_key, part_key)
            for a in assignments:
                skill = SKILL_LABELS.get(a.skill_level.value, a.skill_level.value)
                primary = "首选" if a.is_primary else "备选"
                lines.append(
                    f"    #{a.seq:02d} {label:　<4} {a.member_name}  "
                    f"水平:{skill}  [{primary}]"
                )
        lines.append("")

        if sa.balance:
            section_num += 1
            lines.append(f"  {['一','二','三','四','五'][section_num - 1]}、平衡评分")
            for pb in sa.balance.part_balances:
                label = PART_LABELS.get(pb.part, pb.part)
                section = SECTION_LABELS.get(PART_SECTION.get(pb.part, ""), "")
                fill_pct = f"{pb.fill_rate * 100:.0f}%"
                dist_parts = []
                for sk, cnt in pb.skill_distribution.items():
                    if cnt > 0:
                        dist_parts.append(f"{SKILL_LABELS.get(sk, sk)}{cnt}人")
                dist_str = " ".join(dist_parts)
                gap_mark = " ⚠缺失" if pb.gap else ""
                cluster_mark = ""
                if pb.cluster_risk == "high":
                    cluster_mark = " ⚠高手扎堆"
                elif pb.cluster_risk == "medium":
                    cluster_mark = " ⚠水平偏科"
                lines.append(
                    f"    {label}({section}): 填充{fill_pct} | {dist_str} | "
                    f"均分{pb.avg_skill_score:.1f}{gap_mark}{cluster_mark}"
                )
            lines.append("")

        if sa.adjustments:
            section_num += 1
            lines.append(f"  {['一','二','三','四','五'][section_num - 1]}、调整历史")
            for adj in sa.adjustments:
                from_label = PART_LABELS.get(adj.from_part, adj.from_part) if adj.from_part else "(未分配)"
                to_label = PART_LABELS.get(adj.to_part, adj.to_part)
                lines.append(
                    f"    步骤#{adj.step}: {adj.member_name} "
                    f"{from_label} → {to_label} | 原因: {adj.reason}"
                )
            lines.append("")

        if sa.warnings:
            section_num += 1
            lines.append(f"  {['一','二','三','四','五'][section_num - 1]}、问题提示")
            for w in sa.warnings:
                lines.append(f"    {w}")
            lines.append("")

        lines.append("─" * 40)
        lines.append("")

    return "\n".join(lines)


def write_reports(result: AllocationResult, output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    report_path = output_dir / "allocation_report.txt"
    report_path.write_text(format_text_report(result), encoding="utf-8")

    detail_path = output_dir / "allocation_detail.json"
    detail_path.write_text(format_detail_json(result), encoding="utf-8")

    return report_path, detail_path
