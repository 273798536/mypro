from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from io import BytesIO
from app.core.database import get_db
from app.models.schemas import (
    RefundCalculateRequest, BatchRefundResponse,
    BatchReviewRequest, BatchReviewResponse,
    ExportReportRequest, RefundRecordResponse,
    RechargeAmendmentRequest, AmendmentCompareResponse,
)
from app.services.review_export_service import RefundSettlementService, ReviewAndExportService
from app.services.amendment_service import AmendmentService

router = APIRouter(prefix="/api/refund", tags=["退卡结算"])


@router.post("/settlement/batch", response_model=BatchRefundResponse)
def batch_settlement(request: RefundCalculateRequest, db: Session = Depends(get_db)):
    """毕业季批量退卡结算"""
    try:
        result = RefundSettlementService.batch_calculate_refunds(
            db, request.card_nos, request.operator
        )
        return BatchRefundResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/records", response_model=List[RefundRecordResponse])
def get_refund_records(
    batch_no: Optional[str] = None,
    status: Optional[str] = None,
    has_blocked_subsidy: Optional[bool] = None,
    has_cross_day_revoke: Optional[bool] = None,
    has_merged_card: Optional[bool] = None,
    review_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """退费记录查询，支持多维度筛选"""
    records = RefundSettlementService.get_refund_records(
        db,
        batch_no=batch_no,
        status=status,
        has_blocked_subsidy=has_blocked_subsidy,
        has_cross_day_revoke=has_cross_day_revoke,
        has_merged_card=has_merged_card,
        review_status=review_status,
    )
    return records


@router.post("/review/batch", response_model=BatchReviewResponse)
def batch_review(request: BatchReviewRequest, db: Session = Depends(get_db)):
    """月底批量复核"""
    try:
        result = ReviewAndExportService.batch_review(
            db,
            batch_no=request.batch_no,
            refund_nos=request.refund_nos,
            action=request.action,
            reviewer=request.reviewer,
            remark=request.remark,
        )
        return BatchReviewResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/report")
def export_report(request: ExportReportRequest, db: Session = Depends(get_db)):
    """导出报表（月底复盘）"""
    try:
        report_data = ReviewAndExportService.generate_report_data(
            db,
            report_type=request.report_type,
            start_date=request.start_date,
            end_date=request.end_date,
            batch_no=request.batch_no,
            include_blocked=request.include_blocked or True,
            include_cross_day=request.include_cross_day or True,
            include_merged=request.include_merged or True,
        )

        excel_data = ReviewAndExportService.export_to_excel(
            db, request.report_type, report_data
        )

        filename = f"沉淀金报表_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"

        return StreamingResponse(
            iter([excel_data.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/data")
def get_export_data(
    report_type: str = Query(..., description="报表类型: daily/monthly"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    batch_no: Optional[str] = None,
    include_blocked: bool = True,
    include_cross_day: bool = True,
    include_merged: bool = True,
    db: Session = Depends(get_db),
):
    """获取报表数据（不导出文件，供前端展示）"""
    try:
        report_data = ReviewAndExportService.generate_report_data(
            db,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            batch_no=batch_no,
            include_blocked=include_blocked,
            include_cross_day=include_cross_day,
            include_merged=include_merged,
        )
        return {
            "report_type": report_type,
            "total_count": len(report_data),
            "total_refundable": sum(r.refundable_amount for r in report_data),
            "total_blocked": sum(r.blocked_amount for r in report_data),
            "data": report_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/amendment", response_model=AmendmentCompareResponse)
def amend_recharge(request: RechargeAmendmentRequest, db: Session = Depends(get_db)):
    """手动修正充值流水，返回新旧结果并排对比"""
    try:
        result = AmendmentService.amend_recharge(
            db,
            recharge_id=request.recharge_id,
            new_amount=request.new_amount,
            new_subsidy_amount=request.new_subsidy_amount,
            new_self_amount=request.new_self_amount,
            new_is_refundable=request.new_is_refundable,
            new_remark=request.new_remark,
            amend_reason=request.amend_reason,
            operator=request.operator,
        )
        return AmendmentCompareResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/amendment/history")
def get_amendment_history(
    recharge_id: Optional[int] = None,
    card_no: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """查询修正历史"""
    try:
        history = AmendmentService.get_amendment_history(
            db, recharge_id=recharge_id, card_no=card_no
        )
        return {
            "total": len(history),
            "history": history,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/amendment/compare/{amendment_no}")
def compare_amendment(amendment_no: str, db: Session = Depends(get_db)):
    """并排查看单次修正的新旧对比"""
    try:
        comparison = AmendmentService.compare_amendment(db, amendment_no)
        return comparison
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
