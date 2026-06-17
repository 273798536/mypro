from __future__ import annotations

import random
from typing import Any

from .models import DataRecord, ShuffleResult, SplitType, generate_id


class Shuffler:
    """确定性数据混洗器

    保证：
    - 相同 seed + 相同输入记录集合（按 record_id 排序后）→ 相同划分结果
    - 不会越跑越乱
    - 尊重已有 split_type（若用户已打标），仅对 UNASSIGNED 进行划分
    """

    def __init__(self, seed: int = 42, train_ratio: float = 0.7, val_ratio: float = 0.15,
                 test_ratio: float = 0.15, by_user: bool = False):
        self.seed = int(seed)
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.by_user = by_user

    def run(self, records: list[DataRecord], batch_id: str | None = None) -> ShuffleResult:
        batch_id = batch_id or generate_id("bat")
        total = len(records)

        # 浅拷贝 records，避免原地修改 split_type 污染调用方数据
        # （关键：重复调用同一批 records 时保证每次都从原始状态开始）
        work_records = [r.model_copy(deep=False) for r in records]

        # 归一化比例
        ratio_sum = self.train_ratio + self.val_ratio + self.test_ratio
        if ratio_sum <= 0:
            t_r, v_r, te_r = 0.7, 0.15, 0.15
        else:
            t_r = self.train_ratio / ratio_sum
            v_r = self.val_ratio / ratio_sum
            te_r = self.test_ratio / ratio_sum

        rng = random.Random(self.seed)

        # 分组：by_user 或 by record
        if self.by_user:
            user_groups: dict[str, list[DataRecord]] = {}
            for r in work_records:
                key = r.user_id or "__no_user__"
                user_groups.setdefault(key, []).append(r)
            units: list[list[DataRecord]] = list(user_groups.values())
        else:
            units = [[r] for r in work_records]

        # 对单元按确定性 key 排序后再混洗
        def unit_key(u: list[DataRecord]) -> str:
            u_sorted = sorted(u, key=lambda r: r.record_id)
            return u_sorted[0].record_id

        units_sorted = sorted(units, key=unit_key)
        rng.shuffle(units_sorted)

        train_recs: list[DataRecord] = []
        val_recs: list[DataRecord] = []
        test_recs: list[DataRecord] = []

        n = len(units_sorted)
        train_cut = int(n * t_r)
        val_cut = train_cut + int(n * v_r)

        def add_split(unit: list[DataRecord], target: list[DataRecord], split: SplitType) -> None:
            for r in unit:
                if r.split_type != SplitType.UNASSIGNED:
                    # 尊重已有划分
                    if r.split_type == SplitType.TRAIN:
                        train_recs.append(r)
                    elif r.split_type == SplitType.VAL:
                        val_recs.append(r)
                    elif r.split_type == SplitType.TEST:
                        test_recs.append(r)
                else:
                    r.split_type = split
                    target.append(r)

        for i, unit in enumerate(units_sorted):
            if i < train_cut:
                add_split(unit, train_recs, SplitType.TRAIN)
            elif i < val_cut:
                add_split(unit, val_recs, SplitType.VAL)
            else:
                add_split(unit, test_recs, SplitType.TEST)

        return ShuffleResult(
            batch_id=batch_id,
            seed=self.seed,
            total_records=total,
            train_count=len(train_recs),
            val_count=len(val_recs),
            test_count=len(test_recs),
            train_ratio=round(len(train_recs) / max(total, 1), 6),
            val_ratio=round(len(val_recs) / max(total, 1), 6),
            test_ratio=round(len(test_recs) / max(total, 1), 6),
            record_ids_train=sorted(r.record_id for r in train_recs),
            record_ids_val=sorted(r.record_id for r in val_recs),
            record_ids_test=sorted(r.record_id for r in test_recs),
        )
