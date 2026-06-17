from __future__ import annotations

import random
from typing import Any

import pandas as pd

from .models import SplitType


class SampleDataGenerator:
    """首次使用示例数据生成器

    让算法产品经理不用先造半天表才能看懂工具：
    - 带 label/text/user_id/timestamp/split_type 的基础样本
    - 故意构造少量重复样本（演示 dedup）
    - 故意构造少量泄漏样本（演示 leak_detector）
    - 配套一份 README 样式的使用提示
    """

    def __init__(self, seed: int = 42):
        self._base_seed = seed

    def _get_rng(self) -> random.Random:
        """每次调用返回独立的随机源，保证同一 seed 的多次调用幂等。"""
        return random.Random(self._base_seed)

    def generate_training_samples(self, n: int = 200) -> pd.DataFrame:
        """生成训练/验证样本示例"""
        rng = self._get_rng()
        return self._generate_training_samples_inner(n, rng)

    def _generate_training_samples_inner(self, n: int, rng: random.Random) -> pd.DataFrame:
        """内部实现，接收独立随机源"""
        templates = [
            "用户咨询{}功能如何使用",
            "我想了解{}的价格",
            "帮我推荐适合{}的产品",
            "{}的售后服务怎么样",
            "能不能对比一下{}和其他同类产品",
            "反馈{}功能使用体验不好",
            "{}功能入口在哪里",
        ]
        topics = ["订单管理", "会员体系", "优惠券", "物流配送", "客服咨询",
                  "支付退款", "商品搜索", "消息通知", "个性化推荐", "购物车"]

        rows: list[dict[str, Any]] = []
        for i in range(n):
            user_id = f"u{(i % 30) + 1:04d}"
            topic = rng.choice(topics)
            text_tpl = rng.choice(templates)
            rows.append({
                "record_id": f"s{i + 1:05d}",
                "text": text_tpl.format(topic),
                "label": rng.choice(["positive", "negative", "neutral"]),
                "user_id": user_id,
                "timestamp": 1700000000 + i * 1000 + rng.randint(0, 500),
                "session_id": f"sess{(i // 5) + 1:06d}",
                "split_type": rng.choices(
                    [SplitType.TRAIN.value, SplitType.VAL.value, SplitType.UNASSIGNED.value],
                    weights=[0.6, 0.2, 0.2],
                )[0],
            })

        # 注入 5 条重复（完全相同 content）
        for dup_idx in range(5):
            src = rows[dup_idx]
            rows.append({
                "record_id": f"s{n + dup_idx + 1:05d}",
                "text": src["text"],
                "label": src["label"],
                "user_id": src["user_id"],
                "timestamp": src["timestamp"],
                "session_id": src["session_id"],
                "split_type": SplitType.TRAIN.value,
            })

        # 注入 3 条跨集泄漏（同一用户同时在 train 和 val）
        val_users = [r["user_id"] for r in rows if r["split_type"] == "val"][:3]
        for leak_idx, vu in enumerate(val_users):
            rows.append({
                "record_id": f"s{n + 100 + leak_idx:05d}",
                "text": f"跨集用户样本 {vu}",
                "label": "neutral",
                "user_id": vu,
                "timestamp": 1700100000 + (42 + leak_idx) * 7,
                "session_id": f"sess999{10 + leak_idx:02d}",
                "split_type": SplitType.TRAIN.value,
            })

        df = pd.DataFrame(rows)
        # 保证确定性顺序
        return df.sort_values("record_id").reset_index(drop=True)

    def generate_feedback_patch(self) -> pd.DataFrame:
        """生成人工反馈修正示例（补录场景）"""
        return pd.DataFrame([
            {"record_id": "s00001", "label": "positive", "review_note": "人工修正：用户实际满意"},
            {"record_id": "s00010", "label": "negative", "review_note": "人工修正：用户明确不满"},
        ])

    def write_all_to_dir(self, target_dir: str | Any) -> dict[str, str]:
        import os
        target = str(target_dir)
        os.makedirs(target, exist_ok=True)
        samples_path = os.path.join(target, "sample_training.csv")
        feedback_path = os.path.join(target, "sample_feedback.csv")
        self.generate_training_samples(200).to_csv(samples_path, index=False, encoding="utf-8")
        self.generate_feedback_patch().to_csv(feedback_path, index=False, encoding="utf-8")
        return {"samples": samples_path, "feedback": feedback_path}
