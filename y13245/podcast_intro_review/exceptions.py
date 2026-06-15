"""异常定义"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


class PodcastReviewError(Exception):
    """复核工具基类异常"""
    pass


@dataclass
class RowIssue:
    """行级问题记录"""
    row_number: int
    issue_type: str
    message: str
    raw_data: str
    suggestion: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "row_number": self.row_number,
            "issue_type": self.issue_type,
            "message": self.message,
            "raw_data": self.raw_data,
            "suggestion": self.suggestion,
        }


class OldMasterDetected(PodcastReviewError):
    """检测到旧版母带，需要人工挂起确认"""

    def __init__(self, track_title: str, detected_version: str, expected_version: str, evidence: list[str]):
        self.track_title = track_title
        self.detected_version = detected_version
        self.expected_version = expected_version
        self.evidence = evidence
        msg = (
            f"检测到旧版母带混入：《{track_title}》\n"
            f"  检测到版本: {detected_version}\n"
            f"  期望版本: {expected_version}\n"
            f"  证据链: {'; '.join(evidence)}\n"
            f"  已挂起，请接手同事确认后补充排练/授权备注再重扫"
        )
        super().__init__(msg)


class UnresolvedIssuesRemain(PodcastReviewError):
    """仍有未解决问题，退出码非零"""

    def __init__(self, pending_count: int, suspended_count: int):
        self.pending_count = pending_count
        self.suspended_count = suspended_count
        msg = (
            f"复核未完成：{pending_count} 项待补证据，{suspended_count} 项挂起待确认\n"
            f"请补充材料后重扫：python -m podcast_intro_review <曲目表.csv>"
        )
        super().__init__(msg)
