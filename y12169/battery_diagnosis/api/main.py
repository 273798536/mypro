import os
import shutil
import tempfile
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ..modules.diagnosis_service import get_diagnosis_service, BatteryDiagnosisService
from ..core.models import DiagnosisResult, DataPacket
from ..core.database import get_db

app = FastAPI(
    title="电动车续航衰减诊断API",
    description="基于行程数据的电动车续航衰减诊断系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service: BatteryDiagnosisService = get_diagnosis_service()


class DiagnosisResponse(BaseModel):
    success: bool
    is_duplicate: bool = False
    diagnosis_id: Optional[str] = None
    diagnosis: Optional[Dict[str, Any]] = None
    charts: Optional[Dict[str, Optional[str]]] = None
    message: Optional[str] = None


class HistoryResponse(BaseModel):
    success: bool
    total: int
    items: List[Dict[str, Any]]


@app.get("/")
async def root():
    return {
        "name": "电动车续航衰减诊断系统",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/diagnosis/upload": "上传数据文件进行诊断",
            "GET /api/diagnosis/{diagnosis_id}": "获取诊断结果",
            "GET /api/diagnosis/history": "获取诊断历史",
            "GET /api/diagnosis/{diagnosis_id}/export": "导出诊断结果",
            "DELETE /api/diagnosis/{diagnosis_id}": "删除诊断记录"
        }
    }


@app.post("/api/diagnosis/upload", response_model=DiagnosisResponse)
async def upload_and_diagnose(
    files: List[UploadFile] = File(...),
    save_result: bool = Query(True, description="是否保存诊断结果")
):
    if not files:
        raise HTTPException(status_code=400, detail="请上传至少一个数据文件")

    temp_dir = tempfile.mkdtemp(prefix="battery_diag_")
    saved_files = []

    try:
        for file in files:
            file_path = Path(temp_dir) / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(str(file_path))

        result = service.diagnose_from_files(saved_files, save_result=save_result)

        diagnosis = result['diagnosis']
        charts = result.get('charts', {})

        response = {
            "success": True,
            "is_duplicate": result.get('is_duplicate', False),
            "diagnosis_id": diagnosis.diagnosis_id,
            "diagnosis": diagnosis.model_dump(mode='json'),
            "charts": charts,
            "message": "诊断完成" if not result.get('is_duplicate') else "检测到重复诊断，返回已有结果"
        }

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"诊断过程中发生错误: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.get("/api/diagnosis/{diagnosis_id}")
async def get_diagnosis(diagnosis_id: str):
    diagnosis = service.get_diagnosis(diagnosis_id)
    if not diagnosis:
        raise HTTPException(status_code=404, detail="诊断记录不存在")

    return {
        "success": True,
        "diagnosis": diagnosis.model_dump(mode='json')
    }


@app.get("/api/diagnosis/history", response_model=HistoryResponse)
async def get_history(
    vin: Optional[str] = Query(None, description="车辆VIN码过滤"),
    start_date: Optional[str] = Query(None, description="开始日期，格式：YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="结束日期，格式：YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量")
):
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="开始日期格式错误，请使用YYYY-MM-DD格式")

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="结束日期格式错误，请使用YYYY-MM-DD格式")

    items = service.get_history(vin, start_dt, end_dt, limit, offset)
    total = service.get_count(vin)

    return {
        "success": True,
        "total": total,
        "items": [item.model_dump(mode='json') for item in items]
    }


@app.get("/api/diagnosis/{diagnosis_id}/export")
async def export_diagnosis(
    diagnosis_id: str,
    format: str = Query("excel", description="导出格式：excel/csv/json")
):
    if format not in ["excel", "csv", "json"]:
        raise HTTPException(status_code=400, detail="不支持的导出格式，请使用excel、csv或json")

    export_result = service.export_diagnosis(diagnosis_id, format=format)

    if not export_result:
        raise HTTPException(status_code=404, detail="诊断记录不存在或导出失败")

    if isinstance(export_result, list):
        export_result = export_result[0]

    if not export_result.exists():
        raise HTTPException(status_code=404, detail="导出文件不存在")

    media_types = {
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv",
        "json": "application/json"
    }

    return FileResponse(
        path=str(export_result),
        filename=export_result.name,
        media_type=media_types.get(format, "application/octet-stream")
    )


@app.delete("/api/diagnosis/{diagnosis_id}")
async def delete_diagnosis(diagnosis_id: str):
    success = service.delete_diagnosis(diagnosis_id)
    if not success:
        raise HTTPException(status_code=404, detail="诊断记录不存在")

    return {
        "success": True,
        "message": "诊断记录已删除"
    }


@app.get("/api/stats")
async def get_stats():
    db = get_db()
    total_diagnosis = db.get_diagnosis_count()

    return {
        "success": True,
        "stats": {
            "total_diagnosis": total_diagnosis,
            "database_path": str(db.db_path)
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
