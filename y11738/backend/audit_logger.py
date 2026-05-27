from datetime import datetime
from models import db, AuditLog, FuelRecord


class AuditLogger:
    @staticmethod
    def log_action(fuel_record_id: int, action: str, field_name: str = None,
                   old_value: str = None, new_value: str = None,
                   operator: str = 'system', operator_role: str = 'system',
                   remark: str = None):
        log = AuditLog(
            fuel_record_id=fuel_record_id,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            operator=operator,
            operator_role=operator_role,
            remark=remark
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def log_import(fuel_record_id: int, source_file: str, operator: str = 'system'):
        return AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='import',
            operator=operator,
            operator_role='admin',
            remark=f'从文件 {source_file} 导入'
        )

    @staticmethod
    def log_anomaly_detected(fuel_record_id: int, anomaly_type: str, description: str):
        return AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='anomaly_detected',
            field_name=anomaly_type,
            new_value=description,
            operator='system',
            operator_role='system',
            remark='异常检测'
        )

    @staticmethod
    def log_anomaly_resolved(fuel_record_id: int, anomaly_type: str, operator: str):
        return AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='anomaly_resolved',
            field_name=anomaly_type,
            operator=operator,
            operator_role='admin',
            remark='异常已处理'
        )

    @staticmethod
    def log_driver_confirm(fuel_record_id: int, driver_id: int, status: str, operator: str):
        return AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='driver_confirm',
            field_name='status',
            new_value=status,
            operator=operator,
            operator_role='driver',
            remark=f'司机确认: {status}'
        )

    @staticmethod
    def log_edit(fuel_record_id: int, field_name: str, old_value: str, new_value: str, operator: str):
        return AuditLogger.log_action(
            fuel_record_id=fuel_record_id,
            action='edit',
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            operator=operator,
            operator_role='admin',
            remark='手动编辑记录'
        )

    @staticmethod
    def get_record_history(fuel_record_id: int) -> list:
        logs = AuditLog.query.filter_by(fuel_record_id=fuel_record_id).order_by(AuditLog.created_at.desc()).all()
        return [
            {
                'id': log.id,
                'action': log.action,
                'field_name': log.field_name,
                'old_value': log.old_value,
                'new_value': log.new_value,
                'operator': log.operator,
                'operator_role': log.operator_role,
                'remark': log.remark,
                'created_at': log.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            for log in logs
        ]
