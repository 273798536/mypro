from typing import List, Dict, Any, Tuple
from datetime import date

from .models import (
    PurchaseOrder, PremiumRecord, VerificationRecord, SourceRef,
    VerifyResult, OrderStatus, compute_data_hash
)


AREA_TOLERANCE_PCT = 5.0
MAX_REASONABLE_AREA = 500.0
MIN_REASONABLE_AREA = 0.1


def check_area_range(area: float) -> Tuple[bool, str]:
    if area < MIN_REASONABLE_AREA:
        return False, f"面积过小: {area:.2f}亩 < {MIN_REASONABLE_AREA}亩"
    if area > MAX_REASONABLE_AREA:
        return False, f"面积过大: {area:.2f}亩 > {MAX_REASONABLE_AREA}亩"
    return True, "面积在合理范围内"


def check_area_consistency(
    order_area: float, premium_areas: List[float]
) -> Tuple[bool, str, float]:
    if not premium_areas:
        return True, "无历史保费数据可对比", 0.0

    avg_premium_area = sum(premium_areas) / len(premium_areas)
    diff_pct = abs(order_area - avg_premium_area) / avg_premium_area * 100 if avg_premium_area > 0 else 0

    if diff_pct > AREA_TOLERANCE_PCT:
        return (
            False,
            f"与历史保费面积偏差{diff_pct:.1f}% > {AREA_TOLERANCE_PCT}%",
            diff_pct,
        )
    return True, f"与历史保费面积偏差{diff_pct:.1f}%，在允许范围内", diff_pct


def check_crop_area_matching(crop_type: str, area: float) -> Tuple[bool, str]:
    crop_limits = {
        "水稻": (0.5, 200.0),
        "小麦": (0.5, 300.0),
        "玉米": (0.5, 300.0),
        "大豆": (0.5, 200.0),
        "花生": (0.3, 100.0),
        "油菜": (0.3, 200.0),
        "棉花": (0.5, 150.0),
        "蔬菜": (0.1, 100.0),
        "水果": (0.5, 200.0),
        "茶叶": (0.5, 150.0),
    }

    if crop_type in crop_limits:
        min_a, max_a = crop_limits[crop_type]
        if area < min_a:
            return False, f"{crop_type}面积过小: {area:.2f}亩 < {min_a}亩"
        if area > max_a:
            return False, f"{crop_type}面积过大: {area:.2f}亩 > {max_a}亩"

    return True, f"{crop_type}面积符合种植常识"


def check_amendment_consistency(
    order: PurchaseOrder, premium_areas: List[float]
) -> Tuple[bool, str]:
    if order.status != OrderStatus.AMENDED:
        return True, "非变更订单，跳过一致性检查"

    if not premium_areas:
        return False, "变更订单缺少历史保费数据，无法核验"

    old_area = premium_areas[0]
    new_area = order.area_mu
    diff = new_area - old_area
    diff_pct = abs(diff) / old_area * 100 if old_area > 0 else 0

    if not order.amendment_note:
        return (
            False,
            f"面积变更{diff:+.2f}亩({diff_pct:+.1f}%)，但缺少变更说明",
        )

    return (
        True,
        f"面积变更{diff:+.2f}亩({diff_pct:+.1f}%)，已有变更说明: {order.amendment_note}",
    )


