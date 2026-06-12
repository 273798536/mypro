import json
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import CalculationResult, ChangeTrace, ResultStatus, ChangeCause
from .schemas import (
    ParameterCreate, ParameterUpdate, ParameterResponse, ParameterDetailResponse,
    ParameterHistoryResponse, RemarkCreate, RemarkResponse,
    ScreenshotCreate, ScreenshotUpdate, ScreenshotResponse,
    CalculationRequestCreate, CalculationResultResponse, SegmentResult,
    JumpAnalysisResponse, IdempotencyCheckResponse
)
from .services.parameter_service import ParameterService
from .services.calculation_service import SegmentedRegressionService

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "app_name": settings.APP_NAME})


@app.post("/api/parameters/", response_model=ParameterResponse)
def create_parameter(data: ParameterCreate, db: Session = Depends(get_db)):
    service = ParameterService(db)
    return service.create_parameter(data)


@app.get("/api/parameters/", response_model=List[ParameterResponse])
def list_parameters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service = ParameterService(db)
    return service.get_all_parameters(skip, limit)


@app.get("/api/parameters/{parameter_id}", response_model=ParameterDetailResponse)
def get_parameter(parameter_id: int, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")

    history = service.get_parameter_history(parameter_id)
    remarks = service.get_remarks(parameter_id)
    screenshots = service.get_screenshots(parameter_id)
    latest_result = service.get_latest_result(parameter_id)

    result_data = {
        **parameter.__dict__,
        "history": history,
        "remarks": remarks,
        "screenshots": screenshots,
        "latest_result": latest_result
    }
    return result_data


@app.put("/api/parameters/{parameter_id}", response_model=ParameterResponse)
def update_parameter(parameter_id: int, data: ParameterUpdate, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.update_parameter(parameter_id, data)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")
    return parameter


@app.get("/api/parameters/{parameter_id}/history", response_model=List[ParameterHistoryResponse])
def get_parameter_history(parameter_id: int, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")
    return service.get_parameter_history(parameter_id)


@app.post("/api/remarks/", response_model=RemarkResponse)
def add_remark(data: RemarkCreate, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(data.parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")
    return service.add_remark(data)


@app.get("/api/parameters/{parameter_id}/remarks", response_model=List[RemarkResponse])
def get_remarks(parameter_id: int, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")
    return service.get_remarks(parameter_id)


@app.post("/api/screenshots/", response_model=ScreenshotResponse)
def add_screenshot(data: ScreenshotCreate, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(data.parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")
    return service.add_screenshot(data)


@app.put("/api/screenshots/{screenshot_id}", response_model=ScreenshotResponse)
def update_screenshot(screenshot_id: int, data: ScreenshotUpdate, db: Session = Depends(get_db)):
    service = ParameterService(db)
    screenshot = service.update_screenshot_status(screenshot_id, data)
    if not screenshot:
        raise HTTPException(status_code=404, detail="截图不存在")
    return screenshot


@app.get("/api/parameters/{parameter_id}/screenshots", response_model=List[ScreenshotResponse])
def get_screenshots(parameter_id: int, status: Optional[str] = None, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")

    from .models import ScreenshotStatus
    status_enum = None
    if status:
        try:
            status_enum = ScreenshotStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的状态值")

    return service.get_screenshots(parameter_id, status_enum)


@app.post("/api/calculate/", response_model=CalculationResultResponse)
def calculate(data: CalculationRequestCreate, db: Session = Depends(get_db)):
    service = SegmentedRegressionService(db)
    result = service.calculate(data)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "计算失败"))

    calc_result = result["result"]

    segments = []
    if calc_result.segments:
        try:
            segments_data = json.loads(calc_result.segments)
            segments = [SegmentResult(**s) for s in segments_data]
        except (json.JSONDecodeError, TypeError):
            segments = []

    coefficients = None
    if calc_result.coefficients:
        try:
            coefficients = json.loads(calc_result.coefficients)
        except (json.JSONDecodeError, TypeError):
            coefficients = None

    return {
        **calc_result.__dict__,
        "segments": segments,
        "coefficients": coefficients
    }


@app.post("/api/calculate/check-idempotency", response_model=IdempotencyCheckResponse)
def check_idempotency(data: CalculationRequestCreate, db: Session = Depends(get_db)):
    service = SegmentedRegressionService(db)

    from .models import Parameter
    parameter = db.query(Parameter).filter(Parameter.id == data.parameter_id).first()
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")

    is_duplicate, existing_result = service.check_duplicate_request(
        parameter,
        data.sample_data,
        data.idempotency_key
    )

    result_response = None
    if existing_result:
        segments = []
        if existing_result.segments:
            try:
                segments_data = json.loads(existing_result.segments)
                segments = [SegmentResult(**s) for s in segments_data]
            except (json.JSONDecodeError, TypeError):
                segments = []

        coefficients = None
        if existing_result.coefficients:
            try:
                coefficients = json.loads(existing_result.coefficients)
            except (json.JSONDecodeError, TypeError):
                coefficients = None

        result_response = CalculationResultResponse(
            **existing_result.__dict__,
            segments=segments,
            coefficients=coefficients
        )

    return {
        "is_duplicate": is_duplicate,
        "existing_result": result_response,
        "message": "重复请求，将返回已有结果" if is_duplicate else "新请求，将执行计算"
    }


@app.get("/api/results/{result_id}/jump-analysis", response_model=JumpAnalysisResponse)
def get_jump_analysis(result_id: int, db: Session = Depends(get_db)):
    current_result = db.query(CalculationResult).filter(CalculationResult.id == result_id).first()
    if not current_result:
        raise HTTPException(status_code=404, detail="结果不存在")

    change_traces = db.query(ChangeTrace).filter(ChangeTrace.result_id == result_id).all()

    previous_result = db.query(CalculationResult).filter(
        CalculationResult.parameter_id == current_result.parameter_id,
        CalculationResult.id < current_result.id
    ).order_by(CalculationResult.id.desc()).first()

    def format_result(result: Optional[CalculationResult]) -> Optional[CalculationResultResponse]:
        if not result:
            return None
        segments = []
        if result.segments:
            try:
                segments_data = json.loads(result.segments)
                segments = [SegmentResult(**s) for s in segments_data]
            except (json.JSONDecodeError, TypeError):
                segments = []

        coefficients = None
        if result.coefficients:
            try:
                coefficients = json.loads(result.coefficients)
            except (json.JSONDecodeError, TypeError):
                coefficients = None

        return CalculationResultResponse(
            **result.__dict__,
            segments=segments,
            coefficients=coefficients
        )

    return {
        "result_id": result_id,
        "is_jump": current_result.is_jump,
        "jump_cause": current_result.jump_cause,
        "jump_description": current_result.jump_description,
        "change_traces": change_traces,
        "previous_result": format_result(previous_result),
        "current_result": format_result(current_result)
    }


@app.get("/api/parameters/{parameter_id}/results", response_model=List[CalculationResultResponse])
def get_parameter_results(parameter_id: int, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    service = ParameterService(db)
    parameter = service.get_parameter(parameter_id)
    if not parameter:
        raise HTTPException(status_code=404, detail="参数不存在")

    results = service.get_all_results(parameter_id, skip, limit)

    response_list = []
    for result in results:
        segments = []
        if result.segments:
            try:
                segments_data = json.loads(result.segments)
                segments = [SegmentResult(**s) for s in segments_data]
            except (json.JSONDecodeError, TypeError):
                segments = []

        coefficients = None
        if result.coefficients:
            try:
                coefficients = json.loads(result.coefficients)
            except (json.JSONDecodeError, TypeError):
                coefficients = None

        response_list.append(CalculationResultResponse(
            **result.__dict__,
            segments=segments,
            coefficients=coefficients
        ))

    return response_list


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
