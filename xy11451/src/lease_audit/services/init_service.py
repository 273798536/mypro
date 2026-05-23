from datetime import datetime
from lease_audit.models.database import get_session, SystemConfig, OperationLog
from lease_audit.utils.common import get_current_user


class InitService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def init_configs(self, force: bool = False):
        default_configs = [
            ("data_retention_days", "365", "数据保留天数"),
            ("auto_check_duplicates", "true", "自动检查重复数据"),
            ("strict_mode", "true", "严格模式（校验失败不入库）"),
            ("export_include_failures", "false", "导出默认包含失败记录"),
            ("batch_prefix_lease", "LEASE", "出库单批次号前缀"),
            ("batch_prefix_return", "RETURN", "归还单批次号前缀"),
            ("batch_prefix_photo", "PHOTO", "照片批次号前缀"),
            ("batch_prefix_repair", "REPAIR", "维修估价批次号前缀"),
            ("batch_prefix_handover", "HANDOVER", "交接纸批次号前缀"),
        ]
        
        for key, value, desc in default_configs:
            existing = self.session.query(SystemConfig).filter_by(config_key=key).first()
            if existing and not force:
                continue
            if existing:
                existing.config_value = value
                existing.description = desc
                existing.updated_at = datetime.now()
                existing.updated_by = get_current_user()
            else:
                config = SystemConfig(
                    config_key=key,
                    config_value=value,
                    description=desc,
                    updated_by=get_current_user()
                )
                self.session.add(config)
        
        self._log_operation("system_init", "SystemConfig", None, "初始化系统配置")
        self.session.commit()
    
    def _log_operation(self, op_type: str, entity_type: str, entity_id: int = None, remark: str = ""):
        log = OperationLog(
            operation_type=op_type,
            entity_type=entity_type,
            entity_id=entity_id,
            operated_by=get_current_user(),
            remark=remark
        )
        self.session.add(log)
