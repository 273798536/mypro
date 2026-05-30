from typing import Dict, List, Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier


def compute_importance(
    X: np.ndarray,
    y: np.ndarray,
    feature_names: List[str],
    model_version: str,
    data_source: str,
    n_estimators: int = 200,
    random_state: int = 42,
    rf_params: Optional[Dict] = None,
) -> Dict[str, Any]:
    params = {
        "n_estimators": n_estimators,
        "random_state": random_state,
        "n_jobs": -1,
        "class_weight": "balanced",
    }
    if rf_params:
        params.update(rf_params)

    rf = RandomForestClassifier(**params)
    rf.fit(X, y)

    importances = rf.feature_importances_
    std = np.std(
        [tree.feature_importances_ for tree in rf.estimators_], axis=0
    )

    ranked = sorted(
        zip(feature_names, importances, std),
        key=lambda t: t[1],
        reverse=True,
    )

    total = importances.sum()
    cumulative = 0.0
    cumul_list = []
    for fname, imp, s in ranked:
        cumulative += imp
        cumul_list.append(
            {
                "feature": fname,
                "importance": round(float(imp), 6),
                "importance_pct": round(float(imp / total) * 100, 2) if total else 0.0,
                "std": round(float(s), 6),
                "cumulative_pct": round(float(cumulative / total) * 100, 2) if total else 0.0,
                "source": {
                    "model_version": model_version,
                    "data_source": data_source,
                },
            }
        )

    oob_score = None
    if rf_params is None or rf_params.get("oob_score", False):
        try:
            oob_params = params.copy()
            oob_params["oob_score"] = True
            rf_oob = RandomForestClassifier(**oob_params)
            rf_oob.fit(X, y)
            oob_score = round(float(rf_oob.oob_score_), 4)
        except Exception:
            pass

    return {
        "model_version": model_version,
        "data_source": data_source,
        "n_features": len(feature_names),
        "n_samples": int(X.shape[0]),
        "oob_score": oob_score,
        "rf_params": params,
        "ranked_features": cumul_list,
    }
