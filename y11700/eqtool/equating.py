from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from statistics import mean, stdev
from math import sqrt

from .models import Session, EquatingResult, StudentScore


def equate_mean_sigma(
    session: Session, ref_form: str, target_form: str,
) -> Optional[EquatingResult]:
    ref = session.test_forms.get(ref_form)
    tgt = session.test_forms.get(target_form)
    if not ref or not tgt:
        return None
    ref_scores = session.student_scores.get(ref_form, [])
    tgt_scores = session.student_scores.get(target_form, [])
    ref_valid = [s for s in ref_scores if s.is_valid]
    tgt_valid = [s for s in tgt_scores if s.is_valid]
    if not ref_valid or not tgt_valid:
        return None
    ref_raw = [s.raw_score for s in ref_valid]
    tgt_raw = [s.raw_score for s in tgt_valid]
    ref_mean = mean(ref_raw)
    ref_sd = stdev(ref_raw) if len(ref_raw) > 1 else 1.0
    tgt_mean = mean(tgt_raw)
    tgt_sd = stdev(tgt_raw) if len(tgt_raw) > 1 else 1.0
    slope = tgt_sd / ref_sd if ref_sd > 0 else 1.0
    intercept = tgt_mean - slope * ref_mean
    se = _standard_error(ref_raw, tgt_raw, slope, intercept)
    return EquatingResult(
        reference_form=ref_form,
        target_form=target_form,
        method="mean_sigma",
        slope=slope,
        intercept=intercept,
        standard_error=se,
        anchor_count=len(ref.anchor_items),
        sample_size_ref=len(ref_valid),
        sample_size_tgt=len(tgt_valid),
    )


def equate_linear(
    session: Session, ref_form: str, target_form: str,
) -> Optional[EquatingResult]:
    ref_scores = session.student_scores.get(ref_form, [])
    tgt_scores = session.student_scores.get(target_form, [])
    ref_valid = [s for s in ref_scores if s.is_valid]
    tgt_valid = [s for s in tgt_scores if s.is_valid]
    if not ref_valid or not tgt_valid:
        return None
    ref_raw = [s.raw_score for s in ref_valid]
    tgt_raw = [s.raw_score for s in tgt_valid]
    ref_mean = mean(ref_raw)
    tgt_mean = mean(tgt_raw)
    ref_sd = stdev(ref_raw) if len(ref_raw) > 1 else 1.0
    tgt_sd = stdev(tgt_raw) if len(tgt_raw) > 1 else 1.0
    slope = tgt_sd / ref_sd if ref_sd > 0 else 1.0
    intercept = tgt_mean - slope * ref_mean
    se = _standard_error(ref_raw, tgt_raw, slope, intercept)
    return EquatingResult(
        reference_form=ref_form,
        target_form=target_form,
        method="linear",
        slope=slope,
        intercept=intercept,
        standard_error=se,
        anchor_count=len(session.test_forms.get(ref_form, type('obj', (object,), {'anchor_items': []})()).anchor_items or []),
        sample_size_ref=len(ref_valid),
        sample_size_tgt=len(tgt_valid),
    )


def equate_anchor_mean_sigma(
    session: Session, ref_form: str, target_form: str,
) -> Optional[EquatingResult]:
    ref = session.test_forms.get(ref_form)
    tgt = session.test_forms.get(target_form)
    if not ref or not tgt:
        return None
    ref_anchors = {
        a.item_id: a for a in session.anchor_items.values()
        if a.test_form == ref_form and a.is_anchor
    }
    tgt_anchors = {
        a.item_id: a for a in session.anchor_items.values()
        if a.test_form == target_form and a.is_anchor
    }
    common_ids = set(ref_anchors.keys()) & set(tgt_anchors.keys())
    ref_scores = session.student_scores.get(ref_form, [])
    tgt_scores = session.student_scores.get(target_form, [])
    ref_valid = [s for s in ref_scores if s.is_valid]
    tgt_valid = [s for s in tgt_scores if s.is_valid]
    if not ref_valid or not tgt_valid:
        return None
    ref_anchor_scores = [s.anchor_score for s in ref_valid if s.anchor_score is not None]
    tgt_anchor_scores = [s.anchor_score for s in tgt_valid if s.anchor_score is not None]
    if ref_anchor_scores and tgt_anchor_scores and len(ref_anchor_scores) >= 5 and len(tgt_anchor_scores) >= 5:
        ref_am = mean(ref_anchor_scores)
        tgt_am = mean(tgt_anchor_scores)
        ref_asd = stdev(ref_anchor_scores) if len(ref_anchor_scores) > 1 else 1.0
        tgt_asd = stdev(tgt_anchor_scores) if len(tgt_anchor_scores) > 1 else 1.0
        if ref_asd > 0 and tgt_asd > 0:
            slope = tgt_asd / ref_asd
            intercept = tgt_am - slope * ref_am
            se = _standard_error(ref_anchor_scores, tgt_anchor_scores, slope, intercept)
            return EquatingResult(
                reference_form=ref_form,
                target_form=target_form,
                method="anchor_mean_sigma",
                slope=slope,
                intercept=intercept,
                standard_error=se,
                anchor_count=len(common_ids),
                anchor_r=_safe_corr(ref_anchor_scores, tgt_anchor_scores),
                sample_size_ref=len(ref_valid),
                sample_size_tgt=len(tgt_valid),
            )
    return _fallback_equate(session, ref_form, target_form, ref, tgt)


