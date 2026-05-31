import hashlib
import pandas as pd
from datetime import datetime
from pathlib import Path
from sqlalchemy import and_, or_
from .config import EXPORT_DIR, EXCEL_ENGINE
from .models import (
    DutyEstimation, AnomalyRecord, GoodsItem, CustomsDeclaration,
    ImportRecord, ExportRecord, get_session
)
from .utils import status_text, anomaly_text, parse_period, format_period


def compare_periods(session, period1, period2):
    est1 = session.query(DutyEstimation).filter(
        DutyEstimation.period == period1
    ).all()
    est2 = session.query(DutyEstimation).filter(
        DutyEstimation.period == period2
    ).all()

    sku_map1 = {e.sku: e for e in est1}
    sku_map2 = {e.sku: e for e in est2}

    all_skus = set(sku_map1.keys()) | set(sku_map2.keys())

    differences = []

    for sku in sorted(all_skus):
        e1 = sku_map1.get(sku)
        e2 = sku_map2.get(sku)

        if not e1:
            differences.append({
                "sku": sku,
                "change_type": "新增",
                "period": period2,
                "field": "存在性",
                "old_value": f"{period1} 无记录",
                "new_value": f"{period2} 有记录",
                "new_estimation_id": e2.id if e2 else None,
            })
            continue

        if not e2:
            differences.append({
                "sku": sku,
                "change_type": "删除",
                "period": period1,
                "field": "存在性",
                "old_value": f"{period1} 有记录",
                "new_value": f"{period2} 无记录",
                "old_estimation_id": e1.id if e1 else None,
            })
            continue

        compare_fields = [
            ("hs_code_used", "使用税则号"),
            ("exchange_rate_used", "使用汇率"),
            ("estimated_duty", "暂估关税"),
            ("estimated_tax", "暂估增值税"),
            ("review_status", "复核状态"),
        ]

        for field, label in compare_fields:
            v1 = getattr(e1, field)
            v2 = getattr(e2, field)

            if field == "review_status":
                v1_text = status_text(v1)
                v2_text = status_text(v2)
                if v1 != v2:
                    differences.append({
                        "sku": sku,
                        "change_type": "变更",
                        "field": label,
                        "old_value": v1_text,
                        "new_value": v2_text,
                        "old_estimation_id": e1.id,
                        "new_estimation_id": e2.id,
                    })
            elif field in ["estimated_duty", "estimated_tax", "exchange_rate_used"]:
                if (v1 is None) != (v2 is None):
                    differences.append({
                        "sku": sku,
                        "change_type": "变更",
                        "field": label,
                        "old_value": str(v1) if v1 is not None else "空",
                        "new_value": str(v2) if v2 is not None else "空",
                        "old_estimation_id": e1.id,
                        "new_estimation_id": e2.id,
                    })
                elif v1 is not None and v2 is not None:
                    diff = abs(v1 - v2)
                    threshold = 1.0 if field != "exchange_rate_used" else 0.0001
                    if diff > threshold:
                        differences.append({
                            "sku": sku,
                            "change_type": "变更",
                            "field": label,
                            "old_value": f"{v1:.4f}",
                            "new_value": f"{v2:.4f}",
                            "difference": round(diff, 4),
                            "old_estimation_id": e1.id,
                            "new_estimation_id": e2.id,
                        })
            else:
                if str(v1 or "") != str(v2 or ""):
                    differences.append({
                        "sku": sku,
                        "change_type": "变更",
                        "field": label,
                        "old_value": str(v1) if v1 else "空",
                        "new_value": str(v2) if v2 else "空",
                        "old_estimation_id": e1.id,
                        "new_estimation_id": e2.id,
                    })

    return {
        "period1": period1,
        "period2": period2,
        "total_skus": len(all_skus),
        "period1_count": len(est1),
        "period2_count": len(est2),
        "diff_count": len(differences),
        "differences": differences,
    }


def compare_imports(session, import_id1, import_id2):
    ir1 = session.query(ImportRecord).get(import_id1)
    ir2 = session.query(ImportRecord).get(import_id2)

    if not ir1 or not ir2:
        return {"success": False, "error": "导入记录不存在"}

    if ir1.data_type != ir2.data_type:
        return {"success": False, "error": "数据类型不同，无法比较"}

    query1 = _get_data_query(session, ir1)
    query2 = _get_data_query(session, ir2)

    return _compare_dataframes(query1, query2, ir1.data_type)


