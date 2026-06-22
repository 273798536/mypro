import math
import random
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import numpy as np

from models import (
    ErrorQuestionSample,
    SampleStatus,
    SamplingParams,
    SamplingResult,
    SamplingIntermediate,
    SamplingMethod,
)


def _calculate_sample_size(
    population_size: int,
    params: SamplingParams,
) -> Tuple[int, List[SamplingIntermediate]]:
    steps: List[SamplingIntermediate] = []

    if params.sample_size is not None:
        step = SamplingIntermediate(
            step_name="样本量确定-用户指定",
            formula="n = 用户指定 sample_size",
            variables={"sample_size": params.sample_size},
            unit_check={"sample_size": "个(样本数，无量纲)"},
            result_value=min(params.sample_size, population_size),
        )
        steps.append(step)
        return min(params.sample_size, population_size), steps

    if params.sample_ratio is not None:
        n = int(math.ceil(population_size * params.sample_ratio))
        step = SamplingIntermediate(
            step_name="样本量确定-比例法",
            formula="n = ⌈N × p⌉",
            variables={
                "N": population_size,
                "p": params.sample_ratio,
                "N × p": population_size * params.sample_ratio,
            },
            unit_check={
                "N": "个(总体样本数)",
                "p": "比例(无量纲)",
                "n": "个(抽样数)",
            },
            result_value=n,
        )
        steps.append(step)
        return n, steps

    cl = params.confidence_level
    e = params.margin_of_error
    z_map = {0.80: 1.28, 0.85: 1.44, 0.90: 1.645, 0.95: 1.96, 0.99: 2.576, 0.999: 3.291}
    z = z_map.get(cl, 1.96)
    p_hat = 0.5

    n0 = (z ** 2 * p_hat * (1 - p_hat)) / (e ** 2)
    step1 = SamplingIntermediate(
        step_name="样本量确定-Cochran公式(无限总体)",
        formula="n₀ = (Z² × p̂ × (1-p̂)) / e²",
        variables={
            "Z": z,
            "置信水平": cl,
            "p̂": p_hat,
            "e": e,
            "Z²": z ** 2,
            "p̂×(1-p̂)": p_hat * (1 - p_hat),
            "e²": e ** 2,
        },
        unit_check={
            "Z": "标准正态分位数(无量纲)",
            "p̂": "预期比例(无量纲)",
            "e": "边际误差(无量纲)",
            "n₀": "个(初步样本量)",
        },
        result_value=round(n0, 4),
    )
    steps.append(step1)

    if population_size > 0:
        n_fpc = n0 / (1 + (n0 - 1) / population_size)
        step2 = SamplingIntermediate(
            step_name="样本量确定-有限总体校正(FPC)",
            formula="n = n₀ / (1 + (n₀ - 1) / N)",
            variables={
                "n₀": round(n0, 4),
                "N": population_size,
                "(n₀-1)/N": round((n0 - 1) / population_size, 6),
            },
            unit_check={
                "n₀": "个",
                "N": "个",
                "n": "个(校正后样本量)",
            },
            result_value=round(n_fpc, 4),
        )
        steps.append(step2)
        final_n = int(math.ceil(n_fpc))
    else:
        final_n = int(math.ceil(n0))

    step3 = SamplingIntermediate(
        step_name="样本量确定-向上取整",
        formula="n_final = ⌈n⌉",
        variables={"n": final_n},
        unit_check={"n_final": "个"},
        result_value=final_n,
    )
    steps.append(step3)
    return final_n, steps


def _filter_eligible_samples(
    samples: List[ErrorQuestionSample],
    params: SamplingParams,
) -> Tuple[List[ErrorQuestionSample], List[Dict[str, Any]]]:
    excluded = []
    eligible = []

    for s in samples:
        if s.status in params.exclude_status:
            excluded.append({
                "sample_id": s.sample_id,
                "status": s.status.value,
                "reason": f"状态 {s.status.value} 在排除列表 params.exclude_status 中",
            })
            continue
        if s.status == SampleStatus.BOUNDARY_OUTLIER and not params.include_boundary:
            excluded.append({
                "sample_id": s.sample_id,
                "status": s.status.value,
                "reason": "边界样本且 params.include_boundary=False",
            })
            continue
        eligible.append(s)

    return eligible, excluded


