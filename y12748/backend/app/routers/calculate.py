from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from ..database import get_db
from .. import schemas, crud, models
from ..utils import ReliabilityCalculator, FormulaCalculator

router = APIRouter(prefix="/api/calculate", tags=["公式计算 & 寿命曲线"])


@router.post("/reliability-curve")
def calculate_reliability_curve(data: Dict[str, Any] = Body(...),
                                db: Session = Depends(get_db)):
    record_ids = data.get("record_ids", [])
    session_id = data.get("session_id")
    records = []
    for rid in record_ids:
        r = crud.get_question_record(db, rid)
        if r and r.lifetime_hours and r.lifetime_hours > 0:
            records.append(r)

    if not records:
        raise HTTPException(status_code=400, detail="没有有效寿命数据的记录")

    lifetime_data = [float(r.lifetime_hours) for r in records if r.lifetime_hours]
    result = ReliabilityCalculator.calculate_reliability(lifetime_data)

    if not result:
        raise HTTPException(status_code=500, detail="寿命曲线计算失败，数据不足或格式错误")

    material_names = list(set([r.material_name for r in records if r.material_name]))
    material_name = material_names[0] if len(material_names) == 1 else "多种材料混合"

    batch_id = records[0].batch_id if records[0].batch_id else None

    curve_data = {
        "record_id": records[0].id,
        "batch_id": batch_id,
        "session_id": session_id,
        "material_name": material_name,
        "weibull_shape": result.weibull_shape,
        "weibull_scale": result.weibull_scale,
        "mean_lifetime": result.mean_lifetime,
        "median_lifetime": result.median_lifetime,
        "b10_lifetime": result.b10_lifetime,
        "curve_points": result.curve_points
    }

    crud.create_reliability_curve(db, curve_data)

    return {
        "material_name": material_name,
        "sample_count": len(lifetime_data),
        "weibull_shape": result.weibull_shape,
        "weibull_scale": result.weibull_scale,
        "mean_lifetime": result.mean_lifetime,
        "median_lifetime": result.median_lifetime,
        "b10_lifetime": result.b10_lifetime,
        "r_squared": result.r_squared,
        "curve_points": result.curve_points,
        "input_records": [{"id": r.id, "question_id": r.question_id, "lifetime_hours": r.lifetime_hours} for r in records]
    }


@router.post("/arrhenius")
def calculate_arrhenius(lifetime_ref: float, activation_energy: float,
                        temp_ref: float, temp_actual: float):
    try:
        result = FormulaCalculator.arrhenius_lifetime(
            lifetime_ref, activation_energy, temp_ref, temp_actual
        )
        return {
            "formula": "Arrhenius模型",
            "input": {
                "reference_lifetime_hours": lifetime_ref,
                "activation_energy_eV": activation_energy,
                "reference_temperature_C": temp_ref,
                "actual_temperature_C": temp_actual
            },
            "predicted_lifetime_hours": result,
            "acceleration_factor": lifetime_ref / result if result != 0 else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"计算失败: {str(e)}")


@router.post("/inverse-power-law")
def calculate_inverse_power_law(lifetime_ref: float, stress_ref: float,
                                stress_actual: float, exponent: float):
    try:
        result = FormulaCalculator.inverse_power_law(
            lifetime_ref, stress_ref, stress_actual, exponent
        )
        return {
            "formula": "逆幂律模型",
            "input": {
                "reference_lifetime_hours": lifetime_ref,
                "reference_stress": stress_ref,
                "actual_stress": stress_actual,
                "exponent_n": exponent
            },
            "predicted_lifetime_hours": result,
            "acceleration_factor": lifetime_ref / result if result != 0 else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"计算失败: {str(e)}")


@router.post("/eyring")
def calculate_eyring(lifetime_ref: float, temp_ref: float, temp_actual: float,
                     stress_ref: float, stress_actual: float,
                     activation_energy: float, exponent: float):
    try:
        result = FormulaCalculator.eyring_model(
            lifetime_ref, temp_ref, temp_actual, stress_ref, stress_actual,
            activation_energy, exponent
        )
        return {
            "formula": "Eyring模型(温度-应力耦合)",
            "input": {
                "reference_lifetime_hours": lifetime_ref,
                "reference_temperature_C": temp_ref,
                "actual_temperature_C": temp_actual,
                "reference_stress": stress_ref,
                "actual_stress": stress_actual,
                "activation_energy_eV": activation_energy,
                "exponent_n": exponent
            },
            "predicted_lifetime_hours": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"计算失败: {str(e)}")


@router.get("/curves", response_model=List[schemas.ReliabilityCurve])
def list_curves(batch_id: Optional[int] = None,
                session_id: Optional[int] = None,
                skip: int = 0, limit: int = 100,
                db: Session = Depends(get_db)):
    return crud.list_reliability_curves(db, batch_id=batch_id, session_id=session_id,
                                        skip=skip, limit=limit)


@router.get("/curves/{curve_id}", response_model=schemas.ReliabilityCurve)
def get_curve(curve_id: int, db: Session = Depends(get_db)):
    curve = db.query(models.ReliabilityCurve).filter(models.ReliabilityCurve.id == curve_id).first()
    if not curve:
        raise HTTPException(status_code=404, detail="曲线数据不存在")
    return curve
