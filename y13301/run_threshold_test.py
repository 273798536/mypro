#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src import GrayComparator
from src.models import JudgmentStatus
from data.samples import create_sample_data


def test_threshold_impact():
    print("=" * 60)
    print("阈值影响测试")
    print("=" * 60)
    print()

    samples, _, _, _ = create_sample_data()
    normal_samples = [s for s in samples if s.status != JudgmentStatus.PENDING_MATERIAL]

    thresholds_to_test = [0.45, 0.5, 0.55, 0.6]

    print(f"测试 {len(normal_samples)} 条样本在不同阈值下的表现：")
    print()

    for new_threshold in thresholds_to_test:
        comparator = GrayComparator(
            old_threshold=0.5,
            new_threshold=new_threshold,
            respect_manual=True,
        )

        for sample in normal_samples:
            if sample.new_model and sample.old_model:
                if sample.new_model.threshold != new_threshold:
                    adjusted = comparator.apply_threshold_adjustment(sample, new_threshold)
                    sample.new_model = adjusted

        result = comparator.compare(normal_samples)

        pass_rate = result.consistent_count / result.total_samples * 100 if result.total_samples > 0 else 0

        print(f"阈值 {new_threshold:.2f}:")
        print(f"  一致率: {pass_rate:.1f}% ({result.consistent_count}/{result.total_samples})")
        print(f"  不一致: {result.inconsistent_count} 条")
        print(f"  受阈值影响: {result.threshold_impact_count} 条")

        if result.threshold_impact_count > 0:
            print(f"  受影响样本:")
            for s in normal_samples:
                if s.old_model and s.new_model:
                    old_judge = s.old_model.judgment
                    new_judge = s.new_model.judgment
                    if old_judge != new_judge:
                        old_by_thr = "通过" if s.old_model.score >= 0.5 else "不通过"
                        new_by_thr = "通过" if s.new_model.score >= new_threshold else "不通过"
                        if old_by_thr == new_by_thr:
                            print(f"    - {s.sample_id}: 旧模型{old_judge}({s.old_model.score:.3f}) "
                                  f"→ 新模型{new_judge}({s.new_model.score:.3f})")
        print()

    print("=" * 60)
    print("建议：选择阈值时需平衡一致率和误判率，")
    print("      阈值变化不应盖过人工判断的优先级。")
    print("=" * 60)


if __name__ == "__main__":
    sys.exit(test_threshold_impact())
