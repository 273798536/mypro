import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

WORKSPACE_DIR = Path.cwd() / ".lib-inspect"
LOG_DIR = WORKSPACE_DIR / "logs"

_logger_instance: Optional[logging.Logger] = None


def get_logger() -> logging.Logger:
    global _logger_instance
    if _logger_instance is not None:
        return _logger_instance

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / f"operation_{datetime.now().strftime('%Y%m')}.log"

    logger = logging.getLogger("lib_inspect")
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.INFO)

        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(operator)s | %(action)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(formatter)

        logger.addHandler(file_handler)
        logger.propagate = False

    _logger_instance = logger
    return logger


def log_operation(action: str, message: str, operator: str = "system",
                  level: str = "info") -> None:
    logger = get_logger()
    extra = {"operator": operator, "action": action}

    if level == "debug":
        logger.debug(message, extra=extra)
    elif level == "warning":
        logger.warning(message, extra=extra)
    elif level == "error":
        logger.error(message, extra=extra)
    else:
        logger.info(message, extra=extra)


def log_init(force: bool = False) -> None:
    log_operation(
        "INIT",
        f"工作区初始化{'（强制重建）' if force else ''}",
        operator="system"
    )


def log_import(file_name: str, source: str, record_count: int, operator: str) -> None:
    log_operation(
        "IMPORT",
        f"导入文件 {file_name}, 来源: {source}, 记录数: {record_count}",
        operator=operator
    )


def log_import_error(file_name: str, source: str, error: str, operator: str) -> None:
    log_operation(
        "IMPORT_ERROR",
        f"导入失败 {file_name}, 来源: {source}, 错误: {error}",
        operator=operator,
        level="error"
    )


def log_check(record_count: int, passed: int, failed: int,
              fix_auto: bool, operator: str) -> None:
    log_operation(
        "CHECK",
        f"校验 {record_count} 条记录, 通过: {passed}, 失败: {failed}, 自动修复: {fix_auto}",
        operator=operator
    )


def log_fix(record_id: str, field: str, old_value: str, new_value: str,
            operator: str, reason: str) -> None:
    log_operation(
        "FIX",
        f"修正记录 {record_id}, 字段: {field}, {old_value} -> {new_value}, 原因: {reason}",
        operator=operator
    )


def log_fix_error(record_id: str, error: str, operator: str) -> None:
    log_operation(
        "FIX_ERROR",
        f"修正失败 {record_id}, 错误: {error}",
        operator=operator,
        level="error"
    )


def log_recalc(record_count: int, updated_count: int, operator: str, reason: str) -> None:
    log_operation(
        "RECALC",
        f"重新计算 {record_count} 条记录, 更新: {updated_count}, 原因: {reason}",
        operator=operator
    )


def log_export(output_file: str, record_count: int, fmt: str,
               include_failed: bool, operator: str) -> None:
    log_operation(
        "EXPORT",
        f"导出文件 {output_file}, 格式: {fmt}, 记录数: {record_count}, 包含失败: {include_failed}",
        operator=operator
    )


def log_export_error(output_file: str, error: str, operator: str) -> None:
    log_operation(
        "EXPORT_ERROR",
        f"导出失败 {output_file}, 错误: {error}",
        operator=operator,
        level="error"
    )


def log_view(action: str, record_id: Optional[str] = None, operator: str = "system") -> None:
    msg = f"查看{action}"
    if record_id:
        msg += f", 记录ID: {record_id}"
    log_operation("VIEW", msg, operator=operator)
