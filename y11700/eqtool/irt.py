from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from math import exp, log, sqrt
from statistics import mean, stdev

from .models import Session, StudentScore, AnchorItem, DifficultyParam


def _logistic(x: float) -> float:
    if x > 30:
        return 1.0
    if x < -30:
        return 0.0
    return 1.0 / (1.0 + exp(-x))


def _rasch_probability(theta: float, b: float) -> float:
    return _logistic(theta - b)


def _estimate_ability_rasch(
    raw_score: float, total_items: int,
    anchor_b: List[float], anchor_scores: List[float],
    max_iter: int = 50, tol: float = 1e-4,
) -> float:
    if total_items <= 0:
        return 0.0
    p = min(max(raw_score / total_items, 0.001), 0.999)
    theta = log(p / (1 - p))
    if anchor_b and anchor_scores:
        anchor_mean = mean(anchor_b) if anchor_b else 0.0
        anchor_score_mean = mean(anchor_scores) if anchor_scores else 0.5
        theta = anchor_score_mean - anchor_mean
        for _ in range(max_iter):
            expected = sum(_rasch_probability(theta, b) for b in anchor_b)
            observed = sum(anchor_scores)
            if abs(expected - observed) < tol:
                break
            info = sum(_rasch_probability(theta, b) * (1 - _rasch_probability(theta, b)) for b in anchor_b)
            if info < 1e-8:
                break
            theta += (observed - expected) / info
            theta = max(-6.0, min(6.0, theta))
    return theta


def _estimate_ability_jml(
    raw_score: float, total_items: float,
    difficulties: List[float], discriminations: List[float],
) -> float:
    if total_items <= 0:
        return 0.0
    p = min(max(raw_score / total_items, 0.001), 0.999)
    theta = log(p / (1 - p))
    return max(-4.0, min(4.0, theta))


def estimate_abilities_simple(
    session: Session,
) -> Session:
    for fid, scores in session.student_scores.items():
        form = session.test_forms.get(fid)
        if not form:
            continue
        form_anchors = [
            a for a in session.anchor_items.values()
            if a.test_form == fid and a.is_anchor
        ]
        anchor_b = [a.difficulty for a in form_anchors]
        anchor_a = [a.discrimination for a in form_anchors]
        diff_params = [
            p for p in session.difficulty_params.values()
            if p.test_form == fid
        ]
        all_b = anchor_b + [p.b_parameter for p in diff_params]
        all_a = anchor_a + [p.a_parameter for p in diff_params]
        for s in scores:
            if not s.is_valid:
                continue
            anchor_scores_list: List[float] = []
            if s.anchor_score is not None and form_anchors:
                per_anchor = s.anchor_score / max(len(form_anchors), 1)
                anchor_scores_list = [per_anchor] * len(form_anchors)
            if anchor_b and anchor_scores_list:
                s.ability_estimate = _estimate_ability_rasch(
                    s.raw_score, form.total_items or s.total_possible,
                    anchor_b, anchor_scores_list,
                )
            elif all_b:
                s.ability_estimate = _estimate_ability_jml(
                    s.raw_score, form.total_items or s.total_possible,
                    all_b, all_a,
                )
            else:
                if s.total_possible > 0:
                    p = s.raw_score / s.total_possible
                    p = min(max(p, 0.001), 0.999)
                    s.ability_estimate = log(p / (1 - p))
    return session


def estimate_abilities_two_step(
    session: Session,
) -> Session:
    session = estimate_abilities_simple(session)
    for fid, scores in session.student_scores.items():
        valid_thetas = [s.ability_estimate for s in scores if s.is_valid and abs(s.ability_estimate) > 1e-6]
        if len(valid_thetas) < 10:
            continue
        m = mean(valid_thetas)
        s_dev = stdev(valid_thetas) if stdev(valid_thetas) > 0 else 1.0
        for s in scores:
            if not s.is_valid:
                continue
            s.ability_estimate = (s.ability_estimate - m) / s_dev
    return session


def compute_form_statistics(
    session: Session,
) -> Session:
    for fid, form in session.test_forms.items():
        scores = session.student_scores.get(fid, [])
        valid = [s for s in scores if s.is_valid]
        if not valid:
            continue
        raw_values = [s.raw_score for s in valid]
        form.raw_mean = mean(raw_values)
        form.raw_sd = stdev(raw_values) if len(raw_values) > 1 else 1.0
        form.sample_size = len(valid)
        anchor_objs = [a for a in session.anchor_items.values() if a.test_form == fid and a.is_anchor]
        if anchor_objs:
            diffs = [a.difficulty for a in anchor_objs]
            form.difficulty_mean = mean(diffs)
            form.difficulty_sd = stdev(diffs) if len(diffs) > 1 else 1.0
    return session