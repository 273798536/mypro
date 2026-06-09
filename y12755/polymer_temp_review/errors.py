from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ReviewError(Exception):
    """
    可操作的复盘错误基类。
    message 给用户可读信息，action 告诉用户下一步该做什么。
    """
    message: str
    action: Optional[str] = None
    details: List[str] = None

    def __post_init__(self):
        if self.details is None:
            self.details = []
        super().__init__(self.message)

    def pretty(self) -> str:
        lines = [f"错误: {self.message}"]
        if self.action:
            lines.append(f"下一步操作: {self.action}")
        for d in self.details:
            lines.append(f"  - {d}")
        return "\n".join(lines)


class MissingInputError(ReviewError):
    """输入目录或关键文件缺失."""
    pass


class DataValidationError(ReviewError):
    """数据格式/内容校验失败."""
    pass


class ConversionError(ReviewError):
    """浓度/单位换算失败."""
    pass


def format_missing_files(actions: List[str]) -> str:
    """
    将一批可操作提示格式化为 CLI 友好的多行文本。
    示例:
      缺少以下输入文件，请补充后重试:
        - 缺少称量单 W-20240610-003：请在 weighing_records/ 下补充 W-20240610-003.json
    """
    if not actions:
        return ""
    header = "缺少以下输入，请补充后重试:"
    body = "\n".join(f"  - {a}" for a in actions)
    return f"{header}\n{body}"
