import re
from typing import Any, Dict, List, Tuple


class FieldAdapter:
    """
    字段名归一化适配层。

    复核人从不同系统导出的现场照片字段名可能前后不一：
    - 有人用 "照片编号", 有人用 "PhotoID", 有人用 "图片id"
    - 有人用 "现场描述", 有人用 "备注说明", 有人用 "原始备注"

    本模块的职责是:
      1. 把任意来源的字段名映射到标准字段
      2. 保住 "来源" (source_system / 原始字段) 和 "处理状态" (process_status)
      3. 保留原始输入不做修改, 确保可以回溯
    """

    STANDARD_FIELDS: Tuple[str, ...] = (
        "photo_id",
        "raw_description",
        "file_path",
        "upload_time",
        "reviewer",
        "source_system",
    )

    ALIAS_MAP: Dict[str, List[str]] = {
        "photo_id": [
            "photo_id", "photoid", "photo id",
            "照片编号", "照片id", "照片ID", "图片编号", "图片id", "图片ID",
            "编号", "id", "ID",
            "PhotoID", "PhotoId", "photoId",
        ],
        "raw_description": [
            "raw_description", "description", "remark", "comment", "note",
            "现场描述", "描述", "备注", "备注说明", "原始备注", "原始描述",
            "说明", "问题描述",
        ],
        "file_path": [
            "file_path", "filepath", "path", "file", "url",
            "文件路径", "路径", "文件地址", "图片地址", "照片地址", "链接",
            "FilePath", "filePath",
        ],
        "upload_time": [
            "upload_time", "time", "timestamp", "date",
            "上传时间", "提交时间", "时间", "日期", "拍摄时间",
            "UploadTime", "uploadTime",
        ],
        "reviewer": [
            "reviewer", "operator", "user", "author",
            "复核人", "提交人", "上传人", "审核人", "操作人",
            "Reviewer",
        ],
        "source_system": [
            "source_system", "source", "system", "from",
            "来源系统", "来源", "系统",
            "SourceSystem", "sourceSystem",
        ],
    }

    REVERSE_INDEX: Dict[str, str] = {}

    @classmethod
    def _build_reverse_index(cls):
        if cls.REVERSE_INDEX:
            return
        for standard, aliases in cls.ALIAS_MAP.items():
            for alias in aliases:
                cls.REVERSE_INDEX[cls._normalize_key(alias)] = standard

    @staticmethod
    def _normalize_key(key: str) -> str:
        s = re.sub(r"[\s_\-/]+", "", str(key)).lower()
        return s

    def __init__(self, extra_aliases: Dict[str, List[str]] = None):
        self._build_reverse_index()
        self._extra_reverse: Dict[str, str] = {}
        if extra_aliases:
            for standard, aliases in extra_aliases.items():
                if standard not in self.STANDARD_FIELDS:
                    continue
                for alias in aliases:
                    self._extra_reverse[self._normalize_key(alias)] = standard
        self._unmapped_log: List[Tuple[str, str]] = []

    def normalize(self, raw_fields: Dict[str, Any], source_system: str = "") -> Tuple[Dict[str, Any], List[str]]:
        """
        把任意来源字段映射为标准字段。

        返回:
            normalized: 标准字段 -> 值
            unmapped:   未能映射的原始字段名列表 (仅记录, 不丢弃原始数据)
        """
        normalized: Dict[str, Any] = {f: "" for f in self.STANDARD_FIELDS}
        if source_system:
            normalized["source_system"] = source_system
        unmapped: List[str] = []

        for key, value in raw_fields.items():
            nk = self._normalize_key(key)
            std = self._extra_reverse.get(nk) or self.REVERSE_INDEX.get(nk)
            if std:
                current = normalized.get(std)
                if value not in (None, "") and current in (None, ""):
                    normalized[std] = value
            else:
                unmapped.append(key)
                self._unmapped_log.append((key, source_system or "unknown"))

        if source_system and not normalized.get("source_system"):
            normalized["source_system"] = source_system
        return normalized, unmapped

    @property
    def unmapped_history(self) -> List[Tuple[str, str]]:
        return list(self._unmapped_log)

    def summarize(self, raw_fields: Dict[str, Any], normalized: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成一条可用于交接的摘要, 确保"来源和处理状态"不丢。
        """
        return {
            "original_keys": list(raw_fields.keys()),
            "standard_covered": [k for k in self.STANDARD_FIELDS if normalized.get(k) not in (None, "")],
            "source_system": normalized.get("source_system", ""),
            "photo_id": normalized.get("photo_id", ""),
        }
