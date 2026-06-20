"""
训练日志解析器
Training Log Parser

关键设计：
- 永不丢弃原始行：解析到的字段是附加属性，原始文本始终保留
- 坏数据单独标记，不抛出异常中断流程
- 每一行都附带处理记录，便于小许审计
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import uuid
from datetime import datetime
from typing import Callable, Dict, List, Optional, Tuple

from .models import (
    LogSeverity,
    ProcessingRecord,
    ProcessingStage,
    TrainingLogEntry,
)


class LogParser:
    """
    训练日志解析器

    支持格式：
    - 标准时间戳日志: [2024-01-15 10:23:45] [INFO] [quantize] kl_div=0.0312 ...
    - 纯KV行: sample_id=abc123, loss=1.234
    - JSON行: {"timestamp": "...", "loss": 0.01}
    - 乱材料也能吞：识别不出来的字段扔到parse_errors，但保留raw_text
    """

    TIMESTAMP_PATTERNS = [
        re.compile(r"\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]"),
        re.compile(r"^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})"),
    ]

    SEVERITY_PATTERN = re.compile(r"\[(DEBUG|INFO|WARNING|WARN|ERROR|FATAL)\]")
    STAGE_PATTERN = re.compile(r"\[(forward|backward|quantize|prune|distill|calibrate|evaluate|compress|replay)\]", re.IGNORECASE)
    KV_PATTERN = re.compile(
        r"(\w+)\s*[=:]\s*("
        r"\[[^\]]*\]"                       # [a, b, c] 列表
        r"|\([^)]*\)"                       # (a, b, c) 元组
        r"|\"[^\"]*\"|'[^']*'"              # 字符串
        r"|[\d.eE+\-]+"                     # 数字
        r"|\w+"                             # 裸标识符
        r")"
    )

    BAD_DATA_HEURISTICS = [
        (lambda line: len(line.strip()) == 0, "空行"),
        (lambda line: line.count("NULL") > 3 or line.count("null") > 3, "过多NULL值"),
        (lambda line: "Traceback" in line or "Exception" in line, "Python异常栈帧"),
        (lambda line: re.match(r"^[=_\-\*\s]+$", line) is not None, "纯分隔符行"),
        (lambda line: line.count("\x00") > 0, "含NUL字节"),
    ]

    def __init__(self) -> None:
        self.custom_patterns: List[Tuple[re.Pattern, str]] = []
        self._records: List[ProcessingRecord] = []

    def add_custom_pattern(self, pattern: str, field_name: str) -> None:
        """添加自定义正则提取规则"""
        self.custom_patterns.append((re.compile(pattern), field_name))

    def _make_record(self, stage: ProcessingStage, action: str,
                     inputs: Dict, outputs: Dict,
                     log_refs: List[str], notes: List[str]) -> ProcessingRecord:
        rec = ProcessingRecord(
            record_id=f"LOG-{uuid.uuid4().hex[:12]}",
            stage=stage,
            action=action,
            inputs=inputs,
            outputs=outputs,
            log_refs=log_refs,
            operator="LogParser",
            notes=notes,
        )
        self._records.append(rec)
        return rec

    def _check_bad_data(self, raw_line: str) -> Optional[str]:
        """运行坏数据启发式检测，返回原因或None"""
        for check_fn, reason in self.BAD_DATA_HEURISTICS:
            try:
                if check_fn(raw_line):
                    return reason
            except Exception:
                continue
        return None

    def _parse_timestamp(self, line: str) -> Optional[datetime]:
        for pat in self.TIMESTAMP_PATTERNS:
            m = pat.search(line)
            if m:
                ts_str = m.group(1)
                for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S",
                            "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
                    try:
                        return datetime.strptime(ts_str, fmt)
                    except ValueError:
                        continue
        return None

    def _parse_severity(self, line: str) -> LogSeverity:
        m = self.SEVERITY_PATTERN.search(line)
        if not m:
            return LogSeverity.INFO
        sev = m.group(1).upper()
        if sev == "WARN":
            sev = "WARNING"
        return LogSeverity(sev)

    def _parse_stage(self, line: str) -> Optional[str]:
        m = self.STAGE_PATTERN.search(line)
        if m:
            return m.group(1).lower()
        return None

    def _parse_kv(self, line: str, fields: Dict) -> List[str]:
        """解析KV对，返回警告信息"""
        warnings = []
        for m in self.KV_PATTERN.finditer(line):
            key = m.group(1)
            raw_val = m.group(2).strip()
            if raw_val.startswith(('"', "'")) and raw_val.endswith(raw_val[0]):
                fields[key] = raw_val[1:-1]
                continue
            if (raw_val.startswith("[") and raw_val.endswith("]")) or \
               (raw_val.startswith("(") and raw_val.endswith(")")):
                inner = raw_val[1:-1].strip()
                if not inner:
                    fields[key] = []
                    continue
                parts = [p.strip() for p in inner.split(",") if p.strip()]
                parsed_list = []
                all_numeric = True
                for p in parts:
                    try:
                        if "." in p or "e" in p.lower():
                            parsed_list.append(float(p))
                        else:
                            parsed_list.append(int(p))
                    except ValueError:
                        parsed_list.append(p)
                        all_numeric = False
                fields[key] = parsed_list
                if not all_numeric:
                    warnings.append(f"字段{key}列表含非数值项")
                continue
            try:
                if "." in raw_val or "e" in raw_val.lower():
                    fields[key] = float(raw_val)
                else:
                    fields[key] = int(raw_val)
            except ValueError:
                if raw_val.lower() == "true":
                    fields[key] = True
                elif raw_val.lower() == "false":
                    fields[key] = False
                elif raw_val.lower() in ("nan", "inf", "-inf"):
                    fields[key] = raw_val.lower()
                    warnings.append(f"字段{key}为非数值{raw_val}，可疑")
                else:
                    fields[key] = raw_val
        return warnings

    def _parse_json(self, line: str, fields: Dict) -> bool:
        """尝试JSON解析"""
        stripped = line.strip()
        if not stripped.startswith("{"):
            return False
        try:
            obj = json.loads(stripped)
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, (str, int, float, bool)) or v is None:
                        fields[k] = v
                return True
        except (json.JSONDecodeError, ValueError):
            pass
        return False

    def parse_line(self, raw_line: str, line_number: int) -> TrainingLogEntry:
        """
        解析单行日志

        永不抛异常：坏数据标记为is_corrupt，但保留raw_text和line_number。
        """
        entry = TrainingLogEntry(
            line_number=line_number,
            raw_text=raw_line.rstrip("\n"),
        )

        corrupt_reason = self._check_bad_data(raw_line)
        if corrupt_reason:
            entry.is_corrupt = True
            entry.corrupt_reason = corrupt_reason
            entry.parse_errors.append(f"坏数据: {corrupt_reason}")
            self._make_record(
                ProcessingStage.BAD_DATA_FILTER,
                "标记坏数据行",
                {"line_number": line_number, "reason": corrupt_reason},
                {"is_corrupt": True},
                [entry.as_reference()],
                [f"原始内容前80字: {raw_line[:80]}"],
            )
            return entry

        entry.timestamp = self._parse_timestamp(raw_line)
        entry.severity = self._parse_severity(raw_line)
        entry.stage = self._parse_stage(raw_line)

        extracted: Dict[str, object] = {}
        json_ok = self._parse_json(raw_line, extracted)
        if not json_ok:
            warnings = self._parse_kv(raw_line, extracted)
            entry.parse_errors.extend(warnings)

        for pat, field_name in self.custom_patterns:
            m = pat.search(raw_line)
            if m:
                extracted[field_name] = m.group(1) if m.lastindex else m.group(0)

        entry.extracted_fields = extracted

        if not extracted and entry.stage is None and entry.timestamp is None:
            entry.parse_errors.append("未能从该行提取任何结构化字段，仅保留原始文本")

        if extracted:
            self._make_record(
                ProcessingStage.LOG_IMPORT,
                "解析日志字段",
                {"line_number": line_number},
                {"extracted_keys": list(extracted.keys())},
                [entry.as_reference()],
                [],
            )

        return entry

    def parse_file(self, file_path: str, alias_hint: Optional[str] = None) -> List[TrainingLogEntry]:
        """
        解析整个日志文件

        alias_hint: 可选的版本别名，便于追溯
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"日志文件不存在: {file_path}")

        entries: List[TrainingLogEntry] = []
        file_hash = self._file_hash(file_path)

        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for lineno, raw in enumerate(f, start=1):
                entry = self.parse_line(raw, lineno)
                entries.append(entry)

        notes = [f"文件哈希SHA256={file_hash[:16]}"]
        if alias_hint:
            notes.append(f"版本别名={alias_hint}")

        self._make_record(
            ProcessingStage.LOG_IMPORT,
            "导入日志文件",
            {"file_path": file_path, "file_hash": file_hash, "total_lines": len(entries)},
            {"parsed_entries": len([e for e in entries if not e.is_corrupt]),
             "corrupt_entries": len([e for e in entries if e.is_corrupt])},
            [],
            notes,
        )
        return entries

    @staticmethod
    def _file_hash(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 16), b""):
                h.update(chunk)
        return h.hexdigest()

    def drain_records(self) -> List[ProcessingRecord]:
        """取出并清空处理记录（用于注入Pipeline）"""
        recs = self._records
        self._records = []
        return recs

    def peek_records(self) -> List[ProcessingRecord]:
        return list(self._records)
