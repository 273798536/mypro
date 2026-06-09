"""
处理记录管理模块
用于存储、查询、对比历史巡检记录
"""

from .manager import (
    ProcessingRecord,
    BatchRecord,
    RecordManager
)

__all__ = [
    "ProcessingRecord",
    "BatchRecord",
    "RecordManager"
]
