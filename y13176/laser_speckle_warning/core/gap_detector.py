from __future__ import annotations

import uuid
from typing import Optional

from .models import (
    ParamVersion,
    SamplingGap,
    SitePhoto,
    WarningLevel,
)


def _expected_positions(total: int) -> list[str]:
    return [f"位置{i + 1}" for i in range(total)]


def detect_sampling_gaps(
    photos: list[SitePhoto],
    params: ParamVersion,
    expected_sample_count: Optional[int] = None,
) -> tuple[list[SamplingGap], bool]:
    gaps: list[SamplingGap] = []
    should_pause = False

    if expected_sample_count is None:
        expected_sample_count = max(params.min_sample_count, len(photos))

    existing_positions = {p.position_label for p in photos}
    expected = _expected_positions(expected_sample_count)
    missing_positions = [p for p in expected if p not in existing_positions]

    flagged_gaps = [p for p in photos if p.has_sampling_gap]

    if missing_positions:
        missing_ratio = len(missing_positions) / max(expected_sample_count, 1)
        severity = (
            WarningLevel.DANGER if missing_ratio > 0.4
            else WarningLevel.WARNING if missing_ratio > 0.2
            else WarningLevel.CAUTION
        )
        gaps.append(SamplingGap(
            gap_id=f"GAP-{uuid.uuid4().hex[:8]}",
            reason=f"缺失 {len(missing_positions)} 个采样位置，缺口占比 {missing_ratio * 100:.1f}%",
            affected_range="、".join(missing_positions),
            missing_sample_count=len(missing_positions),
            missing_positions=missing_positions,
            severity=severity,
            suggested_action=f"请补充 {'、'.join(missing_positions)} 的现场照片后再复算",
        ))
        if missing_ratio > params.max_gap_ratio:
            should_pause = True

    if flagged_gaps:
        flagged_positions = [p.position_label for p in flagged_gaps]
        flagged_ratio = len(flagged_gaps) / max(len(photos), 1)
        severity = (
            WarningLevel.WARNING if flagged_ratio > 0.2
            else WarningLevel.CAUTION
        )
        gaps.append(SamplingGap(
            gap_id=f"GAP-{uuid.uuid4().hex[:8]}",
            reason=f"{len(flagged_gaps)} 张照片被标注为采样质量异常（{flagged_ratio * 100:.1f}%）",
            affected_range="、".join(flagged_positions),
            missing_sample_count=len(flagged_gaps),
            missing_positions=flagged_positions,
            severity=severity,
            suggested_action="请确认标注照片是否需要重拍或由人工判定是否纳入计算",
        ))
        if flagged_ratio > params.max_gap_ratio:
            should_pause = True

    valid_count = len(photos) - len(flagged_gaps)
    if valid_count < params.min_sample_count:
        gaps.append(SamplingGap(
            gap_id=f"GAP-{uuid.uuid4().hex[:8]}",
            reason=f"有效样本数 {valid_count} 低于参数要求的最小样本数 {params.min_sample_count}",
            affected_range="全部采样区域",
            missing_sample_count=params.min_sample_count - valid_count,
            missing_positions=[],
            severity=WarningLevel.WARNING,
            suggested_action=f"请至少补充 {params.min_sample_count - valid_count} 张有效采样照片",
        ))
        should_pause = True

    return gaps, should_pause
