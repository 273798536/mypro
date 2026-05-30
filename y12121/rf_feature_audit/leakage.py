from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from scipy import stats


def detect_leakage(
    X: np.ndarray,
    y: np.ndarray,
    feature_names: List[str],
    model_version: str,
    data_source: str,
    importance_result: Dict[str, Any],
    group_result: Optional[Dict[str, Any]] = None,
    corr_threshold: float = 0.85,
    importance_top_k: float = 0.5,
    single_dominance_ratio: float = 0.35,
) -> Dict[str, Any]:
    flags: List[Dict[str, Any]] = []

    n_features = len(feature_names)
    n_samples = int(X.shape[0])

    _check_target_correlation(X, y, feature_names, model_version, data_source,
                              corr_threshold, flags)

    _check_single_dominance(importance_result, model_version, data_source,
                            single_dominance_ratio, flags)

    _check_importance_concentration(importance_result, model_version, data_source,
                                    importance_top_k, flags)

    _check_feature_pair_correlation(X, feature_names, model_version, data_source,
                                    corr_threshold, flags)

    if group_result is not None:
        _check_group_divergence_leakage(group_result, model_version, data_source, flags)

    has_leakage = any(f["severity"] == "high" for f in flags)

    summary = {
        "model_version": model_version,
        "data_source": data_source,
        "n_features": n_features,
        "n_samples": n_samples,
        "has_leakage_risk": has_leakage,
        "n_flags": len(flags),
        "n_high_severity": sum(1 for f in flags if f["severity"] == "high"),
        "n_medium_severity": sum(1 for f in flags if f["severity"] == "medium"),
        "flags": sorted(flags, key=lambda f: (0 if f["severity"] == "high" else 1, f["rule"])),
    }
    return summary


def _check_target_correlation(
    X: np.ndarray, y: np.ndarray, feature_names: List[str],
    model_version: str, data_source: str,
    threshold: float, flags: List[Dict[str, Any]],
):
    for i, fname in enumerate(feature_names):
        col = X[:, i]
        if np.std(col) < 1e-9:
            continue
        if y.dtype in (np.float64, np.float32, float):
            corr, pval = stats.pearsonr(col, y)
        else:
            try:
                corr, pval = stats.pointbiserialr(y, col)
            except Exception:
                corr, pval = 0.0, 1.0

        abs_corr = abs(corr)
        if abs_corr >= threshold:
            flags.append({
                "rule": "target_correlation",
                "feature": fname,
                "severity": "high",
                "detail": {
                    "correlation": round(float(corr), 4),
                    "abs_correlation": round(float(abs_corr), 4),
                    "p_value": round(float(pval), 6),
                    "threshold": threshold,
                },
                "explanation": (
                    f"特征 '{fname}' 与目标变量相关系数={abs_corr:.4f}，"
                    f"超过阈值 {threshold}。该特征可能直接包含目标信息"
                    f"或为目标代理变量，属于典型特征泄漏。"
                ),
                "source": {
                    "model_version": model_version,
                    "data_source": data_source,
                    "evidence": "target_correlation_test",
                },
            })
        elif abs_corr >= threshold * 0.8:
            flags.append({
                "rule": "target_correlation",
                "feature": fname,
                "severity": "medium",
                "detail": {
                    "correlation": round(float(corr), 4),
                    "abs_correlation": round(float(abs_corr), 4),
                    "p_value": round(float(pval), 6),
                    "threshold": threshold,
                },
                "explanation": (
                    f"特征 '{fname}' 与目标变量相关系数={abs_corr:.4f}，"
                    f"接近阈值 {threshold}，需人工确认是否为间接泄漏。"
                ),
                "source": {
                    "model_version": model_version,
                    "data_source": data_source,
                    "evidence": "target_correlation_test",
                },
            })


