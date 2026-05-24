from datetime import datetime
from .config import get_session
from .models import ImportBatch, ImportRecord, StandardData, CheckResult, Correction


def override_check(check_id, reason, operator="manual", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        check = session.query(CheckResult).filter(
            CheckResult.id == check_id
        ).first()
        
        if not check:
            return {
                "success": False,
                "message": f"校验结果不存在: {check_id}"
            }
        
        if check.is_overridden:
            return {
                "success": False,
                "message": f"该校验结果已被改判"
            }
        
        check.is_overridden = True
        check.override_reason = reason
        check.overridden_by = operator
        check.overridden_at = datetime.now()
        
        session.commit()
        
        return {
            "success": True,
            "message": "改判成功",
            "check_id": check_id,
            "record_id": check.record_id,
            "source_row": check.record.source_row if check.record else None,
            "original_message": check.message,
            "override_reason": reason,
            "overridden_by": operator,
            "overridden_at": check.overridden_at.isoformat()
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"改判失败: {str(e)}"
        }
    finally:
        session.close()


def correct_field(record_id, field_name, new_value, reason, operator="manual", db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        record = session.query(ImportRecord).filter(
            ImportRecord.id == record_id
        ).first()
        
        if not record:
            return {
                "success": False,
                "message": f"记录不存在: {record_id}"
            }
        
        if record.is_deleted:
            return {
                "success": False,
                "message": f"记录已删除"
            }
        
        std = record.std_data
        if not std:
            return {
                "success": False,
                "message": f"标准化数据不存在"
            }
        
        if not hasattr(std, field_name):
            return {
                "success": False,
                "message": f"字段不存在: {field_name}"
            }
        
        old_value = str(getattr(std, field_name))
        
        if field_name in ['quantity', 'price', 'amount', 'credit_amount']:
            typed_new_value = float(new_value) if new_value else None
        elif field_name in ['delivery_date', 'sign_date', 'second_confirm_date', 'credit_due_date']:
            from dateutil import parser
            typed_new_value = parser.parse(new_value) if new_value else None
        elif field_name in ['is_credit', 'is_substitute']:
            typed_new_value = str(new_value).lower() in ['true', '1', 'yes', '是']
        else:
            typed_new_value = str(new_value) if new_value else None
        
        correction = Correction(
            record_id=record_id,
            field_name=field_name,
            old_value=old_value,
            new_value=str(new_value),
            corrected_by=operator,
            correction_reason=reason,
            is_applied=True
        )
        session.add(correction)
        
        setattr(std, field_name, typed_new_value)
        
        session.commit()
        
        return {
            "success": True,
            "message": "字段修正成功",
            "record_id": record_id,
            "source_row": record.source_row,
            "field_name": field_name,
            "old_value": old_value,
            "new_value": new_value,
            "correction_id": correction.id
        }
        
    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "message": f"修正失败: {str(e)}"
        }
    finally:
        session.close()


def get_corrections(record_id=None, batch_no=None, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        query = session.query(Correction).join(ImportRecord)
        
        if record_id:
            query = query.filter(Correction.record_id == record_id)
        
        if batch_no:
            batch = session.query(ImportBatch).filter(
                ImportBatch.batch_no == batch_no
            ).first()
            if batch:
                query = query.filter(ImportRecord.batch_id == batch.id)
        
        corrections = query.order_by(Correction.corrected_at.desc()).all()
        
        result = []
        for c in corrections:
            result.append({
                "id": c.id,
                "record_id": c.record_id,
                "source_row": c.record.source_row,
                "field_name": c.field_name,
                "old_value": c.old_value,
                "new_value": c.new_value,
                "corrected_by": c.corrected_by,
                "corrected_at": c.corrected_at.isoformat() if c.corrected_at else None,
                "reason": c.correction_reason,
                "is_applied": c.is_applied
            })
        
        return {
            "success": True,
            "count": len(result),
            "corrections": result
        }
        
    finally:
        session.close()


def get_record_detail(record_id, db_path=None):
    session = get_session(db_path=db_path)
    
    try:
        record = session.query(ImportRecord).filter(
            ImportRecord.id == record_id
        ).first()
        
        if not record:
            return {
                "success": False,
                "message": f"记录不存在: {record_id}"
            }
        
        std = record.std_data
        raw = record.raw_data
        checks = record.checks
        corrections = record.corrections
        
        std_dict = {}
        if std:
            for field in ['data_type', 'order_no', 'store_code', 'store_name', 
                         'product_code', 'product_name', 'quantity', 'unit',
                         'price', 'amount', 'driver_name', 'driver_phone',
                         'vehicle_no', 'delivery_date', 'sign_date', 
                         'second_confirm_date', 'sign_person', 'sign_remark',
                         'is_credit', 'credit_amount', 'credit_due_date',
                         'is_substitute', 'substitute_from', 'substitute_to']:
                value = getattr(std, field)
                if isinstance(value, datetime):
                    value = value.isoformat()
                std_dict[field] = value
        
        checks_list = []
        for c in checks:
            checks_list.append({
                "id": c.id,
                "type": c.check_type,
                "item": c.check_item,
                "passed": c.is_passed,
                "message": c.message,
                "severity": c.severity,
                "is_overridden": c.is_overridden,
                "override_reason": c.override_reason
            })
        
        corrections_list = []
        for c in corrections:
            corrections_list.append({
                "id": c.id,
                "field": c.field_name,
                "old_value": c.old_value,
                "new_value": c.new_value,
                "reason": c.correction_reason,
                "corrected_by": c.corrected_by
            })
        
        import json
        
        return {
            "success": True,
            "record": {
                "id": record.id,
                "batch_no": record.batch.batch_no,
                "source_row": record.source_row,
                "source_file": raw.source_file if raw else None,
                "is_deleted": record.is_deleted,
                "reimport_count": record.reimport_count,
                "standard_data": std_dict,
                "raw_data": json.loads(raw.raw_json) if raw else None,
                "checks": checks_list,
                "corrections": corrections_list
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"查询失败: {str(e)}"
        }
    finally:
        session.close()


def find_record_by_row(batch_no, source_row, db_path=None):
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
        
        record = session.query(ImportRecord).filter(
            ImportRecord.batch_id == batch.id,
            ImportRecord.source_row == source_row
        ).first()
        
        if not record:
            return {
                "success": False,
                "message": f"行号 {source_row} 在批次 {batch_no} 中不存在"
            }
        
        return get_record_detail(record.id, db_path)
        
    finally:
        session.close()
