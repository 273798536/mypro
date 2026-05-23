import os
from pathlib import Path
from typing import Any, Dict

from lease_audit.models.database import (
    get_session, ImportBatch, ImportRecord, ImportFailure,
    OperationLog
)


class DoctorService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def run_all_checks(self) -> Dict[str, Any]:
        return {
            "数据库完整性": self._check_database_integrity(),
            "重复导入检测": self._check_duplicate_imports(),
            "异常数据保留": self._check_failure_retention(),
            "历史记录一致性": self._check_history_consistency(),
            "导出轨迹验证": self._check_export_trail(),
            "文件权限检查": self._check_file_permissions(),
        }
    
    def _check_database_integrity(self) -> Dict[str, Any]:
        try:
            batches = self.session.query(ImportBatch).count()
            records = self.session.query(ImportRecord).count()
            failures = self.session.query(ImportFailure).count()
            logs = self.session.query(OperationLog).count()
            
            orphan_records = self.session.query(ImportRecord).filter(
                ~ImportRecord.batch_id.in_(
                    self.session.query(ImportBatch.id)
                )
            ).count()
            
            return {
                "passed": orphan_records == 0,
                "message": f"批次{batches}, 记录{records}, 失败{failures}, 日志{logs}",
                "details": [f"孤立记录数: {orphan_records}"] if orphan_records > 0 else []
            }
        except Exception as e:
            return {
                "passed": False,
                "message": f"数据库检查失败: {str(e)}",
                "details": []
            }
    
    def _check_duplicate_imports(self) -> Dict[str, Any]:
        from sqlalchemy import func
        
        duplicate_files = self.session.query(
            ImportBatch.file_hash,
            func.count(ImportBatch.id).label("count")
        ).group_by(ImportBatch.file_hash).having(func.count(ImportBatch.id) > 1).all()
        
        duplicate_data = self.session.query(
            ImportRecord.data_hash,
            func.count(ImportRecord.id).label("count")
        ).group_by(ImportRecord.data_hash).having(func.count(ImportRecord.id) > 1).count()
        
        passed = len(duplicate_files) == 0 and duplicate_data == 0
        details = []
        if duplicate_files:
            details.append(f"重复文件数: {len(duplicate_files)}")
        if duplicate_data:
            details.append(f"重复数据数: {duplicate_data}")
        
        return {
            "passed": passed,
            "message": f"重复文件: {len(duplicate_files)}, 重复数据: {duplicate_data}",
            "details": details
        }
    
    def _check_failure_retention(self) -> Dict[str, Any]:
        unresolved = self.session.query(ImportFailure).filter_by(resolved=False).count()
        resolved = self.session.query(ImportFailure).filter_by(resolved=True).count()
        
        all_failures_have_original_data = True
        failures = self.session.query(ImportFailure).all()
        missing_data = 0
        for f in failures:
            if not f.original_data:
                all_failures_have_original_data = False
                missing_data += 1
        
        return {
            "passed": all_failures_have_original_data,
            "message": f"未解决{unresolved}, 已解决{resolved}",
            "details": [f"缺少原始数据的失败记录: {missing_data}"] if missing_data > 0 else []
        }
    
    def _check_history_consistency(self) -> Dict[str, Any]:
        import_logs = self.session.query(OperationLog).filter(
            OperationLog.operation_type.in_(["import", "reimport"])
        ).all()
        
        batch_ids_from_logs = set()
        for log in import_logs:
            if log.entity_type == "ImportBatch" and log.entity_id:
                batch_ids_from_logs.add(log.entity_id)
        
        all_batches = self.session.query(ImportBatch.id).all()
        batch_ids = set(b[0] for b in all_batches)
        
        missing_logs = batch_ids - batch_ids_from_logs
        orphan_logs = batch_ids_from_logs - batch_ids
        
        passed = len(missing_logs) == 0 and len(orphan_logs) == 0
        details = []
        if missing_logs:
            details.append(f"缺少操作日志的批次: {len(missing_logs)}")
        if orphan_logs:
            details.append(f"日志引用不存在的批次: {len(orphan_logs)}")
        
        return {
            "passed": passed,
            "message": f"导入日志{len(import_logs)}条",
            "details": details
        }
    
    def _check_export_trail(self) -> Dict[str, Any]:
        from lease_audit.utils.common import get_export_dir
        
        export_dir = Path(get_export_dir())
        if not export_dir.exists():
            return {
                "passed": True,
                "message": "导出目录不存在（首次使用）",
                "details": []
            }
        
        export_files = list(export_dir.glob("*"))
        export_logs = self.session.query(OperationLog).filter(
            OperationLog.operation_type == "export"
        ).count()
        
        return {
            "passed": True,
            "message": f"导出目录文件数: {len(export_files)}, 导出日志数: {export_logs}",
            "details": [f"导出目录: {export_dir}"]
        }
    
    def _check_file_permissions(self) -> Dict[str, Any]:
        from lease_audit.utils.common import get_data_dir, get_db_path
        
        data_dir = Path(get_data_dir())
        db_path = Path(get_db_path())
        
        details = []
        passed = True
        
        if not data_dir.exists():
            details.append("数据目录不存在")
            passed = False
        else:
            if not os.access(data_dir, os.R_OK):
                details.append("数据目录无读权限")
                passed = False
            if not os.access(data_dir, os.W_OK):
                details.append("数据目录无写权限")
                passed = False
        
        if db_path.exists():
            if not os.access(db_path, os.R_OK):
                details.append("数据库文件无读权限")
                passed = False
            if not os.access(db_path, os.W_OK):
                details.append("数据库文件无写权限")
                passed = False
        
        return {
            "passed": passed,
            "message": "文件权限检查完成",
            "details": details
        }
