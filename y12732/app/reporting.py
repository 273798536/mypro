from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

from . import models, schemas, crud


SIGN_CHANGE_CN = {
    "+": "上升",
    "-": "下降",
    "0": "走平"
}


def _generate_plain_explanation(batch: models.Batch, records: List[models.DerivativeRecord]) -> str:
    total = len(records)
    anomaly_count = batch.anomaly_count
    sign_change_count = sum(1 for r in records if r.sign_change_type)

    lines = []
    lines.append(f"本轮导数符号变化分析共纳入 {total} 条指标记录。")

    if sign_change_count > 0:
        lines.append(f"其中 {sign_change_count} 条指标出现导数符号变化，")
        change_types = {}
        for r in records:
            if r.sign_change_type:
                change_types[r.sign_change_type] = change_types.get(r.sign_change_type, 0) + 1
        change_desc = "、".join([f"{k}({v}条)" for k, v in change_types.items()])
        lines.append(f"变化类型包括：{change_desc}。")
    else:
        lines.append("未发现导数符号变化。")

    if anomaly_count > 0:
        lines.append(f"有 {anomaly_count} 条记录存在数据质量问题，")
        anomaly_types = {}
        for r in records:
            if r.is_anomaly and r.anomaly_type:
                anomaly_types[r.anomaly_type] = anomaly_types.get(r.anomaly_type, 0) + 1
        anomaly_desc_map = {
            "unit_missing": "缺失单位",
            "value_missing": "缺少数值",
            "derivative_incomplete": "导数数据不完整"
        }
        anomaly_desc = "、".join([
            f"{anomaly_desc_map.get(k, k)}({v}条)"
            for k, v in anomaly_types.items()
        ])
        lines.append(f"主要问题为：{anomaly_desc}。")
        lines.append("建议投研同事优先复核上述异常记录后再推进报告。")
    else:
        lines.append("全部记录数据完整，无明显异常。")

    lines.append(f"本报告对应处理批次编号：{batch.batch_no}，")
    lines.append(f"导入时间：{batch.imported_at.strftime('%Y年%m月%d日 %H:%M')}。")

    return "".join(lines)


def _build_chart_data(records: List[models.DerivativeRecord]) -> Dict[str, Any]:
    indicator_names = []
    values = []
    first_derivatives = []
    second_derivatives = []
    sign_changes = []
    has_anomaly = []

    for r in records:
        indicator_names.append(r.indicator_name)
        values.append(r.value)
        first_derivatives.append(r.first_derivative)
        second_derivatives.append(r.second_derivative)
        sign_changes.append(r.sign_change_type or "")
        has_anomaly.append(1 if r.is_anomaly else 0)

    sign_change_summary = {}
    for r in records:
        if r.sign_change_type:
            sign_change_summary[r.sign_change_type] = sign_change_summary.get(r.sign_change_type, 0) + 1

    anomaly_summary = {}
    for r in records:
        if r.is_anomaly and r.anomaly_type:
            anomaly_summary[r.anomaly_type] = anomaly_summary.get(r.anomaly_type, 0) + 1

    return {
        "bar_chart": {
            "x": indicator_names,
            "value_series": values,
            "first_derivative_series": first_derivatives,
            "second_derivative_series": second_derivatives
        },
        "sign_change_pie": sign_change_summary,
        "anomaly_pie": anomaly_summary,
        "anomaly_flags": {
            "indicators": indicator_names,
            "flags": has_anomaly
        },
        "sign_change_flags": {
            "indicators": indicator_names,
            "changes": sign_changes
        }
    }


