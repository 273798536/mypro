from __future__ import annotations

from typing import Any

from .config import ReviewConfig
from .models import (
    DataRecord,
    LeakDetectionResult,
    ModelLogEntry,
    ReviewRecord,
    ReviewStatus,
    SafetyRule,
    ShuffleResult,
    ToolCallParams,
    generate_id,
)


class Reviewer:
    """统一复核器

    将以下内容放入同一轮复核，让训练组看出"这次处理的是眼前这批具体材料"：
    - 安全规则 + 违规项
    - 模型日志
    - 工具调用参数
    - 去重/混洗/泄漏摘要
    - 数据来源文件指纹（material_fingerprint）
    """

    def __init__(self, config: ReviewConfig | None = None):
        self.config = config or ReviewConfig()

    def create_review(
        self,
        batch_id: str,
        records: list[DataRecord],
        safety_rules: list[SafetyRule],
        safety_rule_violations: list[dict[str, Any]],
        model_logs: list[ModelLogEntry],
        tool_params: ToolCallParams,
        leak_result: LeakDetectionResult | None = None,
        dedup_summary: dict[str, Any] | None = None,
        shuffle_summary: dict[str, Any] | None = None,
        reviewer: str = "system",
        comment: str = "",
        status: ReviewStatus = ReviewStatus.PENDING,
    ) -> ReviewRecord:
        data_sources = sorted({r.source_file for r in records if r.source_file})

        review = ReviewRecord(
            review_id=generate_id("rev"),
            batch_id=batch_id,
            status=status,
            reviewer=reviewer,
            comment=comment,
            safety_rules=safety_rules if self.config.include_safety_rules else [],
            safety_rule_violations=safety_rule_violations,
            model_logs=model_logs if self.config.include_model_logs else [],
            tool_params=tool_params if self.config.include_tool_params else None,
            leak_result=leak_result,
            dedup_summary=dedup_summary or {},
            shuffle_summary=shuffle_summary or {},
            data_source_files=data_sources,
        )
        review.material_fingerprint = review.compute_fingerprint()
        return review

    def update_status(self, review: ReviewRecord, new_status: ReviewStatus,
                      comment: str, reviewer: str = "pm") -> ReviewRecord:
        """人工复核更新，保留原 material_fingerprint 作为审计锚点"""
        review.status = new_status
        review.reviewer = reviewer
        old_comment = review.comment
        if old_comment:
            review.comment = f"{old_comment}\n[{reviewer}] {comment}"
        else:
            review.comment = f"[{reviewer}] {comment}"
        # 指纹不变，保证训练组能对应到具体材料
        return review
