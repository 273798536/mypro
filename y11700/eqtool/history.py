from __future__ import annotations

import json
import csv
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from .models import (
    Session, StudentScore, TestForm, AnchorItem, DifficultyParam,
    AbsenceMark, AbsenceStatus, CorrectionType,
    EquatingResult, CorrectionRecord, ImportStrategy, DataSource,
)
from .warnings import WarningCollector, WarningCategory, WarningLevel


HISTORY_DIR = Path.home() / ".eqtool" / "sessions"


def _ensure_history_dir():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(session_id: str) -> Path:
    _ensure_history_dir()
    return HISTORY_DIR / f"{session_id}.json"


def save_session(session: Session) -> str:
    _ensure_history_dir()
    path = _session_path(session.session_id)
    data = {
        "session_id": session.session_id,
        "name": session.name,
        "source_files": session.source_files,
        "test_forms": {
            fid: {
                "form_id": f.form_id,
                "subject": f.subject,
                "total_items": f.total_items,
                "anchor_items": f.anchor_items,
                "difficulty_mean": f.difficulty_mean,
                "difficulty_sd": f.difficulty_sd,
                "raw_mean": f.raw_mean,
                "raw_sd": f.raw_sd,
                "sample_size": f.sample_size,
            }
            for fid, f in session.test_forms.items()
        },
        "anchor_items": {
            aid: {
                "item_id": a.item_id,
                "test_form": a.test_form,
                "difficulty": a.difficulty,
                "discrimination": a.discrimination,
                "is_anchor": a.is_anchor,
                "score_mean": a.score_mean,
                "score_sd": a.score_sd,
                "sample_size": a.sample_size,
            }
            for aid, a in session.anchor_items.items()
        },
        "difficulty_params": {
            pid: {
                "item_id": p.item_id,
                "test_form": p.test_form,
                "b_parameter": p.b_parameter,
                "a_parameter": p.a_parameter,
                "source": p.source,
            }
            for pid, p in session.difficulty_params.items()
        },
        "absence_marks": {
            fid: [
                {"student_id": m.student_id, "test_form": m.test_form,
                 "status": m.status.value, "reason": m.reason}
                for m in marks
            ]
            for fid, marks in session.absence_marks.items()
        },
        "student_scores": {
            fid: [
                {
                    "student_id": s.student_id,
                    "test_form": s.test_form,
                    "raw_score": s.raw_score,
                    "total_possible": s.total_possible,
                    "anchor_score": s.anchor_score,
                    "ability_estimate": s.ability_estimate,
                    "equated_score": s.equated_score,
                    "is_valid": s.is_valid,
                    "exclusion_reason": s.exclusion_reason,
                }
                for s in scores
            ]
            for fid, scores in session.student_scores.items()
        },
        "corrections": [c.to_row() for c in session.corrections],
        "equating_results": {
            key: {
                "session_id": eq.session_id,
                "reference_form": eq.reference_form,
                "target_form": eq.target_form,
                "method": eq.method,
                "slope": eq.slope,
                "intercept": eq.intercept,
                "standard_error": eq.standard_error,
                "anchor_count": eq.anchor_count,
                "anchor_r": eq.anchor_r,
                "sample_size_ref": eq.sample_size_ref,
                "sample_size_tgt": eq.sample_size_tgt,
                "created_at": eq.created_at,
            }
            for key, eq in session.equating_results.items()
        },
        "warnings": session.warnings,
        "created_at": session.created_at,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return str(path)


def load_session(session_id: str) -> Optional[Session]:
    path = _session_path(session_id)
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return _deserialize_session(data)


def _deserialize_session(data: Dict) -> Session:
    session = Session(
        session_id=data.get("session_id", ""),
        name=data.get("name", ""),
        source_files=data.get("source_files", {}),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", ""),
    )
    for fid, fdata in data.get("test_forms", {}).items():
        session.test_forms[fid] = TestForm(
            form_id=fdata.get("form_id", fid),
            subject=fdata.get("subject", ""),
            total_items=fdata.get("total_items", 0),
            anchor_items=fdata.get("anchor_items", []),
            difficulty_mean=fdata.get("difficulty_mean", 0.0),
            difficulty_sd=fdata.get("difficulty_sd", 1.0),
            raw_mean=fdata.get("raw_mean", 0.0),
            raw_sd=fdata.get("raw_sd", 1.0),
            sample_size=fdata.get("sample_size", 0),
        )
    for aid, adata in data.get("anchor_items", {}).items():
        session.anchor_items[aid] = AnchorItem(
            item_id=adata.get("item_id", aid),
            test_form=adata.get("test_form", ""),
            difficulty=adata.get("difficulty", 0.0),
            discrimination=adata.get("discrimination", 1.0),
            is_anchor=adata.get("is_anchor", True),
            score_mean=adata.get("score_mean", 0.0),
            score_sd=adata.get("score_sd", 1.0),
            sample_size=adata.get("sample_size", 0),
        )
    for pid, pdata in data.get("difficulty_params", {}).items():
        session.difficulty_params[pid] = DifficultyParam(
            item_id=pdata.get("item_id", pid),
            test_form=pdata.get("test_form", ""),
            b_parameter=pdata.get("b_parameter", 0.0),
            a_parameter=pdata.get("a_parameter", 1.0),
            source=pdata.get("source", ""),
        )
    for fid, mlist in data.get("absence_marks", {}).items():
        session.absence_marks[fid] = [
            AbsenceMark(
                student_id=m.get("student_id", ""),
                test_form=m.get("test_form", fid),
                status=AbsenceStatus(m.get("status", "present")),
                reason=m.get("reason", ""),
            )
            for m in mlist
        ]
    for fid, slist in data.get("student_scores", {}).items():
        session.student_scores[fid] = [
            StudentScore(
                student_id=s.get("student_id", ""),
                test_form=s.get("test_form", fid),
                raw_score=s.get("raw_score", 0.0),
                total_possible=s.get("total_possible", 100.0),
                anchor_score=s.get("anchor_score"),
                ability_estimate=s.get("ability_estimate", 0.0),
                equated_score=s.get("equated_score", 0.0),
                is_valid=s.get("is_valid", True),
                exclusion_reason=s.get("exclusion_reason", ""),
            )
            for s in slist
        ]
    for cdata in data.get("corrections", []):
        session.corrections.append(CorrectionRecord(
            correction_id=cdata.get("修正ID", ""),
            correction_type=CorrectionType(cdata.get("修正类型", "outlier_flagged")),
            student_id=cdata.get("学生ID", ""),
            test_form=cdata.get("试卷版本", ""),
            original_value=cdata.get("原始值", ""),
            corrected_value=cdata.get("修正值", ""),
            reason=cdata.get("原因", ""),
            timestamp=cdata.get("时间戳", ""),
        ))
    for key, edata in data.get("equating_results", {}).items():
        session.equating_results[key] = EquatingResult(
            session_id=edata.get("session_id", ""),
            reference_form=edata.get("reference_form", ""),
            target_form=edata.get("target_form", ""),
            method=edata.get("method", ""),
            slope=edata.get("slope", 1.0),
            intercept=edata.get("intercept", 0.0),
            standard_error=edata.get("standard_error", 0.0),
            anchor_count=edata.get("anchor_count", 0),
            anchor_r=edata.get("anchor_r", 0.0),
            sample_size_ref=edata.get("sample_size_ref", 0),
            sample_size_tgt=edata.get("sample_size_tgt", 0),
            created_at=edata.get("created_at", ""),
        )
    session.warnings = data.get("warnings", [])
    return session


def list_sessions() -> List[Dict]:
    _ensure_history_dir()
    sessions = []
    for path in sorted(HISTORY_DIR.glob("*.json"), reverse=True):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            sessions.append({
                "session_id": data.get("session_id", ""),
                "name": data.get("name", ""),
                "test_forms": len(data.get("test_forms", {})),
                "student_count": sum(
                    len(v) for v in data.get("student_scores", {}).values()
                ),
                "corrections": len(data.get("corrections", [])),
                "warnings": len(data.get("warnings", [])),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", ""),
            })
        except Exception:
            continue
    return sessions


def delete_session(session_id: str) -> bool:
    path = _session_path(session_id)
    if path.exists():
        path.unlink()
        return True
    return False


def merge_sessions(
    target_id: str, source_id: str, strategy: ImportStrategy = ImportStrategy.APPEND,
    warnings: Optional[WarningCollector] = None,
) -> Optional[Session]:
    warnings = warnings or WarningCollector()
    target = load_session(target_id)
    source = load_session(source_id)
    if not target or not source:
        warnings.add(
            WarningCategory.IMPORT_CONFLICT, WarningLevel.CRITICAL,
            f"会话不存在: {target_id if not target else source_id}",
        )
        return None
    from .loader import _resolve_import
    for fid, fdata in source.test_forms.items():
        if fid not in target.test_forms:
            target.test_forms[fid] = fdata
        else:
            if strategy == ImportStrategy.OVERWRITE:
                target.test_forms[fid] = fdata
    for aid, adata in source.anchor_items.items():
        if aid not in target.anchor_items:
            target.anchor_items[aid] = adata
        else:
            if strategy == ImportStrategy.OVERWRITE:
                target.anchor_items[aid] = adata
    for pid, pdata in source.difficulty_params.items():
        if pid not in target.difficulty_params:
            target.difficulty_params[pid] = pdata
        else:
            if strategy == ImportStrategy.OVERWRITE:
                target.difficulty_params[pid] = pdata
    for fid, marks in source.absence_marks.items():
        target.absence_marks.setdefault(fid, []).extend(marks)
    for fid, scores in source.student_scores.items():
        target.student_scores.setdefault(fid, []).extend(scores)
    target.corrections.extend(source.corrections)
    target.equating_results.update(source.equating_results)
    target.source_files.update(source.source_files)
    target.warnings.extend(source.warnings)
    target.updated_at = datetime.now().isoformat(timespec="seconds")
    save_session(target)
    return target


def import_session_from_json(path: str, warnings: Optional[WarningCollector] = None) -> Optional[Session]:
    warnings = warnings or WarningCollector()
    p = Path(path)
    if not p.exists():
        warnings.add(
            WarningCategory.IMPORT_CONFLICT, WarningLevel.CRITICAL,
            f"导入文件不存在: {path}",
        )
        return None
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    session = _deserialize_session(data)
    save_session(session)
    return session