def _build_summary_data(batch: models.Batch, records: List[models.DerivativeRecord]) -> Dict[str, Any]:
    confirmed = sum(1 for r in records if r.status == "confirmed")
    fixed = sum(1 for r in records if r.status == "fixed")
    pending = sum(1 for r in records if r.status == "pending")
    rejected = sum(1 for r in records if r.status == "rejected")
    reviewing = sum(1 for r in records if r.status == "reviewing")

    sign_change_records = []
    anomaly_records = []

    for r in records:
        base = {
            "record_id": r.id,
            "row_no": r.row_no,
            "indicator_name": r.indicator_name,
            "indicator_code": r.indicator_code,
            "period": r.period,
            "value": r.value,
            "unit": r.unit,
            "status": r.status,
            "trace_url": f"/api/records/{r.id}/trace"
        }
        if r.sign_change_type:
            sign_change_records.append({
                **base,
                "first_derivative": r.first_derivative,
                "first_derivative_sign": r.first_derivative_sign,
                "second_derivative": r.second_derivative,
                "second_derivative_sign": r.second_derivative_sign,
                "sign_change_type": r.sign_change_type
            })
        if r.is_anomaly:
            anomaly_records.append({
                **base,
                "anomaly_type": r.anomaly_type,
                "anomaly_detail": r.anomaly_detail,
                "fix_url": f"/api/records/{r.id}/fix"
            })

    return {
        "batch": {
            "batch_no": batch.batch_no,
            "batch_id": batch.id,
            "source_file": batch.source_file,
            "imported_at": batch.imported_at.strftime("%Y-%m-%d %H:%M:%S"),
            "imported_by": batch.imported_by,
            "status": batch.status,
            "remark": batch.remark
        },
        "status_breakdown": {
            "total": len(records),
            "confirmed": confirmed,
            "fixed": fixed,
            "pending": pending,
            "rejected": rejected,
            "reviewing": reviewing
        },
        "sign_change_records": sign_change_records,
        "anomaly_records": anomaly_records,
        "all_records": [
            {
                "record_id": r.id,
                "row_no": r.row_no,
                "indicator_name": r.indicator_name,
                "indicator_code": r.indicator_code,
                "period": r.period,
                "value": r.value,
                "unit": r.unit,
                "first_derivative": r.first_derivative,
                "first_derivative_sign": r.first_derivative_sign,
                "second_derivative": r.second_derivative,
                "second_derivative_sign": r.second_derivative_sign,
                "sign_change_type": r.sign_change_type,
                "is_anomaly": r.is_anomaly,
                "anomaly_type": r.anomaly_type,
                "anomaly_detail": r.anomaly_detail,
                "status": r.status
            }
            for r in records
        ]
    }


def create_report_snapshot(
    db: Session,
    batch_id: int,
    created_by: str = "system",
    title: Optional[str] = None
) -> Optional[models.ReportSnapshot]:
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        return None

    records = crud.list_records(db, batch_id=batch_id, limit=10000)

    report_title = title or f"导数符号变化分析报告-{db_batch.batch_no}"
    plain_explanation = _generate_plain_explanation(db_batch, records)
    chart_data = _build_chart_data(records)
    summary_data = _build_summary_data(db_batch, records)

    snapshot_type = "full_report"

    existing = db.query(models.ReportSnapshot).filter(
        models.ReportSnapshot.batch_id == batch_id,
        models.ReportSnapshot.snapshot_type == snapshot_type
    ).first()

    if existing:
        existing.title = report_title
        existing.plain_explanation = plain_explanation
        existing.chart_data = chart_data
        existing.summary_data = summary_data
        existing.created_by = created_by
        existing.created_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return existing

    db_snapshot = models.ReportSnapshot(
        batch_id=batch_id,
        snapshot_type=snapshot_type,
        title=report_title,
        plain_explanation=plain_explanation,
        chart_data=chart_data,
        summary_data=summary_data,
        created_by=created_by
    )
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot


def get_report_snapshot(db: Session, snapshot_id: int) -> Optional[models.ReportSnapshot]:
    return db.query(models.ReportSnapshot).filter(models.ReportSnapshot.id == snapshot_id).first()


def list_report_snapshots(db: Session, batch_id: Optional[int] = None) -> List[models.ReportSnapshot]:
    query = db.query(models.ReportSnapshot)
    if batch_id:
        query = query.filter(models.ReportSnapshot.batch_id == batch_id)
    return query.order_by(models.ReportSnapshot.created_at.desc()).all()


