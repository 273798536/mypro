from typing import Dict, List, Optional
from .models import ReviewResult, Anomaly


def build_chart_data(result: ReviewResult) -> Dict:
    students = []
    for record in result.progress_records:
        anomaly_here = [a for a in result.anomalies if a.raw_line == record.raw_line]
        students.append({
            "student_name": record.student_name,
            "teacher_name": record.teacher_name,
            "track_name": record.track_name,
            "audio_file": record.audio_file,
            "raw_line": record.raw_line,
            "folder_path": record.folder_path,
            "metrics": {
                "tempo_accuracy": record.metrics.tempo_accuracy,
                "pitch_accuracy": record.metrics.pitch_accuracy,
                "rhythm_stability": record.metrics.rhythm_stability,
                "expression_score": record.metrics.expression_score,
                "overall_score": record.metrics.overall_score
            },
            "notes": record.notes,
            "has_anomaly": len(anomaly_here) > 0,
            "anomaly_refs": [a.anomaly_type for a in anomaly_here]
        })

    anomalies_for_chart = []
    for anomaly in result.anomalies:
        anomalies_for_chart.append({
            "anomaly_type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "message": anomaly.message,
            "folder_path": anomaly.folder_path,
            "file_name": anomaly.file_name,
            "raw_line": anomaly.raw_line,
            "field_name": anomaly.field_name,
            "expected": anomaly.expected,
            "actual": anomaly.actual,
            "click_back": {
                "folder_path": anomaly.folder_path,
                "raw_line": anomaly.raw_line,
                "calculation_rule_version": result.calculation_rule.version
            }
        })

    return {
        "review_id": result.review_id,
        "calculation_rule": {
            "name": result.calculation_rule.name,
            "version": result.calculation_rule.version,
            "thresholds": result.calculation_rule.thresholds
        },
        "folder_path": result.folder_path,
        "status": result.status,
        "students": students,
        "anomalies": anomalies_for_chart
    }


def compare_versions(current: ReviewResult, previous: Optional[ReviewResult]) -> Dict:
    if not previous:
        return {"comparison": "无历史版本"}

    current_scores = {}
    for r in current.progress_records:
        key = f"{r.student_name}|{r.track_name}"
        current_scores[key] = r.metrics.overall_score

    prev_scores = {}
    for r in previous.progress_records:
        key = f"{r.student_name}|{r.track_name}"
        prev_scores[key] = r.metrics.overall_score

    diffs = []
    for key in set(list(current_scores.keys()) + list(prev_scores.keys())):
        c = current_scores.get(key)
        p = prev_scores.get(key)
        if c is not None and p is not None:
            diffs.append({
                "key": key,
                "current": c,
                "previous": p,
                "delta": round(c - p, 2)
            })

    current_anomaly_types = set(a.anomaly_type for a in current.anomalies)
    prev_anomaly_types = set(a.anomaly_type for a in previous.anomalies)

    return {
        "current_review_id": current.review_id,
        "previous_review_id": previous.review_id,
        "current_status": current.status,
        "previous_status": previous.status,
        "current_annotation": current.annotation,
        "previous_annotation": previous.annotation,
        "current_delivery": current.delivery_list_version,
        "previous_delivery": previous.delivery_list_version,
        "score_diffs": diffs,
        "new_anomalies": list(current_anomaly_types - prev_anomaly_types),
        "resolved_anomalies": list(prev_anomaly_types - current_anomaly_types)
    }
