from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json

from app.database import get_db
from app.models.experiment import (
    Experiment, DataPoint, ValidationResult, FittingResult, ExperimentVersion
)
from app.models.schemas import (
    ExperimentCreate, ExperimentResponse, ExperimentUpdate,
    ExperimentSummary, ValidationResultResponse, FittingResultResponse
)
from app.services.validator import DataValidator
from app.services.fitting import SpringDamperFitter
from app.services.report_generator import ReportGenerator

router = APIRouter()

validator = DataValidator()
fitter = SpringDamperFitter()
report_generator = ReportGenerator()


def _data_points_to_dict(data_points: List[DataPoint]) -> List[Dict[str, Any]]:
    return [
        {
            "timestamp": dp.timestamp,
            "timestamp_unit": dp.timestamp_unit,
            "displacement": dp.displacement,
            "displacement_unit": dp.displacement_unit,
        }
        for dp in data_points
    ]


@router.post("/", response_model=ExperimentResponse)
def create_experiment(experiment: ExperimentCreate, db: Session = Depends(get_db)):
    db_experiment = Experiment(
        name=experiment.name,
        description=experiment.description,
        mass=experiment.mass,
        mass_unit=experiment.mass_unit,
        data_source=experiment.data_source,
        created_by=experiment.created_by,
        status="draft",
        version=1
    )
    db.add(db_experiment)
    db.flush()

    for dp in experiment.data_points:
        db_dp = DataPoint(
            experiment_id=db_experiment.id,
            timestamp=dp.timestamp,
            timestamp_unit=dp.timestamp_unit,
            displacement=dp.displacement,
            displacement_unit=dp.displacement_unit,
            notes=dp.notes
        )
        db.add(db_dp)

    db.commit()
    db.refresh(db_experiment)
    return db_experiment


@router.get("/", response_model=List[ExperimentSummary])
def list_experiments(db: Session = Depends(get_db)):
    experiments = db.query(Experiment).order_by(Experiment.created_at.desc()).all()
    
    result = []
    for exp in experiments:
        dp_count = len(exp.data_points)
        
        has_errors = any(v.severity == "error" for v in exp.validation_results)
        has_warnings = any(v.severity == "warning" for v in exp.validation_results)
        
        result.append(ExperimentSummary(
            id=exp.id,
            name=exp.name,
            status=exp.status,
            mass=exp.mass,
            mass_unit=exp.mass_unit,
            data_points_count=dp_count,
            created_at=exp.created_at,
            version=exp.version,
            has_errors=has_errors,
            has_warnings=has_warnings
        ))
    
    return result


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")
    return experiment


@router.put("/{experiment_id}", response_model=ExperimentResponse)
def update_experiment(
    experiment_id: int, 
    update: ExperimentUpdate, 
    db: Session = Depends(get_db)
):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    old_version = experiment.version

    if update.name is not None:
        experiment.name = update.name
    if update.description is not None:
        experiment.description = update.description
    if update.mass is not None:
        experiment.mass = update.mass
    if update.mass_unit is not None:
        experiment.mass_unit = update.mass_unit
    if update.status is not None:
        experiment.status = update.status

    if update.data_points is not None:
        db.query(DataPoint).filter(DataPoint.experiment_id == experiment_id).delete()
        
        for dp in update.data_points:
            db_dp = DataPoint(
                experiment_id=experiment.id,
                timestamp=dp.timestamp,
                timestamp_unit=dp.timestamp_unit,
                displacement=dp.displacement,
                displacement_unit=dp.displacement_unit,
                notes=dp.notes
            )
            db.add(db_dp)
        
        experiment.version += 1
        
        version_record = ExperimentVersion(
            experiment_id=experiment.id,
            version_number=experiment.version,
            change_description=update.change_description or "更新了数据点",
            changed_by="system"
        )
        db.add(version_record)

        db.query(ValidationResult).filter(ValidationResult.experiment_id == experiment_id).delete()
        db.query(FittingResult).filter(FittingResult.experiment_id == experiment_id).delete()

    db.commit()
    db.refresh(experiment)
    return experiment


@router.post("/{experiment_id}/validate", response_model=List[ValidationResultResponse])
def validate_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    if len(experiment.data_points) < 3:
        raise HTTPException(status_code=400, detail="数据点不足，至少需要3个数据点才能进行校验")

    experiment.status = "validating"
    db.flush()

    db.query(ValidationResult).filter(ValidationResult.experiment_id == experiment_id).delete()

    data_points_dict = _data_points_to_dict(experiment.data_points)
    issues = validator.validate_all(data_points_dict, experiment.mass_unit)

    for issue in issues:
        db_validation = ValidationResult(
            experiment_id=experiment.id,
            check_type=issue.check_type,
            passed=issue.passed,
            message=issue.message,
            affected_points=json.dumps(issue.affected_points) if issue.affected_points else None,
            severity=issue.severity
        )
        db.add(db_validation)

    has_errors = any(not issue.passed and issue.severity == "error" for issue in issues)
    if not has_errors:
        experiment.status = "validated"
    else:
        experiment.status = "draft"

    db.commit()
    
    return experiment.validation_results


