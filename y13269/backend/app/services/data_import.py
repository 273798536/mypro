from typing import List, Dict, Tuple, Any, Optional
from pathlib import Path
import uuid
import math
from datetime import datetime

import pandas as pd

from app.models.store import db
from app.schemas.charge import ChargeRecord, SourceRef, ImportBatch
from app.core.config import settings


COLUMN_KEYWORD_MAPPING = {
    "community_name": ["社区名", "小区名", "社区"],
    "street_name": ["街道", "所属街道"],
    "intersection": ["路口", "街口", "交叉口"],
    "address": ["地址", "详细地址"],
    "longitude": ["经度", "longitude", "lng"],
    "latitude": ["纬度", "latitude", "lat"],
    "time_period": ["时段", "时间段"],
    "peak_type": ["高峰类型", "峰时"],
    "scenario_label": ["场景标注", "场景"],
    "side_note": ["侧边说明", "备注"],
    "screenshot_note": ["截图说明", "截图"],
    "complaint_content": ["投诉内容", "问题描述"],
    "complaint_count": ["投诉次数", "数量"],
}


def _map_column_name(raw_col: str) -> Optional[str]:
    raw_col_lower = str(raw_col).strip().lower()
    for std_key, keywords in COLUMN_KEYWORD_MAPPING.items():
        for kw in keywords:
            if kw.lower() in raw_col_lower or raw_col_lower == kw.lower():
                return std_key
    return None


