import json
from datetime import datetime

from db_init import get_conn


def _same_date(obs_time_str):
    if not obs_time_str:
        return None
    return obs_time_str[:10]


def detect_tide_track_conflicts(route_name=None, assess_date=None):
    conn = get_conn()

    if route_name and assess_date:
        cur = conn.execute(
            "SELECT id FROM assessment WHERE route_name=? AND assess_date=?",
            (route_name, assess_date),
        )
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return {"conflicts": [], "note": "no assessment found for given route+date"}

    tide_cur = conn.execute("SELECT station, obs_time, tide_height, tide_type, import_batch FROM tide_table")
    track_cur = conn.execute("SELECT mmsi, obs_time, latitude, longitude, import_batch FROM ship_track")

    tide_by_date = {}
    for t in tide_cur.fetchall():
        d = _same_date(t["obs_time"])
        if d not in tide_by_date:
            tide_by_date[d] = []
        tide_by_date[d].append(dict(t))

    track_by_date = {}
    for t in track_cur.fetchall():
        d = _same_date(t["obs_time"])
        if d not in track_by_date:
            track_by_date[d] = []
        track_by_date[d].append(dict(t))

    conflicts = []
    all_dates = sorted(set(tide_by_date.keys()) | set(track_by_date.keys()))

    for d in all_dates:
        if assess_date and d != assess_date:
            continue
        tides = tide_by_date.get(d, [])
        tracks = track_by_date.get(d, [])
        if not tides or not tracks:
            continue

        tide_batches = set(t["import_batch"] for t in tides)
        if len(tide_batches) > 1:
            conflicts.append({
                "date": d,
                "type": "tide_duplicate_batch",
                "detail": f"同一日潮汐表来自{len(tide_batches)}个不同批次: {sorted(tide_batches)}",
                "severity": "high",
                "recommendation": "同一批潮汐表第二次导入不应产生矛盾结论，需确认是否为补录或更正",
            })

        track_mmsi_counts = {}
        for tr in tracks:
            mmsi = tr["mmsi"]
            if mmsi not in track_mmsi_counts:
                track_mmsi_counts[mmsi] = []
            track_mmsi_counts[mmsi].append(tr)

        for mmsi, positions in track_mmsi_counts.items():
            if len(positions) > 1:
                lats = [p["latitude"] for p in positions if p["latitude"] is not None]
                lons = [p["longitude"] for p in positions if p["longitude"] is not None]
                if lats and (max(lats) - min(lats) > 2.0 or (lons and max(lons) - min(lons) > 2.0)):
                    conflicts.append({
                        "date": d,
                        "type": "track_jump",
                        "detail": f"MMSI {mmsi} 同日位置跳变过大",
                        "severity": "medium",
                        "recommendation": "检查轨迹数据是否有误或备注混写",
                    })

        if len(tides) >= 2:
            heights = [t["tide_height"] for t in tides if t["tide_height"] is not None]
            if heights and (max(heights) - min(heights)) > 5.0:
                conflicts.append({
                    "date": d,
                    "type": "tide_height_spread",
                    "detail": f"同日潮高差{max(heights)-min(heights):.1f}m，超出正常范围",
                    "severity": "high",
                    "recommendation": "核实是否风浪预报晚到导致补录，或潮汐表数据有误",
                })

    conn.close()
    return {"conflicts": conflicts, "checked_dates": len(all_dates)}


def resolve_conflict(assessment_id, resolution, operator="system", reason=None):
    conn = get_conn()
    cur = conn.execute("SELECT * FROM assessment WHERE id=?", (assessment_id,))
    assessment = cur.fetchone()
    if not assessment:
        conn.close()
        raise ValueError(f"assessment id={assessment_id} not found")

    old_conflict = assessment["tide_conflict"] or ""
    new_conflict = f"{old_conflict}; RESOLVED:{resolution}" if old_conflict else f"RESOLVED:{resolution}"

    conn.execute(
        "UPDATE assessment SET tide_conflict=?, updated_ts=datetime('now') WHERE id=?",
        (new_conflict, assessment_id),
    )
    conn.execute(
        "INSERT INTO audit_log(assessment_id,action,field_name,old_value,new_value,operator,reason) "
        "VALUES(?,'resolve_conflict','tide_conflict',?,?,?,?)",
        (assessment_id, old_conflict, new_conflict, operator, reason or resolution),
    )
    conn.commit()
    conn.close()
    return {"assessment_id": assessment_id, "resolved": resolution}
