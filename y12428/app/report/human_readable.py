from __future__ import annotations
from typing import List, Optional
from app.models.split import SplitDetail, SplitStatus
from app.store.memory import store


FEE_TYPE_LABELS = {
    "credit_fee": "学分费",
    "resource_fee": "资源费",
    "dropout_fee": "退课费",
}

STATUS_LABELS = {
    SplitStatus.PENDING: "待确认",
    SplitStatus.CONFIRMED: "已确认",
    SplitStatus.DISPUTED: "有争议（需补充材料）",
    SplitStatus.SETTLED: "已结算",
}

DIRECTION_LABELS = {
    "pay": "应付",
    "receive": "应收",
}


def _explain_dropout_rejection(split: SplitDetail) -> Optional[str]:
    if not split.evidence_gaps:
        return None
    dropout_items = [it for it in split.items if it.fee_type == "dropout_fee"]
    if not dropout_items:
        return None

    explanations: List[str] = []
    for gap in split.evidence_gaps:
        if "协议版本" in gap or "版本" in gap:
            explanations.append(
                "退课费计算依赖的协议版本有分歧。"
                "简单来说：学生选课时用的是A版协议，"
                "但现在生效的是B版协议，两个版本里退课费的算法或比例可能不同。"
                "在搞清楚该按哪个版本算之前，这笔退课费暂时没法入账。"
                "\n  → 你需要提供：选课当时的协议文本，或者学校之间关于换版过渡期的书面约定。"
            )
        elif "无对应" in gap or "未找到" in gap:
            explanations.append(
                "这笔退课找不到对应的收费协议。"
                "也就是说，两所学校之间目前没有一份正在生效的协议"
                "来规定退课之后钱该怎么退、退多少。"
                "\n  → 你需要提供：两校签署的包含退课条款的协议，"
                "或者确认退课发生的时间是否在协议有效期内。"
            )
        elif "退课晚" in gap or "超期" in gap or "截止" in gap:
            explanations.append(
                "退课申请已经超过了学校规定的退课截止日期。"
                "按常规流程，超过截止日期的退课一般不退费，"
                "但具体还要看协议里有没有例外条款。"
                "\n  → 你需要提供：协议中关于退课截止日期的条款，"
                "以及是否有特殊情况（如病假、休学）可以豁免的说明。"
            )

    if not explanations and split.evidence_gaps:
        for gap in split.evidence_gaps:
            explanations.append(
                f"当前存在未解决的问题：{gap}\n"
                "  → 请联系相关学校财务确认后补充材料。"
            )

    return "\n\n".join(explanations) if explanations else None


def _format_amount(amount: float) -> str:
    return f"{amount:,.2f} 元"


def generate_human_readable_report(splits: List[SplitDetail]) -> str:
    lines: List[str] = []

    lines.append("=" * 70)
    lines.append("跨校课程联盟分账报告")
    lines.append("=" * 70)
    lines.append("")

    if not splits:
        lines.append("当前没有分账记录。")
        return "\n".join(lines)

    total_pending = sum(1 for s in splits if s.status == SplitStatus.PENDING)
    total_confirmed = sum(1 for s in splits if s.status == SplitStatus.CONFIRMED)
    total_disputed = sum(1 for s in splits if s.status == SplitStatus.DISPUTED)
    total_settled = sum(1 for s in splits if s.status == SplitStatus.SETTLED)

    lines.append(f"共 {len(splits)} 条分账记录：")
    lines.append(f"  - 待确认：{total_pending} 条")
    lines.append(f"  - 已确认：{total_confirmed} 条")
    lines.append(f"  - 有争议：{total_disputed} 条")
    lines.append(f"  - 已结算：{total_settled} 条")
    lines.append("")

    for idx, sp in enumerate(splits, 1):
        enr = store.get_enrollment(sp.enrollment_id)

        lines.append("-" * 70)
        lines.append(f"【第 {idx} 条】分账ID：{sp.id}")
        lines.append(f"  状态：{STATUS_LABELS.get(sp.status, sp.status.value)}")
        lines.append(f"  创建时间：{sp.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

        if enr:
            lines.append(f"  学生：{enr.student_name}（{enr.student_id}）")
            lines.append(f"  课程：{enr.course_name}（{enr.credits} 学分）")
            lines.append(f"  学籍学校：{enr.home_school_id}  →  开课学校：{enr.host_school_id}")

        lines.append(f"  依据协议：{sp.agreement_id} 第 {sp.agreement_version} 版")
        lines.append(f"  总金额：{_format_amount(sp.total_amount)}")
        lines.append("")

        lines.append("  费用拆分明细：")
        for item in sp.items:
            fee_label = FEE_TYPE_LABELS.get(item.fee_type, item.fee_type)
            dir_label = DIRECTION_LABELS.get(item.direction, item.direction)
            lines.append(
                f"    · {item.school_id} — {fee_label} — "
                f"{dir_label} {_format_amount(item.amount)}"
                f"（按 {item.rule_source}）"
            )

        if sp.evidence_gaps:
            lines.append("")
            lines.append("  ⚠ 需要注意的问题：")
            for gap in sp.evidence_gaps:
                lines.append(f"    · {gap}")

            dropout_explanation = _explain_dropout_rejection(sp)
            if dropout_explanation:
                lines.append("")
                lines.append("  退课审核说明（写给非技术同事）：")
                lines.append(f"    {dropout_explanation}")

        lines.append("")

    lines.append("=" * 70)
    lines.append("报告结束")
    lines.append("")
    lines.append("说明：")
    lines.append("  - 「有争议」表示分账计算过程中发现了证据缺口或冲突，")
    lines.append("    需要补充材料后才能确认金额。")
    lines.append("  - 退课费相关的问题会单独用通俗语言解释原因，")
    lines.append("    不涉及技术术语。")
    lines.append("  - 如有疑问，请联系对应学校的财务对接人。")

    return "\n".join(lines)
