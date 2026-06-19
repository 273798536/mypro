"""JSON文件存储层 - 保证数据可追踪"""
import json
import os
from typing import Dict, Optional, List
from .models import RunRecord, Material, RecallResult, LeakInfo

STORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(STORE_DIR, exist_ok=True)


def _record_path(run_id: str) -> str:
    return os.path.join(STORE_DIR, f"run_{run_id}.json")


def _material_from_dict(d: dict) -> Material:
    return Material(**d)


def _recall_from_dict(d: dict) -> RecallResult:
    return RecallResult(**d)


def _leak_from_dict(d: dict) -> LeakInfo:
    return LeakInfo(**d)


def save_record(record: RunRecord) -> None:
    path = _record_path(record.run_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)


def load_record(run_id: str) -> Optional[RunRecord]:
    path = _record_path(run_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)
    rec = RunRecord(
        run_id=d["run_id"],
        run_name=d["run_name"],
        created_at=d["created_at"],
        status=d["status"],
        status_note=d.get("status_note", ""),
        total_samples=d.get("total_samples", 0),
        recall_at_1=d.get("recall_at_1", 0.0),
        recall_at_3=d.get("recall_at_3", 0.0),
        recall_at_5=d.get("recall_at_5", 0.0),
        mrr=d.get("mrr", 0.0),
        outlier_samples=d.get("outlier_samples", []),
        changed_materials=d.get("changed_materials", []),
        pending_evidences=d.get("pending_evidences", []),
        processed_items=d.get("processed_items", []),
        manual_overrides=d.get("manual_overrides", {}),
    )
    rec.materials = {k: _material_from_dict(v) for k, v in d.get("materials", {}).items()}
    rec.recall_results = [_recall_from_dict(r) for r in d.get("recall_results", [])]
    rec.leak_info = _leak_from_dict(d.get("leak_info", {}))
    return rec


def list_runs() -> List[Dict]:
    runs = []
    for fname in os.listdir(STORE_DIR):
        if fname.startswith("run_") and fname.endswith(".json"):
            path = os.path.join(STORE_DIR, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    d = json.load(f)
                runs.append({
                    "run_id": d["run_id"],
                    "run_name": d.get("run_name", ""),
                    "created_at": d.get("created_at", ""),
                    "status": d.get("status", "unknown"),
                    "total_samples": d.get("total_samples", 0),
                    "recall_at_1": d.get("recall_at_1", 0.0),
                })
            except Exception:
                continue
    runs.sort(key=lambda x: x["created_at"], reverse=True)
    return runs


def delete_record(run_id: str) -> bool:
    path = _record_path(run_id)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
