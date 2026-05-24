import json
import uuid
import os
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import AutomationCheck, ImportBatch, AsyncTask, StatusLog, ReplayChain
from app.config import settings
from app.services.import_service import ImportService

CHECK_TYPE_DUPLICATE_IMPORT = "duplicate_import"
CHECK_TYPE_PERMISSION_INTERCEPT = "permission_intercept"
CHECK_TYPE_EXCEPTION_PRESERVE = "exception_preserve"
CHECK_TYPE_RESTART_HISTORY = "restart_history"
CHECK_TYPE_EXPORT_CONSISTENCY = "export_consistency"

class AutomationCheckService:
    @staticmethod
    def create_check(
        db: Session,
        check_type: str,
        check_name: str,
        target_entity: str = None,
        target_id: str = None,
    ) -> AutomationCheck:
        check = AutomationCheck(
            check_id=f"CHECK_{uuid.uuid4().hex[:16]}",
            check_type=check_type,
            check_name=check_name,
            target_entity=target_entity,
            target_id=target_id,
            checked_by="system",
        )
        db.add(check)
        db.commit()
        db.refresh(check)
        return check

    @staticmethod
    def check_duplicate_import(
        db: Session,
        file_path: str,
        data_type: str,
    ) -> Dict:
        """检查重复导入"""
        check = AutomationCheckService.create_check(
            db,
            CHECK_TYPE_DUPLICATE_IMPORT,
            "重复导入检查",
            target_entity=data_type,
        )
        
        file_hash = ImportService.calculate_file_hash(file_path)
        
        is_duplicate, existing_batch = ImportService.check_duplicate_import(db, file_hash, data_type)
        
        result = {
            "passed": not is_duplicate,
            "file_hash": file_hash,
            "is_duplicate": is_duplicate,
            "existing_batch_id": existing_batch.batch_id if existing_batch else None,
            "existing_batch_name": existing_batch.batch_name if existing_batch else None,
            "existing_batch_time": existing_batch.created_at.isoformat() if existing_batch else None,
            "message": "文件未重复，可以导入" if not is_duplicate else f"文件与批次 {existing_batch.batch_id} 重复",
        }
        
        check.is_passed = not is_duplicate
        check.check_result = json.dumps(result, ensure_ascii=False)
        check.check_details = f"文件哈希: {file_hash}, 是否重复: {is_duplicate}"
        db.commit()
        
        return result

    @staticmethod
    def check_permission_intercept(
        user_role: str,
        required_roles: List[str],
        operation: str,
    ) -> Dict:
        """检查权限拦截"""
        has_permission = user_role in required_roles
        
        result = {
            "passed": has_permission,
            "user_role": user_role,
            "required_roles": required_roles,
            "operation": operation,
            "intercepted": not has_permission,
            "message": "权限校验通过" if has_permission else "权限不足，操作已拦截",
        }
        
        return result

    @staticmethod
    def check_exception_preserve(
        db: Session,
        task_id: str,
    ) -> Dict:
        """检查异常保留：失败原因、人工意见、最终状态是否完整保留"""
        check = AutomationCheckService.create_check(
            db,
            CHECK_TYPE_EXCEPTION_PRESERVE,
            "异常保留检查",
            target_entity="async_task",
            target_id=task_id,
        )
        
        task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        if not task:
            result = {"passed": False, "message": "任务不存在"}
            check.check_result = json.dumps(result)
            db.commit()
            return result
        
        preserved_fields = []
        missing_fields = []
        
        if task.failure_reason:
            preserved_fields.append("failure_reason")
        else:
            missing_fields.append("failure_reason")
        
        if task.status in ["failed", "waiting_manual", "success"]:
            preserved_fields.append("final_status")
        else:
            missing_fields.append("final_status")
        
        if task.status == "waiting_manual":
            if task.manual_opinion:
                preserved_fields.append("manual_opinion")
            if task.manual_operator:
                preserved_fields.append("manual_operator")
            if task.manual_time:
                preserved_fields.append("manual_time")
        
        if task.error_trace:
            preserved_fields.append("error_trace")
        
        all_preserved = len(missing_fields) == 0
        
        result = {
            "passed": all_preserved,
            "task_id": task_id,
            "task_status": task.status,
            "failure_category": task.failure_category,
            "preserved_fields": preserved_fields,
            "missing_fields": missing_fields,
            "message": "所有异常信息已保留" if all_preserved else f"缺少字段: {', '.join(missing_fields)}",
        }
        
        check.is_passed = all_preserved
        check.check_result = json.dumps(result, ensure_ascii=False)
        check.check_details = f"任务 {task_id} 异常保留状态: {len(preserved_fields)}/{len(preserved_fields) + len(missing_fields)} 字段已保留"
        db.commit()
        
        return result

    @staticmethod
    def capture_before_restart_snapshot(
        db: Session,
        entity_type: str,
        entity_id: str,
    ) -> Dict:
        """捕获重启前快照"""
        snapshot = {
            "snapshot_time": datetime.now().isoformat(),
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
        
        if entity_type == "async_task":
            task = db.query(AsyncTask).filter(AsyncTask.task_id == entity_id).first()
            if task:
                snapshot.update({
                    "status": task.status,
                    "failure_reason": task.failure_reason,
                    "failure_category": task.failure_category,
                    "manual_opinion": task.manual_opinion,
                    "manual_operator": task.manual_operator,
                    "retry_count": task.retry_count,
                    "progress": task.progress,
                })
        
        return snapshot

    @staticmethod
    def check_restart_history(
        db: Session,
        entity_type: str,
        entity_id: str,
        before_restart_data: Dict,
    ) -> Dict:
        """检查重启后历史一致性"""
        check = AutomationCheckService.create_check(
            db,
            CHECK_TYPE_RESTART_HISTORY,
            "重启后历史一致性检查",
            target_entity=entity_type,
            target_id=entity_id,
        )
        
        after_restart_data = AutomationCheckService.capture_before_restart_snapshot(db, entity_type, entity_id)
        
        fields_to_check = [
            "failure_reason",
            "failure_category",
            "manual_opinion",
            "manual_operator",
        ]
        
        consistent = True
        diffs = []
        
        for field in fields_to_check:
            before_val = before_restart_data.get(field)
            after_val = after_restart_data.get(field)
            
            if before_val != after_val:
                consistent = False
                diffs.append({
                    "field": field,
                    "before": before_val,
                    "after": after_val,
                })
        
        result = {
            "passed": consistent,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "diffs": diffs,
            "before_restart": before_restart_data,
            "after_restart": after_restart_data,
            "message": "重启后历史数据一致" if consistent else f"发现 {len(diffs)} 处不一致",
        }
        
        check.is_passed = consistent
        check.before_restart_data = json.dumps(before_restart_data, ensure_ascii=False)
        check.after_restart_data = json.dumps(after_restart_data, ensure_ascii=False)
        check.check_result = json.dumps(result, ensure_ascii=False)
        db.commit()
        
        return result

    @staticmethod
    def check_export_consistency(
        db: Session,
        chain_id: str,
        export_file_path: str,
    ) -> Dict:
        """检查导出一致性"""
        check = AutomationCheckService.create_check(
            db,
            CHECK_TYPE_EXPORT_CONSISTENCY,
            "导出一致性检查",
            target_entity="replay_chain",
            target_id=chain_id,
        )
        
        chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
        if not chain:
            result = {"passed": False, "message": "回放链路不存在"}
            check.check_result = json.dumps(result)
            db.commit()
            return result
        
        consistency_checks = []
        
        if os.path.exists(export_file_path):
            file_size = os.path.getsize(export_file_path)
            file_hash = AutomationCheckService._calculate_file_hash(export_file_path)
            consistency_checks.append({
                "check": "file_exists",
                "passed": True,
                "file_size": file_size,
                "file_hash": file_hash,
            })
        else:
            consistency_checks.append({
                "check": "file_exists",
                "passed": False,
                "message": "导出文件不存在",
            })
        
        if chain.export_file_name and chain.export_file_path:
            consistency_checks.append({
                "check": "db_record_exists",
                "passed": True,
                "export_file_name": chain.export_file_name,
            })
        else:
            consistency_checks.append({
                "check": "db_record_exists",
                "passed": False,
                "message": "数据库中导出记录不完整",
            })
        
        status_logs = db.query(StatusLog).filter(
            StatusLog.entity_type == "replay_chains",
            StatusLog.entity_id == str(chain.id),
            StatusLog.new_status == "exported",
        ).all()
        
        if status_logs:
            consistency_checks.append({
                "check": "status_log_exists",
                "passed": True,
                "log_count": len(status_logs),
                "operator": status_logs[0].operator,
            })
        else:
            consistency_checks.append({
                "check": "status_log_exists",
                "passed": False,
                "message": "缺少导出状态变更日志",
            })
        
        all_passed = all(c["passed"] for c in consistency_checks)
        
        result = {
            "passed": all_passed,
            "chain_id": chain_id,
            "export_file_path": export_file_path,
            "checks": consistency_checks,
            "message": "导出一致性检查通过" if all_passed else "导出一致性检查未通过",
        }
        
        check.is_passed = all_passed
        check.check_result = json.dumps(result, ensure_ascii=False)
        db.commit()
        
        return result

    @staticmethod
    def _calculate_file_hash(file_path: str) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @staticmethod
    def run_all_checks(
        db: Session,
        chain_id: str = None,
        task_id: str = None,
    ) -> Dict:
        """运行所有自动化检查"""
        results = {}
        
        if task_id:
            results["exception_preserve"] = AutomationCheckService.check_exception_preserve(db, task_id)
        
        if chain_id:
            chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
            if chain and chain.export_file_path:
                results["export_consistency"] = AutomationCheckService.check_export_consistency(
                    db, chain_id, chain.export_file_path
                )
        
        return results