def _check_single_dominance(
    importance_result: Dict[str, Any],
    model_version: str, data_source: str,
    ratio: float, flags: List[Dict[str, Any]],
):
    ranked = importance_result.get("ranked_features", [])
    if not ranked:
        return
    top = ranked[0]
    imp_pct = top.get("importance_pct", 0.0)
    if imp_pct >= ratio * 100:
        flags.append({
            "rule": "single_dominance",
            "feature": top["feature"],
            "severity": "high",
            "detail": {
                "importance_pct": imp_pct,
                "threshold_pct": ratio * 100,
            },
            "explanation": (
                f"特征 '{top['feature']}' 单独贡献了 {imp_pct:.1f}% 的重要性，"
                f"超过阈值 {ratio*100:.0f}%。单一特征主导往往意味着该特征"
                f"编码了目标信息，其余特征只是噪声。"
            ),
            "source": {
                "model_version": model_version,
                "data_source": data_source,
                "evidence": "importance_ranking",
            },
        })


def _check_importance_concentration(
    importance_result: Dict[str, Any],
    model_version: str, data_source: str,
    top_k: float, flags: List[Dict[str, Any]],
):
    ranked = importance_result.get("ranked_features", [])
    if not ranked:
        return
    n_top = max(1, int(len(ranked) * top_k))
    cumul = ranked[n_top - 1].get("cumulative_pct", 0.0)
    if cumul >= 95.0:
        top_names = [r["feature"] for r in ranked[:n_top]]
        flags.append({
            "rule": "importance_concentration",
            "feature": ", ".join(top_names),
            "severity": "medium",
            "detail": {
                "top_k_fraction": top_k,
                "n_top_features": n_top,
                "cumulative_importance_pct": cumul,
            },
            "explanation": (
                f"前 {n_top} 个特征（占比 {top_k*100:.0f}%）累计贡献了 "
                f"{cumul:.1f}% 的重要性。信息高度集中，低重要性特征可能是"
                f"冗余或泄漏特征的遮掩。"
            ),
            "source": {
                "model_version": model_version,
                "data_source": data_source,
                "evidence": "importance_ranking",
            },
        })


def _check_feature_pair_correlation(
    X: np.ndarray, feature_names: List[str],
    model_version: str, data_source: str,
    threshold: float, flags: List[Dict[str, Any]],
):
    n_features = X.shape[1]
    if n_features > 200:
        return
    for i in range(n_features):
        for j in range(i + 1, n_features):
            if np.std(X[:, i]) < 1e-9 or np.std(X[:, j]) < 1e-9:
                continue
            corr, _ = stats.pearsonr(X[:, i], X[:, j])
            abs_corr = abs(corr)
            if abs_corr >= threshold:
                flags.append({
                    "rule": "feature_pair_correlation",
                    "feature": f"{feature_names[i]} <-> {feature_names[j]}",
                    "severity": "medium",
                    "detail": {
                        "pair": [feature_names[i], feature_names[j]],
                        "correlation": round(float(corr), 4),
                        "abs_correlation": round(float(abs_corr), 4),
                    },
                    "explanation": (
                        f"特征 '{feature_names[i]}' 与 '{feature_names[j]}' "
                        f"相关系数={abs_corr:.4f}。高度相关特征对中，"
                        f"若一方可能泄漏，另一方也需要审查。"
                    ),
                    "source": {
                        "model_version": model_version,
                        "data_source": data_source,
                        "evidence": "feature_pair_correlation_test",
                    },
                })


def _check_group_divergence_leakage(
    group_result: Dict[str, Any],
    model_version: str, data_source: str,
    flags: List[Dict[str, Any]],
):
    report = group_result.get("divergence_report", [])
    for item in report:
        if not item.get("divergent"):
            continue
        flags.append({
            "rule": "group_divergence",
            "feature": item["feature"],
            "severity": "medium",
            "detail": {
                "cv": item["cv"],
                "range": item["range"],
                "per_group": item["per_group"],
                "group_column": group_result.get("group_column"),
            },
            "explanation": (
                f"特征 '{item['feature']}' 在不同分组间重要性变异系数(CV)="
                f"{item['cv']:.4f}，跨组差异过大。该特征可能在特定分组中"
                f"充当泄漏变量，或在另一分组中完全无效。"
            ),
            "source": {
                "model_version": model_version,
                "data_source": data_source,
                "evidence": "group_divergence_test",
                "group_column": group_result.get("group_column"),
            },
        })
