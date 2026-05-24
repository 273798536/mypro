from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import io
import pandas as pd

from app.database import get_db
from app.models import User, ReceiptStatus
from app.auth import allow_supervisor, allow_reviewer
from app.crud import get_supervisor_view, get_receipts

router = APIRouter(prefix="/export", tags=["导出"])


def create_excel_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='汇总')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/supervisor/summary")
def export_supervisor_summary(
    status: Optional[ReceiptStatus] = None,
    has_dirty: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipts, total = get_supervisor_view(db, skip=0, limit=10000, status=status, has_dirty=has_dirty)
    
    data = []
    for r in receipts:
        data.append({
            "回执编号": r.receipt_no,
            "素材ID": r.material_id,
            "素材名称": r.material_name,
            "投放平台": r.platform,
            "冻结前状态": r.prev_status.value if r.prev_status else "-",
            "当前状态": r.status.value,
            "冻结原因": r.freeze_reason or "-",
            "复核意见": r.review_remark or "-",
            "报表日期": r.report_date.strftime("%Y-%m-%d") if r.report_date else "-",
            "日报花费": r.daily_cost or 0,
            "结算金额": r.cost_amount or 0,
            "是否含脏数据": "是" if r.has_dirty else "否",
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    
    df = pd.DataFrame(data)
    
    summary_row = {
        "回执编号": "汇总",
        "素材ID": f"共{len(data)}条",
        "素材名称": "-",
        "投放平台": "-",
        "冻结前状态": "-",
        "当前状态": "-",
        "冻结原因": "-",
        "复核意见": "-",
        "报表日期": "-",
        "日报花费": df["日报花费"].sum(),
        "结算金额": df["结算金额"].sum(),
        "是否含脏数据": f"{df['是否含脏数据'].value_counts().get('是', 0)}条",
        "创建时间": "-",
    }
    df = pd.concat([df, pd.DataFrame([summary_row])], ignore_index=True)
    
    filename = f"回执汇总_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return create_excel_response(df, filename)


@router.get("/receipts/list")
def export_receipts_list(
    status: Optional[ReceiptStatus] = None,
    material_id: Optional[str] = None,
    platform: Optional[str] = None,
    has_dirty: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    receipts, total = get_receipts(
        db, skip=0, limit=10000, status=status,
        material_id=material_id, platform=platform, has_dirty=has_dirty
    )
    
    data = []
    for r in receipts:
        data.append({
            "回执编号": r.receipt_no,
            "素材ID": r.material_id,
            "素材名称": r.material_name,
            "原始素材名": r.original_material_name,
            "投放平台": r.platform,
            "审核结果": r.review_result or "-",
            "审核备注": r.review_comment or "-",
            "日报花费": r.daily_cost or 0,
            "曝光量": r.daily_impressions or 0,
            "点击量": r.daily_clicks or 0,
            "二次确认": r.secondary_confirmation or "-",
            "确认日期": r.confirmation_date.strftime("%Y-%m-%d") if r.confirmation_date else "-",
            "报表日期": r.report_date.strftime("%Y-%m-%d") if r.report_date else "-",
            "结算金额": r.cost_amount or 0,
            "状态": r.status.value,
            "是否含脏数据": "是" if r.has_dirty else "-",
            "脏数据类型": ",".join(r.dirty_types) if r.dirty_types else "-",
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    
    df = pd.DataFrame(data)
    filename = f"回执列表_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return create_excel_response(df, filename)


@router.get("/material/trace/{material_id}")
def export_material_trace(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    from app.crud import get_material_history
    
    receipts = get_material_history(db, material_id)
    if not receipts:
        raise HTTPException(status_code=404, detail="未找到该素材的记录")
    
    data = []
    for r in receipts:
        data.append({
            "回执编号": r.receipt_no,
            "素材ID": r.material_id,
            "素材名称": r.material_name,
            "原始素材名": r.original_material_name,
            "投放平台": r.platform,
            "报表日期": r.report_date.strftime("%Y-%m-%d") if r.report_date else "-",
            "状态": r.status.value,
            "日报花费": r.daily_cost or 0,
            "结算金额": r.cost_amount or 0,
            "是否改名": "是" if (r.original_material_name and r.material_name and r.original_material_name != r.material_name) else "否",
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    
    df = pd.DataFrame(data)
    filename = f"素材追溯_{material_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return create_excel_response(df, filename)