def export_report_text(db: Session, snapshot_id: int) -> Optional[str]:
    snapshot = get_report_snapshot(db, snapshot_id)
    if not snapshot:
        return None

    summary = snapshot.summary_data or {}
    batch_info = summary.get("batch", {})
    status_breakdown = summary.get("status_breakdown", {})
    sign_change_records = summary.get("sign_change_records", [])
    anomaly_records = summary.get("anomaly_records", [])

    lines = []
    lines.append("=" * 60)
    lines.append(f"  {snapshot.title}")
    lines.append("=" * 60)
    lines.append("")
    lines.append("【一、普通话摘要（可直接转发同事）】")
    lines.append("-" * 40)
    lines.append(snapshot.plain_explanation or "")
    lines.append("")
    lines.append("【二、批次信息】")
    lines.append("-" * 40)
    lines.append(f"  批次编号：{batch_info.get('batch_no', 'N/A')}")
    lines.append(f"  来源文件：{batch_info.get('source_file', 'N/A')}")
    lines.append(f"  导入时间：{batch_info.get('imported_at', 'N/A')}")
    lines.append(f"  导入人员：{batch_info.get('imported_by', 'N/A')}")
    lines.append(f"  批次状态：{batch_info.get('status', 'N/A')}")
    lines.append("")
    lines.append("【三、记录状态分布】")
    lines.append("-" * 40)
    lines.append(f"  总数：{status_breakdown.get('total', 0)}")
    lines.append(f"  待处理：{status_breakdown.get('pending', 0)}")
    lines.append(f"  复核中：{status_breakdown.get('reviewing', 0)}")
    lines.append(f"  已修正：{status_breakdown.get('fixed', 0)}")
    lines.append(f"  已确认：{status_breakdown.get('confirmed', 0)}")
    lines.append(f"  已驳回：{status_breakdown.get('rejected', 0)}")
    lines.append("")
    lines.append("【四、导数符号变化清单（含追溯入口）】")
    lines.append("-" * 40)
    if sign_change_records:
        for idx, r in enumerate(sign_change_records, 1):
            lines.append(f"  {idx}. {r['indicator_name']}（行号{r['row_no']}，记录ID:{r['record_id']}）")
            lines.append(f"     变化：{r['sign_change_type']}")
            lines.append(f"     追溯：GET /api/records/{r['record_id']}/trace")
            if r.get("anomaly_type"):
                lines.append(f"     ⚠ 异常：{r.get('anomaly_detail')}")
            lines.append("")
    else:
        lines.append("  （无导数符号变化）")
        lines.append("")
    lines.append("【五、数据异常清单（含修正入口）】")
    lines.append("-" * 40)
    if anomaly_records:
        for idx, r in enumerate(anomaly_records, 1):
            lines.append(f"  {idx}. {r['indicator_name']}（行号{r['row_no']}，记录ID:{r['record_id']}）")
            lines.append(f"     异常类型：{r.get('anomaly_type', 'N/A')}")
            lines.append(f"     异常详情：{r.get('anomaly_detail', 'N/A')}")
            lines.append(f"     当前状态：{r.get('status', 'N/A')}")
            lines.append(f"     修正入口：PUT /api/records/{r['record_id']}/fix")
            lines.append(f"     追溯入口：GET /api/records/{r['record_id']}/trace")
            lines.append("")
    else:
        lines.append("  （无数据异常）")
        lines.append("")
    lines.append("=" * 60)
    lines.append(f"  报告生成时间：{snapshot.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  报告生成人：{snapshot.created_by}")
    lines.append("=" * 60)

    return "\n".join(lines)


def export_chart_data(
    db: Session,
    batch_id: int,
    use_snapshot: bool = True
) -> Optional[Dict[str, Any]]:
    if use_snapshot:
        snapshots = list_report_snapshots(db, batch_id=batch_id)
        if snapshots:
            return snapshots[0].chart_data

    records = crud.list_records(db, batch_id=batch_id, limit=10000)
    if not records:
        return None
    return _build_chart_data(records)


def compare_batches_with_report(
    db: Session,
    batch_ids: Optional[List[int]] = None,
    limit: int = 5
) -> Dict[str, Any]:
    compare_result = crud.compare_history(db, batch_ids=batch_ids, limit=limit)

    snapshot_data = {}
    for batch_item in compare_result.batches:
        batch = crud.get_batch_by_no(db, batch_item.batch_no)
        if batch:
            snapshots = list_report_snapshots(db, batch_id=batch.id)
            if snapshots:
                snapshot_data[batch_item.batch_no] = {
                    "snapshot_id": snapshots[0].id,
                    "plain_explanation": snapshots[0].plain_explanation,
                    "report_url": f"/api/reports/{snapshots[0].id}"
                }

    return {
        "comparison": compare_result.model_dump(),
        "snapshot_refs": snapshot_data,
        "note": "历史对比与报告导出共用同一批处理记录数据，已通过 ReportSnapshot 关联"
    }
