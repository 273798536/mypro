import sqlite3
import json
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, List, Dict, Any, Iterator

from models import (
    Task, TaskCreate, TaskStatus,
    Attachment, AttachmentCreate,
    Sample, SampleCreate,
    GrayscaleAbnormalRecord, GrayscaleAbnormalRecordCreate,
    JudgmentOverride, JudgmentOverrideCreate,
    Event, EventCreate, EventType,
    JudgmentResult,
)

DB_PATH = "drift_tracker.db"


def _adapt_datetime(dt: datetime) -> str:
    return dt.isoformat()


def _convert_datetime(s: bytes) -> datetime:
    return datetime.fromisoformat(s.decode())


def _adapt_dict(d: Dict[str, Any]) -> str:
    return json.dumps(d, ensure_ascii=False)


def _convert_dict(s: bytes) -> Dict[str, Any]:
    return json.loads(s.decode())


sqlite3.register_adapter(datetime, _adapt_datetime)
sqlite3.register_converter("DATETIME", _convert_datetime)
sqlite3.register_adapter(dict, _adapt_dict)
sqlite3.register_converter("JSON", _convert_dict)


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            task_name TEXT NOT NULL,
            model_version TEXT NOT NULL,
            eval_dataset TEXT NOT NULL,
            parameters JSON NOT NULL DEFAULT '{}',
            owner TEXT NOT NULL DEFAULT 'platform_algo',
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            final_conclusion TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attachments (
            attachment_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            attachment_type TEXT NOT NULL,
            source TEXT NOT NULL,
            content_ref TEXT NOT NULL,
            is_late INTEGER NOT NULL DEFAULT 0,
            metadata JSON NOT NULL DEFAULT '{}',
            received_at DATETIME NOT NULL,
            linked_to_conclusion INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id);

        CREATE TABLE IF NOT EXISTS samples (
            db_id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT NOT NULL,
            sample_id TEXT NOT NULL,
            input_data_ref TEXT,
            expected_output TEXT,
            actual_output TEXT,
            judgment TEXT,
            is_outlier INTEGER NOT NULL DEFAULT 0,
            outlier_reason TEXT,
            judged_at DATETIME,
            judged_by TEXT,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id),
            UNIQUE(task_id, sample_id)
        );
        CREATE INDEX IF NOT EXISTS idx_samples_task ON samples(task_id);

        CREATE TABLE IF NOT EXISTS grayscale_abnormals (
            record_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            sample_id TEXT,
            expected_grayscale_ratio REAL NOT NULL,
            actual_grayscale_ratio REAL NOT NULL,
            reason TEXT NOT NULL,
            detected_by TEXT NOT NULL DEFAULT 'platform_algo',
            detected_at DATETIME NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolved_at DATETIME,
            resolution_note TEXT,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_gray_task ON grayscale_abnormals(task_id);

        CREATE TABLE IF NOT EXISTS judgment_overrides (
            override_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            sample_id TEXT,
            original_judgment TEXT NOT NULL,
            new_judgment TEXT NOT NULL,
            reason TEXT NOT NULL,
            operator TEXT NOT NULL,
            original_source TEXT NOT NULL DEFAULT 'auto_eval',
            created_at DATETIME NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_override_task ON judgment_overrides(task_id);

        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL,
            operator TEXT NOT NULL DEFAULT 'system',
            metadata JSON NOT NULL DEFAULT '{}',
            timestamp DATETIME NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
        """)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class TaskDAO:
    @staticmethod
    def create(data: TaskCreate) -> Task:
        now = datetime.now()
        task_id = _new_id("task")
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO tasks
                   (task_id, task_name, model_version, eval_dataset, parameters,
                    owner, description, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (task_id, data.task_name, data.model_version, data.eval_dataset,
                 data.parameters, data.owner, data.description,
                 TaskStatus.PENDING.value, now, now),
            )
        return TaskDAO.get(task_id)

    @staticmethod
    def get(task_id: str) -> Optional[Task]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM tasks WHERE task_id = ?", (task_id,)
            ).fetchone()
            if not row:
                return None
            return Task(**dict(row))

    @staticmethod
    def list(status: Optional[TaskStatus] = None, limit: int = 100) -> List[Task]:
        with get_conn() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                    (status.value, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            return [Task(**dict(r)) for r in rows]

    @staticmethod
    def update_status(task_id: str, status: TaskStatus,
                      final_conclusion: Optional[JudgmentResult] = None) -> Optional[Task]:
        now = datetime.now()
        with get_conn() as conn:
            if final_conclusion is not None:
                conn.execute(
                    "UPDATE tasks SET status = ?, final_conclusion = ?, updated_at = ? WHERE task_id = ?",
                    (status.value, final_conclusion.value, now, task_id),
                )
            else:
                conn.execute(
                    "UPDATE tasks SET status = ?, updated_at = ? WHERE task_id = ?",
                    (status.value, now, task_id),
                )
        return TaskDAO.get(task_id)


class AttachmentDAO:
    @staticmethod
    def create(data: AttachmentCreate) -> Attachment:
        now = datetime.now()
        att_id = _new_id("att")
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO attachments
                   (attachment_id, task_id, attachment_type, source, content_ref,
                    is_late, metadata, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (att_id, data.task_id, data.attachment_type, data.source,
                 data.content_ref, 1 if data.is_late else 0,
                 data.metadata, now),
            )
        return AttachmentDAO.get(att_id)

    @staticmethod
    def get(attachment_id: str) -> Optional[Attachment]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM attachments WHERE attachment_id = ?", (attachment_id,)
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            d["is_late"] = bool(d["is_late"])
            d["linked_to_conclusion"] = bool(d["linked_to_conclusion"])
            return Attachment(**d)

    @staticmethod
    def list_by_task(task_id: str) -> List[Attachment]:
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM attachments WHERE task_id = ? ORDER BY received_at",
                (task_id,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["is_late"] = bool(d["is_late"])
                d["linked_to_conclusion"] = bool(d["linked_to_conclusion"])
                result.append(Attachment(**d))
            return result

    @staticmethod
    def mark_linked(attachment_id: str) -> None:
        with get_conn() as conn:
            conn.execute(
                "UPDATE attachments SET linked_to_conclusion = 1 WHERE attachment_id = ?",
                (attachment_id,),
            )


class SampleDAO:
    @staticmethod
    def create(data: SampleCreate) -> Sample:
        with get_conn() as conn:
            cur = conn.execute(
                """INSERT INTO samples
                   (task_id, sample_id, input_data_ref, expected_output, actual_output)
                   VALUES (?, ?, ?, ?, ?)""",
                (data.task_id, data.sample_id, data.input_data_ref,
                 data.expected_output, data.actual_output),
            )
            db_id = cur.lastrowid
        return SampleDAO.get(db_id)

    @staticmethod
    def get(db_id: int) -> Optional[Sample]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM samples WHERE db_id = ?", (db_id,)
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            d["is_outlier"] = bool(d["is_outlier"])
            return Sample(**d)

    @staticmethod
    def get_by_sample_id(task_id: str, sample_id: str) -> Optional[Sample]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM samples WHERE task_id = ? AND sample_id = ?",
                (task_id, sample_id),
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            d["is_outlier"] = bool(d["is_outlier"])
            return Sample(**d)

    @staticmethod
    def list_by_task(task_id: str) -> List[Sample]:
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM samples WHERE task_id = ? ORDER BY db_id",
                (task_id,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["is_outlier"] = bool(d["is_outlier"])
                result.append(Sample(**d))
            return result

    @staticmethod
    def list_outliers(task_id: str) -> List[Sample]:
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM samples WHERE task_id = ? AND is_outlier = 1 ORDER BY db_id",
                (task_id,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["is_outlier"] = bool(d["is_outlier"])
                result.append(Sample(**d))
            return result

    @staticmethod
    def update_judgment(db_id: int, judgment: JudgmentResult,
                        is_outlier: bool = False, outlier_reason: Optional[str] = None,
                        judged_by: str = "auto_eval") -> Optional[Sample]:
        now = datetime.now()
        with get_conn() as conn:
            conn.execute(
                """UPDATE samples SET judgment = ?, is_outlier = ?, outlier_reason = ?,
                   judged_at = ?, judged_by = ? WHERE db_id = ?""",
                (judgment.value, 1 if is_outlier else 0, outlier_reason,
                 now, judged_by, db_id),
            )
        return SampleDAO.get(db_id)


class GrayscaleAbnormalDAO:
    @staticmethod
    def create(data: GrayscaleAbnormalRecordCreate) -> GrayscaleAbnormalRecord:
        now = datetime.now()
        rec_id = _new_id("gray")
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO grayscale_abnormals
                   (record_id, task_id, sample_id, expected_grayscale_ratio,
                    actual_grayscale_ratio, reason, detected_by, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (rec_id, data.task_id, data.sample_id, data.expected_grayscale_ratio,
                 data.actual_grayscale_ratio, data.reason, data.detected_by, now),
            )
        return GrayscaleAbnormalDAO.get(rec_id)

    @staticmethod
    def get(record_id: str) -> Optional[GrayscaleAbnormalRecord]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM grayscale_abnormals WHERE record_id = ?", (record_id,)
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            d["resolved"] = bool(d["resolved"])
            return GrayscaleAbnormalRecord(**d)

    @staticmethod
    def list_by_task(task_id: str) -> List[GrayscaleAbnormalRecord]:
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM grayscale_abnormals WHERE task_id = ? ORDER BY detected_at",
                (task_id,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["resolved"] = bool(d["resolved"])
                result.append(GrayscaleAbnormalRecord(**d))
            return result

    @staticmethod
    def resolve(record_id: str, resolution_note: str) -> Optional[GrayscaleAbnormalRecord]:
        now = datetime.now()
        with get_conn() as conn:
            conn.execute(
                "UPDATE grayscale_abnormals SET resolved = 1, resolved_at = ?, resolution_note = ? WHERE record_id = ?",
                (now, resolution_note, record_id),
            )
        return GrayscaleAbnormalDAO.get(record_id)


class JudgmentOverrideDAO:
    @staticmethod
    def create(data: JudgmentOverrideCreate) -> JudgmentOverride:
        now = datetime.now()
        ovr_id = _new_id("ovr")
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO judgment_overrides
                   (override_id, task_id, sample_id, original_judgment, new_judgment,
                    reason, operator, original_source, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (ovr_id, data.task_id, data.sample_id, data.original_judgment.value,
                 data.new_judgment.value, data.reason, data.operator,
                 data.original_source, now),
            )
        return JudgmentOverrideDAO.get(ovr_id)

    @staticmethod
    def get(override_id: str) -> Optional[JudgmentOverride]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM judgment_overrides WHERE override_id = ?", (override_id,)
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            return JudgmentOverride(**d)

    @staticmethod
    def list_by_task(task_id: str, sample_id: Optional[str] = None) -> List[JudgmentOverride]:
        with get_conn() as conn:
            if sample_id:
                rows = conn.execute(
                    """SELECT * FROM judgment_overrides
                       WHERE task_id = ? AND sample_id = ? ORDER BY created_at""",
                    (task_id, sample_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM judgment_overrides WHERE task_id = ? ORDER BY created_at",
                    (task_id,),
                ).fetchall()
            return [JudgmentOverride(**dict(r)) for r in rows]


class EventDAO:
    @staticmethod
    def create(data: EventCreate) -> Event:
        now = datetime.now()
        ev_id = _new_id("ev")
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO events
                   (event_id, task_id, event_type, message, operator, metadata, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (ev_id, data.task_id, data.event_type.value, data.message,
                 data.operator, data.metadata, now),
            )
        return EventDAO.get(ev_id)

    @staticmethod
    def get(event_id: str) -> Optional[Event]:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM events WHERE event_id = ?", (event_id,)
            ).fetchone()
            if not row:
                return None
            return Event(**dict(row))

    @staticmethod
    def list_by_task(task_id: str, event_type: Optional[EventType] = None) -> List[Event]:
        with get_conn() as conn:
            if event_type:
                rows = conn.execute(
                    """SELECT * FROM events WHERE task_id = ? AND event_type = ?
                       ORDER BY timestamp""",
                    (task_id, event_type.value),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM events WHERE task_id = ? ORDER BY timestamp",
                    (task_id,),
                ).fetchall()
            return [Event(**dict(r)) for r in rows]

    @staticmethod
    def list_by_sample(task_id: str, sample_id: str) -> List[Event]:
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT * FROM events WHERE task_id = ?
                   AND json_extract(metadata, '$.sample_id') = ?
                   ORDER BY timestamp""",
                (task_id, sample_id),
            ).fetchall()
            return [Event(**dict(r)) for r in rows]
