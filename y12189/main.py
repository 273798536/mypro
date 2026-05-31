import os
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

import models
import schemas
from database import engine, get_db
from validator import validate_score_data, calculate_file_hash, check_duplicate_file

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="民乐谱库检索API", version="1.0.0")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def root():
    return {
        "name": "民乐谱库检索API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "谱库索引": "/scores",
            "标签检索": "/scores/search",
            "借阅历史": "/borrow-records"
        }
    }


@app.post("/scores", response_model=schemas.ScoreUploadResponse, summary="上传曲谱")
async def create_score(
    title: str = Form(..., description="曲谱名称"),
    composer: Optional[str] = Form(None, description="作曲家"),
    key: Optional[str] = Form(None, description="调式"),
    time_signature: Optional[str] = Form(None, description="拍号"),
    total_pages: int = Form(1, description="总页数"),
    remarks: Optional[str] = Form(None, description="备注"),
    file: Optional[UploadFile] = File(None, description="曲谱PDF文件"),
    db: Session = Depends(get_db)
):
    score_data = schemas.ScoreCreate(
        title=title,
        composer=composer,
        key=key,
        time_signature=time_signature,
        total_pages=total_pages,
        remarks=remarks,
        parts=[]
    )

    errors, warnings = validate_score_data(score_data, db)

    file_hash = None
    file_path = None
    if file:
        content = await file.read()
        file_hash = calculate_file_hash(content)
        dup_error = check_duplicate_file(file_hash, db)
        if dup_error:
            errors.append(dup_error)
        else:
            file_path = os.path.join(UPLOAD_DIR, f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}")
            with open(file_path, "wb") as f:
                f.write(content)

    if errors:
        return schemas.ScoreUploadResponse(success=False, errors=errors, warnings=warnings)

    db_score = models.Score(
        title=title,
        composer=composer,
        key=key,
        time_signature=time_signature,
        total_pages=total_pages,
        remarks=remarks,
        file_path=file_path,
        file_name=file.filename if file else None,
        file_hash=file_hash
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)

    return schemas.ScoreUploadResponse(
        success=True,
        score_id=db_score.id,
        warnings=warnings
    )


