import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

import data_store

app = FastAPI(title="生态样方覆盖度估算系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EstimationRequest(BaseModel):
    operator: str


class ModifyRequest(BaseModel):
    species_name: str
    new_read_count: int
    operator: str
    reason: str


class AddSpeciesRequest(BaseModel):
    species_name: str
    read_count: int
    operator: str
    reason: str


class RemoveSpeciesRequest(BaseModel):
    species_name: str
    operator: str
    reason: str


class QCResolveRequest(BaseModel):
    flag_id: str
    resolution: str
    operator: str
    mark_contamination_resolved: bool = False


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "生态样方覆盖度估算系统运行中"}


@app.get("/api/samples")
def list_samples():
    samples = data_store.get_all_samples()
    return {"samples": samples}


@app.get("/api/samples/{sample_id}")
def get_sample(sample_id: str):
    sample = data_store.get_sample_detail(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样本未找到")
    return sample


@app.post("/api/samples/{sample_id}/estimate")
def estimate_coverage(sample_id: str, req: EstimationRequest):
    report = data_store.run_estimation(sample_id, req.operator)
    if not report:
        raise HTTPException(status_code=404, detail="样本未找到")
    return report


@app.put("/api/samples/{sample_id}/sequencing")
def modify_sequencing(sample_id: str, req: ModifyRequest):
    result = data_store.modify_sequencing_result(
        sample_id, req.species_name, req.new_read_count, req.operator, req.reason
    )
    if not result:
        raise HTTPException(status_code=404, detail="样本或物种未找到")
    return result


@app.post("/api/samples/{sample_id}/species")
def add_species(sample_id: str, req: AddSpeciesRequest):
    result = data_store.add_species(
        sample_id, req.species_name, req.read_count, req.operator, req.reason
    )
    if not result:
        raise HTTPException(status_code=400, detail="物种已存在或样本未找到")
    return result


@app.delete("/api/samples/{sample_id}/species")
def remove_species(sample_id: str, req: RemoveSpeciesRequest):
    result = data_store.remove_species(
        sample_id, req.species_name, req.operator, req.reason
    )
    if not result:
        raise HTTPException(status_code=404, detail="样本或物种未找到")
    return result


@app.post("/api/samples/{sample_id}/qc/resolve")
def resolve_qc(sample_id: str, req: QCResolveRequest):
    result = data_store.resolve_qc_flag(
        sample_id, req.flag_id, req.resolution, req.operator,
        req.mark_contamination_resolved
    )
    if not result:
        raise HTTPException(status_code=404, detail="样本或质控标记未找到")
    return result


@app.get("/api/samples/{sample_id}/reports")
def list_reports(sample_id: str):
    reports = data_store.get_report_versions(sample_id)
    if reports is None:
        raise HTTPException(status_code=404, detail="样本未找到")
    return {"reports": reports}


@app.get("/api/samples/{sample_id}/reports/compare")
def compare_reports(sample_id: str, version_a: int, version_b: int):
    comparison = data_store.compare_reports(sample_id, version_a, version_b)
    if not comparison:
        raise HTTPException(status_code=404, detail="样本或报告版本未找到")
    return comparison


@app.get("/api/samples/{sample_id}/history")
def get_history(sample_id: str):
    history = data_store.get_processing_history(sample_id)
    if history is None:
        raise HTTPException(status_code=404, detail="样本未找到")
    return {"history": history}


@app.get("/api/samples/{sample_id}/trace/{flag_id}")
def trace_anomaly(sample_id: str, flag_id: str):
    trace = data_store.trace_anomaly(sample_id, flag_id)
    if not trace:
        raise HTTPException(status_code=404, detail="样本或异常标记未找到")
    return trace


@app.post("/api/generate-samples")
def generate_samples():
    samples = data_store.generate_sample_data()
    return {"message": f"已生成 {len(samples)} 个样例样本", "count": len(samples)}


FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_index():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "前端页面未找到"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
