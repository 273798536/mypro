"""核验引擎：解析输入 JSON，走幂等检查，产出脱敏核验结论。

输入格式（约定 input/ 下一个或多个 .json 文件）：
{
  "work_order": {
    "work_order_id": "WO-2026-0618-001",
    "ticket_title": "迁移前脱敏核验",
    "ticket_url": "https://...",
    "assignee": "alice",
    "created_at": "2026-06-18T09:00:00Z"
  },
  "batch_id": "BATCH-001",
  "operator": "alice",
  "field_checks": [
    {
      "field_path": "user.profile.phone",
      "expected_mask_level": "PARTIAL",
      "actual_sample": "138****1234",
      "source_file": "fixtures/audit_20260618.log",
      "source_line_start": 12,
      "source_line_end": 15,
      "raw_excerpt": "...phone=138****1234...",
      "slow_query": {
        "slow_log_id": "SQ-9F3A",
        "slow_log_file": "mysql-slow.log",
        "slow_log_line": 442,
        "sql_excerpt": "SELECT phone FROM user WHERE id IN (...)",
        "query_time_ms": 1280
      }
    }
  ]
}
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .models import (
    ConclusionStatus,
    MaskLevel,
    MaskVerifyConclusion,
    ProcessStatus,
    ProcessingRecord,
    SlowQueryRef,
    SourceRef,
    WorkOrderRef,
    _content_hash,
    make_conclusion_key,
    make_idempotency_key,
)
from .storage import Store


@dataclass
class VerifyRunStats:
    batch_id: str
    processed_files: int = 0
    skipped_idempotent: int = 0
    conclusions_added: int = 0
    conclusions_superseded: int = 0
    pass_count: int = 0
    fail_count: int = 0


def _judge_mask_level(sample: str) -> MaskLevel:
    """简单判定：含 **** 且可见字符>0 则 PARTIAL；全部 * 则 FULL；其余 NONE。"""
    s = (sample or "").strip()
    if not s:
        return MaskLevel.NONE
    star_count = s.count("*")
    if star_count == 0:
        return MaskLevel.NONE
    if star_count == len(s):
        return MaskLevel.FULL
    return MaskLevel.PARTIAL


def _parse_input_file(p: Path) -> dict:
    data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "field_checks" not in data:
        raise ValueError(f"输入文件格式错误（缺 field_checks）: {p}")
    return data


class VerifyEngine:
    def __init__(self, store: Store, output_dir: Path):
        self.store = store
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ---------- 核心核验流程 ----------

    def run(self, input_files: Iterable[Path]) -> VerifyRunStats:
        stats: VerifyRunStats | None = None
        for p in input_files:
            p = Path(p)
            data = _parse_input_file(p)
            if stats is None:
                stats = VerifyRunStats(batch_id=data.get("batch_id", "unnamed"))
            stats = self._run_single(p, data, stats)
        return stats or VerifyRunStats(batch_id="empty")

    def _run_single(self, input_file: Path, data: dict, stats: VerifyRunStats) -> VerifyRunStats:
        wo_raw = data.get("work_order", {})
        wo = WorkOrderRef(
            work_order_id=wo_raw["work_order_id"],
            ticket_title=wo_raw.get("ticket_title", ""),
            ticket_url=wo_raw.get("ticket_url", ""),
            assignee=wo_raw.get("assignee", ""),
            created_at=wo_raw.get("created_at", ""),
        )
        self.store.upsert_work_order(wo)

        batch_id = data.get("batch_id") or stats.batch_id
        operator = data.get("operator", "cli")
        file_text = input_file.read_text(encoding="utf-8")
        content_hash = _content_hash(file_text)
        idem_key = make_idempotency_key(wo.work_order_id, batch_id, content_hash)

        stats.processed_files += 1

        existing = self.store.get_idempotent_record(idem_key)
        if existing and existing.status in (ProcessStatus.DONE, ProcessStatus.SKIPPED_IDEMPOTENT):
            stats.skipped_idempotent += 1
            return stats

        record_id = f"rec_{uuid.uuid4().hex[:12]}"
        rec = ProcessingRecord(
            record_id=record_id,
            idempotency_key=idem_key,
            batch_id=batch_id,
            work_order_id=wo.work_order_id,
            content_hash=content_hash,
            status=ProcessStatus.PROCESSING,
            operator=operator,
            input_file=str(input_file),
        )
        try:
            self.store.insert_processing_record(rec)
        except Exception:
            stats.skipped_idempotent += 1
            return stats

        output_refs: list[str] = []
        for check in data.get("field_checks", []):
            conc = self._build_conclusion(record_id, batch_id, wo.work_order_id, check)
            self.store.upsert_conclusion(conc)
            if conc.status == ConclusionStatus.ACTIVE:
                stats.conclusions_added += 1
            if conc.is_pass:
                stats.pass_count += 1
            else:
                stats.fail_count += 1
            output_refs.append(conc.conclusion_id)

        self.store.mark_processing_done(record_id, ProcessStatus.DONE, output_refs)
        return stats

    @staticmethod
    def _build_conclusion(record_id: str, batch_id: str, work_order_id: str,
                          check: dict) -> MaskVerifyConclusion:
        field_path = check["field_path"]
        expected_str = check.get("expected_mask_level", "UNKNOWN").upper()
        expected = MaskLevel(expected_str) if expected_str in MaskLevel.__members__ else MaskLevel.UNKNOWN
        sample = check.get("actual_sample", "")
        actual = _judge_mask_level(sample)

        source_refs = []
        if check.get("source_file") or check.get("raw_excerpt"):
            source_refs.append(SourceRef(
                source_file=check.get("source_file", ""),
                source_line_start=int(check.get("source_line_start") or 0),
                source_line_end=int(check.get("source_line_end") or 0),
                raw_excerpt=check.get("raw_excerpt", ""),
            ))

        slow_refs = []
        sq = check.get("slow_query")
        if sq and sq.get("slow_log_id"):
            slow_refs.append(SlowQueryRef(
                slow_log_id=sq["slow_log_id"],
                slow_log_file=sq.get("slow_log_file", ""),
                slow_log_line=int(sq.get("slow_log_line") or 0),
                sql_excerpt=sq.get("sql_excerpt", ""),
                query_time_ms=int(sq.get("query_time_ms") or 0),
            ))

        conc_key = make_conclusion_key(work_order_id, field_path)
        is_pass = expected != MaskLevel.UNKNOWN and expected == actual
        remark = f"预期={expected.value} 实际={actual.value} 样本={sample!r}"

        return MaskVerifyConclusion(
            conclusion_id=f"conc_{uuid.uuid4().hex[:12]}",
            conclusion_key=conc_key,
            work_order_id=work_order_id,
            field_path=field_path,
            expected_mask_level=expected,
            actual_mask_level=actual,
            is_pass=is_pass,
            status=ConclusionStatus.ACTIVE,
            remark=remark,
            processing_record_id=record_id,
            slow_query_refs=slow_refs,
            source_refs=source_refs,
        )
