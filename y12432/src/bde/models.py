from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime
from .config import DATABASE_URL

Base = declarative_base()


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_file = Column(String(500), nullable=False, index=True)
    file_hash = Column(String(64), nullable=False, index=True)
    sheet_name = Column(String(200))
    data_type = Column(String(50), nullable=False)
    import_time = Column(DateTime, default=datetime.now, nullable=False)
    imported_by = Column(String(100))
    row_count = Column(Integer, default=0)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer, ForeignKey("import_records.id"))
    notes = Column(Text)

    source_goods = relationship("GoodsItem", back_populates="import_record")
    source_declarations = relationship("CustomsDeclaration", back_populates="import_record")
    source_estimations = relationship("DutyEstimation", back_populates="import_record")


class GoodsItem(Base):
    __tablename__ = "goods_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), index=True)
    source_row = Column(Integer)
    sku = Column(String(100), nullable=False, index=True)
    name = Column(String(500))
    hs_code = Column(String(50), index=True)
    declared_hs_code = Column(String(50))
    origin_country = Column(String(100))
    unit_price = Column(Float)
    currency = Column(String(20))
    quantity = Column(Float)
    unit = Column(String(50))
    contract_no = Column(String(200))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    import_record = relationship("ImportRecord", back_populates="source_goods")
    declarations = relationship("CustomsDeclaration", back_populates="goods_item")
    estimations = relationship("DutyEstimation", back_populates="goods_item")


class CustomsDeclaration(Base):
    __tablename__ = "customs_declarations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), index=True)
    goods_item_id = Column(Integer, ForeignKey("goods_items.id"), index=True)
    source_row = Column(Integer)
    entry_no = Column(String(100), nullable=False, index=True)
    entry_date = Column(Date, index=True)
    sku = Column(String(100), index=True)
    hs_code = Column(String(50), index=True)
    duty_rate = Column(Float)
    tax_rate = Column(Float)
    cif_amount = Column(Float)
    currency = Column(String(20))
    exchange_rate = Column(Float)
    duty_amount = Column(Float)
    tax_amount = Column(Float)
    created_at = Column(DateTime, default=datetime.now)

    import_record = relationship("ImportRecord", back_populates="source_declarations")
    goods_item = relationship("GoodsItem", back_populates="declarations")
    estimations = relationship("DutyEstimation", back_populates="declaration")


class DutyEstimation(Base):
    __tablename__ = "duty_estimations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    import_record_id = Column(Integer, ForeignKey("import_records.id"), index=True)
    goods_item_id = Column(Integer, ForeignKey("goods_items.id"), index=True)
    declaration_id = Column(Integer, ForeignKey("customs_declarations.id"), index=True)
    source_row = Column(Integer)
    report_no = Column(String(100), index=True)
    period = Column(String(50), index=True)
    sku = Column(String(100), index=True)
    estimated_duty = Column(Float)
    estimated_tax = Column(Float)
    exchange_rate_used = Column(Float)
    hs_code_used = Column(String(50))
    estimation_date = Column(Date, index=True)
    estimator = Column(String(100))
    review_status = Column(String(50), default="PENDING", index=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    import_record = relationship("ImportRecord", back_populates="source_estimations")
    goods_item = relationship("GoodsItem", back_populates="estimations")
    declaration = relationship("CustomsDeclaration", back_populates="estimations")
    anomalies = relationship("AnomalyRecord", back_populates="estimation")


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    estimation_id = Column(Integer, ForeignKey("duty_estimations.id"), index=True)
    anomaly_type = Column(String(50), nullable=False, index=True)
    anomaly_description = Column(Text)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    detected_at = Column(DateTime, default=datetime.now)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(100))
    resolution_notes = Column(Text)

    estimation = relationship("DutyEstimation", back_populates="anomalies")


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    export_type = Column(String(50), nullable=False)
    period = Column(String(50), index=True)
    export_time = Column(DateTime, default=datetime.now)
    file_path = Column(String(500))
    row_count = Column(Integer, default=0)
    checksum = Column(String(64))
    exported_by = Column(String(100))
    filters = Column(Text)
    notes = Column(Text)


class HSCodeReference(Base):
    __tablename__ = "hs_code_references"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hs_code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(500))
    duty_rate = Column(Float)
    tax_rate = Column(Float)
    effective_date = Column(Date)
    expiry_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
