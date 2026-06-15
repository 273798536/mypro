from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import (
    CalculationFormula, TrajectoryDriftCalcRequest, TrajectoryDriftCalcResponse,
    WaterQualityCalcRequest, WaterQualityCalcResponse
)
from ..utils.calculator import (
    TrajectoryDriftCalculator, WaterQualityCalculator,
    TRAJECTORY_DRIFT_FORMULA, WATER_QUALITY_FORMULA
)

router = APIRouter()

drift_calc = TrajectoryDriftCalculator()
water_calc = WaterQualityCalculator()


@router.get("/formulas", response_model=List[CalculationFormula], summary="获取计算公式列表")
def get_formulas():
    """获取所有计算公式，包括公式、单位、适用范围和失败原因"""
    return [
        {
            "name": TRAJECTORY_DRIFT_FORMULA.name,
            "formula": TRAJECTORY_DRIFT_FORMULA.formula,
            "unit": TRAJECTORY_DRIFT_FORMULA.unit,
            "description": TRAJECTORY_DRIFT_FORMULA.description,
            "scope": TRAJECTORY_DRIFT_FORMULA.scope,
            "threshold": TRAJECTORY_DRIFT_FORMULA.threshold,
            "failure_reasons": TRAJECTORY_DRIFT_FORMULA.failure_reasons
        },
        {
            "name": WATER_QUALITY_FORMULA.name,
            "formula": WATER_QUALITY_FORMULA.formula,
            "unit": WATER_QUALITY_FORMULA.unit,
            "description": WATER_QUALITY_FORMULA.description,
            "scope": WATER_QUALITY_FORMULA.scope,
            "threshold": WATER_QUALITY_FORMULA.threshold,
            "failure_reasons": WATER_QUALITY_FORMULA.failure_reasons
        }
    ]


@router.post("/trajectory-drift", response_model=TrajectoryDriftCalcResponse, summary="计算轨迹漂移")
def calculate_trajectory_drift(request: TrajectoryDriftCalcRequest):
    """
    计算两点之间的轨迹漂移量，判断是否超出安全范围

    - **point1_lat**: 起始点纬度（浴场基准点）
    - **point1_lng**: 起始点经度（浴场基准点）
    - **point2_lat**: 目标点纬度（浮标/船舶位置）
    - **point2_lng**: 目标点经度（浮标/船舶位置）
    - **safe_radius**: 安全区域半径，默认500米
    """
    result = drift_calc.calculate(
        request.point1_lat, request.point1_lng,
        request.point2_lat, request.point2_lng,
        request.safe_radius
    )

    if result["failure_reason"] and result["drift_distance"] is None:
        raise HTTPException(status_code=400, detail=result["failure_reason"])

    return result


@router.post("/water-quality", response_model=WaterQualityCalcResponse, summary="计算水质指数")
def calculate_water_quality(request: WaterQualityCalcRequest):
    """
    计算水质综合指数，支持部分指标缺失

    - **water_temperature**: 水温(℃)，可选
    - **ph_value**: pH值，必须
    - **dissolved_oxygen**: 溶解氧(mg/L)，必须
    - **turbidity**: 浊度(NTU)，可选
    - **salinity**: 盐度(psu)，可选
    """
    result = water_calc.calculate(
        water_temperature=request.water_temperature,
        ph_value=request.ph_value,
        dissolved_oxygen=request.dissolved_oxygen,
        turbidity=request.turbidity,
        salinity=request.salinity
    )

    if result["failure_reason"] and result["quality_score"] == 0:
        raise HTTPException(status_code=400, detail=result["failure_reason"])

    return result
