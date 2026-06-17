from __future__ import annotations

import json
from pathlib import Path
from mc_verify.models import QuestionItem, ProcessStatus
from mc_verify.field_mapper import map_record
from mc_verify.unit_checker import check_unit


def load_questions_from_file(
    filepath: str | Path,
    extra_aliases: dict | None = None,
) -> list[QuestionItem]:
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"题目清单文件不存在: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        raw = json.load(f)

    if not isinstance(raw, list):
        raw = [raw]

    items = []
    for record in raw:
        mapped = map_record(record, extra_aliases)

        item = QuestionItem(
            question_id=str(mapped.get("question_id", "")),
            formula=str(mapped.get("formula", "")),
            expected_value=_to_float(mapped.get("expected_value")),
            unit=mapped.get("unit"),
            source_description=str(mapped.get("source_description", "")),
            source_fields=mapped.get("source_fields", {}),
            process_status=ProcessStatus.PENDING,
        )

        if not item.question_id:
            import uuid
            item.question_id = uuid.uuid4().hex[:8]

        item.unit_trace = check_unit(item)
        items.append(item)

    return items


def add_boundary_sample(
    items: list[QuestionItem],
    formula: str,
    expected_value: float | None = None,
    unit: str | None = None,
    source_description: str = "",
    extra_source_fields: dict | None = None,
) -> QuestionItem:
    import uuid
    boundary = QuestionItem(
        question_id=f"boundary_{uuid.uuid4().hex[:6]}",
        formula=formula,
        expected_value=expected_value,
        unit=unit,
        source_description=source_description or "(边界样本)",
        source_fields=extra_source_fields or {},
        process_status=ProcessStatus.PENDING,
    )
    boundary.unit_trace = check_unit(boundary)
    items.append(boundary)
    return boundary


def _to_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None
