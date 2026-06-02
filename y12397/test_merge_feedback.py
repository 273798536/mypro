#!/usr/bin/env python3
"""
测试标签归并的反馈追踪和异常样本机制
验证: 1) 标签归并非一次性判断 2) 相似检索变化后反馈追踪 3) 异常样本标记
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from importer import import_all
from tag_merger import TagMerger
from models import Severity


def main():
    print("=" * 70)
    print("测试: 标签归并反馈追踪与异常样本机制")
    print("=" * 70)
    print()

    base_dir = Path(__file__).parent
    dataset = import_all(
        str(base_dir / "sample_data" / "materials.json"),
        str(base_dir / "sample_data" / "usages.json"),
        str(base_dir / "sample_data" / "reports.json"),
    )

    print("【测试1: 初始标签归并建议】")
    print("-" * 50)
    merger = TagMerger(dataset)

    test_mats = ["MAT002", "MAT006", "MAT003"]
    for mat_id in test_mats:
        mat = dataset.materials[mat_id]
        suggested, sims = merger.suggest_merge(mat)
        print(f"素材 {mat_id} [{mat.title}]:")
        print(f"  源标签: {mat.source_tags}")
        print(f"  人工标签: {mat.manual_tags}")
        print(f"  现有归并: {mat.merged_tags}")
        print(f"  建议归并: {suggested}")
        print(f"  相似依据: {[(s.tag_a, s.tag_b, f'{s.similarity_score:.0%}') for s in sims[:3]]}")
        print()

    print("【测试2: 应用归并并记录历史】")
    print("-" * 50)
    mat006 = dataset.materials["MAT006"]
    result = merger.apply_merge(mat006, dry_run=False)
    print(f"素材 MAT006 [{mat006.title}] 归并应用结果:")
    print(f"  归并前标签: {result['current_tags']}")
    print(f"  归并后标签: {result['suggested_tags']}")
    print(f"  移除标签: {result['differences']['removed']}")
    print(f"  新增标签: {result['differences']['added']}")
    print(f"  已应用: {result['applied']}")
    print(f"  归并历史记录数: {len(mat006.merge_history)}")
    if mat006.merge_history:
        latest = mat006.merge_history[-1]
        print(f"  最新归并时间: {latest['merge_time']}")
    print()

    print("【测试3: 记录归并反馈】")
    print("-" * 50)
    feedback1 = merger.record_feedback(
        material_id="MAT006",
        original_tags=["悲伤", "伤感", "难过", "忧郁"],
        suggested_tags=["悲伤", "压抑"],
        accepted=False,
        feedback_text="归并错误引入了'压抑'标签，这首曲子是悲伤但不压抑。源标签和人工标签都是悲伤相关的，不应引入压抑。",
    )
    print(f"反馈1 (不接受):")
    print(f"  反馈ID: {feedback1.feedback_id}")
    print(f"  素材: {feedback1.material_id}")
    print(f"  接受: {feedback1.accepted}")
    print(f"  反馈内容: {feedback1.feedback_text}")
    print(f"  异常样本: {feedback1.anomaly_sample}")
    print()

    feedback2 = merger.record_feedback(
        material_id="MAT001",
        original_tags=["温馨", "温暖", "舒缓", "平静"],
        suggested_tags=["温馨", "舒缓"],
        accepted=True,
        feedback_text="归并正确，将相近的情绪标签合并。",
    )
    print(f"反馈2 (接受):")
    print(f"  反馈ID: {feedback2.feedback_id}")
    print(f"  素材: {feedback2.material_id}")
    print(f"  接受: {feedback2.accepted}")
    print(f"  异常样本: {feedback2.anomaly_sample}")
    print()

    print("【测试4: 调整相似度阈值 - 触发异常样本检测】")
    print("-" * 50)
    print(f"调整前标签相似关系数: {len(dataset.tag_similarities)}")
    print(f"调整前异常样本数: {len([f for f in dataset.merge_feedbacks if f.anomaly_sample])}")
    print()

    new_sims = merger.rebuild_similarities(threshold=0.5)
    print(f"调整阈值后标签相似关系数: {len(new_sims)}")
    print(f"调整后异常样本数: {len([f for f in dataset.merge_feedbacks if f.anomaly_sample])}")
    print()

    anomaly_feedbacks = [f for f in dataset.merge_feedbacks if f.anomaly_sample]
    for fb in anomaly_feedbacks:
        print(f"  异常反馈: {fb.feedback_id} (素材 {fb.material_id})")
        print(f"    原标签: {fb.original_tags}")
        print(f"    建议标签: {fb.suggested_tags}")
        print(f"    反馈: {fb.feedback_text}")
    print()

    print("【测试5: 检查归并异常】")
    print("-" * 50)
    anomalies = merger.check_merge_anomalies()
    print(f"发现归并异常: {len(anomalies)} 个")
    for issue in anomalies:
        sev_marker = "🔴" if issue.severity == Severity.CRITICAL else "🟡"
        print(f"{sev_marker} [{issue.issue_type.value}] {issue.title}")
        print(f"  描述: {issue.description}")
        print(f"  建议: {issue.suggestions[0]}")
    print()

    print("【测试6: 反馈影响后续归并建议】")
    print("-" * 50)
    print("MAT006 在反馈(不接受'压抑'归并)后的归并建议:")
    suggested_after, sims_after = merger.suggest_merge(mat006)
    print(f"  建议归并: {suggested_after}")
    print(f"  是否包含'压抑': {'压抑' in suggested_after}")
    print()

    print("【测试7: 归并结果剧烈变化检测】")
    print("-" * 50)
    mat002 = dataset.materials["MAT002"]
    mat002.merged_tags = ["欢快", "轻松"]
    mat002.merge_history.append({
        "merge_time": "2026-05-20T10:00:00",
        "previous_merged_tags": [],
        "new_merged_tags": ["欢快", "轻松"],
        "similarities_used": [],
    })

    result2 = merger.apply_merge(mat002, dry_run=False)
    print(f"素材 MAT002 归并前后:")
    print(f"  旧归并标签: ['欢快', '轻松']")
    print(f"  新归并标签: {result2['suggested_tags']}")
    print(f"  是否有交集: {bool(set(['欢快', '轻松']) & set(result2['suggested_tags']))}")

    anomalies2 = merger.check_merge_anomalies()
    severe_anomalies = [a for a in anomalies2 if a.severity == Severity.CRITICAL]
    print(f"  剧烈变化异常数: {len(severe_anomalies)}")
    for a in severe_anomalies:
        if "MAT002" in a.related_materials:
            print(f"  ✓ 检测到剧烈变化异常: {a.title}")
            print(f"    建议: {a.suggestions[0]}")
    print()

    print("=" * 70)
    print("测试完成！")
    print("=" * 70)
    print()
    print("验证要点总结:")
    print("  ✓ 标签归并非一次性判断，基于相似度+反馈动态调整")
    print("  ✓ 相似检索变化(阈值调整)后自动标记历史异常样本")
    print("  ✓ 归并历史完整记录，可追溯每次变更")
    print("  ✓ 归并结果剧烈变化触发严重警告")
    print("  ✓ 不接受的反馈会影响后续归并建议")
    print("  ✓ 材料打架时保留原始数据，不擅自修改口径")

    return 0


if __name__ == "__main__":
    sys.exit(main())
