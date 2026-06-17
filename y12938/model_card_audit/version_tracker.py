import os
import uuid
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from .database import DatabaseManager


class BatchImportResult:
    def __init__(self):
        self.batch_id: Optional[str] = None
        self.is_new: bool = False
        self.is_superseding: bool = False
        self.previous_batch_id: Optional[str] = None
        self.skipped_duplicates: int = 0
        self.imported_count: int = 0
        self.materials: List[Dict[str, Any]] = []


class VersionTracker:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def _gen_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"

    def _now(self) -> str:
        return datetime.now().isoformat(timespec="seconds")

    def _scan_materials(self, source_dir: str, batch_type: str) -> List[Dict[str, Any]]:
        materials = []
        supported_extensions = {".json", ".txt", ".md", ".yaml", ".yml", ".csv"}
        for root, _, files in os.walk(source_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                ext = os.path.splitext(fname)[1].lower()
                if ext not in supported_extensions:
                    continue
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                except (OSError, UnicodeDecodeError):
                    continue
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                preview = content[:200].replace("\n", " ")
                rel_path = os.path.relpath(fpath, source_dir)
                material_type = self._infer_material_type(fname, content, batch_type)
                materials.append({
                    "file_name": fname,
                    "file_path": rel_path,
                    "abs_path": fpath,
                    "content_hash": content_hash,
                    "content_preview": preview,
                    "material_type": material_type,
                    "metadata": self._extract_metadata(fname, content),
                    "raw_content": content
                })
        return sorted(materials, key=lambda x: x["file_name"])

    def _infer_material_type(self, fname: str, content: str, batch_type: str) -> str:
        lower = fname.lower()
        if batch_type == "training":
            if "feedback" in lower or "人工反馈" in fname:
                return "human_feedback"
            if "sample" in lower or "样本" in fname:
                return "training_sample"
            return "training_material"
        else:
            if "question" in lower or "题目" in fname or "题库" in fname:
                return "eval_question"
            if "benchmark" in lower or "评测" in fname:
                return "eval_benchmark"
            return "eval_material"

    def _extract_metadata(self, fname: str, content: str) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}
        try:
            if fname.endswith(".json"):
                data = json.loads(content)
                if isinstance(data, dict):
                    for k in ("topic", "category", "subject", "knowledge_point", "难度", "标签"):
                        if k in data:
                            meta[k] = data[k]
        except (json.JSONDecodeError, ValueError):
            pass
        return meta

    def import_batch(self, source_dir: str, batch_type: str,
                     batch_name: Optional[str] = None) -> BatchImportResult:
        if batch_type not in ("training", "evaluation"):
            raise ValueError(f"batch_type must be 'training' or 'evaluation', got {batch_type}")
        if not os.path.isdir(source_dir):
            raise FileNotFoundError(f"Source directory not found: {source_dir}")

        result = BatchImportResult()
        materials = self._scan_materials(source_dir, batch_type)
        if not materials:
            raise ValueError(f"No supported materials found in {source_dir}")

        source_dir_abs = os.path.abspath(source_dir)
        batch_hash = self.db.compute_batch_hash(materials)
        base_name = batch_name or os.path.basename(source_dir.rstrip("/")) or f"{batch_type}_batch"

        with self.db._get_conn() as conn:
            cursor = conn.cursor()

            identical = cursor.execute(
                "SELECT batch_id, status FROM batches WHERE content_hash=? AND batch_type=?",
                (batch_hash, batch_type)
            ).fetchone()

            if identical and identical["status"] == "active":
                result.batch_id = identical["batch_id"]
                result.is_new = False
                result.skipped_duplicates = len(materials)
                row_materials = cursor.execute(
                    "SELECT material_id, file_name, content_hash, material_type FROM materials WHERE batch_id=?",
                    (identical["batch_id"],)
                ).fetchall()
                result.materials = [dict(r) for r in row_materials]
                return result

            same_name = cursor.execute(
                "SELECT batch_id, content_hash, material_count FROM batches "
                "WHERE batch_name=? AND batch_type=? AND status='active' ORDER BY imported_at DESC LIMIT 1",
                (base_name, batch_type)
            ).fetchone()

            new_batch_id = self._gen_id("bat")
            now = self._now()

            cursor.execute(
                "INSERT INTO batches (batch_id, batch_name, batch_type, material_count, "
                "content_hash, source_dir, imported_at, status) VALUES (?,?,?,?,?,?,?, 'active')",
                (new_batch_id, base_name, batch_type, len(materials), batch_hash,
                 source_dir_abs, now)
            )

            imported = 0
            for mat in materials:
                mat_id = self._gen_id("mat")
                cursor.execute(
                    "INSERT INTO materials (material_id, batch_id, material_type, content_hash, "
                    "file_path, file_name, content_preview, metadata_json, imported_at) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (mat_id, new_batch_id, mat["material_type"], mat["content_hash"],
                     mat["abs_path"], mat["file_name"], mat["content_preview"],
                     json.dumps(mat["metadata"], ensure_ascii=False), now)
                )
                imported += 1
                result.materials.append({
                    "material_id": mat_id,
                    "file_name": mat["file_name"],
                    "content_hash": mat["content_hash"],
                    "material_type": mat["material_type"]
                })

            if same_name and same_name["content_hash"] != batch_hash:
                cursor.execute(
                    "UPDATE batches SET status='superseded', superseded_by=? WHERE batch_id=?",
                    (new_batch_id, same_name["batch_id"])
                )
                result.is_superseding = True
                result.previous_batch_id = same_name["batch_id"]
                result.skipped_duplicates = same_name["material_count"]

            result.batch_id = new_batch_id
            result.is_new = True
            result.imported_count = imported

        return result

    def import_human_feedbacks(self, feedback_dir: str, batch_id: str) -> Dict[str, Any]:
        if not os.path.isdir(feedback_dir):
            raise FileNotFoundError(f"Feedback directory not found: {feedback_dir}")

        imported = []
        skipped = []
        now = self._now()

        with self.db._get_conn() as conn:
            cursor = conn.cursor()
            batch_row = cursor.execute(
                "SELECT batch_type FROM batches WHERE batch_id=?", (batch_id,)
            ).fetchone()
            if not batch_row:
                raise ValueError(f"Batch not found: {batch_id}")

            materials_by_hash = {}
            materials_by_name = {}
            for row in cursor.execute(
                "SELECT material_id, content_hash, file_name FROM materials WHERE batch_id=?",
                (batch_id,)
            ).fetchall():
                materials_by_hash[row["content_hash"]] = row["material_id"]
                materials_by_name[row["file_name"]] = row["material_id"]

            for fname in sorted(os.listdir(feedback_dir)):
                fpath = os.path.join(feedback_dir, fname)
                if not os.path.isfile(fpath):
                    continue
                if not fname.lower().endswith(".json"):
                    skipped.append({"file": fname, "reason": "unsupported_format"})
                    continue
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                    data = json.loads(content)
                except (OSError, json.JSONDecodeError) as e:
                    skipped.append({"file": fname, "reason": f"parse_error: {e}"})
                    continue

                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                existing = cursor.execute(
                    "SELECT feedback_id FROM human_feedbacks WHERE content_hash=?",
                    (content_hash,)
                ).fetchone()
                if existing:
                    skipped.append({"file": fname, "reason": "duplicate_hash"})
                    continue

                matched_material_id = None
                ref_name = data.get("referenced_file") or data.get("material_file") or ""
                if ref_name and ref_name in materials_by_name:
                    matched_material_id = materials_by_name[ref_name]
                elif data.get("material_hash") and data["material_hash"] in materials_by_hash:
                    matched_material_id = materials_by_hash[data["material_hash"]]

                feedback_type = data.get("feedback_type", "general")
                fb_id = self._gen_id("fb")
                cursor.execute(
                    "INSERT INTO human_feedbacks (feedback_id, batch_id, material_id, "
                    "feedback_type, content_hash, content_json, file_path, imported_at) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (fb_id, batch_id, matched_material_id, feedback_type, content_hash,
                     json.dumps(data, ensure_ascii=False), fpath, now)
                )
                imported.append({
                    "feedback_id": fb_id,
                    "file": fname,
                    "feedback_type": feedback_type,
                    "matched_material": matched_material_id is not None
                })

        return {"imported": imported, "skipped": skipped, "total": len(imported) + len(skipped)}

    def find_existing_run(self, training_batch_id: str, evaluation_batch_id: str,
                          feedback_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        run_hash = self.db.compute_run_hash(training_batch_id, evaluation_batch_id, feedback_ids)
        with self.db._get_conn() as conn:
            row = conn.execute(
                "SELECT run_id, training_batch_id, evaluation_batch_id, run_at, status, "
                "output_dir FROM audit_runs WHERE content_hash=? AND status != 'failed'",
                (run_hash,)
            ).fetchone()
            return dict(row) if row else None

    def register_run(self, training_batch_id: str, evaluation_batch_id: str,
                     input_dir: str, output_dir: str,
                     feedback_ids: Optional[List[str]] = None,
                     force: bool = False) -> Tuple[str, bool]:
        run_hash = self.db.compute_run_hash(training_batch_id, evaluation_batch_id, feedback_ids)
        now = self._now()
        with self.db._get_conn() as conn:
            cursor = conn.cursor()
            if not force:
                existing = cursor.execute(
                    "SELECT run_id, status FROM audit_runs WHERE content_hash=? "
                    "AND status != 'failed'",
                    (run_hash,)
                ).fetchone()
                if existing:
                    cursor.execute(
                        "UPDATE audit_runs SET run_at=?, status='running', error_message=NULL "
                        "WHERE run_id=?",
                        (now, existing["run_id"])
                    )
                    cursor.execute(
                        "DELETE FROM audit_conclusions WHERE run_id=?",
                        (existing["run_id"],)
                    )
                    return existing["run_id"], False

            new_run_id = self._gen_id("run")
            cursor.execute(
                "INSERT INTO audit_runs (run_id, training_batch_id, evaluation_batch_id, "
                "run_at, input_dir, output_dir, status, content_hash) "
                "VALUES (?,?,?,?,?,?, 'running', ?)",
                (new_run_id, training_batch_id, evaluation_batch_id, now,
                 os.path.abspath(input_dir), os.path.abspath(output_dir), run_hash)
            )

            prev_runs = cursor.execute(
                "SELECT run_id FROM audit_runs WHERE training_batch_id=? "
                "AND evaluation_batch_id=? AND superseded_by IS NULL AND run_id != ?",
                (training_batch_id, evaluation_batch_id, new_run_id)
            ).fetchall()
            for p in prev_runs:
                cursor.execute(
                    "UPDATE audit_runs SET superseded_by=? WHERE run_id=?",
                    (new_run_id, p["run_id"])
                )
                cursor.execute(
                    "UPDATE audit_conclusions SET is_latest=0 "
                    "WHERE run_id=? AND is_latest=1",
                    (p["run_id"],)
                )

            return new_run_id, True

    def mark_run_status(self, run_id: str, status: str, error_message: Optional[str] = None) -> None:
        if status not in ("running", "completed", "failed", "partial"):
            raise ValueError(f"Invalid status: {status}")
        with self.db._get_conn() as conn:
            conn.execute(
                "UPDATE audit_runs SET status=?, error_message=? WHERE run_id=?",
                (status, error_message, run_id)
            )

    def list_batches(self, batch_type: Optional[str] = None,
                     status: str = "active") -> List[Dict[str, Any]]:
        with self.db._get_conn() as conn:
            q = "SELECT * FROM batches WHERE status=?"
            args: List[Any] = [status]
            if batch_type:
                q += " AND batch_type=?"
                args.append(batch_type)
            q += " ORDER BY imported_at DESC"
            rows = conn.execute(q, args).fetchall()
            return [dict(r) for r in rows]

    def list_runs(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self.db._get_conn() as conn:
            rows = conn.execute(
                "SELECT r.*, t.batch_name as training_name, e.batch_name as evaluation_name "
                "FROM audit_runs r "
                "JOIN batches t ON r.training_batch_id = t.batch_id "
                "JOIN batches e ON r.evaluation_batch_id = e.batch_id "
                "ORDER BY r.run_at DESC LIMIT ?",
                (limit,)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_batch_detail(self, batch_id: str) -> Dict[str, Any]:
        with self.db._get_conn() as conn:
            batch = conn.execute("SELECT * FROM batches WHERE batch_id=?", (batch_id,)).fetchone()
            if not batch:
                raise ValueError(f"Batch not found: {batch_id}")
            materials = conn.execute(
                "SELECT material_id, material_type, file_name, content_hash, imported_at "
                "FROM materials WHERE batch_id=? ORDER BY file_name",
                (batch_id,)
            ).fetchall()
            feedbacks = conn.execute(
                "SELECT feedback_id, feedback_type, material_id, file_path, imported_at "
                "FROM human_feedbacks WHERE batch_id=? ORDER BY imported_at",
                (batch_id,)
            ).fetchall()
            return {
                "batch": dict(batch),
                "materials": [dict(m) for m in materials],
                "human_feedbacks": [dict(f) for f in feedbacks]
            }
