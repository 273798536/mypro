import pandas as pd
from datetime import datetime, date
from sqlalchemy import and_, or_
from .models import (
    GoodsItem, CustomsDeclaration, DutyEstimation, AnomalyRecord,
    HSCodeReference, get_session
)
from .utils import normalize_hs_code, validate_hs_code
from .config import REVIEW_STATUS


def link_declarations_to_goods(session, period=None):
    query = session.query(CustomsDeclaration).filter(
        CustomsDeclaration.goods_item_id.is_(None)
    )
    if period:
        query = query.filter(CustomsDeclaration.entry_date.like(f"{period[:4]}-{period[4:]}%"))

    declarations = query.all()
    linked_count = 0

    for decl in declarations:
        goods = session.query(GoodsItem).filter(
            GoodsItem.sku == decl.sku
        ).order_by(GoodsItem.created_at.desc()).first()
        if goods:
            decl.goods_item_id = goods.id
            linked_count += 1

    session.commit()
    return linked_count


def link_estimations_to_records(session, period=None):
    query = session.query(DutyEstimation).filter(
        or_(
            DutyEstimation.goods_item_id.is_(None),
            DutyEstimation.declaration_id.is_(None)
        )
    )
    if period:
        query = query.filter(DutyEstimation.period == period)

    estimations = query.all()
    goods_linked = 0
    decl_linked = 0

    for est in estimations:
        if est.goods_item_id is None:
            goods = session.query(GoodsItem).filter(
                GoodsItem.sku == est.sku
            ).order_by(GoodsItem.created_at.desc()).first()
            if goods:
                est.goods_item_id = goods.id
                goods_linked += 1

        if est.declaration_id is None and est.goods_item_id:
            decl = session.query(CustomsDeclaration).filter(
                CustomsDeclaration.goods_item_id == est.goods_item_id
            ).order_by(CustomsDeclaration.entry_date.desc()).first()
            if decl:
                est.declaration_id = decl.id
                decl_linked += 1

    session.commit()
    return {"goods_linked": goods_linked, "declarations_linked": decl_linked}


def check_hs_code_consistency(session, estimation):
    anomalies = []

    hs_used = estimation.hs_code_used or ""
    hs_used_norm = normalize_hs_code(hs_used)

    if estimation.declaration_id:
        decl = session.query(CustomsDeclaration).get(estimation.declaration_id)
        if decl and decl.hs_code:
            decl_hs_norm = normalize_hs_code(decl.hs_code)
            if hs_used_norm and decl_hs_norm and hs_used_norm != decl_hs_norm:
                anomalies.append({
                    "anomaly_type": "HS_CODE_MISMATCH",
                    "anomaly_description": f"暂估使用税则号 {hs_used} 与报关单 {decl.hs_code} 不一致",
                    "field_name": "hs_code_used",
                    "old_value": decl.hs_code,
                    "new_value": hs_used,
                })

    if estimation.goods_item_id:
        goods = session.query(GoodsItem).get(estimation.goods_item_id)
        if goods:
            if goods.declared_hs_code:
                declared_norm = normalize_hs_code(goods.declared_hs_code)
                if hs_used_norm and declared_norm and hs_used_norm != declared_norm:
                    anomalies.append({
                        "anomaly_type": "HS_CODE_MISMATCH",
                        "anomaly_description": f"暂估使用税则号 {hs_used} 与商品清单申报税则号 {goods.declared_hs_code} 不一致",
                        "field_name": "hs_code_used",
                        "old_value": goods.declared_hs_code,
                        "new_value": hs_used,
                    })

            if goods.hs_code:
                goods_hs_norm = normalize_hs_code(goods.hs_code)
                if hs_used_norm and goods_hs_norm and hs_used_norm != goods_hs_norm:
                    anomalies.append({
                        "anomaly_type": "HS_CODE_MISMATCH",
                        "anomaly_description": f"暂估使用税则号 {hs_used} 与商品清单基准税则号 {goods.hs_code} 不一致",
                        "field_name": "hs_code_used",
                        "old_value": goods.hs_code,
                        "new_value": hs_used,
                    })

    valid, msg = validate_hs_code(hs_used)
    if not valid:
        anomalies.append({
            "anomaly_type": "HS_CODE_MISMATCH",
            "anomaly_description": f"税则号格式校验失败: {msg}",
            "field_name": "hs_code_used",
            "new_value": hs_used,
        })

    return anomalies