@router.post("/{experiment_id}/fit", response_model=FittingResultResponse)
def fit_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    if len(experiment.data_points) < 5:
        raise HTTPException(status_code=400, detail="数据点不足，至少需要5个数据点才能进行拟合")

    validation_errors = db.query(ValidationResult).filter(
        ValidationResult.experiment_id == experiment_id,
        ValidationResult.severity == "error",
        ValidationResult.passed == False
    ).all()

    if validation_errors:
        error_messages = [v.message for v in validation_errors]
        raise HTTPException(
            status_code=400,
            detail=f"存在未解决的严重问题，无法进行拟合：{'; '.join(error_messages)}"
        )

    experiment.status = "fitting"
    db.flush()

    data_points_dict = _data_points_to_dict(experiment.data_points)
    result = fitter.fit(data_points_dict, experiment.mass, experiment.mass_unit)

    if not result:
        experiment.status = "validated"
        db.commit()
        raise HTTPException(status_code=400, detail="拟合失败，请检查数据是否符合阻尼振动规律")

    db.query(FittingResult).filter(FittingResult.experiment_id == experiment_id).delete()

    db_fitting = FittingResult(
        experiment_id=experiment.id,
        spring_constant=result.spring_constant,
        spring_constant_unit=result.spring_constant_unit,
        damping_coefficient=result.damping_coefficient,
        damping_coefficient_unit=result.damping_coefficient_unit,
        natural_frequency=result.natural_frequency,
        damping_ratio=result.damping_ratio,
        r_squared=result.r_squared,
        fitted_equation=result.fitted_equation,
        initial_amplitude=result.initial_amplitude,
        phase=result.phase
    )
    db.add(db_fitting)

    experiment.status = "completed"
    db.commit()
    db.refresh(db_fitting)

    return db_fitting


@router.get("/{experiment_id}/validation", response_model=List[ValidationResultResponse])
def get_validation_results(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")
    return experiment.validation_results


@router.get("/{experiment_id}/fitting", response_model=FittingResultResponse)
def get_fitting_results(experiment_id: int, db: Session = Depends(get_db)):
    fitting = db.query(FittingResult).filter(
        FittingResult.experiment_id == experiment_id
    ).order_by(FittingResult.created_at.desc()).first()
    
    if not fitting:
        raise HTTPException(status_code=404, detail="拟合结果不存在，请先进行拟合")
    return fitting


@router.post("/{experiment_id}/status")
def update_status(
    experiment_id: int, 
    status: str, 
    db: Session = Depends(get_db)
):
    valid_statuses = ["draft", "validating", "validated", "fitting", "completed", "archived"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，可选值: {valid_statuses}")

    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    experiment.status = status
    db.commit()
    db.refresh(experiment)

    return {"status": experiment.status, "message": "状态更新成功"}


@router.get("/{experiment_id}/report")
def generate_report(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    validation_results = []
    for v in experiment.validation_results:
        validation_results.append({
            "check_type": v.check_type,
            "passed": v.passed,
            "message": v.message,
            "severity": v.severity
        })

    fitting = db.query(FittingResult).filter(
        FittingResult.experiment_id == experiment_id
    ).order_by(FittingResult.created_at.desc()).first()

    fitting_result = None
    if fitting:
        fitting_result = {
            "spring_constant": fitting.spring_constant,
            "damping_coefficient": fitting.damping_coefficient,
            "natural_frequency": fitting.natural_frequency,
            "damping_ratio": fitting.damping_ratio,
            "r_squared": fitting.r_squared,
            "fitted_equation": fitting.fitted_equation,
            "initial_amplitude": fitting.initial_amplitude,
            "phase": fitting.phase
        }

    data_points_dict = _data_points_to_dict(experiment.data_points)

    html = report_generator.generate_html_report(
        experiment={
            "name": experiment.name,
            "mass": experiment.mass,
            "mass_unit": experiment.mass_unit,
            "data_source": experiment.data_source,
            "version": experiment.version,
            "created_at": str(experiment.created_at)
        },
        validation_results=validation_results,
        fitting_result=fitting_result,
        data_points=data_points_dict
    )

    from fastapi.responses import HTMLResponse
    response = HTMLResponse(content=html)
    response.headers["Content-Disposition"] = f"inline; filename=spring_damper_report_{experiment_id}.html"
    return response


@router.delete("/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")
    
    db.delete(experiment)
    db.commit()
    
    return {"message": "实验已删除"}