def _get_data_query(session, import_record):
    if import_record.data_type == "商品清单":
        return session.query(GoodsItem).filter(
            GoodsItem.import_record_id == import_record.id
        ).all()
    elif import_record.data_type == "报关单":
        return session.query(CustomsDeclaration).filter(
            CustomsDeclaration.import_record_id == import_record.id
        ).all()
    elif import_record.data_type == "暂估报告":
        return session.query(DutyEstimation).filter(
            DutyEstimation.import_record_id == import_record.id
        ).all()
    return []


def _compare_dataframes(data1, data2, data_type):
    differences = []
    key_field = "sku" if data_type != "报关单" else "entry_no"

    map1 = {getattr(d, key_field): d for d in data1}
    map2 = {getattr(d, key_field): d for d in data2}

    all_keys = set(map1.keys()) | set(map2.keys())

    for key in sorted(all_keys):
        d1 = map1.get(key)
        d2 = map2.get(key)

        if not d1:
            differences.append({
                "key": key,
                "change_type": "新增",
                "field": "存在性",
                "old_value": "无",
                "new_value": "有",
            })
            continue
        if not d2:
            differences.append({
                "key": key,
                "change_type": "删除",
                "field": "存在性",
                "old_value": "有",
                "new_value": "无",
            })
            continue

        fields = []
        if data_type == "商品清单":
            fields = ["name", "hs_code", "declared_hs_code", "unit_price", "quantity", "origin_country"]
        elif data_type == "报关单":
            fields = ["sku", "hs_code", "duty_rate", "tax_rate", "cif_amount", "exchange_rate", "duty_amount", "tax_amount"]
        elif data_type == "暂估报告":
            fields = ["period", "estimated_duty", "estimated_tax", "hs_code_used", "exchange_rate_used"]

        for field in fields:
            v1 = getattr(d1, field)
            v2 = getattr(d2, field)
            if isinstance(v1, float) and isinstance(v2, float):
                if abs(v1 - v2) > 0.0001:
                    differences.append({
                        "key": key,
                        "change_type": "变更",
                        "field": field,
                        "old_value": f"{v1:.4f}",
                        "new_value": f"{v2:.4f}",
                        "difference": round(abs(v1 - v2), 4),
                    })
            elif str(v1 or "") != str(v2 or ""):
                differences.append({
                    "key": key,
                    "change_type": "变更",
                    "field": field,
                    "old_value": str(v1) if v1 else "空",
                    "new_value": str(v2) if v2 else "空",
                })

    return {
        "success": True,
        "data_type": data_type,
        "count1": len(data1),
        "count2": len(data2),
        "diff_count": len(differences),
        "differences": differences,
    }


def build_estimation_dataframe(session, period=None, status=None, include_anomalies=True):
    query = session.query(DutyEstimation)
    if period:
        query = query.filter(DutyEstimation.period == period)
    if status:
        query = query.filter(DutyEstimation.review_status == status)

    estimations = query.order_by(DutyEstimation.period, DutyEstimation.sku).all()

    rows = []
    for est in estimations:
        goods = session.query(GoodsItem).get(est.goods_item_id) if est.goods_item_id else None
        decl = session.query(CustomsDeclaration).get(est.declaration_id) if est.declaration_id else None

        row = {
            "期间": est.period,
            "SKU": est.sku,
            "商品名称": goods.name if goods else "",
            "暂估编号": est.report_no,
            "报关单号": decl.entry_no if decl else "",
            "申报日期": decl.entry_date.strftime("%Y-%m-%d") if decl and decl.entry_date else "",
            "使用税则号": est.hs_code_used,
            "商品清单税则号": goods.hs_code if goods else "",
            "报关单税则号": decl.hs_code if decl else "",
            "使用汇率": est.exchange_rate_used,
            "报关汇率": decl.exchange_rate if decl else None,
            "CIF价(外币)": decl.cif_amount if decl else None,
            "币制": decl.currency if decl else "",
            "关税率(%)": decl.duty_rate if decl else None,
            "增值税率(%)": decl.tax_rate if decl else None,
            "暂估关税": est.estimated_duty,
            "暂估增值税": est.estimated_tax,
            "暂估税费合计": (est.estimated_duty or 0) + (est.estimated_tax or 0),
            "报关关税": decl.duty_amount if decl else None,
            "报关增值税": decl.tax_amount if decl else None,
            "暂估日期": est.estimation_date.strftime("%Y-%m-%d") if est.estimation_date else "",
            "暂估人": est.estimator,
            "复核状态": status_text(est.review_status),
            "暂估记录ID": est.id,
            "商品来源": f"商品清单行{goods.source_row}" if goods else "",
            "报关来源": f"报关单行{decl.source_row}" if decl else "",
            "暂估来源": f"暂估报告行{est.source_row}",
        }

        if include_anomalies:
            anomalies = session.query(AnomalyRecord).filter(
                AnomalyRecord.estimation_id == est.id,
                AnomalyRecord.resolved == False
            ).all()
            if anomalies:
                row["异常类型"] = "; ".join([anomaly_text(a.anomaly_type) for a in anomalies])
                row["异常描述"] = "; ".join([a.anomaly_description for a in anomalies])
            else:
                row["异常类型"] = ""
                row["异常描述"] = ""

        rows.append(row)

    return pd.DataFrame(rows)


