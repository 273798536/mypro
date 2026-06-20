from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from .models import (
    ProcessingRecord,
    ProcessingStatus,
    ConfirmationRequest,
    EvidenceSubmission,
    DashboardSummary,
    GrayscaleResult,
    CostFormula,
    FieldMapping,
)
from .store import ProcessingStore
from .processor import (
    CostProcessor,
    get_default_field_mappings,
    get_default_formulas,
    get_default_calibration_ratios,
)
from .grayscale import GrayscaleAnalyzer


app = FastAPI(title="AB实验成本看板 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = ProcessingStore()
processor = CostProcessor(
    field_mappings=get_default_field_mappings(),
    formulas=get_default_formulas(),
    calibration_ratios=get_default_calibration_ratios(),
)
grayscale_analyzer = GrayscaleAnalyzer()


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/summary", response_model=DashboardSummary)
async def get_summary():
    return store.get_dashboard_summary()


@app.get("/api/records", response_model=List[ProcessingRecord])
async def get_records(
    status: Optional[ProcessingStatus] = None,
    run_ids: Optional[str] = Query(None, description="逗号分隔的run_id列表"),
):
    if status:
        return store.get_records_by_status(status)
    if run_ids:
        run_id_list = [r.strip() for r in run_ids.split(",")]
        results = store.bulk_get_records(run_id_list)
        return [r for r in results.values() if r is not None]
    return store.get_all_records()


@app.get("/api/records/{run_id}", response_model=ProcessingRecord)
async def get_record(run_id: str):
    record = store.get_record(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record


@app.get("/api/records/{run_id}/status-history")
async def get_status_history(run_id: str):
    record = store.get_record(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return {
        "run_id": run_id,
        "status_history": [s.value for s in store.get_status_history(run_id)],
    }


@app.post("/api/records", response_model=ProcessingRecord)
async def create_record(
    run_id: str,
    raw_data: Dict[str, Any],
    source_file: str = "manual_input",
):
    existing_run_ids = store.get_existing_run_ids()
    record = processor.process_training_log(
        run_id=run_id,
        raw_data=raw_data,
        source_file=source_file,
        existing_run_ids=existing_run_ids,
    )
    store.add_record(record)
    return record


@app.post("/api/records/batch", response_model=List[ProcessingRecord])
async def create_records_batch(
    items: List[Dict[str, Any]],
):
    results = []
    existing_run_ids = store.get_existing_run_ids()
    for item in items:
        run_id = item.get("run_id")
        raw_data = item.get("raw_data", {})
        source_file = item.get("source_file", "batch_input")
        if not run_id:
            continue
        record = processor.process_training_log(
            run_id=run_id,
            raw_data=raw_data,
            source_file=source_file,
            existing_run_ids=existing_run_ids,
        )
        store.add_record(record)
        existing_run_ids.append(run_id)
        results.append(record)
    return results


@app.post("/api/records/{run_id}/confirm", response_model=ProcessingRecord)
async def confirm_record(run_id: str, request: ConfirmationRequest):
    if run_id != request.run_id:
        raise HTTPException(status_code=400, detail="run_id 不匹配")
    record = store.confirm_record(request)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record


@app.post("/api/records/{run_id}/resolve", response_model=ProcessingRecord)
async def resolve_confirmation(
    run_id: str,
    resolution: str,
    resolved_by: str = "user",
):
    record = store.resolve_confirmation(run_id, resolution, resolved_by)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record


@app.post("/api/records/{run_id}/evidence", response_model=ProcessingRecord)
async def add_evidence(run_id: str, submission: EvidenceSubmission):
    if run_id != submission.run_id:
        raise HTTPException(status_code=400, detail="run_id 不匹配")
    record = store.add_evidence(submission)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record


@app.post("/api/records/{run_id}/evidence-complete", response_model=ProcessingRecord)
async def mark_evidence_complete(
    run_id: str,
    marked_by: str = "user",
):
    record = store.mark_evidence_complete(run_id, marked_by)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record


@app.get("/api/records/{run_id}/grayscale", response_model=Optional[GrayscaleResult])
async def get_grayscale_result(run_id: str):
    record = store.get_record(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")
    return record.grayscale_result


@app.post("/api/records/{run_id}/grayscale-analyze")
async def analyze_grayscale(
    run_id: str,
    original_run_id: str,
):
    original_record = store.get_record(original_run_id)
    updated_record = store.get_record(run_id)
    if not original_record or not updated_record:
        raise HTTPException(status_code=404, detail="未找到对比记录")

    result = grayscale_analyzer.analyze(run_id, original_record, updated_record)
    needs_confirm, anomalies = grayscale_analyzer.check_needs_confirmation(result)

    store.update_record(run_id, grayscale_result=result)

    if needs_confirm:
        store.update_record(
            run_id,
            status=ProcessingStatus.NEEDS_CONFIRMATION,
            confirmation_reason="grayscale_anomaly",
            confirmation_note="; ".join(anomalies),
            next_steps=[
                "核对灰度分析的三类变更是否合理",
                "确认成本变化在可接受范围内",
                "如无异常，人工确认通过",
            ],
        )

    return {
        "result": result,
        "needs_confirmation": needs_confirm,
        "anomalies": anomalies,
    }


@app.get("/api/formulas", response_model=List[CostFormula])
async def get_formulas():
    return get_default_formulas()


@app.get("/api/field-mappings", response_model=List[FieldMapping])
async def get_field_mappings():
    return get_default_field_mappings()


@app.get("/api/calibration-ratios")
async def get_calibration_ratios():
    return get_default_calibration_ratios()


@app.get("/api/records/{run_id}/export")
async def export_record(run_id: str):
    record = store.get_record(run_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"未找到 run_id: {run_id}")

    record_dict = json.loads(record.model_dump_json())

    return {
        "run_id": run_id,
        "export_time": datetime.now().isoformat(),
        "training_log": record_dict.get("training_log"),
        "processing_history": {
            "status_history": [s.value for s in store.get_status_history(run_id)],
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
            "processed_at": record.processed_at.isoformat() if record.processed_at else None,
            "processed_by": record.processed_by,
        },
        "cost_calculations": record_dict.get("cost_calculations"),
        "grayscale_result": record_dict.get("grayscale_result"),
        "confirmation": {
            "reason": record.confirmation_reason.value if record.confirmation_reason else None,
            "note": record.confirmation_note,
            "next_steps": record.next_steps,
        },
        "evidence_items": record.evidence_items,
        "api_response": record.api_response,
    }


app.mount("/static", StaticFiles(directory="static"), name="static")
