from __future__ import annotations

from typing import Any

from .models import LeakDetectionResult, ReviewRecord, ShuffleResult


class GrayDiffReporter:
    """灰度对比报告：对比两次处理的差异

    月底/课前使用场景：
    - 人工反馈修正前后结论一致性比对
    - 重复导入是否产生两份结论
    - 训练组/产品经理看的报告是否说同一件事
    """

    def compare_shuffle(self, old: ShuffleResult, new: ShuffleResult) -> dict[str, Any]:
        old_train = set(old.record_ids_train)
        new_train = set(new.record_ids_train)
        old_val = set(old.record_ids_val)
        new_val = set(new.record_ids_val)

        moved_train_to_val = old_train & new_val
        moved_val_to_train = old_val & new_train

        return {
            "metric": "shuffle_stability",
            "batch_id_old": old.batch_id,
            "batch_id_new": new.batch_id,
            "same_seed": old.seed == new.seed,
            "seed_old": old.seed,
            "seed_new": new.seed,
            "total_old": old.total_records,
            "total_new": new.total_records,
            "count_moved_train_to_val": len(moved_train_to_val),
            "count_moved_val_to_train": len(moved_val_to_train),
            "examples_train_to_val": sorted(list(moved_train_to_val))[:10],
            "examples_val_to_train": sorted(list(moved_val_to_train))[:10],
            "expected_stable": old.seed == new.seed and old.total_records == new.total_records,
            "is_stable": (
                old.seed == new.seed
                and old.total_records == new.total_records
                and len(moved_train_to_val) == 0
                and len(moved_val_to_train) == 0
            ),
        }

    def compare_leak(self, old: LeakDetectionResult, new: LeakDetectionResult) -> dict[str, Any]:
        old_keys = set(old.affected_keys)
        new_keys = set(new.affected_keys)
        return {
            "metric": "leak_consistency",
            "status_old": old.status.value,
            "status_new": new.status.value,
            "status_changed": old.status != new.status,
            "leak_count_old": old.leak_count,
            "leak_count_new": new.leak_count,
            "leak_ratio_old": old.leak_ratio,
            "leak_ratio_new": new.leak_ratio,
            "keys_only_in_old": sorted(old_keys - new_keys)[:20],
            "keys_only_in_new": sorted(new_keys - old_keys)[:20],
            "keys_in_both": sorted(old_keys & new_keys)[:20],
            "summary_changed": (
                old.status != new.status
                or old.leak_count != new.leak_count
                or old.leak_ratio != new.leak_ratio
            ),
        }

    def compare_review(self, old: ReviewRecord, new: ReviewRecord) -> dict[str, Any]:
        return {
            "metric": "review_consistency",
            "review_id_old": old.review_id,
            "review_id_new": new.review_id,
            "status_old": old.status.value,
            "status_new": new.status.value,
            "same_fingerprint": old.material_fingerprint == new.material_fingerprint
                                and old.material_fingerprint != "",
            "same_batch": old.batch_id == new.batch_id,
            "same_data_sources": sorted(old.data_source_files) == sorted(new.data_source_files),
            "comment_old": old.comment,
            "comment_new": new.comment,
            "conclusion_changed": old.status != new.status,
        }

    def build_full_report(self,
                          old_review: ReviewRecord | None,
                          new_review: ReviewRecord,
                          old_shuffle: ShuffleResult | None,
                          new_shuffle: ShuffleResult | None) -> dict[str, Any]:
        sections: dict[str, Any] = {}
        if old_review and new_review:
            sections["review"] = self.compare_review(old_review, new_review)
        if old_shuffle and new_shuffle:
            sections["shuffle"] = self.compare_shuffle(old_shuffle, new_shuffle)
        if old_review and old_review.leak_result and new_review and new_review.leak_result:
            sections["leak"] = self.compare_leak(old_review.leak_result, new_review.leak_result)

        # 总体解释性检查
        all_stable = True
        explanation: list[str] = []
        for key, data in sections.items():
            if data.get("conclusion_changed") or data.get("summary_changed") or data.get("is_stable") is False:
                all_stable = False
                if key == "shuffle" and data.get("expected_stable"):
                    explanation.append(f"[警告] 相同 seed ({data.get('seed_old')}) 下样本划分发生了变动，"
                                       f"{data.get('count_moved_train_to_val')} 条从训练移到验证。")
                elif key == "review" and data.get("conclusion_changed"):
                    explanation.append(f"[注意] 复核结论变化: {data.get('status_old')} → {data.get('status_new')}，"
                                       f"若为人工修正需记录原因。")
                elif key == "leak" and data.get("summary_changed"):
                    explanation.append(f"[注意] 泄漏摘要变化: {data.get('leak_count_old')} → {data.get('leak_count_new')} 条，"
                                       f"需确认是否因去重/补录引起。")

        if not sections:
            explanation.append("缺少旧版数据，无法做完整灰度对比，建议先存储第一次运行结果作为基线。")
        elif all_stable:
            explanation.append("灰度对比通过：相同材料、相同 seed 下，划分/泄漏/复核结论均保持一致。")

        return {
            "generated_for": "算法产品经理月度/课前灰度说明",
            "sections": sections,
            "all_stable": all_stable,
            "explanations": explanation,
            "how_to_read": (
                "1) 若 shuffle.is_stable=False 且 expected_stable=True → 检查是否有人为改原始数据；"
                "2) 若 review.conclusion_changed=True → 确认人工反馈是否在 comment 中记录理由；"
                "3) 若 leak.summary_changed=True → 核对补录/去重后的样本是否影响泄漏结论。"
            ),
        }
