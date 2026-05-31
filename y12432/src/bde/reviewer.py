from datetime import datetime
from sqlalchemy import and_, or_
from .models import (
    DutyEstimation, AnomalyRecord, ImportRecord,
    GoodsItem, CustomsDeclaration, get_session
)
from .utils import status_text, anomaly_text
from .config import REVIEW_STATUS, ANOMALY_TYPES


def get_pending_reviews(session, period=None, anomaly_type=None, sku=None, limit=100):
    query = session.query(DutyEstimation).filter(
        DutyEstimation.review_status == "PENDING"
    )

    if period:
        query = query.filter(DutyEstimation.period == period)
    if sku:
        query = query.filter(DutyEstimation.sku == sku)

    if anomaly_type:
        query = query.join(AnomalyRecord).filter(
            AnomalyRecord.anomaly_type == anomaly_type,
            AnomalyRecord.resolved == False
        )

    estimations = query.order_by(DutyEstimation.period, DutyEstimation.sku).limit(limit).all()

    results = []
    for est in estimations:
        anomalies = session.query(AnomalyRecord).filter(
            AnomalyRecord.estimation_id == est.id,
            AnomalyRecord.resolved == False
        ).all()

        goods_name = ""
        entry_no = ""
        if est.goods_item_id:
            goods = session.query(GoodsItem).get(est.goods_item_id)
            if goods:
                goods_name = goods.name
        if est.declaration_id:
            decl = session.query(CustomsDeclaration).get(est.declaration_id)
            if decl:
                entry_no = decl.entry_no

        results.append({
            "id": est.id,
            "sku": est.sku,
            "name": goods_name,
            "period": est.period,
            "report_no": est.report_no,
            "entry_no": entry_no,
            "hs_code_used": est.hs_code_used,
            "estimated_duty": est.estimated_duty,
            "estimated_tax": est.estimated_tax,
            "status": status_text(est.review_status),
            "anomaly_count": len(anomalies),
            "anomalies": [
                {
                    "type": anomaly_text(a.anomaly_type),
                    "type_code": a.anomaly_type,
                    "description": a.anomaly_description,
                    "field": a.field_name,
                    "old_value": a.old_value,
                    "new_value": a.new_value,
                }
                for a in anomalies
            ],
            "source_trace": get_source_trace(session, est),
        })

    return results


def get_source_trace(session, estimation):
    trace = []

    if estimation.import_record_id:
        ir = session.query(ImportRecord).get(estimation.import_record_id)
        if ir:
            trace.append({
                "type": "暂估报告",
                "file": ir.source_file,
                "sheet": ir.sheet_name,
                "row": estimation.source_row,
                "import_time": ir.import_time,
            })

    if estimation.declaration_id:
        decl = session.query(CustomsDeclaration).get(estimation.declaration_id)
        if decl and decl.import_record_id:
            ir = session.query(ImportRecord).get(decl.import_record_id)
            if ir:
                trace.append({
                    "type": "报关单",
                    "file": ir.source_file,
                    "sheet": ir.sheet_name,
                    "row": decl.source_row,
                    "entry_no": decl.entry_no,
                    "import_time": ir.import_time,
                })

    if estimation.goods_item_id:
        goods = session.query(GoodsItem).get(estimation.goods_item_id)
        if goods and goods.import_record_id:
            ir = session.query(ImportRecord).get(goods.import_record_id)
            if ir:
                trace.append({
                    "type": "商品清单",
                    "file": ir.source_file,
                    "sheet": ir.sheet_name,
                    "row": goods.source_row,
                    "contract_no": goods.contract_no,
                    "import_time": ir.import_time,
                })

    return trace


def update_review_status(session, estimation_id, status, reviewed_by=None, notes=None):
    if status not in REVIEW_STATUS:
        return {"success": False, "error": f"无效状态: {status}"}

    estimation = session.query(DutyEstimation).get(estimation_id)
    if not estimation:
        return {"success": False, "error": f"记录不存在: {estimation_id}"}

    estimation.review_status = status
    if status == "APPROVED" or status == "REJECTED":
        anomalies = session.query(AnomalyRecord).filter(
            AnomalyRecord.estimation_id == estimation_id,
            AnomalyRecord.resolved == False
        ).all()
        for a in anomalies:
            a.resolved = True
            a.resolved_at = datetime.now()
            a.resolved_by = reviewed_by
            a.resolution_notes = notes

    session.commit()
    return {
        "success": True,
        "id": estimation_id,
        "status": status_text(status),
        "resolved_anomalies": len(anomalies) if status in ["APPROVED", "REJECTED"] else 0,
    }


