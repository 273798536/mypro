from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import NodeMarking, Experiment
from app.schemas import NodeMarkingOut, NodeMarkingUpdate
from app.audit import log_change

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("/{node_id}", response_model=NodeMarkingOut)
def get_node(node_id: int, db: Session = Depends(get_db)):
    node = db.query(NodeMarking).filter(NodeMarking.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.patch("/{node_id}", response_model=NodeMarkingOut)
def update_node(
    node_id: int,
    data: NodeMarkingUpdate,
    db: Session = Depends(get_db),
):
    node = db.query(NodeMarking).filter(NodeMarking.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    update_fields = data.model_dump(exclude_unset=True)
    reason = update_fields.pop("override_reason", None)

    is_manual = False
    for field, new_val in update_fields.items():
        old_val = getattr(node, field)
        if old_val != new_val:
            if not node.manual_override:
                if not hasattr(node, "original_position_m") or node.original_position_m is None:
                    node.original_position_m = node.position_m
                    node.original_is_antinode = node.is_antinode

            log_change(
                db, node.experiment_id, "node", node.id,
                field, old_val, new_val, reason=reason,
            )
            setattr(node, field, new_val)
            is_manual = True

    if is_manual:
        node.manual_override = True
        if reason:
            node.override_reason = reason

    db.commit()
    db.refresh(node)
    return node


@router.delete("/{node_id}", status_code=204)
def delete_node(node_id: int, db: Session = Depends(get_db)):
    node = db.query(NodeMarking).filter(NodeMarking.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    log_change(
        db, node.experiment_id, "node", node.id,
        "deleted", f"id={node_id}", None, reason="node deleted",
    )
    db.delete(node)
    db.commit()
