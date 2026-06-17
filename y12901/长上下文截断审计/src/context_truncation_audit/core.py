from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
import re


class TruncationReason(Enum):
    TOKEN_LIMIT = "token超限"
    CONTEXT_WINDOW = "上下文窗口不足"
    TOOL_CALL_ERROR = "工具调用参数错误"
    MANUAL_TRUNCATION = "人工截断标记"
    INCOMPLETE_INPUT = "输入本身不完整"
    FIELD_MISSING = "关键字段缺失"
    UNIT_AMBIGUOUS = "单位不明确"
    NOT_TRUNCATED = "未截断"
    UNKNOWN = "未知原因"

    @classmethod
    def from_code(cls, code: str) -> "TruncationReason":
        mapping = {
            "token_limit": cls.TOKEN_LIMIT,
            "context_window": cls.CONTEXT_WINDOW,
            "tool_call_error": cls.TOOL_CALL_ERROR,
            "manual": cls.MANUAL_TRUNCATION,
            "incomplete": cls.INCOMPLETE_INPUT,
            "field_missing": cls.FIELD_MISSING,
            "unit_ambiguous": cls.UNIT_AMBIGUOUS,
            "not_truncated": cls.NOT_TRUNCATED,
        }
        return mapping.get(code.lower(), cls.UNKNOWN)

    @classmethod
    def from_manual_judgment(cls, judgment: str, is_truncated: bool) -> "TruncationReason":
        if not is_truncated:
            return cls.NOT_TRUNCATED
        text = judgment or ""
        if "工具调用" in text or "参数" in text:
            return cls.TOOL_CALL_ERROR
        if "不完整" in text:
            return cls.INCOMPLETE_INPUT
        if "字段" in text and "缺" in text:
            return cls.FIELD_MISSING
        if "单位" in text:
            return cls.UNIT_AMBIGUOUS
        if "token" in text.lower() or "超限" in text:
            return cls.TOKEN_LIMIT
        if "上下文" in text or "窗口" in text:
            return cls.CONTEXT_WINDOW
        if "人工" in text or "截断" in text:
            return cls.MANUAL_TRUNCATION
        return cls.UNKNOWN


@dataclass
class AuditResult:
    record_id: str
    original_text: str
    truncated_text: Optional[str] = None
    is_truncated: bool = False
    reason: TruncationReason = TruncationReason.UNKNOWN
    reason_detail: str = ""
    token_count: int = 0
    char_count: int = 0
    truncation_position: Optional[int] = None
    severity: str = "medium"
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: str = ""
    manual_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "记录编号": self.record_id,
            "是否截断": "是" if self.is_truncated else "否",
            "截断原因": self.reason.value,
            "原因说明": self.reason_detail,
            "原始长度(字符)": self.char_count,
            "Token数量": self.token_count,
            "截断位置": self.truncation_position if self.truncation_position else "无",
            "严重程度": self._get_severity_label(),
            "数据来源": self.source,
            "人工备注": self.manual_note,
            "原始内容预览": self._truncate_preview(self.original_text, 100),
            "截断后内容预览": self._truncate_preview(self.truncated_text, 100) if self.truncated_text else "",
        }

    def _get_severity_label(self) -> str:
        mapping = {
            "high": "高（影响使用）",
            "medium": "中（部分影响）",
            "low": "低（轻微影响）",
        }
        return mapping.get(self.severity, "中")

    @staticmethod
    def _truncate_preview(text: Optional[str], max_len: int) -> str:
        if not text:
            return ""
        if len(text) <= max_len:
            return text
        return text[:max_len] + "..."


