from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    CheckReport,
    CheckResult,
    CheckStatus,
    CorrectionAction,
    CorrectionRecord,
    SampleRecord,
    SampleSource,
    TraceLink,
)


class WorkspaceStore:
    """工作区存储与业务逻辑

    职责:
    - 样本导入 + 去重（基于 fingerprint）
    - 检查结果持久化
    - 人工修正留痕
    - 追溯链构建
    """

    def __init__(self, root: Path | str = "./spline_workspace"):
        self.root = Path(root).expanduser().resolve()
        self.samples_dir = self.root / "samples"
        self.results_dir = self.root / "results"
        self.corrections_dir = self.root / "corrections"
        self.fingerprint_index = self.root / "fingerprints.json"
        for d in (self.samples_dir, self.results_dir, self.corrections_dir):
            d.mkdir(parents=True, exist_ok=True)
        self._load_fingerprint_index()

    # ---------- index ----------
    def _load_fingerprint_index(self):
        if self.fingerprint_index.exists():
            with open(self.fingerprint_index, encoding="utf-8") as f:
                self._fp_map: Dict[str, str] = json.load(f)
        else:
            self._fp_map = {}

    def _save_fingerprint_index(self):
        with open(self.fingerprint_index, "w", encoding="utf-8") as f:
            json.dump(self._fp_map, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _to_json(obj) -> str:
        if hasattr(obj, "model_dump"):
            data = obj.model_dump(mode="json")
        else:
            data = obj.dict()
        return json.dumps(data, ensure_ascii=False, indent=2, default=str)

    @staticmethod
    def _from_file(path: Path, cls):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if hasattr(cls, "model_validate"):
            return cls.model_validate(raw)
        return cls.parse_obj(raw)

    # ---------- samples ----------
    def add_sample(self, sample: SampleRecord) -> Tuple[bool, str]:
        """导入样本。返回 (是否新增, sample_id)。
        如 fingerprint 已存在则拒绝重复导入，返回已有 sample_id。"""
        fp = sample.fingerprint
        if fp in self._fp_map:
            return False, self._fp_map[fp]
        path = self.samples_dir / f"{sample.sample_id}.json"
        path.write_text(self._to_json(sample), encoding="utf-8")
        self._fp_map[fp] = sample.sample_id
        self._save_fingerprint_index()
        return True, sample.sample_id

    def add_samples(self, samples: List[SampleRecord]) -> Tuple[List[str], List[str]]:
        added, dup = [], []
        for s in samples:
            ok, sid = self.add_sample(s)
            if ok:
                added.append(sid)
            else:
                dup.append(sid)
        return added, dup

    def get_sample(self, sample_id: str) -> Optional[SampleRecord]:
        path = self.samples_dir / f"{sample_id}.json"
        if not path.exists():
            return None
        return self._from_file(path, SampleRecord)

    def list_samples(self) -> List[SampleRecord]:
        out = []
        for p in sorted(self.samples_dir.glob("*.json")):
            try:
                out.append(self._from_file(p, SampleRecord))
            except Exception:
                pass
        return out

    def find_by_fingerprint(self, fp: str) -> Optional[SampleRecord]:
        sid = self._fp_map.get(fp)
        return self.get_sample(sid) if sid else None

    # ---------- results ----------
    def save_result(self, result: CheckResult) -> None:
        path = self.results_dir / f"{result.sample_id}.json"
        corrections = self.list_corrections(result.sample_id)
        if corrections:
            latest = corrections[-1]
            if latest.after_status is not None:
                result.status = latest.after_status
            if latest.after_note is not None:
                result.note = latest.after_note
        path.write_text(self._to_json(result), encoding="utf-8")

    def get_result(self, sample_id: str) -> Optional[CheckResult]:
        path = self.results_dir / f"{sample_id}.json"
        if not path.exists():
            return None
        return self._from_file(path, CheckResult)

    def list_results(self) -> List[CheckResult]:
        out = []
        for p in sorted(self.results_dir.glob("*.json")):
            try:
                out.append(self._from_file(p, CheckResult))
            except Exception:
                pass
        return out

    # ---------- corrections ----------
    def add_correction(self, correction: CorrectionRecord) -> None:
        ts = correction.corrected_at.strftime("%Y%m%d_%H%M%S_%f")
        path = self.corrections_dir / f"{correction.sample_id}_{ts}.json"
        path.write_text(self._to_json(correction), encoding="utf-8")
        result = self.get_result(correction.sample_id)
        if result is not None and correction.after_status is not None:
            result.status = correction.after_status
            result.note = correction.after_note or result.note
            self.save_result(result)

    def list_corrections(self, sample_id: Optional[str] = None) -> List[CorrectionRecord]:
        pattern = f"{sample_id}_*.json" if sample_id else "*.json"
        out = []
        for p in sorted(self.corrections_dir.glob(pattern)):
            try:
                out.append(self._from_file(p, CorrectionRecord))
            except Exception:
                pass
        return out

    # ---------- trace ----------
    def build_trace(self, sample_id: str) -> List[TraceLink]:
        """从结果一路倒查来源和处理记录（验收倒查使用）"""
        links: List[TraceLink] = []
        sample = self.get_sample(sample_id)
        result = self.get_result(sample_id)
        corrections = self.list_corrections(sample_id)

        if result:
            links.append(TraceLink(
                level="检查结果",
                description=f"{result.status.value} | 过冲={result.has_overshoot} | 最大过冲={result.max_overshoot}",
                detail={
                    "fingerprint": result.fingerprint,
                    "smoothing": result.smoothing,
                    "knots": result.knots,
                    "checked_at": result.checked_at.isoformat(),
                },
            ))
        if sample:
            links.append(TraceLink(
                level="来源",
                description=f"{sample.source.value} | 文件={sample.source_file} | 批次={sample.source_batch}",
                detail={
                    "operator": sample.operator,
                    "imported_at": sample.imported_at.isoformat(),
                    "x_count": len(sample.x_values),
                },
            ))
        for c in corrections:
            links.append(TraceLink(
                level="修正记录",
                description=f"{c.action.value} by {c.operator}: {c.reason}",
                detail={
                    "diff": c.describe_diff(),
                    "corrected_at": c.corrected_at.isoformat(),
                },
            ))
        return links

    # ---------- correction helpers ----------
    def apply_correction(
        self,
        sample_id: str,
        action: CorrectionAction,
        operator: str,
        reason: str,
        target_status: Optional[CheckStatus] = None,
        note: Optional[str] = None,
    ) -> CorrectionRecord:
        """做一次修正，留痕并同步更新结果状态"""
        result = self.get_result(sample_id)
        before_status = result.status if result else None
        before_note = result.note if result else None
        sample = self.get_sample(sample_id)
        fp = sample.fingerprint if sample else ""

        if action == CorrectionAction.CONFIRM_PASS:
            after_status = CheckStatus.USABLE
        elif action == CorrectionAction.MARK_RECOLLECT:
            after_status = CheckStatus.RECOLLECT
        else:
            after_status = target_status or before_status

        after_note = note if note is not None else before_note

        rec = CorrectionRecord(
            sample_id=sample_id,
            fingerprint=fp,
            action=action,
            operator=operator,
            before_status=before_status,
            after_status=after_status,
            before_note=before_note,
            after_note=after_note,
            reason=reason,
        )
        self.add_correction(rec)
        return rec

    # ---------- report ----------
    def build_report(self, duplicates: Optional[List[str]] = None) -> CheckReport:
        results = self.list_results()
        corrections = self.list_corrections()
        usable = sum(1 for r in results if r.status == CheckStatus.USABLE)
        pending = sum(1 for r in results if r.status == CheckStatus.PENDING)
        recollect = sum(1 for r in results if r.status == CheckStatus.RECOLLECT)
        boundary = sum(1 for r in results if r.is_boundary_case)
        return CheckReport(
            total=len(results),
            usable_count=usable,
            pending_count=pending,
            recollect_count=recollect,
            boundary_count=boundary,
            results=results,
            corrections=corrections,
            duplicates_detected=duplicates or [],
        )
