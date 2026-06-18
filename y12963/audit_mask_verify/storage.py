"""SQLite 存储层：幂等索引、追溯链持久化、回滚点、结论去重。

为什么选 sqlite：
- CLI 工具零运维，单文件库和输出目录放一起；
- 天然支持事务，防重复导入越跑越乱；
- 结论键、幂等键建 UNIQUE 索引，并发/重复跑都安全。
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from .models import (
    ConclusionStatus,
    MaskVerifyConclusion,
    ProcessStatus,
    ProcessingRecord,
    RollbackPoint,
    SlowQueryRef,
    SourceRef,
    TraceChain,
    WorkOrderRef,
    _content_hash,
    _utc_now_iso,
    make_conclusion_key,
    make_idempotency_key,
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS processing_records (
    record_id           TEXT PRIMARY KEY,
    idempotency_key     TEXT UNIQUE NOT NULL,
    batch_id            TEXT NOT NULL,
    work_order_id       TEXT NOT NULL,
    content_hash        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    started_at          TEXT NOT NULL,
    finished_at         TEXT,
    operator            TEXT NOT NULL,
    input_file          TEXT NOT NULL,
    output_refs_json    TEXT NOT NULL DEFAULT '[]',
    message             TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_pr_batch ON processing_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_pr_wo    ON processing_records(work_order_id);

CREATE TABLE IF NOT EXISTS conclusions (
    conclusion_id       TEXT PRIMARY KEY,
    conclusion_key      TEXT NOT NULL,
    work_order_id       TEXT NOT NULL,
    field_path          TEXT NOT NULL,
    expected_mask_level TEXT NOT NULL,
    actual_mask_level   TEXT NOT NULL,
    is_pass             INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'ACTIVE',
    remark              TEXT NOT NULL DEFAULT '',
    created_at          TEXT NOT NULL,
    superseded_by       TEXT,
    processing_record_id TEXT,
    slow_query_json     TEXT NOT NULL DEFAULT '[]',
    source_ref_json     TEXT NOT NULL DEFAULT '[]'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conc_active_uniq
    ON conclusions(conclusion_key, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_conc_wo ON conclusions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_conc_pr ON conclusions(processing_record_id);

CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id TEXT PRIMARY KEY,
    ticket_title  TEXT NOT NULL DEFAULT '',
    ticket_url    TEXT NOT NULL DEFAULT '',
    assignee      TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rollback_points (
    point_id                   TEXT PRIMARY KEY,
    batch_id                   TEXT NOT NULL,
    rolled_back_at             TEXT NOT NULL,
    reason                     TEXT NOT NULL DEFAULT '',
    affected_conclusion_keys_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_rb_batch ON rollback_points(batch_id);
"""


