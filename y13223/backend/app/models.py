from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), index=True)
    track_name = Column(String(255), index=True)
    track_no = Column(String(50))
    artist = Column(String(255))
    contract_scan_ref = Column(String(255))
    is_anomaly = Column(Boolean, default=False)
    anomaly_type = Column(String(100))
    current_note = Column(Text)
    current_source = Column(String(100), default="system")
    human_verified = Column(Boolean, default=False)
    human_verifier = Column(String(100))
    human_verify_reason = Column(Text)
    next_step = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    change_logs = relationship("ChangeLog", back_populates="track", cascade="all, delete-orphan")


class ChangeLog(Base):
    __tablename__ = "change_logs"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    source = Column(String(100))
    source_ref = Column(String(255))
    operator = Column(String(100))
    changed_at = Column(DateTime, default=datetime.now)

    track = relationship("Track", back_populates="change_logs")
