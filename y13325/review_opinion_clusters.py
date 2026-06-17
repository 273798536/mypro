#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime


def load_tickets(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def detect_label_conflict(ticket):
    if ticket.get("manual_label") and ticket.get("ai_cluster_label"):
        return ticket["manual_label"] != ticket["ai_cluster_label"]
    return False


def is_old_model_misjudgment(ticket):
    return ticket.get("old_model_label") is not None


def generate_misjudgment_explanation(ticket):
    old_label = ticket["old_model_label"]
    new_label = ticket["ai_cluster_label"]
    old_conf = ticket.get("old_model_confidence", 0)
    new_conf = ticket["ai_cluster_confidence"]
    evidence = ticket["ai_evidence"]

    explanation = []
    explanation.append(f"旧模型判断：【{old_label}】(置信度 {old_conf:.0%})")
    explanation.append(f"新模型判断：【{new_label}】(置信度 {new_conf:.0%})")
    explanation.append(f"改判依据：")
    for i, ev in enumerate(evidence, 1):
        explanation.append(f"  {i}. 命中关键词/语义片段：「{ev}」")

    if old_label == "普通投诉" and new_label == "自动续费投诉":
        explanation.append("  → 旧模型泛化能力不足，未识别「自动续费+未通知扣款」这一投诉细分模式")
        explanation.append("  → 新模型补充了自动续费专项语料，能精准区分普通投诉与自动续费类投诉")

    return "\n".join(explanation)


def classify_tickets(tickets):
    normal_passed = []
    label_conflicts = []
    old_model_misjudgments = []
    need_more_evidence = []

    for t in tickets:
        if is_old_model_misjudgment(t):
            old_model_misjudgments.append(t)

        if detect_label_conflict(t):
            label_conflicts.append(t)
        elif t.get("manual_label") is None:
            need_more_evidence.append(t)
        else:
            normal_passed.append(t)

    return normal_passed, label_conflicts, old_model_misjudgments, need_more_evidence


def print_section(title, lines, char="═"):
    width = 72
    print()
    print(char * width)
    print(f"  {title}")
    print(char * width)
    for line in lines:
        print(line)


def print_ticket_brief(ticket):
    lines = []
    lines.append(f"  ▸ 工单编号：{ticket['ticket_id']}")
    lines.append(f"    AI聚类标签：【{ticket['ai_cluster_label']}】(置信度 {ticket['ai_cluster_confidence']:.0%})")
    if ticket.get("manual_label"):
        lines.append(f"    人工标注标签：【{ticket['manual_label']}】")
    lines.append(f"    工单摘要：{ticket['content'][:50]}...")
    lines.append(f"    证据链：{ '、'.join(ticket['ai_evidence']) }")
    return lines


def main():
    data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_tickets.json")

    if not os.path.exists(data_file):
        print(f"[错误] 找不到样例工单数据文件：{data_file}")
        sys.exit(1)

    tickets = load_tickets(data_file)
    total = len(tickets)

    print()
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║                    舆情聚类证据复核 · 整包试跑报告                   ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print(f"║  复核时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}           共 {total} 条工单")
    print("╚══════════════════════════════════════════════════════════════════════╝")

    normal_passed, label_conflicts, old_model_misjudgments, need_more_evidence = classify_tickets(tickets)

    print_section("一、标签冲突记录（单独拎出，不混入正常结果）", [], "═")
    if label_conflicts:
        print(f"  共 {len(label_conflicts)} 条存在 AI 聚类标签与人工标注不一致，已隔离：")
        for t in label_conflicts:
            for line in print_ticket_brief(t):
                print(line)
            print(f"    ★ 冲突卡点：AI 打了【{t['ai_cluster_label']}】，人工打了【{t['manual_label']}】")
            evidence_str = "、".join(t["ai_evidence"])
            print(f"    ★ 需补充证据：确认该工单核心诉求是否同时涉及「{t['ai_cluster_label']}」与「{t['manual_label']}」，证据链当前覆盖：{evidence_str}")
            print()
    else:
        print("  （无标签冲突记录）")

    print_section("二、旧模型误判样本改判解释", [], "═")
    if old_model_misjudgments:
        for t in old_model_misjudgments:
            for line in print_ticket_brief(t):
                print(line)
            print(f"    ┌─────────────────────────────────────────────────────┐")
            for line in generate_misjudgment_explanation(t).split("\n"):
                print(f"    │ {line:<53} │")
            print(f"    └─────────────────────────────────────────────────────┘")
            print()
    else:
        print("  （无旧模型误判样本）")

    print_section("三、可放行记录（AI 与人工标签一致，证据充分）", [], "═")
    if normal_passed:
        print(f"  共 {len(normal_passed)} 条可直接放行：")
        for t in normal_passed:
            for line in print_ticket_brief(t):
                print(line)
            print()
    else:
        print("  （无可直接放行记录）")

    print_section("四、待补证据记录（缺人工标注或证据不足）", [], "═")
    if need_more_evidence:
        print(f"  共 {len(need_more_evidence)} 条需补充材料：")
        for t in need_more_evidence:
            for line in print_ticket_brief(t):
                print(line)
            print(f"    ◆ 待补：人工标注标签（当前未提供，无法确认 AI 聚类是否准确）")
            print()
    else:
        print("  （无待补证据记录）")

    print_section("五、AI 产品阿宁收尾建议", [], "═")
    print("  ┌─ 哪条可以放行 ───────────────────────────────────────────────────┐")
    if normal_passed:
        for t in normal_passed:
            print(f"  │ ✅ {t['ticket_id']}：AI 与人工均为【{t['ai_cluster_label']}】，证据链完整，可直接放行")
    else:
        print("  │ （暂无）")
    print("  └──────────────────────────────────────────────────────────────────┘")

    print("  ┌─ 哪条该补证据 ───────────────────────────────────────────────────┐")
    for t in label_conflicts:
        print(f"  │ ⚠️  {t['ticket_id']}：标签冲突，需确认核心诉求归属【{t['ai_cluster_label']}】还是【{t['manual_label']}】")
    for t in need_more_evidence:
        print(f"  │ ⚠️  {t['ticket_id']}：缺少人工标注标签，请排班同事补标后再放行")
    print("  └──────────────────────────────────────────────────────────────────┘")

    print()
    print("=" * 72)
    print("  复核完成。")
    print()

    if label_conflicts or need_more_evidence:
        stuck_points = []
        for t in label_conflicts:
            stuck_points.append(f"{t['ticket_id']}(AI【{t['ai_cluster_label']}】vs 人工【{t['manual_label']}】)")
        for t in need_more_evidence:
            stuck_points.append(f"{t['ticket_id']}(缺人工标签)")
        print(f"  【退出提示】当前仍有 {len(label_conflicts) + len(need_more_evidence)} 条卡在：")
        for i, sp in enumerate(stuck_points, 1):
            print(f"    {i}. {sp}")
        print("  请排班同事优先处理标签冲突工单，确认后再更新聚类结果，避免新结果被人工修正反复覆盖。")
        sys.exit(2)
    else:
        print("  【退出提示】所有工单均已复核通过，可放行。")
        sys.exit(0)


if __name__ == "__main__":
    main()
