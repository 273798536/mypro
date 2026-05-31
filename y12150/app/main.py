from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import os

from .database import get_db, engine, Base
from .models import AnalysisResult, Inverter
from .schemas import (
    AnalysisResultResponse, AnalysisResultDetail,
    StatusUpdateRequest, SampleGenerateRequest,
    DataImportResponse, ExportRequest
)
from .sample_generator import generate_sample_data
from .analysis import analyze_inverter
from .data_import import (
    import_component_power_csv, import_irradiance_csv,
    import_curtailment_csv, import_json_data
)
from .data_export import export_to_csv, export_to_excel, print_terminal_summary

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="光伏逆变器削峰分析API",
    description="支持样例生成、数据导入、削峰分析、结果查询、状态修改、结果导出",
    version="1.0.0"
)


@app.get("/")
async def root():
    return {
        "name": "光伏逆变器削峰分析系统",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/samples/generate": "生成样例数据",
            "POST /api/data/import": "导入数据材料",
            "POST /api/analysis": "执行分析",
            "GET /api/analysis": "查询分析结果列表",
            "GET /api/analysis/{result_id}": "查询分析详情",
            "PATCH /api/analysis/{result_id}/status": "修改状态",
            "GET /api/analysis/{result_id}/export": "导出结果",
            "GET /api/analysis/{result_id}/trace": "追踪分析链路"
        }
    }


