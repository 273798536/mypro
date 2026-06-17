from __future__ import annotations

import json
from pathlib import Path

PROMPT_V1 = {
    "prompt_id": "math_solver",
    "version": "v1",
    "system": "你是一个数学解题助手，逐步推理后给出最终答案。",
    "template": "题目: {question}\n请逐步推理并给出最终答案。",
    "created_at": "2026-04-01T00:00:00Z",
}

PROMPT_V2 = {
    "prompt_id": "math_solver",
    "version": "v2",
    "parent_version": "math_solver@v1",
    "changed_fields": ["template"],
    "system": "你是一个数学解题助手，逐步推理后给出最终答案。",
    "template": "问题: {question}\n直接给出最终答案，不要展示推理过程。",
    "created_at": "2026-05-01T00:00:00Z",
}

MODEL_LOG_LINES = [
    {"run_id": "run_42", "prompt_version": "math_solver@v2", "sample_id": "s_100", "split": "train", "score": 1.0, "ts": "2026-05-02T10:00:00Z"},
    {"run_id": "run_42", "prompt_version": "math_solver@v2", "sample_id": "s_101", "split": "train", "score": 0.9, "ts": "2026-05-02T10:00:00Z"},
]

ANNOT_BATCH_1 = [
    {"annotation_id": "ann_001", "sample_id": "s_100", "split": "train", "label": "correct", "batch": "batch_001", "annotator": "alice"},
    {"annotation_id": "ann_002", "sample_id": "s_101", "split": "train", "label": "correct", "batch": "batch_001", "annotator": "alice"},
    {"annotation_id": "ann_003", "sample_id": "s_300", "split": "val", "label": "correct", "batch": "batch_001", "annotator": "bob"},
]

ANNOT_BATCH_2 = [
    {"annotation_id": "ann_101", "sample_id": "s_200", "split": "train", "label": "correct", "batch": "batch_002", "annotator": "carol"},
]

EVAL_V1_META = {
    "eval_run_id": "eval_2026_04",
    "prompt_version": "math_solver@v1",
    "dataset": "val_set",
    "started_at": "2026-04-15T00:00:00Z",
    "train_run_id": "run_11",
}
EVAL_V1_RESULTS = [
    {"sample_id": "s_300", "score": 1.0, "label": "correct", "expected": "42", "got": "42"},
    {"sample_id": "s_301", "score": 1.0, "label": "correct", "expected": "7", "got": "7"},
]

EVAL_V2_META = {
    "eval_run_id": "eval_2026_05",
    "prompt_version": "math_solver@v2",
    "dataset": "val_set",
    "started_at": "2026-05-15T00:00:00Z",
    "train_run_id": "run_42",
}
EVAL_V2_RESULTS = [
    {"sample_id": "s_100", "score": 1.0, "label": "correct", "expected": "42", "got": "42"},
    {"sample_id": "s_101", "score": 1.0, "label": "correct", "expected": "3", "got": "3"},
    {"sample_id": "s_300", "score": 0.0, "label": "wrong", "expected": "42", "got": "4 2"},
    {"sample_id": "s_400", "score": None, "label": "", "expected": "9", "got": ""},
]


def _write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_jsonl(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")


def write_sample(output_dir: Path) -> Path:
    root = output_dir / "sample_materials"
    _write_json(root / "prompts/math_solver/v1.json", PROMPT_V1)
    _write_json(root / "prompts/math_solver/v2.json", PROMPT_V2)
    _write_jsonl(root / "model_logs/run_42.jsonl", MODEL_LOG_LINES)
    _write_jsonl(root / "annotations/batch_001.jsonl", ANNOT_BATCH_1)
    _write_jsonl(root / "annotations/batch_002.jsonl", ANNOT_BATCH_2)
    _write_json(root / "runs/eval_2026_04/meta.json", EVAL_V1_META)
    _write_jsonl(root / "runs/eval_2026_04/results.jsonl", EVAL_V1_RESULTS)
    _write_json(root / "runs/eval_2026_05/meta.json", EVAL_V2_META)
    _write_jsonl(root / "runs/eval_2026_05/results.jsonl", EVAL_V2_RESULTS)
    return root
