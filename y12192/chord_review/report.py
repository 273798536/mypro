import os
import datetime
from typing import Optional

from .models import ReviewResult, Issue, IssueCategory


def _count_case_issues(results: list[ReviewResult]) -> tuple[int, int, int, int]:
    mode_count = sum(1 for r in results for i in r.issues if i.category == IssueCategory.MODE_MISJUDGE and i.case_id)
    align_count = sum(1 for r in results for i in r.issues if i.category == IssueCategory.MEASURE_MISALIGN and i.case_id)
    mix_count = sum(1 for r in results for i in r.issues if i.category == IssueCategory.MODEL_MIX and i.case_id)
    case_total = mode_count + align_count + mix_count
    return case_total, mode_count, align_count, mix_count


def format_terminal_summary(results: list[ReviewResult], global_issues: Optional[list[Issue]] = None) -> str:
    lines = []
    lines.append("=" * 64)
    lines.append("  AI伴奏错和弦复盘 - 终端摘要")
    lines.append(f"  生成时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 64)

    case_total, mode_count, align_count, mix_count = _count_case_issues(results)
    global_count = len(global_issues) if global_issues else 0
    total_corrections = sum(len(r.corrections_applied) for r in results)

    lines.append("")
    lines.append(f"  复盘Case数: {len(results)}")
    lines.append(f"  Case级问题: {case_total}")
    lines.append(f"    - 调式误判: {mode_count}  (待确认分支)")
    lines.append(f"    - 小节错位: {align_count}")
    lines.append(f"    - 模型混用: {mix_count}")
    lines.append(f"  全局问题:   {global_count}")
    if global_issues:
        for gi in global_issues:
            lines.append(f"    - [{gi.category.value}] {gi.detail}")
    lines.append(f"  人工修正应用: {total_corrections}")
    lines.append("")

    for r in results:
        case_issues = [i for i in r.issues if i.case_id]
        lines.append("-" * 64)
        lines.append(f"  Case: {r.case_id}")
        lines.append(f"  旋律: {r.melody.title} | 调式: {r.melody.key_signature} {r.melody.mode} | 拍号: {r.melody.time_signature}")
        lines.append(f"  和弦模型: {r.chord.model_version} | 和弦数: {len(r.chord.chords)}")

        if case_issues:
            lines.append(f"  问题 ({len(case_issues)}):")
            for i, iss in enumerate(case_issues, 1):
                m_str = f"小节{iss.measure_num}" if iss.measure_num else "全局"
                lines.append(f"    {i}. [{iss.category.value}] {m_str} - {iss.status.value}")
                lines.append(f"       {iss.detail}")
                lines.append(f"       → {iss.next_step}")
        else:
            lines.append("  问题: 无")

        if r.corrections_applied:
            lines.append(f"  修正已应用 ({len(r.corrections_applied)}):")
            for c in r.corrections_applied:
                lines.append(f"    小节{c.measure_num}: {c.original_chord} → {c.corrected_chord} ({c.reason})")

        lines.append("")

    lines.append("=" * 64)
    return "\n".join(lines)


def format_shareable_report(results: list[ReviewResult], global_issues: Optional[list[Issue]] = None) -> str:
    lines = []
    now = datetime.datetime.now()
    lines.append(f"AI伴奏错和弦复盘报告")
    lines.append(f"报告日期: {now.strftime('%Y-%m-%d')}")
    lines.append(f"生成时间: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    lines.append("一、总体概况")
    case_total, mode_count, align_count, mix_count = _count_case_issues(results)
    total_corrections = sum(len(r.corrections_applied) for r in results)
    global_count = len(global_issues) if global_issues else 0

    lines.append(f"  本期复盘覆盖 {len(results)} 个Case，Case级问题 {case_total} 个，全局问题 {global_count} 个，应用 {total_corrections} 条人工修正。")
    lines.append("")

    mode_issues = [i for r in results for i in r.issues if i.category == IssueCategory.MODE_MISJUDGE and i.case_id]
    align_issues = [i for r in results for i in r.issues if i.category == IssueCategory.MEASURE_MISALIGN and i.case_id]
    mix_issues = [i for r in results for i in r.issues if i.category == IssueCategory.MODEL_MIX and i.case_id]

    if mode_issues:
        lines.append("  【调式误判】(待确认分支)")
        for iss in mode_issues:
            m_str = f"小节{iss.measure_num}" if iss.measure_num else "全局"
            lines.append(f"    - Case {iss.case_id} {m_str}: {iss.detail}")
            lines.append(f"      下一步: {iss.next_step}")
        lines.append("")

    if align_issues:
        lines.append("  【小节错位】")
        for iss in align_issues:
            m_str = f"小节{iss.measure_num}" if iss.measure_num else "全局"
            lines.append(f"    - Case {iss.case_id} {m_str}: {iss.detail}")
            lines.append(f"      下一步: {iss.next_step}")
        lines.append("")

    if mix_issues:
        lines.append("  【Case级模型混用】")
        for iss in mix_issues:
            lines.append(f"    - Case {iss.case_id}: {iss.detail}")
            lines.append(f"      下一步: {iss.next_step}")
        lines.append("")

    if global_issues:
        lines.append("  【全局问题】")
        for iss in global_issues:
            lines.append(f"    - [{iss.category.value}] {iss.detail}")
            lines.append(f"      下一步: {iss.next_step}")
        lines.append("")

    lines.append("二、各Case详情")
    for r in results:
        case_issues = [i for i in r.issues if i.case_id]
        lines.append(f"")
        lines.append(f"  Case: {r.case_id} - {r.melody.title}")
        lines.append(f"  旋律调式: {r.melody.key_signature} {r.melody.mode} | 拍号: {r.melody.time_signature} | 速度: {r.melody.tempo}")
        lines.append(f"  和弦模型: {r.chord.model_version} | 推理时间: {r.chord.timestamp}")

        lines.append(f"  和弦结果:")
        for ce in r.chord.chords:
            lines.append(f"    小节{ce.measure_num}: {ce.chord} (置信度 {ce.confidence:.2f})")

        if case_issues:
            lines.append(f"  检出问题:")
            for iss in case_issues:
                m_str = f"小节{iss.measure_num}" if iss.measure_num else "全局"
                lines.append(f"    [{iss.category.value}] {m_str} ({iss.status.value}): {iss.detail}")
                lines.append(f"    → {iss.next_step}")

        if r.corrections_applied:
            lines.append(f"  人工修正变更:")
            for c in r.corrections_applied:
                lines.append(f"    小节{c.measure_num}: {c.original_chord} → {c.corrected_chord}")
                lines.append(f"      原因: {c.reason}")

        if r.model_version_info:
            lines.append(f"  模型信息:")
            lines.append(f"    版本: {r.model_version_info.model_id} | 训练负责人: {r.model_version_info.trainer}")
            lines.append(f"    训练数据: {r.model_version_info.training_data_version} | 发布: {r.model_version_info.release_date}")
            if r.model_version_info.known_issues:
                for ki in r.model_version_info.known_issues:
                    lines.append(f"    已知问题: {ki}")

    lines.append("")
    lines.append("三、待办事项汇总")
    pending = []
    for r in results:
        for iss in r.issues:
            if iss.status.value == "待确认" and iss.case_id:
                pending.append((r.case_id, iss))
    if global_issues:
        for gi in global_issues:
            if gi.status.value == "待确认":
                pending.append(("全局", gi))
    if pending:
        for scope, iss in pending:
            m_str = f"小节{iss.measure_num}" if iss.measure_num else "全局"
            lines.append(f"  [ ] {scope} {m_str} [{iss.category.value}]: {iss.next_step}")
    else:
        lines.append("  无待确认事项")

    lines.append("")
    lines.append("--- 报告结束 ---")
    return "\n".join(lines)


def save_report(text: str, output_dir: str, filename: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path
