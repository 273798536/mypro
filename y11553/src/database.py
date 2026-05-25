from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _table_exists(engine, table_name):
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def _create_pending_records_table(engine):
    if _table_exists(engine, "pending_records"):
        return False

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE pending_records (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                source_file VARCHAR(255),
                source_row_number INTEGER NOT NULL,
                record_type VARCHAR(32) NOT NULL,
                raw_data TEXT NOT NULL,
                fingerprint VARCHAR(64),
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                retry_times INTEGER NOT NULL DEFAULT 0,
                max_retry_times INTEGER NOT NULL DEFAULT 3,
                error_message TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME,
                FOREIGN KEY(task_id) REFERENCES import_tasks (id)
            )
        """))
        conn.execute(text("CREATE INDEX ix_pending_records_id ON pending_records (id)"))
        conn.execute(text("CREATE INDEX ix_pending_records_fingerprint ON pending_records (fingerprint)"))
        conn.commit()
    return True


def _fix_dirty_data(db):
    from .models import ImportTask, TaskStatus

    dirty_tasks = db.query(ImportTask).filter(
        ImportTask.status == TaskStatus.PROCESSING,
        ImportTask.error_count > 0
    ).all()

    for task in dirty_tasks:
        task.status = TaskStatus.WAITING_RETRY
        task.retry_times = task.retry_times or 0
        if task.retry_times >= task.max_retry_times:
            task.status = TaskStatus.PERMANENT_FAILED
    db.commit()


def _migrate_pending_records(db):
    from .models import ImportTask, PendingRecord, PendingRecordStatus, InventoryRecord, ReplenishmentPhoto, RefundRecord, PriceAdjustment, RecordType, TaskStatus
    from .repository import safe_json_dumps, safe_json_loads

    tasks_without_pending = db.query(ImportTask).filter(
        ~ImportTask.pending_records.any()
    ).all()

    record_type_map = {
        RecordType.INVENTORY: InventoryRecord,
        RecordType.REPLENISHMENT: ReplenishmentPhoto,
        RecordType.REFUND: RefundRecord,
        RecordType.PRICE_ADJUSTMENT: PriceAdjustment,
    }

    for task in tasks_without_pending:
        model = record_type_map.get(task.record_type)
        if not model:
            continue

        records = db.query(model).filter(model.task_id == task.id).order_by(model.source_row_number).all()

        for idx, record in enumerate(records):
            try:
                raw_data = safe_json_loads(record.raw_data) if hasattr(record, 'raw_data') and record.raw_data else {}
            except Exception:
                raw_data = {}

            if task.status == TaskStatus.COMPLETED:
                if hasattr(record, 'is_duplicate') and record.is_duplicate:
                    pending_status = PendingRecordStatus.DUPLICATE
                else:
                    pending_status = PendingRecordStatus.SUCCESS
            elif task.status in [TaskStatus.WAITING_RETRY, TaskStatus.WAITING_MANUAL, TaskStatus.PERMANENT_FAILED, TaskStatus.PROCESSING]:
                if hasattr(record, 'is_duplicate') and record.is_duplicate:
                    pending_status = PendingRecordStatus.DUPLICATE
                else:
                    pending_status = PendingRecordStatus.WAITING_RETRY
                    task.status = TaskStatus.WAITING_RETRY
            else:
                pending_status = PendingRecordStatus.PENDING

            pending = PendingRecord(
                task_id=task.id,
                source_file=task.source_file,
                source_row_number=record.source_row_number or (idx + 1),
                record_type=task.record_type,
                raw_data=safe_json_dumps(raw_data),
                fingerprint=record.fingerprint if hasattr(record, 'fingerprint') else '',
                status=pending_status,
                processed_at=record.created_at if hasattr(record, 'created_at') else None,
            )
            db.add(pending)
    db.commit()


def init_db():
    from . import models
    Base.metadata.create_all(bind=engine)

    if _create_pending_records_table(engine):
        pass

    db = SessionLocal()
    try:
        _fix_dirty_data(db)
        _migrate_pending_records(db)
    finally:
        db.close()
