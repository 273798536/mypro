#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
聚类轮廓系数报告工具
==================
供数学老师使用：导入评分记录 → 计算轮廓系数 → 检测排序不稳定
→ 历史对比 → 反例生成 → 生成投委会可读报告

运行方式:
    python silhouette_report_tool.py --input data/scores.csv --history data/history.csv
"""

import argparse
import csv
import json
import math
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score, silhouette_samples


# ============================================================
# 第一部分：数据模型与状态枚举
# ============================================================

class DataStatus(Enum):
    """数据可用状态——供投委会一眼识别"""
    USABLE = "可用"          # 绿色，可直接用于决策
    PENDING = "暂缓"         # 黄色，需数学老师复核
    RECOLLECT = "重新采集"    # 红色，原始数据有问题

    @property
    def color_tag(self):
        return {
            DataStatus.USABLE: "[✓ 可用]",
            DataStatus.PENDING: "[? 暂缓]",
            DataStatus.RECOLLECT: "[✗ 重采]",
        }[self]


class FailureCode(Enum):
    """失败原因编码——对应可操作的补救建议"""
    MISSING_UNIT = "单位缺失"
    MISSING_HISTORY = "历史对照缺失"
    SAMPLE_TOO_SMALL = "样本量不足"
    SINGLE_CLUSTER = "聚类数为1"
    FORMAT_ERROR = "格式错误"
    COLUMN_MISMATCH = "列名不匹配"
    INCONSISTENT_SCALE = "量纲不一致"


@dataclass
class FailureInfo:
    code: FailureCode
    message: str
    action: str          # 可操作的补救措施
    affected_records: List[str] = field(default_factory=list)


@dataclass
class ScoreRecord:
    """一条评分记录（导入后的数据结构）"""
    record_id: str
    features: Dict[str, float]   # {特征名: 数值}
    units: Dict[str, str]        # {特征名: 单位}
    cluster_label: int
    source_ref: str = ""         # 来源材料编号，用于"结论拉回来源"
    remark: str = ""


@dataclass
class SilhouetteResult:
    """单个样本的轮廓系数结果"""
    record_id: str
    score: float
    cluster_label: int
    a_distance: float   # 簇内平均距离
    b_distance: float   # 到最近其他簇的平均距离
    status: DataStatus
    source_ref: str


@dataclass
class StabilityIssue:
    """排序不稳定记录"""
    feature_name: str
    baseline_rank: List[str]
    current_rank: List[str]
    swapped_pairs: List[Tuple[str, str]]
    severity: str  # "轻微" / "中等" / "严重"


# ============================================================
# 第二部分：公式与适用范围（人能看懂的位置）
# ============================================================

FORMULA_REFERENCE = {
    "name": "轮廓系数 (Silhouette Coefficient)",
    "formula_latex": "s(i) = (b(i) - a(i)) / max{a(i), b(i)}",
    "formula_text": "对于样本 i：s(i) = (到最近其他簇的平均距离 - 簇内平均距离) / 二者较大值",
    "unit": "无量纲 (ratio, 取值范围 [-1, +1])",
    "range_interpretation": {
        "[0.71, 1.00]": "强聚类结构，可信度高",
        "[0.51, 0.70]": "合理聚类结构，可使用",
        "[0.26, 0.50]": "弱聚类结构，建议复核",
        "[ 0.00, 0.25]": "聚类结构不明显，慎用",
        "[-1.00, -0.01]": "样本可能被错误聚类，需检查",
    },
    "applicable_scope": [
        "样本已被分配到 ≥ 2 个簇",
        "特征为连续型数值变量",
        "距离度量采用欧氏距离（本工具默认）",
        "样本量 ≥ 2，且每个簇至少有 1 个样本",
    ],
    "failure_modes": [
        "单簇数据 → 无法计算 b(i)，返回 NaN",
        "孤立样本 (簇大小=1) → a(i) 无定义，s(i)=0",
        "量纲差异过大 → 高量纲特征主导距离，结果失真",
    ],
    "references": [
        "Peter J. Rousseeuw (1987). Silhouettes: a graphical aid to the interpretation and validation of cluster analysis."
    ],
}


# ============================================================
# 第三部分：数据导入与校验
# ============================================================

REQUIRED_COLUMNS = {"record_id", "cluster_label"}
OPTIONAL_COLUMNS = {"source_ref", "remark"}


def detect_columns(df: pd.DataFrame) -> Tuple[List[str], Dict[str, str]]:
    """
    自动识别特征列和单位列。
    约定：单位列命名为 "{特征名}_unit"。
    """
    feature_cols = []
    unit_map = {}
    all_cols = set(df.columns)

    for col in df.columns:
        if col in REQUIRED_COLUMNS or col in OPTIONAL_COLUMNS:
            continue
        if col.endswith("_unit"):
            continue
        feature_cols.append(col)
        unit_col = f"{col}_unit"
        if unit_col in all_cols:
            unit_map[col] = unit_col

    return feature_cols, unit_map


def load_score_records(filepath: str) -> Tuple[List[ScoreRecord], List[FailureInfo]]:
    """
    从 CSV 导入评分记录。
    返回 (记录列表, 失败信息列表)。
    CSV 列约定:
        record_id, cluster_label, [source_ref], [remark],
        feature1, feature1_unit, feature2, feature2_unit, ...
    """
    failures: List[FailureInfo] = []

    if not os.path.exists(filepath):
        failures.append(FailureInfo(
            code=FailureCode.FORMAT_ERROR,
            message=f"文件不存在: {filepath}",
            action="请检查文件路径是否正确，或确认评分记录文件已生成。",
        ))
        return [], failures

    try:
        df = pd.read_csv(filepath, dtype=str)
    except Exception as e:
        failures.append(FailureInfo(
            code=FailureCode.FORMAT_ERROR,
            message=f"CSV 读取失败: {e}",
            action="请用文本编辑器检查 CSV 是否有乱码、换行符异常，并重存为 UTF-8 格式。",
        ))
        return [], failures

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        failures.append(FailureInfo(
            code=FailureCode.COLUMN_MISMATCH,
            message=f"缺少必填列: {missing}",
            action=f"请在 CSV 中补充这些列: {missing}。参考格式见 data/example_scores.csv。",
        ))
        return [], failures

    feature_cols, unit_map = detect_columns(df)
    if not feature_cols:
        failures.append(FailureInfo(
            code=FailureCode.COLUMN_MISMATCH,
            message="未识别到任何特征列",
            action="请添加至少一个数值特征列（除 record_id、cluster_label 外的列）。",
        ))
        return [], failures

    records: List[ScoreRecord] = []
    missing_unit_records: List[str] = []

    for _, row in df.iterrows():
        rid = str(row["record_id"]).strip()
        features: Dict[str, float] = {}
        units: Dict[str, str] = {}
        parse_ok = True

        for fc in feature_cols:
            raw = row.get(fc, "")
            try:
                features[fc] = float(raw)
            except (ValueError, TypeError):
                failures.append(FailureInfo(
                    code=FailureCode.FORMAT_ERROR,
                    message=f"记录 {rid} 的特征 {fc} 非数值: '{raw}'",
                    action=f"请将 {rid} 的 {fc} 改为数值，或标记缺失后重新采集。",
                    affected_records=[rid],
                ))
                parse_ok = False

            if fc in unit_map:
                u = str(row.get(unit_map[fc], "")).strip()
                if not u or u.lower() in ("nan", "none", "null"):
                    missing_unit_records.append(rid)
                else:
                    units[fc] = u

        if not parse_ok:
            continue

        try:
            cluster = int(float(row["cluster_label"]))
        except (ValueError, TypeError):
            failures.append(FailureInfo(
                code=FailureCode.FORMAT_ERROR,
                message=f"记录 {rid} 的 cluster_label 非整数",
                action=f"请将 {rid} 的 cluster_label 改为整数（1,2,3...）。",
                affected_records=[rid],
            ))
            continue

        records.append(ScoreRecord(
            record_id=rid,
            features=features,
            units=units,
            cluster_label=cluster,
            source_ref=str(row.get("source_ref", "")).strip(),
            remark=str(row.get("remark", "")).strip(),
        ))

    if missing_unit_records:
        sample_missing = missing_unit_records[:5]
        failures.append(FailureInfo(
            code=FailureCode.MISSING_UNIT,
            message=f"共 {len(missing_unit_records)} 条记录缺少单位标注",
            action=(
                f"请补充以下记录的单位列（特征名_unit）: {sample_missing}"
                + ("..." if len(missing_unit_records) > 5 else "")
                + "。单位缺失会导致不同量纲特征无法比较，影响轮廓系数解释。"
            ),
            affected_records=missing_unit_records,
        ))

    return records, failures


def validate_units_consistency(records: List[ScoreRecord]) -> List[FailureInfo]:
    """检查同一特征在不同记录中的单位是否一致"""
    failures: List[FailureInfo] = []
    feature_units: Dict[str, set] = {}
    for r in records:
        for f, u in r.units.items():
            feature_units.setdefault(f, set()).add(u)

    for f, units in feature_units.items():
        if len(units) > 1:
            bad_records = [r.record_id for r in records if r.units.get(f) in units and len(units) > 1]
            failures.append(FailureInfo(
                code=FailureCode.INCONSISTENT_SCALE,
                message=f"特征 {f} 存在多种单位: {units}",
                action=f"请将特征 {f} 的所有记录统一到同一单位（建议换算为国际单位制），否则距离计算失真。",
                affected_records=bad_records[:10],
            ))
    return failures


# ============================================================
# 第四部分：轮廓系数核心计算
# ============================================================

def compute_silhouette(records: List[ScoreRecord]) -> Tuple[List[SilhouetteResult], float, List[FailureInfo]]:
    """
    计算每条记录的轮廓系数。
    返回 (单样本结果列表, 总体平均轮廓系数, 失败信息)。
    """
    failures: List[FailureInfo] = []

    if len(records) < 2:
        failures.append(FailureInfo(
            code=FailureCode.SAMPLE_TOO_SMALL,
            message=f"仅 {len(records)} 条记录，至少需要 2 条",
            action="请补充评分记录，或确认数据导入是否完整。",
        ))
        return [], float("nan"), failures

    feature_names = sorted(records[0].features.keys())
    X = np.array([[r.features[f] for f in feature_names] for r in records])
    labels = np.array([r.cluster_label for r in records])

    unique_labels = set(labels)
    if len(unique_labels) < 2:
        failures.append(FailureInfo(
            code=FailureCode.SINGLE_CLUSTER,
            message=f"所有记录被分到同一个簇 (cluster={next(iter(unique_labels))})",
            action="请调整聚类口径或导入更多分属不同簇的记录，否则 b(i) 无法定义。",
        ))
        return [], float("nan"), failures

    cluster_sizes = pd.Series(labels).value_counts()
    singleton_clusters = cluster_sizes[cluster_sizes == 1].index.tolist()

    sample_scores = silhouette_samples(X, labels, metric="euclidean")
    overall_score = float(silhouette_score(X, labels, metric="euclidean"))

    a_distances = _compute_a_distances(X, labels)
    b_distances = _compute_b_distances(X, labels)

    results: List[SilhouetteResult] = []
    for i, r in enumerate(records):
        score = float(sample_scores[i])
        status = _classify_score(score, r.cluster_label in singleton_clusters)
        results.append(SilhouetteResult(
            record_id=r.record_id,
            score=score,
            cluster_label=r.cluster_label,
            a_distance=float(a_distances[i]),
            b_distance=float(b_distances[i]),
            status=status,
            source_ref=r.source_ref,
        ))

    return results, overall_score, failures


def _compute_a_distances(X: np.ndarray, labels: np.ndarray) -> np.ndarray:
    """计算每个样本的簇内平均距离 a(i)"""
    n = len(X)
    a = np.zeros(n)
    for i in range(n):
        same_cluster = np.where(labels == labels[i])[0]
        same_cluster = same_cluster[same_cluster != i]
        if len(same_cluster) == 0:
            a[i] = 0.0
        else:
            diffs = X[i] - X[same_cluster]
            dists = np.sqrt(np.sum(diffs ** 2, axis=1))
            a[i] = np.mean(dists)
    return a


def _compute_b_distances(X: np.ndarray, labels: np.ndarray) -> np.ndarray:
    """计算每个样本到最近其他簇的平均距离 b(i)"""
    n = len(X)
    b = np.zeros(n)
    unique_labels = set(labels)
    for i in range(n):
        min_mean = np.inf
        for other_l in unique_labels:
            if other_l == labels[i]:
                continue
            other_idx = np.where(labels == other_l)[0]
            if len(other_idx) == 0:
                continue
            diffs = X[i] - X[other_idx]
            dists = np.sqrt(np.sum(diffs ** 2, axis=1))
            mean_d = np.mean(dists)
            if mean_d < min_mean:
                min_mean = mean_d
        b[i] = 0.0 if min_mean == np.inf else min_mean
    return b


def _classify_score(score: float, is_singleton: bool) -> DataStatus:
    if is_singleton:
        return DataStatus.PENDING
    if score >= 0.51:
        return DataStatus.USABLE
    elif score >= 0.0:
        return DataStatus.PENDING
    else:
        return DataStatus.RECOLLECT


# ============================================================
# 第五部分：排序稳定性检测
# ============================================================

def detect_ranking_instability(
    current_results: List[SilhouetteResult],
    baseline_results: Optional[List[SilhouetteResult]] = None,
    perturbation_rounds: int = 20,
    noise_scale: float = 0.01,
    records: Optional[List[ScoreRecord]] = None,
) -> List[StabilityIssue]:
    """
    检测排序不稳定性。
    方法：(1) 若提供 baseline，则直接比较两次排序；
          (2) 否则对当前数据加微小扰动多轮重排，观察排名变化。
    """
    issues: List[StabilityIssue] = []

    if baseline_results is not None:
        cur_ids = [r.record_id for r in sorted(current_results, key=lambda x: -x.score)]
        base_ids = [r.record_id for r in sorted(baseline_results, key=lambda x: -x.score)]
        swapped = _find_swapped_pairs(base_ids, cur_ids)
        if swapped:
            severity = _rank_severity(len(swapped), len(cur_ids))
            issues.append(StabilityIssue(
                feature_name="总体轮廓系数排序",
                baseline_rank=base_ids,
                current_rank=cur_ids,
                swapped_pairs=swapped,
                severity=severity,
            ))

    if records is not None and len(records) >= 3:
        feature_names = sorted(records[0].features.keys())
        for feat in feature_names:
            base_rank = sorted(
                [r.record_id for r in records],
                key=lambda rid: -next(r.features[feat] for r in records if r.record_id == rid)
            )
            perturbed_ranks = []
            for _ in range(perturbation_rounds):
                noisy = {
                    r.record_id: r.features[feat] * (1 + np.random.normal(0, noise_scale))
                    for r in records
                }
                perturbed_ranks.append(sorted(noisy.keys(), key=lambda k: -noisy[k]))
            swap_count = 0
            for pr in perturbed_ranks:
                swap_count += len(_find_swapped_pairs(base_rank, pr))
            avg_swaps = swap_count / max(perturbation_rounds, 1)
            if avg_swaps >= 1:
                issues.append(StabilityIssue(
                    feature_name=f"特征[{feat}]单维度排序",
                    baseline_rank=base_rank,
                    current_rank=perturbed_ranks[0] if perturbed_ranks else base_rank,
                    swapped_pairs=_find_swapped_pairs(base_rank, perturbed_ranks[0]) if perturbed_ranks else [],
                    severity=_rank_severity(int(round(avg_swaps)), len(base_rank)),
                ))

    return issues


def _find_swapped_pairs(rank_a: List[str], rank_b: List[str]) -> List[Tuple[str, str]]:
    """找出两个排名中顺序颠倒的记录对"""
    pos_a = {rid: i for i, rid in enumerate(rank_a)}
    swapped = []
    common = [rid for rid in rank_a if rid in pos_a and rid in set(rank_b)]
    for i in range(len(common)):
        for j in range(i + 1, len(common)):
            x, y = common[i], common[j]
            if (pos_a[x] - pos_a[y]) * (rank_b.index(x) - rank_b.index(y)) < 0:
                swapped.append((x, y))
    return swapped


def _rank_severity(swap_count: int, total: int) -> str:
    ratio = swap_count / max(total, 1)
    if ratio >= 0.3:
        return "严重"
    elif ratio >= 0.1:
        return "中等"
    else:
        return "轻微"


# ============================================================
# 第六部分：历史对比
# ============================================================

@dataclass
class HistoryComparison:
    current_overall: float
    history_overall: Optional[float]
    delta: Optional[float]
    trend: str
    per_cluster: Dict[int, Dict[str, Any]]
    changed_records: List[Dict[str, Any]]


def compare_with_history(
    current_results: List[SilhouetteResult],
    current_overall: float,
    history_file: Optional[str],
) -> Tuple[HistoryComparison, List[FailureInfo]]:
    """与历史批次对比"""
    failures: List[FailureInfo] = []

    if not history_file or not os.path.exists(history_file):
        failures.append(FailureInfo(
            code=FailureCode.MISSING_HISTORY,
            message=f"历史对照文件未提供或不存在: {history_file}",
            action=(
                "若这是首批数据可忽略；否则请提供上一次的历史结果 CSV "
                "（至少包含 record_id, score, cluster_label 三列），"
                "以便做趋势对比。"
            ),
        ))
        hist_comp = HistoryComparison(
            current_overall=current_overall,
            history_overall=None,
            delta=None,
            trend="无历史数据",
            per_cluster={},
            changed_records=[],
        )
        return hist_comp, failures

    try:
        hdf = pd.read_csv(history_file)
    except Exception as e:
        failures.append(FailureInfo(
            code=FailureCode.FORMAT_ERROR,
            message=f"历史文件读取失败: {e}",
            action="请检查历史文件是否为合法 CSV，并包含 record_id, score, cluster_label 列。",
        ))
        return HistoryComparison(current_overall, None, None, "历史文件损坏", {}, []), failures

    col_score = "score" if "score" in hdf.columns else ("silhouette_score" if "silhouette_score" in hdf.columns else None)
    needed = {"record_id", "cluster_label"}
    if not needed.issubset(set(hdf.columns)) or col_score is None:
        missing = needed - set(hdf.columns)
        if col_score is None:
            missing.add("score 或 silhouette_score")
        failures.append(FailureInfo(
            code=FailureCode.COLUMN_MISMATCH,
            message=f"历史文件缺少列: {missing}",
            action="请补充历史文件中的必需列（record_id, cluster_label, score/silhouette_score），或使用本工具生成的 silhouette_results.csv。",
        ))
        return HistoryComparison(current_overall, None, None, "历史文件缺列", {}, []), failures

    hist_map = {
        str(row["record_id"]): {"score": float(row[col_score]), "cluster": int(row["cluster_label"])}
        for _, row in hdf.iterrows()
    }
    history_overall = float(hdf[col_score].mean()) if len(hdf) > 0 else float("nan")
    delta = current_overall - history_overall if not math.isnan(history_overall) else None

    if delta is None:
        trend = "历史数据为空"
    elif delta >= 0.05:
        trend = "显著提升"
    elif delta >= 0.01:
        trend = "略有提升"
    elif delta <= -0.05:
        trend = "显著下降"
    elif delta <= -0.01:
        trend = "略有下降"
    else:
        trend = "基本持平"

    cur_clusters: Dict[int, List[SilhouetteResult]] = {}
    for r in current_results:
        cur_clusters.setdefault(r.cluster_label, []).append(r)
    per_cluster = {}
    for cl, items in cur_clusters.items():
        avg_now = np.mean([r.score for r in items])
        hist_scores = [
            hist_map[r.record_id]["score"]
            for r in items if r.record_id in hist_map and hist_map[r.record_id]["cluster"] == cl
        ]
        avg_hist = np.mean(hist_scores) if hist_scores else None
        per_cluster[cl] = {
            "current_avg": float(avg_now),
            "history_avg": float(avg_hist) if avg_hist is not None else None,
            "delta": float(avg_now - avg_hist) if avg_hist is not None else None,
            "sample_count": len(items),
            "history_sample_count": len(hist_scores),
        }

    changed = []
    for r in current_results:
        if r.record_id in hist_map:
            h = hist_map[r.record_id]
            d = r.score - h["score"]
            cluster_changed = (r.cluster_label != h["cluster"])
            if abs(d) >= 0.1 or cluster_changed:
                changed.append({
                    "record_id": r.record_id,
                    "current_score": r.score,
                    "history_score": h["score"],
                    "delta": d,
                    "current_cluster": r.cluster_label,
                    "history_cluster": h["cluster"],
                    "cluster_changed": cluster_changed,
                })

    return HistoryComparison(
        current_overall=current_overall,
        history_overall=history_overall if not math.isnan(history_overall) else None,
        delta=delta,
        trend=trend,
        per_cluster=per_cluster,
        changed_records=changed,
    ), failures


# ============================================================
# 第七部分：反例生成
# ============================================================

@dataclass
class CounterExample:
    record_id: str
    type: str          # "错分嫌疑" / "边界样本" / "排序反转"
    evidence: str
    source_ref: str
    suggestion: str


def generate_counter_examples(
    records: List[ScoreRecord],
    results: List[SilhouetteResult],
    stability_issues: List[StabilityIssue],
) -> List[CounterExample]:
    """
    生成反例，供投委会质疑结论时快速定位来源：
    1) 负轮廓系数 → 错分嫌疑
    2) s(i) 在 [0, 0.25] 且 a(i) > b(i) → 边界样本
    3) 排序不稳定 → 排序反转
    """
    examples: List[CounterExample] = []
    res_map = {r.record_id: r for r in results}
    rec_map = {r.record_id: r for r in records}

    for r in results:
        if r.score < 0:
            examples.append(CounterExample(
                record_id=r.record_id,
                type="错分嫌疑",
                evidence=(
                    f"s(i)={r.score:.3f} < 0，说明 a(i)={r.a_distance:.3f} > b(i)={r.b_distance:.3f}，"
                    f"该样本到其他簇的平均距离反而小于到本簇的平均距离。"
                ),
                source_ref=r.source_ref or rec_map.get(r.record_id, ScoreRecord("", {}, {}, 0)).source_ref,
                suggestion="请复核该样本的聚类标签是否正确，或检查特征取值是否录入错误。",
            ))
        elif 0 <= r.score <= 0.25 and r.a_distance > r.b_distance * 0.8:
            examples.append(CounterExample(
                record_id=r.record_id,
                type="边界样本",
                evidence=(
                    f"s(i)={r.score:.3f} 偏低，a(i)={r.a_distance:.3f} 接近 b(i)={r.b_distance:.3f}，"
                    f"样本位于簇边界附近。"
                ),
                source_ref=r.source_ref or rec_map.get(r.record_id, ScoreRecord("", {}, {}, 0)).source_ref,
                suggestion="建议增加该样本附近的采样密度，或评估是否需要调整簇数 K。",
            ))

    for issue in stability_issues:
        for a, b in issue.swapped_pairs[:3]:
            ra = res_map.get(a)
            rb = res_map.get(b)
            if ra and rb:
                examples.append(CounterExample(
                    record_id=f"{a} ↔ {b}",
                    type="排序反转",
                    evidence=(
                        f"{issue.feature_name} 中，{a}(s={ra.score:.3f}) 与 {b}(s={rb.score:.3f}) "
                        f"在两次排序中位次颠倒，差值仅 {abs(ra.score - rb.score):.4f}。"
                    ),
                    source_ref=(ra.source_ref or "") + " " + (rb.source_ref or ""),
                    suggestion="该排序可能对微小扰动敏感，决策时避免用该顺序做硬切分。",
                ))

    return examples


# ============================================================
# 第八部分：投委会报告生成
# ============================================================

def generate_committee_report(
    records: List[ScoreRecord],
    results: List[SilhouetteResult],
    overall_score: float,
    stability_issues: List[StabilityIssue],
    history: HistoryComparison,
    counter_examples: List[CounterExample],
    failures: List[FailureInfo],
    output_dir: str,
) -> Tuple[str, str]:
    """
    生成两份报告：
      (1) committee_report.txt —— 投委会版（简短，状态清晰）
      (2) math_teacher_review.txt —— 数学老师复核版（详细，附公式和反例）
    返回 (committee_path, teacher_path)
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    usable = [r for r in results if r.status == DataStatus.USABLE]
    pending = [r for r in results if r.status == DataStatus.PENDING]
    recollect = [r for r in results if r.status == DataStatus.RECOLLECT]

    # ---------- 投委会版 ----------
    comm_lines = []
    comm_lines.append("=" * 70)
    comm_lines.append("              聚类轮廓系数报告（投委会版）")
    comm_lines.append("=" * 70)
    comm_lines.append(f"生成时间: {timestamp}")
    comm_lines.append("")
    comm_lines.append("【一句话结论】")
    comm_lines.append(_executive_summary(overall_score, history, len(usable), len(pending), len(recollect)))
    comm_lines.append("")
    comm_lines.append("【总体指标】")
    comm_lines.append(f"  · 平均轮廓系数: {overall_score:.4f}  （{FORMULA_REFERENCE['unit']}）")
    if history.delta is not None:
        arrow = "↑" if history.delta > 0 else ("↓" if history.delta < 0 else "→")
        comm_lines.append(f"  · 较上批次: {arrow} {abs(history.delta):.4f} ({history.trend})")
    else:
        comm_lines.append(f"  · 较上批次: {history.trend}")
    comm_lines.append("")
    comm_lines.append("【数据状态一览（投委会一眼识别）】")
    comm_lines.append(f"  [✓ 可用]    共 {len(usable)} 条 —— 可直接用于决策")
    comm_lines.append(f"  [? 暂缓]    共 {len(pending)} 条 —— 需数学老师复核")
    comm_lines.append(f"  [✗ 重采]    共 {len(recollect)} 条 —— 原始数据需重新采集")
    comm_lines.append("")
    comm_lines.append("【可用数据清单（可直接用）】")
    if usable:
        for r in sorted(usable, key=lambda x: -x.score):
            comm_lines.append(f"    {r.status.color_tag} id={r.record_id:>10s}  s={r.score:.3f}  簇{r.cluster_label}")
    else:
        comm_lines.append("    (暂无)")
    comm_lines.append("")
    comm_lines.append("【暂缓数据清单（请数学老师复核）】")
    if pending:
        for r in sorted(pending, key=lambda x: -x.score):
            comm_lines.append(f"    {r.status.color_tag} id={r.record_id:>10s}  s={r.score:.3f}  簇{r.cluster_label}")
    else:
        comm_lines.append("    (暂无)")
    comm_lines.append("")
    comm_lines.append("【需重采数据清单】")
    if recollect:
        for r in sorted(recollect, key=lambda x: x.score):
            comm_lines.append(f"    {r.status.color_tag} id={r.record_id:>10s}  s={r.score:.3f}  簇{r.cluster_label}")
    else:
        comm_lines.append("    (暂无)")
    comm_lines.append("")
    comm_lines.append("【排序稳定性警示】")
    if stability_issues:
        for iss in stability_issues:
            comm_lines.append(f"    · [{iss.severity}] {iss.feature_name}: {len(iss.swapped_pairs)} 对记录位次反转")
            for a, b in iss.swapped_pairs[:3]:
                comm_lines.append(f"       例: {a} ↔ {b}")
            if len(iss.swapped_pairs) > 3:
                comm_lines.append(f"       ... 其余 {len(iss.swapped_pairs) - 3} 对略")
    else:
        comm_lines.append("    未检测到显著排序不稳定")
    comm_lines.append("")
    comm_lines.append("【异常与待办事项】")
    if failures:
        for f in failures:
            comm_lines.append(f"    · [{f.code.value}] {f.message}")
            comm_lines.append(f"      → 操作建议: {f.action}")
    else:
        comm_lines.append("    无异常")
    comm_lines.append("")
    comm_lines.append("=" * 70)
    comm_lines.append("注: 请数学老师签字后，本报告中标记为 [✓ 可用] 的数据可直接用于决策；")
    comm_lines.append("    [? 暂缓] 和 [✗ 重采] 的项目请转交数学老师处理。")
    comm_lines.append("=" * 70)

    comm_path = os.path.join(output_dir, "committee_report.txt")
    with open(comm_path, "w", encoding="utf-8") as f:
        f.write("\n".join(comm_lines) + "\n")

    # ---------- 数学老师复核版 ----------
    tea_lines = []
    tea_lines.append("=" * 70)
    tea_lines.append("         聚类轮廓系数报告（数学老师复核版）")
    tea_lines.append("=" * 70)
    tea_lines.append(f"生成时间: {timestamp}")
    tea_lines.append("")
    tea_lines.append("【指标定义（结论溯源用）】")
    tea_lines.append(f"  指标: {FORMULA_REFERENCE['name']}")
    tea_lines.append(f"  公式: {FORMULA_REFERENCE['formula_text']}")
    tea_lines.append(f"  LaTeX: {FORMULA_REFERENCE['formula_latex']}")
    tea_lines.append(f"  单位: {FORMULA_REFERENCE['unit']}")
    tea_lines.append("  取值区间说明:")
    for k, v in FORMULA_REFERENCE["range_interpretation"].items():
        tea_lines.append(f"    {k}: {v}")
    tea_lines.append("  适用范围:")
    for s in FORMULA_REFERENCE["applicable_scope"]:
        tea_lines.append(f"    ✓ {s}")
    tea_lines.append("  失效情形:")
    for s in FORMULA_REFERENCE["failure_modes"]:
        tea_lines.append(f"    ✗ {s}")
    tea_lines.append(f"  文献来源: {FORMULA_REFERENCE['references'][0]}")
    tea_lines.append("")
    tea_lines.append("【分样本详表（按来源材料回溯）】")
    tea_lines.append(f"  {'record_id':>12s} {'s(i)':>8s} {'a(i)':>8s} {'b(i)':>8s} {'簇':>3s} {'状态':>6s}  来源材料")
    for r in sorted(results, key=lambda x: (-x.cluster_label, -x.score)):
        src = r.source_ref or "(未标注)"
        tea_lines.append(
            f"  {r.record_id:>12s} {r.score:>8.4f} {r.a_distance:>8.4f} {r.b_distance:>8.4f}"
            f" {r.cluster_label:>3d} {r.status.color_tag} {src}"
        )
    tea_lines.append("")
    tea_lines.append("【历史对比明细】")
    if history.per_cluster:
        for cl, info in sorted(history.per_cluster.items()):
            delta_str = f"{info['delta']:+.4f}" if info["delta"] is not None else "N/A"
            tea_lines.append(
                f"  簇 {cl}: 当前平均={info['current_avg']:.4f}, "
                f"历史平均={info['history_avg'] if info['history_avg'] is not None else 'N/A'}, "
                f"Δ={delta_str}, 样本数 {info['sample_count']}(历史 {info['history_sample_count']})"
            )
    else:
        tea_lines.append("  (无历史分簇数据)")
    if history.changed_records:
        tea_lines.append("  变动较大的单条记录:")
        for ch in history.changed_records:
            mark = " [簇变动!]" if ch["cluster_changed"] else ""
            tea_lines.append(
                f"    {ch['record_id']}: 当前 {ch['current_score']:.4f} vs 历史 {ch['history_score']:.4f}"
                f" (Δ{ch['delta']:+.4f}) 簇 {ch['current_cluster']}←{ch['history_cluster']}{mark}"
            )
    tea_lines.append("")
    tea_lines.append("【反例清单（用于结论溯源与口径调整）】")
    if counter_examples:
        for ce in counter_examples:
            src = ce.source_ref or "(未标注来源)"
            tea_lines.append(f"  [{ce.type}] {ce.record_id}")
            tea_lines.append(f"    证据: {ce.evidence}")
            tea_lines.append(f"    来源材料: {src}")
            tea_lines.append(f"    建议: {ce.suggestion}")
            tea_lines.append("")
    else:
        tea_lines.append("  (未发现反例)")
    tea_lines.append("")
    tea_lines.append("【失败信息与下一步操作】")
    if failures:
        for f in failures:
            tea_lines.append(f"  [{f.code.value}] {f.message}")
            tea_lines.append(f"    → 可操作建议: {f.action}")
            if f.affected_records:
                tea_lines.append(f"    → 涉及记录: {f.affected_records[:10]}{'...' if len(f.affected_records) > 10 else ''}")
    else:
        tea_lines.append("  无失败")
    tea_lines.append("")
    tea_lines.append("=" * 70)

    tea_path = os.path.join(output_dir, "math_teacher_review.txt")
    with open(tea_path, "w", encoding="utf-8") as f:
        f.write("\n".join(tea_lines) + "\n")

    # 额外导出 CSV 便于二次分析
    df_export = pd.DataFrame([{
        "record_id": r.record_id,
        "silhouette_score": r.score,
        "a_distance": r.a_distance,
        "b_distance": r.b_distance,
        "cluster_label": r.cluster_label,
        "status": r.status.value,
        "source_ref": r.source_ref,
    } for r in results])
    csv_path = os.path.join(output_dir, "silhouette_results.csv")
    df_export.to_csv(csv_path, index=False, encoding="utf-8-sig")

    meta = {
        "generated_at": timestamp,
        "overall_score": overall_score,
        "formula": FORMULA_REFERENCE,
        "status_counts": {
            "usable": len(usable),
            "pending": len(pending),
            "recollect": len(recollect),
        },
        "history_trend": history.trend,
    }
    with open(os.path.join(output_dir, "report_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return comm_path, tea_path


def _executive_summary(overall: float, history: HistoryComparison,
                        n_use: int, n_pend: int, n_recol: int) -> str:
    total = max(n_use + n_pend + n_recol, 1)
    pct = overall
    if pct >= 0.71:
        quality = "聚类结构强，可信度高"
    elif pct >= 0.51:
        quality = "聚类结构合理，可正常使用"
    elif pct >= 0.26:
        quality = "聚类结构较弱，建议复核后使用"
    else:
        quality = "聚类结构不明显，决策时慎用"

    trend = f"，较上批次{history.trend}" if history.delta is not None else ""
    return (
        f"本批次 {total} 条记录，平均轮廓系数 {overall:.3f}（{quality}）{trend}；"
        f"其中 [✓ 可用] {n_use} 条，[? 暂缓] {n_pend} 条，[✗ 重采] {n_recol} 条。"
    )


# ============================================================
# 第九部分：主入口
# ============================================================

def run_pipeline(input_csv: str, history_csv: Optional[str], output_dir: str,
                 skip_stability: bool = False) -> int:
    """完整管线：导入 → 校验 → 计算 → 对比 → 反例 → 报告"""
    print("=" * 60)
    print("  聚类轮廓系数报告工具")
    print("=" * 60)

    all_failures: List[FailureInfo] = []

    print(f"\n[1/6] 导入评分记录: {input_csv}")
    records, fails = load_score_records(input_csv)
    all_failures.extend(fails)
    if not records:
        print("  ✗ 导入失败，已打印原因，终止。")
        _print_failures(fails)
        return 1
    print(f"  ✓ 成功导入 {len(records)} 条记录")

    print("\n[2/6] 数据校验")
    unit_fails = validate_units_consistency(records)
    all_failures.extend(unit_fails)
    print(f"  ✓ 校验完成，发现 {len(unit_fails)} 项单位/量纲问题")

    print("\n[3/6] 计算轮廓系数")
    results, overall_score, sil_fails = compute_silhouette(records)
    all_failures.extend(sil_fails)
    if not results:
        print("  ✗ 轮廓系数无法计算（可能是单簇或样本太少）。")
        _print_failures(sil_fails)
        print("\n[提示] 下一步该做什么:")
        for f in sil_fails:
            print(f"  → {f.action}")
        return 2
    print(f"  ✓ 平均轮廓系数 = {overall_score:.4f}")

    stability_issues: List[StabilityIssue] = []
    if not skip_stability:
        print("\n[4/6] 检测排序稳定性")
        stability_issues = detect_ranking_instability(
            current_results=results,
            records=records,
            perturbation_rounds=20,
        )
        print(f"  ✓ 检测完成，发现 {len(stability_issues)} 项不稳定")

    print("\n[5/6] 历史对比")
    history, hist_fails = compare_with_history(results, overall_score, history_csv)
    all_failures.extend(hist_fails)
    if history.delta is not None:
        print(f"  ✓ 历史平均={history.history_overall:.4f}, 当前={history.current_overall:.4f}, Δ={history.delta:+.4f} ({history.trend})")
    else:
        print(f"  · {history.trend}（跳过详细对比）")

    print("\n[6/6] 生成反例与报告")
    counter_examples = generate_counter_examples(records, results, stability_issues)
    comm_path, tea_path = generate_committee_report(
        records, results, overall_score, stability_issues,
        history, counter_examples, all_failures, output_dir,
    )
    print(f"  ✓ 投委会版报告: {comm_path}")
    print(f"  ✓ 数学老师复核版: {tea_path}")
    print(f"  ✓ 明细 CSV: {os.path.join(output_dir, 'silhouette_results.csv')}")

    print("\n" + "=" * 60)
    print("  处理完成。下一步建议:")
    if any(f.code == FailureCode.MISSING_HISTORY for f in all_failures):
        print("  · 如需历史对比，请补充上批次的 silhouette_results.csv 作为 --history 参数")
    if any(f.code == FailureCode.MISSING_UNIT for f in all_failures):
        print("  · 请补充缺失单位的记录（列名格式: 特征名_unit）")
    if any(f.code in (FailureCode.SINGLE_CLUSTER, FailureCode.SAMPLE_TOO_SMALL) for f in all_failures):
        print("  · 请调整聚类口径或补充更多分属不同簇的记录")
    usable = sum(1 for r in results if r.status == DataStatus.USABLE)
    pending = sum(1 for r in results if r.status == DataStatus.PENDING)
    recollect = sum(1 for r in results if r.status == DataStatus.RECOLLECT)
    print(f"  · 可直接使用: {usable} 条  |  待复核: {pending} 条  |  需重采: {recollect} 条")
    print("=" * 60)
    return 0


def _print_failures(fails: List[FailureInfo]):
    for f in fails:
        print(f"\n  [{f.code.value}] {f.message}")
        print(f"    → 下一步: {f.action}")
        if f.affected_records:
            print(f"    → 涉及: {f.affected_records[:5]}{'...' if len(f.affected_records) > 5 else ''}")


def main():
    parser = argparse.ArgumentParser(
        description="聚类轮廓系数报告工具——导入评分记录，生成投委会与数学老师双版报告。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "示例:\n"
            "  python silhouette_report_tool.py --example                        # 生成示例数据\n"
            "  python silhouette_report_tool.py --input data/example_scores.csv  # 跑完整管线\n"
            "  python silhouette_report_tool.py --input data/scores.csv --history output/silhouette_results.csv\n"
        ),
    )
    parser.add_argument("--input", default=None, help="评分记录 CSV 文件路径（--example 模式下可省略）")
    parser.add_argument("--history", default=None, help="历史批次 silhouette_results.csv 路径（可选）")
    parser.add_argument("--output-dir", default="output", help="报告输出目录（默认 output/）")
    parser.add_argument("--skip-stability", action="store_true", help="跳过排序稳定性检测")
    parser.add_argument("--example", action="store_true", help="生成示例数据文件后退出")
    args = parser.parse_args()

    if args.example:
        _generate_example_data()
        return

    if not args.input:
        parser.error("--input 为必需参数（若仅生成示例，请使用 --example）")

    sys.exit(run_pipeline(args.input, args.history, args.output_dir, args.skip_stability))


def _generate_example_data():
    """生成示例数据文件，帮助用户理解格式"""
    os.makedirs("data", exist_ok=True)
    path = os.path.join("data", "example_scores.csv")
    rows = [
        ["record_id", "cluster_label", "math_score", "math_score_unit",
         "literacy_score", "literacy_score_unit", "source_ref", "remark"],
        ["S001", "1", "88.5", "分", "76.2", "分", "MATH-2024-001", "优秀"],
        ["S002", "1", "91.0", "分", "82.1", "分", "MATH-2024-002", ""],
        ["S003", "1", "85.3", "分", "79.8", "分", "MATH-2024-003", ""],
        ["S004", "2", "62.4", "分", "58.9", "分", "MATH-2024-004", "待观察"],
        ["S005", "2", "58.1", "分", "61.3", "分", "MATH-2024-005", ""],
        ["S006", "2", "55.0", "分", "54.2", "分", "MATH-2024-006", ""],
        ["S007", "3", "73.2", "分", "88.6", "分", "MATH-2024-007", "偏文科"],
        ["S008", "3", "70.8", "分", "92.4", "分", "MATH-2024-008", ""],
        ["S009", "3", "68.9", "分", "71.0", "分", "MATH-2024-009", "边界"],
        ["S010", "1", "87.1", "分", "77.5", "分", "MATH-2024-010", ""],
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerows(rows)
    print(f"示例数据已生成: {path}")
    print("请根据真实情况修改数值、单位和来源材料编号。")


if __name__ == "__main__":
    main()
