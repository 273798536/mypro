from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from prompt_impact import errors as E
from prompt_impact.ids import fingerprint_bytes, material_key
from prompt_impact.models import (
    ANNOTATION,
    EVAL_RUN,
    MODEL_LOG,
    PROMPT,
    Annotation,
    EvalResult,
    EvalRun,
    Material,
    ModelLogEntry,
    PromptVersion,
    SourceRef,
)

PROMPTS_DIR = "prompts"
MODEL_LOGS_DIR = "model_logs"
ANNOTATIONS_DIR = "annotations"
RUNS_DIR = "runs"


@dataclass
class ParsedInputs:
    prompts: List[PromptVersion] = field(default_factory=list)
    model_logs: List[ModelLogEntry] = field(default_factory=list)
    annotations: List[Annotation] = field(default_factory=list)
    eval_runs: List[EvalRun] = field(default_factory=list)
    materials: List[Material] = field(default_factory=list)
    errors: List[E.ActionableError] = field(default_factory=list)

    def referenced_prompt_versions(self):
        versions = {p.id for p in self.prompts}
        for m in self.model_logs:
            versions.add(m.prompt_version)
        for er in self.eval_runs:
            versions.add(er.prompt_version)
        return versions


def _read_bytes(path: Path) -> bytes:
    with open(path, "rb") as fh:
        return fh.read()


def _read_text(path: Path) -> str:
    return _read_bytes(path).decode("utf-8", errors="replace")


def _register_material(kind: str, path: Path, rel: str, now: str) -> Material:
    fp = fingerprint_bytes(_read_bytes(path))
    return Material(
        kind=kind,
        source_path=rel,
        material_key=material_key(kind, rel),
        fingerprint=fp,
        ingested_at=now,
        versions=[fp],
        summary={},
    )


def _iter_jsonl(path: Path, rel: str):
    text = _read_text(path)
    for idx, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            obj = json.loads(stripped)
        except json.JSONDecodeError as exc:
            yield idx, None, exc
            continue
        yield idx, obj, None


def parse_prompts(root: Path, now: str, inputs: ParsedInputs) -> None:
    base = root / PROMPTS_DIR
    if not base.exists():
        return
    for path in sorted(base.rglob("*.json")):
        rel = path.relative_to(root).as_posix()
        try:
            obj = json.loads(_read_text(path))
        except json.JSONDecodeError as exc:
            inputs.errors.append(E.unparseable_record(rel, 1, "", f"JSON 解析失败: {exc}"))
            inputs.materials.append(_register_material(PROMPT, path, rel, now))
            continue
        if not isinstance(obj, dict) or "prompt_id" not in obj or "version" not in obj:
            inputs.errors.append(
                E.ActionableError(
                    code=E.UNPARSEABLE_RECORD,
                    message=f"Prompt 定义缺少 prompt_id/version: {rel}",
                    detail={"loc": rel},
                )
            )
            inputs.materials.append(_register_material(PROMPT, path, rel, now))
            continue
        src = SourceRef(path=rel, line_start=1, material_key=material_key(PROMPT, rel))
        pv = PromptVersion(
            prompt_id=obj.get("prompt_id", ""),
            version=str(obj.get("version", "")),
            parent_version=obj.get("parent_version"),
            changed_fields=list(obj.get("changed_fields", [])),
            system=obj.get("system", ""),
            template=obj.get("template", ""),
            created_at=obj.get("created_at", ""),
            source=src,
        )
        inputs.prompts.append(pv)
        inputs.materials.append(_register_material(PROMPT, path, rel, now))