class TruncationAuditor:
    def __init__(
        self,
        max_tokens: int = 4096,
        context_window: int = 8192,
        encoding_name: str = "cl100k_base",
    ):
        self.max_tokens = max_tokens
        self.context_window = context_window
        self.encoding_name = encoding_name
        self._tokenizer = None

    def _get_tokenizer(self):
        if self._tokenizer is None:
            try:
                import tiktoken
                self._tokenizer = tiktoken.get_encoding(self.encoding_name)
            except ImportError:
                self._tokenizer = None
        return self._tokenizer

    def count_tokens(self, text: str) -> int:
        tokenizer = self._get_tokenizer()
        if tokenizer:
            return len(tokenizer.encode(text))
        return len(text) // 4

    def audit_record(
        self,
        record_id: str,
        original_text: str,
        truncated_text: Optional[str] = None,
        source: str = "",
        manual_note: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditResult:
        result = AuditResult(
            record_id=record_id,
            original_text=original_text,
            truncated_text=truncated_text,
            source=source,
            manual_note=manual_note,
            metadata=metadata or {},
            char_count=len(original_text),
            token_count=self.count_tokens(original_text),
        )

        result.is_truncated, result.reason, result.reason_detail, result.severity = (
            self._analyze_truncation(original_text, truncated_text, manual_note, metadata or {})
        )

        if result.is_truncated and truncated_text:
            result.truncation_position = len(truncated_text)
        elif result.is_truncated:
            result.truncation_position = self._estimate_truncation_position(original_text)

        return result

    def _analyze_truncation(
        self,
        original_text: str,
        truncated_text: Optional[str],
        manual_note: str,
        metadata: Dict[str, Any],
    ) -> tuple[bool, TruncationReason, str, str]:
        if not original_text or not original_text.strip():
            return True, TruncationReason.INCOMPLETE_INPUT, "输入内容为空或只有空白字符", "high"

        if manual_note and self._has_manual_truncation_marker(manual_note):
            return True, TruncationReason.MANUAL_TRUNCATION, f"人工备注标注：{manual_note[:50]}", "medium"

        if metadata.get("tool_call_error"):
            error_msg = metadata.get("tool_call_error_detail", "参数格式错误")
            return True, TruncationReason.TOOL_CALL_ERROR, f"工具调用参数错误：{error_msg}", "high"

        if truncated_text and len(truncated_text) < len(original_text) * 0.9:
            token_count = self.count_tokens(original_text)
            if token_count > self.max_tokens:
                return (
                    True,
                    TruncationReason.TOKEN_LIMIT,
                    f"Token数量({token_count})超过限制({self.max_tokens})，超出约{((token_count - self.max_tokens) / self.max_tokens * 100):.1f}%",
                    "high" if token_count > self.max_tokens * 1.5 else "medium",
                )

        token_count = self.count_tokens(original_text)
        if token_count > self.context_window * 0.9:
            return (
                True,
                TruncationReason.CONTEXT_WINDOW,
                f"Token数量({token_count})接近上下文窗口上限({self.context_window})，可能被截断",
                "high" if token_count > self.context_window else "medium",
            )

        if truncated_text and truncated_text != original_text:
            if self._is_sudden_cut(truncated_text):
                return True, TruncationReason.UNKNOWN, "文本在非自然结束处被截断，原因待确认", "medium"

        if self._check_field_missing(original_text, metadata):
            return True, TruncationReason.FIELD_MISSING, "检测到关键字段缺失或未填写", "medium"

        if self._check_unit_ambiguous(original_text):
            return False, TruncationReason.UNIT_AMBIGUOUS, "文本中存在单位不明确的数值，可能影响理解", "low"

        return False, TruncationReason.NOT_TRUNCATED, "未检测到截断迹象", "low"

    def _has_manual_truncation_marker(self, note: str) -> bool:
        markers = ["截断", "省略", "未完", "待续", "部分", "节选", "摘抄", "截断了", "被截断"]
        return any(marker in note for marker in markers)

    def _is_sudden_cut(self, text: str) -> bool:
        if not text:
            return False
        end_chars = text.strip()[-10:] if len(text) > 10 else text.strip()
        natural_endings = ["。", "！", "？", ".", "!", "?", "”", "』", "」", "】", ">"]
        for ending in natural_endings:
            if end_chars.endswith(ending):
                return False
        if re.search(r"[\u4e00-\u9fa5a-zA-Z0-9]$", end_chars[-1] if end_chars else ""):
            return True
        return False

    def _check_field_missing(self, text: str, metadata: Dict[str, Any]) -> bool:
        required_fields = metadata.get("required_fields", [])
        if not required_fields:
            return False
        for field in required_fields:
            if field not in text:
                return True
        return False

    def _check_unit_ambiguous(self, text: str) -> bool:
        ambiguous_patterns = [
            r"\d+\s*(个|条|项|份|次)\s*[,，。]",
            r"约\s*\d+",
            r"\d+\s*左右",
        ]
        for pattern in ambiguous_patterns:
            if re.search(pattern, text):
                return True
        return False

    def _estimate_truncation_position(self, text: str) -> int:
        if self.count_tokens(text) > self.max_tokens:
            ratio = self.max_tokens / self.count_tokens(text)
            return int(len(text) * ratio)
        return len(text)

    def audit_batch(self, records: List[Dict[str, Any]]) -> List[AuditResult]:
        results = []
        for record in records:
            result = self.audit_record(
                record_id=record.get("id", record.get("记录编号", "未知")),
                original_text=record.get("original_text", record.get("原始内容", "")),
                truncated_text=record.get("truncated_text", record.get("截断内容")),
                source=record.get("source", record.get("来源", "")),
                manual_note=record.get("manual_note", record.get("人工备注", "")),
                metadata=record.get("metadata", {}),
            )
            results.append(result)
        return results

    def get_statistics(self, results: List[AuditResult]) -> Dict[str, Any]:
        total = len(results)
        truncated = [r for r in results if r.is_truncated]
        by_reason = {}
        for r in truncated:
            reason_label = r.reason.value
            by_reason[reason_label] = by_reason.get(reason_label, 0) + 1

        by_severity = {}
        for r in truncated:
            sev = r._get_severity_label()
            by_severity[sev] = by_severity.get(sev, 0) + 1

        return {
            "总记录数": total,
            "截断记录数": len(truncated),
            "截断率": f"{(len(truncated) / total * 100):.1f}%" if total > 0 else "0%",
            "按原因统计": by_reason,
            "按严重程度统计": by_severity,
            "平均Token数": int(sum(r.token_count for r in results) / total) if total > 0 else 0,
            "平均字符数": int(sum(r.char_count for r in results) / total) if total > 0 else 0,
        }
