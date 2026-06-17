"""数据加载器。

把同一轮复核需要的三类材料——训练样本、提示词版本、版本回滚丢记录——
以及人工备注和模型日志一起装载，平台工程师不用先手工整理半天。
人工备注 note 字段原样读入，全程不改写。
"""

from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Iterable, Optional

from graycity.models import (
    Annotation,
    ModelLog,
    PromptVersion,
    RollbackLoss,
    TrainingSample,
)

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
MAX_LEN = 100  # 与提示词版本中 max_len 保持一致；超长即截断


class DataStore:
    """一次加载眼前这批具体材料的内存存储。"""

    def __init__(self, samples_dir: Path = SAMPLES_DIR) -> None:
        self.samples_dir = samples_dir
        self.samples: list[TrainingSample] = self._load_samples()
        self.prompt_versions: list[PromptVersion] = self._load_json(
            "prompt_versions.json", PromptVersion
        )
        self.rollback_losses: list[RollbackLoss] = self._load_json(
            "rollback_losses.json", RollbackLoss
        )
        self.annotations: list[Annotation] = self._load_json(
            "annotations.json", Annotation
        )

    # ---- public helpers -------------------------------------------------

    def sample_by_id(self, sample_id: str) -> Optional[TrainingSample]:
        return next((s for s in self.samples if s.id == sample_id), None)

    def annotation_for(self, sample_id: str) -> Optional[Annotation]:
        """人工备注原话返回，不做任何归一化。"""
        return next((a for a in self.annotations if a.sample_id == sample_id), None)

    def active_prompt(self) -> PromptVersion:
        return next(p for p in self.prompt_versions if p.status == "active")

    # ---- model logs (jsonl, 可被补录覆盖) --------------------------------

    def load_model_logs(
        self, supplement_path: Optional[Path] = None
    ) -> list[ModelLog]:
        """读取模型日志；若传入补录文件，按 sample_id 覆盖，并标记 backfilled。

        模型日志补录后，评测回放与灰度对比会跟着用最新日志重算。
        """
        logs: dict[str, ModelLog] = {}
        for log in self._read_jsonl("model_logs.jsonl", ModelLog):
            logs[log.sample_id] = log
        # 仅在显式指定补录文件时合并：补录前保持"待补录"状态，
        # 补录后(--supplement)评测回放与灰度对比才会跟着更新。
        if supplement_path and Path(supplement_path).exists():
            for log in _read_jsonl_path(Path(supplement_path), ModelLog):
                # 补录覆盖：complete 必须为 True，并标记 backfilled
                merged = ModelLog(
                    sample_id=log.sample_id,
                    city=log.city,
                    version=log.version,
                    prediction=log.prediction,
                    score=log.score,
                    truncated=log.truncated,
                    complete=True,
                    backfilled=True,
                )
                logs[log.sample_id] = merged
        return list(logs.values())

    # ---- internal loaders ----------------------------------------------

    def _load_samples(self) -> list[TrainingSample]:
        import json as _json

        path = self.samples_dir / "training_samples.json"
        with path.open(encoding="utf-8") as f:
            rows = _json.load(f)
        samples: list[TrainingSample] = []
        # length / truncated 以实际文本长度为准，避免样例里手填的值漂移
        for r in rows:
            text = r["text"]
            length = len(text)
            samples.append(
                TrainingSample(
                    id=r["id"],
                    city=r["city"],
                    text=text,
                    label=r["label"],
                    prompt_version=r["prompt_version"],
                    length=length,
                    truncated=length > MAX_LEN,
                    group=r.get("group", "control"),
                )
            )
        return samples

    def _load_json(self, name: str, cls) -> list:
        path = self.samples_dir / name
        with path.open(encoding="utf-8") as f:
            rows = json.load(f)
        return [_to_obj(r, cls) for r in rows]

    def _read_jsonl(self, name: str, cls) -> list:
        return _read_jsonl_path(self.samples_dir / name, cls)


def _to_obj(row: dict, cls):
    """从 dict 构造 dataclass，忽略多余字段，缺失字段用默认值。"""
    import dataclasses as dc

    fields = {f.name for f in dc.fields(cls)}
    filtered = {k: v for k, v in row.items() if k in fields}
    return cls(**filtered)


def _read_jsonl_path(path: Path, cls) -> list:
    items = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            items.append(_to_obj(json.loads(line), cls))
    return items


def dump_json(obj, indent: int = 2) -> str:
    """dataclass 友好的 JSON 序列化。"""

    def default(o):
        if is_dataclass(o):
            return asdict(o)
        raise TypeError(f"not serializable: {type(o)}")

    return json.dumps(obj, ensure_ascii=False, indent=indent, default=default)
