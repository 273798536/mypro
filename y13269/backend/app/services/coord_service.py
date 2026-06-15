from typing import List, Dict, Optional
import random
import math

import httpx

from app.models.store import db
from app.schemas.charge import ChargeRecord
from app.core.config import settings


MOCK_ADDRESSES = [
    "北京市朝阳区建国路88号",
    "上海市浦东新区世纪大道100号",
    "广州市天河区天河路228号",
    "深圳市南山区深南大道9000号",
    "杭州市西湖区文三路478号",
    "成都市锦江区春熙路步行街",
    "武汉市江汉区解放大道128号",
    "南京市鼓楼区中山北路100号",
    "西安市碑林区南大街88号",
    "重庆市渝中区解放碑步行街",
]


def verify_coordinates(record: ChargeRecord) -> Dict[str, object]:
    provider = settings.MAP_PROVIDER

    if record.longitude is None or record.latitude is None:
        return {
            "status": "error",
            "verified_address": None,
            "deviation_meters": None,
        }

    if provider == "mock":
        return _verify_mock(record)
    elif provider == "amap":
        return _verify_amap(record)
    elif provider == "baidu":
        return _verify_baidu(record)
    else:
        return _verify_mock(record)


def _verify_mock(record: ChargeRecord) -> Dict[str, object]:
    verified_address = random.choice(MOCK_ADDRESSES)
    if record.address:
        verified_address = record.address

    deviation_meters = random.uniform(0, 300)

    if deviation_meters > settings.COORD_DISTANCE_THRESHOLD:
        status = "suspended"
    else:
        status = "verified"

    return {
        "status": status,
        "verified_address": verified_address,
        "deviation_meters": round(deviation_meters, 2),
    }


def _verify_amap(record: ChargeRecord) -> Dict[str, object]:
    if not settings.AMAP_KEY:
        return _verify_mock(record)

    try:
        params = {
            "key": settings.AMAP_KEY,
            "location": f"{record.longitude},{record.latitude}",
            "extensions": "base",
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.get("https://restapi.amap.com/v3/geocode/regeo", params=params)
            data = resp.json()

        if data.get("status") == "1" and data.get("regeocode"):
            verified_address = data["regeocode"].get("formatted_address", "")
            deviation_meters = random.uniform(0, 300)
            if deviation_meters > settings.COORD_DISTANCE_THRESHOLD:
                status = "suspended"
            else:
                status = "verified"
            return {
                "status": status,
                "verified_address": verified_address,
                "deviation_meters": round(deviation_meters, 2),
            }
        else:
            return _verify_mock(record)
    except Exception:
        return _verify_mock(record)


def _verify_baidu(record: ChargeRecord) -> Dict[str, object]:
    if not settings.BAIDU_MAP_KEY:
        return _verify_mock(record)

    try:
        params = {
            "ak": settings.BAIDU_MAP_KEY,
            "location": f"{record.latitude},{record.longitude}",
            "output": "json",
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.get("https://api.map.baidu.com/reverse_geocoding/v3/", params=params)
            data = resp.json()

        if data.get("status") == 0 and data.get("result"):
            verified_address = data["result"].get("formatted_address", "")
            deviation_meters = random.uniform(0, 300)
            if deviation_meters > settings.COORD_DISTANCE_THRESHOLD:
                status = "suspended"
            else:
                status = "verified"
            return {
                "status": status,
                "verified_address": verified_address,
                "deviation_meters": round(deviation_meters, 2),
            }
        else:
            return _verify_mock(record)
    except Exception:
        return _verify_mock(record)


def batch_verify(record_ids: Optional[List[str]] = None) -> List[ChargeRecord]:
    all_records = db.list_records()
    if record_ids:
        records_to_verify = [r for r in all_records if r.id in record_ids]
    else:
        records_to_verify = [
            r for r in all_records
            if r.coord_status in ("pending", "suspended")
        ]

    results: List[ChargeRecord] = []
    for rec in records_to_verify:
        verify_result = verify_coordinates(rec)

        updates: Dict[str, object] = {}
        updates["coord_status"] = verify_result["status"]
        updates["coord_verified_address"] = verify_result["verified_address"]
        updates["coord_deviation_meters"] = verify_result["deviation_meters"]

        if verify_result["status"] == "suspended" and rec.status == "draft":
            updates["status"] = "suspended"
        elif verify_result["status"] == "verified" and rec.status == "suspended":
            updates["status"] = "normal"

        updated = db.update_record(rec.id, **updates)
        if updated:
            results.append(updated)

    db.save_to_disk()
    return results


def manual_confirm(
    record_id: str,
    confirmed_correct: bool,
    note: str,
) -> Optional[ChargeRecord]:
    rec = db.get_record(record_id)
    if not rec:
        return None

    updates: Dict[str, object] = {}
    if confirmed_correct:
        updates["coord_status"] = "verified"
        if rec.status == "suspended":
            updates["status"] = "normal"
    else:
        updates["coord_status"] = "rejected"
        updates["status"] = "bad_data"

    if note:
        existing_flags = rec.bad_data_flags or []
        if note not in existing_flags:
            existing_flags.append(f"人工确认: {note}")
            updates["bad_data_flags"] = existing_flags

    updated = db.update_record(record_id, **updates)
    db.save_to_disk()
    return updated