def build_anomaly_dataframe(session, period=None, unresolved_only=True):
    query = session.query(AnomalyRecord).join(DutyEstimation)
    if period:
        query = query.filter(DutyEstimation.period == period)
    if unresolved_only:
        query = query.filter(AnomalyRecord.resolved == False)

    anomalies = query.order_by(DutyEstimation.period, DutyEstimation.sku, AnomalyRecord.anomaly_type).all()

    rows = []
    for a in anomalies:
        est = session.query(DutyEstimation).get(a.estimation_id)
        if not est:
            continue

        row = {
            "期间": est.period,
            "SKU": est.sku,
            "暂估编号": est.report_no,
            "异常ID": a.id,
            "异常类型": anomaly_text(a.anomaly_type),
            "异常类型代码": a.anomaly_type,
            "异常描述": a.anomaly_description,
            "字段": a.field_name,
            "原值": a.old_value,
            "新值": a.new_value,
            "检测时间": a.detected_at.strftime("%Y-%m-%d %H:%M:%S"),
            "是否已解决": "是" if a.resolved else "否",
            "解决时间": a.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if a.resolved_at else "",
            "解决人": a.resolved_by or "",
            "解决备注": a.resolution_notes or "",
            "暂估记录ID": est.id,
            "复核状态": status_text(est.review_status),
        }
        rows.append(row)

    return pd.DataFrame(rows)


def build_diff_dataframe(diff_result):
    if "differences" not in diff_result:
        return pd.DataFrame()
    return pd.DataFrame(diff_result["differences"])


def calculate_checksum(df):
    content = df.to_csv(index=False).encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def export_to_excel(df, export_type, period=None, exported_by=None, notes=None):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    period_str = f"_{period}" if period else ""
    filename = f"{export_type}{period_str}_{timestamp}.xlsx"
    file_path = EXPORT_DIR / filename

    with pd.ExcelWriter(file_path, engine=EXCEL_ENGINE) as writer:
        df.to_excel(writer, index=False, sheet_name=export_type[:30])

        info_sheet = pd.DataFrame([
            {"项目": "导出类型", "值": export_type},
            {"项目": "所属期间", "值": period or "全部"},
            {"项目": "导出时间", "值": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
            {"项目": "导出人", "值": exported_by or ""},
            {"项目": "记录数", "值": len(df)},
            {"项目": "校验码", "值": calculate_checksum(df)},
            {"项目": "备注", "值": notes or ""},
        ])
        info_sheet.to_excel(writer, index=False, sheet_name="导出信息")

    session = next(get_session())
    try:
        export_record = ExportRecord(
            export_type=export_type,
            period=period,
            file_path=str(file_path),
            row_count=len(df),
            checksum=calculate_checksum(df),
            exported_by=exported_by,
            notes=notes,
        )
        session.add(export_record)
        session.commit()
    finally:
        session.close()

    return {
        "success": True,
        "file_path": str(file_path),
        "row_count": len(df),
        "checksum": calculate_checksum(df),
    }


def verify_export_consistency(file_path, session=None):
    if session is None:
        session = next(get_session())

    try:
        xls = pd.ExcelFile(file_path, engine=EXCEL_ENGINE)
        info_df = pd.read_excel(xls, sheet_name="导出信息")
        info_dict = dict(zip(info_df["项目"], info_df["值"]))
        saved_checksum = info_dict.get("校验码", "")

        data_df = pd.read_excel(xls, sheet_name=0)
        current_checksum = calculate_checksum(data_df)

        export_record = session.query(ExportRecord).filter(
            ExportRecord.checksum == saved_checksum
        ).first()

        return {
            "valid": current_checksum == saved_checksum,
            "saved_checksum": saved_checksum,
            "current_checksum": current_checksum,
            "in_database": export_record is not None,
            "export_record": {
                "export_type": export_record.export_type if export_record else "",
                "period": export_record.period if export_record else "",
                "export_time": export_record.export_time.strftime("%Y-%m-%d %H:%M:%S") if export_record and export_record.export_time else "",
                "exported_by": export_record.exported_by if export_record else "",
            } if export_record else None,
        }
    finally:
        session.close()
