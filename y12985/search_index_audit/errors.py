"""自定义异常 - 提供可操作的错误提示"""

from typing import Optional, List


class AuditError(Exception):
    """审计系统基础异常"""

    def __init__(self, message: str, action_hint: Optional[str] = None):
        super().__init__(message)
        self.action_hint = action_hint

    def __str__(self) -> str:
        if self.action_hint:
            return f"{super().__str__()}\n操作建议: {self.action_hint}"
        return super().__str__()


class MigrationScriptMissingError(AuditError):
    """迁移脚本缺失错误 - 漏页检测"""

    def __init__(
        self,
        version: str,
        missing_pages: List[int],
        total_pages: int,
        script_dir: Optional[str] = None,
    ):
        self.version = version
        self.missing_pages = missing_pages
        self.total_pages = total_pages
        self.script_dir = script_dir

        pages_str = ", ".join(str(p) for p in missing_pages)
        message = (
            f"迁移脚本 {version} 存在漏页，共 {total_pages} 页，"
            f"缺失第 {pages_str} 页"
        )
        hint = (
            f"请检查 {script_dir or '迁移脚本目录'} 目录，"
            f"补充缺失的第 {pages_str} 页脚本后重新运行"
        )
        super().__init__(message, hint)


class FieldDriftError(AuditError):
    """字段类型漂移错误"""

    def __init__(
        self,
        table_name: str,
        field_name: str,
        expected_type: str,
        actual_type: str,
        script_path: Optional[str] = None,
    ):
        self.table_name = table_name
        self.field_name = field_name
        self.expected_type = expected_type
        self.actual_type = actual_type
        self.script_path = script_path

        message = (
            f"表 {table_name} 的字段 {field_name} 类型漂移："
            f"期望 {expected_type}，实际 {actual_type}"
        )
        hint = (
            f"请检查迁移脚本 {script_path or '相关脚本'}，"
            f"确认字段类型变更是否合规，必要时修复导出逻辑"
        )
        super().__init__(message, hint)


class DuplicateImportError(AuditError):
    """重复导入错误"""

    def __init__(self, record_type: str, record_id: str, batch_id: Optional[str] = None):
        self.record_type = record_type
        self.record_id = record_id
        self.batch_id = batch_id

        message = f"{record_type} 记录 {record_id} 已存在，禁止重复导入"
        hint = (
            f"如需重新导入，请先使用 --force 参数覆盖，"
            f"或创建新的数据批次（batch）避免冲突"
        )
        super().__init__(message, hint)


class SourceNotFoundError(AuditError):
    """来源材料未找到错误 - 用于溯源失败时"""

    def __init__(self, source_type: str, source_id: str, source_path: Optional[str] = None):
        self.source_type = source_type
        self.source_id = source_id
        self.source_path = source_path

        message = f"来源材料 {source_type}:{source_id} 未找到"
        hint = (
            f"请确认来源路径 {source_path or '指定路径'} 是否存在，"
            f"或重新导入原始数据以建立溯源链接"
        )
        super().__init__(message, hint)


class BackupVerificationError(AuditError):
    """备份验证失败错误"""

    def __init__(self, backup_name: str, reason: str):
        self.backup_name = backup_name
        self.reason = reason

        message = f"备份 {backup_name} 验证失败: {reason}"
        hint = "建议联系安全审计员复核该备份，确认完整性后再使用"
        super().__init__(message, hint)


class PermissionRiskError(AuditError):
    """权限风险错误"""

    def __init__(self, user_name: str, table_name: str, risk_level: str, reason: str):
        self.user_name = user_name
        self.table_name = table_name
        self.risk_level = risk_level
        self.reason = reason

        message = f"用户 {user_name} 在表 {table_name} 的权限存在 {risk_level} 风险: {reason}"
        hint = "请权限管理员复核该权限配置，确认是否需要调整或撤销"
        super().__init__(message, hint)