def parse_model_logs(root: Path, now: str, inputs: ParsedInputs) -> None:
    base = root / MODEL_LOGS_DIR
    if not base.exists():
        return
    for path in sorted(base.glob("*.jsonl")):
        rel = path.relative_to(root).as_posix()
        inputs.materials.append(_register_material(MODEL_LOG, path, rel, now))
        for idx, obj, exc in _iter_jsonl(path, rel):
            if exc is not None:
                inputs.errors.append(E.unparseable_record(rel, idx, "", f"JSON 行解析失败: {exc}"))
                continue
            if not isinstance(obj, dict) or "sample_id" not in obj:
                inputs.errors.append(E.unparseable_record(rel, idx, json.dumps(obj)[:200], "缺少 sample_id"))
                continue
            src = SourceRef(path=rel, line_start=idx, line_end=idx, material_key=material_key(MODEL_LOG, rel))
            entry = ModelLogEntry(
                run_id=obj.get("run_id", path.stem),
                prompt_version=obj.get("prompt_version", ""),
                sample_id=str(obj.get("sample_id", "")),
                split=obj.get("split", ""),
                score=obj.get("score"),
                ts=obj.get("ts", ""),
                source=src,
            )
            inputs.model_logs.append(entry)


def _parse_annotations_jsonl(path: Path, rel: str, inputs: ParsedInputs) -> None:
    for idx, obj, exc in _iter_jsonl(path, rel):
        if exc is not None:
            inputs.errors.append(E.unparseable_record(rel, idx, "", f"JSON 行解析失败: {exc}"))
            continue
        if not isinstance(obj, dict) or "sample_id" not in obj:
            inputs.errors.append(E.unparseable_record(rel, idx, json.dumps(obj)[:200], "缺少 sample_id"))
            continue
        src = SourceRef(path=rel, line_start=idx, line_end=idx, material_key=material_key(ANNOTATION, rel))
        ann = Annotation(
            annotation_id=obj.get("annotation_id", f"{path.stem}:{idx}"),
            sample_id=str(obj.get("sample_id", "")),
            split=obj.get("split", ""),
            label=obj.get("label", ""),
            batch=obj.get("batch", path.stem),
            annotator=obj.get("annotator", ""),
            source=src,
        )
        inputs.annotations.append(ann)


def _parse_annotations_csv(path: Path, rel: str, inputs: ParsedInputs) -> None:
    text = _read_text(path)
    reader = csv.DictReader(io.StringIO(text))
    for idx, row in enumerate(reader, start=2):
        sid = row.get("sample_id") or row.get("id")
        if not sid:
            inputs.errors.append(E.unparseable_record(rel, idx, json.dumps(row)[:200], "缺少 sample_id"))
            continue
        src = SourceRef(path=rel, line_start=idx, line_end=idx, material_key=material_key(ANNOTATION, rel))
        ann = Annotation(
            annotation_id=row.get("annotation_id", f"{path.stem}:{idx}"),
            sample_id=str(sid),
            split=row.get("split", ""),
            label=row.get("label", ""),
            batch=row.get("batch", path.stem),
            annotator=row.get("annotator", ""),
            source=src,
        )
        inputs.annotations.append(ann)


def parse_annotations(root: Path, now: str, inputs: ParsedInputs) -> None:
    base = root / ANNOTATIONS_DIR
    if not base.exists():
        return
    for path in sorted(base.iterdir()):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        inputs.materials.append(_register_material(ANNOTATION, path, rel, now))
        if path.suffix.lower() == ".jsonl":
            _parse_annotations_jsonl(path, rel, inputs)
        elif path.suffix.lower() == ".csv":
            _parse_annotations_csv(path, rel, inputs)
        elif path.suffix.lower() in (".json",):
            try:
                obj = json.loads(_read_text(path))
            except json.JSONDecodeError as exc:
                inputs.errors.append(E.unparseable_record(rel, 1, "", f"JSON 解析失败: {exc}"))
                continue
            records = obj if isinstance(obj, list) else [obj]
            for r in records:
                if not isinstance(r, dict) or "sample_id" not in r:
                    continue
                src = SourceRef(path=rel, material_key=material_key(ANNOTATION, rel))
                inputs.annotations.append(
                    Annotation(
                        annotation_id=r.get("annotation_id", f"{path.stem}"),
                        sample_id=str(r.get("sample_id", "")),
                        split=r.get("split", ""),
                        label=r.get("label", ""),
                        batch=r.get("batch", path.stem),
                        annotator=r.get("annotator", ""),
                        source=src,
                    )
                )


