import numpy as np
from typing import Dict, List, Any, Tuple


def generate_baseline(n_samples: int = 500, seed: int = 42) -> Dict[str, List[float]]:
    rng = np.random.default_rng(seed)
    return {
        "user_age": rng.normal(35, 10, n_samples).tolist(),
        "order_amount": rng.lognormal(3.5, 0.8, n_samples).tolist(),
        "login_count_7d": rng.poisson(5, n_samples).tolist(),
        "risk_score": rng.beta(2, 5, n_samples).tolist(),
        "session_duration_sec": rng.exponential(180, n_samples).tolist(),
        "page_view_count": rng.negative_binomial(3, 0.3, n_samples).tolist(),
    }


def generate_current_drifted(n_samples: int = 500,
                             drift_severity: str = "medium",
                             seed: int = 123) -> Dict[str, List[float]]:
    rng = np.random.default_rng(seed)
    data = {}

    if drift_severity == "light":
        age_mu, age_sigma = 37, 10
        amount_mu, amount_sigma = 3.6, 0.8
    elif drift_severity == "medium":
        age_mu, age_sigma = 42, 12
        amount_mu, amount_sigma = 3.9, 0.9
    else:
        age_mu, age_sigma = 48, 15
        amount_mu, amount_sigma = 4.3, 1.1

    data["user_age"] = rng.normal(age_mu, age_sigma, n_samples).tolist()
    data["order_amount"] = rng.lognormal(amount_mu, amount_sigma, n_samples).tolist()
    data["login_count_7d"] = rng.poisson(5, n_samples).tolist()
    data["risk_score"] = rng.beta(2, 5, n_samples).tolist()
    data["session_duration_sec"] = rng.exponential(180, n_samples).tolist()
    data["page_view_count"] = rng.negative_binomial(3, 0.3, n_samples).tolist()
    return data


def generate_small_sample(n_samples: int = 15, seed: int = 7) -> Dict[str, List[float]]:
    rng = np.random.default_rng(seed)
    return {
        "user_age": rng.normal(60, 20, n_samples).tolist(),
        "order_amount": rng.lognormal(5, 1.2, n_samples).tolist(),
        "login_count_7d": rng.poisson(2, n_samples).tolist(),
        "risk_score": rng.beta(5, 2, n_samples).tolist(),
        "session_duration_sec": rng.exponential(60, n_samples).tolist(),
        "page_view_count": rng.negative_binomial(1, 0.5, n_samples).tolist(),
    }


def generate_raw_records_with_duplicates(normal_count: int = 100,
                                         duplicate_count: int = 3,
                                         seed: int = 99) -> List[Dict[str, Any]]:
    rng = np.random.default_rng(seed)
    records = []
    for i in range(normal_count):
        records.append({
            "run_id": f"rec_{i:04d}",
            "user_age": float(rng.normal(35, 10)),
            "order_amount": float(rng.lognormal(3.5, 0.8)),
        })
    dup_run_id = f"rec_{normal_count // 2:04d}"
    for _ in range(duplicate_count):
        records.append({
            "run_id": dup_run_id,
            "user_age": float(rng.normal(35, 10)),
            "order_amount": float(rng.lognormal(3.5, 0.8)),
        })
    rng.shuffle(records)
    return records


def records_to_feature_dict(records: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    features = set()
    for r in records:
        for k, v in r.items():
            if k != "run_id" and isinstance(v, (int, float)):
                features.add(k)
    result = {f: [] for f in features}
    for r in records:
        for f in features:
            result[f].append(float(r.get(f, float("nan"))))
    return result
