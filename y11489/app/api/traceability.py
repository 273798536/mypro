from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth import AuthService
from app.services.traceability import TraceabilityService

router = APIRouter()


@router.get("/batch/{batch_no}")
def get_batch_traceability(
    batch_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """
    获取批次完整追责链条
    抽检表 ↔ 返工单 ↔ 机台班次 ↔ 手工改价表 互相印证
    生产经理及以上可查看完整数据，其他角色查看脱敏版本
    """
    if not current_user.has_permission(UserRole.QC_INSPECTOR):
        raise HTTPException(status_code=403, detail="权限不足，需质检员及以上角色")
    
    result = TraceabilityService.get_batch_traceability(db, batch_no)
    
    if not current_user.has_permission(UserRole.PRODUCTION_MANAGER):
        result = _mask_sensitive_data(result)
    
    return result


@router.get("/risk/rework")
def detect_rework_risk(
    days: int = 7,
    rework_threshold: int = 2,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """
    检测重复返工风险
    识别同一批次/机台/班次反复返工的异常情况
    """
    if not current_user.has_permission(UserRole.TEAM_LEADER):
        raise HTTPException(status_code=403, detail="权限不足，需组长及以上角色")
    
    return TraceabilityService.detect_rework_risk(
        db=db,
        days=days,
        rework_threshold=rework_threshold,
    )


@router.get("/shift/report")
def get_shift_responsibility_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """
    责任班次追责报告
    按班次统计良率、返工次数、改价记录、风险评分
    可按时间范围筛选
    """
    if not current_user.has_permission(UserRole.PRODUCTION_MANAGER):
        raise HTTPException(status_code=403, detail="权限不足，需生产经理及以上角色")
    
    return TraceabilityService.get_shift_responsibility_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/integrity/yield")
def get_yield_integrity_check(
    batch_no: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """
    良率完整性校验
    检测良率被反复修改、人工改判等异常情况
    防止同一缺陷反复返工后良率被冲掉
    """
    if not current_user.has_permission(UserRole.AUDITOR):
        raise HTTPException(status_code=403, detail="权限不足，需审计员及以上角色")
    
    return TraceabilityService.get_yield_integrity_check(
        db=db,
        batch_no=batch_no,
        days=days,
    )


@router.get("/dashboard/overview")
def get_traceability_dashboard(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """
    生产经理追责总览仪表盘
    整合风险检测、责任班次、完整性校验的关键指标
    """
    if not current_user.has_permission(UserRole.PRODUCTION_MANAGER):
        raise HTTPException(status_code=403, detail="权限不足，需生产经理及以上角色")
    
    risk_report = TraceabilityService.detect_rework_risk(db, days=days)
    integrity_report = TraceabilityService.get_yield_integrity_check(db, days=days)
    shift_report = TraceabilityService.get_shift_responsibility_report(db)
    
    high_risk_shifts = [
        s for s in shift_report["shifts"]
        if s["risk_indicators"]["risk_level"] in ["HIGH", "CRITICAL"]
    ]
    
    return {
        "period_days": days,
        "key_metrics": {
            "total_reworks": risk_report["summary"]["total_reworks"],
            "high_risk_batches": risk_report["summary"]["high_risk_batches"],
            "high_risk_machines": risk_report["summary"]["high_risk_machines"],
            "suspicious_changes": integrity_report["summary"]["suspicious_changes"],
            "data_integrity_score": integrity_report["integrity_score"],
            "high_risk_shifts": len(high_risk_shifts),
        },
        "top_risks": {
            "high_risk_batches": risk_report["high_risk_batches"][:5],
            "high_risk_machines": risk_report["high_risk_machines"][:5],
            "top_defect_types": risk_report["top_defect_types"][:5],
        },
        "high_risk_shifts": high_risk_shifts[:10],
        "rework_trend": risk_report["rework_trend"],
        "alerts": _generate_alerts(risk_report, integrity_report, shift_report),
    }


def _mask_sensitive_data(result: dict) -> dict:
    """
    对非生产经理角色脱敏敏感字段
    """
    if "price_adjustments" in result:
        for pa in result["price_adjustments"]:
            pa["original_price"] = "***"
            pa["adjusted_price"] = "***"
            pa["price_difference"] = "***"
    
    if "change_history" in result:
        for entity_type in ["inspections", "reworks"]:
            for change in result["change_history"].get(entity_type, []):
                if change.get("is_sensitive"):
                    change["old_value"] = "***"
                    change["new_value"] = "***"
    
    result["is_masked"] = True
    return result


def _generate_alerts(
    risk_report: dict,
    integrity_report: dict,
    shift_report: dict,
) -> list:
    """
    生成告警列表
    """
    alerts = []
    
    for batch in risk_report["high_risk_batches"]:
        if batch["risk_level"] == "HIGH":
            alerts.append({
                "level": "WARNING",
                "type": "BATCH_REWORK_RISK",
                "message": f"批次 {batch['batch_no']} 返工 {batch['rework_count']} 次，存在重复返工风险",
            })
    
    for machine in risk_report["high_risk_machines"]:
        if machine["risk_level"] == "HIGH":
            alerts.append({
                "level": "WARNING",
                "type": "MACHINE_REWORK_RISK",
                "message": f"机台 {machine['machine_id']} 关联返工 {machine['rework_count']} 次，存在质量隐患",
            })
    
    if integrity_report["summary"]["manual_changes"] >= 3:
        alerts.append({
            "level": "INFO",
            "type": "MANUAL_CHANGE_ALERT",
            "message": f"近期有 {integrity_report['summary']['manual_changes']} 次人工改判操作，需关注",
        })
    
    if integrity_report["integrity_score"] < 80:
        alerts.append({
            "level": "WARNING",
            "type": "INTEGRITY_RISK",
            "message": f"数据完整性分数为 {integrity_report['integrity_score']}，建议核查",
        })
    
    return alerts
