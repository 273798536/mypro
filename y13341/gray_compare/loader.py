import os
import json
import csv
from typing import List, Dict, Optional
from .models import SampleRecord, ModelResult, LateAttachment


def load_sample_table(sample_dir: str) -> List[SampleRecord]:
    samples = []
    if not os.path.isdir(sample_dir):
        return samples

    for fname in os.listdir(sample_dir):
        fpath = os.path.join(sample_dir, fname)
        if fname.endswith(".csv"):
            samples.extend(_load_csv_samples(fpath, fname))
        elif fname.endswith(".json"):
            samples.extend(_load_json_samples(fpath, fname))
    return samples


def _load_csv_samples(fpath: str, source_table: str) -> List[SampleRecord]:
    samples = []
    with open(fpath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            sample_id = row.get("sample_id") or row.get("id") or f"{source_table}_row{i}"
            label = row.get("label") or row.get("原始标签") or ""
            text = row.get("text") or row.get("原始文本") or row.get("原始说法") or ""
            extra = {k: v for k, v in row.items() if k not in {"sample_id", "id", "label", "原始标签", "text", "原始文本", "原始说法"}}
            samples.append(SampleRecord(
                sample_id=sample_id.strip(),
                original_label=label.strip(),
                original_text=text.strip(),
                source_table=source_table,
                row_index=i,
                extra=extra,
            ))
    return samples


def _load_json_samples(fpath: str, source_table: str) -> List[SampleRecord]:
    samples = []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("samples", [])
    for i, item in enumerate(items, start=1):
        sample_id = item.get("sample_id") or item.get("id") or f"{source_table}_row{i}"
        samples.append(SampleRecord(
            sample_id=sample_id,
            original_label=item.get("label", item.get("原始标签", "")),
            original_text=item.get("text", item.get("原始文本", item.get("原始说法", ""))),
            source_table=source_table,
            row_index=i,
            extra={k: v for k, v in item.items() if k not in {"sample_id", "id", "label", "原始标签", "text", "原始文本", "原始说法"}},
        ))
    return samples


def load_model_results(result_dir: str, version: str = "") -> List[ModelResult]:
    results = []
    if not os.path.isdir(result_dir):
        return results

    for fname in os.listdir(result_dir):
        fpath = os.path.join(result_dir, fname)
        if fname.endswith(".json"):
            results.extend(_load_json_results(fpath, version or fname))
        elif fname.endswith(".csv"):
            results.extend(_load_csv_results(fpath, version or fname))
    return results


def _load_json_results(fpath: str, default_version: str) -> List[ModelResult]:
    results = []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("results", data.get("items", []))
    for item in items:
        results.append(ModelResult(
            sample_id=item.get("sample_id", item.get("id", "")),
            conclusion=item.get("conclusion", item.get("结论", "")),
            confidence=float(item.get("confidence", item.get("置信度", 0))),
            reason=item.get("reason", item.get("理由", item.get("原因", ""))),
            model_version=item.get("model_version", item.get("版本", default_version)),
            generated_at=item.get("generated_at", item.get("生成时间", "")),
            tags=item.get("tags", item.get("标签", [])),
        ))
    return results


def _load_csv_results(fpath: str, default_version: str) -> List[ModelResult]:
    results = []
    with open(fpath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tags_str = row.get("tags", row.get("标签", ""))
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []
            results.append(ModelResult(
                sample_id=row.get("sample_id", row.get("id", "")),
                conclusion=row.get("conclusion", row.get("结论", "")),
                confidence=float(row.get("confidence", row.get("置信度", 0)) or 0),
                reason=row.get("reason", row.get("理由", row.get("原因", ""))),
                model_version=row.get("model_version", row.get("版本", default_version)),
                generated_at=row.get("generated_at", row.get("生成时间", "")),
                tags=tags,
            ))
    return results


def load_late_attachments(attach_dir: str) -> List[LateAttachment]:
    attachments = []
    if not os.path.isdir(attach_dir):
        return attachments

    for fname in sorted(os.listdir(attach_dir)):
        fpath = os.path.join(attach_dir, fname)
        if fname.endswith(".json"):
            attachments.extend(_load_json_attachments(fpath, fname))
        elif fname.endswith(".txt") or fname.endswith(".md"):
            attachments.append(_load_text_attachment(fpath, fname))
    return attachments


def _load_json_attachments(fpath: str, fname: str) -> List[LateAttachment]:
    attachments = []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("attachments", [])
    for item in items:
        attachments.append(LateAttachment(
            attachment_id=item.get("attachment_id", item.get("id", fname)),
            sample_id=item.get("sample_id", ""),
            content=item.get("content", item.get("内容", "")),
            arrived_at=item.get("arrived_at", item.get("到达时间", "")),
            source_path=fpath,
        ))
    return attachments


def _load_text_attachment(fpath: str, fname: str) -> LateAttachment:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    base_name = os.path.splitext(fname)[0]
    sample_id = _extract_sample_id_from_filename(base_name)
    return LateAttachment(
        attachment_id=fname,
        sample_id=sample_id,
        content=content.strip(),
        arrived_at="",
        source_path=fpath,
    )


def _extract_sample_id_from_filename(name: str) -> str:
    parts = name.split("_")
    return parts[0] if parts else name


def build_sample_index(samples: List[SampleRecord]) -> Dict[str, SampleRecord]:
    return {s.sample_id: s for s in samples}


def build_result_index(results: List[ModelResult]) -> Dict[str, ModelResult]:
    return {r.sample_id: r for r in results}
