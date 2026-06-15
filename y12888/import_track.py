import csv
import hashlib
import json
import re
import uuid
from datetime import datetime

from db_init import get_conn


def _row_hash(table_name, row_dict):
    payload = json.dumps(row_dict, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(f"{table_name}:{payload}".encode()).hexdigest()


def _clean_number(val):
    if val is None:
        return None
    val = str(val).strip()
    if not val or val in ("-", "N/A", "n/a", "无", "—", "--"):
        return None
    cleaned = re.sub(r"[^\d.\-]", "", val)
    if not cleaned or cleaned == "-" or cleaned == ".":
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _separate_note(raw_str):
    if raw_str is None:
        return None, None
    raw_str = str(raw_str).strip()
    if not raw_str:
        return None, None
    num_val = _clean_number(raw_str)
    has_non_numeric = bool(re.search(r"[^\d.\-\s]", raw_str))
    if num_val is not None and has_non_numeric:
        return num_val, raw_str
    if num_val is not None:
        return num_val, None
    return None, raw_str


def import_track_csv(csv_path, batch_label=None, operator="system"):
    conn = get_conn()
    batch = batch_label or f"track-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    source_file = csv_path
    accepted = 0
    duplicates = 0
    cleaned_notes = 0
    null_skipped = 0
    conflicts = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vessel_name = (row.get("vessel_name") or row.get("船名") or "").strip()
            mmsi = (row.get("mmsi") or row.get("MMSI") or "").strip()
            obs_time = (row.get("obs_time") or row.get("观测时间") or "").strip()

            if not mmsi or not obs_time:
                null_skipped += 1
                continue

            lat_raw = row.get("latitude") or row.get("纬度") or ""
            lon_raw = row.get("longitude") or row.get("经度") or ""
            spd_raw = row.get("speed_kn") or row.get("航速") or ""
            hdg_raw = row.get("heading_deg") or row.get("航向") or ""
            note_raw = row.get("raw_note") or row.get("备注") or ""

            lat, lat_note = _separate_note(lat_raw)
            lon, lon_note = _separate_note(lon_raw)
            speed, spd_note = _separate_note(spd_raw)
            heading, hdg_note = _separate_note(hdg_raw)

            mixed_notes = [n for n in [lat_note, lon_note, spd_note, hdg_note, note_raw.strip() or None] if n]
            combined_note = "; ".join(mixed_notes) if mixed_notes else None
            if combined_note:
                cleaned_notes += 1

            hash_key = _row_hash("ship_track", {
                "mmsi": mmsi, "obs_time": obs_time,
                "latitude": lat, "longitude": lon,
                "speed_kn": speed, "heading_deg": heading,
            })

            cur = conn.execute(
                "SELECT id, status FROM import_dedup WHERE table_name='ship_track' AND row_hash=?",
                (hash_key,),
            )
            dedup_row = cur.fetchone()
            if dedup_row:
                duplicates += 1
                continue

            cur2 = conn.execute(
                "SELECT id, latitude, longitude, speed_kn, heading_deg FROM ship_track "
                "WHERE mmsi=? AND obs_time=? ORDER BY import_ts DESC LIMIT 1",
                (mmsi, obs_time),
            )
            existing = cur2.fetchone()
            if existing and (
                existing["latitude"] != lat
                or existing["longitude"] != lon
                or existing["speed_kn"] != speed
                or existing["heading_deg"] != heading
            ):
                conflicts.append({
                    "mmsi": mmsi, "obs_time": obs_time,
                    "existing_id": existing["id"],
                    "existing_lat": existing["latitude"],
                    "existing_lon": existing["longitude"],
                    "new_lat": lat, "new_lon": lon,
                })
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('ship_track',?,?,?,'conflict')",
                    (source_file, batch, hash_key),
                )
                continue

            try:
                conn.execute(
                    "INSERT INTO ship_track(source_file,vessel_name,mmsi,obs_time,"
                    "latitude,longitude,speed_kn,heading_deg,raw_note,import_batch) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?)",
                    (source_file, vessel_name, mmsi, obs_time,
                     lat, lon, speed, heading, combined_note, batch),
                )
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('ship_track',?,?,?,'accepted')",
                    (source_file, batch, hash_key),
                )
                accepted += 1
            except Exception as e:
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('ship_track',?,?,?,'conflict')",
                    (source_file, batch, hash_key),
                )
                conflicts.append({"error": str(e), "mmsi": mmsi, "obs_time": obs_time})

    conn.commit()
    conn.close()

    return {
        "table": "ship_track",
        "batch": batch,
        "accepted": accepted,
        "duplicates": duplicates,
        "cleaned_notes": cleaned_notes,
        "null_skipped": null_skipped,
        "conflicts": conflicts,
    }
