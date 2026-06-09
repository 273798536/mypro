from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

from .models import SampleRecord, SampleSource


@dataclass
class CounterExampleGenerator:
    """反例生成器（月底复盘/课前讲题用）

    生成典型的过冲/非过冲样例，给出解释性标注。
    """

    seed: int = 42

    def _sigmoid(self, x, x0, k):
        return 1.0 / (1.0 + np.exp(-k * (x - x0)))

    def generate_clean_monotonic(self, n: int = 12) -> SampleRecord:
        rng = np.random.default_rng(self.seed)
        x = np.linspace(0, 10, n)
        y = np.cumsum(rng.uniform(0.1, 0.5, n))
        return SampleRecord(
            sample_id="CE_MONOTONIC",
            x_values=x.tolist(),
            y_values=y.tolist(),
            source=SampleSource.MANUAL_ENTRY,
            metadata={"label": "单调递增，通常无过冲", "category": "normal"},
        )

    def generate_step_with_noise(self, n: int = 15) -> SampleRecord:
        rng = np.random.default_rng(self.seed + 1)
        x = np.linspace(0, 10, n)
        y = np.where(x < 5, 0.0, 1.0) + rng.normal(0, 0.05, n)
        return SampleRecord(
            sample_id="CE_STEP",
            x_values=x.tolist(),
            y_values=y.tolist(),
            source=SampleSource.MANUAL_ENTRY,
            metadata={
                "label": "阶跃函数 + 噪声：样条在跳变处易出现过冲（暂缓/重采类典型）",
                "category": "boundary",
            },
        )

    def generate_gentle_hump(self, n: int = 15) -> SampleRecord:
        rng = np.random.default_rng(self.seed + 2)
        x = np.linspace(0, 10, n)
        y = 2.0 * np.exp(-((x - 5.0) ** 2) / 4.0) + rng.normal(0, 0.02, n)
        return SampleRecord(
            sample_id="CE_HUMP",
            x_values=x.tolist(),
            y_values=y.tolist(),
            source=SampleSource.MANUAL_ENTRY,
            metadata={"label": "光滑高斯峰：通常可用", "category": "normal"},
        )

    def generate_oscillating(self, n: int = 20) -> SampleRecord:
        rng = np.random.default_rng(self.seed + 3)
        x = np.linspace(0, 10, n)
        y = np.sin(x) + rng.normal(0, 0.05, n)
        return SampleRecord(
            sample_id="CE_OSCILLATE",
            x_values=x.tolist(),
            y_values=y.tolist(),
            source=SampleSource.MANUAL_ENTRY,
            metadata={
                "label": "振荡曲线 + 噪声：过冲通常可控但要注意采样密度",
                "category": "boundary",
            },
        )

    def generate_spike_outlier(self, n: int = 15) -> SampleRecord:
        rng = np.random.default_rng(self.seed + 4)
        x = np.linspace(0, 10, n)
        y = np.linspace(0, 1, n)
        y[7] += 3.0
        y += rng.normal(0, 0.02, n)
        return SampleRecord(
            sample_id="CE_SPIKE",
            x_values=x.tolist(),
            y_values=y.tolist(),
            source=SampleSource.MANUAL_ENTRY,
            metadata={
                "label": "含尖峰异常点：样条会在尖峰两侧严重过冲（典型重采）",
                "category": "recollect",
            },
        )

    def generate_all(self) -> List[SampleRecord]:
        return [
            self.generate_clean_monotonic(),
            self.generate_gentle_hump(),
            self.generate_oscillating(),
            self.generate_step_with_noise(),
            self.generate_spike_outlier(),
        ]

    def explain(self, sample: SampleRecord) -> str:
        label = sample.metadata.get("label", "无标注")
        cat = sample.metadata.get("category", "unknown")
        return f"[{cat.upper()}] {label}"
