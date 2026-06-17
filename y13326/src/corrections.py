import json
import os
import uuid
from typing import List, Optional
from datetime import datetime
from .models import ManualCorrection, HistoryRecord


CORRECTIONS_FILE = "data/manual_corrections.json"
HISTORY_FILE = "data/history.json"


def _ensure_data_dir():
    os.makedirs("data", exist_ok=True)


def load_manual_corrections() -> List[ManualCorrection]:
    _ensure_data_dir()
    if not os.path.exists(CORRECTIONS_FILE):
        return []

    with open(CORRECTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    corrections = []
    for item in data:
        corrections.append(ManualCorrection(
            correction_id=item["correction_id"],
            cluster_id=item["cluster_id"],
            field_name=item["field_name"],
            old_value=item["old_value"],
            new_value=item["new_value"],
            operator=item["operator"],
            remark=item["remark"],
            created_at=item["created_at"],
            version=item.get("version", ""),
        ))
    return corrections


def save_manual_correction(correction: ManualCorrection):
    _ensure_data_dir()
    corrections = load_manual_corrections()
    corrections.append(correction)

    data = []
    for c in corrections:
        data.append({
            "correction_id": c.correction_id,
            "cluster_id": c.cluster_id,
            "field_name": c.field_name,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "operator": c.operator,
            "remark": c.remark,
            "created_at": c.created_at,
            "version": c.version,
        })

    with open(CORRECTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_manual_correction(
    cluster_id: str,
    field_name: str,
    old_value,
    new_value,
    operator: str,
    remark: str,
    version: str = "",
) -> ManualCorrection:
    correction = ManualCorrection(
        correction_id=str(uuid.uuid4())[:8],
        cluster_id=cluster_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        operator=operator,
        remark=remark,
        version=version,
    )
    save_manual_correction(correction)
    return correction


def get_corrections_by_cluster(cluster_id: str) -> List[ManualCorrection]:
    corrections = load_manual_corrections()
    return [c for c in corrections if c.cluster_id == cluster_id]


def get_corrections_by_version(version: str) -> List[ManualCorrection]:
    corrections = load_manual_corrections()
    return [c for c in corrections if c.version == version]


def load_history() -> List[HistoryRecord]:
    _ensure_data_dir()
    if not os.path.exists(HISTORY_FILE):
        return []

    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    history = []
    for item in data:
        history.append(HistoryRecord(
            run_id=item["run_id"],
            run_time=item["run_time"],
            version_old=item["version_old"],
            version_new=item["version_new"],
            operator=item.get("operator", ""),
            summary=item.get("summary", ""),
            result_file=item.get("result_file", ""),
        ))
    return history


def save_history_record(record: HistoryRecord):
    _ensure_data_dir()
    history = load_history()
    history.append(record)

    data = []
    for h in history:
        data.append({
            "run_id": h.run_id,
            "run_time": h.run_time,
            "version_old": h.version_old,
            "version_new": h.version_new,
            "operator": h.operator,
            "summary": h.summary,
            "result_file": h.result_file,
        })

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_history_record(
    version_old: str,
    version_new: str,
    summary: str,
    result_file: str,
    operator: str = "",
) -> HistoryRecord:
    record = HistoryRecord(
        run_id=str(uuid.uuid4())[:8],
        run_time=datetime.now().isoformat(),
        version_old=version_old,
        version_new=version_new,
        operator=operator,
        summary=summary,
        result_file=result_file,
    )
    save_history_record(record)
    return record
