import json
import os
from typing import Any, Dict, List
from ..models.schemas import ComparisonResult, AnomalyType, AnomalyRecord, HumanRemark
from ..statistics.distribution import get_action_guidance
from ..anomalies.classifier import TYPE_LABELS, ACTION_LABELS, STATUS_LABELS


def _gather_remarks(anom: AnomalyRecord) -> List[Dict[str, Any]]:
    all_remarks: List[Dict[str, Any]] = []
    sources = [
        (anom.human_remarks, "异常记录"),
        (anom.model_log.human_remarks if anom.model_log else [], "模型日志"),
        (anom.segment.human_remarks if anom.segment else [], "切分清单"),
    ]
    for remarks, tag in sources:
        for rm in remarks:
            d = rm.to_dict() if hasattr(rm, "to_dict") else dict(rm)
            content = d.get("content", "")
            all_remarks.append({
                "source": tag,
                "remark_id": d.get("remark_id", ""),
                "content": content,
                "reviewer": d.get("reviewer", ""),
                "created_at": d.get("created_at", ""),
                "modified_at": d.get("modified_at"),
            })
    all_remarks.sort(key=lambda x: x["created_at"])
    return all_remarks


def export_json(result: ComparisonResult, output_path: str) -> str:
    data = result.to_dict()
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return output_path


