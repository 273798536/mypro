import os
import json
from datetime import datetime
from sqlalchemy import func, and_
from .config import get_session, SOURCE_TYPE_NAMES
from .models import ImportBatch, ImportRecord, StandardData, CheckResult, ExportLog


def generate_report(batch_no=None, include_failed=True, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(
            StandardData.data_type,
            func.count(StandardData.id),
            func.sum(StandardData.amount)
        ).join(ImportRecord).filter(
            ImportRecord.is_deleted == False
        )
        
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if not batch:
                return {"success": False, "message": f"批次不存在: {batch_no}"}
            query = query.filter(ImportRecord.batch_id == batch.id)
        
        query = query.group_by(StandardData.data_type)
        
        summary = {}
        for data_type, count, total_amount in query.all():
            summary[data_type] = {
                "name": SOURCE_TYPE_NAMES.get(data_type, data_type),
                "count": count,
                "total_amount": float(total_amount) if total_amount else 0
            }
        
        check_query = session.query(
            CheckResult.check_type,
            CheckResult.severity,
            func.count(CheckResult.id)
        ).filter(
            CheckResult.is_passed == False,
            CheckResult.is_overridden == False
        ).group_by(CheckResult.check_type, CheckResult.severity)
        
        if batch_no:
            check_query = check_query.join(ImportRecord).filter(
                ImportRecord.batch_id == batch.id
            )
        
        issues_summary = {}
        for check_type, severity, count in check_query.all():
            if check_type not in issues_summary:
                issues_summary[check_type] = {}
            issues_summary[check_type][severity] = count
        
        failed_records = []
        if include_failed:
            failed_query = session.query(CheckResult).filter(
                CheckResult.is_passed == False,
                CheckResult.is_overridden == False
            ).order_by(CheckResult.severity.desc()).limit(100)
            
            if batch_no:
                failed_query = failed_query.join(ImportRecord).filter(
                    ImportRecord.batch_id == batch.id
                )
            
            for r in failed_query.all():
                std = r.record.std_data if r.record else None
                failed_records.append({
                    "check_id": r.id,
                    "record_id": r.record_id,
                    "source_row": r.record.source_row if r.record else None,
                    "order_no": std.order_no if std else None,
                    "store_code": std.store_code if std else None,
                    "product_code": std.product_code if std else None,
                    "check_type": r.check_type,
                    "check_item": r.check_item,
                    "severity": r.severity,
                    "message": r.message
                })
        
        return {
            "success": True,
            "generated_at": datetime.now().isoformat(),
            "batch_no": batch_no,
            "data_summary": summary,
            "issues_summary": issues_summary,
            "total_issues": len(failed_records),
            "failed_records": failed_records
        }
        
    finally:
        session.close()


def get_history(start_date=None, end_date=None, operator=None, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(ImportBatch).order_by(ImportBatch.imported_at.desc())
        
        if start_date:
            query = query.filter(ImportBatch.imported_at >= start_date)
        if end_date:
            query = query.filter(ImportBatch.imported_at <= end_date)
        if operator:
            query = query.filter(ImportBatch.imported_by == operator)
        
        batches = query.limit(100).all()
        
        history = []
        for batch in batches:
            history.append({
                "batch_no": batch.batch_no,
                "source_type": batch.source_type,
                "source_type_name": SOURCE_TYPE_NAMES.get(batch.source_type, batch.source_type),
                "source_file": batch.source_file,
                "imported_at": batch.imported_at.isoformat(),
                "imported_by": batch.imported_by,
                "total_rows": batch.total_rows,
                "success_rows": batch.success_rows,
                "failed_rows": batch.failed_rows,
                "status": batch.status,
                "is_frozen": batch.is_frozen,
                "remark": batch.remark
            })
        
        return {
            "success": True,
            "count": len(history),
            "history": history
        }
        
    finally:
        session.close()


def freeze_batch(batch_no, operator="system", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == batch_no
        ).first()
        
        if not batch:
            return {
                "success": False,
                "message": f"批次不存在: {batch_no}"
            }
        
        if batch.is_frozen:
            return {
                "success": False,
                "message": f"批次已冻结"
            }
        
        batch.is_frozen = True
        batch.frozen_at = datetime.now()
        batch.frozen_by = operator
        batch.status = "frozen"
        
        session.commit()
        
        return {
            "success": True,
            "message": f"批次 {batch_no} 已冻结，不可再修改",
            "batch_no": batch_no,
            "frozen_at": batch.frozen_at.isoformat(),
            "frozen_by": operator
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"冻结失败: {str(e)}"
        }
    finally:
        session.close()


def unfreeze_batch(batch_no, operator="system", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        batch = session.query(ImportBatch).filter(
            ImportBatch.batch_no == batch_no
        ).first()
        
        if not batch:
            return {
                "success": False,
                "message": f"批次不存在: {batch_no}"
            }
        
        if not batch.is_frozen:
            return {
                "success": False,
                "message": f"批次未冻结"
            }
        
        batch.is_frozen = False
        batch.frozen_at = None
        batch.frozen_by = None
        batch.status = "imported"
        
        session.commit()
        
        return {
            "success": True,
            "message": f"批次 {batch_no} 已解冻",
            "batch_no": batch_no,
            "unfrozen_by": operator
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"解冻失败: {str(e)}"
        }
    finally:
        session.close()


def export_data(batch_no=None, export_type="excel", output_path=None, db_path=None):
    import pandas as pd
    
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(StandardData).join(ImportRecord).filter(
            ImportRecord.is_deleted == False
        )
        
        batch_ids = []
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if not batch:
                return {"success": False, "message": f"批次不存在: {batch_no}"}
            if not batch.is_frozen:
                return {
                    "success": False, 
                    "message": "导出前请先冻结批次，确保数据一致性"
                }
            query = query.filter(ImportRecord.batch_id == batch.id)
            batch_ids.append(batch.id)
        else:
            batches = session.query(ImportBatch).filter(
                ImportBatch.is_frozen == True
            ).all()
            if not batches:
                return {"success": False, "message": "没有已冻结的批次可导出"}
            batch_ids = [b.id for b in batches]
            batch_ids_str = ",".join([str(i) for i in batch_ids])
            query = query.filter(ImportRecord.batch_id.in_(batch_ids))
        
        records = query.all()
        
        data = []
        for std in records:
            data.append({
                "来源类型": SOURCE_TYPE_NAMES.get(std.data_type, std.data_type),
                "批次号": std.record.batch.batch_no,
                "原始行号": std.record.source_row,
                "订单号": std.order_no,
                "门店编码": std.store_code,
                "门店名称": std.store_name,
                "商品编码": std.product_code,
                "商品名称": std.product_name,
                "数量": std.quantity,
                "单位": std.unit,
                "单价": std.price,
                "金额": std.amount,
                "司机姓名": std.driver_name,
                "司机电话": std.driver_phone,
                "车牌号": std.vehicle_no,
                "配送日期": std.delivery_date.isoformat() if std.delivery_date else "",
                "签收日期": std.sign_date.isoformat() if std.sign_date else "",
                "二次确认日期": std.second_confirm_date.isoformat() if std.second_confirm_date else "",
                "签收人": std.sign_person,
                "是否赊销": "是" if std.is_credit else "否",
                "赊销金额": std.credit_amount,
                "赊销到期日": std.credit_due_date.isoformat() if std.credit_due_date else "",
                "是否缺货替代": "是" if std.is_substitute else "否",
                "原商品": std.substitute_from,
                "替代商品": std.substitute_to,
                "备注": std.sign_remark
            })
        
        df = pd.DataFrame(data)
        
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            output_path = f"agri_inspection_export_{timestamp}.xlsx"
        
        if export_type == "excel":
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name="数据明细", index=False)
                
                failed_checks = session.query(CheckResult).filter(
                    CheckResult.is_passed == False,
                    CheckResult.is_overridden == False
                ).join(ImportRecord).filter(
                    ImportRecord.batch_id.in_(batch_ids)
                ).all()
                
                failed_data = []
                for c in failed_checks:
                    std = c.record.std_data if c.record else None
                    failed_data.append({
                        "批次号": c.record.batch.batch_no if c.record else "",
                        "原始行号": c.record.source_row if c.record else None,
                        "订单号": std.order_no if std else "",
                        "校验类型": c.check_type,
                        "校验项": c.check_item,
                        "严重程度": c.severity,
                        "错误信息": c.message
                    })
                
                if failed_data:
                    pd.DataFrame(failed_data).to_excel(writer, sheet_name="错误清单", index=False)
        
        export_no = f"EXP{datetime.now().strftime('%Y%m%d%H%M%S')}"
        export_log = ExportLog(
            export_no=export_no,
            export_type=export_type,
            batch_ids=json.dumps(batch_ids),
            exported_by="system",
            export_file=os.path.abspath(output_path),
            record_count=len(data)
        )
        session.add(export_log)
        session.commit()
        
        return {
            "success": True,
            "message": f"导出成功: {output_path}",
            "export_no": export_no,
            "output_path": os.path.abspath(output_path),
            "record_count": len(data),
            "failed_count": len(failed_data) if 'failed_data' in locals() else 0
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"导出失败: {str(e)}"
        }
    finally:
        session.close()


def export_failed_records(batch_no=None, output_path=None, db_path=None):
    import pandas as pd
    
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(CheckResult).filter(
            CheckResult.is_passed == False,
            CheckResult.is_overridden == False
        )
        
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if not batch:
                return {"success": False, "message": f"批次不存在: {batch_no}"}
            query = query.join(ImportRecord).filter(
                ImportRecord.batch_id == batch.id
            )
        
        checks = query.order_by(CheckResult.severity.desc()).all()
        
        data = []
        for c in checks:
            record = c.record
            std = record.std_data if record else None
            raw = record.raw_data if record else None
            
            data.append({
                "错误ID": c.id,
                "记录ID": c.record_id,
                "批次号": record.batch.batch_no if record else "",
                "来源文件": raw.source_file if raw else "",
                "原始行号": record.source_row if record else None,
                "订单号": std.order_no if std else "",
                "门店编码": std.store_code if std else "",
                "商品编码": std.product_code if std else "",
                "校验类型": c.check_type,
                "校验项": c.check_item,
                "严重程度": c.severity,
                "错误信息": c.message,
                "校验时间": c.checked_at.isoformat() if c.checked_at else ""
            })
        
        df = pd.DataFrame(data)
        
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            output_path = f"failed_records_{timestamp}.xlsx"
        
        df.to_excel(output_path, index=False, engine='openpyxl')
        
        return {
            "success": True,
            "message": f"失败清单导出成功: {output_path}",
            "output_path": os.path.abspath(output_path),
            "record_count": len(data)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"导出失败: {str(e)}"
        }
    finally:
        session.close()


def get_export_history(limit=50, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        exports = session.query(ExportLog).order_by(
            ExportLog.exported_at.desc()
        ).limit(limit).all()
        
        result = []
        for e in exports:
            result.append({
                "export_no": e.export_no,
                "export_type": e.export_type,
                "exported_at": e.exported_at.isoformat() if e.exported_at else None,
                "exported_by": e.exported_by,
                "export_file": e.export_file,
                "record_count": e.record_count,
                "remark": e.remark
            })
        
        return {
            "success": True,
            "count": len(result),
            "exports": result
        }
        
    finally:
        session.close()
