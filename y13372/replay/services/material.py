from __future__ import annotations
from typing import Optional, List
from sqlalchemy.orm import Session

from replay.models import MaterialVersion, QueueRecord
from replay.engine import add_history


def add_material(
    db: Session,
    record_id: int,
    material_type: str,
    content: Optional[str] = None,
) -> MaterialVersion:
    record = db.query(QueueRecord).filter(QueueRecord.id == record_id).first()
    if not record:
        raise ValueError(f"QueueRecord {record_id} not found")

    existing = (
        db.query(MaterialVersion)
        .filter(
            MaterialVersion.record_id == record_id,
            MaterialVersion.material_type == material_type,
            MaterialVersion.is_current == True,
        )
        .first()
    )

    version = 1
    revised_from = None
    if existing:
        existing.is_current = False
        db.commit()
        version = existing.version + 1
        revised_from = existing.id

    material = MaterialVersion(
        record_id=record_id,
        material_type=material_type,
        content=content,
        version=version,
        is_current=True,
        revised_from=revised_from,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    add_history(
        db,
        session_id=record.session_id,
        event_type="material_version_added",
        event_detail={
            "record_id": record_id,
            "material_type": material_type,
            "version": version,
            "revised_from": revised_from,
        },
        record_id=record_id,
    )

    return material


def list_materials(db: Session, record_id: int) -> List[MaterialVersion]:
    return (
        db.query(MaterialVersion)
        .filter(MaterialVersion.record_id == record_id)
        .order_by(MaterialVersion.material_type, MaterialVersion.version)
        .all()
    )


def get_material_revision_chain(db: Session, material_id: int) -> List[MaterialVersion]:
    chain = []
    current = db.query(MaterialVersion).filter(MaterialVersion.id == material_id).first()
    if not current:
        return chain

    chain.append(current)
    while current.revised_from is not None:
        prev = db.query(MaterialVersion).filter(MaterialVersion.id == current.revised_from).first()
        if not prev:
            break
        chain.append(prev)
        current = prev

    chain.reverse()
    return chain