def export_markdown(result: ComparisonResult, output_path: str) -> str:
    stats = result.statistics or {}
    summary = stats.get("summary", {})
    action_breakdown = stats.get("next_action_breakdown", {})
    by_type = stats.get("by_type", {})

    lines: list = []
    lines.append("# 检索召回对比 —— 安全审核报告")
    lines.append("")
    lines.append(f"> 生成时间: {result.generated_at}")
    lines.append("")
    lines.append("## 一、总览")
    lines.append("")
    lines.append("| 指标 | 数值 |")
    lines.append("| --- | ---: |")
    lines.append(f"| 模型日志总数 | {result.total_model_logs} |")
    lines.append(f"| 切分清单总数 | {result.total_segments} |")
    lines.append(f"| 成功匹配数 | {result.matched_records} |")
    lines.append(f"| 匹配率 | {summary.get('match_rate', 0):.2%} |")
    lines.append(f"| **异常总数** | **{len(result.anomalies)}** |")
    lines.append(f"| 异常率 | {summary.get('anomaly_rate', 0):.2%} |")
    lines.append("")

    lines.append("## 二、异常类型分布")
    lines.append("")
    lines.append("| 异常类型 | 计数 | 占比 |")
    lines.append("| --- | ---: | ---: |")
    total = max(len(result.anomalies), 1)
    for t, cnt in sorted(by_type.items(), key=lambda x: -x[1]):
        label = TYPE_LABELS.get(t, t)
        lines.append(f"| {label} | {cnt} | {cnt / total:.1%} |")
    lines.append("")

    lines.append("## 三、下一步处理分布（不只是一个红数字）")
    lines.append("")
    lines.append("安全审核员可按此分类分工处理，不用先统一看所有异常。")
    lines.append("")
    for key, info in action_breakdown.items():
        label = info.get("label", key)
        desc = info.get("description", "")
        count = info.get("count", 0)
        lines.append(f"### 3.{list(action_breakdown.keys()).index(key)+1} {label}（{count} 条）")
        lines.append("")
        if desc:
            lines.append(f"说明：{desc}")
            lines.append("")
        relevant = [a for a in result.anomalies if a.next_action.value == key]
        if relevant:
            lines.append("| 记录 ID | 异常类型 | 描述 | 状态 |")
            lines.append("| --- | --- | --- | --- |")
            for a in relevant:
                t_label = TYPE_LABELS.get(a.anomaly_type.value, a.anomaly_type.value)
                s_label = STATUS_LABELS.get(a.status.value, a.status.value)
                lines.append(f"| {a.record_id} | {t_label} | {a.description} | {s_label} |")
            lines.append("")

    lines.append("## 四、安全规则漏配 —— 详细拦截说明")
    lines.append("")
    lines.append(
        "本章节面向**模型评审会**，即使不打开系统也能看懂："
        "每条规则漏配为什么被拦截、该补材料还是改口径。"
    )
    lines.append("")
    safety_missing = [a for a in result.anomalies if a.anomaly_type == AnomalyType.SAFETY_RULE_MISSING]
    if safety_missing:
        for idx, a in enumerate(safety_missing, 1):
            guidance = get_action_guidance(a.anomaly_type.value)
            action_label = ACTION_LABELS.get(a.next_action.value, a.next_action.value)
            status_label = STATUS_LABELS.get(a.status.value, a.status.value)

            lines.append(f"### 4.{idx} {a.record_id} —— {action_label}")
            lines.append("")
            lines.append(f"**当前状态**：{status_label}")
            lines.append("")
            if a.model_log:
                lines.append(f"**Query**：`{a.model_log.query}`")
                lines.append("")
                lines.append(f"**模型命中规则**：{', '.join(a.model_log.safety_rule_hit) if a.model_log.safety_rule_hit else '（无）'}")
                lines.append("")
            if a.segment:
                lines.append(f"**Segment ID**：`{a.segment.segment_id}`")
                lines.append("")
                lines.append(f"**Segment 分类**：{a.segment.category}")
                lines.append("")
                lines.append(f"**Segment 配置规则**：{', '.join(a.segment.safety_rules) if a.segment.safety_rules else '（无）'}")
                lines.append("")
                if a.segment.content:
                    preview = a.segment.content[:120] + ("..." if len(a.segment.content) > 120 else "")
                    lines.append(f"**Segment 内容摘要**：{preview}")
                    lines.append("")
            lines.append(f"**拦截原因**：{a.description}")
            lines.append("")
            lines.append(f"**判定依据**：{guidance.get('immediate', '')}")
            lines.append("")
            if a.next_action.value == "supplement_material":
                lines.append(f"**处理方向 —— 补材料**：{guidance.get('supplement', '')}")
            elif a.next_action.value == "adjust_criterion":
                lines.append(f"**处理方向 —— 改口径**：{guidance.get('adjust', '')}")
            else:
                lines.append(f"**处理方向 —— 确认规则**：{guidance.get('immediate', '')}")
            lines.append("")

            all_remarks = _gather_remarks(a)
            if all_remarks:
                lines.append("**人工备注（原话保留，未做自动改写，按来源标注）**：")
                lines.append("")
                for rm in all_remarks:
                    lines.append(f"> [{rm['source']}] {rm['reviewer']} @ {rm['created_at'][:16]}：{rm['content']}")
                    lines.append("")
            if a.feedback_history:
                lines.append("**人工反馈记录（原话保留）**：")
                lines.append("")
                for fb in a.feedback_history:
                    lines.append(f"> [{fb.feedback_type}] {fb.reviewer} @ {fb.created_at[:16]}：{fb.content}")
                    if fb.corrected_value is not None:
                        lines.append(f"> 修正值：`{json.dumps(fb.corrected_value, ensure_ascii=False)}`")
                    lines.append("")
            lines.append("---")
            lines.append("")
    else:
        lines.append("_本报告未检出安全规则漏配异常。_")
        lines.append("")

    lines.append("## 五、分布统计快照")
    lines.append("")
    lines.append("统计随人工反馈动态刷新，不是一次性结果。")
    lines.append("")
    lines.append("```json")
    lines.append(json.dumps(stats, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return output_path


def export_all(result: ComparisonResult, output_dir: str, name_prefix: str = "retrieval_compare") -> Dict[str, str]:
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, f"{name_prefix}.json")
    md_path = os.path.join(output_dir, f"{name_prefix}.md")
    return {
        "json": export_json(result, json_path),
        "markdown": export_markdown(result, md_path),
    }
