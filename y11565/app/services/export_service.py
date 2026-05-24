from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
import pandas as pd

from app.models import Batch, WorkOrder, ChangeLog
from app.enums import BatchStatus
from app.database import settings


def _ensure_export_dir():
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)


def export_batch_summary(
    db: Session,
    batch_ids: Optional[List[int]] = None,
    include_frozen: bool = True,
    include_change_logs: bool = True,
    format: str = "xlsx",
) -> str:
    _ensure_export_dir()

    query = db.query(Batch)
    if batch_ids:
        query = query.filter(Batch.id.in_(batch_ids))
    if not include_frozen:
        query = query.filter(Batch.status != BatchStatus.FROZEN.value)
    
    batches = query.order_by(Batch.created_at.desc()).all()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"batch_summary_{timestamp}.{format}"
    filepath = os.path.join(settings.EXPORT_DIR, filename)

    if format == "xlsx":
        return _export_to_excel(db, batches, filepath, include_change_logs)
    elif format == "csv":
        return _export_to_csv(db, batches, filepath, include_change_logs)
    elif format == "json":
        return _export_to_json(db, batches, filepath, include_change_logs)
    else:
        raise ValueError(f"不支持的导出格式: {format}")


def _export_to_excel(db: Session, batches: List[Batch], filepath: str, include_change_logs: bool) -> str:
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        _write_batches_sheet(batches, writer)
        _write_work_orders_sheet(batches, writer)
        _write_freeze_summary_sheet(batches, writer)
        
        if include_change_logs:
            _write_change_logs_sheet(db, batches, writer)
        
        _write_abnormal_summary_sheet(batches, writer)

    return filepath