class Store:
    """封装所有持久化操作。数据库文件随输出目录走，同一输出目录=同一批次状态空间。"""

    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    # ---------- 基础设施 ----------

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        conn = self._connect()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._tx() as conn:
            conn.executescript(SCHEMA)

    # ---------- 幂等 ----------

    def get_idempotent_record(self, idempotency_key: str) -> Optional[ProcessingRecord]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM processing_records WHERE idempotency_key = ?",
                (idempotency_key,),
            ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["output_refs"] = json.loads(d.pop("output_refs_json") or "[]")
        return ProcessingRecord.from_dict(d)

    def insert_processing_record(self, rec: ProcessingRecord) -> None:
        with self._tx() as conn:
            conn.execute(
                """INSERT INTO processing_records
                   (record_id, idempotency_key, batch_id, work_order_id, content_hash,
                    status, started_at, finished_at, operator, input_file,
                    output_refs_json, message)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    rec.record_id, rec.idempotency_key, rec.batch_id,
                    rec.work_order_id, rec.content_hash, rec.status.value,
                    rec.started_at, rec.finished_at, rec.operator,
                    rec.input_file, json.dumps(rec.output_refs), rec.message,
                ),
            )

    def mark_processing_done(self, record_id: str, status: ProcessStatus,
                             output_refs: list[str], message: str = "") -> None:
        with self._tx() as conn:
            conn.execute(
                """UPDATE processing_records
                      SET status = ?, finished_at = ?, output_refs_json = ?, message = ?
                    WHERE record_id = ?""",
                (status.value, _utc_now_iso(), json.dumps(output_refs), message, record_id),
            )

    # ---------- 工单 ----------

    def upsert_work_order(self, wo: WorkOrderRef) -> None:
        with self._tx() as conn:
            conn.execute(
                """INSERT INTO work_orders(work_order_id, ticket_title, ticket_url, assignee, created_at)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(work_order_id) DO UPDATE SET
                       ticket_title = excluded.ticket_title,
                       ticket_url   = excluded.ticket_url,
                       assignee     = excluded.assignee""",
                (wo.work_order_id, wo.ticket_title, wo.ticket_url, wo.assignee, wo.created_at),
            )

    def get_work_order(self, work_order_id: str) -> Optional[WorkOrderRef]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM work_orders WHERE work_order_id = ?", (work_order_id,)
            ).fetchone()
        return WorkOrderRef(**dict(row)) if row else None

    # ---------- 结论（带去重） ----------

    def upsert_conclusion(self, conc: MaskVerifyConclusion) -> MaskVerifyConclusion:
        """插入或替换结论：同工单同字段路径旧结论标 SUPERSEDED，保持唯一 ACTIVE。"""
        with self._tx() as conn:
            conn.execute(
                """UPDATE conclusions
                      SET status = ?, superseded_by = ?
                    WHERE conclusion_key = ? AND status = 'ACTIVE'""",
                (ConclusionStatus.SUPERSEDED.value, conc.conclusion_id, conc.conclusion_key),
            )
            conn.execute(
                """INSERT INTO conclusions
                   (conclusion_id, conclusion_key, work_order_id, field_path,
                    expected_mask_level, actual_mask_level, is_pass, status,
                    remark, created_at, superseded_by, processing_record_id,
                    slow_query_json, source_ref_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    conc.conclusion_id, conc.conclusion_key, conc.work_order_id,
                    conc.field_path, conc.expected_mask_level.value,
                    conc.actual_mask_level.value, 1 if conc.is_pass else 0,
                    conc.status.value, conc.remark, conc.created_at,
                    conc.superseded_by, conc.processing_record_id,
                    json.dumps([r.to_dict() for r in conc.slow_query_refs]),
                    json.dumps([r.to_dict() for r in conc.source_refs]),
                ),
            )
        return conc

    def list_active_conclusions(self, work_order_id: Optional[str] = None,
                                batch_id: Optional[str] = None) -> list[MaskVerifyConclusion]:
        sql = "SELECT c.* FROM conclusions c WHERE c.status = 'ACTIVE'"
        params: list = []
        if work_order_id:
            sql += " AND c.work_order_id = ?"
            params.append(work_order_id)
        if batch_id:
            sql += """ AND EXISTS (
                SELECT 1 FROM processing_records pr
                 WHERE pr.record_id = c.processing_record_id AND pr.batch_id = ?
            )"""
            params.append(batch_id)
        sql += " ORDER BY c.work_order_id, c.field_path"
        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [self._row_to_conclusion(dict(r)) for r in rows]

    def get_conclusion(self, conclusion_id: str) -> Optional[MaskVerifyConclusion]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM conclusions WHERE conclusion_id = ?", (conclusion_id,)
            ).fetchone()
        return self._row_to_conclusion(dict(row)) if row else None

    @staticmethod
    def _row_to_conclusion(d: dict) -> MaskVerifyConclusion:
        data = dict(d)
        data["is_pass"] = bool(data.get("is_pass", 0))
        slow_raw = json.loads(data.pop("slow_query_json", "[]") or "[]")
        src_raw = json.loads(data.pop("source_ref_json", "[]") or "[]")
        conc = MaskVerifyConclusion.from_dict(data)
        conc.slow_query_refs = [SlowQueryRef(**r) for r in slow_raw]
        conc.source_refs = [SourceRef(**r) for r in src_raw]
        return conc

    # ---------- 回滚 ----------

    def rollback_batch(self, batch_id: str, reason: str) -> RollbackPoint:
        """按批次回滚：把该批次产出的 ACTIVE 结论标记 ROLLBACK，并恢复上一条 SUPERSEDED。"""
        point_id = f"rb_{_content_hash(batch_id + '|' + _utc_now_iso())}"
        with self._tx() as conn:
            rows = conn.execute(
                """SELECT c.conclusion_id, c.conclusion_key, c.work_order_id
                     FROM conclusions c
                     JOIN processing_records pr ON pr.record_id = c.processing_record_id
                    WHERE pr.batch_id = ? AND c.status = 'ACTIVE'""",
                (batch_id,),
            ).fetchall()
            affected_keys = []
            for r in rows:
                affected_keys.append(r["conclusion_key"])
                conn.execute(
                    "UPDATE conclusions SET status = 'ROLLBACK' WHERE conclusion_id = ?",
                    (r["conclusion_id"],),
                )
                prev = conn.execute(
                    """SELECT conclusion_id FROM conclusions
                        WHERE conclusion_key = ? AND status = 'SUPERSEDED'
                        ORDER BY created_at DESC LIMIT 1""",
                    (r["conclusion_key"],),
                ).fetchone()
                if prev:
                    conn.execute(
                        "UPDATE conclusions SET status = 'ACTIVE' WHERE conclusion_id = ?",
                        (prev["conclusion_id"],),
                    )
            conn.execute(
                """INSERT INTO rollback_points(point_id, batch_id, rolled_back_at, reason,
                                               affected_conclusion_keys_json)
                   VALUES (?,?,?,?,?)""",
                (point_id, batch_id, _utc_now_iso(), reason, json.dumps(affected_keys)),
            )
        return RollbackPoint(
            point_id=point_id, batch_id=batch_id, reason=reason,
            affected_conclusion_keys=affected_keys,
        )

    def list_rollback_points(self) -> list[RollbackPoint]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM rollback_points ORDER BY rolled_back_at DESC"
            ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            keys = json.loads(d.pop("affected_conclusion_keys_json") or "[]")
            result.append(RollbackPoint(**d, affected_conclusion_keys=keys))
        return result

    # ---------- 追溯链 ----------

    def trace_from_conclusion(self, conclusion_id: str) -> Optional[TraceChain]:
        """给定结论 ID，沿 processing_record → sources / work_order / slow_queries 一路回溯。"""
        conc = self.get_conclusion(conclusion_id)
        if not conc:
            return None
        rec = None
        if conc.processing_record_id:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT * FROM processing_records WHERE record_id = ?",
                    (conc.processing_record_id,),
                ).fetchone()
            if row:
                d = dict(row)
                d["output_refs"] = json.loads(d.pop("output_refs_json") or "[]")
                rec = ProcessingRecord.from_dict(d)
        wo = self.get_work_order(conc.work_order_id) or WorkOrderRef(
            work_order_id=conc.work_order_id
        )
        return TraceChain(
            conclusion=conc,
            processing_record=rec or ProcessingRecord(
                record_id="unknown", idempotency_key="unknown",
                batch_id="unknown", work_order_id=conc.work_order_id,
                content_hash="unknown",
            ),
            work_order=wo,
            sources=conc.source_refs,
            slow_queries=conc.slow_query_refs,
        )

    def trace_from_slow_query(self, slow_log_id: str) -> list[TraceChain]:
        """给定慢查询日志 ID，反查对应结论（复盘时直接跳结论）。"""
        chains: list[TraceChain] = []
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT conclusion_id, slow_query_json FROM conclusions WHERE status = 'ACTIVE'"
            ).fetchall()
        for r in rows:
            sq_list = json.loads(r["slow_query_json"] or "[]")
            if any(sq.get("slow_log_id") == slow_log_id for sq in sq_list):
                chain = self.trace_from_conclusion(r["conclusion_id"])
                if chain:
                    chains.append(chain)
        return chains
