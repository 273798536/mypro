import json
from typing import Optional

from .tracker import query_melody_to_result, query_result_to_chord


def format_melody_trace(trace: dict, case_id: str) -> str:
    result = query_melody_to_result(trace, case_id)
    if not result:
        return f"未找到 Case {case_id} 的旋律→结果追溯"

    lines = []
    lines.append(f"旋律 → 结果 追溯")
    lines.append(f"  Case ID:  {case_id}")
    lines.append(f"  调式:     {result['key']}")
    lines.append(f"  标题:     {result['title']}")
    lines.append(f"  模型:     {result['model']}")
    lines.append(f"  问题数:   {result['issue_count']}")
    lines.append(f"  修正数:   {result['corrections']}")
    lines.append(f"  和弦摘要:")
    for cs in result["chord_summary"]:
        lines.append(f"    小节{cs['measure']}: {cs['chord']} (置信度 {cs['confidence']:.2f})")
    return "\n".join(lines)


def format_chord_trace(trace: dict, case_id: str) -> str:
    matches = query_result_to_chord(trace, case_id)
    if not matches:
        return f"未找到 Case {case_id} 的结果→和弦反查"

    lines = []
    lines.append(f"结果 → 和弦 反查")
    lines.append(f"  Case ID: {case_id}")
    for m in matches:
        lines.append(f"  小节{m['measure']}: {m['chord']} (置信度 {m['confidence']:.2f})")
        lines.append(f"    模型版本: {m['model_version']}")
        if m.get("source_measures"):
            for sm in m["source_measures"]:
                lines.append(f"    旋律来源: 小节{sm['measure']} 音符={', '.join(sm['notes'])}")
    return "\n".join(lines)


def format_bidirectional_trace(trace: dict, case_id: str) -> str:
    melody_part = format_melody_trace(trace, case_id)
    chord_part = format_chord_trace(trace, case_id)
    return f"{melody_part}\n\n{'─' * 40}\n\n{chord_part}"