def check_exchange_rate_cross_period(session, estimation, period):
    anomalies = []

    if not estimation.estimation_date or not estimation.exchange_rate_used:
        return anomalies

    est_month = estimation.estimation_date.strftime("%Y%m")
    target_month = period.replace("-", "") if period else est_month

    if est_month != target_month:
        anomalies.append({
            "anomaly_type": "EXCHANGE_RATE_CROSS_PERIOD",
            "anomaly_description": f"汇率跨期: 暂估日期 {estimation.estimation_date} 汇率用于 {target_month} 期间",
            "field_name": "exchange_rate_used",
            "old_value": est_month,
            "new_value": target_month,
        })

    if estimation.declaration_id:
        decl = session.query(CustomsDeclaration).get(estimation.declaration_id)
        if decl and decl.exchange_rate and decl.entry_date:
            rate_diff = abs(estimation.exchange_rate_used - decl.exchange_rate)
            if rate_diff > 0.001:
                decl_month = decl.entry_date.strftime("%Y%m")
                anomalies.append({
                    "anomaly_type": "EXCHANGE_RATE_CROSS_PERIOD",
                    "anomaly_description": f"汇率差异: 暂估汇率 {estimation.exchange_rate_used} 与报关汇率 {decl.exchange_rate} 差异 {rate_diff:.4f}",
                    "field_name": "exchange_rate_used",
                    "old_value": str(decl.exchange_rate),
                    "new_value": str(estimation.exchange_rate_used),
                })
                if decl_month != target_month:
                    anomalies.append({
                        "anomaly_type": "EXCHANGE_RATE_CROSS_PERIOD",
                        "anomaly_description": f"报关单跨期: 报关日期 {decl.entry_date} 所属期 {decl_month} 与目标期间 {target_month} 不一致",
                        "field_name": "entry_date",
                        "old_value": decl_month,
                        "new_value": target_month,
                    })

    return anomalies


def check_supplement_declaration(session, estimation):
    anomalies = []

    if not estimation.sku or not estimation.period:
        return anomalies

    previous = session.query(DutyEstimation).filter(
        DutyEstimation.sku == estimation.sku,
        DutyEstimation.period == estimation.period,
        DutyEstimation.id != estimation.id
    ).order_by(DutyEstimation.created_at.desc()).first()

    if previous:
        diff_fields = []
        if abs((previous.estimated_duty or 0) - (estimation.estimated_duty or 0)) > 0.01:
            diff_fields.append(f"暂估关税: {previous.estimated_duty} -> {estimation.estimated_duty}")
        if abs((previous.estimated_tax or 0) - (estimation.estimated_tax or 0)) > 0.01:
            diff_fields.append(f"暂估增值税: {previous.estimated_tax} -> {estimation.estimated_tax}")
        if previous.hs_code_used != estimation.hs_code_used:
            diff_fields.append(f"税则号: {previous.hs_code_used} -> {estimation.hs_code_used}")
        if abs((previous.exchange_rate_used or 0) - (estimation.exchange_rate_used or 0)) > 0.0001:
            diff_fields.append(f"汇率: {previous.exchange_rate_used} -> {estimation.exchange_rate_used}")

        if diff_fields:
            anomalies.append({
                "anomaly_type": "SUPPLEMENT_DECLARATION",
                "anomaly_description": f"补申报覆盖: 同一SKU同一期间存在多次暂估记录。差异字段: {'; '.join(diff_fields)}",
                "field_name": "supplementary",
                "old_value": f"记录ID #{previous.id}",
                "new_value": f"记录ID #{estimation.id}",
            })

    return anomalies


