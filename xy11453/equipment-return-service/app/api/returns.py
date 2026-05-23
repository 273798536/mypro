from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/returns", tags=["returns"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PHOTO_DIR = os.path.join(BASE_DIR, "..", "data", "photos")
os.makedirs(PHOTO_DIR, exist_ok=True)


@router.post("/", response_model=schemas.ReturnRecordResponse)
def create_return_record(
    return_in: schemas.ReturnRecordCreate,
    db: Session = Depends(get_db)
):
    existing = crud.return_record.get_by_return_no(db, return_in.return_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"Return record {return_in.return_no} already exists")
    return crud.return_record.create(db, return_in)


@router.get("/{return_no}", response_model=schemas.ReturnRecordResponse)
def get_return_record(return_no: str, db: Session = Depends(get_db)):
    record = crud.return_record.get_by_return_no(db, return_no)
    if not record:
        raise HTTPException(status_code=404, detail="Return record not found")
    return record


@router.get("/", response_model=List[schemas.ReturnRecordResponse])
def list_return_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.return_record.get_multi(db, skip=skip, limit=limit)


@router.post("/{return_no}/photos", response_model=schemas.ReturnPhotoResponse)
async def upload_return_photo(
    return_no: str,
    photo_no: str = Form(...),
    photo_type: str = Form("general"),
    uploader: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return_record = crud.return_record.get_by_return_no(db, return_no)
    if not return_record:
        raise HTTPException(status_code=404, detail="Return record not found")

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    safe_filename = f"{return_no}_{photo_no}{file_ext}"
    file_path = os.path.join(PHOTO_DIR, safe_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    photo_in = schemas.ReturnPhotoCreate(
        photo_no=photo_no,
        return_record_id=return_record.id,
        file_path=file_path,
        file_name=file.filename,
        file_size=len(content),
        photo_type=photo_type,
        uploader=uploader
    )
    return crud.return_photo.create(db, photo_in)


@router.get("/{return_no}/photos", response_model=List[schemas.ReturnPhotoResponse])
def get_return_photos(return_no: str, db: Session = Depends(get_db)):
    return_record = crud.return_record.get_by_return_no(db, return_no)
    if not return_record:
        raise HTTPException(status_code=404, detail="Return record not found")
    return crud.return_photo.get_by_return_record(db, return_record.id)
