"""异常分类。

不把异常塞进一个红色数字：每条异常给出 category 与明确的 next_step，
平台工程师能立刻判断下一步是「补材料」还是「改口径」。
人工备注参与分类判定，但备注原话在报告里单独保留、不被改写。
"""

from __future__ import annotations

from graycity.models import EvalResult, ExceptionItem
from graycity.store import DataStore

CATEGORY_BACKFILL = "待补录日志"
CATEGORY_TRUNC = "长文本截断"
CATEGORY_MATERIAL = "补材料"
CATEGORY_CALIBRATION = "改口径"

# 人工备注里的口径/补料信号词（仅用于判定 category，不用于改写原话）
_CALIB_HINTS = ("口径", "调过", "别急着补", "阈值", "判定")
_MATERIAL_HINTS = ("样本太少", "补一批", "补料", "材料少")


def classify(store: DataStore, results: list[EvalResult]) -> list[ExceptionItem]:
    items: list[ExceptionItem] = []
    for res in results:
        sample = store.sample_by_id(res.sample_id)
        if sample is None:
            continue
        ann = store.annotation_for(res.sample_id)
        ann_note = ann.note if ann else ""

        # 1) 日志未补录
        if res.blocked and "补录" in res.reason:
            items.append(
                ExceptionItem(
                    sample_id=res.sample_id,
                    city=res.city,
                    category=CATEGORY_BACKFILL,
                    detail=res.reason,
                    next_step="先补录该样本模型日志，再重算灰度对比与转化率",
                    severity="block",
                )
            )
            continue

        # 2) 长文本截断被拦
        if res.blocked and res.truncated:
            hint = _ann_hint(ann_note)
            if hint == "material":
                next_step = "按人工备注补长文本样本；同时评估是否放宽 max_len 口径"
            else:
                next_step = "复核尾部关键信息是否丢失；考虑改口径(放宽 max_len 或先摘要再判定)"
            items.append(
                ExceptionItem(
                    sample_id=res.sample_id,
                    city=res.city,
                    category=CATEGORY_TRUNC,
                    detail=res.reason,
                    next_step=next_step,
                    severity="block",
                )
            )
            continue

        # 3) 预测与标注不一致
        if not res.correct:
            hint = _ann_hint(ann_note)
            if hint == "material":
                cat, next_step = CATEGORY_MATERIAL, "补充同城同类型训练样本后重跑回放"
            elif hint == "calib":
                cat, next_step = CATEGORY_CALIBRATION, "按人工备注复核判定口径/阈值与提示词版本"
            else:
                cat, next_step = CATEGORY_CALIBRATION, "复核判定口径与提示词版本(v2)，确认是否需改口径"
            items.append(
                ExceptionItem(
                    sample_id=res.sample_id,
                    city=res.city,
                    category=cat,
                    detail=f"预测={res.prediction} 标注={sample.label} score={res.score:.2f}",
                    next_step=next_step,
                    severity="warn",
                )
            )

    return items


def _ann_hint(note: str) -> str:
    """从人工备注原话判定信号，返回 material/calib/none。不改写原话。"""
    if any(w in note for w in _MATERIAL_HINTS):
        return "material"
    if any(w in note for w in _CALIB_HINTS):
        return "calib"
    return "none"


def group_counts(items: list[ExceptionItem]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for it in items:
        counts[it.category] = counts.get(it.category, 0) + 1
    return counts
