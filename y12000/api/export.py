from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import os

from database import get_db
import models

router = APIRouter()

EXPORT_DIR = "./exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


@router.get("/margin-calls")
def export_margin_calls(call_date: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(models.MarginCall)
    if call_date:
        query = query.filter(models.MarginCall.call_date == call_date)
    if status:
        query = query.filter(models.MarginCall.status == status)
    
    calls = query.all()
    
    data = []
    for call in calls:
        account = db.query(models.Account).filter(models.Account.id == call.account_id).first()
        data.append({
            "追保日期": call.call_date,
            "账户编号": account.account_no if account else "",
            "客户名称": account.customer_name if account else "",
            "担保率(%)": call.margin_ratio,
            "需追加保证金": call.required_deposit,
            "风险等级": call.risk_level,
            "状态": call.status,
            "通知状态": call.notification_status,
            "是否重复": "是" if call.is_duplicate else "否",
            "含折算率过期": "是" if call.has_expired_rate else "否",
            "含停牌股票": "是" if call.has_suspended_stock else "否",
            "下一步行动": call.next_action or "",
            "截止日期": call.deadline,
            "备注": call.remark or ""
        })
    
    df = pd.DataFrame(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"margin_calls_{timestamp}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)
    df.to_excel(filepath, index=False, engine="openpyxl")
    
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )


@router.get("/margin-calls/{call_id}/details")
def export_margin_call_details(call_id: str, db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        return {"error": "追保记录不存在"}
    
    details = db.query(models.MarginCallDetail).filter(
        models.MarginCallDetail.margin_call_id == call_id
    ).all()
    
    data = []
    for detail in details:
        data.append({
            "证券代码": detail.stock_code,
            "证券名称": detail.stock_name,
            "持仓数量": detail.quantity,
            "市值": detail.market_value,
            "折算率": detail.collateral_rate,
            "担保价值": detail.collateral_value,
            "是否停牌": "是" if detail.is_suspended else "否",
            "折算率是否过期": "是" if detail.is_rate_expired else "否",
            "原始折算率": detail.original_collateral_rate,
            "是否人工修改": "是" if detail.is_modified else "否",
            "修改人": detail.modified_by or "",
            "修改时间": detail.modified_at
        })
    
    df = pd.DataFrame(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"margin_call_details_{call_id}_{timestamp}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)
    df.to_excel(filepath, index=False, engine="openpyxl")
    
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )


@router.get("/monthly-report")
def export_monthly_report(year: int, month: int, db: Session = Depends(get_db)):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    calls = db.query(models.MarginCall).filter(
        models.MarginCall.call_date >= start_date,
        models.MarginCall.call_date < end_date
    ).all()
    
    summary = {
        "月份": f"{year}年{month}月",
        "总追保次数": len(calls),
        "预警次数": len([c for c in calls if c.risk_level == "warning"]),
        "危险次数": len([c for c in calls if c.risk_level == "danger"]),
        "待确认": len([c for c in calls if c.status == "pending_confirm"]),
        "待处理": len([c for c in calls if c.status == "pending"]),
        "已处理": len([c for c in calls if c.status == "processed"]),
        "已关闭": len([c for c in calls if c.status == "closed"]),
        "含折算率过期": len([c for c in calls if c.has_expired_rate]),
        "含停牌股票": len([c for c in calls if c.has_suspended_stock]),
        "重复通知": len([c for c in calls if c.is_duplicate])
    }
    
    detail_data = []
    for call in calls:
        account = db.query(models.Account).filter(models.Account.id == call.account_id).first()
        detail_data.append({
            "追保日期": call.call_date,
            "账户编号": account.account_no if account else "",
            "客户名称": account.customer_name if account else "",
            "担保率(%)": call.margin_ratio,
            "风险等级": call.risk_level,
            "状态": call.status,
            "通知状态": call.notification_status,
            "需追加保证金": call.required_deposit
        })
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"monthly_report_{year}{month:02d}_{timestamp}.xlsx"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        pd.DataFrame([summary]).to_excel(writer, sheet_name="汇总", index=False)
        pd.DataFrame(detail_data).to_excel(writer, sheet_name="明细", index=False)
    
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )


@router.get("/trace/{call_id}")
def trace_margin_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        return {"error": "追保记录不存在"}
    
    account = db.query(models.Account).filter(models.Account.id == call.account_id).first()
    positions = db.query(models.Position).filter(models.Position.account_id == call.account_id).all()
    details = db.query(models.MarginCallDetail).filter(
        models.MarginCallDetail.margin_call_id == call_id
    ).all()
    
    trace_result = {
        "追保记录": {
            "id": call.id,
            "call_date": call.call_date,
            "margin_ratio": call.margin_ratio,
            "risk_level": call.risk_level,
            "status": call.status
        },
        "客户账户": {
            "account_no": account.account_no,
            "customer_name": account.customer_name,
            "total_assets": account.total_assets,
            "total_debt": account.total_debt,
            "available_cash": account.available_cash
        } if account else None,
        "证券持仓溯源": []
    }
    
    for detail in details:
        position = next((p for p in positions if p.stock_code == detail.stock_code), None)
        trace_result["证券持仓溯源"].append({
            "证券代码": detail.stock_code,
            "证券名称": detail.stock_name,
            "持仓数量": detail.quantity,
            "市值": detail.market_value,
            "折算率": detail.collateral_rate,
            "担保价值": detail.collateral_value,
            "持仓记录ID": position.id if position else None,
            "持仓成本价": position.cost_price if position else None,
            "是否停牌": detail.is_suspended,
            "折算率是否过期": detail.is_rate_expired,
            "是否人工修改": detail.is_modified
        })
    
    return trace_result
