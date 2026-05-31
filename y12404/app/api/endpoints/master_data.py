from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.schemas.royalty import (
    Producer, ProducerCreate, Track, TrackCreate,
    ExchangeRate, ExchangeRateCreate, PlayReport, PlayReportCreate
)
from app.models.database import Producer as ProducerModel, Track as TrackModel, ExchangeRate as ExchangeRateModel, PlayReport as PlayReportModel

router = APIRouter(prefix="/master", tags=["基础数据"])


@router.post("/producers", response_model=Producer, summary="创建制作人")
def create_producer(producer: ProducerCreate, db: Session = Depends(get_db)):
    db_producer = ProducerModel(**producer.model_dump())
    db.add(db_producer)
    db.commit()
    db.refresh(db_producer)
    return db_producer


@router.get("/producers", response_model=list[Producer], summary="获取制作人列表")
def get_producers(
    name: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(ProducerModel)
    if name:
        query = query.filter(ProducerModel.name.contains(name))
    return query.order_by(ProducerModel.name).offset((page-1)*page_size).limit(page_size).all()


@router.post("/tracks", response_model=Track, summary="创建曲目")
def create_track(track: TrackCreate, db: Session = Depends(get_db)):
    existing = db.query(TrackModel).filter(TrackModel.isrc == track.isrc).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "DUPLICATE_ISRC",
                "error_message": f"ISRC {track.isrc} already exists",
                "user_friendly_message": f"曲目ISRC {track.isrc} 已存在，请检查是否重复录入"
            }
        )
    db_track = TrackModel(**track.model_dump())
    db.add(db_track)
    db.commit()
    db.refresh(db_track)
    return db_track


@router.get("/tracks", response_model=list[Track], summary="获取曲目列表")
def get_tracks(
    title: Optional[str] = None,
    isrc: Optional[str] = None,
    producer_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(TrackModel)
    if title:
        query = query.filter(TrackModel.title.contains(title))
    if isrc:
        query = query.filter(TrackModel.isrc == isrc)
    if producer_id:
        query = query.filter(TrackModel.producer_id == producer_id)
    return query.order_by(TrackModel.title).offset((page-1)*page_size).limit(page_size).all()


@router.post("/exchange-rates", response_model=ExchangeRate, summary="创建汇率")
def create_exchange_rate(rate: ExchangeRateCreate, db: Session = Depends(get_db)):
    existing = db.query(ExchangeRateModel).filter(
        ExchangeRateModel.from_currency == rate.from_currency,
        ExchangeRateModel.to_currency == rate.to_currency,
        ExchangeRateModel.rate_date == rate.rate_date
    ).first()
    if existing:
        existing.rate = rate.rate
        existing.source = rate.source
        db.commit()
        db.refresh(existing)
        return existing
    db_rate = ExchangeRateModel(**rate.model_dump())
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate


@router.get("/exchange-rates", response_model=list[ExchangeRate], summary="获取汇率列表")
def get_exchange_rates(
    from_currency: Optional[str] = None,
    rate_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ExchangeRateModel)
    if from_currency:
        query = query.filter(ExchangeRateModel.from_currency == from_currency)
    if rate_date:
        query = query.filter(ExchangeRateModel.rate_date == rate_date)
    return query.order_by(ExchangeRateModel.rate_date.desc()).limit(100).all()


@router.post("/play-reports", response_model=PlayReport, summary="创建播放报表")
def create_play_report(report: PlayReportCreate, db: Session = Depends(get_db)):
    db_report = PlayReportModel(**report.model_dump())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


@router.get("/play-reports", response_model=list[PlayReport], summary="获取播放报表列表")
def get_play_reports(
    report_period: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PlayReportModel)
    if report_period:
        query = query.filter(PlayReportModel.report_period == report_period)
    if platform:
        query = query.filter(PlayReportModel.platform == platform)
    return query.order_by(PlayReportModel.report_date.desc()).limit(100).all()
