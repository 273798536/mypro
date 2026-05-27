from __future__ import annotations

import time
import uuid
from datetime import datetime, date, timedelta

from fastapi import APIRouter, HTTPException
from typing import List

from ..models.schemas import (
    ShadowLossRequest,
    ShadowLossResponse,
    ValidationResult,
    CorrectionTrace,
    EdgeWarning,
    ShadowAttribution,
    StringCalculation,
    ScenarioComparison,
    MaintenanceSuggestion,
    ExportReport,
)
from ..core.validator import InputValidator
from ..core.edge_detector import EdgeDetector
from ..core.shadow_engine import ShadowEngine
from ..core.report_engine import ReportEngine
from ..samples.sample_data import get_sample_request

router = APIRouter(prefix="/api/v1", tags=["shadow-loss"])


@router.post("/shadow-loss/calculate", response_model=ShadowLossResponse)
async def calculate_shadow_loss(request: ShadowLossRequest):
    start = time.time()

    validator = InputValidator(request)
    validations, corrections = validator.validate_all()

    edge_detector = EdgeDetector(request)
    edge_warnings = edge_detector.detect_all()

    blocking = edge_detector.get_blocking_warnings()
    if blocking:
        elapsed = (time.time() - start) * 1000
        return ShadowLossResponse(
            request_id=request.request_id,
            station_id=request.station_id,
            status="failed",
            calculation_date=request.calculation_date,
            validations=validations,
            corrections=corrections,
            edge_warnings=edge_warnings,
            shadow_attributions=[],
            string_calculations=[],
            scenario_comparisons=[],
            maintenance_suggestions=[],
            export_report=None,
            processing_time_ms=round(elapsed, 2),
        )

    shadow_engine = ShadowEngine(request, edge_warnings)
    attributions, string_calculations = shadow_engine.compute()

    report_engine = ReportEngine(request, attributions, string_calculations, edge_warnings)
    scenarios, suggestions, export_report = report_engine.generate_all()

    has_warnings = any(w.severity == "error" for w in validations) or len(edge_warnings) > 0
    status = "partial" if has_warnings else "success"

    elapsed = (time.time() - start) * 1000

    return ShadowLossResponse(
        request_id=request.request_id,
        station_id=request.station_id,
        status=status,
        calculation_date=request.calculation_date,
        validations=validations,
        corrections=corrections,
        edge_warnings=edge_warnings,
        shadow_attributions=attributions,
        string_calculations=string_calculations,
        scenario_comparisons=scenarios,
        maintenance_suggestions=suggestions,
        export_report=export_report,
        processing_time_ms=round(elapsed, 2),
    )


@router.get("/shadow-loss/samples/{sample_type}")
async def get_sample(sample_type: str):
    try:
        req = get_sample_request(sample_type)
        return req.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/shadow-loss/validate-only")
async def validate_request_preview(request: ShadowLossRequest):
    validator = InputValidator(request)
    validations, corrections = validator.validate_all()
    edge_detector = EdgeDetector(request)
    edge_warnings = edge_detector.detect_all()

    return {
        "validations": [v.model_dump() for v in validations],
        "corrections": [c.model_dump() for c in corrections],
        "edge_warnings": [w.model_dump() for w in edge_warnings],
        "is_safe_to_compute": edge_detector.is_safe_to_compute(),
        "data_quality_score": validator.get_data_quality_score(),
    }
