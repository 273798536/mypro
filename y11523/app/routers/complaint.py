from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.models.database import get_db
from app.models.pydantic_schemas import (
    Complaint,
    ComplaintCreate,
    ComplaintMergeRequest,
    ManualAdjustmentRequest,
)
from app.models.schemas import (
    Complaint as ComplaintModel,
    UserReview as UserReviewModel,
)
from app.utils.complaint_service import ComplaintService
from app.utils.audit import AuditLogger

router = APIRouter(prefix="/api/v1/complaint", tags=["complaint"])


@router.post("/create", response_model=Complaint)
async def create_complaint(
    data: ComplaintCreate,
    operator: str,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    complaint_service = ComplaintService(db, operator, audit_logger)

    try:
        complaint = complaint_service.create_complaint(
            complaint_no=data.complaint_no,
            appointment_no=data.appointment_no,
            complaint_type=data.complaint_type,
            complaint_reason=data.complaint_reason,
            review_id=data.review_id,
        )
        return complaint
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge")
async def merge_complaints(
    data: ComplaintMergeRequest,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    complaint_service = ComplaintService(db, data.operator, audit_logger)

    try:
        complaint = complaint_service.merge_complaints(
            target_complaint_no=data.target_complaint_no,
            source_complaint_nos=data.source_complaint_nos,
            merge_reason=data.merge_reason,
        )
        return {
            "complaint_no": complaint.complaint_no,
            "is_merged": complaint.is_merged,
            "merged_from": complaint.merged_from,
            "merge_evidence_count": {
                k: len(v) for k, v in (complaint.merge_evidence or {}).items()
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{complaint_no}")
async def get_complaint_detail(
    complaint_no: str,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    complaint_service = ComplaintService(db, "system", audit_logger)

    try:
        return complaint_service.get_complaint_detail(complaint_no)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/review/{review_no}/verify-evidence")
async def verify_negative_review_evidence(
    review_no: str,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    complaint_service = ComplaintService(db, "system", audit_logger)

    try:
        has_evidence, missing_evidence, evidence = (
            complaint_service.verify_negative_review_evidence(review_no)
        )
        return {
            "review_no": review_no,
            "has_sufficient_evidence": has_evidence,
            "missing_evidence": missing_evidence,
            "evidence_summary": {k: len(v) for k, v in evidence.items()},
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review/manual-adjust")
async def manual_adjust_review(
    data: ManualAdjustmentRequest,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)

    review = (
        db.query(UserReviewModel)
        .filter(UserReviewModel.review_no == data.review_no)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    old_value = {
        "is_negative": review.is_negative,
        "negative_reason": review.negative_reason,
    }

    if data.is_negative is not None:
        review.is_negative = data.is_negative
    if data.negative_reason is not None:
        review.negative_reason = data.negative_reason

    review.manually_adjusted = True
    review.adjusted_by = data.operator
    from datetime import datetime

    review.adjusted_at = datetime.now()
    review.adjustment_reason = data.adjustment_reason

    db.commit()
    db.refresh(review)

    new_value = {
        "is_negative": review.is_negative,
        "negative_reason": review.negative_reason,
    }

    audit_logger.log_adjustment(
        entity_type="UserReview",
        entity_id=data.review_no,
        operator=data.operator,
        old_value=old_value,
        new_value=new_value,
        adjustment_reason=data.adjustment_reason,
    )

    return {
        "review_no": data.review_no,
        "manually_adjusted": True,
        "adjusted_by": data.operator,
        "adjusted_at": review.adjusted_at,
    }
