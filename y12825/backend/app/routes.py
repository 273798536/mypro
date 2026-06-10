from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from .models import (
    AnomalyItem,
    CorrectionRecord,
    CorrectionRequest,
    ImportResponse,
    QCStatus,
    QCSummary,
    ViralLoadSampleResponse,
)
from .services import service

router = APIRouter(prefix="/api")


@router.post("/import", response_model=ImportResponse)
async def import_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or "upload.csv"
    batch = service.import_file(content, filename)

    samples = [
        s for s in service.samples if s.import_batch_id == batch.batch_id
    ]

    return ImportResponse(
        batch_id=batch.batch_id,
        total_rows=batch.total_rows,
        clean_rows=batch.clean_rows,
        duplicate_rows=batch.duplicate_rows,
        warnings=batch.warnings,
        duplicate_sample_ids=batch.duplicate_sample_ids,
        samples=[service._to_response(s) for s in samples],
    )


@router.get("/samples", response_model=list[ViralLoadSampleResponse])
async def get_samples(
    qc_status: Optional[QCStatus] = Query(None, alias="qc_status"),
):
    return service.get_samples(qc_status=qc_status)


@router.get("/lineages")
async def get_lineages():
    return service.get_lineages()


@router.get("/lineages/{lineage_id}")
async def get_lineage_detail(lineage_id: str):
    detail = service.get_lineage_detail(lineage_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="谱系不存在")
    return detail


@router.get("/anomalies", response_model=list[AnomalyItem])
async def get_anomalies():
    return service.get_anomalies()


@router.post("/corrections", response_model=CorrectionRecord)
async def add_correction(req: CorrectionRequest):
    record = service.add_correction(
        sample_id=req.sample_id,
        corrected_viral_load=req.corrected_viral_load,
        corrected_notes=req.corrected_notes,
        reason=req.reason,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="样本不存在")
    return record


@router.get("/corrections", response_model=list[CorrectionRecord])
async def get_corrections():
    return service.get_corrections()


@router.get("/qc-summary", response_model=QCSummary)
async def get_qc_summary():
    return service.get_qc_summary()
