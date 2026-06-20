from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .models import EvaluationRun, EvaluationRecord, ManualJudgment
from . import schemas


def compare_runs(db: Session, run_a_id: int, run_b_id: int) -> Dict[str, Any]:
    run_a = db.query(EvaluationRun).filter(EvaluationRun.id == run_a_id).first()
    run_b = db.query(EvaluationRun).filter(EvaluationRun.id == run_b_id).first()

    if not run_a or not run_b:
        raise ValueError("指定的评测批次不存在")

    recs_a = db.query(EvaluationRecord).filter(
        EvaluationRecord.run_id == run_a_id,
        EvaluationRecord.is_archived == False,
    ).all()
    recs_b = db.query(EvaluationRecord).filter(
        EvaluationRecord.run_id == run_b_id,
        EvaluationRecord.is_archived == False,
    ).all()

    map_a = {r.query_id: r for r in recs_a}
    map_b = {r.query_id: r for r in recs_b}

    qids_a = set(map_a.keys())
    qids_b = set(map_b.keys())
    common = qids_a & qids_b
    only_a = qids_a - qids_b
    only_b = qids_b - qids_a

    metric_fields = ["recall_rate", "precision", "f1", "mrr", "ndcg", "map", "hit_rate"]
    metric_diffs = []

    for field in metric_fields:
        vals_a = [map_a[q].metrics.get(field) for q in common if isinstance(map_a[q].metrics, dict) and field in map_a[q].metrics]
        vals_b = [map_b[q].metrics.get(field) for q in common if isinstance(map_b[q].metrics, dict) and field in map_b[q].metrics]
        if vals_a and vals_b:
            avg_a = sum(v for v in vals_a if isinstance(v, (int, float))) / max(1, len(vals_a))
            avg_b = sum(v for v in vals_b if isinstance(v, (int, float))) / max(1, len(vals_b))
            metric_diffs.append({
                "metric": field,
                f"avg_v{run_a.model_version}": round(avg_a, 4),
                f"avg_v{run_b.model_version}": round(avg_b, 4),
                "delta": round(avg_b - avg_a, 4),
            })

    query_diffs = []
    for qid in common:
        a = map_a[qid]
        b = map_b[qid]
        metrics_diff = {}
        for field in metric_fields:
            va = a.metrics.get(field) if isinstance(a.metrics, dict) else None
            vb = b.metrics.get(field) if isinstance(b.metrics, dict) else None
            if isinstance(va, (int, float)) and isinstance(vb, (int, float)) and abs(va - vb) > 1e-6:
                metrics_diff[field] = {"before": va, "after": vb, "delta": round(vb - va, 4)}
        if metrics_diff or a.recalled_docs != b.recalled_docs:
            query_diffs.append({
                "query_id": qid,
                "query_text": a.query_text or b.query_text,
                "metrics_diff": metrics_diff,
                "recalled_changed": a.recalled_docs != b.recalled_docs,
                "recalled_a": a.recalled_docs,
                "recalled_b": b.recalled_docs,
                "anomaly_a": a.anomaly_flag,
                "anomaly_b": b.anomaly_flag,
            })

    return {
        "run_a_id": run_a_id,
        "run_b_id": run_b_id,
        "model_a": run_a.model_version,
        "model_b": run_b.model_version,
        "total_queries": len(qids_a | qids_b),
        "common_queries": len(common),
        "only_in_a": len(only_a),
        "only_in_b": len(only_b),
        "only_a_queries": sorted(list(only_a)),
        "only_b_queries": sorted(list(only_b)),
        "metric_diffs": metric_diffs,
        "query_diffs": query_diffs,
    }


def get_dashboard_stats(db: Session) -> Dict[str, Any]:
    total_runs = db.query(EvaluationRun).count()
    total_records = db.query(EvaluationRecord).count()
    total_judgments = db.query(ManualJudgment).count()
    open_anomalies = db.query(EvaluationRecord).filter(
        EvaluationRecord.anomaly_flag != "",
        EvaluationRecord.is_archived == False,
    ).count()

    model_versions = [
        r[0] for r in db.query(EvaluationRun.model_version).distinct().order_by(EvaluationRun.created_at.desc()).all()
    ]

    recent_runs = db.query(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(10).all()
    recent = []
    for r in recent_runs:
        cnt = db.query(EvaluationRecord).filter(EvaluationRecord.run_id == r.id).count()
        recent.append({
            "id": r.id,
            "model_version": r.model_version,
            "evaluator": r.evaluator,
            "source_file": r.source_file,
            "original_filename": r.original_filename,
            "status": r.status,
            "notes": r.notes,
            "created_at": r.created_at,
            "record_count": cnt,
        })

    return {
        "total_runs": total_runs,
        "total_records": total_records,
        "total_judgments": total_judgments,
        "open_anomalies": open_anomalies,
        "model_versions": model_versions,
        "recent_runs": recent,
    }
