"""审计追踪模块 - 记录所有操作、修正和来源信息"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid
import json

from .exceptions import SourceLocation, AuditTrailError


class ActionType(Enum):
    """操作类型枚举"""
    DATA_LOAD = "data_load"
    VALIDATION = "validation"
    CORRECTION = "correction"
    STANDARDIZATION = "standardization"
    CLUSTERING = "clustering"
    METRICS_CALCULATION = "metrics_calculation"
    INTERPRETATION = "interpretation"
    REPORT_GENERATION = "report_generation"
    OUTLIER_DETECTION = "outlier_detection"
    CONFIG_UPDATE = "config_update"


class Severity(Enum):
    """严重程度枚举"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class AuditEntry:
    """审计条目"""
    entry_id: str
    timestamp: datetime
    action_type: ActionType
    severity: Severity
    message: str
    source_location: Optional[SourceLocation] = None
    before_value: Optional[Any] = None
    after_value: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "timestamp": self.timestamp.isoformat(),
            "action_type": self.action_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "source_location": str(self.source_location) if self.source_location else None,
            "before_value": str(self.before_value) if self.before_value is not None else None,
            "after_value": str(self.after_value) if self.after_value is not None else None,
            "metadata": self.metadata,
        }


class AuditTrail:
    """审计追踪器"""

    def __init__(self, max_entries: int = 10000):
        self.entries: List[AuditEntry] = []
        self.max_entries = max_entries
        self.start_time = datetime.now()
        self.session_id = str(uuid.uuid4())
        self.correction_count = 0
        self.warning_count = 0
        self.error_count = 0

    def add_entry(
        self,
        action_type: ActionType,
        severity: Severity,
        message: str,
        source_location: Optional[SourceLocation] = None,
        before_value: Optional[Any] = None,
        after_value: Optional[Any] = None,
        **metadata: Any,
    ) -> str:
        """添加审计条目

        Returns:
            条目的唯一ID
        """
        if len(self.entries) >= self.max_entries:
            raise AuditTrailError(
                f"审计条目数已达上限 ({self.max_entries})，无法继续记录"
            )

        entry_id = str(uuid.uuid4())
        entry = AuditEntry(
            entry_id=entry_id,
            timestamp=datetime.now(),
            action_type=action_type,
            severity=severity,
            message=message,
            source_location=source_location,
            before_value=before_value,
            after_value=after_value,
            metadata=metadata,
        )

        self.entries.append(entry)

        if severity == Severity.WARNING:
            self.warning_count += 1
        elif severity in (Severity.ERROR, Severity.CRITICAL):
            self.error_count += 1

        if action_type == ActionType.CORRECTION:
            self.correction_count += 1

        return entry_id

    def log_correction(
        self,
        message: str,
        source_location: Optional[SourceLocation] = None,
        before_value: Optional[Any] = None,
        after_value: Optional[Any] = None,
        **metadata: Any,
    ) -> str:
        """记录一次修正操作"""
        return self.add_entry(
            action_type=ActionType.CORRECTION,
            severity=Severity.WARNING,
            message=message,
            source_location=source_location,
            before_value=before_value,
            after_value=after_value,
            **metadata,
        )

    def log_warning(
        self,
        action_type: ActionType,
        message: str,
        source_location: Optional[SourceLocation] = None,
        **metadata: Any,
    ) -> str:
        """记录一条警告"""
        return self.add_entry(
            action_type=action_type,
            severity=Severity.WARNING,
            message=message,
            source_location=source_location,
            **metadata,
        )

    def log_error(
        self,
        action_type: ActionType,
        message: str,
        source_location: Optional[SourceLocation] = None,
        **metadata: Any,
    ) -> str:
        """记录一条错误"""
        return self.add_entry(
            action_type=action_type,
            severity=Severity.ERROR,
            message=message,
            source_location=source_location,
            **metadata,
        )

    def log_info(
        self,
        action_type: ActionType,
        message: str,
        source_location: Optional[SourceLocation] = None,
        **metadata: Any,
    ) -> str:
        """记录一条信息"""
        return self.add_entry(
            action_type=action_type,
            severity=Severity.INFO,
            message=message,
            source_location=source_location,
            **metadata,
        )

    def get_entries_by_type(self, action_type: ActionType) -> List[AuditEntry]:
        """按操作类型筛选条目"""
        return [e for e in self.entries if e.action_type == action_type]

    def get_entries_by_severity(self, severity: Severity) -> List[AuditEntry]:
        """按严重程度筛选条目"""
        return [e for e in self.entries if e.severity == severity]

    def get_corrections(self) -> List[AuditEntry]:
        """获取所有修正记录"""
        return self.get_entries_by_type(ActionType.CORRECTION)

    def get_warnings(self) -> List[AuditEntry]:
        """获取所有警告"""
        return self.get_entries_by_severity(Severity.WARNING)

    def get_errors(self) -> List[AuditEntry]:
        """获取所有错误"""
        return [e for e in self.entries if e.severity in (Severity.ERROR, Severity.CRITICAL)]

    def get_summary(self) -> Dict[str, Any]:
        """获取审计摘要"""
        return {
            "session_id": self.session_id,
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "total_entries": len(self.entries),
            "correction_count": self.correction_count,
            "warning_count": self.warning_count,
            "error_count": self.error_count,
            "action_type_counts": {
                at.value: len(self.get_entries_by_type(at)) for at in ActionType
            },
        }

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "summary": self.get_summary(),
            "entries": [entry.to_dict() for entry in self.entries],
        }

    def to_json(self, indent: int = 2) -> str:
        """转换为JSON格式"""
        def _json_default(obj: Any) -> Any:
            import numpy as np
            import pandas as pd
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, (pd.Series, pd.DataFrame)):
                return obj.to_dict()
            elif hasattr(obj, 'isoformat'):
                return obj.isoformat()
            else:
                return str(obj)
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False, default=_json_default)

    def export_markdown(self) -> str:
        """导出为Markdown格式的审计报告"""
        lines = ["# 审计追踪报告", ""]
        summary = self.get_summary()

        lines.append("## 会话信息")
        lines.append(f"- 会话ID: {summary['session_id']}")
        lines.append(f"- 开始时间: {summary['start_time']}")
        lines.append(f"- 结束时间: {summary['end_time']}")
        lines.append(f"- 总条目数: {summary['total_entries']}")
        lines.append(f"- 修正次数: {summary['correction_count']}")
        lines.append(f"- 警告数: {summary['warning_count']}")
        lines.append(f"- 错误数: {summary['error_count']}")
        lines.append("")

        if self.correction_count > 0:
            lines.append("## 修正记录")
            for entry in self.get_corrections():
                lines.append(f"### {entry.timestamp}")
                lines.append(f"- 内容: {entry.message}")
                if entry.source_location:
                    lines.append(f"- 位置: {entry.source_location}")
                if entry.before_value is not None:
                    lines.append(f"- 修正前: {entry.before_value}")
                if entry.after_value is not None:
                    lines.append(f"- 修正后: {entry.after_value}")
                lines.append("")

        if self.warning_count > 0:
            lines.append("## 警告记录")
            for entry in self.get_warnings():
                if entry.action_type == ActionType.CORRECTION:
                    continue
                lines.append(f"- **{entry.timestamp}** [{entry.action_type.value}] {entry.message}")
                if entry.source_location:
                    lines.append(f"  位置: {entry.source_location}")
            lines.append("")

        if self.error_count > 0:
            lines.append("## 错误记录")
            for entry in self.get_errors():
                lines.append(f"- **{entry.timestamp}** [{entry.action_type.value}] {entry.message}")
                if entry.source_location:
                    lines.append(f"  位置: {entry.source_location}")
            lines.append("")

        return "\n".join(lines)
