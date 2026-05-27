from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from bayesian_ab.anomaly import detect_all
from bayesian_ab.engine import compute_all, compute_posterior, credible_interval, probability_better_than, expected_lift, expected_loss
from bayesian_ab.models import (
    AnomalyRecord,
    AnomalyLevel,
    Experiment,
    ExperimentCreate,
    ExperimentListResponse,
    ExperimentResult,
    ExperimentUpdate,
    PosteriorStats,
    RevisionRecord,
)
from bayesian_ab.report import generate_report
from bayesian_ab.storage import store

app = FastAPI(
    title="Bayesian A/B 复盘 API",
    description="贝叶斯 A/B 实验复盘服务 - 后验计算 / 可信区间 / 胜率解释 / 异常检测 / 历史追踪 / 报告导出",
    version="0.1.0",
)


@app.post("/experiments", response_model=Experiment, status_code=201, summary="创建实验")
def create_experiment(data: ExperimentCreate) -> Experiment:
    """导入一组变体数据创建新的贝叶斯 A/B 实验。"""
    exp = store.create(data)
    _compute_and_store(exp)
    return store.get(exp.id)


@app.get("/experiments", response_model=List[ExperimentListResponse], summary="实验列表")
def list_experiments() -> List[ExperimentListResponse]:
    """返回所有实验的摘要列表。"""
    results = []
    for exp in store.list_all():
        results.append(
            ExperimentListResponse(
                id=exp.id,
                source_name=exp.source.name,
                variant_count=len(exp.variants),
                total_exposures=sum(v.exposures for v in exp.variants),
                created_at=exp.created_at,
                updated_at=exp.updated_at,
                current_version=exp.current_version,
            )
        )
    return results


@app.get("/experiments/{experiment_id}", response_model=Experiment, summary="实验详情")
def get_experiment(experiment_id: str) -> Experiment:
    """获取单个实验的完整信息，包括最近一次计算结果。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    return exp


@app.put("/experiments/{experiment_id}", response_model=Experiment, summary="更新实验")
def update_experiment(experiment_id: str, data: ExperimentUpdate) -> Experiment:
    """更新实验数据，自动记录修正痕迹并重新计算。"""
    exp = store.update(experiment_id, data)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    _compute_and_store(exp)
    return store.get(experiment_id)


@app.delete("/experiments/{experiment_id}", status_code=204, summary="删除实验")
def delete_experiment(experiment_id: str) -> None:
    """删除实验。"""
    if not store.delete(experiment_id):
        raise HTTPException(status_code=404, detail="实验不存在")


@app.post("/experiments/{experiment_id}/compute", response_model=ExperimentResult, summary="重新计算")
def recompute(experiment_id: str) -> ExperimentResult:
    """手动触发重新计算，返回最新结果。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    result = _compute_and_store(exp)
    return result


@app.get("/experiments/{experiment_id}/result", response_model=ExperimentResult, summary="最新结果")
def get_result(experiment_id: str) -> ExperimentResult:
    """获取最近一次计算结果。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    if exp.last_result is None:
        raise HTTPException(status_code=404, detail="尚未计算结果")
    return exp.last_result


@app.get("/experiments/{experiment_id}/history", response_model=List[RevisionRecord], summary="修正历史")
def get_history(experiment_id: str) -> List[RevisionRecord]:
    """获取实验的修正历史，保留所有数据快照。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    return exp.revisions


@app.get("/experiments/{experiment_id}/report", summary="导出报告")
def export_report(
    experiment_id: str,
    format: str = Query("json", pattern="^(json|csv)$", description="报告格式"),
) -> Response:
    """导出复盘报告，支持 JSON 和 CSV 两种格式。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    if exp.last_result is None:
        raise HTTPException(status_code=404, detail="尚未计算结果，无法生成报告")

    content, media_type = generate_report(exp, exp.last_result, fmt=format)
    ext = "csv" if format == "csv" else "json"
    filename = f"bayesian_ab_{experiment_id}_v{exp.current_version}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"

    return Response(
        content=content if isinstance(content, str) else content.decode("utf-8"),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Experiment-Id": experiment_id,
            "X-Experiment-Version": str(exp.current_version),
        },
    )


@app.get("/experiments/{experiment_id}/anomalies", response_model=List[AnomalyRecord], summary="异常列表")
def get_anomalies(experiment_id: str) -> List[AnomalyRecord]:
    """获取当前实验的所有异常检测记录。"""
    exp = store.get(experiment_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="实验不存在")
    if exp.last_result is None:
        raise HTTPException(status_code=404, detail="尚未计算结果")
    return exp.last_result.anomalies


@app.get("/health", summary="健康检查")
def health() -> dict:
    return {"status": "ok", "version": "0.1.0", "experiments_count": len(store.list_all())}


def _compute_and_store(exp: Experiment) -> ExperimentResult:
    posts, summary, matrix = compute_all(exp.variants)

    posterior_stats: List[PosteriorStats] = []
    baseline = posts[0]
    for post in posts:
        ci_lower, ci_upper = credible_interval(post)
        posterior_stats.append(
            PosteriorStats(
                variant=post.variant,
                posterior_mean=post.mean,
                posterior_median=post.median,
                ci_lower=ci_lower,
                ci_upper=ci_upper,
                probability_better_than_baseline=probability_better_than(post, baseline),
                expected_lift=expected_lift(post, baseline),
                risk=expected_loss(post, baseline),
                sample_size=post.sample_size,
                conversions=post.conversions,
                observed_rate=post.observed_rate,
                prior_alpha=post.prior_alpha,
                prior_beta=post.prior_beta,
            )
        )

    anomalies = detect_all(
        exp.variants,
        posts,
        exp.stop_date,
        exp.planned_stop_date,
    )

    critical = [a for a in anomalies if a.level == AnomalyLevel.CRITICAL]
    warnings = [a for a in anomalies if a.level == AnomalyLevel.WARNING]

    recommended = None
    confidence = None
    if not critical:
        best = max(posterior_stats[1:], key=lambda s: s.probability_better_than_baseline, default=None)
        if best and best.probability_better_than_baseline >= 0.8:
            recommended = best.variant
            if best.probability_better_than_baseline >= 0.95:
                confidence = "high"
            elif best.probability_better_than_baseline >= 0.85:
                confidence = "medium"
            else:
                confidence = "low"

    result = ExperimentResult(
        experiment_id=exp.id,
        version=exp.current_version,
        computed_at=datetime.now(timezone.utc),
        posterior_stats=posterior_stats,
        win_probability_matrix=matrix,
        anomalies=anomalies,
        recommended_variant=recommended,
        recommendation_confidence=confidence,
    )
    store.set_result(exp.id, result)
    return result