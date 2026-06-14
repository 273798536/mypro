import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List, Tuple
from contextlib import contextmanager

from models import (
    TracklistItem, RecordingFile, RemarkHistory, StatusChange,
    Judgment, TimecodeAnomaly, ImportBatch,
    AnomalyStatus, AnomalyType, MatchStatus
)


def _parse_datetime(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s)


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


class Storage:
    def __init__(self, db_path: str = "timecode_anomaly.db"):
        self.db_path = db_path
        self._init_schema()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self):
        with self._conn() as conn:
            conn.executescript("""
CREATE TABLE IF NOT EXISTS import_batches (
    batch_id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    file_count INTEGER NOT NULL DEFAULT 0,
    track_count INTEGER NOT NULL DEFAULT 0,
    operator TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_no INTEGER NOT NULL,
    track_title TEXT NOT NULL,
    expected_filename TEXT NOT NULL,
    duration TEXT NOT NULL,
    source_line_no INTEGER NOT NULL,
    notes TEXT,
    version_screenshot_path TEXT,
    import_batch_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS recording_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    timecode TEXT NOT NULL,
    duration TEXT NOT NULL,
    detected_title TEXT,
    detected_track_no INTEGER,
    match_status TEXT NOT NULL,
    matched_track_id INTEGER,
    import_batch_id TEXT,
    imported_at TEXT NOT NULL,
    FOREIGN KEY (matched_track_id) REFERENCES tracklist_items(id),
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS timecode_anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anomaly_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    track_id INTEGER,
    file_id INTEGER,
    source_file_line INTEGER NOT NULL,
    impact_scope TEXT NOT NULL,
    matched_track_title TEXT,
    matched_filename TEXT,
    current_judgment TEXT,
    current_snapshot TEXT,
    latest_remark TEXT,
    latest_remark_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracklist_items(id),
    FOREIGN KEY (file_id) REFERENCES recording_files(id)
);

CREATE TABLE IF NOT EXISTS remark_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anomaly_id INTEGER NOT NULL,
    remark_type TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    operator TEXT NOT NULL,
    attachment_path TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (anomaly_id) REFERENCES timecode_anomalies(id)
);

CREATE TABLE IF NOT EXISTS status_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anomaly_id INTEGER NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (anomaly_id) REFERENCES timecode_anomalies(id)
);

CREATE TABLE IF NOT EXISTS judgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anomaly_id INTEGER NOT NULL,
    judgment_text TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    impact_scope TEXT NOT NULL,
    is_favorable INTEGER NOT NULL,
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (anomaly_id) REFERENCES timecode_anomalies(id)
);

CREATE INDEX IF NOT EXISTS idx_anomalies_status ON timecode_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON timecode_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_remarks_anomaly ON remark_history(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_status_anomaly ON status_changes(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_judgments_anomaly ON judgments(anomaly_id);
""")

    # ===== ImportBatch =====
    def insert_batch(self, batch: ImportBatch) -> str:
        with self._conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO import_batches VALUES (?,?,?,?,?,?,?,?)",
                (batch.batch_id, batch.source_type, batch.source_ref,
                 batch.file_count, batch.track_count, batch.operator,
                 batch.note, _format_datetime(batch.created_at))
            )
        return batch.batch_id

    def get_batch(self, batch_id: str) -> Optional[ImportBatch]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM import_batches WHERE batch_id=?",
                (batch_id,)
            ).fetchone()
        if not row:
            return None
        return ImportBatch(
            batch_id=row["batch_id"],
            source_type=row["source_type"],
            source_ref=row["source_ref"],
            file_count=row["file_count"],
            track_count=row["track_count"],
            operator=row["operator"],
            note=row["note"],
            created_at=_parse_datetime(row["created_at"])
        )

    def list_batches(self) -> List[ImportBatch]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM import_batches ORDER BY created_at DESC"
            ).fetchall()
        return [
            ImportBatch(
                batch_id=r["batch_id"],
                source_type=r["source_type"],
                source_ref=r["source_ref"],
                file_count=r["file_count"],
                track_count=r["track_count"],
                operator=r["operator"],
                note=r["note"],
                created_at=_parse_datetime(r["created_at"])
            ) for r in rows
        ]

    # ===== TracklistItem =====
    def insert_track(self, track: TracklistItem) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO tracklist_items
                (track_no, track_title, expected_filename, duration,
                 source_line_no, notes, version_screenshot_path,
                 import_batch_id, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (track.track_no, track.track_title, track.expected_filename,
                 track.duration, track.source_line_no, track.notes,
                 track.version_screenshot_path, track.import_batch_id,
                 _format_datetime(track.created_at),
                 _format_datetime(track.updated_at))
            )
            return cur.lastrowid

    def list_tracks(self, batch_id: Optional[str] = None) -> List[TracklistItem]:
        with self._conn() as conn:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM tracklist_items WHERE import_batch_id=? ORDER BY track_no",
                    (batch_id,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM tracklist_items ORDER BY id"
                ).fetchall()
        return [
            TracklistItem(
                id=r["id"],
                track_no=r["track_no"],
                track_title=r["track_title"],
                expected_filename=r["expected_filename"],
                duration=r["duration"],
                source_line_no=r["source_line_no"],
                notes=r["notes"],
                version_screenshot_path=r["version_screenshot_path"],
                import_batch_id=r["import_batch_id"],
                created_at=_parse_datetime(r["created_at"]),
                updated_at=_parse_datetime(r["updated_at"])
            ) for r in rows
        ]

    def get_track(self, track_id: int) -> Optional[TracklistItem]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM tracklist_items WHERE id=?",
                (track_id,)
            ).fetchone()
        if not row:
            return None
        return TracklistItem(
            id=row["id"], track_no=row["track_no"],
            track_title=row["track_title"],
            expected_filename=row["expected_filename"],
            duration=row["duration"],
            source_line_no=row["source_line_no"],
            notes=row["notes"],
            version_screenshot_path=row["version_screenshot_path"],
            import_batch_id=row["import_batch_id"],
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"])
        )

    # ===== RecordingFile =====
    def insert_file(self, f: RecordingFile) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO recording_files
                (filename, file_path, file_hash, timecode, duration,
                 detected_title, detected_track_no, match_status,
                 matched_track_id, import_batch_id, imported_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (f.filename, f.file_path, f.file_hash, f.timecode, f.duration,
                 f.detected_title, f.detected_track_no,
                 f.match_status.value, f.matched_track_id,
                 f.import_batch_id, _format_datetime(f.imported_at))
            )
            return cur.lastrowid

    def update_file_match(self, file_id: int, status: MatchStatus,
                          track_id: Optional[int] = None):
        with self._conn() as conn:
            conn.execute(
                """UPDATE recording_files SET match_status=?, matched_track_id=?
                WHERE id=?""",
                (status.value, track_id, file_id)
            )

    def list_files(self, batch_id: Optional[str] = None) -> List[RecordingFile]:
        with self._conn() as conn:
            if batch_id:
                rows = conn.execute(
                    "SELECT * FROM recording_files WHERE import_batch_id=? ORDER BY id",
                    (batch_id,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM recording_files ORDER BY id"
                ).fetchall()
        return [
            RecordingFile(
                id=r["id"], filename=r["filename"],
                file_path=r["file_path"], file_hash=r["file_hash"],
                timecode=r["timecode"], duration=r["duration"],
                detected_title=r["detected_title"],
                detected_track_no=r["detected_track_no"],
                match_status=MatchStatus(r["match_status"]),
                matched_track_id=r["matched_track_id"],
                import_batch_id=r["import_batch_id"],
                imported_at=_parse_datetime(r["imported_at"])
            ) for r in rows
        ]

    def get_file(self, file_id: int) -> Optional[RecordingFile]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM recording_files WHERE id=?",
                (file_id,)
            ).fetchone()
        if not row:
            return None
        return RecordingFile(
            id=row["id"], filename=row["filename"],
            file_path=row["file_path"], file_hash=row["file_hash"],
            timecode=row["timecode"], duration=row["duration"],
            detected_title=row["detected_title"],
            detected_track_no=row["detected_track_no"],
            match_status=MatchStatus(row["match_status"]),
            matched_track_id=row["matched_track_id"],
            import_batch_id=row["import_batch_id"],
            imported_at=_parse_datetime(row["imported_at"])
        )

    # ===== TimecodeAnomaly =====
    def insert_anomaly(self, anomaly: TimecodeAnomaly) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO timecode_anomalies
                (anomaly_type, title, description, status, track_id, file_id,
                 source_file_line, impact_scope, matched_track_title,
                 matched_filename, current_judgment, current_snapshot,
                 latest_remark, latest_remark_at, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (anomaly.anomaly_type.value, anomaly.title, anomaly.description,
                 anomaly.status.value, anomaly.track_id, anomaly.file_id,
                 anomaly.source_file_line, anomaly.impact_scope,
                 anomaly.matched_track_title, anomaly.matched_filename,
                 anomaly.current_judgment, anomaly.current_snapshot,
                 anomaly.latest_remark, _format_datetime(anomaly.latest_remark_at),
                 _format_datetime(anomaly.created_at),
                 _format_datetime(anomaly.updated_at))
            )
            return cur.lastrowid

    def update_anomaly_status(self, anomaly_id: int, status: AnomalyStatus,
                              judgment: str = "", snapshot: str = ""):
        with self._conn() as conn:
            conn.execute(
                """UPDATE timecode_anomalies
                SET status=?, current_judgment=?, current_snapshot=?, updated_at=?
                WHERE id=?""",
                (status.value, judgment, snapshot,
                 _format_datetime(datetime.now()), anomaly_id)
            )

    def update_anomaly_remark(self, anomaly_id: int, remark: str):
        with self._conn() as conn:
            conn.execute(
                """UPDATE timecode_anomalies
                SET latest_remark=?, latest_remark_at=?, updated_at=?
                WHERE id=?""",
                (remark, _format_datetime(datetime.now()),
                 _format_datetime(datetime.now()), anomaly_id)
            )

    def list_anomalies(self, status: Optional[AnomalyStatus] = None) -> List[TimecodeAnomaly]:
        with self._conn() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM timecode_anomalies WHERE status=? ORDER BY id",
                    (status.value,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM timecode_anomalies ORDER BY id"
                ).fetchall()
        result = []
        for r in rows:
            anomaly = TimecodeAnomaly(
                id=r["id"],
                anomaly_type=AnomalyType(r["anomaly_type"]),
                title=r["title"],
                description=r["description"],
                status=AnomalyStatus(r["status"]),
                track_id=r["track_id"],
                file_id=r["file_id"],
                source_file_line=r["source_file_line"],
                impact_scope=r["impact_scope"],
                matched_track_title=r["matched_track_title"],
                matched_filename=r["matched_filename"],
                current_judgment=r["current_judgment"],
                current_snapshot=r["current_snapshot"],
                latest_remark=r["latest_remark"],
                latest_remark_at=_parse_datetime(r["latest_remark_at"]),
                created_at=_parse_datetime(r["created_at"]),
                updated_at=_parse_datetime(r["updated_at"]),
                remarks=[], status_history=[], judgments=[]
            )
            anomaly.remarks = self._list_remarks(r["id"])
            anomaly.status_history = self._list_status_changes(r["id"])
            anomaly.judgments = self._list_judgments(r["id"])
            result.append(anomaly)
        return result

    def get_anomaly(self, anomaly_id: int) -> Optional[TimecodeAnomaly]:
        result = None
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM timecode_anomalies WHERE id=?",
                (anomaly_id,)
            ).fetchone()
        if not row:
            return None
        anomaly = TimecodeAnomaly(
            id=row["id"],
            anomaly_type=AnomalyType(row["anomaly_type"]),
            title=row["title"],
            description=row["description"],
            status=AnomalyStatus(row["status"]),
            track_id=row["track_id"],
            file_id=row["file_id"],
            source_file_line=row["source_file_line"],
            impact_scope=row["impact_scope"],
            matched_track_title=row["matched_track_title"],
            matched_filename=row["matched_filename"],
            current_judgment=row["current_judgment"],
            current_snapshot=row["current_snapshot"],
            latest_remark=row["latest_remark"],
            latest_remark_at=_parse_datetime(row["latest_remark_at"]),
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"]),
            remarks=[], status_history=[], judgments=[]
        )
        anomaly.remarks = self._list_remarks(row["id"])
        anomaly.status_history = self._list_status_changes(row["id"])
        anomaly.judgments = self._list_judgments(row["id"])
        return anomaly

    # ===== RemarkHistory =====
    def insert_remark(self, remark: RemarkHistory) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO remark_history
                (anomaly_id, remark_type, content, source, operator,
                 attachment_path, created_at)
                VALUES (?,?,?,?,?,?,?)""",
                (remark.anomaly_id, remark.remark_type, remark.content,
                 remark.source, remark.operator, remark.attachment_path,
                 _format_datetime(remark.created_at))
            )
            return cur.lastrowid

    def _list_remarks(self, anomaly_id: int) -> List[RemarkHistory]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM remark_history WHERE anomaly_id=? ORDER BY id",
                (anomaly_id,)
            ).fetchall()
        return [
            RemarkHistory(
                id=r["id"], anomaly_id=r["anomaly_id"],
                remark_type=r["remark_type"], content=r["content"],
                source=r["source"], operator=r["operator"],
                attachment_path=r["attachment_path"],
                created_at=_parse_datetime(r["created_at"])
            ) for r in rows
        ]

    # ===== StatusChange =====
    def insert_status_change(self, sc: StatusChange) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO status_changes
                (anomaly_id, from_status, to_status, reason, operator, created_at)
                VALUES (?,?,?,?,?,?)""",
                (sc.anomaly_id, sc.from_status.value, sc.to_status.value,
                 sc.reason, sc.operator, _format_datetime(sc.created_at))
            )
            return cur.lastrowid

    def _list_status_changes(self, anomaly_id: int) -> List[StatusChange]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM status_changes WHERE anomaly_id=? ORDER BY id",
                (anomaly_id,)
            ).fetchall()
        return [
            StatusChange(
                id=r["id"], anomaly_id=r["anomaly_id"],
                from_status=AnomalyStatus(r["from_status"]),
                to_status=AnomalyStatus(r["to_status"]),
                reason=r["reason"], operator=r["operator"],
                created_at=_parse_datetime(r["created_at"])
            ) for r in rows
        ]

    # ===== Judgment =====
    def insert_judgment(self, j: Judgment) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                """INSERT INTO judgments
                (anomaly_id, judgment_text, source_ref, impact_scope,
                 is_favorable, operator, created_at)
                VALUES (?,?,?,?,?,?,?)""",
                (j.anomaly_id, j.judgment_text, j.source_ref,
                 j.impact_scope, 1 if j.is_favorable else 0,
                 j.operator, _format_datetime(j.created_at))
            )
            return cur.lastrowid

    def _list_judgments(self, anomaly_id: int) -> List[Judgment]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM judgments WHERE anomaly_id=? ORDER BY id",
                (anomaly_id,)
            ).fetchall()
        return [
            Judgment(
                id=r["id"], anomaly_id=r["anomaly_id"],
                judgment_text=r["judgment_text"], source_ref=r["source_ref"],
                impact_scope=r["impact_scope"],
                is_favorable=bool(r["is_favorable"]),
                operator=r["operator"],
                created_at=_parse_datetime(r["created_at"])
            ) for r in rows
        ]

    # ===== Utils =====
    def clear_all(self):
        with self._conn() as conn:
            for t in ["judgments", "status_changes", "remark_history",
                      "timecode_anomalies", "recording_files",
                      "tracklist_items", "import_batches"]:
                conn.execute(f"DELETE FROM {t}")
                conn.execute(f"DELETE FROM sqlite_sequence WHERE name='{t}'")

    def export_state_snapshot(self) -> dict:
        batches = self.list_batches()
        tracks = self.list_tracks()
        files = self.list_files()
        anomalies = self.list_anomalies()
        return {
            "exported_at": datetime.now().isoformat(),
            "counts": {
                "batches": len(batches),
                "tracks": len(tracks),
                "files": len(files),
                "anomalies": len(anomalies),
                "remarks": sum(len(a.remarks) for a in anomalies),
                "status_changes": sum(len(a.status_history) for a in anomalies),
                "judgments": sum(len(a.judgments) for a in anomalies)
            },
            "anomalies_summary": [
                {
                    "id": a.id,
                    "type": a.anomaly_type.value,
                    "status": a.status.value,
                    "title": a.title,
                    "remark_count": len(a.remarks),
                    "judgment_count": len(a.judgments),
                    "status_change_count": len(a.status_history),
                    "latest_remark": a.latest_remark,
                    "latest_remark_at": _format_datetime(a.latest_remark_at)
                }
                for a in anomalies
            ]
        }
