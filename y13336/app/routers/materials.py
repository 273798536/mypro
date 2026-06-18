import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Material, GrayBatch
from app.schemas.schemas import MaterialCreate, MaterialOut

router = APIRouter()


@router.post("/", response_model=MaterialOut)
def add_material(body: MaterialCreate, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    material = Material(
        id=str(uuid.uuid4()),
        batch_id=body.batch_id,
        material_type=body.material_type,
        title=body.title,
        content=body.content,
        linked_query_id=body.linked_query_id,
        linked_doc_id=body.linked_doc_id,
        operator=body.operator,
        created_at=datetime.utcnow(),
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/batch/{batch_id}", response_model=list[MaterialOut])
def list_materials(batch_id: str, db: Session = Depends(get_db)):
    return db.query(Material).filter(
        Material.batch_id == batch_id,
    ).order_by(Material.created_at.desc()).all()


@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: str, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")
    return material