def check_calculation_consistency(session, estimation):
    anomalies = []

    if not estimation.declaration_id:
        return anomalies

    decl = session.query(CustomsDeclaration).get(estimation.declaration_id)
    if not decl:
        return anomalies

    if estimation.exchange_rate_used and decl.cif_amount and decl.duty_rate:
        calc_duty = decl.cif_amount * estimation.exchange_rate_used * (decl.duty_rate / 100)
        if estimation.estimated_duty is not None:
            duty_diff = abs(estimation.estimated_duty - calc_duty)
            if duty_diff > 1.0:
                anomalies.append({
                    "anomaly_type": "CALCULATION_MISMATCH",
                    "anomaly_description": f"关税计算口径不一致: 暂估 {estimation.estimated_duty:.2f} vs 计算值 {calc_duty:.2f} (差异 {duty_diff:.2f})",
                    "field_name": "estimated_duty",
                    "old_value": f"{calc_duty:.2f}",
                    "new_value": f"{estimation.estimated_duty:.2f}",
                })

    if estimation.exchange_rate_used and decl.cif_amount and decl.duty_rate and decl.tax_rate:
        cif_cny = decl.cif_amount * estimation.exchange_rate_used
        duty_calc = cif_cny * (decl.duty_rate / 100)
        calc_tax = (cif_cny + duty_calc) * (decl.tax_rate / 100)
        if estimation.estimated_tax is not None:
            tax_diff = abs(estimation.estimated_tax - calc_tax)
            if tax_diff > 1.0:
                anomalies.append({
                    "anomaly_type": "CALCULATION_MISMATCH",
                    "anomaly_description": f"增值税计算口径不一致: 暂估 {estimation.estimated_tax:.2f} vs 计算值 {calc_tax:.2f} (差异 {tax_diff:.2f})",
                    "field_name": "estimated_tax",
                    "old_value": f"{calc_tax:.2f}",
                    "new_value": f"{estimation.estimated_tax:.2f}",
                })

    return anomalies


def check_abnormal_reserve(session, estimation):
    anomalies = []

    if estimation.estimated_duty is None or estimation.estimated_tax is None:
        anomalies.append({
            "anomaly_type": "MISSING_DATA",
            "anomaly_description": "暂估数据缺失: 暂估关税或增值税为空",
            "field_name": "estimated_duty/estimated_tax",
        })
        return anomalies

    total = estimation.estimated_duty + estimation.estimated_tax
    if total == 0:
        anomalies.append({
            "anomaly_type": "ABNORMAL_RESERVE",
            "anomaly_description": "异常保留: 暂估税费合计为0",
            "field_name": "total_estimated",
            "new_value": "0",
        })

    if estimation.goods_item_id:
        goods = session.query(GoodsItem).get(estimation.goods_item_id)
        if goods and goods.quantity and goods.unit_price:
            expected_min = goods.quantity * goods.unit_price * 0.01
            if total > 0 and total < expected_min:
                anomalies.append({
                    "anomaly_type": "ABNORMAL_RESERVE",
                    "anomaly_description": f"异常保留: 暂估税费 {total:.2f} 低于预期最小值 {expected_min:.2f}",
                    "field_name": "total_estimated",
                    "old_value": f"{expected_min:.2f}",
                    "new_value": f"{total:.2f}",
                })

    return anomalies


def estimate_duty(session, sku=None, period=None, auto_link=True):
    if auto_link:
        link_declarations_to_goods(session, period)
        link_estimations_to_records(session, period)

    query = session.query(DutyEstimation)
    if sku:
        query = query.filter(DutyEstimation.sku == sku)
    if period:
        query = query.filter(DutyEstimation.period == period)

    estimations = query.all()
    results = []

    for est in estimations:
        anomalies = []
        anomalies.extend(check_hs_code_consistency(session, est))
        anomalies.extend(check_exchange_rate_cross_period(session, est, period))
        anomalies.extend(check_supplement_declaration(session, est))
        anomalies.extend(check_calculation_consistency(session, est))
        anomalies.extend(check_abnormal_reserve(session, est))

        status = "APPROVED" if not anomalies else "PENDING"
        est.review_status = status

        for anom_data in anomalies:
            anom = AnomalyRecord(estimation_id=est.id, **anom_data)
            session.add(anom)

        results.append({
            "estimation_id": est.id,
            "sku": est.sku,
            "period": est.period,
            "status": status,
            "anomaly_count": len(anomalies),
            "anomalies": anomalies,
        })

    session.commit()
    return results


def calculate_estimated_duty(declaration, exchange_rate=None, hs_code=None):
    if not declaration:
        return None, None

    rate = exchange_rate if exchange_rate else declaration.exchange_rate
    hs = normalize_hs_code(hs_code) if hs_code else normalize_hs_code(declaration.hs_code)

    if not declaration.cif_amount or not rate or not declaration.duty_rate:
        return None, None

    cif_cny = declaration.cif_amount * rate
    duty = cif_cny * (declaration.duty_rate / 100)

    tax = None
    if declaration.tax_rate:
        tax = (cif_cny + duty) * (declaration.tax_rate / 100)

    return round(duty, 2), round(tax, 2) if tax else None
