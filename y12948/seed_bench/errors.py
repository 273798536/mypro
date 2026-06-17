from __future__ import annotations


class SeedBenchError(Exception):
    """基类异常，所有业务异常都继承自此"""

    def __init__(self, message: str, suggestion: str = "", details: dict | None = None):
        self.message = message
        self.suggestion = suggestion
        self.details = details or {}
        full_msg = message
        if suggestion:
            full_msg += f"\n  建议操作: {suggestion}"
        super().__init__(full_msg)


class SafetyRuleMissingError(SeedBenchError):
    """安全规则缺失异常"""

    def __init__(self, rule_name: str, rule_description: str = ""):
        suggestion = (
            f"请在 config.yaml 的 seed_bench.safety_rules 下配置 '{rule_name}'"
            f"，或使用 --safety-rules 参数指定规则文件路径。"
        )
        msg = f"缺少安全规则: {rule_name}"
        if rule_description:
            msg += f" ({rule_description})"
        super().__init__(message=msg, suggestion=suggestion, details={"missing_rule": rule_name})


class TrainValLeakError(SeedBenchError):
    """训练验证泄漏异常"""

    def __init__(self, leak_type: str, leak_count: int, total_count: int, affected_keys: list | None = None):
        ratio = leak_count / max(total_count, 1)
        suggestion = (
            f"请优先使用 'dedup' 子命令进行样本去重，"
            f"然后检查数据划分逻辑（按用户/按时间/按会话等），"
            f"最后通过 'review' 子命令统一复核安全规则与模型日志。"
        )
        details = {
            "leak_type": leak_type,
            "leak_count": leak_count,
            "total_count": total_count,
            "leak_ratio": round(ratio, 6),
            "affected_keys": (affected_keys or [])[:20],
        }
        msg = (
            f"检测到训练验证泄漏 [{leak_type}]: "
            f"{leak_count}/{total_count} 条 ({ratio:.2%}) 样本同时出现在训练集与验证集"
        )
        super().__init__(message=msg, suggestion=suggestion, details=details)


class DuplicateRecordError(SeedBenchError):
    """重复记录幂等冲突"""

    def __init__(self, record_id: str, existing_version: str, new_version: str):
        suggestion = (
            f"若需更新结论，请使用 '--force-version {new_version}' 参数明确版本覆盖；"
            f"若为误操作，原始记录已安全保留。"
        )
        super().__init__(
            message=f"记录 {record_id} 已存在版本 {existing_version}，拒绝使用版本 {new_version} 覆盖",
            suggestion=suggestion,
            details={"record_id": record_id, "existing_version": existing_version, "new_version": new_version},
        )


class ConfigValidationError(SeedBenchError):
    """配置校验失败"""

    def __init__(self, field_name: str, expected: str, actual: Any):
        suggestion = f"请检查 config.yaml 或 CLI 参数中的 {field_name}，确保其值为 {expected}。"
        super().__init__(
            message=f"配置项 '{field_name}' 非法: 期望 {expected}, 实际值 {actual}",
            suggestion=suggestion,
            details={"field": field_name, "expected": expected, "actual": str(actual)},
        )


class InputDataError(SeedBenchError):
    """输入数据异常"""

    def __init__(self, file_path: str, reason: str):
        suggestion = (
            f"请确认输入文件格式（支持 csv/json/parquet），"
            f"或使用 'seed-bench sample' 生成示例数据对照字段结构。"
        )
        super().__init__(
            message=f"读取输入文件 {file_path} 失败: {reason}",
            suggestion=suggestion,
            details={"file_path": file_path, "reason": reason},
        )


class InconsistentSummaryError(SeedBenchError):
    """摘要与文件内容不一致"""

    def __init__(self, summary_value: Any, file_value: Any, field_name: str):
        suggestion = (
            f"请重新运行 'export' 子命令以同步界面摘要与导出文件内容；"
            f"本平台启用了 sync_summary_with_file 保护，不会混用不一致的数据。"
        )
        super().__init__(
            message=f"字段 '{field_name}' 不一致: 界面摘要={summary_value}, 导出文件={file_value}",
            suggestion=suggestion,
            details={"field": field_name, "summary_value": str(summary_value), "file_value": str(file_value)},
        )
