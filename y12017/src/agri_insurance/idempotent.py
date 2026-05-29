import os
import json
import csv
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import asdict

from .models import (
    Farmer, PurchaseOrder, PremiumRecord, VerificationRecord,
    PremiumSplit, ReviewItem, ProcessResult, compute_data_hash
)


BATCH_MANIFEST_FILE = ".batch_manifest.json"


def load_batch_manifest(output_dir: str) -> Dict[str, Any]:
    manifest_path = Path(output_dir) / BATCH_MANIFEST_FILE
    if not manifest_path.exists():
        return {"batches": [], "data_hashes": {}}
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_batch_manifest(output_dir: str, manifest: Dict[str, Any]) -> None:
    manifest_path = Path(output_dir) / BATCH_MANIFEST_FILE
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def compute_input_data_hash(
    farmers: List[Farmer],
    orders: List[PurchaseOrder],
    premiums: List[PremiumRecord],
) -> str:
    def record_to_dict(obj: Any) -> Dict[str, Any]:
        d = asdict(obj)
        d.pop("source", None)
        d.pop("sources", None)
        return d

    data = {
        "farmers": [record_to_dict(f) for f in farmers],
        "orders": [record_to_dict(o) for o in orders],
        "premiums": [record_to_dict(p) for p in premiums],
    }
    return compute_data_hash(data)


def check_duplicate_batch(
    output_dir: str,
    data_hash: str,
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    manifest = load_batch_manifest(output_dir)
    if data_hash in manifest["data_hashes"]:
        batch_id = manifest["data_hashes"][data_hash]
        for batch in manifest["batches"]:
            if batch["batch_id"] == batch_id:
                return True, batch
    return False, None


def register_batch(
    output_dir: str,
    result: ProcessResult,
    force: bool = False,
) -> Tuple[bool, str]:
    manifest = load_batch_manifest(output_dir)

    existing = manifest["data_hashes"].get(result.data_hash)
    if existing and not force:
        return False, f"相同数据已处理过，批次ID: {existing}。使用 --force 可强制重新计算。"

    batch_info = {
        "batch_id": result.batch_id,
        "process_time": result.process_time.isoformat(),
        "data_hash": result.data_hash,
        "output_files": result.output_files,
        "summary": {
            "farmer_count": result.farmer_count,
            "order_count": result.order_count,
            "premium_count": result.premium_count,
            "verification_count": result.verification_count,
            "split_count": result.split_count,
            "review_count": result.review_count,
            "cancelled_order_count": result.cancelled_order_count,
            "amended_order_count": result.amended_order_count,
            "total_farmer_payable": result.total_farmer_payable,
            "total_subsidy": result.total_subsidy,
            "total_premium": result.total_premium,
        },
    }

    manifest["data_hashes"][result.data_hash] = result.batch_id
    manifest["batches"].append(batch_info)
    manifest["batches"].sort(key=lambda b: b["process_time"], reverse=True)

    save_batch_manifest(output_dir, manifest)
    return True, f"批次 {result.batch_id} 已注册"


def get_previous_output_files(
    output_dir: str,
    batch_id: str,
) -> Optional[Dict[str, str]]:
    manifest = load_batch_manifest(output_dir)
    for batch in manifest["batches"]:
        if batch["batch_id"] == batch_id:
            return batch.get("output_files")
    return None


def list_processed_batches(output_dir: str) -> List[Dict[str, Any]]:
    manifest = load_batch_manifest(output_dir)
    return manifest.get("batches", [])


def generate_batch_id() -> str:
    now = datetime.now()
    return f"B{now.strftime('%Y%m%d%H%M%S')}"


def serialize_result_for_output(obj: Any) -> Any:
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if hasattr(obj, "__dict__"):
        d = {}
        for k, v in obj.__dict__.items():
            if k == "source" or k == "sources":
                if isinstance(v, list):
                    d[k] = [s.to_dict() for s in v if hasattr(s, "to_dict")]
                elif hasattr(v, "to_dict"):
                    d[k] = v.to_dict()
                else:
                    d[k] = v
            elif isinstance(v, (date, datetime)):
                d[k] = str(v)
            elif hasattr(v, "value"):
                d[k] = v.value
            else:
                d[k] = serialize_result_for_output(v)
        return d
    if isinstance(obj, list):
        return [serialize_result_for_output(item) for item in obj]
    if isinstance(obj, dict):
        return {k: serialize_result_for_output(val) for k, val in obj.items()}
    return obj


def save_json_output(
    output_dir: str,
    filename: str,
    data: Any,
    batch_id: str,
) -> str:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    filepath = Path(output_dir) / f"{batch_id}_{filename}"

    output_data = {
        "batch_id": batch_id,
        "generated_at": datetime.now().isoformat(),
        "record_count": len(data) if isinstance(data, list) else 1,
        "data": [serialize_result_for_output(item) for item in data] if isinstance(data, list) else serialize_result_for_output(data),
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

    return str(filepath)


def save_csv_output(
    output_dir: str,
    filename: str,
    data: List[Dict[str, Any]],
    batch_id: str,
) -> str:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    filepath = Path(output_dir) / f"{batch_id}_{filename}"

    if not data:
        with open(filepath, "w", encoding="utf-8-sig") as f:
            f.write("")
        return str(filepath)

    fieldnames = list(data[0].keys())
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

    return str(filepath)
