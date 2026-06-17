"""灰度城市转化差异对比。

按城市聚合 treatment / control 两组，计算预测转化率差异(百分点)。
被截断/待补录的样本不计入转化率，但单独计数，平台工程师能立刻看到是数据缺失还是口径问题。
本对比每次都从最新 EvalResult 重算：模型日志补录后回放更新，这里就跟着更新。
"""

from __future__ import annotations

from typing import Optional

from graycity.models import CityDiff, EvalResult, TrainingSample
from graycity.store import DataStore


def compute(store: DataStore, results: list[EvalResult]) -> list[CityDiff]:
    sample_by_id = {s.id: s for s in store.samples}
    result_by_id = {r.sample_id: r for r in results}

    cities: dict[str, CityDiff] = {}

    def _city(city: str) -> CityDiff:
        if city not in cities:
            cities[city] = CityDiff(city=city)
        return cities[city]

    for sample in store.samples:
        res = result_by_id.get(sample.id)
        cd = _city(sample.city)
        if res is None:
            cd.pending_backfill += 1
            continue
        if res.blocked:
            cd.blocked += 1
            if "补录" in res.reason:
                cd.pending_backfill += 1
            continue
        # 非拦截样本计入转化率
        if sample.group == "treatment":
            cd.treatment_total += 1
            if res.prediction == "转化":
                cd.treatment_conv += 1
        else:
            cd.control_total += 1
            if res.prediction == "转化":
                cd.control_conv += 1

    diffs = list(cities.values())
    for cd in diffs:
        cd.delta_pp = round((cd.treatment_rate - cd.control_rate) * 100, 2)
    # 按城市名稳定排序
    diffs.sort(key=lambda c: c.city)
    return diffs


def summarize(diffs: list[CityDiff]) -> str:
    """单行汇总：让平台工程师一眼分清是缺数据还是口径问题。"""
    total_blocked = sum(c.blocked for c in diffs)
    total_pending = sum(c.pending_backfill for c in diffs)
    biggest = max(diffs, key=lambda c: abs(c.delta_pp), default=None)
    parts = [
        f"城市数 {len(diffs)}",
        f"拦截(截断)样本 {total_blocked}",
        f"待补录日志 {total_pending}",
    ]
    if biggest is not None and (biggest.treatment_total or biggest.control_total):
        direction = "treatment 高" if biggest.delta_pp >= 0 else "control 高"
        parts.append(
            f"最大差异城市 {biggest.city} Δ{biggest.delta_pp:+.2f}pp({direction})"
        )
    if total_pending:
        parts.append("→ 先补录模型日志再下口径结论")
    elif total_blocked and not total_pending:
        parts.append("→ 有截断样本，复核长文本是否漏判")
    return " | ".join(parts)
