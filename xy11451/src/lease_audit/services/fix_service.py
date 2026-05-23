from datetime import datetime
from typing import Any, Dict, List
from pathlib import Path
import pandas as pd

from lease_audit.models.database import (
    get_session, ImportBatch, ImportRecord, ImportFailure,
    OperationLog
)
from lease_audit.utils.common import (
    json_dumps, json_loads, generate_hash, get_current_user, generate_file_hash
)
from lease_audit.services.import_service import ImportService


class FixService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def list_failures(self, batch_no: str) -> List[Dict[str, Any]]:
        batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
        if not batch:
            raise ValueError(f"批次不存在: {batch_no}")
        
        failures = self.session.query(ImportFailure).filter_by(batch_id=batch.id).all()
        return [
            {
                "id": f.id,
                "row_no": f.original_row_no,
                "error_type": f.error_type,
                "error_message": f.error_message,
                "original_data": f.original_data,
                "resolved": f.resolved,
                "resolved_at": f.resolved_at,
                "resolved_by": f.resolved_by
            }
            for f in failures
        ]
    
    def resolve_failure(self, batch_no: str, row_no: int, fixed_data: Dict = None) -> Dict[str, Any]:
        batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
        if not batch:
            raise ValueError(f"批次不存在: {batch_no}")
        
        failure = self.session.query(ImportFailure).filter_by(
            batch_id=batch.id, original_row_no=row_no
        ).first()
        
        if not failure:
            raise ValueError(f"批次 {batch_no} 中未找到行 {row_no} 的失败记录")
        
        if fixed_data:
            try:
                import_service = ImportService(self.db_path)
                import_record = ImportRecord(
                    batch_id=batch.id,
                    source_type=batch.source_type,
                    original_row_no=row_no,
                    data_json=json_dumps(fixed_data),
                    data_hash=generate_hash(json_dumps(fixed_data)),
                    is_valid=True,
                    is_duplicate=False
                )
                self.session.add(import_record)
                self.session.flush()
                
                import_service._process_source_data(
                    batch.source_type, fixed_data, import_record.id
                )
                
                failure.resolved = True
                failure.resolved_at = datetime.now()
                failure.resolved_by = get_current_user()
                
                batch.success_count += 1
                batch.failed_count -= 1
                
                self._log_operation(
                    "fix", "ImportFailure", failure.id,
                    f"手动修复批次 {batch_no} 行 {row_no}"
                )
                self.session.commit()
                
                return {"status": "resolved", "row_no": row_no}
            except Exception as e:
                self.session.rollback()
                return {"status": "failed", "row_no": row_no, "error": str(e)}
        
        failure.resolved = True
        failure.resolved_at = datetime.now()
        failure.resolved_by = get_current_user()
        
        batch.failed_count -= 1
        
        self._log_operation(
            "mark_resolved", "ImportFailure", failure.id,
            f"标记批次 {batch_no} 行 {row_no} 为已解决（无修正）"
        )
        self.session.commit()
        
        return {"status": "marked_resolved", "row_no": row_no}
    
    def resolve_all_failures(self, batch_no: str) -> Dict[str, Any]:
        batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
        if not batch:
            raise ValueError(f"批次不存在: {batch_no}")
        
        failures = self.session.query(ImportFailure).filter_by(
            batch_id=batch.id, resolved=False
        ).all()
        
        resolved_count = 0
        for failure in failures:
            try:
                original_data = json_loads(failure.original_data) if failure.original_data else {}
                cleaned_data = self._auto_clean_data(original_data, batch.source_type)
                
                import_service = ImportService(self.db_path)
                import_record = ImportRecord(
                    batch_id=batch.id,
                    source_type=batch.source_type,
                    original_row_no=failure.original_row_no,
                    data_json=json_dumps(cleaned_data),
                    data_hash=generate_hash(json_dumps(cleaned_data)),
                    is_valid=True,
                    is_duplicate=False
                )
                self.session.add(import_record)
                self.session.flush()
                
                import_service._process_source_data(
                    batch.source_type, cleaned_data, import_record.id
                )
                
                failure.resolved = True
                failure.resolved_at = datetime.now()
                failure.resolved_by = get_current_user() + "(auto)"
                
                batch.success_count += 1
                batch.failed_count -= 1
                resolved_count += 1
                
            except Exception:
                self.session.rollback()
                continue
        
        self._log_operation(
            "auto_fix", "ImportBatch", batch.id,
            f"自动修复批次 {batch_no}, 尝试 {len(failures)} 条, 成功 {resolved_count} 条"
        )
        self.session.commit()
        
        remaining = self.session.query(ImportFailure).filter_by(
            batch_id=batch.id, resolved=False
        ).count()
        
        return {
            "resolved": resolved_count,
            "remaining": remaining
        }
    
    def reimport_batch(self, batch_no: str, new_file: str) -> Dict[str, Any]:
        batch = self.session.query(ImportBatch).filter_by(batch_no=batch_no).first()
        if not batch:
            raise ValueError(f"批次不存在: {batch_no}")
        
        file_path = str(Path(new_file).resolve())
        file_hash = generate_file_hash(file_path)
        
        old_failures = self.session.query(ImportFailure).filter_by(batch_id=batch.id).all()
        for f in old_failures:
            self.session.delete(f)
        
        old_records = self.session.query(ImportRecord).filter_by(batch_id=batch.id).all()
        for r in old_records:
            self.session.delete(r)
        
        self.session.flush()
        
        import_service = ImportService(self.db_path)
        df = import_service._read_file(file_path)
        
        batch.file_name = Path(file_path).name
        batch.file_hash = file_hash
        batch.total_records = len(df)
        batch.success_count = 0
        batch.failed_count = 0
        batch.status = "processing"
        
        success_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            row_no = idx + 2
            try:
                row_dict = row.to_dict()
                data_hash = generate_hash(json_dumps(row_dict))
                
                record = ImportRecord(
                    batch_id=batch.id,
                    source_type=batch.source_type,
                    original_row_no=row_no,
                    data_json=json_dumps(row_dict),
                    data_hash=data_hash,
                    is_valid=True,
                    is_duplicate=False
                )
                self.session.add(record)
                self.session.flush()
                
                import_service._process_source_data(batch.source_type, row_dict, record.id)
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                failure = ImportFailure(
                    batch_id=batch.id,
                    original_row_no=row_no,
                    error_type=type(e).__name__,
                    error_message=str(e),
                    original_data=json_dumps(row_dict)
                )
                self.session.add(failure)
        
        batch.success_count = success_count
        batch.failed_count = failed_count
        batch.status = "completed" if failed_count == 0 else "completed_with_errors"
        
        self._log_operation(
            "reimport", "ImportBatch", batch.id,
            f"重新导入批次 {batch_no}: {Path(file_path).name}, 成功{success_count}, 失败{failed_count}"
        )
        self.session.commit()
        
        return {
            "success": success_count,
            "failed": failed_count
        }
    
    def _auto_clean_data(self, data: Dict, source_type: str) -> Dict:
        cleaned = data.copy()
        
        for key in cleaned:
            if isinstance(cleaned[key], str):
                cleaned[key] = cleaned[key].strip()
                if cleaned[key] == "":
                    cleaned[key] = None
        
        return cleaned
    
    def _log_operation(self, op_type: str, entity_type: str, entity_id: int = None, remark: str = ""):
        log = OperationLog(
            operation_type=op_type,
            entity_type=entity_type,
            entity_id=entity_id,
            operated_by=get_current_user(),
            remark=remark
        )
        self.session.add(log)
