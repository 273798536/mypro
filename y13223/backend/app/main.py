from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
from urllib.parse import quote

from . import models, schemas, crud
from .database import get_db, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="鼓组节拍异常提醒 API",
    description="琴房前台曲目异常记录与交接系统",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/tracks", response_model=List[schemas.TrackOut])
def list_tracks(
    only_anomaly: Optional[bool] = Query(False, description="只看异常记录"),
    db: Session = Depends(get_db),
):
    return crud.list_tracks(db, only_anomaly=only_anomaly)


@app.get("/api/tracks/{track_id}", response_model=schemas.TrackOut)
def get_track(track_id: int, db: Session = Depends(get_db)):
    track = crud.get_track(db, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="记录不存在")
    return track


@app.post("/api/tracks", response_model=schemas.TrackOut)
def create_track(
    data: schemas.TrackCreate,
    operator: Optional[str] = Query(None),
    source_ref: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.create_track(db, data, operator=operator, source_ref=source_ref)


@app.patch("/api/tracks/{track_id}", response_model=schemas.TrackOut)
def update_track(track_id: int, data: schemas.TrackUpdate, db: Session = Depends(get_db)):
    track = crud.update_track(db, track_id, data)
    if not track:
        raise HTTPException(status_code=404, detail="记录不存在")
    return track


@app.delete("/api/tracks/{track_id}")
def delete_track(track_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_track(db, track_id)
    if not ok:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@app.post("/api/tracks/{track_id}/verify", response_model=schemas.TrackOut)
def human_verify(track_id: int, data: schemas.HumanVerify, db: Session = Depends(get_db)):
    track = crud.human_verify(db, track_id, data)
    if not track:
        raise HTTPException(status_code=404, detail="记录不存在")
    return track


@app.get("/api/tracks/{track_id}/logs", response_model=List[schemas.ChangeLogOut])
def list_logs(track_id: int, db: Session = Depends(get_db)):
    return crud.list_change_logs(db, track_id)


@app.get("/api/export")
def export_excel(
    only_anomaly: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
):
    data = crud.export_excel(db, only_anomaly=only_anomaly)
    buf = io.BytesIO(data)
    buf.seek(0)
    filename = "鼓组节拍异常提醒.xlsx"
    encoded_filename = quote(filename)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"},
    )
