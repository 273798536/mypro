from typing import List, Dict, Any
from decimal import Decimal, ROUND_HALF_UP

from .models import (
    PurchaseOrder, PremiumRecord, PremiumSplit, SourceRef,
    OrderStatus, PremiumStatus, compute_data_hash
)


CROP_PREMIUM_RATES: Dict[str, Dict[str, float]] = {
    "水稻": {"unit_premium": 30.0, "subsidy_rate": 0.8},
    "小麦": {"unit_premium": 25.0, "subsidy_rate": 0.8},
    "玉米": {"unit_premium": 28.0, "subsidy_rate": 0.75},
    "大豆": {"unit_premium": 32.0, "subsidy_rate": 0.8},
    "花生": {"unit_premium": 35.0, "subsidy_rate": 0.7},
    "油菜": {"unit_premium": 22.0, "subsidy_rate": 0.8},
    "棉花": {"unit_premium": 40.0, "subsidy_rate": 0.65},
    "蔬菜": {"unit_premium": 50.0, "subsidy_rate": 0.6},
    "水果": {"unit_premium": 60.0, "subsidy_rate": 0.5},
    "茶叶": {"unit_premium": 45.0, "subsidy_rate": 0.6},
}

DEFAULT_PREMIUM_RATE = {"unit_premium": 30.0, "subsidy_rate": 0.7}


def get_crop_premium_config(crop_type: str) -> Dict[str, float]:
    return CROP_PREMIUM_RATES.get(crop_type, DEFAULT_PREMIUM_RATE)


def round_money(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_premium_split(
    order: PurchaseOrder,
    verified_area: float,
    existing_premiums: List[PremiumRecord],
) -> PremiumSplit:
    crop_config = get_crop_premium_config(order.crop_type)
    unit_premium = crop_config["unit_premium"]
    subsidy_rate = crop_config["subsidy_rate"]

    use_area = min(verified_area, order.area_mu) if verified_area > 0 else order.area_mu

    total_premium = round_money(use_area * unit_premium)
    subsidy_amount = round_money(total_premium * subsidy_rate)
    farmer_payable = round_money(total_premium - subsidy_amount)

    farmer_rate = round_money(1.0 - subsidy_rate)

    calculation_details = {
        "crop_type": order.crop_type,
        "reported_area": order.area_mu,
        "verified_area": verified_area,
        "used_area": use_area,
        "unit_premium": unit_premium,
        "total_premium_formula": f"{use_area:.2f}亩 × {unit_premium:.2f}元/亩 = {total_premium:.2f}元",
        "subsidy_rate": subsidy_rate,
        "farmer_rate": farmer_rate,
        "subsidy_formula": f"{total_premium:.2f}元 × {subsidy_rate*100:.0f}% = {subsidy_amount:.2f}元",
        "farmer_formula": f"{total_premium:.2f}元 × {farmer_rate*100:.0f}% = {farmer_payable:.2f}元",
        "existing_premium_count": len(existing_premiums),
    }

    if existing_premiums:
        paid_total = sum(p.farmer_payable for p in existing_premiums if p.status == PremiumStatus.PAID)
        refund_total = sum(p.farmer_payable for p in existing_premiums if p.status == PremiumStatus.REFUNDED)
        calculation_details.update({
            "already_paid": paid_total,
            "already_refunded": refund_total,
            "balance_due": round_money(farmer_payable - paid_total + refund_total),
        })

    sources = []
    if order.source:
        sources.append(order.source)
    for p in existing_premiums:
        if p.source:
            sources.append(p.source)

    split_id = compute_data_hash({
        "order_id": order.order_id,
        "verified_area": verified_area,
        "unit_premium": unit_premium,
        "subsidy_rate": subsidy_rate,
    })

    return PremiumSplit(
        split_id=split_id,
        order_id=order.order_id,
        farmer_id=order.farmer_id,
        crop_type=order.crop_type,
        area_mu=use_area,
        total_premium=total_premium,
        farmer_payable=farmer_payable,
        subsidy_amount=subsidy_amount,
        subsidy_rate=subsidy_rate,
        unit_premium=unit_premium,
        calculation_details=calculation_details,
        sources=sources,
    )


def process_all_premium_splits(
    orders: List[PurchaseOrder],
    verification_results: Dict[str, float],
    premiums_by_order: Dict[str, List[PremiumRecord]],
) -> List[PremiumSplit]:
    splits: List[PremiumSplit] = []

    for order in orders:
        if order.status == OrderStatus.CANCELLED:
            continue

        verified_area = verification_results.get(order.order_id, 0.0)
        existing_premiums = premiums_by_order.get(order.order_id, [])

        split = calculate_premium_split(order, verified_area, existing_premiums)
        splits.append(split)

    return splits