@app.get("/scores", response_model=List[schemas.Score], summary="曲谱列表")
def read_scores(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    scores = db.query(models.Score).order_by(models.Score.created_at.desc()).offset(skip).limit(limit).all()
    return scores


@app.get("/scores/{score_id}", response_model=schemas.Score, summary="曲谱详情")
def read_score(score_id: int, db: Session = Depends(get_db)):
    score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if score is None:
        raise HTTPException(status_code=404, detail="曲谱不存在")
    return score


@app.get("/scores/{score_id}/download", summary="下载曲谱文件")
def download_score(score_id: int, db: Session = Depends(get_db)):
    score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if score is None:
        raise HTTPException(status_code=404, detail="曲谱不存在")
    if not score.file_path or not os.path.exists(score.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(score.file_path, filename=score.file_name or "score.pdf")


@app.delete("/scores/{score_id}", summary="删除曲谱")
def delete_score(score_id: int, db: Session = Depends(get_db)):
    score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if score is None:
        raise HTTPException(status_code=404, detail="曲谱不存在")
    if score.file_path and os.path.exists(score.file_path):
        os.remove(score.file_path)
    db.delete(score)
    db.commit()
    return {"message": "删除成功"}


@app.get("/scores/search", response_model=schemas.SearchResult, summary="标签检索")
def search_scores(
    keyword: Optional[str] = Query(None, description="关键词（曲名/作曲家）"),
    key: Optional[str] = Query(None, description="调式，如：C调、G调"),
    instrument: Optional[str] = Query(None, description="乐器声部，如：二胡、琵琶"),
    has_file: Optional[bool] = Query(None, description="是否有文件"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.Score)

    if keyword:
        query = query.filter(
            or_(
                models.Score.title.contains(keyword),
                models.Score.composer.contains(keyword)
            )
        )

    if key:
        query = query.filter(models.Score.key.contains(key))

    if instrument:
        query = query.join(models.Part).filter(models.Part.instrument.contains(instrument))

    if has_file is not None:
        if has_file:
            query = query.filter(models.Score.file_path.isnot(None))
        else:
            query = query.filter(models.Score.file_path.is_(None))

    total = query.count()
    items = query.order_by(models.Score.updated_at.desc()).offset(skip).limit(limit).all()

    return schemas.SearchResult(total=total, items=items)


@app.post("/scores/{score_id}/parts", response_model=schemas.Part, summary="添加声部分谱")
def create_part(
    score_id: int,
    part: schemas.PartCreate,
    db: Session = Depends(get_db)
):
    score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if score is None:
        raise HTTPException(status_code=404, detail="曲谱不存在")

    db_part = models.Part(score_id=score_id, **part.dict())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


@app.get("/scores/{score_id}/parts", response_model=List[schemas.Part], summary="曲谱声部列表")
def read_parts(score_id: int, db: Session = Depends(get_db)):
    parts = db.query(models.Part).filter(models.Part.score_id == score_id).all()
    return parts


@app.post("/borrow-records", response_model=schemas.BorrowRecord, summary="创建借阅记录")
def create_borrow_record(
    record: schemas.BorrowRecordCreate,
    db: Session = Depends(get_db)
):
    score = db.query(models.Score).filter(models.Score.id == record.score_id).first()
    if score is None:
        raise HTTPException(status_code=404, detail="曲谱不存在")

    db_record = models.BorrowRecord(**record.dict())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get("/borrow-records", response_model=List[schemas.BorrowRecord], summary="借阅历史列表")
def read_borrow_records(
    borrower: Optional[str] = None,
    score_id: Optional[int] = None,
    is_returned: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.BorrowRecord)

    if borrower:
        query = query.filter(models.BorrowRecord.borrower.contains(borrower))
    if score_id:
        query = query.filter(models.BorrowRecord.score_id == score_id)
    if is_returned is not None:
        if is_returned:
            query = query.filter(models.BorrowRecord.returned_at.isnot(None))
        else:
            query = query.filter(models.BorrowRecord.returned_at.is_(None))

    records = query.order_by(models.BorrowRecord.borrowed_at.desc()).offset(skip).limit(limit).all()

    for record in records:
        score = db.query(models.Score).filter(models.Score.id == record.score_id).first()
        if score:
            record.score_title = score.title

    return records


@app.put("/borrow-records/{record_id}/return", response_model=schemas.BorrowRecord, summary="归还曲谱")
def return_score(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == record_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="借阅记录不存在")
    if record.returned_at:
        raise HTTPException(status_code=400, detail="该曲谱已归还")

    record.returned_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    score = db.query(models.Score).filter(models.Score.id == record.score_id).first()
    if score:
        record.score_title = score.title

    return record


@app.get("/stats", summary="数据统计")
def get_stats(db: Session = Depends(get_db)):
    total_scores = db.query(models.Score).count()
    scores_with_file = db.query(models.Score).filter(models.Score.file_path.isnot(None)).count()
    scores_without_key = db.query(models.Score).filter(
        or_(models.Score.key.is_(None), models.Score.key == "")
    ).count()
    total_parts = db.query(models.Part).count()
    borrowed = db.query(models.BorrowRecord).filter(models.BorrowRecord.returned_at.is_(None)).count()

    keys = db.query(models.Score.key).filter(models.Score.key.isnot(None)).distinct().all()
    instruments = db.query(models.Part.instrument).distinct().all()

    return {
        "曲谱总数": total_scores,
        "已扫描存档": scores_with_file,
        "调式缺失": scores_without_key,
        "声部分谱": total_parts,
        "待归还": borrowed,
        "调式列表": [k[0] for k in keys if k[0]],
        "乐器列表": [i[0] for i in instruments if i[0]]
    }
