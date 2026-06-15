from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import pandas as pd
from pathlib import Path

from app.models.store import db
from app.core.config import settings
from app.schemas.charge import ChargeRecord

router = APIRouter(prefix="/export", tags=["数据导出"])


class ExportBody(BaseModel):
    record_ids: Optional[List[str]] = None


EXPORT_COLUMNS = [
    ("id", "记录ID"),
    ("record_no", "记录编号"),
    ("community_name", "小区名称"),
    ("street_name", "街道名称"),
    ("intersection", "路口"),
    ("address", "地址"),
    ("longitude", "经度"),
    ("latitude", "纬度"),
    ("time_period", "时段"),
    ("peak_type", "峰谷类型"),
    ("scenario_label", "场景标签"),
    ("side_note", "旁注"),
    ("screenshot_note", "截图说明"),
    ("complaint_content", "投诉内容"),
    ("complaint_count", "投诉次数"),
    ("coord_status", "坐标状态"),
    ("coord_verified_address", "坐标校验地址"),
    ("coord_deviation_meters", "坐标偏差(米)"),
    ("status", "状态"),
    ("merge_status", "归并状态"),
    ("bad_data_flags", "坏数据标签"),
    ("source_refs_count", "来源条数"),
    ("import_batch_id", "导入批次ID"),
    ("created_at", "创建时间"),
    ("updated_at", "更新时间"),
    ("version", "版本号"),
]


def _records_to_rows(records: List[ChargeRecord]) -> List[Dict[str, Any]]:
    """将记录列表转换为导出行数据

    Args:
        records: 记录对象列表

    Returns:
        可直接写入 DataFrame 的字典列表
    """
    rows = []
    for rec in records:
        row: Dict[str, Any] = {}
        for field, label in EXPORT_COLUMNS:
            if field == "source_refs_count":
                row[label] = len(rec.source_refs)
            elif field == "bad_data_flags":
                row[label] = ", ".join(rec.bad_data_flags) if rec.bad_data_flags else ""
            elif field in ("created_at", "updated_at"):
                val = getattr(rec, field)
                row[label] = val.strftime("%Y-%m-%d %H:%M:%S") if isinstance(val, datetime) else str(val)
            else:
                val = getattr(rec, field)
                row[label] = "" if val is None else val
        rows.append(row)
    return rows


@router.post("/excel")
def export_to_excel(body: ExportBody):
    """导出记录为 Excel 文件

    如提供 record_ids 则只导出指定记录，否则导出全部。
    文件名使用时间戳 + UUID，生成在 settings.EXPORT_DIR 下，
    返回可直接访问的静态文件 URL。

    Args:
        body: 可选 {record_ids: [...]}

    Returns:
        dict: {url, filename, record_count}

    Raises:
        HTTPException: 404 - 指定的 record_ids 全部不存在
        HTTPException: 500 - 文件生成失败
    """
    if body.record_ids:
        records = []
        for rid in body.record_ids:
            rec = db.get_record(rid)
            if rec:
                records.append(rec)
        if not records:
            raise HTTPException(status_code=404, detail="未找到任何指定的记录")
    else:
        records = db.list_records()

    rows = _records_to_rows(records)
    df = pd.DataFrame(rows)

    filename = f"charge_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.xlsx"
    file_path = settings.EXPORT_DIR / filename

    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_excel(file_path, index=False, engine="openpyxl")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成 Excel 文件失败: {str(e)}"
        )

    return {
        "url": f"/exports/{filename}",
        "filename": filename,
        "record_count": len(records),
    }
