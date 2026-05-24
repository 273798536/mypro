from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.models.database import get_db
from app.models.pydantic_schemas import (
    BatchDataSubmit,
    BatchSubmitResponse,
    Appointment,
)
from app.models.schemas import Appointment as AppointmentModel
from app.utils.batch_service import BatchService
from app.utils.audit import AuditLogger

router = APIRouter(prefix="/api/v1/batch", tags=["batch"])


@router.post("/submit", response_model=BatchSubmitResponse)
async def submit_batch(
    data: BatchDataSubmit,
    request: Request,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    batch_service = BatchService(db, audit_logger)

    try:
        result = batch_service.process_batch(
            batch_no=data.batch_no,
            source=data.source,
            operator=data.operator,
            duplicate_strategy=data.duplicate_strategy,
            appointments=data.appointments,
            locations=data.locations,
            reviews=data.reviews,
            photos=data.photos,
            remark=data.remark,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/appointment/{appointment_no}/withdraw")
async def withdraw_appointment(
    appointment_no: str,
    operator: str,
    reason: str,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    batch_service = BatchService(db, audit_logger)

    try:
        appt = batch_service.withdraw_appointment(
            appointment_no=appointment_no,
            operator=operator,
            reason=reason,
        )
        return {
            "appointment_no": appt.appointment_no,
            "is_withdrawn": appt.is_withdrawn,
            "withdrawn_at": appt.withdrawn_at,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointment/{appointment_no}", response_model=Appointment)
async def get_appointment(
    appointment_no: str,
    db: Session = Depends(get_db),
):
    appt = (
        db.query(AppointmentModel)
        .filter(AppointmentModel.appointment_no == appointment_no)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt
