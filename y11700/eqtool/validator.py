from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from statistics import mean, stdev

from .models import (
    Session, StudentScore, AnchorItem, AbsenceStatus,
    CorrectionRecord, CorrectionType,
)
from .warnings import WarningCollector, WarningCategory, WarningLevel


def _detect_outliers_iqr(values: List[float], factor: float = 3.0) -> Tuple[float, float]:
    if len(values) < 4:
        return float("-inf"), float("inf")
    sorted_v = sorted(values)
    n = len(sorted_v)
    q1 = sorted_v[n // 4]
    q3 = sorted_v[3 * n // 4]
    iqr = q3 - q1
    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    return lower, upper


def _detect_outliers_z(values: List[float], threshold: float = 3.0) -> Tuple[float, float]:
    if len(values) < 3:
        return float("-inf"), float("inf")
    m = mean(values)
    s = stdev(values) if stdev(values) > 0 else 1.0
    return m - threshold * s, m + threshold * s


def validate_anchor_coverage(
    session: Session, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    for fid, form in session.test_forms.items():
        if not form.anchor_items:
            warnings.add(
                WarningCategory.MISSING_ANCHOR, WarningLevel.CRITICAL,
                f"试卷[{fid}]未定义锚题列表，无法进行等值换算",
                {"test_form": fid},
            )
            continue
        form_anchors = {
            aid: a for aid, a in session.anchor_items.items()
            if a.test_form == fid and a.is_anchor
        }
        missing = [ai for ai in form.anchor_items if ai not in {a.item_id for a in form_anchors.values()}]
        if missing:
            warnings.add(
                WarningCategory.MISSING_ANCHOR, WarningLevel.CRITICAL,
                f"试卷[{fid}]锚题[{', '.join(missing)}]无参数记录，将无法参与等值",
                {"test_form": fid, "missing_anchors": missing},
            )
    return session


def validate_extreme_scores(
    session: Session, warnings: Optional[WarningCollector] = None,
    cap_percentile: float = 0.01,
) -> Session:
    warnings = warnings or WarningCollector()
    for fid, scores in session.student_scores.items():
        valid_scores = [s for s in scores if s.is_valid]
        if not valid_scores:
            continue
        raw_values = [s.raw_score for s in valid_scores]
        lower, upper = _detect_outliers_z(raw_values, threshold=3.0)
        for s in valid_scores:
            if s.raw_score < lower or s.raw_score > upper:
                corr = CorrectionRecord(
                    correction_type=CorrectionType.EXTREME_SCORE_CAPPED,
                    student_id=s.student_id,
                    test_form=fid,
                    original_value=str(s.raw_score),
                    corrected_value=str(max(lower, min(upper, s.raw_score))),
                    reason=f"原始分偏离均值超过3倍标准差，已截断",
                )
                s.corrections.append(corr)
                session.corrections.append(corr)
                s.raw_score = float(corr.corrected_value)
                warnings.add(
                    WarningCategory.EXTREME_SCORE, WarningLevel.WARNING,
                    f"学生[{s.student_id}]试卷[{fid}]原始分{s.raw_score}为极端值，已修正",
                    {"student_id": s.student_id, "test_form": fid, "original": corr.original_value, "corrected": corr.corrected_value},
                )
    return session


def validate_absence_marks(
    session: Session, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    for fid, marks in session.absence_marks.items():
        absent_map = {m.student_id: m for m in marks if m.status != AbsenceStatus.PRESENT}
        if fid not in session.student_scores:
            continue
        scores = session.student_scores[fid]
        for s in scores:
            if s.student_id in absent_map:
                mark = absent_map[s.student_id]
                if s.is_valid:
                    s.is_valid = False
                    s.exclusion_reason = f"缺考标记: {mark.reason or mark.status.value}"
                    corr = CorrectionRecord(
                        correction_type=CorrectionType.ABSENCE_EXCLUDED,
                        student_id=s.student_id,
                        test_form=fid,
                        original_value=str(s.raw_score),
                        corrected_value="已排除",
                        reason=f"缺考状态: {mark.status.value}",
                    )
                    s.corrections.append(corr)
                    session.corrections.append(corr)
                    warnings.add(
                        WarningCategory.ABSENCE_INCLUDED, WarningLevel.CRITICAL,
                        f"学生[{s.student_id}]试卷[{fid}]标记为[{mark.status.value}]，已排除出正常计算",
                        {"student_id": s.student_id, "test_form": fid, "status": mark.status.value, "reason": mark.reason},
                    )
    return session


def validate_anchor_scores(
    session: Session, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    for fid, scores in session.student_scores.items():
        for s in scores:
            if not s.is_valid:
                continue
            form = session.test_forms.get(fid)
            if form and form.anchor_items and s.anchor_score is None:
                warnings.add(
                    WarningCategory.MISSING_ANCHOR, WarningLevel.WARNING,
                    f"学生[{s.student_id}]试卷[{fid}]缺少锚题得分，将仅用原始分进行估计",
                    {"student_id": s.student_id, "test_form": fid},
                )
    return session


def validate_sample_sizes(
    session: Session, min_sample: int = 30,
    warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    for fid, form in session.test_forms.items():
        scores = session.student_scores.get(fid, [])
        valid_count = sum(1 for s in scores if s.is_valid)
        if valid_count < min_sample:
            warnings.add(
                WarningCategory.LOW_SAMPLE, WarningLevel.WARNING,
                f"试卷[{fid}]有效样本量({valid_count})低于最小要求({min_sample})，等值结果不稳定",
                {"test_form": fid, "valid_count": valid_count, "min_sample": min_sample},
            )
        form.sample_size = valid_count
    return session


def validate_anchor_parameters(
    session: Session, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    anchors_by_form: Dict[str, List[AnchorItem]] = {}
    for a in session.anchor_items.values():
        if a.is_anchor:
            anchors_by_form.setdefault(a.test_form, []).append(a)
    for fid, anchors in anchors_by_form.items():
        difficulties = [a.difficulty for a in anchors]
        if len(difficulties) >= 2:
            d_mean = mean(difficulties)
            d_sd = stdev(difficulties) if stdev(difficulties) > 0 else 1.0
            for a in anchors:
                z = (a.difficulty - d_mean) / d_sd
                if abs(z) > 3.0:
                    warnings.add(
                        WarningCategory.ANCHOR_MISMATCH, WarningLevel.WARNING,
                        f"锚题[{a.item_id}]试卷[{fid}]难度参数偏离均值超过3σ，可能影响等值精度",
                        {"item_id": a.item_id, "test_form": fid, "difficulty": a.difficulty, "z_score": round(z, 2)},
                    )
    return session


def validate_all(
    session: Session, min_sample: int = 30,
    warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    session.warnings.extend(warnings.all())
    session = validate_anchor_coverage(session, warnings)
    session = validate_extreme_scores(session, warnings)
    session = validate_absence_marks(session, warnings)
    session = validate_anchor_scores(session, warnings)
    session = validate_sample_sizes(session, min_sample, warnings)
    session = validate_anchor_parameters(session, warnings)
    session.warnings = [w.to_row() for w in warnings.all()]
    return session