def equate_irt_true_score(
    session: Session, ref_form: str, target_form: str,
) -> Optional[EquatingResult]:
    ref_scores = session.student_scores.get(ref_form, [])
    tgt_scores = session.student_scores.get(target_form, [])
    ref_valid = [s for s in ref_scores if s.is_valid]
    tgt_valid = [s for s in tgt_scores if s.is_valid]
    if not ref_valid or not tgt_valid:
        return None
    ref_theta = [s.ability_estimate for s in ref_valid]
    tgt_theta = [s.ability_estimate for s in tgt_valid]
    if len(ref_theta) < 2 or len(tgt_theta) < 2:
        return None
    ref_m = mean(ref_theta)
    tgt_m = mean(tgt_theta)
    ref_sd = stdev(ref_theta)
    tgt_sd = stdev(tgt_theta)
    slope = tgt_sd / ref_sd if ref_sd > 0 else 1.0
    intercept = tgt_m - slope * ref_m
    ref_raw = [s.raw_score for s in ref_valid]
    tgt_raw = [s.raw_score for s in tgt_valid]
    se = _standard_error(ref_raw, tgt_raw, slope, intercept)
    return EquatingResult(
        reference_form=ref_form,
        target_form=target_form,
        method="irt_true_score",
        slope=slope,
        intercept=intercept,
        standard_error=se,
        sample_size_ref=len(ref_valid),
        sample_size_tgt=len(tgt_valid),
    )


def _fallback_equate(
    session: Session, ref_form: str, target_form: str, ref, tgt,
) -> Optional[EquatingResult]:
    ref_scores = session.student_scores.get(ref_form, [])
    tgt_scores = session.student_scores.get(target_form, [])
    ref_valid = [s for s in ref_scores if s.is_valid]
    tgt_valid = [s for s in tgt_scores if s.is_valid]
    if not ref_valid or not tgt_valid:
        return None
    ref_raw = [s.raw_score for s in ref_valid]
    tgt_raw = [s.raw_score for s in tgt_valid]
    ref_mean = mean(ref_raw)
    tgt_mean = mean(tgt_raw)
    ref_sd = stdev(ref_raw) if len(ref_raw) > 1 else 1.0
    tgt_sd = stdev(tgt_raw) if len(tgt_raw) > 1 else 1.0
    slope = tgt_sd / ref_sd if ref_sd > 0 else 1.0
    intercept = tgt_mean - slope * ref_mean
    se = _standard_error(ref_raw, tgt_raw, slope, intercept)
    return EquatingResult(
        reference_form=ref_form,
        target_form=target_form,
        method="mean_sigma_fallback",
        slope=slope,
        intercept=intercept,
        standard_error=se,
        sample_size_ref=len(ref_valid),
        sample_size_tgt=len(tgt_valid),
    )


def _standard_error(x: List[float], y: List[float], slope: float, intercept: float) -> float:
    if len(x) < 3 or len(y) < 3:
        return 0.0
    n = min(len(x), len(y))
    residuals = []
    for i in range(n):
        predicted = slope * x[i] + intercept
        residuals.append((y[i] - predicted) ** 2)
    if not residuals:
        return 0.0
    return sqrt(sum(residuals) / (n - 2))


def _safe_corr(x: List[float], y: List[float]) -> float:
    if len(x) < 3 or len(y) < 3:
        return 0.0
    try:
        n = min(len(x), len(y))
        xm = mean(x[:n])
        ym = mean(y[:n])
        num = sum((x[i] - xm) * (y[i] - ym) for i in range(n))
        den_x = sqrt(sum((v - xm) ** 2 for v in x[:n]))
        den_y = sqrt(sum((v - ym) ** 2 for v in y[:n]))
        if den_x < 1e-10 or den_y < 1e-10:
            return 0.0
        return num / (den_x * den_y)
    except Exception:
        return 0.0


def equate_all(
    session: Session, method: str = "auto",
) -> Session:
    form_ids = list(session.test_forms.keys())
    if len(form_ids) < 2:
        return session
    ref_form = form_ids[0]
    methods_map = {
        "mean_sigma": equate_mean_sigma,
        "linear": equate_linear,
        "anchor_mean_sigma": equate_anchor_mean_sigma,
        "irt_true_score": equate_irt_true_score,
    }
    if method == "auto":
        chosen = equate_anchor_mean_sigma
    else:
        chosen = methods_map.get(method, equate_anchor_mean_sigma)
    for target_form in form_ids[1:]:
        key = f"{ref_form}->{target_form}"
        result = chosen(session, ref_form, target_form)
        if result:
            session.equating_results[key] = result
    return session


def apply_equating(
    session: Session,
) -> Session:
    for key, eq in session.equating_results.items():
        ref_form, target_form = key.split("->")
        if target_form in session.student_scores:
            for s in session.student_scores[target_form]:
                if s.is_valid:
                    s.equated_score = eq.transform(s.raw_score)
    ref_form = list(session.test_forms.keys())[0] if session.test_forms else ""
    if ref_form and ref_form in session.student_scores:
        for s in session.student_scores[ref_form]:
            if s.is_valid and s.equated_score == 0.0:
                s.equated_score = s.raw_score
    return session


def build_conversion_table(
    eq: EquatingResult, score_range: Tuple[int, int] = (0, 100), step: int = 1,
) -> Dict[float, float]:
    table = {}
    for raw in range(score_range[0], score_range[1] + 1, step):
        table[float(raw)] = eq.transform(float(raw))
    return table