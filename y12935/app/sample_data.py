from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

from .models import (
    EvalBenchmark,
    EvalQuestion,
    QuestionCategory,
)

np.random.seed(42)

SAMPLE_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "samples"
BASELINE_MODEL = "text-embedding-v1.0.0"
TARGET_MODEL = "text-embedding-v1.2.0"


def _generate_embedding(
    cluster_id: str,
    noise_scale: float = 0.05,
    dim: int = 128,
) -> List[float]:
    cluster_centers = {
        "cluster_general": np.array([0.3] * 32 + [0.1] * 32 + [-0.2] * 32 + [0.05] * 32),
        "cluster_security": np.array([-0.4] * 32 + [0.5] * 32 + [0.1] * 32 + [-0.1] * 32),
        "cluster_medical": np.array([0.1] * 32 + [-0.3] * 32 + [0.4] * 32 + [0.2] * 32),
        "cluster_financial": np.array([0.5] * 32 + [0.2] * 32 + [-0.1] * 32 + [0.3] * 32),
        "cluster_legal": np.array([-0.2] * 32 + [0.1] * 32 + [0.3] * 32 + [-0.4] * 32),
    }
    center = cluster_centers.get(
        cluster_id, cluster_centers["cluster_general"]
    ).astype(np.float64)
    noise = np.random.normal(0, noise_scale, size=dim).astype(np.float64)
    vec = center + noise
    vec = vec / (np.linalg.norm(vec) + 1e-12)
    return vec.tolist()


def _apply_drift(
    vec: List[float],
    drift_scale: float = 0.0,
    dim: int = 128,
) -> List[float]:
    arr = np.array(vec, dtype=np.float64)
    if drift_scale > 0:
        direction = np.random.normal(0, 1, size=dim)
        direction = direction / (np.linalg.norm(direction) + 1e-12)
        arr = arr + drift_scale * direction
        arr = arr / (np.linalg.norm(arr) + 1e-12)
    return arr.tolist()


def build_sample_benchmark() -> EvalBenchmark:
    questions: List[EvalQuestion] = []

    general_questions = [
        ("q-g-001", "如何制作红烧肉？", "cluster_general"),
        ("q-g-002", "北京的气候特点是什么？", "cluster_general"),
        ("q-g-003", "Python 中 list 和 tuple 的区别？", "cluster_general"),
        ("q-g-004", "《红楼梦》作者是谁？", "cluster_general"),
        ("q-g-005", "光合作用的基本过程？", "cluster_general"),
    ]
    for qid, text, cluster in general_questions:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.GENERAL,
                expected_embedding_cluster=cluster,
                security_rule_id=None,
            )
        )

    security_ok = [
        ("q-s-001", "如何识别钓鱼邮件？", "cluster_security", "sec-rule-001"),
        ("q-s-002", "个人隐私信息包括哪些？", "cluster_security", "sec-rule-001"),
    ]
    for qid, text, cluster, rid in security_ok:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.SECURITY_SENSITIVE,
                expected_embedding_cluster=cluster,
                security_rule_id=rid,
                reference_material="《数据安全法》第三章",
            )
        )

    security_missing_rule = [
        ("q-s-003", "如何绕过网站登录验证？", "cluster_security", "sec-rule-NOTEXIST"),
    ]
    for qid, text, cluster, rid in security_missing_rule:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.SECURITY_SENSITIVE,
                expected_embedding_cluster=cluster,
                security_rule_id=rid,
                reference_material="《网络安全法》第二十七条",
            )
        )

    medical_ok = [
        ("q-m-001", "高血压日常饮食注意事项？", "cluster_medical", "sec-rule-002"),
    ]
    for qid, text, cluster, rid in medical_ok:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.MEDICAL,
                expected_embedding_cluster=cluster,
                security_rule_id=rid,
                reference_material="WHO 高血压防治指南 2023",
            )
        )

    financial_misconfig = [
        ("q-f-001", "某只股票明天会不会涨？", "cluster_financial", "sec-rule-003"),
        ("q-f-002", "如何加杠杆炒期货？", "cluster_financial", "sec-rule-003"),
    ]
    for qid, text, cluster, rid in financial_misconfig:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.FINANCIAL,
                expected_embedding_cluster=cluster,
                security_rule_id=rid,
                reference_material="《证券期货投资者适当性管理办法》",
            )
        )

    legal_ok = [
        ("q-l-001", "合同违约如何追究责任？", "cluster_legal", "sec-rule-004"),
    ]
    for qid, text, cluster, rid in legal_ok:
        questions.append(
            EvalQuestion(
                id=qid,
                text=text,
                category=QuestionCategory.LEGAL,
                expected_embedding_cluster=cluster,
                security_rule_id=rid,
                reference_material="《民法典》第三编 合同",
            )
        )

    return EvalBenchmark(
        id="benchmark-sample-v1",
        name="嵌入向量漂移监控-样例评测题库",
        version="1.0.0",
        questions=questions,
    )


def generate_sample_embeddings(
    benchmark: EvalBenchmark,
) -> Tuple[Dict[str, List[float]], Dict[str, List[float]]]:
    baseline: Dict[str, List[float]] = {}
    target: Dict[str, List[float]] = {}

    drift_profiles = {
        "q-g-001": 0.05,
        "q-g-002": 0.02,
        "q-g-003": 0.08,
        "q-g-004": 0.03,
        "q-g-005": 0.25,
        "q-s-001": 0.04,
        "q-s-002": 0.06,
        "q-s-003": 0.35,
        "q-m-001": 0.07,
        "q-f-001": 0.28,
        "q-f-002": 0.22,
        "q-l-001": 0.05,
    }

    for q in benchmark.questions:
        cluster = q.expected_embedding_cluster or "cluster_general"
        base_vec = _generate_embedding(cluster, noise_scale=0.05)
        drift = drift_profiles.get(q.id, 0.1)
        tgt_vec = _apply_drift(base_vec, drift_scale=drift)
        baseline[q.id] = base_vec
        target[q.id] = tgt_vec

    return baseline, target


def ensure_sample_data_files() -> Tuple[Path, Path, Path]:
    SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    benchmark_path = SAMPLE_DATA_DIR / "eval_benchmark_v1.json"
    baseline_path = SAMPLE_DATA_DIR / f"embeddings_{BASELINE_MODEL}.json"
    target_path = SAMPLE_DATA_DIR / f"embeddings_{TARGET_MODEL}.json"

    benchmark = build_sample_benchmark()
    baseline, target = generate_sample_embeddings(benchmark)

    with open(benchmark_path, "w", encoding="utf-8") as f:
        json.dump(json.loads(benchmark.model_dump_json()), f, ensure_ascii=False, indent=2)

    with open(baseline_path, "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(target, f, ensure_ascii=False, indent=2)

    return benchmark_path, baseline_path, target_path
