from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
from scipy import stats

from .models import VariantData

MONTE_CARLO_SAMPLES = 200000


@dataclass
class BetaPosterior:
    variant: str
    alpha: float
    beta: float
    sample_size: int
    conversions: int
    observed_rate: float
    prior_alpha: float
    prior_beta: float

    @property
    def mean(self) -> float:
        return self.alpha / (self.alpha + self.beta)

    @property
    def median(self) -> float:
        return stats.beta.median(self.alpha, self.beta)

    @property
    def std(self) -> float:
        return stats.beta.std(self.alpha, self.beta)

    def sample(self, n: int, rng: np.random.Generator) -> np.ndarray:
        return rng.beta(self.alpha, self.beta, size=n)


def compute_posterior(variant: VariantData) -> BetaPosterior:
    alpha = variant.prior_alpha + variant.conversions
    beta = variant.prior_beta + (variant.exposures - variant.conversions)
    return BetaPosterior(
        variant=variant.name,
        alpha=alpha,
        beta=beta,
        sample_size=variant.exposures,
        conversions=variant.conversions,
        observed_rate=variant.conversions / variant.exposures if variant.exposures > 0 else 0.0,
        prior_alpha=variant.prior_alpha,
        prior_beta=variant.prior_beta,
    )


def credible_interval(post: BetaPosterior, credible_mass: float = 0.95) -> Tuple[float, float]:
    lower = stats.beta.ppf((1 - credible_mass) / 2, post.alpha, post.beta)
    upper = stats.beta.ppf(1 - (1 - credible_mass) / 2, post.alpha, post.beta)
    return float(lower), float(upper)


def probability_better_than(post_a: BetaPosterior, post_b: BetaPosterior) -> float:
    rng = np.random.default_rng(42)
    samples_a = post_a.sample(MONTE_CARLO_SAMPLES, rng)
    samples_b = post_b.sample(MONTE_CARLO_SAMPLES, rng)
    return float(np.mean(samples_a > samples_b))


def win_probability_matrix(posts: List[BetaPosterior]) -> Dict[str, Dict[str, float]]:
    matrix: Dict[str, Dict[str, float]] = {}
    rng = np.random.default_rng(42)
    samples_dict = {p.variant: p.sample(MONTE_CARLO_SAMPLES, rng) for p in posts}
    for p in posts:
        matrix[p.variant] = {}
        for q in posts:
            if p.variant == q.variant:
                matrix[p.variant][q.variant] = 0.5
            else:
                matrix[p.variant][q.variant] = float(
                    np.mean(samples_dict[p.variant] > samples_dict[q.variant])
                )
    return matrix


def expected_lift(post_treatment: BetaPosterior, post_control: BetaPosterior) -> float:
    mean_t = post_treatment.mean
    mean_c = post_control.mean
    if mean_c == 0:
        return 0.0
    return (mean_t - mean_c) / mean_c


def expected_loss(post_treatment: BetaPosterior, post_control: BetaPosterior) -> float:
    rng = np.random.default_rng(42)
    samples_t = post_treatment.sample(MONTE_CARLO_SAMPLES, rng)
    samples_c = post_control.sample(MONTE_CARLO_SAMPLES, rng)
    loss_treat = np.maximum(0.0, samples_c - samples_t)
    loss_control = np.maximum(0.0, samples_t - samples_c)
    return float(min(np.mean(loss_treat), np.mean(loss_control)))


def risk_of_choosing(post_a: BetaPosterior, post_b: BetaPosterior) -> float:
    rng = np.random.default_rng(42)
    samples_a = post_a.sample(MONTE_CARLO_SAMPLES, rng)
    samples_b = post_b.sample(MONTE_CARLO_SAMPLES, rng)
    loss = np.maximum(0.0, samples_b - samples_a)
    return float(np.mean(loss))


def summarize_posteriors(
    posts: List[BetaPosterior],
) -> Dict[str, Dict[str, float]]:
    baseline = posts[0]
    summary: Dict[str, Dict[str, float]] = {}
    for post in posts:
        ci_lower, ci_upper = credible_interval(post)
        prob_better = probability_better_than(post, baseline)
        lift = expected_lift(post, baseline)
        risk = expected_loss(post, baseline)
        summary[post.variant] = {
            "posterior_mean": post.mean,
            "posterior_median": post.median,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "probability_better_than_baseline": prob_better,
            "expected_lift": lift,
            "risk": risk,
            "sample_size": post.sample_size,
            "conversions": post.conversions,
            "observed_rate": post.observed_rate,
            "prior_alpha": post.prior_alpha,
            "prior_beta": post.prior_beta,
        }
    return summary


def compute_all(
    variants: List[VariantData],
) -> Tuple[List[BetaPosterior], Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    posts = [compute_posterior(v) for v in variants]
    summary = summarize_posteriors(posts)
    matrix = win_probability_matrix(posts)
    return posts, summary, matrix