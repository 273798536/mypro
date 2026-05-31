from __future__ import annotations
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.store.memory import store
from app.models.enrollment import Enrollment, EnrollmentCreate, EnrollmentStatus
from app.models.agreement import Agreement, AgreementCreate, AgreementStatus
from app.models.split import SplitDetail, SplitStatus
from app.models.history import HistoryEntry


router = APIRouter(prefix="/query", tags=["统一查询"])


class SplitWithRelations(BaseModel):
    split: SplitDetail
    enrollment: Optional[dict] = None
    agreement: Optional[dict] = None
    history: List[dict] = Field(default_factory=list)


class UnifiedQueryResult(BaseModel):
    splits: List[SplitWithRelations]
    total_count: int
    filters_applied: Dict = Field(default_factory=dict)


@router.get("/splits", response_model=UnifiedQueryResult, summary="统一查询分账明细")
def query_splits(
    school_id: Optional[str] = Query(None, description="按学校ID筛选"),
    status: Optional[SplitStatus] = Query(None, description="按状态筛选"),
    fee_type: Optional[str] = Query(None, description="按费用类型筛选"),
    enrollment_id: Optional[str] = Query(None, description="按选课记录ID筛选"),
    agreement_id: Optional[str] = Query(None, description="按协议ID筛选"),
):
    filters: Dict = {}
    all_splits = store.list_splits()

    if enrollment_id:
        all_splits = [s for s in all_splits if s.enrollment_id == enrollment_id]
        filters["enrollment_id"] = enrollment_id
    if agreement_id:
        all_splits = [s for s in all_splits if s.agreement_id == agreement_id]
        filters["agreement_id"] = agreement_id
    if status:
        all_splits = [s for s in all_splits if s.status == status]
        filters["status"] = status.value
    if school_id:
        filtered = []
        for s in all_splits:
            if any(it.school_id == school_id for it in s.items):
                filtered.append(s)
        all_splits = filtered
        filters["school_id"] = school_id
    if fee_type:
        filtered = []
        for s in all_splits:
            if any(it.fee_type == fee_type for it in s.items):
                filtered.append(s)
        all_splits = filtered
        filters["fee_type"] = fee_type

    results: List[SplitWithRelations] = []
    for sp in all_splits:
        enr = store.get_enrollment(sp.enrollment_id)
        agr = store.get_agreement(sp.agreement_id) if sp.agreement_id else None
        hist = store.query_history(entity_type="split", entity_id=sp.id)

        results.append(
            SplitWithRelations(
                split=sp,
                enrollment=enr.model_dump(mode="json") if enr else None,
                agreement=agr.model_dump(mode="json") if agr else None,
                history=[h.model_dump(mode="json") for h in hist],
            )
        )

    return UnifiedQueryResult(
        splits=results,
        total_count=len(results),
        filters_applied=filters,
    )


@router.get("/enrollments", summary="查询选课记录")
def query_enrollments(
    student_id: Optional[str] = None,
    home_school_id: Optional[str] = None,
    host_school_id: Optional[str] = None,
    status: Optional[EnrollmentStatus] = None,
):
    enrollments = store.list_enrollments()
    if student_id:
        enrollments = [e for e in enrollments if e.student_id == student_id]
    if home_school_id:
        enrollments = [e for e in enrollments if e.home_school_id == home_school_id]
    if host_school_id:
        enrollments = [e for e in enrollments if e.host_school_id == host_school_id]
    if status:
        enrollments = [e for e in enrollments if e.status == status]
    return [e.model_dump(mode="json") for e in enrollments]


@router.get("/agreements", summary="查询协议")
def query_agreements(
    school_id: Optional[str] = None,
    status: Optional[AgreementStatus] = None,
):
    agreements = store.list_agreements()
    if school_id:
        agreements = [a for a in agreements if school_id in a.school_ids]
    if status:
        agreements = [a for a in agreements if a.status == status]
    return [a.model_dump(mode="json") for a in agreements]


@router.get("/dropouts", summary="查询退课记录")
def query_dropouts(
    student_id: Optional[str] = None,
    enrollment_id: Optional[str] = None,
):
    dropouts = store.list_dropouts()
    if student_id:
        dropouts = [d for d in dropouts if d.student_id == student_id]
    if enrollment_id:
        dropouts = [d for d in dropouts if d.enrollment_id == enrollment_id]
    return [d.model_dump(mode="json") for d in dropouts]
