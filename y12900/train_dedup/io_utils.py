"""数据 IO 模块：读写 CSV / JSONL / Parquet，保留原始行号和来源信息"""

from __future__ import annotations

import csv
import json
import os
import uuid
from pathlib import Path
from typing import Iterable, Optional

from .models import Sample, SourceRef, SplitType


def _make_sample_id() -> str:
    return f"s-{uuid.uuid4().hex[:10]}"


def _parse_split(value: str) -> SplitType:
    v = (value or "").strip().lower()
    mapping = {
        "train": SplitType.TRAIN,
        "training": SplitType.TRAIN,
        "训练": SplitType.TRAIN,
        "val": SplitType.VAL,
        "valid": SplitType.VAL,
        "validation": SplitType.VAL,
        "验证": SplitType.VAL,
        "eval": SplitType.VAL,
        "test": SplitType.TEST,
        "测试": SplitType.TEST,
    }
    return mapping.get(v, SplitType.TRAIN)


def _read_csv(path: Path, source_file_override: Optional[str] = None) -> list[Sample]:
    source_file = source_file_override or str(path)
    samples: list[Sample] = []

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []

        content_col = None
        for cand in ("content", "text", "question", "prompt", "input", "sentence", "query"):
            if cand in fieldnames:
                content_col = cand
                break
        if not content_col and len(fieldnames) >= 1:
            content_col = fieldnames[0]

        label_col = next((c for c in ("label", "target", "answer", "output") if c in fieldnames), None)
        split_col = next((c for c in ("split", "dataset", "set", "partition") if c in fieldnames), None)
        id_col = next((c for c in ("id", "sample_id", "uuid") if c in fieldnames), None)
        image_col = next((c for c in ("image", "image_name", "img", "image_path") if c in fieldnames), None)
        remark_col = next((c for c in ("remark", "note", "comment", "备注", "来源") if c in fieldnames), None)

        for line_idx, row in enumerate(reader, start=2):
            content = (row.get(content_col) or "").strip()
            sid = (row.get(id_col) or "").strip() or _make_sample_id()

            src = SourceRef(
                source_file=source_file,
                line_number=line_idx,
                image_name=(row.get(image_col) or None) if image_col else None,
                remark=(row.get(remark_col) or None) if remark_col else None,
            )

            samples.append(
                Sample(
                    sample_id=sid,
                    content=content,
                    split=_parse_split(row.get(split_col, "")) if split_col else SplitType.TRAIN,
                    label=(row.get(label_col) or None) if label_col else None,
                    source_ref=src,
                    metadata={"original_row": line_idx, "source_file": source_file},
                )
            )
    return samples


def _read_jsonl(path: Path, source_file_override: Optional[str] = None) -> list[Sample]:
    source_file = source_file_override or str(path)
    samples: list[Sample] = []

    with path.open("r", encoding="utf-8") as f:
        for line_idx, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            content = (
                obj.get("content")
                or obj.get("text")
                or obj.get("question")
                or obj.get("prompt")
                or obj.get("input")
                or ""
            )
            content = str(content).strip()
            if not content:
                continue

            sid = str(obj.get("id") or obj.get("sample_id") or _make_sample_id())
            split_val = str(obj.get("split") or obj.get("dataset") or "")
            label = obj.get("label") or obj.get("answer") or obj.get("target")
            image_name = obj.get("image") or obj.get("image_name")
            remark = obj.get("remark") or obj.get("note") or obj.get("source_remark")

            src = SourceRef(
                source_file=source_file,
                line_number=line_idx,
                image_name=str(image_name) if image_name else None,
                remark=str(remark) if remark else None,
            )

            md = {k: v for k, v in obj.items() if k not in ("content", "text", "question", "prompt",
                                                              "input", "id", "sample_id", "split",
                                                              "dataset", "label", "answer", "target",
                                                              "image", "image_name", "remark", "note",
                                                              "source_remark")}
            md["original_row"] = line_idx
            md["source_file"] = source_file

            samples.append(
                Sample(
                    sample_id=sid,
                    content=content,
                    split=_parse_split(split_val),
                    label=str(label) if label else None,
                    source_ref=src,
                    metadata=md,
                )
            )
    return samples


def load_samples(paths: Iterable[str | os.PathLike]) -> list[Sample]:
    """从多个文件加载样本，自动识别格式"""
    samples: list[Sample] = []
    for p in paths:
        path = Path(p)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {path}")
        suffix = path.suffix.lower()
        if suffix == ".csv":
            samples.extend(_read_csv(path))
        elif suffix in (".jsonl", ".ndjson", ".json"):
            if suffix == ".json":
                text = path.read_text(encoding="utf-8").strip()
                if text.startswith("["):
                    obj = json.loads(text)
                    tmp_path = path.with_suffix(".jsonl.tmp")
                    with tmp_path.open("w", encoding="utf-8") as f:
                        for item in obj:
                            f.write(json.dumps(item, ensure_ascii=False) + "\n")
                    samples.extend(_read_jsonl(tmp_path, source_file_override=str(path)))
                    tmp_path.unlink(missing_ok=True)
                else:
                    samples.extend(_read_jsonl(path))
            else:
                samples.extend(_read_jsonl(path))
        elif suffix in (".tsv", ".txt"):
            samples.extend(_read_csv(path))
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")
    return samples


def write_samples_csv(samples: list[Sample], path: str | os.PathLike) -> None:
    """写出结果 CSV（保留来源列）"""
    fieldnames = [
        "sample_id",
        "split",
        "content",
        "label",
        "status",
        "source_file",
        "line_number",
        "image_name",
        "remark",
        "content_hash",
        "reason",
    ]

    from .safety import classify_sample

    with Path(path).open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for s in samples:
            status = classify_sample(s).value
            reason = (
                s.metadata.get("bad_reason")
                or s.metadata.get("needs_review_reason")
                or s.metadata.get("removed_by")
                or s.metadata.get("leakage_reason")
                or ""
            )
            writer.writerow(
                {
                    "sample_id": s.sample_id,
                    "split": s.split.value,
                    "content": s.content,
                    "label": s.label or "",
                    "status": status,
                    "source_file": s.source_ref.source_file if s.source_ref else "",
                    "line_number": s.source_ref.line_number if (s.source_ref and s.source_ref.line_number) else "",
                    "image_name": s.source_ref.image_name if (s.source_ref and s.source_ref.image_name) else "",
                    "remark": s.source_ref.remark if (s.source_ref and s.source_ref.remark) else "",
                    "content_hash": s.content_hash(),
                    "reason": reason,
                }
            )


def write_samples_jsonl(samples: list[Sample], path: str | os.PathLike) -> None:
    from .safety import classify_sample

    with Path(path).open("w", encoding="utf-8") as f:
        for s in samples:
            status = classify_sample(s).value
            reason = (
                s.metadata.get("bad_reason")
                or s.metadata.get("needs_review_reason")
                or s.metadata.get("removed_by")
                or s.metadata.get("leakage_reason")
                or ""
            )
            obj = {
                "sample_id": s.sample_id,
                "split": s.split.value,
                "content": s.content,
                "label": s.label,
                "status": status,
                "source_ref": s.source_ref.to_dict() if s.source_ref else None,
                "content_hash": s.content_hash(),
                "reason": reason,
                "metadata": s.metadata,
            }
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def write_report(lines: list[str], path: str | os.PathLike) -> None:
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")
