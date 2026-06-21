import csv
import io
import json
import os
from typing import Dict, Tuple
from datetime import datetime

from .models import ReviewResult
from .chart_builder import build_chart_data


def export_review_json(result: ReviewResult) -> Tuple[str, bytes]:
    chart = build_chart_data(result)
    chart["version_tracking"] = {
        "current_review_id": result.review_id,
        "previous_review_id": result.previous_review_id,
        "annotation": result.annotation,
        "delivery_list_version": result.delivery_list_version,
        "review_time": result.review_time.isoformat(),
        "status": result.status,
        "folder_path": result.folder_path,
        "calculation_rule_version": result.calculation_rule.version,
    }
    payload = {
        "exported_at": datetime.now().isoformat(),
        "export_type": "full_review_export",
        "chart": chart,
        "raw_result": {
            "review_id": result.review_id,
            "review_time": result.review_time.isoformat(),
            "status": result.status,
            "total_files": result.total_files,
            "valid_files": result.valid_files,
            "invalid_files": result.invalid_files,
            "calculation_rule": result.calculation_rule.model_dump(),
            "folder_path": result.folder_path,
            "annotation": result.annotation,
            "delivery_list_version": result.delivery_list_version,
            "previous_review_id": result.previous_review_id,
        }
    }
    filename = f"review_{result.review_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    return filename, content


def export_progress_csv(result: ReviewResult) -> Tuple[str, bytes]:
    chart = build_chart_data(result)
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_ALL)
    writer.writerow([
        "raw_line", "student_name", "teacher_name", "track_name", "audio_file",
        "tempo_accuracy", "pitch_accuracy", "rhythm_stability", "expression_score",
        "overall_score", "notes", "has_anomaly", "anomaly_refs",
        "folder_path", "calculation_rule_version", "review_id", "review_time",
        "annotation", "delivery_list_version"
    ])
    for s in chart["students"]:
        m = s["metrics"]
        writer.writerow([
            s["raw_line"], s["student_name"], s["teacher_name"], s["track_name"], s["audio_file"],
            m["tempo_accuracy"], m["pitch_accuracy"], m["rhythm_stability"], m["expression_score"],
            m["overall_score"], s.get("notes", ""),
            "是" if s.get("has_anomaly") else "否",
            ",".join(s.get("anomaly_refs", [])),
            s["folder_path"],
            chart["calculation_rule"]["version"],
            result.review_id,
            result.review_time.isoformat(),
            result.annotation or "",
            result.delivery_list_version or ""
        ])
    filename = f"progress_{result.review_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return filename, "\ufeff" + buf.getvalue()


def export_anomalies_csv(result: ReviewResult) -> Tuple[str, bytes]:
    chart = build_chart_data(result)
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_ALL)
    writer.writerow([
        "raw_line", "file_name", "anomaly_type", "severity", "severity_cn",
        "field_name", "expected", "actual", "message",
        "folder_path", "calculation_rule_version", "click_back_url",
        "review_id", "review_time", "status"
    ])
    sev_map = {"critical": "严重", "high": "高", "medium": "中", "low": "低"}
    for a in chart["anomalies"]:
        cb = a.get("click_back", {})
        cb_url = (
            f"file://{cb.get('folder_path', result.folder_path)}"
            f"#L{cb.get('raw_line', a['raw_line'])}"
            if cb.get("folder_path") else ""
        )
        writer.writerow([
            a["raw_line"], a["file_name"], a["anomaly_type"], a["severity"],
            sev_map.get(a["severity"], ""),
            a.get("field_name", ""),
            a.get("expected", ""),
            a.get("actual", ""),
            a.get("message", ""),
            a["folder_path"],
            cb.get("calculation_rule_version", result.calculation_rule.version),
            cb_url,
            result.review_id,
            result.review_time.isoformat(),
            result.status
        ])
    filename = f"anomalies_{result.review_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return filename, "\ufeff" + buf.getvalue()


def save_exports_to_disk(result: ReviewResult, out_dir: str = "./data/exports") -> Dict[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    saved = {}

    fn, content = export_review_json(result)
    p = os.path.join(out_dir, fn)
    with open(p, "wb") as f:
        f.write(content)
    saved["json"] = p

    fn_csv, content_csv = export_progress_csv(result)
    p_csv = os.path.join(out_dir, fn_csv)
    with open(p_csv, "w", encoding="utf-8-sig", newline="") as f:
        f.write(content_csv)
    saved["progress_csv"] = p_csv

    fn_a, content_a = export_anomalies_csv(result)
    p_a = os.path.join(out_dir, fn_a)
    with open(p_a, "w", encoding="utf-8-sig", newline="") as f:
        f.write(content_a)
    saved["anomalies_csv"] = p_a

    return saved
