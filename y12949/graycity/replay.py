"""评测回放。

不是一次性判断：每次调用都从当前模型日志重新回放。
模型日志补录后（store.load_model_logs 会合并补录），再次回放即可得到更新后的结果，
灰度对比也会跟着用最新 EvalResult 重算。
"""

from __future__ import annotations

from typing import Optional

from graycity.models import EvalResult, ModelLog, TrainingSample
from graycity.store import DataStore, MAX_LEN


def run(store: DataStore, supplement_path: Optional[str] = None) -> list[EvalResult]:
    """从当前模型日志回放评测。supplement_path 指定补录文件，会让结果更新。"""
    logs = store.load_model_logs(supplement_path)
    log_by_id = {l.sample_id: l for l in logs}
    results: list[EvalResult] = []

    for sample in store.samples:
        log = log_by_id.get(sample.id)
        if log is None:
            results.append(_missing(sample))
            continue
        results.append(_eval(sample, log))
    return results


def _eval(sample: TrainingSample, log: ModelLog) -> EvalResult:
    # 日志不完整：标记为待补录，不参与转化率，但要让平台工程师看到
    if not log.complete or not log.prediction:
        return EvalResult(
            sample_id=sample.id,
            city=sample.city,
            version=log.version,
            prediction="",
            score=log.score,
            correct=False,
            truncated=sample.truncated,
            blocked=True,
            reason="模型日志未补录(prediction 缺失)",
        )

    # 截断样本：被拦下，不计入转化率，但要解释为何被拦
    if sample.truncated or log.truncated:
        return EvalResult(
            sample_id=sample.id,
            city=sample.city,
            version=log.version,
            prediction=log.prediction,
            score=log.score,
            correct=(log.prediction == sample.label),
            truncated=True,
            blocked=True,
            reason=f"长文本截断(length={sample.length}>max_len={MAX_LEN})，尾部信息丢失",
        )

    correct = log.prediction == sample.label
    return EvalResult(
        sample_id=sample.id,
        city=sample.city,
        version=log.version,
        prediction=log.prediction,
        score=log.score,
        correct=correct,
        truncated=False,
        blocked=False,
        reason="" if correct else "预测与标注不一致(改口径候选)",
    )


def _missing(sample: TrainingSample) -> EvalResult:
    return EvalResult(
        sample_id=sample.id,
        city=sample.city,
        version=sample.prompt_version,
        prediction="",
        score=0.0,
        correct=False,
        truncated=sample.truncated,
        blocked=True,
        reason="无模型日志(待补录)",
    )


def pending_backfill(results: list[EvalResult]) -> list[EvalResult]:
    """返回待补录日志的样本，供异常分类与报告高亮。"""
    return [r for r in results if r.blocked and "补录" in r.reason]