def resolve_anomaly(session, anomaly_id, resolved_by=None, notes=None):
    anomaly = session.query(AnomalyRecord).get(anomaly_id)
    if not anomaly:
        return {"success": False, "error": f"异常记录不存在: {anomaly_id}"}

    anomaly.resolved = True
    anomaly.resolved_at = datetime.now()
    anomaly.resolved_by = resolved_by
    anomaly.resolution_notes = notes

    estimation = session.query(DutyEstimation).get(anomaly.estimation_id)
    if estimation:
        remaining = session.query(AnomalyRecord).filter(
            AnomalyRecord.estimation_id == estimation.id,
            AnomalyRecord.resolved == False
        ).count()
        if remaining == 0 and estimation.review_status == "PENDING":
            estimation.review_status = "REVIEWED"

    session.commit()
    return {"success": True, "anomaly_id": anomaly_id}


def get_review_statistics(session, period=None):
    query = session.query(DutyEstimation)
    if period:
        query = query.filter(DutyEstimation.period == period)

    total = query.count()

    stats = {}
    for code in REVIEW_STATUS:
        count = query.filter(DutyEstimation.review_status == code).count()
        stats[code] = {
            "count": count,
            "label": status_text(code),
            "percentage": round(count / total * 100, 2) if total > 0 else 0,
        }

    anomaly_stats = {}
    anomaly_query = session.query(AnomalyRecord)
    if period:
        anomaly_query = anomaly_query.join(DutyEstimation).filter(
            DutyEstimation.period == period
        )

    for code in ANOMALY_TYPES:
        count = anomaly_query.filter(
            AnomalyRecord.anomaly_type == code,
            AnomalyRecord.resolved == False
        ).count()
        if count > 0:
            anomaly_stats[code] = {
                "count": count,
                "label": anomaly_text(code),
            }

    return {
        "period": period,
        "total_records": total,
        "status_breakdown": stats,
        "anomaly_breakdown": anomaly_stats,
    }


def get_detailed_estimation(session, estimation_id):
    est = session.query(DutyEstimation).get(estimation_id)
    if not est:
        return None

    goods = session.query(GoodsItem).get(est.goods_item_id) if est.goods_item_id else None
    decl = session.query(CustomsDeclaration).get(est.declaration_id) if est.declaration_id else None

    anomalies = session.query(AnomalyRecord).filter(
        AnomalyRecord.estimation_id == est.id
    ).order_by(AnomalyRecord.resolved, AnomalyRecord.detected_at).all()

    return {
        "estimation": {
            "id": est.id,
            "sku": est.sku,
            "period": est.period,
            "report_no": est.report_no,
            "hs_code_used": est.hs_code_used,
            "exchange_rate_used": est.exchange_rate_used,
            "estimated_duty": est.estimated_duty,
            "estimated_tax": est.estimated_tax,
            "estimation_date": est.estimation_date,
            "estimator": est.estimator,
            "status": status_text(est.review_status),
            "status_code": est.review_status,
        },
        "goods": {
            "name": goods.name if goods else "",
            "hs_code": goods.hs_code if goods else "",
            "declared_hs_code": goods.declared_hs_code if goods else "",
            "origin_country": goods.origin_country if goods else "",
            "unit_price": goods.unit_price if goods else None,
            "quantity": goods.quantity if goods else None,
            "contract_no": goods.contract_no if goods else "",
        } if goods else None,
        "declaration": {
            "entry_no": decl.entry_no if decl else "",
            "entry_date": decl.entry_date if decl else None,
            "hs_code": decl.hs_code if decl else "",
            "duty_rate": decl.duty_rate if decl else None,
            "tax_rate": decl.tax_rate if decl else None,
            "cif_amount": decl.cif_amount if decl else None,
            "currency": decl.currency if decl else "",
            "exchange_rate": decl.exchange_rate if decl else None,
            "duty_amount": decl.duty_amount if decl else None,
            "tax_amount": decl.tax_amount if decl else None,
        } if decl else None,
        "anomalies": [
            {
                "id": a.id,
                "type": anomaly_text(a.anomaly_type),
                "type_code": a.anomaly_type,
                "description": a.anomaly_description,
                "field": a.field_name,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "resolved": a.resolved,
                "resolved_at": a.resolved_at,
                "resolved_by": a.resolved_by,
                "resolution_notes": a.resolution_notes,
                "detected_at": a.detected_at,
            }
            for a in anomalies
        ],
        "source_trace": get_source_trace(session, est),
    }