def parse_eval_runs(root: Path, now: str, inputs: ParsedInputs) -> None:
    base = root / RUNS_DIR
    if not base.exists():
        return
    for run_dir in sorted(p for p in base.iterdir() if p.is_dir()):
        rel_meta = run_dir.relative_to(root).as_posix() + "/meta.json"
        meta_path = run_dir / "meta.json"
        results_path = run_dir / "results.jsonl"
        if not meta_path.exists():
            inputs.errors.append(E.missing_eval_run(run_dir.name))
            continue
        if not results_path.exists():
            inputs.errors.append(E.missing_eval_run(run_dir.name))
            continue
        try:
            meta = json.loads(_read_text(meta_path))
        except json.JSONDecodeError as exc:
            inputs.errors.append(E.unparseable_record(rel_meta, 1, "", f"meta.json 解析失败: {exc}"))
            continue
        inputs.materials.append(_register_material(EVAL_RUN, meta_path, rel_meta, now))
        results: List[EvalResult] = []
        rel_res = run_dir.relative_to(root).as_posix() + "/results.jsonl"
        for idx, obj, exc in _iter_jsonl(results_path, rel_res):
            if exc is not None:
                inputs.errors.append(E.unparseable_record(rel_res, idx, "", f"JSON 行解析失败: {exc}"))
                continue
            if not isinstance(obj, dict) or "sample_id" not in obj:
                inputs.errors.append(E.unparseable_record(rel_res, idx, json.dumps(obj)[:200], "缺少 sample_id"))
                continue
            src = SourceRef(path=rel_res, line_start=idx, line_end=idx, material_key=material_key(EVAL_RUN, rel_res))
            results.append(
                EvalResult(
                    sample_id=str(obj.get("sample_id", "")),
                    score=obj.get("score"),
                    label=obj.get("label", ""),
                    expected=obj.get("expected", ""),
                    got=obj.get("got", ""),
                    source=src,
                )
            )
        eval_run = EvalRun(
            eval_run_id=meta.get("eval_run_id", run_dir.name),
            prompt_version=meta.get("prompt_version", ""),
            dataset=meta.get("dataset", ""),
            started_at=meta.get("started_at", ""),
            train_run_id=meta.get("train_run_id", ""),
            results=results,
            source=SourceRef(path=rel_meta, line_start=1, material_key=material_key(EVAL_RUN, rel_meta)),
        )
        inputs.eval_runs.append(eval_run)


def parse_inputs(root: Path, now: str) -> ParsedInputs:
    inputs = ParsedInputs()
    parse_prompts(root, now, inputs)
    parse_model_logs(root, now, inputs)
    parse_annotations(root, now, inputs)
    parse_eval_runs(root, now, inputs)
    _cross_check(inputs)
    return inputs


def _cross_check(inputs: ParsedInputs) -> None:
    defined = {p.id for p in inputs.prompts}
    referenced = set()
    for m in inputs.model_logs:
        if m.prompt_version:
            referenced.add(m.prompt_version)
    for er in inputs.eval_runs:
        if er.prompt_version:
            referenced.add(er.prompt_version)
    for pv in referenced:
        if pv and pv not in defined:
            inputs.errors.append(E.missing_prompt_definition(pv))

    seen = {}
    for ann in inputs.annotations:
        key = (ann.split, ann.sample_id)
        if key in seen and ann.split:
            inputs.errors.append(E.duplicate_sample_id(ann.sample_id, ann.split or "?", ann.source.path if ann.source else "?"))
        else:
            seen[key] = ann

    for ann in inputs.annotations:
        if not ann.split and ann.sample_id:
            inputs.errors.append(E.split_ambiguous(ann.sample_id, ann.source.path if ann.source else "?"))

    log_runs = {m.run_id for m in inputs.model_logs}
    for er in inputs.eval_runs:
        if er.train_run_id and er.train_run_id not in log_runs:
            expected = f"model_logs/{er.train_run_id}.jsonl"
            inputs.errors.append(E.missing_model_log(er.train_run_id, expected))
