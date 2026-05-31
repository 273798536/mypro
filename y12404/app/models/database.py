from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey, Enum, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./royalty.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class RoyaltyStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    ACCRUED = "accrued"
    SETTLED = "settled"
    DISPUTED = "disputed"


class Currency(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CNY = "CNY"
    AUD = "AUD"
    CAD = "CAD"


class Platform(str, enum.Enum):
    SPOTIFY = "Spotify"
    APPLE_MUSIC = "Apple Music"
    YOUTUBE = "YouTube Music"
    AMAZON = "Amazon Music"
    TIDAL = "Tidal"
    DEEZER = "Deezer"


class EventType(str, enum.Enum):
    STATUS_CHANGE = "status_change"
    ACCRUAL = "accrual"
    SETTLEMENT = "settlement"
    ADJUSTMENT = "adjustment"
    EXPORT = "export"


class Producer(Base):
    __tablename__ = "producers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True)
    contact = Column(String(200))
    email = Column(String(200))
    tax_id = Column(String(100))
    split_ratio = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tracks = relationship("Track", back_populates="producer")
    royalty_details = relationship("RoyaltyDetail", back_populates="producer")


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    isrc = Column(String(12), unique=True, index=True)
    title = Column(String(200), index=True)
    artist = Column(String(200))
    album = Column(String(200))
    producer_id = Column(Integer, ForeignKey("producers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    producer = relationship("Producer", back_populates="tracks")
    royalty_details = relationship("RoyaltyDetail", back_populates="track")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(Enum(Currency), index=True)
    to_currency = Column(Enum(Currency), default=Currency.CNY)
    rate = Column(Numeric(precision=15, scale=6))
    rate_date = Column(Date, index=True)
    source = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


class PlayReport(Base):
    __tablename__ = "play_reports"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(Enum(Platform), index=True)
    report_period = Column(String(20), index=True)
    report_date = Column(Date)
    currency = Column(Enum(Currency))
    total_amount = Column(Numeric(precision=15, scale=2))
    file_name = Column(String(500))
    uploaded_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    royalty_details = relationship("RoyaltyDetail", back_populates="play_report")


class RoyaltyDetail(Base):
    __tablename__ = "royalty_details"

    id = Column(Integer, primary_key=True, index=True)
    play_report_id = Column(Integer, ForeignKey("play_reports.id"))
    track_id = Column(Integer, ForeignKey("tracks.id"))
    producer_id = Column(Integer, ForeignKey("producers.id"))
    platform = Column(Enum(Platform), index=True)
    report_period = Column(String(20), index=True)
    streams = Column(Integer)
    original_currency = Column(Enum(Currency))
    original_amount = Column(Numeric(precision=15, scale=4))
    exchange_rate = Column(Numeric(precision=15, scale=6))
    cny_amount = Column(Numeric(precision=15, scale=2))
    tax_rate = Column(Float, default=0.0)
    withholding_tax = Column(Numeric(precision=15, scale=2), default=0)
    net_amount = Column(Numeric(precision=15, scale=2))
    status = Column(Enum(RoyaltyStatus), default=RoyaltyStatus.PENDING)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    play_report = relationship("PlayReport", back_populates="royalty_details")
    track = relationship("Track", back_populates="royalty_details")
    producer = relationship("Producer", back_populates="royalty_details")
    history = relationship("RoyaltyHistory", back_populates="royalty_detail")


class RoyaltyAccrual(Base):
    __tablename__ = "royalty_accruals"

    id = Column(Integer, primary_key=True, index=True)
    accrual_reference = Column(String(50), unique=True, index=True)
    report_period = Column(String(20), index=True)
    platform = Column(Enum(Platform))
    total_original_amount = Column(Numeric(precision=15, scale=2))
    total_cny_amount = Column(Numeric(precision=15, scale=2))
    total_withholding_tax = Column(Numeric(precision=15, scale=2))
    total_net_amount = Column(Numeric(precision=15, scale=2))
    currency_conversion_note = Column(Text)
    status = Column(String(50), default="completed")
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    details = relationship("RoyaltyDetail", secondary="accrual_details", backref="accruals")


class AccrualDetail(Base):
    __tablename__ = "accrual_details"

    id = Column(Integer, primary_key=True)
    accrual_id = Column(Integer, ForeignKey("royalty_accruals.id"))
    royalty_detail_id = Column(Integer, ForeignKey("royalty_details.id"))


class RoyaltyHistory(Base):
    __tablename__ = "royalty_history"

    id = Column(Integer, primary_key=True, index=True)
    royalty_detail_id = Column(Integer, ForeignKey("royalty_details.id"))
    event_type = Column(Enum(EventType), index=True)
    old_status = Column(Enum(RoyaltyStatus))
    new_status = Column(Enum(RoyaltyStatus))
    old_amount = Column(Numeric(precision=15, scale=2))
    new_amount = Column(Numeric(precision=15, scale=2))
    change_reason = Column(String(500))
    operator = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    royalty_detail = relationship("RoyaltyDetail", back_populates="history")


class ExportLog(Base):
    __tablename__ = "export_logs"

    id = Column(Integer, primary_key=True, index=True)
    export_type = Column(String(50), index=True)
    file_name = Column(String(500))
    filters = Column(Text)
    record_count = Column(Integer)
    exported_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
