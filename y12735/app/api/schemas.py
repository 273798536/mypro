from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.models import ResultClassification, ReviewerRole


class ApproveRequest(BaseModel):
    reviewer: str
    role: ReviewerRole = ReviewerRole.EDITOR
    note: str = ""
    corrections: dict[str, object] = Field(default_factory=dict)


class RejectRequest(BaseModel):
    reviewer: str
    role: ReviewerRole = ReviewerRole.EDITOR
    reason: str
    corrections: dict[str, object] = Field(default_factory=dict)


class ResetRequest(BaseModel):
    reviewer: str
    role: ReviewerRole = ReviewerRole.EDITOR
    note: str = ""


class OverrideClassificationRequest(BaseModel):
    reviewer: str
    role: ReviewerRole
    new_classification: ResultClassification
    reason: str


class ErrorResponse(BaseModel):
    error: str
    suggestion: Optional[str] = None
