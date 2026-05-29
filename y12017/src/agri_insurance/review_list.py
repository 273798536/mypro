from typing import List, Dict, Any

from .models import (
    Farmer, PurchaseOrder, PremiumRecord, PremiumSplit,
    VerificationRecord, ReviewItem, SourceRef,
    OrderStatus, PremiumStatus, VerifyResult, compute_data_hash
)


def review_data_consistency(
    orders: List[PurchaseOrder],
    premiums: List[PremiumRecord],
    farmer_index: Dict[str, Farmer],
) -> List[ReviewItem]:
    items: List[ReviewItem] = []

    order_index = {o.order_id: o for o in orders}
    for p in premiums:
        if p.order_id not in order_index:
            farmer = farmer_index.get(p.farmer_id)
            farmer_name = farmer.name if farmer else "未知农户"
            item = ReviewItem(
                item_id=compute_data_hash({"type": "missing_order", "premium_id": p.premium_id}),
                category="数据不一致",
                order_id=p.order_id,
                farmer_id=p.farmer_id,
                farmer_name=farmer_name,
                issue_description=f"保费记录{p.premium_id}关联的订单{p.order_id}不存在",
                severity="高",
                related_records=[p.record_id()],
                suggestion="请检查订单数据是否完整，或确认保费记录是否关联错误",
                sources=[p.source] if p.source else [],
            )
            items.append(item)

    premium_orders = {p.order_id for p in premiums}
    for o in orders:
        if o.status == OrderStatus.CANCELLED:
            continue
        if o.order_id not in premium_orders:
            farmer = farmer_index.get(o.farmer_id)
            farmer_name = farmer.name if farmer else "未知农户"
            item = ReviewItem(
                item_id=compute_data_hash({"type": "missing_premium", "order_id": o.order_id}),
                category="数据不一致",
                order_id=o.order_id,
                farmer_id=o.farmer_id,
                farmer_name=farmer_name,
                issue_description=f"订单{o.order_id}({o.crop_type} {o.area_mu}亩)暂无对应保费记录",
                severity="中",
                related_records=[o.record_id()],
                suggestion="请确认该订单是否已投保，或保费数据是否遗漏",
                sources=[o.source] if o.source else [],
            )
            items.append(item)

    return items


def review_cancelled_orders(
    orders: List[PurchaseOrder],
    premiums_by_order: Dict[str, List[PremiumRecord]],
    farmer_index: Dict[str, Farmer],
) -> List[ReviewItem]:
    items: List[ReviewItem] = []

    for o in orders:
        if o.status != OrderStatus.CANCELLED:
            continue

        farmer = farmer_index.get(o.farmer_id)
        farmer_name = farmer.name if farmer else "未知农户"
        related_premiums = premiums_by_order.get(o.order_id, [])

        paid_premiums = [p for p in related_premiums if p.status == PremiumStatus.PAID]
        if paid_premiums:
            total_paid = sum(p.farmer_payable for p in paid_premiums)
            item = ReviewItem(
                item_id=compute_data_hash({"type": "cancelled_with_payment", "order_id": o.order_id}),
                category="保单撤销",
                order_id=o.order_id,
                farmer_id=o.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"订单{o.order_id}已于{str(o.cancellation_date)}撤销 "
                    f"(原因: {o.cancellation_reason})，但仍有{len(paid_premiums)}笔保费已缴 "
                    f"合计{total_paid:.2f}元，需办理退款"
                ),
                severity="高",
                related_records=[o.record_id()] + [p.record_id() for p in paid_premiums],
                suggestion="请联系保险公司办理保费退款，同时更新保费状态为refunded",
                sources=([o.source] if o.source else []) +
                        ([p.source for p in paid_premiums if p.source]),
            )
            items.append(item)
        else:
            item = ReviewItem(
                item_id=compute_data_hash({"type": "cancelled_order", "order_id": o.order_id}),
                category="保单撤销",
                order_id=o.order_id,
                farmer_id=o.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"订单{o.order_id}已于{str(o.cancellation_date)}撤销 "
                    f"(原因: {o.cancellation_reason})，已排除在保费核算外"
                ),
                severity="低",
                related_records=[o.record_id()],
                suggestion="已自动跳过该订单的保费计算，请确认撤销手续完整",
                sources=[o.source] if o.source else [],
            )
            items.append(item)

    return items