def verify_order_area(
    order: PurchaseOrder,
    premiums: List[PremiumRecord],
    land_ledger_area: float = 0.0,
) -> VerificationRecord:
    reported_area = order.area_mu
    verified_area = reported_area
    result = VerifyResult.PASSED
    check_items: Dict[str, Any] = {}
    notes: List[str] = []
    sources: List[SourceRef] = []

    if order.source:
        sources.append(order.source)
    for p in premiums:
        if p.source:
            sources.append(p.source)

    range_ok, range_msg = check_area_range(reported_area)
    check_items["area_range"] = {"passed": range_ok, "message": range_msg}
    if not range_ok:
        result = VerifyResult.FAILED
        notes.append(range_msg)

    premium_areas = []
    for p in premiums:
        if p.status != "refunded" and p.total_premium > 0:
            unit = p.total_premium / p.subsidy_amount * (1 - p.subsidy_amount / p.total_premium) if p.subsidy_amount > 0 else 30
            est_area = p.total_premium / 30.0
            premium_areas.append(est_area)

    consistency_ok, consistency_msg, diff_pct = check_area_consistency(reported_area, premium_areas)
    check_items["historical_consistency"] = {
        "passed": consistency_ok,
        "message": consistency_msg,
        "diff_pct": diff_pct,
    }
    if not consistency_ok and result == VerifyResult.PASSED:
        result = VerifyResult.NEEDS_REVIEW
        notes.append(consistency_msg)

    if diff_pct > 0 and premium_areas:
        avg_area = sum(premium_areas) / len(premium_areas)
        verified_area = avg_area if abs(diff_pct) > AREA_TOLERANCE_PCT else reported_area
        if verified_area != reported_area:
            notes.append(f"核验面积采用历史平均值: {verified_area:.2f}亩")

    crop_ok, crop_msg = check_crop_area_matching(order.crop_type, reported_area)
    check_items["crop_area_match"] = {"passed": crop_ok, "message": crop_msg}
    if not crop_ok and result == VerifyResult.PASSED:
        result = VerifyResult.NEEDS_REVIEW
        notes.append(crop_msg)

    if order.status == OrderStatus.AMENDED:
        amendment_ok, amendment_msg = check_amendment_consistency(order, premium_areas)
        check_items["amendment_consistency"] = {"passed": amendment_ok, "message": amendment_msg}
        if not amendment_ok and result == VerifyResult.PASSED:
            result = VerifyResult.FAILED
        notes.append(amendment_msg)

    if land_ledger_area > 0:
        ledger_diff = reported_area - land_ledger_area
        ledger_diff_pct = abs(ledger_diff) / land_ledger_area * 100 if land_ledger_area > 0 else 0
        check_items["land_ledger_match"] = {
            "passed": ledger_diff_pct <= AREA_TOLERANCE_PCT,
            "message": f"与土地台账差{ledger_diff:+.2f}亩({ledger_diff_pct:+.1f}%)",
        }
        if ledger_diff_pct > AREA_TOLERANCE_PCT and result == VerifyResult.PASSED:
            result = VerifyResult.NEEDS_REVIEW

    if order.status == OrderStatus.CANCELLED:
        result = VerifyResult.PASSED
        check_items["cancelled"] = {"passed": True, "message": "订单已撤销，面积核验仅做记录"}
        notes.append("已撤销订单，不参与保费计算")
        verified_area = 0.0

    area_diff = verified_area - reported_area
    area_diff_pct = (area_diff / reported_area * 100) if reported_area > 0 else 0

    verify_id = compute_data_hash({
        "order_id": order.order_id,
        "reported_area": reported_area,
        "premium_areas": premium_areas,
        "land_ledger_area": land_ledger_area,
    })

    return VerificationRecord(
        verify_id=verify_id,
        order_id=order.order_id,
        farmer_id=order.farmer_id,
        reported_area=reported_area,
        verified_area=verified_area,
        area_diff=round(area_diff, 2),
        area_diff_pct=round(area_diff_pct, 2),
        result=result,
        check_items=check_items,
        notes="; ".join(notes) if notes else None,
        verify_date=date.today(),
        sources=sources,
    )


def verify_all_orders(
    orders: List[PurchaseOrder],
    premiums_by_order: Dict[str, List[PremiumRecord]],
    land_ledger: Dict[str, float] = None,
) -> List[VerificationRecord]:
    land_ledger = land_ledger or {}
    results: List[VerificationRecord] = []

    for order in orders:
        premiums = premiums_by_order.get(order.order_id, [])
        ledger_area = land_ledger.get(order.order_id, 0.0)

        vr = verify_order_area(order, premiums, ledger_area)
        results.append(vr)

    return results


def get_verified_area_map(verifications: List[VerificationRecord]) -> Dict[str, float]:
    return {v.order_id: v.verified_area for v in verifications}
