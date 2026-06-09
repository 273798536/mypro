"""数据加载与持久化 - 支持 JSONL 和 CSV"""

from __future__ import annotations

import csv
import json
import os
from pathlib import Path
from typing import Any, Type, TypeVar, Union

import pandas as pd
from pydantic import BaseModel, ValidationError

from .errors import DataFormatError
from .models import (
    AuditEntry,
    BoundaryCase,
    CaseBundle,
    ScoringRecord,
    SensitivityResult,
    SourceMaterial,
    StudentAnswer,
)

T = TypeVar("T", bound=BaseModel)


def _detect_format(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".jsonl":
        return "jsonl"
    if ext in (".csv", ".tsv"):
        return "csv"
    raise ValueError(f"不支持的文件格式: {ext}，仅支持 .jsonl / .csv / .tsv")


def _parse_dt(value: Any) -> Any:
    if isinstance(value, str) and value:
        try:
            from datetime import datetime
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return value
    return value


def _unwrap_annotation(annotation: Any) -> Any:
    origin = getattr(annotation, "__origin__", None)
    args = getattr(annotation, "__args__", ())

    if origin is Union:
        non_none = [a for a in args if a is not type(None)]
        if len(non_none) == 1:
            return _unwrap_annotation(non_none[0])
        if len(non_none) > 1:
            return _unwrap_annotation(Union[tuple(non_none)])

    if origin is not None:
        if origin is list and args:
            return list, args[0]
        if origin is dict and len(args) >= 2:
            return dict, args[1]
        if origin is dict and args:
            return dict, Any
    return None, annotation


def _is_subclass(typ: Any, cls: type) -> bool:
    try:
        return isinstance(typ, type) and issubclass(typ, cls)
    except TypeError:
        return False


def _coerce_types_for_model(data: dict, model_cls: Type[T]) -> dict:
    coerced: dict[str, Any] = {}
    for field_name, field_info in model_cls.model_fields.items():
        if field_name not in data or data[field_name] is None:
            continue
        raw = data[field_name]
        annotation = field_info.annotation
        origin, inner = _unwrap_annotation(annotation)

        if origin is list and isinstance(raw, str):
            if not raw.strip():
                coerced[field_name] = []
                continue
            if _is_subclass(inner, BaseModel):
                try:
                    parsed = json.loads(raw)
                    coerced[field_name] = [inner.model_validate(x) for x in parsed]
                    continue
                except (json.JSONDecodeError, ValidationError, TypeError):
                    pass
            coerced[field_name] = [x.strip() for x in raw.split("|") if x.strip()]
            continue

        if origin is dict and isinstance(raw, str):
            if not raw.strip():
                coerced[field_name] = {}
                continue
            try:
                coerced[field_name] = json.loads(raw)
            except json.JSONDecodeError:
                coerced[field_name] = {}
            continue

        if _is_subclass(annotation, BaseModel):
            if isinstance(raw, str):
                try:
                    parsed = json.loads(raw)
                    coerced[field_name] = annotation.model_validate(parsed)
                    continue
                except (json.JSONDecodeError, ValidationError, TypeError):
                    pass
            if isinstance(raw, dict):
                coerced[field_name] = annotation.model_validate(raw)
                continue

        if _is_subclass(inner, BaseModel) and isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                coerced[field_name] = inner.model_validate(parsed)
                continue
            except (json.JSONDecodeError, ValidationError, TypeError):
                pass

        if annotation is float and isinstance(raw, str):
            try:
                coerced[field_name] = float(raw)
                continue
            except (ValueError, TypeError):
                pass

        if annotation is int and isinstance(raw, str):
            try:
                coerced[field_name] = int(raw)
                continue
            except (ValueError, TypeError):
                pass

        if annotation is bool and isinstance(raw, str):
            coerced[field_name] = raw.lower() in ("1", "true", "yes", "t", "y")
            continue

        if annotation is str and not isinstance(raw, str):
            coerced[field_name] = str(raw)
            continue

        coerced[field_name] = _parse_dt(raw)

    for k, v in data.items():
        if k not in coerced:
            coerced[k] = v
    return coerced


def load_model_list(file_path: str, model_cls: Type[T]) -> list[T]:
    """从 JSONL 或 CSV 加载模型列表"""
    fmt = _detect_format(file_path)
    results: list[T] = []
    if not os.path.exists(file_path):
        return results

    if fmt == "jsonl":
        with open(file_path, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                    data = _coerce_types_for_model(raw, model_cls)
                    results.append(model_cls.model_validate(data))
                except (json.JSONDecodeError, ValidationError) as e:
                    raise DataFormatError(file_path, line_no, str(e)) from e
    else:
        sep = "\t" if file_path.endswith(".tsv") else ","
        with open(file_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f, delimiter=sep)
            for line_no, row in enumerate(reader, 2):
                try:
                    data = _coerce_types_for_model(row, model_cls)
                    results.append(model_cls.model_validate(data))
                except ValidationError as e:
                    raise DataFormatError(file_path, line_no, str(e)) from e
    return results


def save_model_list(file_path: str, items: list[T]) -> None:
    """保存模型列表到 JSONL 或 CSV"""
    fmt = _detect_format(file_path)
    os.makedirs(os.path.dirname(os.path.abspath(file_path)) or ".", exist_ok=True)

    if fmt == "jsonl":
        with open(file_path, "w", encoding="utf-8") as f:
            for item in items:
                f.write(item.model_dump_json() + "\n")
    else:
        sep = "\t" if file_path.endswith(".tsv") else ","
        if not items:
            return
        rows = []
        for item in items:
            d = item.model_dump(mode="json")
            for k, v in d.items():
                if isinstance(v, list):
                    if v and isinstance(v[0], (dict, list)):
                        d[k] = json.dumps(v, ensure_ascii=False)
                    else:
                        d[k] = "|".join(str(x) for x in v)
                elif isinstance(v, dict):
                    d[k] = json.dumps(v, ensure_ascii=False)
            rows.append(d)
        df = pd.DataFrame(rows)
        df.to_csv(file_path, sep=sep, index=False, encoding="utf-8")


class DataStore:
    """数据仓库 - 管理所有数据文件的读写"""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.cases_path = os.path.join(data_dir, "boundary_cases.jsonl")
        self.scoring_path = os.path.join(data_dir, "scoring_records.jsonl")
        self.sources_path = os.path.join(data_dir, "source_materials.jsonl")
        self.answers_path = os.path.join(data_dir, "student_answers.jsonl")
        self.results_path = os.path.join(data_dir, "sensitivity_results.jsonl")
        self.audit_path = os.path.join(data_dir, "audit_trail.jsonl")
        os.makedirs(data_dir, exist_ok=True)

    def load_cases(self) -> list[BoundaryCase]:
        return load_model_list(self.cases_path, BoundaryCase)

    def save_cases(self, cases: list[BoundaryCase]) -> None:
        save_model_list(self.cases_path, cases)

    def load_scoring(self) -> list[ScoringRecord]:
        return load_model_list(self.scoring_path, ScoringRecord)

    def save_scoring(self, records: list[ScoringRecord]) -> None:
        save_model_list(self.scoring_path, records)

    def load_sources(self) -> list[SourceMaterial]:
        return load_model_list(self.sources_path, SourceMaterial)

    def save_sources(self, materials: list[SourceMaterial]) -> None:
        save_model_list(self.sources_path, materials)

    def load_answers(self) -> list[StudentAnswer]:
        return load_model_list(self.answers_path, StudentAnswer)

    def save_answers(self, answers: list[StudentAnswer]) -> None:
        save_model_list(self.answers_path, answers)

    def load_results(self) -> list[SensitivityResult]:
        return load_model_list(self.results_path, SensitivityResult)

    def save_results(self, results: list[SensitivityResult]) -> None:
        save_model_list(self.results_path, results)

    def load_audit(self) -> list[AuditEntry]:
        return load_model_list(self.audit_path, AuditEntry)

    def save_audit(self, entries: list[AuditEntry]) -> None:
        save_model_list(self.audit_path, entries)

    def build_bundles(self) -> dict[str, CaseBundle]:
        cases = self.load_cases()
        scores = self.load_scoring()
        sources = self.load_sources()
        answers = self.load_answers()
        results = self.load_results()
        audits = self.load_audit()

        scores_by_case: dict[str, list[ScoringRecord]] = {}
        for s in scores:
            scores_by_case.setdefault(s.case_id, []).append(s)
        sources_by_case: dict[str, list[SourceMaterial]] = {}
        for s in sources:
            sources_by_case.setdefault(s.case_id, []).append(s)
        answers_by_case: dict[str, list[StudentAnswer]] = {}
        for a in answers:
            answers_by_case.setdefault(a.case_id, []).append(a)
        results_by_case: dict[str, SensitivityResult] = {r.case_id: r for r in results}
        audits_by_case: dict[str, list[AuditEntry]] = {}
        for a in audits:
            audits_by_case.setdefault(a.case_id, []).append(a)

        bundles: dict[str, CaseBundle] = {}
        for case in cases:
            bundles[case.case_id] = CaseBundle(
                case=case,
                scoring_records=scores_by_case.get(case.case_id, []),
                source_materials=sources_by_case.get(case.case_id, []),
                student_answers=answers_by_case.get(case.case_id, []),
                sensitivity_result=results_by_case.get(case.case_id),
                audit_trail=audits_by_case.get(case.case_id, []),
            )
        return bundles
