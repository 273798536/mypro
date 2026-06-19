import sqlite3
import json
from typing import List, Dict, Optional, Any, Tuple
from contextlib import contextmanager
from .schema import get_connection, init_db


@contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def add_model(model_name: str, model_version: str, description: str = "") -> int:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO models (model_name, model_version, description) VALUES (?, ?, ?)",
            (model_name, model_version, description)
        )
        cursor.execute(
            "SELECT id FROM models WHERE model_name = ? AND model_version = ?",
            (model_name, model_version)
        )
        return cursor.fetchone()["id"]


def get_all_models() -> List[Dict]:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM models ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]


def add_eval_run(
    model_id: int,
    run_name: str,
    threshold: float,
    dataset_name: str = "",
    description: str = ""
) -> int:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO eval_runs (model_id, run_name, threshold, dataset_name, description) VALUES (?, ?, ?, ?, ?)",
            (model_id, run_name, threshold, dataset_name, description)
        )
        cursor.execute(
            "SELECT id FROM eval_runs WHERE model_id = ? AND run_name = ?",
            (model_id, run_name)
        )
        return cursor.fetchone()["id"]


def get_eval_runs(model_id: Optional[int] = None) -> List[Dict]:
    with db_session() as conn:
        cursor = conn.cursor()
        if model_id:
            cursor.execute(
                "SELECT er.*, m.model_name, m.model_version FROM eval_runs er "
                "JOIN models m ON er.model_id = m.id WHERE er.model_id = ? ORDER BY er.created_at DESC",
                (model_id,)
            )
        else:
            cursor.execute(
                "SELECT er.*, m.model_name, m.model_version FROM eval_runs er "
                "JOIN models m ON er.model_id = m.id ORDER BY er.created_at DESC"
            )
        return [dict(row) for row in cursor.fetchall()]


def get_run_detail(run_id: int) -> Optional[Dict]:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT er.*, m.model_name, m.model_version FROM eval_runs er "
            "JOIN models m ON er.model_id = m.id WHERE er.id = ?",
            (run_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def _get_sample_global_id(sample_id: str) -> str:
    return f"global_{sample_id}"


def add_eval_sample(
    run_id: int,
    sample_id: str,
    score: float,
    predicted_label: int,
    true_label: int,
    query_text: str = "",
    expected_result: str = "",
    actual_result: str = "",
    is_boundary: bool = False,
    source_file: str = "",
    source_row: Optional[int] = None,
    raw_object: Optional[Dict] = None
) -> int:
    raw_json = json.dumps(raw_object, ensure_ascii=False) if raw_object else None
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR IGNORE INTO eval_samples 
               (run_id, sample_id, query_text, expected_result, actual_result, 
                score, predicted_label, true_label, is_boundary, source_file, source_row, raw_object)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (run_id, sample_id, query_text, expected_result, actual_result,
             score, predicted_label, true_label, 1 if is_boundary else 0,
             source_file, source_row, raw_json)
        )
        cursor.execute(
            "SELECT id FROM eval_samples WHERE run_id = ? AND sample_id = ?",
            (run_id, sample_id)
        )
        return cursor.fetchone()["id"]


def get_samples(
    run_id: Optional[int] = None,
    only_contaminated: bool = False,
    only_boundary: bool = False,
    has_manual_judgment: Optional[bool] = None
) -> List[Dict]:
    with db_session() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                es.*,
                mj.judge_label as manual_label,
                mj.judge_reason,
                mj.judge_name,
                mj.updated_at as judgment_updated_at,
                cf.contamination_type,
                cf.description as contamination_desc
            FROM eval_samples es
            LEFT JOIN manual_judgments mj ON mj.sample_global_id = ? || es.sample_id
            LEFT JOIN contamination_flags cf ON cf.sample_id = es.id
        """
        params: List[Any] = ["global_"]
        conditions = []
        if run_id:
            conditions.append("es.run_id = ?")
            params.append(run_id)
        if only_contaminated:
            conditions.append("cf.id IS NOT NULL")
        if only_boundary:
            conditions.append("es.is_boundary = 1")
        if has_manual_judgment is True:
            conditions.append("mj.id IS NOT NULL")
        elif has_manual_judgment is False:
            conditions.append("mj.id IS NULL")
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY es.id"
        cursor.execute(query, params)
        results = []
        for row in cursor.fetchall():
            d = dict(row)
            if d.get("raw_object"):
                try:
                    d["raw_object"] = json.loads(d["raw_object"])
                except (json.JSONDecodeError, TypeError):
                    pass
            d["is_boundary"] = bool(d.get("is_boundary", 0))
            d["has_contamination"] = d.get("contamination_type") is not None
            d["has_manual_judgment"] = d.get("manual_label") is not None
            if d["has_manual_judgment"]:
                d["manual_label"] = int(d["manual_label"])
            results.append(d)
        return results


def upsert_manual_judgment(
    sample_id: str,
    judge_label: int,
    judge_reason: str = "",
    judge_name: str = ""
) -> int:
    global_id = _get_sample_global_id(sample_id)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO manual_judgments (sample_global_id, sample_id, judge_label, judge_reason, judge_name, updated_at)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(sample_global_id) DO UPDATE SET
                   judge_label = excluded.judge_label,
                   judge_reason = excluded.judge_reason,
                   judge_name = excluded.judge_name,
                   updated_at = CURRENT_TIMESTAMP""",
            (global_id, sample_id, judge_label, judge_reason, judge_name)
        )
        cursor.execute("SELECT id FROM manual_judgments WHERE sample_global_id = ?", (global_id,))
        return cursor.fetchone()["id"]


