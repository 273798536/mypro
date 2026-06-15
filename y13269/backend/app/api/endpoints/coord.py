from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.store import db
from app.core.config import settings
from app.schemas.charge import ChargeRecord

router = APIRouter(prefix="/coord", tags=["坐标校验"])


class VerifyBatchBody(BaseModel):
    record_ids: List[str]


class ConfirmBody(BaseModel):
    confirmed_correct: bool
    note: Optional[str] = None


def _mock_geocode_verify(rec: ChargeRecord) -> Dict[str, Any]:
    """模拟地图服务商进行坐标反查校验

    在实际生产中应调用高德/百度地图 API，此处根据 MAP_PROVIDER 配置返回模拟结果。

    Args:
        rec: 待校验的记录

    Returns:
        校验结果字典 {verified, verified_address, deviation_meters, message}
    """
    if settings.MAP_PROVIDER == "mock":
        if rec.longitude is None or rec.latitude is None:
            return {
                "verified": False,
                "verified_address": None,
                "deviation_meters": None,
                "message": "缺少坐标信息",
            }

        has_addr = bool(rec.address or rec.intersection or rec.community_name)
        if has_addr:
            return {
                "verified": True,
                "verified_address": f"{rec.community_name}{rec.intersection or ''}{rec.address or ''}".strip(),
                "deviation_meters": 25.0,
                "message": "坐标与地址匹配",
            }
        else:
            return {
                "verified": False,
                "verified_address": f"未知位置({rec.longitude:.5f}, {rec.latitude:.5f})",
                "deviation_meters": None,
                "message": "无法反查地址，需人工确认",
            }
    else:
        return {
            "verified": False,
            "verified_address": None,
            "deviation_meters": None,
            "message": f"地图服务商 {settings.MAP_PROVIDER} 暂未实现",
        }


@router.post("/verify")
def verify_coords_batch(body: VerifyBatchBody):
    """批量校验坐标

    对给定的 record_ids 列表逐一执行坐标反查校验，更新 coord_status、
    coord_verified_address 和 coord_deviation_meters 字段。

    Args:
        body: 包含 record_ids 列表的请求体

    Returns:
        List[dict]: 每条记录的校验结果，含 {record_id, ok, status, ...detail}

    Raises:
        HTTPException: 400 - record_ids 为空
    """
    if not body.record_ids:
        raise HTTPException(status_code=400, detail="record_ids 不能为空")

    results = []
    for rid in body.record_ids:
        rec = db.get_record(rid)
        if not rec:
            results.append({
                "record_id": rid,
                "ok": False,
                "error": "记录不存在",
            })
            continue

        verify_result = _mock_geocode_verify(rec)
        rec.coord_verified_address = verify_result["verified_address"]
        rec.coord_deviation_meters = verify_result["deviation_meters"]

        if verify_result["verified"]:
            rec.coord_status = "verified"
        else:
            rec.coord_status = "suspicious"

        from datetime import datetime
        rec.updated_at = datetime.now()
        rec.version += 1

        results.append({
            "record_id": rid,
            "ok": True,
            "coord_status": rec.coord_status,
            "verified_address": rec.coord_verified_address,
            "deviation_meters": rec.coord_deviation_meters,
            "message": verify_result["message"],
        })

    db.save_to_disk()
    return results


@router.post("/confirm/{record_id}")
def confirm_coord_manually(record_id: str, body: ConfirmBody):
    """人工确认坐标状态

    允许用户手动标记坐标是否正确，可选附记备注。
    confirmed_correct=True 时 coord_status 设置为 confirmed；
    confirmed_correct=False 时设置为 rejected，可配合备注说明。

    Args:
        record_id: 记录 ID
        body: {confirmed_correct, note}

    Returns:
        dict: 更新后的记录详情

    Raises:
        HTTPException: 404 - 记录不存在
    """
    rec = db.get_record(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"记录不存在: {record_id}")

    if body.confirmed_correct:
        rec.coord_status = "confirmed"
    else:
        rec.coord_status = "rejected"

    if body.note:
        if rec.side_note:
            rec.side_note = f"{rec.side_note} | [人工确认] {body.note}"
        else:
            rec.side_note = f"[人工确认] {body.note}"

    from datetime import datetime
    rec.updated_at = datetime.now()
    rec.version += 1

    db.save_to_disk()
    return rec.model_dump(mode="json")
