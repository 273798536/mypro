from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json
from io import BytesIO

from ..database import get_db
from ..models import (
    GrayReport, ReportComponent, ReviewSession, User,
    ReportComponentType, ManualCorrection
)
from ..schemas import (
    GrayReportCreate, GrayReportResponse,
    ReportComponentType, ExportRequest
)
from ..auth import get_current_reviewer, get_current_any_role

router = APIRouter()


def _build_report_components(
    session_id: int,
    db: Session,
    include_types: List[ReportComponentType] = None
) -> list:
    if include_types is None:
        include_types = [
            ReportComponentType.SAMPLE_CHANGE,
            ReportComponentType.THRESHOLD_CHANGE,
            ReportComponentType.MANUAL_CORRECTION
        ]
    
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    components = []
    
    if ReportComponentType.SAMPLE_CHANGE in include_types:
        sample_data = session.original_result.get("sample_stats", {}) if session.original_result else {}
        current_sample = session.current_result.get("sample_stats", {}) if session.current_result else {}
        
        sample_changes = {
            "original": sample_data,
            "current": current_sample,
            "diff": {
                k: {"old": sample_data.get(k), "new": current_sample.get(k)}
                for k in set(sample_data.keys()) | set(current_sample.keys())
                if sample_data.get(k) != current_sample.get(k)
            }
        }
        changed_count = len(sample_changes["diff"])
        
        components.append({
            "component_type": ReportComponentType.SAMPLE_CHANGE,
            "title": "样本变化",
            "summary": f"共发现 {changed_count} 项样本统计指标变化",
            "data": sample_changes,
            "changed_count": changed_count
        })
    
    if ReportComponentType.THRESHOLD_CHANGE in include_types:
        original_thresholds = session.original_result.get("thresholds", {}) if session.original_result else {}
        current_thresholds = session.current_result.get("thresholds", {}) if session.current_result else {}
        
        threshold_changes = {
            "original": original_thresholds,
            "current": current_thresholds,
            "diff": {
                k: {"old": original_thresholds.get(k), "new": current_thresholds.get(k)}
                for k in set(original_thresholds.keys()) | set(current_thresholds.keys())
                if original_thresholds.get(k) != current_thresholds.get(k)
            }
        }
        changed_count = len(threshold_changes["diff"])
        
        components.append({
            "component_type": ReportComponentType.THRESHOLD_CHANGE,
            "title": "阈值变化",
            "summary": f"共发现 {changed_count} 项阈值配置变化",
            "data": threshold_changes,
            "changed_count": changed_count
        })
    
    if ReportComponentType.MANUAL_CORRECTION in include_types:
        corrections = db.query(ManualCorrection).filter(
            ManualCorrection.session_id == session_id,
            ManualCorrection.is_overridden == False
        ).all()
        
        correction_data = {
            "total_corrections": len(corrections),
            "by_type": {},
            "details": [
                {
                    "id": c.id,
                    "type": c.correction_type,
                    "target_item_id": c.target_item_id,
                    "target_item_name": c.target_item_name,
                    "original": c.original_judgment,
                    "new": c.new_judgment,
                    "changed_fields": c.changed_fields,
                    "reason": c.reason,
                    "operator": c.operator.full_name if c.operator else None,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                }
                for c in corrections
            ]
        }
        
        for c in corrections:
            correction_data["by_type"][c.correction_type] = correction_data["by_type"].get(c.correction_type, 0) + 1
        
        components.append({
            "component_type": ReportComponentType.MANUAL_CORRECTION,
            "title": "人工改判",
            "summary": f"共 {len(corrections)} 条人工修正记录",
            "data": correction_data,
            "changed_count": len(corrections)
        })
    
    return components