def _simple_random_sampling(
    eligible: List[ErrorQuestionSample],
    n: int,
    seed: Optional[int],
) -> List[ErrorQuestionSample]:
    rng = random.Random(seed) if seed is not None else random.Random()
    population = list(eligible)
    if n >= len(population):
        return population
    return rng.sample(population, n)


def _stratified_sampling(
    eligible: List[ErrorQuestionSample],
    n: int,
    stratify_by: str,
    seed: Optional[int],
) -> Tuple[List[ErrorQuestionSample], Dict[str, Dict[str, int]]]:
    rng = random.Random(seed) if seed is not None else random.Random()
    strata: Dict[str, List[ErrorQuestionSample]] = defaultdict(list)

    for s in eligible:
        key = getattr(s, stratify_by, None) or "__missing__"
        strata[str(key)].append(s)

    total = len(eligible)
    distribution: Dict[str, Dict[str, int]] = {}
    selected: List[ErrorQuestionSample] = []
    remaining = n
    strata_items = sorted(strata.items())

    for idx, (stratum_key, stratum_samples) in enumerate(strata_items):
        stratum_size = len(stratum_samples)
        if idx == len(strata_items) - 1:
            alloc = remaining
        else:
            alloc = max(1, int(round(n * stratum_size / total))) if total > 0 else 0

        alloc = min(alloc, stratum_size)
        remaining -= alloc

        picked = rng.sample(stratum_samples, alloc) if alloc < stratum_size else list(stratum_samples)
        selected.extend(picked)
        distribution[stratum_key] = {
            "population": stratum_size,
            "allocated": alloc,
            "selected": len(picked),
        }

    return selected, distribution


def _systematic_sampling(
    eligible: List[ErrorQuestionSample],
    n: int,
    seed: Optional[int],
) -> List[ErrorQuestionSample]:
    rng = random.Random(seed) if seed is not None else random.Random()
    N = len(eligible)
    if n >= N:
        return list(eligible)
    k = N // n
    start = rng.randint(0, k - 1)
    return [eligible[start + i * k] for i in range(n) if start + i * k < N]


def _cluster_sampling(
    eligible: List[ErrorQuestionSample],
    n: int,
    seed: Optional[int],
) -> Tuple[List[ErrorQuestionSample], Dict[str, Dict[str, int]]]:
    rng = random.Random(seed) if seed is not None else random.Random()
    clusters: Dict[str, List[ErrorQuestionSample]] = defaultdict(list)

    for s in eligible:
        key = s.class_id or "__no_class__"
        clusters[key].append(s)

    cluster_keys = list(clusters.keys())
    if n >= len(eligible):
        distribution = {
            k: {"population": len(v), "allocated": len(v), "selected": len(v)}
            for k, v in clusters.items()
        }
        return list(eligible), distribution

    avg_cluster_size = len(eligible) / max(len(cluster_keys), 1)
    clusters_to_pick = max(1, int(math.ceil(n / avg_cluster_size)))
    clusters_to_pick = min(clusters_to_pick, len(cluster_keys))

    picked_keys = rng.sample(cluster_keys, clusters_to_pick)
    selected: List[ErrorQuestionSample] = []
    distribution: Dict[str, Dict[str, int]] = {}

    for k in cluster_keys:
        pop = len(clusters[k])
        if k in picked_keys:
            selected.extend(clusters[k])
            distribution[k] = {"population": pop, "allocated": pop, "selected": pop}
        else:
            distribution[k] = {"population": pop, "allocated": 0, "selected": 0}

    return selected, distribution