def review_area_verification(
    verifications: List[VerificationRecord],
    farmer_index: Dict[str, Farmer],
) -> List[ReviewItem]:
    items: List[ReviewItem] = []

    for v in verifications:
        if v.result == VerifyResult.PASSED:
            continue

        farmer = farmer_index.get(v.farmer_id)
        farmer_name = farmer.name if farmer else "未知农户"

        severity_map = {
            VerifyResult.FAILED: "高",
            VerifyResult.NEEDS_REVIEW: "中",
            VerifyResult.PENDING: "中",
        }

        failed_checks = [
            f"{k}: {v.check_items[k]['message']}"
            for k in v.check_items
            if not v.check_items[k].get("passed", True)
        ]

        suggestion_map = {
            VerifyResult.FAILED: "请人工核实面积数据，修正后重新核验",
            VerifyResult.NEEDS_REVIEW: "建议与农户确认实际种植面积，必要时现场核查",
            VerifyResult.PENDING: "请补充土地台账或历史数据后继续核验",
        }

        item = ReviewItem(
            item_id=compute_data_hash({"type": "area_issue", "verify_id": v.verify_id}),
            category="面积核验",
            order_id=v.order_id,
            farmer_id=v.farmer_id,
            farmer_name=farmer_name,
            issue_description=(
                f"订单{v.order_id}面积核验{str(v.result)}: "
                f"申报{v.reported_area:.2f}亩，核验{v.verified_area:.2f}亩，"
                f"差异{v.area_diff:+.2f}亩({v.area_diff_pct:+.1f}%)。"
                f"问题: {'; '.join(failed_checks)}"
            ),
            severity=severity_map.get(v.result, "中"),
            related_records=[v.record_id()],
            suggestion=suggestion_map.get(v.result, "请人工复核"),
            sources=v.sources,
        )
        items.append(item)

    return items


def review_subsidy_tracing(
    premiums: List[PremiumRecord],
    splits: List[PremiumSplit],
    farmer_index: Dict[str, Farmer],
) -> List[ReviewItem]:
    items: List[ReviewItem] = []

    split_index = {s.order_id: s for s in splits}

    for p in premiums:
        if p.status == PremiumStatus.REFUNDED:
            continue

        split = split_index.get(p.order_id)
        farmer = farmer_index.get(p.farmer_id)
        farmer_name = farmer.name if farmer else "未知农户"

        if not p.subsidy_tracing:
            expected_subsidy = split.subsidy_amount if split else p.subsidy_amount
            item = ReviewItem(
                item_id=compute_data_hash({"type": "missing_tracing", "premium_id": p.premium_id}),
                category="补贴追溯",
                order_id=p.order_id,
                farmer_id=p.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"保费记录{p.premium_id}缺少补贴追溯信息，"
                    f"涉及补贴金额{p.subsidy_amount:.2f}元"
                ),
                severity="中",
                related_records=[p.record_id()],
                suggestion="请补充补贴资金来源、拨付批次等追溯信息",
                sources=[p.source] if p.source else [],
            )
            items.append(item)

        if split and abs(p.subsidy_amount - split.subsidy_amount) > 0.01:
            item = ReviewItem(
                item_id=compute_data_hash({"type": "subsidy_mismatch", "premium_id": p.premium_id}),
                category="补贴追溯",
                order_id=p.order_id,
                farmer_id=p.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"保费记录{p.premium_id}补贴金额{p.subsidy_amount:.2f}元 "
                    f"与分摊计算{split.subsidy_amount:.2f}元不一致，"
                    f"差异{p.subsidy_amount - split.subsidy_amount:+.2f}元"
                ),
                severity="高",
                related_records=[p.record_id(), split.record_id()],
                suggestion="请核实补贴计算标准，必要时调整保费或重新分摊",
                sources=([p.source] if p.source else []) + split.sources,
            )
            items.append(item)

        if split and abs(p.total_premium - split.total_premium) > 0.01:
            item = ReviewItem(
                item_id=compute_data_hash({"type": "premium_mismatch", "premium_id": p.premium_id}),
                category="保费分摊",
                order_id=p.order_id,
                farmer_id=p.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"保费记录{p.premium_id}总保费{p.total_premium:.2f}元 "
                    f"与分摊计算{split.total_premium:.2f}元不一致，"
                    f"差异{p.total_premium - split.total_premium:+.2f}元"
                ),
                severity="高",
                related_records=[p.record_id(), split.record_id()],
                suggestion="请核实保费计算标准，确认面积和费率是否正确",
                sources=([p.source] if p.source else []) + split.sources,
            )
            items.append(item)

    return items


