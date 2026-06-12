"""
下载模块
文件名和内容不必花哨，但要能区分本次运行和上次运行。
文件名格式：seagrass_{batch_id}_{timestamp}.zip
内容包含：报告文本、表格、图表、溯源信息
"""

import os
import json
import zipfile
from datetime import datetime, timezone
from typing import List, Dict

from .models import ProcessingRecord
from .coverage import aggregate_statistics


def _record_to_dict(record: ProcessingRecord) -> Dict:
    d = {
        "record_id": record.record_id,
        "batch_id": record.batch_id,
        "vessel_id": record.vessel_id,
        "survey_time": record.survey_time.isoformat(),
        "timezone_offset_hours": record.timezone_offset_hours,
        "longitude": record.longitude,
        "latitude": record.latitude,
        "depth": record.depth,
        "coverage": record.coverage,
        "status": record.status,
        "flags": record.flags,
        "duplicate_of": record.duplicate_of,
    }

    if record.weather_data:
        d["weather_data"] = {}
        for k, v in record.weather_data.items():
            if isinstance(v, datetime):
                d["weather_data"][k] = v.isoformat()
            else:
                d["weather_data"][k] = v

    if record.tide_data:
        d["tide_data"] = {}
        for k, v in record.tide_data.items():
            if isinstance(v, datetime):
                d["tide_data"][k] = v.isoformat()
            else:
                d["tide_data"][k] = v

    if record.track_data:
        d["track_data"] = record.track_data

    d["source_refs"] = [
        {
            "source_id": s.source_id,
            "source_type": s.source_type,
            "source_name": s.source_name,
        }
        for s in record.source_refs
    ]

    d["processing_opinions"] = [
        {
            "stage": op.stage,
            "operator": op.operator,
            "opinion": op.opinion,
            "decision": op.decision,
            "evidence": _serialize_evidence(op.evidence),
        }
        for op in record.processing_opinions
    ]

    return d


def _serialize_evidence(evidence: Dict) -> Dict:
    result = {}
    for k, v in evidence.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def export_download_package(records: List[ProcessingRecord],
                            batch_id: str,
                            run_timestamp: datetime,
                            report_files: Dict[str, str],
                            output_dir: str = ".") -> str:
    """
    导出下载包。
    文件名格式：seagrass_{batch_id}_{YYYYMMDD_HHmmss}.zip
    包含：
    - data.json：全部记录 + 溯源信息
    - statistics.json：汇总统计
    - 报告文件（文字、表格、图表）
    """
    os.makedirs(output_dir, exist_ok=True)

    ts_str = run_timestamp.strftime("%Y%m%d_%H%M%S")
    zip_filename = f"seagrass_{batch_id}_{ts_str}.zip"
    zip_path = os.path.join(output_dir, zip_filename)

    data = {
        "batch_id": batch_id,
        "run_timestamp": run_timestamp.isoformat(),
        "records": [_record_to_dict(r) for r in records],
    }

    stats = aggregate_statistics(records)
    stats_data = {
        "batch_id": batch_id,
        "run_timestamp": run_timestamp.isoformat(),
        "statistics": stats,
    }

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("data.json", json.dumps(data, ensure_ascii=False, indent=2))
        zf.writestr("statistics.json", json.dumps(stats_data, ensure_ascii=False, indent=2))

        for label, filepath in report_files.items():
            if os.path.exists(filepath):
                arcname = os.path.basename(filepath)
                zf.write(filepath, arcname)

    return zip_path