def run_sampling(
    samples: List[ErrorQuestionSample],
    params: SamplingParams,
) -> SamplingResult:
    result = SamplingResult(params=params)

    eligible, excluded = _filter_eligible_samples(samples, params)
    result.total_eligible = len(eligible)
    result.excluded_from_sampling = excluded

    n, size_steps = _calculate_sample_size(len(eligible), params)
    result.intermediate_steps.extend(size_steps)
    result.sample_size_used = n
    if params.sample_ratio is not None:
        result.sample_ratio_used = params.sample_ratio
    elif params.sample_size is None and len(eligible) > 0:
        result.sample_ratio_used = round(n / len(eligible), 4)

    stratify_distribution = {}

    if params.method == SamplingMethod.SIMPLE_RANDOM:
        method_step = SamplingIntermediate(
            step_name="抽样方法-简单随机抽样",
            formula="从 N 个合格样本中随机抽取 n 个，每个样本入样概率 = n/N",
            variables={"N": len(eligible), "n": n, "入样概率": round(n / len(eligible), 4) if eligible else 0},
            unit_check={"N": "个", "n": "个", "入样概率": "无量纲"},
        )
        result.intermediate_steps.append(method_step)
        selected = _simple_random_sampling(eligible, n, params.random_seed)

    elif params.method == SamplingMethod.STRATIFIED:
        stratify_field = params.stratify_by or "class_id"
        method_step = SamplingIntermediate(
            step_name="抽样方法-分层抽样",
            formula=f"按字段 '{stratify_field}' 分层，每层按比例分配 n_h = n × N_h / N",
            variables={"stratify_by": stratify_field, "N": len(eligible), "n": n},
        )
        result.intermediate_steps.append(method_step)
        selected, stratify_distribution = _stratified_sampling(
            eligible, n, stratify_field, params.random_seed
        )

    elif params.method == SamplingMethod.SYSTEMATIC:
        N = len(eligible)
        k = N // n if n > 0 and N > 0 else 0
        method_step = SamplingIntermediate(
            step_name="抽样方法-系统抽样",
            formula="抽样间隔 k = N/n，随机起点 r ∈ [0, k-1]，选中 r, r+k, r+2k, ...",
            variables={"N": N, "n": n, "k": k},
            unit_check={"k": "个(间隔)"},
        )
        result.intermediate_steps.append(method_step)
        selected = _systematic_sampling(eligible, n, params.random_seed)

    elif params.method == SamplingMethod.CLUSTER:
        method_step = SamplingIntermediate(
            step_name="抽样方法-整群抽样",
            formula="按 class_id 分群，随机抽取若干群，群内全部入样",
            variables={"N": len(eligible), "n": n},
        )
        result.intermediate_steps.append(method_step)
        selected, stratify_distribution = _cluster_sampling(eligible, n, params.random_seed)

    else:
        selected = _simple_random_sampling(eligible, n, params.random_seed)

    result.selected_ids = [s.sample_id for s in selected]
    result.stratify_distribution = stratify_distribution
    result.selected_samples = [
        {
            "sample_id": s.sample_id,
            "raw_row_no": s.raw_row_no,
            "student_id": s.student_id,
            "student_name": s.student_name,
            "class_id": s.class_id,
            "error_question_count": s.error_question_count,
            "error_question_count_unit": s.error_question_count_unit,
            "error_score": s.error_score,
            "error_score_unit": s.error_score_unit,
            "remark": s.remark,
            "status": s.status.value,
        }
        for s in selected
    ]

    result.summary = {
        "total_input": len(samples),
        "eligible_for_sampling": len(eligible),
        "excluded_before_sampling": len(excluded),
        "sample_size_target": n,
        "sample_size_actual": len(selected),
        "sampling_method": params.method.value,
        "achieved_ratio": round(len(selected) / len(eligible), 4) if eligible else 0,
    }

    return result
