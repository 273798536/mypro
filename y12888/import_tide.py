import csv
import hashlib
import json
import uuid
from datetime import datetime

from db_init import get_conn


def _row_hash(table_name, row_dict):
    payload = json.dumps(row_dict, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(f"{table_name}:{payload}".encode()).hexdigest()


def _detect_tide_conflict(conn, station, obs_time, new_height, new_type):
    cur = conn.execute(
        "SELECT id, tide_height, tide_type, import_batch FROM tide_table "
        "WHERE station=? AND obs_time=? ORDER BY import_ts DESC LIMIT 1",
        (station, obs_time),
    )
    existing = cur.fetchone()
    if existing is None:
        return None
    if existing["tide_height"] != new_height or existing["tide_type"] != new_type:
        return {
            "existing_id": existing["id"],
            "existing_height": existing["tide_height"],
            "existing_type": existing["tide_type"],
            "existing_batch": existing["import_batch"],
            "new_height": new_height,
            "new_type": new_type,
        }
    return None


def import_tide_csv(csv_path, batch_label=None, operator="system"):
    conn = get_conn()
    batch = batch_label or f"tide-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    source_file = csv_path
    accepted = 0
    duplicates = 0
    conflicts = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            station = (row.get("station") or row.get("站点") or "").strip()
            obs_time = (row.get("obs_time") or row.get("观测时间") or "").strip()
            if not station or not obs_time:
                continue

            tide_height_str = (row.get("tide_height") or row.get("潮高") or "").strip()
            tide_type = (row.get("tide_type") or row.get("潮型") or "").strip()
            try:
                tide_height = float(tide_height_str) if tide_height_str else None
            except ValueError:
                tide_height = None

            hash_key = _row_hash("tide_table", {
                "station": station, "obs_time": obs_time,
                "tide_height": tide_height, "tide_type": tide_type,
            })

            cur = conn.execute(
                "SELECT id, status FROM import_dedup WHERE table_name='tide_table' AND row_hash=?",
                (hash_key,),
            )
            dedup_row = cur.fetchone()
            if dedup_row:
                duplicates += 1
                continue

            conflict = _detect_tide_conflict(conn, station, obs_time, tide_height, tide_type)
            if conflict:
                conflict["station"] = station
                conflict["obs_time"] = obs_time
                conflicts.append(conflict)
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('tide_table',?,?,?,'conflict')",
                    (source_file, batch, hash_key),
                )
                continue

            try:
                conn.execute(
                    "INSERT INTO tide_table(source_file,station,obs_time,tide_height,tide_type,import_batch) "
                    "VALUES(?,?,?,?,?,?)",
                    (source_file, station, obs_time, tide_height, tide_type, batch),
                )
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('tide_table',?,?,?,'accepted')",
                    (source_file, batch, hash_key),
                )
                accepted += 1
            except Exception as e:
                conn.execute(
                    "INSERT INTO import_dedup(table_name,source_file,import_batch,row_hash,status) "
                    "VALUES('tide_table',?,?,?,'conflict')",
                    (source_file, batch, hash_key),
                )
                conflicts.append({"error": str(e), "station": station, "obs_time": obs_time})

    conn.commit()
    conn.close()

    result = {
        "table": "tide_table",
        "batch": batch,
        "accepted": accepted,
        "duplicates": duplicates,
        "conflicts": conflicts,
    }
    return result