@router.get("", response_model=list[GrayReportResponse])
def list_reports(
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(GrayReport)
    if session_id:
        query = query.filter(GrayReport.session_id == session_id)
    
    reports = query.order_by(GrayReport.generated_at.desc()).all()
    return [GrayReportResponse.model_validate(r) for r in reports]


@router.post("", response_model=GrayReportResponse)
def create_report(
    report_data: GrayReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(
        ReviewSession.id == report_data.session_id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    total_changed = sum(comp.changed_count for comp in report_data.components)
    
    report = GrayReport(
        session_id=report_data.session_id,
        report_name=report_data.report_name,
        report_version=report_data.report_version,
        overall_summary=report_data.overall_summary,
        generated_by=current_user.id,
        total_changed=total_changed
    )
    db.add(report)
    db.flush()
    
    for comp_data in report_data.components:
        component = ReportComponent(
            report_id=report.id,
            component_type=comp_data.component_type,
            title=comp_data.title,
            summary=comp_data.summary,
            data=comp_data.data,
            changed_count=comp_data.changed_count
        )
        db.add(component)
    
    session.updated_at = func.now()
    db.commit()
    db.refresh(report)
    
    return GrayReportResponse.model_validate(report)


@router.post("/generate/{session_id}", response_model=GrayReportResponse)
def generate_auto_report(
    session_id: int,
    report_name: str = Query(..., description="报告名称"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    components = _build_report_components(session_id, db)
    
    total_changed = sum(comp["changed_count"] for comp in components)
    
    overall_summary = (
        f"审查会话「{session.session_name}」灰度报告。"
        f"共发现 {total_changed} 项变更："
        f"{components[0]['changed_count']} 项样本变化，"
        f"{components[1]['changed_count']} 项阈值变化，"
        f"{components[2]['changed_count']} 项人工改判。"
    )
    
    report = GrayReport(
        session_id=session_id,
        report_name=report_name,
        report_version="1.0",
        overall_summary=overall_summary,
        generated_by=current_user.id,
        total_changed=total_changed
    )
    db.add(report)
    db.flush()
    
    for comp_data in components:
        component = ReportComponent(
            report_id=report.id,
            component_type=comp_data["component_type"],
            title=comp_data["title"],
            summary=comp_data["summary"],
            data=comp_data["data"],
            changed_count=comp_data["changed_count"]
        )
        db.add(component)
    
    session.updated_at = func.now()
    db.commit()
    db.refresh(report)
    
    return GrayReportResponse.model_validate(report)


@router.get("/{report_id}", response_model=GrayReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    report = db.query(GrayReport).filter(GrayReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报告不存在"
        )
    return GrayReportResponse.model_validate(report)


@router.get("/{report_id}/component/{component_type}")
def get_report_component(
    report_id: int,
    component_type: ReportComponentType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    component = db.query(ReportComponent).filter(
        ReportComponent.report_id == report_id,
        ReportComponent.component_type == component_type
    ).first()
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"报告中无 {component_type} 组件"
        )
    
    return {
        "report_id": report_id,
        "component_type": component_type,
        "title": component.title,
        "summary": component.summary,
        "data": component.data,
        "changed_count": component.changed_count
    }


@router.post("/{report_id}/export")
def export_report(
    report_id: int,
    export_data: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    report = db.query(GrayReport).filter(GrayReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报告不存在"
        )
    
    components = db.query(ReportComponent).filter(
        ReportComponent.report_id == report_id,
        ReportComponent.component_type.in_(export_data.include_components)
    ).all()
    
    export_data_dict = {
        "report_info": {
            "id": report.id,
            "name": report.report_name,
            "version": report.report_version,
            "summary": report.overall_summary,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "total_changed": report.total_changed
        },
        "components": [
            {
                "type": comp.component_type,
                "title": comp.title,
                "summary": comp.summary,
                "changed_count": comp.changed_count,
                "data": comp.data
            }
            for comp in components
        ]
    }
    
    if export_data.format == "json":
        return {
            "filename": f"report_{report_id}.json",
            "format": "json",
            "data": export_data_dict
        }
    elif export_data.format == "xlsx":
        return {
            "message": "Excel导出功能需集成openpyxl库",
            "filename": f"report_{report_id}.xlsx",
            "format": "xlsx",
            "preview": export_data_dict
        }
    else:
        return {
            "message": f"暂不支持 {export_data.format} 格式导出",
            "supported_formats": ["json", "xlsx"]
        }
