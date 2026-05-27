from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .models import (
    StudentScore, TestForm, AnchorItem, DifficultyParam,
    AbsenceMark, AbsenceStatus, ImportStrategy, DataSource, Session,
    CorrectionRecord, CorrectionType,
)
from .warnings import WarningCollector, WarningCategory, WarningLevel


def _detect_file_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext in (".xlsx", ".xls"):
        return "excel"
    return "csv"


def _read_csv(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def _read_excel(path: str, sheet_name: Optional[str] = None) -> List[Dict]:
    import pandas as pd
    if sheet_name:
        df = pd.read_excel(path, sheet_name=sheet_name)
    else:
        df = pd.read_excel(path)
    return df.to_dict("records")


def _read_file(path: str, sheet_name: Optional[str] = None) -> List[Dict]:
    ft = _detect_file_type(path)
    if ft == "excel":
        return _read_excel(path, sheet_name)
    return _read_csv(path)


def _resolve_import(
    existing: Dict, new_items: Dict, key_field: str, strategy: ImportStrategy,
    data_source: str, warnings: WarningCollector,
) -> Dict:
    result = dict(existing)
    for key, item in new_items.items():
        if key in existing:
            if strategy == ImportStrategy.IGNORE:
                warnings.add(
                    WarningCategory.IMPORT_CONFLICT,
                    WarningLevel.INFO,
                    f"{data_source}: 键[{key}]已存在，按策略忽略",
                    {"key": key, "strategy": strategy.value},
                )
                continue
            elif strategy == ImportStrategy.OVERWRITE:
                warnings.add(
                    WarningCategory.IMPORT_CONFLICT,
                    WarningLevel.WARNING,
                    f"{data_source}: 键[{key}]已存在，按策略覆盖",
                    {"key": key, "strategy": strategy.value},
                )
                result[key] = item
            elif strategy == ImportStrategy.APPEND:
                warnings.add(
                    WarningCategory.IMPORT_CONFLICT,
                    WarningLevel.INFO,
                    f"{data_source}: 键[{key}]已存在，按策略追加后缀",
                    {"key": key, "strategy": strategy.value},
                )
                new_key = f"{key}_dup{len(result)}"
                result[new_key] = item
        else:
            result[key] = item
    return result


def load_student_scores(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    new_scores: Dict[str, StudentScore] = {}
    for row in rows:
        try:
            sid = str(row.get("学生ID", row.get("student_id", ""))).strip()
            tf = str(row.get("试卷版本", row.get("test_form", ""))).strip()
            raw = float(row.get("原始分", row.get("raw_score", 0)))
            total = float(row.get("满分", row.get("total_possible", 100)))
            anchor_raw = row.get("锚题得分", row.get("anchor_score", None))
            anchor_score = float(anchor_raw) if anchor_raw is not None and str(anchor_raw).strip() != "" else None
            if not sid or not tf:
                continue
            key = f"{sid}|{tf}"
            new_scores[key] = StudentScore(
                student_id=sid, test_form=tf,
                raw_score=raw, total_possible=total,
                anchor_score=anchor_score,
            )
        except (ValueError, KeyError) as e:
            warnings.add(
                WarningCategory.OUTLIER, WarningLevel.WARNING,
                f"学生成绩行解析失败: {str(row)[:80]}", {"error": str(e)},
            )
    existing = {f"{s.student_id}|{s.test_form}": s for tf_list in session.student_scores.values() for s in tf_list}
    merged = _resolve_import(existing, new_scores, "student_id|test_form", strategy, "学生成绩", warnings)
    result: Dict[str, List[StudentScore]] = {}
    for s in merged.values():
        result.setdefault(s.test_form, []).append(s)
    session.student_scores = result
    session.source_files[str(path)] = DataSource.STUDENT_SCORE.value
    return session


def load_test_forms(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    new_forms: Dict[str, TestForm] = {}
    for row in rows:
        fid = str(row.get("试卷ID", row.get("form_id", ""))).strip()
        if not fid:
            continue
        anchors = str(row.get("锚题列表", row.get("anchor_items", ""))).strip()
        anchor_list = [a.strip() for a in anchors.split(",") if a.strip()] if anchors else []
        new_forms[fid] = TestForm(
            form_id=fid,
            subject=str(row.get("科目", row.get("subject", ""))).strip(),
            total_items=int(float(row.get("题目数", row.get("total_items", 0)))),
            anchor_items=anchor_list,
            difficulty_mean=float(row.get("难度均值", row.get("difficulty_mean", 0))),
            difficulty_sd=float(row.get("难度标准差", row.get("difficulty_sd", 1))),
            raw_mean=float(row.get("原始分均值", row.get("raw_mean", 0))),
            raw_sd=float(row.get("原始分标准差", row.get("raw_sd", 1))),
        )
    merged = _resolve_import(
        {fid: f for fid, f in session.test_forms.items()},
        new_forms, "form_id", strategy, "试卷版本", warnings,
    )
    session.test_forms = merged
    session.source_files[str(path)] = DataSource.TEST_FORM.value
    return session


def load_anchor_items(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    new_anchors: Dict[str, AnchorItem] = {}
    for row in rows:
        iid = str(row.get("题目ID", row.get("item_id", ""))).strip()
        tf = str(row.get("试卷版本", row.get("test_form", ""))).strip()
        if not iid or not tf:
            continue
        key = f"{iid}|{tf}"
        new_anchors[key] = AnchorItem(
            item_id=iid, test_form=tf,
            difficulty=float(row.get("难度", row.get("difficulty", 0))),
            discrimination=float(row.get("区分度", row.get("discrimination", 1))),
            is_anchor=str(row.get("是否锚题", row.get("is_anchor", "是"))).strip() in ("是", "Y", "y", "true", "True", "1"),
            score_mean=float(row.get("锚题均分", row.get("score_mean", 0))),
            score_sd=float(row.get("锚题标准差", row.get("score_sd", 1))),
            sample_size=int(float(row.get("样本量", row.get("sample_size", 0)))),
        )
    existing = {f"{a.item_id}|{a.test_form}": a for a in session.anchor_items.values()}
    merged = _resolve_import(existing, new_anchors, "item_id|test_form", strategy, "锚题", warnings)
    session.anchor_items = {f"{a.item_id}|{a.test_form}": a for a in merged.values()}
    session.source_files[str(path)] = DataSource.ANCHOR_ITEM.value
    return session


def load_difficulty_params(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    new_params: Dict[str, DifficultyParam] = {}
    for row in rows:
        iid = str(row.get("题目ID", row.get("item_id", ""))).strip()
        tf = str(row.get("试卷版本", row.get("test_form", ""))).strip()
        if not iid or not tf:
            continue
        key = f"{iid}|{tf}"
        new_params[key] = DifficultyParam(
            item_id=iid, test_form=tf,
            b_parameter=float(row.get("难度参数b", row.get("b_parameter", 0))),
            a_parameter=float(row.get("区分度参数a", row.get("a_parameter", 1))),
            source=str(row.get("来源", row.get("source", ""))).strip(),
        )
    existing = {f"{p.item_id}|{p.test_form}": p for p in session.difficulty_params.values()}
    merged = _resolve_import(existing, new_params, "item_id|test_form", strategy, "难度参数", warnings)
    session.difficulty_params = {f"{p.item_id}|{p.test_form}": p for p in merged.values()}
    session.source_files[str(path)] = DataSource.DIFFICULTY_PARAM.value
    return session


def load_absence_marks(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    new_marks: Dict[str, AbsenceMark] = {}
    for row in rows:
        sid = str(row.get("学生ID", row.get("student_id", ""))).strip()
        tf = str(row.get("试卷版本", row.get("test_form", ""))).strip()
        if not sid or not tf:
            continue
        status_str = str(row.get("缺考状态", row.get("status", "到场"))).strip()
        if status_str in ("缺考", "absent", "ABSENT", "A"):
            status = AbsenceStatus.ABSENT
        elif status_str in ("无效", "invalid", "INVALID"):
            status = AbsenceStatus.INVALID
        else:
            status = AbsenceStatus.PRESENT
        key = f"{sid}|{tf}"
        new_marks[key] = AbsenceMark(
            student_id=sid, test_form=tf,
            status=status,
            reason=str(row.get("缺考原因", row.get("reason", ""))).strip(),
        )
    existing = {f"{m.student_id}|{m.test_form}": m for mlist in session.absence_marks.values() for m in mlist}
    merged = _resolve_import(existing, new_marks, "student_id|test_form", strategy, "缺考标记", warnings)
    result: Dict[str, List[AbsenceMark]] = {}
    for m in merged.values():
        result.setdefault(m.test_form, []).append(m)
    session.absence_marks = result
    session.source_files[str(path)] = DataSource.ABSENCE_MARK.value
    return session


def load_conversion_report(
    path: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    sheet_name: Optional[str] = None, warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    rows = _read_file(path, sheet_name)
    for row in rows:
        sid = str(row.get("学生ID", row.get("student_id", ""))).strip()
        tf = str(row.get("试卷版本", row.get("test_form", ""))).strip()
        if not sid or not tf:
            continue
        key = f"{sid}|{tf}"
        if key in {f"{s.student_id}|{s.test_form}": s for tl in session.student_scores.values() for s in tl}:
            scores = session.student_scores.get(tf, [])
            for s in scores:
                if s.student_id == sid:
                    equated = row.get("等值分", row.get("equated_score"))
                    if equated is not None:
                        s.equated_score = float(equated)
    session.source_files[str(path)] = DataSource.CONVERSION_REPORT.value
    return session


def auto_load(
    directory: str, session: Session, strategy: ImportStrategy = ImportStrategy.IGNORE,
    warnings: Optional[WarningCollector] = None,
) -> Session:
    warnings = warnings or WarningCollector()
    p = Path(directory)
    if not p.exists():
        warnings.add(
            WarningCategory.OUTLIER, WarningLevel.CRITICAL,
            f"目录不存在: {directory}",
        )
        return session

    patterns = {
        "student_score": ["学生成绩", "student_score", "scores", "成绩"],
        "test_form": ["试卷版本", "test_form", "forms", "试卷"],
        "anchor_item": ["锚题", "anchor_item", "anchors"],
        "difficulty_param": ["难度参数", "difficulty_param", "params"],
        "absence_mark": ["缺考", "absence_mark", "absent"],
        "conversion_report": ["换算报告", "conversion_report", "report"],
    }
    loaders = {
        "student_score": load_student_scores,
        "test_form": load_test_forms,
        "anchor_item": load_anchor_items,
        "difficulty_param": load_difficulty_params,
        "absence_mark": load_absence_marks,
        "conversion_report": load_conversion_report,
    }
    for file_path in sorted(p.iterdir()):
        if file_path.suffix.lower() not in (".csv", ".xlsx", ".xls"):
            continue
        name = file_path.stem
        for key, patterns_list in patterns.items():
            if any(pat.lower() in name.lower() for pat in patterns_list):
                loaders[key](str(file_path), session, strategy, warnings=warnings)
                break
    return session