def parse_excel_or_csv(file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix in [".xlsx", ".xls"]:
        dfs = pd.read_excel(path, sheet_name=None, dtype=str)
        all_rows: List[Dict[str, Any]] = []
        column_mapping: Dict[str, str] = {}
        for sheet_name, df in dfs.items():
            for raw_col in df.columns:
                if raw_col not in column_mapping:
                    mapped = _map_column_name(raw_col)
                    if mapped:
                        column_mapping[raw_col] = mapped
            for idx, row in df.iterrows():
                row_dict: Dict[str, Any] = {}
                for raw_col, val in row.items():
                    mapped_key = column_mapping.get(raw_col, raw_col)
                    if pd.isna(val):
                        row_dict[mapped_key] = None
                    else:
                        row_dict[mapped_key] = str(val).strip() if isinstance(val, str) else val
                row_dict["_sheet_name"] = sheet_name
                row_dict["_row_number"] = idx + 2
                row_dict["_raw_content"] = {
                    k: (None if pd.isna(v) else (str(v).strip() if isinstance(v, str) else v))
                    for k, v in row.to_dict().items()
                }
                all_rows.append(row_dict)
        return all_rows, column_mapping
    elif suffix == ".csv":
        df = pd.read_csv(path, dtype=str, encoding_errors="ignore")
        all_rows: List[Dict[str, Any]] = []
        column_mapping: Dict[str, str] = {}
        for raw_col in df.columns:
            mapped = _map_column_name(raw_col)
            if mapped:
                column_mapping[raw_col] = mapped
        for idx, row in df.iterrows():
            row_dict: Dict[str, Any] = {}
            for raw_col, val in row.items():
                mapped_key = column_mapping.get(raw_col, raw_col)
                if pd.isna(val):
                    row_dict[mapped_key] = None
                else:
                    row_dict[mapped_key] = str(val).strip() if isinstance(val, str) else val
            row_dict["_sheet_name"] = None
            row_dict["_row_number"] = idx + 2
            row_dict["_raw_content"] = {
                k: (None if pd.isna(v) else (str(v).strip() if isinstance(v, str) else v))
                for k, v in row.to_dict().items()
            }
            all_rows.append(row_dict)
        return all_rows, column_mapping
    else:
        raise ValueError(f"不支持的文件格式: {suffix}")


def _haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371000


def _peak_type_match(a: Optional[str], b: Optional[str]) -> bool:
    a_clean = (a or "").strip()
    b_clean = (b or "").strip()
    if not a_clean and not b_clean:
        return True
    if not a_clean or not b_clean:
        return False
    return a_clean == b_clean


def _find_matching_record(new_data: Dict[str, Any], existing_records: List[ChargeRecord]) -> Optional[ChargeRecord]:
    new_community = new_data.get("community_name")
    new_intersection = new_data.get("intersection")
    new_address = new_data.get("address")
    new_lon = new_data.get("longitude")
    new_lat = new_data.get("latitude")
    new_peak_type = new_data.get("peak_type")

    if new_community:
        new_community = str(new_community).strip()

    for rec in existing_records:
        if rec.community_name != new_community:
            continue
        if not _peak_type_match(new_peak_type, rec.peak_type):
            continue
        if new_intersection and rec.intersection and str(new_intersection).strip() == rec.intersection.strip():
            if new_address and rec.address and str(new_address).strip() == rec.address.strip():
                return rec
            elif not new_address or not rec.address:
                return rec
        if new_address and rec.address and str(new_address).strip() == rec.address.strip():
            if not new_intersection or not rec.intersection:
                return rec

    if new_lon is not None and new_lat is not None and new_community:
        try:
            new_lon_f = float(new_lon)
            new_lat_f = float(new_lat)
        except (TypeError, ValueError):
            return None
        for rec in existing_records:
            if rec.community_name != new_community:
                continue
            if not _peak_type_match(new_peak_type, rec.peak_type):
                continue
            if rec.longitude is None or rec.latitude is None:
                continue
            dist = _haversine(new_lon_f, new_lat_f, rec.longitude, rec.latitude)
            if dist <= 100.0:
                return rec
    return None


def _parse_float_safe(val: Any) -> Optional[float]:
    if val is None or (isinstance(val, str) and not val.strip()):
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _parse_int_safe(val: Any, default: int = 1) -> int:
    if val is None or (isinstance(val, str) and not val.strip()):
        return default
    try:
        result = int(val)
        return result if result > 0 else default
    except (TypeError, ValueError):
        try:
            result = int(float(val))
            return result if result > 0 else default
        except (TypeError, ValueError):
            return default


def _generate_record_no() -> str:
    now = datetime.now()
    return f"CD{now.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"


def _detect_bad_flags(record: ChargeRecord) -> List[str]:
    flags: List[str] = []
    if not record.community_name or record.community_name.strip() == "":
        flags.append("missing_community_name")
    if record.longitude is not None and not (-180 <= record.longitude <= 180):
        flags.append("invalid_longitude")
    if record.latitude is not None and not (-90 <= record.latitude <= 90):
        flags.append("invalid_latitude")
    if record.complaint_count <= 0:
        flags.append("invalid_complaint_count")
    has_location = (
        (record.intersection and record.intersection.strip() != "")
        or (record.address and record.address.strip() != "")
        or (record.longitude is not None and record.latitude is not None)
    )
    if not has_location:
        flags.append("missing_location_info")
    return flags


def incremental_import(
    records_data: List[Dict[str, Any]],
    source_file: str,
    batch_id: str,
    file_size: int = 0,
) -> Tuple[ImportBatch, List[ChargeRecord]]:
    new_count = 0
    updated_count = 0
    processed_records: List[ChargeRecord] = []
    existing_records = db.list_records()

    for row_data in records_data:
        raw_content = row_data.get("_raw_content", {})
        sheet_name = row_data.get("_sheet_name")
        row_number = row_data.get("_row_number", 0)

        source_ref = SourceRef(
            source_file=source_file,
            sheet_name=sheet_name,
            row_number=row_number,
            raw_content=raw_content,
        )

        community_name = row_data.get("community_name")
        if community_name:
            community_name = str(community_name).strip()
        street_name = row_data.get("street_name")
        if street_name:
            street_name = str(street_name).strip()
        intersection = row_data.get("intersection")
        if intersection:
            intersection = str(intersection).strip()
        address = row_data.get("address")
        if address:
            address = str(address).strip()
        longitude = _parse_float_safe(row_data.get("longitude"))
        latitude = _parse_float_safe(row_data.get("latitude"))
        time_period = row_data.get("time_period")
        if time_period:
            time_period = str(time_period).strip()
        peak_type = row_data.get("peak_type")
        if peak_type:
            peak_type = str(peak_type).strip()
        scenario_label = row_data.get("scenario_label")
        if scenario_label:
            scenario_label = str(scenario_label).strip()
        side_note = row_data.get("side_note")
        if side_note:
            side_note = str(side_note).strip()
        screenshot_note = row_data.get("screenshot_note")
        if screenshot_note:
            screenshot_note = str(screenshot_note).strip()
        complaint_content = row_data.get("complaint_content")
        if complaint_content:
            complaint_content = str(complaint_content).strip()
        complaint_count = _parse_int_safe(row_data.get("complaint_count"), 1)

        prepared_data = {
            "community_name": community_name or "",
            "street_name": street_name,
            "intersection": intersection,
            "address": address,
            "longitude": longitude,
            "latitude": latitude,
            "time_period": time_period,
            "peak_type": peak_type,
            "scenario_label": scenario_label,
            "side_note": side_note,
            "screenshot_note": screenshot_note,
            "complaint_content": complaint_content,
            "complaint_count": complaint_count,
        }

        matched = _find_matching_record(prepared_data, existing_records)

        if matched:
            existing_refs = matched.source_refs or []
            existing_refs.append(source_ref)

            updates = {
                "source_refs": existing_refs,
                "import_batch_id": batch_id,
            }

            if not matched.street_name and prepared_data["street_name"]:
                updates["street_name"] = prepared_data["street_name"]
            if not matched.intersection and prepared_data["intersection"]:
                updates["intersection"] = prepared_data["intersection"]
            if not matched.address and prepared_data["address"]:
                updates["address"] = prepared_data["address"]
            if matched.longitude is None and prepared_data["longitude"] is not None:
                updates["longitude"] = prepared_data["longitude"]
            if matched.latitude is None and prepared_data["latitude"] is not None:
                updates["latitude"] = prepared_data["latitude"]
            if not matched.time_period and prepared_data["time_period"]:
                updates["time_period"] = prepared_data["time_period"]
            if not matched.peak_type and prepared_data["peak_type"]:
                updates["peak_type"] = prepared_data["peak_type"]
            if not matched.scenario_label and prepared_data["scenario_label"]:
                updates["scenario_label"] = prepared_data["scenario_label"]
            if not matched.side_note and prepared_data["side_note"]:
                updates["side_note"] = prepared_data["side_note"]
            if not matched.screenshot_note and prepared_data["screenshot_note"]:
                updates["screenshot_note"] = prepared_data["screenshot_note"]
            if not matched.complaint_content and prepared_data["complaint_content"]:
                updates["complaint_content"] = prepared_data["complaint_content"]

            updated_record = db.update_record(matched.id, **updates)
            if updated_record:
                bad_flags = _detect_bad_flags(updated_record)
                if bad_flags:
                    db.update_record(updated_record.id, bad_data_flags=bad_flags, status="bad_data")
                else:
                    db.update_record(updated_record.id, bad_data_flags=[], status="normal")
                reloaded = db.get_record(updated_record.id)
                if reloaded:
                    processed_records.append(reloaded)
            updated_count += 1
        else:
            new_id = uuid.uuid4().hex[:12]
            new_record = ChargeRecord(
                id=new_id,
                record_no=_generate_record_no(),
                community_name=prepared_data["community_name"],
                street_name=prepared_data["street_name"],
                intersection=prepared_data["intersection"],
                address=prepared_data["address"],
                longitude=prepared_data["longitude"],
                latitude=prepared_data["latitude"],
                time_period=prepared_data["time_period"],
                peak_type=prepared_data["peak_type"],
                scenario_label=prepared_data["scenario_label"],
                side_note=prepared_data["side_note"],
                screenshot_note=prepared_data["screenshot_note"],
                complaint_content=prepared_data["complaint_content"],
                complaint_count=prepared_data["complaint_count"],
                coord_status="pending",
                status="draft",
                conflict_with=[],
                merge_candidate_ids=[],
                merge_status="none",
                source_refs=[source_ref],
                bad_data_flags=[],
                import_batch_id=batch_id,
            )
            bad_flags = _detect_bad_flags(new_record)
            new_record.bad_data_flags = bad_flags
            if bad_flags:
                new_record.status = "bad_data"
            else:
                new_record.status = "normal"
            db.add_record(new_record)
            existing_records.append(new_record)
            processed_records.append(new_record)
            new_count += 1

    batch = ImportBatch(
        id=batch_id,
        file_name=source_file,
        file_size=file_size,
        uploaded_at=datetime.now(),
        total_rows=len(records_data),
        imported_rows=new_count + updated_count,
        new_records=new_count,
        updated_records=updated_count,
    )
    db.add_batch(batch)

    return batch, processed_records