def review_amended_orders(
    orders: List[PurchaseOrder],
    premiums_by_order: Dict[str, List[PremiumRecord]],
    farmer_index: Dict[str, Farmer],
) -> List[ReviewItem]:
    items: List[ReviewItem] = []

    for o in orders:
        if o.status != OrderStatus.AMENDED:
            continue

        farmer = farmer_index.get(o.farmer_id)
        farmer_name = farmer.name if farmer else "未知农户"
        related_premiums = premiums_by_order.get(o.order_id, [])

        if not related_premiums:
            item = ReviewItem(
                item_id=compute_data_hash({"type": "amended_no_premium", "order_id": o.order_id}),
                category="面积变更",
                order_id=o.order_id,
                farmer_id=o.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"变更订单{o.order_id}({o.crop_type})面积{o.area_mu:.2f}亩，"
                    f"变更说明: {o.amendment_note}，但暂无历史保费数据对比"
                ),
                severity="中",
                related_records=[o.record_id()],
                suggestion="请确认该订单是否为新投保，或历史数据是否遗漏",
                sources=[o.source] if o.source else [],
            )
            items.append(item)
        else:
            old_area = related_premiums[0].total_premium / 30.0
            diff = o.area_mu - old_area
            diff_pct = abs(diff) / old_area * 100 if old_area > 0 else 0

            item = ReviewItem(
                item_id=compute_data_hash({"type": "area_changed", "order_id": o.order_id}),
                category="面积变更",
                order_id=o.order_id,
                farmer_id=o.farmer_id,
                farmer_name=farmer_name,
                issue_description=(
                    f"订单{o.order_id}面积已变更: 原约{old_area:.2f}亩 → 现{o.area_mu:.2f}亩，"
                    f"变化{diff:+.2f}亩({diff_pct:+.1f}%)。变更说明: {o.amendment_note}"
                ),
                severity="中",
                related_records=[o.record_id()] + [p.record_id() for p in related_premiums],
                suggestion="请按新面积重新核算保费，如需补贴调整请走变更流程",
                sources=([o.source] if o.source else []) +
                        ([p.source for p in related_premiums if p.source]),
            )
            items.append(item)

    return items


def generate_review_list(
    farmers: List[Farmer],
    orders: List[PurchaseOrder],
    premiums: List[PremiumRecord],
    verifications: List[VerificationRecord],
    splits: List[PremiumSplit],
) -> List[ReviewItem]:
    farmer_index = {f.farmer_id: f for f in farmers}
    premiums_by_order: Dict[str, List[PremiumRecord]] = {}
    for p in premiums:
        premiums_by_order.setdefault(p.order_id, []).append(p)

    all_items: List[ReviewItem] = []

    all_items.extend(review_data_consistency(orders, premiums, farmer_index))
    all_items.extend(review_cancelled_orders(orders, premiums_by_order, farmer_index))
    all_items.extend(review_area_verification(verifications, farmer_index))
    all_items.extend(review_subsidy_tracing(premiums, splits, farmer_index))
    all_items.extend(review_amended_orders(orders, premiums_by_order, farmer_index))

    all_items.sort(key=lambda x: {"高": 0, "中": 1, "低": 2}.get(x.severity, 99))

    return all_items
