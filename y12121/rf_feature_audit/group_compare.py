from typing import Dict, List, Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier


def compare_groups(
    X: np.ndarray,
    y: np.ndarray,
    feature_names: List[str],
    group_labels: np.ndarray,
    model_version: str,
    data_source: str,
    group_column: str,
    min_group_size: int = 30,
    divergence_threshold: float = 0.15,
    n_estimators: int = 200,
    random_state: int = 42,
) -> Dict[str, Any]:
    unique_groups = np.unique(group_labels)
    group_importances: Dict[str, Dict[str, float]] = {}

    for g in unique_groups:
        mask = group_labels == g
        n_g = int(mask.sum())
        if n_g < min_group_size:
            group_importances[str(g)] = {
                "_status": "skipped",
                "_reason": f"group_size={n_g} < min_group_size={min_group_size}",
            }
            continue
        X_g, y_g = X[mask], y[mask]
        n_classes = len(np.unique(y_g))
        if n_classes < 2:
            group_importances[str(g)] = {
                "_status": "skipped",
                "_reason": f"only {n_classes} class(es) in group",
            }
            continue
        rf = RandomForestClassifier(
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
            class_weight="balanced",
        )
        rf.fit(X_g, y_g)
        imp_dict = {}
        for fname, imp_val in zip(feature_names, rf.feature_importances_):
            imp_dict[fname] = round(float(imp_val), 6)
        imp_dict["_status"] = "ok"
        imp_dict["_n_samples"] = n_g
        group_importances[str(g)] = imp_dict

    valid_groups = [g for g, v in group_importances.items() if v.get("_status") == "ok"]
    divergence_report = []
    for fname in feature_names:
        values = []
        for g in valid_groups:
            values.append(group_importances[g].get(fname, 0.0))
        if len(values) < 2:
            continue
        arr = np.array(values)
        mean_val = arr.mean()
        std_val = arr.std()
        max_val = arr.max()
        min_val = arr.min()
        range_val = max_val - min_val
        cv = float(std_val / mean_val) if mean_val > 1e-9 else 0.0
        flag = cv > divergence_threshold
        per_group = {g: group_importances[g].get(fname, 0.0) for g in valid_groups}
        divergence_report.append({
            "feature": fname,
            "mean_importance": round(float(mean_val), 6),
            "std_importance": round(float(std_val), 6),
            "cv": round(cv, 4),
            "range": round(float(range_val), 6),
            "divergent": flag,
            "per_group": per_group,
            "source": {
                "model_version": model_version,
                "data_source": data_source,
                "group_column": group_column,
            },
        })

    divergence_report.sort(key=lambda r: r["cv"], reverse=True)

    n_divergent = sum(1 for r in divergence_report if r["divergent"])

    return {
        "model_version": model_version,
        "data_source": data_source,
        "group_column": group_column,
        "n_groups_total": len(unique_groups),
        "n_groups_valid": len(valid_groups),
        "divergence_threshold": divergence_threshold,
        "n_divergent_features": n_divergent,
        "group_sizes": {
            str(g): int((group_labels == g).sum()) for g in unique_groups
        },
        "divergence_report": divergence_report,
    }
