"""标注记录处理。

人工备注原话保留：加载、展示、导出全链路不重写、不归一化标点、不"改整齐"。
平台工程师打开就能处理标注记录。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from graycity.models import Annotation, TrainingSample
from graycity.store import DataStore


@dataclass
class AnnotationView:
    sample: TrainingSample
    annotation: Annotation  # note 原话


def list_notes(store: DataStore) -> list[AnnotationView]:
    views: list[AnnotationView] = []
    for ann in store.annotations:
        sample = store.sample_by_id(ann.sample_id)
        if sample is not None:
            views.append(AnnotationView(sample=sample, annotation=ann))
    return views


def show(store: DataStore, sample_id: str) -> Optional[str]:
    ann = store.annotation_for(sample_id)
    sample = store.sample_by_id(sample_id)
    if ann is None or sample is None:
        return None
    # 原话展示，不做改写
    return (
        f"{sample_id}({sample.city}, {sample.group}, {sample.prompt_version})\n"
        f'  原话备注："{ann.note}"\n'
        f"  作者：{ann.author}  时间：{ann.ts}"
    )