def _write_batches_sheet(batches: List[Batch], writer):
    data = []
    for batch in batches:
        data.append({
            "批次ID": batch.id,
            "批次号": batch.batch_no,
            "批次名称": batch.name,
            "描述": batch.description or "",
            "状态": batch.status,
            "路段": batch.road_section or "",
            "班次": batch.shift or "",
            "操作员": batch.operator or "",
            "备件批次": batch.spare_part_batch or "",
            "总工单数": batch.total_work_orders,
            "异常工单数": batch.abnormal_count,
            "是否冻结": batch.status == BatchStatus.FROZEN.value,
            "冻结前状态": batch.status_before_freeze or "",
            "冻结原因": batch.freeze_reason or "",
            "冻结人": batch.frozen_by or "",
            "冻结时间": batch.frozen_at.strftime("%Y-%m-%d %H:%M:%S") if batch.frozen_at else "",
            "结算时间": batch.settled_at.strftime("%Y-%m-%d %H:%M:%S") if batch.settled_at else "",
            "归档时间": batch.archived_at.strftime("%Y-%m-%d %H:%M:%S") if batch.archived_at else "",
            "撤销原因": batch.cancel_reason or "",
            "创建人": batch.created_by or "",
            "创建时间": batch.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "更新时间": batch.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    
    df = pd.DataFrame(data)
    df.to_excel(writer, sheet_name="批次汇总", index=False)


def _write_work_orders_sheet(batches: List[Batch], writer):
    data = []
    for batch in batches:
        for wo in batch.work_orders:
            data.append({
                "批次号": batch.batch_no,
                "工单ID": wo.id,
                "工单号": wo.order_no,
                "外部工单号": wo.external_order_no or "",
                "路段": wo.road_section or "",
                "灯杆号": wo.pole_number or "",
                "故障描述": wo.fault_description or "",
                "状态": wo.status,
                "是否异常": wo.is_abnormal,
                "异常原因": wo.abnormal_reason or "",
                "修复结果": wo.repair_result or "",
                "复核结果": wo.review_result or "",
                "复核意见": wo.review_comment or "",
                "复核人": wo.reviewed_by or "",
                "复核时间": wo.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if wo.reviewed_at else "",
                "原始价格": wo.original_price or 0,
                "调整后价格": wo.adjusted_price or 0,
                "价格调整原因": wo.price_adjust_reason or "",
                "报修时间": wo.report_time.strftime("%Y-%m-%d %H:%M:%S") if wo.report_time else "",
                "修复时间": wo.repair_time.strftime("%Y-%m-%d %H:%M:%S") if wo.repair_time else "",
                "完成时间": wo.complete_time.strftime("%Y-%m-%d %H:%M:%S") if wo.complete_time else "",
                "班次": wo.shift or "",
                "操作员": wo.operator or "",
                "使用备件": wo.spare_part_used or "",
            })
    
    df = pd.DataFrame(data)
    df.to_excel(writer, sheet_name="工单明细", index=False)


def _write_freeze_summary_sheet(batches: List[Batch], writer):
    data = []
    frozen_batches = [b for b in batches if b.status == BatchStatus.FROZEN.value or b.frozen_at]
    for batch in frozen_batches:
        data.append({
            "批次号": batch.batch_no,
            "批次名称": batch.name,
            "路段": batch.road_section or "",
            "冻结前状态": batch.status_before_freeze or "",
            "当前状态": batch.status,
            "冻结原因": batch.freeze_reason or "",
            "冻结人": batch.frozen_by or "",
            "冻结时间": batch.frozen_at.strftime("%Y-%m-%d %H:%M:%S") if batch.frozen_at else "",
            "总工单数": batch.total_work_orders,
            "异常工单数": batch.abnormal_count,
            "异常率": f"{(batch.abnormal_count / batch.total_work_orders * 100):.1f}%" if batch.total_work_orders > 0 else "0%",
        })
    
    df = pd.DataFrame(data)
    df.to_excel(writer, sheet_name="冻结状态汇总", index=False)


def _write_change_logs_sheet(db: Session, batches: List[Batch], writer):
    batch_ids = [b.id for b in batches]
    change_logs = db.query(ChangeLog).filter(ChangeLog.batch_id.in_(batch_ids)).order_by(ChangeLog.created_at.desc()).all()
    
    data = []
    for log in change_logs:
        batch = next((b for b in batches if b.id == log.batch_id), None)
        data.append({
            "批次号": batch.batch_no if batch else "",
            "工单ID": log.work_order_id or "",
            "变更类型": log.change_type,
            "字段名": log.field_name or "",
            "旧值": log.old_value or "",
            "新值": log.new_value or "",
            "变更原因": log.change_reason or "",
            "操作人": log.changed_by or "",
            "操作时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    
    df = pd.DataFrame(data)
    df.to_excel(writer, sheet_name="变更历史", index=False)


def _write_abnormal_summary_sheet(batches: List[Batch], writer):
    data = []
    for batch in batches:
        abnormal_work_orders = [wo for wo in batch.work_orders if wo.is_abnormal]
        for wo in abnormal_work_orders:
            data.append({
                "批次号": batch.batch_no,
                "工单号": wo.order_no,
                "路段": wo.road_section or "",
                "灯杆号": wo.pole_number or "",
                "异常原因": wo.abnormal_reason or "",
                "故障描述": wo.fault_description or "",
                "修复结果": wo.repair_result or "",
                "复核意见": wo.review_comment or "",
                "报修时间": wo.report_time.strftime("%Y-%m-%d %H:%M:%S") if wo.report_time else "",
                "班次": wo.shift or "",
                "操作员": wo.operator or "",
            })
    
    df = pd.DataFrame(data)
    df.to_excel(writer, sheet_name="异常工单明细", index=False)


def _export_to_csv(db: Session, batches: List[Batch], filepath: str, include_change_logs: bool) -> str:
    base_path = os.path.splitext(filepath)[0]
    
    data = []
    for batch in batches:
        for wo in batch.work_orders:
            data.append({
                "batch_no": batch.batch_no,
                "batch_name": batch.name,
                "batch_status": batch.status,
                "is_frozen": batch.status == BatchStatus.FROZEN.value,
                "status_before_freeze": batch.status_before_freeze or "",
                "freeze_reason": batch.freeze_reason or "",
                "frozen_by": batch.frozen_by or "",
                "order_no": wo.order_no,
                "road_section": wo.road_section or "",
                "pole_number": wo.pole_number or "",
                "is_abnormal": wo.is_abnormal,
                "abnormal_reason": wo.abnormal_reason or "",
                "review_result": wo.review_result or "",
                "review_comment": wo.review_comment or "",
                "shift": wo.shift or "",
                "operator": wo.operator or "",
            })
    
    df = pd.DataFrame(data)
    df.to_csv(f"{base_path}_work_orders.csv", index=False, encoding="utf-8-sig")
    
    return f"{base_path}_work_orders.csv"


def _export_to_json(db: Session, batches: List[Batch], filepath: str, include_change_logs: bool) -> str:
    result = {
        "export_time": datetime.now().isoformat(),
        "batch_count": len(batches),
        "batches": []
    }

    for batch in batches:
        batch_data = {
            "id": batch.id,
            "batch_no": batch.batch_no,
            "name": batch.name,
            "status": batch.status,
            "road_section": batch.road_section,
            "shift": batch.shift,
            "is_frozen": batch.status == BatchStatus.FROZEN.value,
            "status_before_freeze": batch.status_before_freeze,
            "freeze_reason": batch.freeze_reason,
            "frozen_by": batch.frozen_by,
            "frozen_at": batch.frozen_at.isoformat() if batch.frozen_at else None,
            "total_work_orders": batch.total_work_orders,
            "abnormal_count": batch.abnormal_count,
            "work_orders": [
                {
                    "order_no": wo.order_no,
                    "road_section": wo.road_section,
                    "pole_number": wo.pole_number,
                    "is_abnormal": wo.is_abnormal,
                    "abnormal_reason": wo.abnormal_reason,
                    "review_result": wo.review_result,
                    "review_comment": wo.review_comment,
                }
                for wo in batch.work_orders
            ]
        }
        result["batches"].append(batch_data)

    if include_change_logs:
        batch_ids = [b.id for b in batches]
        change_logs = db.query(ChangeLog).filter(ChangeLog.batch_id.in_(batch_ids)).all()
        result["change_logs"] = [
            {
                "batch_id": log.batch_id,
                "work_order_id": log.work_order_id,
                "change_type": log.change_type,
                "field_name": log.field_name,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "change_reason": log.change_reason,
                "changed_by": log.changed_by,
                "created_at": log.created_at.isoformat(),
            }
            for log in change_logs
        ]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return filepath


def get_statistics(db: Session) -> Dict[str, Any]:
    total_batches = db.query(Batch).count()
    total_work_orders = db.query(WorkOrder).count()
    
    status_stats = {}
    for status in BatchStatus:
        count = db.query(Batch).filter(Batch.status == status.value).count()
        status_stats[status.value] = count

    abnormal_count = db.query(WorkOrder).filter(WorkOrder.is_abnormal == True).count()

    frozen_count = db.query(Batch).filter(Batch.status == BatchStatus.FROZEN.value).count()
    frozen_with_abnormal = 0
    frozen_batches = db.query(Batch).filter(Batch.status == BatchStatus.FROZEN.value).all()
    for batch in frozen_batches:
        if batch.abnormal_count > 0:
            frozen_with_abnormal += 1

    return {
        "total_batches": total_batches,
        "total_work_orders": total_work_orders,
        "abnormal_count": abnormal_count,
        "abnormal_rate": abnormal_count / total_work_orders if total_work_orders > 0 else 0,
        "batch_status_stats": status_stats,
        "frozen_count": frozen_count,
        "frozen_with_abnormal": frozen_with_abnormal,
    }
