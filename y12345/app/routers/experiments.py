from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Experiment, NodeMarking
from app.schemas import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentOut,
    ExperimentListItem,
    NodeMarkingCreate,
    NodeMarkingOut,
)
from app.audit import log_change

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("", response_model=ExperimentOut, status_code=201)
def create_experiment(data: ExperimentCreate, db: Session = Depends(get_db)):
    exp = Experiment(**data.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    log_change(
        db, exp.id, "experiment", exp.id,
        "created", None, f"id={exp.id}", reason="initial creation",
    )
    db.commit()
    db.refresh(exp)
    return exp


@router.get("", response_model=List[ExperimentListItem])
def list_experiments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    frequency_min: Optional[float] = None,
    frequency_max: Optional[float] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Experiment)
    if frequency_min is not None:
        q = q.filter(Experiment.frequency_hz >= frequency_min)
    if frequency_max is not None:
        q = q.filter(Experiment.frequency_hz <= frequency_max)
    q = q.order_by(Experiment.created_at.desc())
    return q.offset(skip).limit(limit).all()


@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.patch("/{experiment_id}", response_model=ExperimentOut)
def update_experiment(
    experiment_id: int,
    data: ExperimentUpdate,
    db: Session = Depends(get_db),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_fields = data.model_dump(exclude_unset=True, exclude={"reason"})
    reason = data.reason

    for field, new_val in update_fields.items():
        old_val = getattr(exp, field)
        if old_val != new_val:
            log_change(
                db, exp.id, "experiment", exp.id,
                field, old_val, new_val, reason=reason,
            )
            setattr(exp, field, new_val)

    db.commit()
    db.refresh(exp)
    return exp


@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    log_change(
        db, exp.id, "experiment", exp.id,
        "deleted", f"id={exp.id}", None, reason="user deletion",
    )
    db.delete(exp)
    db.commit()


@router.post("/{experiment_id}/nodes", response_model=NodeMarkingOut, status_code=201)
def add_node(
    experiment_id: int,
    data: NodeMarkingCreate,
    db: Session = Depends(get_db),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    node = NodeMarking(
        experiment_id=experiment_id,
        position_m=data.position_m,
        is_antinode=data.is_antinode,
        manual_override=data.manual_override,
        override_reason=data.override_reason,
    )
    if data.manual_override:
        node.original_position_m = data.position_m
        node.original_is_antinode = data.is_antinode

    db.add(node)
    db.commit()
    db.refresh(node)

    log_change(
        db, exp.id, "node", node.id,
        "created", None, f"pos={node.position_m},antinode={node.is_antinode}",
        reason="node added",
    )
    db.commit()
    return node
