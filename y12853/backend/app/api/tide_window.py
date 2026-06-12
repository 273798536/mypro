from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List, Any
from datetime import date

from app.core.db import get_db
from app.schemas import (
    TideWindowCalcRequest, TideWindowResult as ResultSchema,
    ManualCorrectionRequest, PaginatedResponse, DashboardStats,
)
from app.services.crud_service import (
    compute_or_get_tide_window, apply_manual_correction, confirm_result,
    list_results, get_result_with_logs, list_audit_logs, dashboard_stats,
    list_formulas,
)
from app.services.tide_calculator import classify_result_data, FORMULA_REGISTRY
from app.models import TideWindowResult as ResultModel

router = APIRouter(prefix="/tide-window", tags=["港口拖轮潮窗"])


@router.get("/formulas", response_model=List[dict], summary="计算公式库（含公式/单位/适用范围/失败原因）")
def get_formulas():
    """
    返回所有注册的潮窗计算公式，含：公式表达式、单位、适用范围、失败原因列表。
    海事安全员复核时可对照检查。
    """
    return list_formulas()


@router.post("/calculate", summary="计算或查询潮窗（幂等，同输入不重复创建）")
def calculate_window(
    req: TideWindowCalcRequest,
    force_recompute: bool = Query(False, description="强制重算（忽略幂等缓存）"),
    db: Session = Depends(get_db),
):
    """
    核心计算接口。根据港口+日期+船名生成幂等编号，同输入只计算一次。
    结果包含：潮窗时间、水深统计、负深度数、匹配度、状态(available/pending/recollect)。
    计算公式/适用范围/失败原因见 /formulas 接口。
    """
    result, summary, is_new = compute_or_get_tide_window(db, req, force_recompute=force_recompute)
    if not result:
        raise HTTPException(status_code=500, detail="计算失败")
    db.commit()
    diag = {
        "summary": summary,
        "is_new_or_updated": is_new,
        "formula_used": result.formula_used,
        "formula_note": result.formula_note,
    }
    return {"data": _to_dict(result), "diagnostics": diag}


@router.get("/results", summary="潮窗结果列表（分页，支持多条件筛选）")
def get_results(
    port_code: Optional[str] = Query(None, description="港口代码"),
    date_from: Optional[date] = Query(None, description="作业日期起"),
    date_to: Optional[date] = Query(None, description="作业日期止"),
    data_status: Optional[str] = Query(None,
                                       description="数据状态: available/pending/recollect/confirmed"),
    vessel_name: Optional[str] = Query(None, description="船名模糊匹配"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=200, description="每页数量"),
    order_by: str = Query("-work_date", description="排序：-work_date倒序 / work_date正序"),
    db: Session = Depends(get_db),
):
    items, total, total_pages = list_results(
        db, port_code=port_code, work_date_from=date_from, work_date_to=date_to,
        data_status=data_status, vessel_name=vessel_name,
        page=page, page_size=page_size, order_by=order_by,
    )
    return {
        "total": total, "page": page, "page_size": page_size,
        "total_pages": total_pages, "items": [_to_dict(x) for x in items],
    }


def _to_dict(obj) -> dict:
    """SQLAlchemy model转dict（去掉私有字段，可JSON序列化）"""
    if obj is None:
        return None
    if isinstance(obj, list):
        return [_to_dict(x) for x in obj]
    if isinstance(obj, dict):
        return obj
    try:
        data = {}
        for c in obj.__table__.columns:
            v = getattr(obj, c.name)
            import datetime as _dt
            if isinstance(v, _dt.datetime) and v.tzinfo is not None:
                v = v.replace(tzinfo=None)
            data[c.name] = v
        return data
    except Exception:
        return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


@router.get("/results/{result_id}", summary="单条潮窗结果详情（含结果说明）")
def get_result_detail(result_id: int, db: Session = Depends(get_db)):
    result = get_result_with_logs(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="结果不存在")
    return {"data": _to_dict(result)}


@router.get("/results/{result_id}/summary", summary="结果简短说明（可用/暂缓/需重采 + 原因）")
def get_result_summary(result_id: int, db: Session = Depends(get_db)):
    result = get_result_with_logs(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="结果不存在")
    from app.services.tide_calculator import CalcResult as CRes, CalcDiagnostics
    _nz = lambda v: v.replace(tzinfo=None) if (v and hasattr(v,'tzinfo') and getattr(v,'tzinfo',None) is not None) else v
    fake = CRes(
        success=result.available_flag,
        window_start=_nz(result.window_start), window_end=_nz(result.window_end),
        window_duration_min=result.window_duration_min or 0,
        min_depth=result.min_depth, max_depth=result.max_depth, avg_depth=result.avg_depth,
        under_keel_clearance=result.under_keel_clearance,
        negative_depth_count=result.negative_depth_count or 0,
        tide_water_match_score=result.tide_water_match_score or 0,
        formula_used=result.formula_used or "",
        formula_note=result.formula_note or "",
        failure_reason=result.failure_reason,
        pending_reason=result.pending_reason,
        recollect_reason=result.recollect_reason,
        data_status=result.data_status,
        available_flag=result.available_flag,
    )
    summary = classify_result_data(fake)
    summary["status_label"] = {
        "available": "✅ 可用",
        "pending": "⏳ 暂缓（待复核）",
        "recollect": "🔄 需重新采集",
        "confirmed": "✅ 已确认通过",
    }.get(result.data_status, result.data_status)
    audit_list = list_audit_logs(db, result_id)
    summary["audit_trail"] = [_to_dict(l) for l in audit_list]
    return summary


@router.post("/results/{result_id}/correct", summary="人工修正（留痕）")
def manual_correct(
    result_id: int,
    req: ManualCorrectionRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    人工修正接口。任意字段修改都会写入 correction_audit_logs 留痕。
    常见用法：
    - 状态变更（pending→confirmed）：仅传 new_status + operator + remark
    - 字段修正：传 field_name + old_value + new_value + operator + remark
    - 两者同时：一起传
    """
    req.result_id = result_id
    ip = request.client.host if request.client else ""
    result = apply_manual_correction(db, req, ip_address=ip)
    if not result:
        raise HTTPException(status_code=404, detail="结果不存在")
    db.commit()
    return {"data": _to_dict(result), "message": "修正已记录留痕"}


@router.post("/results/{result_id}/confirm", summary="海事安全员复核通过（待确认→已通过）")
def confirm(
    result_id: int,
    operator: str = Query(..., description="复核人"),
    remark: str = Query("", description="复核备注"),
    db: Session = Depends(get_db),
):
    result = confirm_result(db, result_id, operator=operator, remark=remark)
    if not result:
        raise HTTPException(status_code=404, detail="结果不存在")
    db.commit()
    return {"data": _to_dict(result), "message": "已复核通过，前后变化已留痕"}


@router.get("/results/{result_id}/audit-log", summary="修正/确认历史（前后变化完整轨迹）")
def get_audit_log(result_id: int, db: Session = Depends(get_db)):
    logs = list_audit_logs(db, result_id)
    return {
        "result_id": result_id,
        "total": len(logs),
        "items": [_to_dict(l) for l in logs],
    }


@router.get("/dashboard", summary="仪表盘统计")
def get_dashboard(db: Session = Depends(get_db)):
    stats = dashboard_stats(db)
    if isinstance(stats, dict):
        return stats
    return _to_dict(stats)