def get_manual_judgment(sample_id: str) -> Optional[Dict]:
    global_id = _get_sample_global_id(sample_id)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM manual_judgments WHERE sample_global_id = ?", (global_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def flag_contamination(
    sample_db_id: int,
    run_id: int,
    contamination_type: str,
    description: str = "",
    flagged_by: str = ""
) -> int:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR REPLACE INTO contamination_flags 
               (sample_id, run_id, contamination_type, description, flagged_by)
               VALUES (?, ?, ?, ?, ?)""",
            (sample_db_id, run_id, contamination_type, description, flagged_by)
        )
        cursor.execute("SELECT id FROM contamination_flags WHERE sample_id = ?", (sample_db_id,))
        return cursor.fetchone()["id"]


def unflag_contamination(sample_db_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM contamination_flags WHERE sample_id = ?", (sample_db_id,))


def add_run_metric(run_id: int, metric_name: str, metric_value: float):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR REPLACE INTO run_metrics (run_id, metric_name, metric_value)
               VALUES (?, ?, ?)""",
            (run_id, metric_name, metric_value)
        )


def get_run_metrics(run_id: int) -> Dict[str, float]:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT metric_name, metric_value FROM run_metrics WHERE run_id = ?", (run_id,))
        return {row["metric_name"]: row["metric_value"] for row in cursor.fetchall()}


def compute_and_save_run_metrics(run_id: int, threshold: float):
    samples = get_samples(run_id=run_id)
    if not samples:
        return {}
    tp = fp = tn = fn = 0
    for s in samples:
        pred = 1 if s["score"] >= threshold else 0
        true = s["true_label"]
        if pred == 1 and true == 1:
            tp += 1
        elif pred == 1 and true == 0:
            fp += 1
        elif pred == 0 and true == 0:
            tn += 1
        else:
            fn += 1
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    metrics = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tp": float(tp),
        "fp": float(fp),
        "tn": float(tn),
        "fn": float(fn),
        "total": float(total)
    }
    for k, v in metrics.items():
        add_run_metric(run_id, k, v)
    return metrics


def compare_runs(run_id_a: int, run_id_b: int) -> Dict:
    metrics_a = get_run_metrics(run_id_a)
    metrics_b = get_run_metrics(run_id_b)
    samples_a = {s["sample_id"]: s for s in get_samples(run_id=run_id_a)}
    samples_b = {s["sample_id"]: s for s in get_samples(run_id=run_id_b)}
    all_sample_ids = set(samples_a.keys()) | set(samples_b.keys())
    changed_predictions = []
    for sid in all_sample_ids:
        sa = samples_a.get(sid)
        sb = samples_b.get(sid)
        if sa and sb and sa["predicted_label"] != sb["predicted_label"]:
            changed_predictions.append({
                "sample_id": sid,
                "label_a": sa["predicted_label"],
                "label_b": sb["predicted_label"],
                "score_a": sa["score"],
                "score_b": sb["score"],
                "query_text": sa.get("query_text") or sb.get("query_text", "")
            })
    metric_deltas = {}
    for k in set(metrics_a.keys()) | set(metrics_b.keys()):
        va = metrics_a.get(k, 0.0)
        vb = metrics_b.get(k, 0.0)
        metric_deltas[k] = {"a": va, "b": vb, "delta": vb - va}
    run_a_detail = get_run_detail(run_id_a)
    run_b_detail = get_run_detail(run_id_b)
    return {
        "run_a": run_a_detail,
        "run_b": run_b_detail,
        "metrics_a": metrics_a,
        "metrics_b": metrics_b,
        "metric_deltas": metric_deltas,
        "changed_predictions": changed_predictions,
        "samples_only_in_a": [sid for sid in samples_a if sid not in samples_b],
        "samples_only_in_b": [sid for sid in samples_b if sid not in samples_a]
    }