@app.post("/api/samples/generate", summary="生成样例数据")
async def create_sample(
    request: SampleGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    生成样例数据，支持4种场景：
    - normal: 正常场景
    - irradiance_gap: 辐照缺口场景
    - temperature_high: 温度过高场景
    - curtailment_overlap: 限发重叠场景
    """
    try:
        result = generate_sample_data(
            db,
            scenario=request.scenario,
            inverter_name=request.inverter_name,
            analysis_date=request.analysis_date
        )

        analysis_result = analyze_inverter(
            db,
            inverter_id=result['inverter_id'],
            analysis_date=request.analysis_date or datetime(2024, 5, 15),
            scenario=request.scenario
        )
        db.add(analysis_result)
        db.commit()
        db.refresh(analysis_result)

        terminal_summary = print_terminal_summary(analysis_result)
        print("\n" + terminal_summary + "\n")

        return {
            "success": True,
            "message": f"{request.scenario} 场景样例生成完成",
            "sample_data": result,
            "analysis_id": analysis_result.id,
            "summary": terminal_summary
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/data/import", summary="导入数据材料")
async def import_data(
    inverter_id: int,
    data_type: str = Query(..., description="数据类型: component_power/irradiance/curtailment/json"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    导入CSV或JSON格式的数据
    """
    try:
        content = await file.read()
        content_str = content.decode('utf-8')

        inverter = db.query(Inverter).filter(Inverter.id == inverter_id).first()
        if not inverter:
            raise HTTPException(status_code=404, detail=f"逆变器不存在")

        result = {
            "success": True,
            "message": "",
            "component_power_count": 0,
            "irradiance_count": 0,
            "curtailment_count": 0,
            "errors": []
        }

        if data_type == "component_power":
            count, errors = import_component_power_csv(db, inverter_id, content_str)
            result["component_power_count"] = count
            result["errors"] = errors
            result["message"] = f"导入组件功率数据 {count} 条"
        elif data_type == "irradiance":
            count, errors = import_irradiance_csv(db, inverter_id, content_str)
            result["irradiance_count"] = count
            result["errors"] = errors
            result["message"] = f"导入辐照度数据 {count} 条"
        elif data_type == "curtailment":
            count, errors = import_curtailment_csv(db, inverter_id, content_str)
            result["curtailment_count"] = count
            result["errors"] = errors
            result["message"] = f"导入限发记录 {count} 条"
        elif data_type == "json":
            json_result = import_json_data(db, inverter_id, content_str)
            result.update(json_result)
            result["message"] = "JSON数据导入完成"
        else:
            raise HTTPException(status_code=400, detail=f"未知数据类型: {data_type}")

        if result["errors"]:
            result["success"] = False
            result["message"] += f"，存在 {len(result['errors'])} 个错误"

        return DataImportResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/analysis", summary="执行削峰分析")
async def run_analysis(
    inverter_id: int,
    analysis_date: datetime,
    scenario: str = "custom",
    db: Session = Depends(get_db)
):
    """
    对指定逆变器和日期执行削峰分析
    """
    try:
        result = analyze_inverter(db, inverter_id, analysis_date, scenario)
        db.add(result)
        db.commit()
        db.refresh(result)

        terminal_summary = print_terminal_summary(result)
        print("\n" + terminal_summary + "\n")

        return {
            "success": True,
            "analysis_id": result.id,
            "summary": terminal_summary
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/analysis", response_model=List[AnalysisResultResponse], summary="查询分析结果列表")
async def list_analysis(
    inverter_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    查询分析结果列表，支持按逆变器和状态筛选
    """
    query = db.query(AnalysisResult)
    if inverter_id:
        query = query.filter(AnalysisResult.inverter_id == inverter_id)
    if status:
        query = query.filter(AnalysisResult.status == status)

    results = query.order_by(AnalysisResult.created_at.desc()).offset(skip).limit(limit).all()
    return results


@app.get("/api/analysis/{result_id}", response_model=AnalysisResultDetail, summary="查询分析详情")
async def get_analysis_detail(
    result_id: int,
    db: Session = Depends(get_db)
):
    """
    查询单条分析结果的详细信息，包含功率曲线、削峰时段、损失分析
    """
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"分析结果不存在")

    terminal_summary = print_terminal_summary(result)
    print("\n" + terminal_summary + "\n")

    return result


@app.patch("/api/analysis/{result_id}/status", summary="修改分析状态")
async def update_analysis_status(
    result_id: int,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    修改分析结果状态：pending/processing/completed/confirmed
    """
    valid_statuses = ["pending", "processing", "completed", "confirmed"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，必须为: {valid_statuses}")

    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"分析结果不存在")

    result.status = request.status
    if request.status == "confirmed" and request.confirmed_by:
        result.confirmed_by = request.confirmed_by
        result.confirmed_at = datetime.now()

    db.commit()
    db.refresh(result)

    return {
        "success": True,
        "message": f"状态已更新为 {request.status}",
        "result_id": result.id,
        "new_status": result.status,
        "confirmed_by": result.confirmed_by,
        "confirmed_at": result.confirmed_at
    }


@app.get("/api/analysis/{result_id}/export", summary="导出分析结果")
async def export_analysis(
    result_id: int,
    format: str = Query("csv", description="导出格式: csv/excel"),
    include_details: bool = Query(True, description="是否包含详细数据"),
    db: Session = Depends(get_db)
):
    """
    导出分析结果为CSV或Excel格式
    确保逆变器参数结论与界面、终端摘要一致
    """
    try:
        if format == "csv":
            filepath = export_to_csv(result_id, db, include_details)
        elif format == "excel":
            filepath = export_to_excel(result_id, db, include_details)
        else:
            raise HTTPException(status_code=400, detail="不支持的格式，使用 csv 或 excel")

        result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
        if result:
            terminal_summary = print_terminal_summary(result)
            print("\n" + terminal_summary + "\n")
            print(f"文件已导出: {filepath}\n")

        filename = os.path.basename(filepath)
        media_type = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return FileResponse(
            path=str(filepath),
            filename=filename,
            media_type=media_type
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/analysis/{result_id}/trace", summary="追踪分析链路")
async def trace_analysis(
    result_id: int,
    db: Session = Depends(get_db)
):
    """
    从一条分析结果追到功率曲线、削峰识别、损失估算的完整链路
    便于出问题时找人确认
    """
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"分析结果不存在")

    trace_data = {
        "analysis_id": result.id,
        "inverter_id": result.inverter_id,
        "analysis_date": result.analysis_date.isoformat(),
        "scenario": result.scenario,
        "status": result.status,

        "inverter_params": result.inverter_params,

        "power_curve": {
            "description": "功率曲线数据，可对比理论与实际功率的差异",
            "data_points_count": len(result.power_curve_data['timestamps']) if result.power_curve_data else 0,
            "key_metrics": {
                "max_expected": max(result.power_curve_data['expected_power']) if result.power_curve_data else 0,
                "max_actual": max(result.power_curve_data['actual_power']) if result.power_curve_data else 0,
                "max_irradiance": max(result.power_curve_data['irradiance']) if result.power_curve_data else 0,
                "max_temp": max(result.power_curve_data['module_temp']) if result.power_curve_data else 0
            },
            "data": result.power_curve_data
        },

        "clipping_identification": {
            "description": "削峰识别结果，标注每个削峰时段的起止时间、原因、损失",
            "clipping_count": len(result.peak_clipping_periods) if result.peak_clipping_periods else 0,
            "threshold": result.clipping_details.get('threshold') if result.clipping_details else None,
            "periods": result.peak_clipping_periods
        },

        "loss_estimation": {
            "description": "损失估算明细，按类型和小时统计",
            "total_expected": result.total_expected_energy,
            "total_actual": result.total_actual_energy,
            "total_loss": result.total_loss_energy,
            "loss_rate": result.loss_rate,
            "breakdown": {
                "clipping_loss": result.clipping_loss,
                "temperature_loss": result.temperature_loss,
                "curtailment_loss": result.curtailment_loss,
                "irradiance_gap_loss": result.irradiance_gap_loss,
                "other_loss": result.other_loss
            },
            "hourly_distribution": result.loss_analysis.get('by_hour') if result.loss_analysis else {},
            "details_count": len(result.loss_analysis['details']) if result.loss_analysis else 0
        },

        "summary": result.summary,

        "verification_points": [
            {
                "section": "功率曲线核对",
                "action": "对比理论功率与实际功率曲线，确认是否存在持续的功率限制",
                "key_data": "expected_power vs actual_power 时间序列"
            },
            {
                "section": "削峰时段核对",
                "action": "检查削峰时段的识别是否准确，原因归类是否合理",
                "key_data": "peak_clipping_periods 中的 cause 字段"
            },
            {
                "section": "损失估算核对",
                "action": "验证各类型损失的计算逻辑和分摊比例",
                "key_data": "loss_analysis.details 中每个时间点的 cause 字段"
            },
            {
                "section": "参数一致性核对",
                "action": "确认逆变器参数在界面、导出文件、终端摘要中一致",
                "key_data": "inverter_params 中的所有字段"
            }
        ]
    }

    terminal_summary = print_terminal_summary(result)
    print("\n" + "=" * 60)
    print("分析链路追踪")
    print("=" * 60)
    print(f"分析ID: {result.id}")
    print(f"功率曲线点数: {trace_data['power_curve']['data_points_count']}")
    print(f"识别削峰时段: {trace_data['clipping_identification']['clipping_count']} 处")
    print(f"损失明细点数: {trace_data['loss_estimation']['details_count']}")
    print(f"总损失: {result.total_loss_energy:.2f} kWh ({result.loss_rate:.2f}%)")
    print("=" * 60 + "\n")

    return trace_data


@app.get("/api/inverters", summary="查询逆变器列表")
async def list_inverters(db: Session = Depends(get_db)):
    inverters = db.query(Inverter).all()
    return inverters


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
