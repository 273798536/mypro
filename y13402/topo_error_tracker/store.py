import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from topo_error_tracker.models import (
    AuditEntry,
    DraftImage,
    Edit,
    ExportSnapshot,
    Material,
    MaterialStatus,
    ReviewDecision,
    TrackingResult,
    WorkflowState,
    WorkflowStep,
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    import_time TEXT NOT NULL,
    raw_json_path TEXT,
    status TEXT NOT NULL DEFAULT 'raw',
    source_label TEXT,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS draft_images (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    image_path TEXT NOT NULL,
    graph_visual_match INTEGER NOT NULL,
    detail_mismatch_description TEXT,
    noted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS edits (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    field TEXT NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    editor TEXT NOT NULL,
    edit_time TEXT NOT NULL,
    reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_entries (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    reviewer TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    rule_violation TEXT
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES materials(id),
    reviewer TEXT NOT NULL,
    approved INTEGER NOT NULL,
    reason TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    previous_reviewer TEXT,
    previous_reason TEXT,
    extrapolation_boundary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflow_states (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    step TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    operator TEXT,
    note TEXT
);

CREATE TABLE IF NOT EXISTS tracking_results (
    material_id TEXT NOT NULL REFERENCES materials(id),
    path_id TEXT PRIMARY KEY,
    error_nodes_json TEXT NOT NULL,
    explanation TEXT NOT NULL,
    anomalous_samples_json TEXT NOT NULL,
    tracked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS export_snapshots (
    material_id TEXT NOT NULL REFERENCES materials(id),
    exported_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    annotation_count INTEGER NOT NULL,
    edit_count INTEGER NOT NULL,
    synced INTEGER NOT NULL,
    sync_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_materials_batch ON materials(batch_id);
CREATE INDEX IF NOT EXISTS idx_edits_material ON edits(material_id);
CREATE INDEX IF NOT EXISTS idx_audit_material ON audit_entries(material_id);
CREATE INDEX IF NOT EXISTS idx_review_material ON review_decisions(material_id);
CREATE INDEX IF NOT EXISTS idx_workflow_batch ON workflow_states(batch_id);
CREATE INDEX IF NOT EXISTS idx_tracking_material ON tracking_results(material_id);
"""


class Store:
    def __init__(self, db_path: Union[str, Path], drafts_dir: Union[str, Path, None] = None):
        self.db_path = Path(db_path)
        self.drafts_dir = Path(drafts_dir) if drafts_dir else self.db_path.parent / "drafts"
        self.drafts_dir.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path))
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
            self._conn.executescript(_SCHEMA)
        return self._conn

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def save_material(self, m: Material) -> None:
        self.conn.execute(
            """INSERT OR REPLACE INTO materials
               (id, batch_id, original_text, import_time, raw_json_path, status, source_label, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                m.id,
                m.batch_id,
                m.original_text,
                m.import_time.isoformat(),
                m.raw_json_path,
                m.status.value,
                m.source_label,
                json.dumps(m.metadata, ensure_ascii=False),
            ),
        )
        self.conn.commit()
        if m.raw_json_path is None:
            draft_path = self.drafts_dir / f"{m.id}.json"
            draft_path.write_text(
                json.dumps(
                    {
                        "material_id": m.id,
                        "batch_id": m.batch_id,
                        "original_text": m.original_text,
                        "import_time": m.import_time.isoformat(),
                        "source_label": m.source_label,
                        "metadata": m.metadata,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            self.conn.execute(
                "UPDATE materials SET raw_json_path = ? WHERE id = ?",
                (str(draft_path), m.id),
            )
            self.conn.commit()
            m.raw_json_path = str(draft_path)

    def get_material(self, material_id: str) -> Optional[Material]:
        row = self.conn.execute(
            "SELECT * FROM materials WHERE id = ?", (material_id,)
        ).fetchone()
        if row is None:
            return None
        return Material(
            id=row["id"],
            batch_id=row["batch_id"],
            original_text=row["original_text"],
            import_time=datetime.fromisoformat(row["import_time"]),
            raw_json_path=row["raw_json_path"],
            status=MaterialStatus(row["status"]),
            source_label=row["source_label"],
            metadata=json.loads(row["metadata_json"]) if row["metadata_json"] else {},
        )

    def list_materials(self, batch_id: Optional[str] = None) -> List[Material]:
        if batch_id:
            rows = self.conn.execute(
                "SELECT * FROM materials WHERE batch_id = ? ORDER BY import_time",
                (batch_id,),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM materials ORDER BY import_time"
            ).fetchall()
        result = []
        for row in rows:
            result.append(
                Material(
                    id=row["id"],
                    batch_id=row["batch_id"],
                    original_text=row["original_text"],
                    import_time=datetime.fromisoformat(row["import_time"]),
                    raw_json_path=row["raw_json_path"],
                    status=MaterialStatus(row["status"]),
                    source_label=row["source_label"],
                    metadata=json.loads(row["metadata_json"]) if row["metadata_json"] else {},
                )
            )
        return result

    def update_material_status(self, material_id: str, status: MaterialStatus) -> None:
        self.conn.execute(
            "UPDATE materials SET status = ? WHERE id = ?",
            (status.value, material_id),
        )
        self.conn.commit()

    def save_draft_image(self, d: DraftImage) -> None:
        self.conn.execute(
            """INSERT OR REPLACE INTO draft_images
               (id, material_id, image_path, graph_visual_match, detail_mismatch_description, noted_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                d.id,
                d.material_id,
                d.image_path,
                int(d.graph_visual_match),
                d.detail_mismatch_description,
                d.noted_at.isoformat(),
            ),
        )
        self.conn.commit()

    def list_draft_images(self, material_id: str) -> List[DraftImage]:
        rows = self.conn.execute(
            "SELECT * FROM draft_images WHERE material_id = ? ORDER BY noted_at",
            (material_id,),
        ).fetchall()
        return [
            DraftImage(
                id=row["id"],
                material_id=row["material_id"],
                image_path=row["image_path"],
                graph_visual_match=bool(row["graph_visual_match"]),
                detail_mismatch_description=row["detail_mismatch_description"],
                noted_at=datetime.fromisoformat(row["noted_at"]),
            )
            for row in rows
        ]

    def save_edit(self, e: Edit) -> None:
        self.conn.execute(
            """INSERT INTO edits (id, material_id, field, old_value, new_value, editor, edit_time, reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                e.id,
                e.material_id,
                e.field,
                e.old_value,
                e.new_value,
                e.editor,
                e.edit_time.isoformat(),
                e.reason,
            ),
        )
        self.conn.commit()

    def list_edits(self, material_id: str) -> List[Edit]:
        rows = self.conn.execute(
            "SELECT * FROM edits WHERE material_id = ? ORDER BY edit_time",
            (material_id,),
        ).fetchall()
        return [
            Edit(
                id=row["id"],
                material_id=row["material_id"],
                field=row["field"],
                old_value=row["old_value"],
                new_value=row["new_value"],
                editor=row["editor"],
                edit_time=datetime.fromisoformat(row["edit_time"]),
                reason=row["reason"],
            )
            for row in rows
        ]

    def save_audit_entry(self, a: AuditEntry) -> None:
        self.conn.execute(
            """INSERT INTO audit_entries (id, material_id, reviewer, action, reason, timestamp, rule_violation)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                a.id,
                a.material_id,
                a.reviewer,
                a.action,
                a.reason,
                a.timestamp.isoformat(),
                a.rule_violation,
            ),
        )
        self.conn.commit()

    def list_audit_entries(self, material_id: str) -> List[AuditEntry]:
        rows = self.conn.execute(
            "SELECT * FROM audit_entries WHERE material_id = ? ORDER BY timestamp",
            (material_id,),
        ).fetchall()
        return [
            AuditEntry(
                id=row["id"],
                material_id=row["material_id"],
                reviewer=row["reviewer"],
                action=row["action"],
                reason=row["reason"],
                timestamp=datetime.fromisoformat(row["timestamp"]),
                rule_violation=row["rule_violation"],
            )
            for row in rows
        ]

    def save_review_decision(self, r: ReviewDecision) -> None:
        self.conn.execute(
            """INSERT INTO review_decisions
               (id, material_id, reviewer, approved, reason, timestamp, previous_reviewer, previous_reason, extrapolation_boundary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                r.id,
                r.material_id,
                r.reviewer,
                int(r.approved),
                r.reason,
                r.timestamp.isoformat(),
                r.previous_reviewer,
                r.previous_reason,
                int(r.extrapolation_boundary),
            ),
        )
        self.conn.commit()

    def get_latest_review(self, material_id: str) -> Optional[ReviewDecision]:
        row = self.conn.execute(
            "SELECT * FROM review_decisions WHERE material_id = ? ORDER BY timestamp DESC LIMIT 1",
            (material_id,),
        ).fetchone()
        if row is None:
            return None
        return ReviewDecision(
            id=row["id"],
            material_id=row["material_id"],
            reviewer=row["reviewer"],
            approved=bool(row["approved"]),
            reason=row["reason"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            previous_reviewer=row["previous_reviewer"],
            previous_reason=row["previous_reason"],
            extrapolation_boundary=bool(row["extrapolation_boundary"]),
        )

    def save_workflow_state(self, w: WorkflowState) -> None:
        self.conn.execute(
            """INSERT OR REPLACE INTO workflow_states (id, batch_id, step, completed, timestamp, operator, note)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                w.id,
                w.batch_id,
                w.step.value,
                int(w.completed),
                w.timestamp.isoformat(),
                w.operator,
                w.note,
            ),
        )
        self.conn.commit()

    def get_workflow_state(self, batch_id: str, step: WorkflowStep) -> Optional[WorkflowState]:
        row = self.conn.execute(
            "SELECT * FROM workflow_states WHERE batch_id = ? AND step = ? ORDER BY timestamp DESC LIMIT 1",
            (batch_id, step.value),
        ).fetchone()
        if row is None:
            return None
        return WorkflowState(
            id=row["id"],
            batch_id=row["batch_id"],
            step=WorkflowStep(row["step"]),
            completed=bool(row["completed"]),
            timestamp=datetime.fromisoformat(row["timestamp"]),
            operator=row["operator"],
            note=row["note"],
        )

    def save_tracking_result(self, t: TrackingResult) -> None:
        self.conn.execute(
            """INSERT OR REPLACE INTO tracking_results
               (material_id, path_id, error_nodes_json, explanation, anomalous_samples_json, tracked_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                t.material_id,
                t.path_id,
                json.dumps([n.model_dump() for n in t.error_nodes], ensure_ascii=False),
                t.explanation,
                json.dumps(t.anomalous_samples, ensure_ascii=False),
                t.tracked_at.isoformat(),
            ),
        )
        self.conn.commit()

    def get_tracking_result(self, material_id: str) -> Optional[TrackingResult]:
        row = self.conn.execute(
            "SELECT * FROM tracking_results WHERE material_id = ? ORDER BY tracked_at DESC LIMIT 1",
            (material_id,),
        ).fetchone()
        if row is None:
            return None
        from topo_error_tracker.models import ErrorNode

        return TrackingResult(
            material_id=row["material_id"],
            path_id=row["path_id"],
            error_nodes=[ErrorNode(**n) for n in json.loads(row["error_nodes_json"])],
            explanation=row["explanation"],
            anomalous_samples=json.loads(row["anomalous_samples_json"]),
            tracked_at=datetime.fromisoformat(row["tracked_at"]),
        )

    def save_export_snapshot(self, s: ExportSnapshot) -> None:
        self.conn.execute(
            """INSERT INTO export_snapshots
               (material_id, exported_at, content_hash, annotation_count, edit_count, synced, sync_details)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                s.material_id,
                s.exported_at.isoformat(),
                s.content_hash,
                s.annotation_count,
                s.edit_count,
                int(s.synced),
                s.sync_details,
            ),
        )
        self.conn.commit()

    def get_latest_export(self, material_id: str) -> Optional[ExportSnapshot]:
        row = self.conn.execute(
            "SELECT * FROM export_snapshots WHERE material_id = ? ORDER BY exported_at DESC LIMIT 1",
            (material_id,),
        ).fetchone()
        if row is None:
            return None
        return ExportSnapshot(
            material_id=row["material_id"],
            exported_at=datetime.fromisoformat(row["exported_at"]),
            content_hash=row["content_hash"],
            annotation_count=row["annotation_count"],
            edit_count=row["edit_count"],
            synced=bool(row["synced"]),
            sync_details=row["sync_details"],
        )

    def read_raw_draft(self, material_id: str) -> Optional[Dict[str, Any]]:
        mat = self.get_material(material_id)
        if mat is None or mat.raw_json_path is None:
            return None
        path = Path(mat.raw_json_path)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def import_batch_from_json(
        self, json_path: Union[str, Path], batch_id: str, source_label: Optional[str] = None
    ) -> List[Material]:
        raw = json.loads(Path(json_path).read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else [raw]
        materials = []
        for item in items:
            original_text = item.get("original_text", item.get("text", json.dumps(item, ensure_ascii=False)))
            m = Material(
                batch_id=batch_id,
                original_text=original_text,
                import_time=datetime.now(),
                source_label=source_label or item.get("source_label"),
                metadata=item.get("metadata", {}),
            )
            self.save_material(m)
            materials.append(m)
        return materials
