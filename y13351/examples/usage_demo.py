#!/usr/bin/env python3
"""
向量索引版本快照系统 - 使用示例

本示例展示如何使用系统解决以下问题：
1. 灰度配置字段名不一致的处理
2. 小样本被平均数盖住的关系记录
3. 排班同事可点击回样本证据
4. run_id重复记录的异常标记
5. 坏数据的原始行定位
6. 旧模型误判样本的改判解释
7. 给小许的补材料/放行建议
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vector_index_snapshot import VectorIndexSnapshotManager, SampleEvidence


def demo_gray_config_field_mapping():
    print("=" * 70)
    print("【示例1】处理灰度配置字段名不一致")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    gray_config_1 = {
        "阈值": 0.7,
        "小样本量": 30,
        "均值覆盖比": 0.8,
        "索引版本": "v2.3.1",
    }

    gray_config_2 = {
        "threshold": 0.7,
        "min_sample_size": 30,
        "mask_ratio": 0.8,
        "vector_version": "v2.3.1",
    }

    gray_config_3 = {
        "pass_threshold": 0.75,
        "n_min": 50,
        "mean_cover_ratio": 0.7,
        "idx_version": "v2.4.0",
    }

    print("\n排班同事交来的3份配置（字段名各不相同）：")
    print(f"配置1: {gray_config_1}")
    print(f"配置2: {gray_config_2}")
    print(f"配置3: {gray_config_3}")

    record1 = manager.create_snapshot(
        run_id="run_001",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config_1,
        score=0.85,
        threshold=0.7,
        source_line=1,
    )

    record2 = manager.create_snapshot(
        run_id="run_002",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config_2,
        score=0.62,
        threshold=0.7,
        source_line=2,
    )

    record3 = manager.create_snapshot(
        run_id="run_003",
        vector_index_version="v2.4.0",
        raw_gray_config=gray_config_3,
        score=0.88,
        threshold=0.75,
        source_line=3,
    )

    print("\n系统自动标准化后的字段映射：")
    for rec in [record1, record2, record3]:
        print(f"\n记录 {rec.record_id}:")
        print(f"  原始字段映射: {rec.gray_config.field_mapping}")
        print(f"  标准化配置: {rec.gray_config.normalized_config}")
        print(f"  来源行号: {rec.gray_config.source_line}")

    print("\n灰度配置与小样本掩盖的关系：")
    relationships = manager.get_all_masking_relationships()
    for rel in relationships:
        print(f"\n来源 {rel['source_id']} (行{rel['source_line']}):")
        print(f"  掩盖条件: {rel['masking_condition']}")
        for field, ref in rel['raw_field_references'].items():
            print(f"  {field}: {ref}")


def demo_sample_evidence_chain():
    print("\n" + "=" * 70)
    print("【示例2】样本证据链管理 - 排班同事能点回样本证据")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    def sample_link_generator(sample_id):
        return f"https://sample-db.internal.com/samples/{sample_id}"

    manager.register_evidence_link_generator("sample_db", sample_link_generator)

    gray_config = {
        "阈值": 0.7,
        "小样本量": 30,
        "均值覆盖比": 0.8,
    }

    record = manager.create_snapshot(
        run_id="run_101",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config,
        score=0.82,
        threshold=0.7,
    )

    print(f"\n创建记录: {record.record_id}, 分数: {record.score}")

    evidence1 = manager.add_sample_evidence(
        record_id=record.record_id,
        sample_id="SAMPLE_001",
        sample_content={"query": "推荐算法教程", "item_id": "ITEM_123"},
        source_system="sample_db",
        features={
            "query_text": "推荐算法教程",
            "matched_item": "向量索引入门到精通",
            "similarity_score": 0.92,
            "recall_rank": 1,
            "weight": 0.6,
        },
        labels={"human_label": "relevant"},
        notes="召回Top1，完全匹配",
    )

    evidence2 = manager.add_sample_evidence(
        record_id=record.record_id,
        sample_id="SAMPLE_002",
        sample_content={"query": "推荐算法教程", "item_id": "ITEM_456"},
        source_system="sample_db",
        features={
            "query_text": "推荐算法教程",
            "matched_item": "协同 filtering 实战",
            "similarity_score": 0.78,
            "recall_rank": 2,
            "weight": 0.4,
        },
        labels={"human_label": "partially_relevant"},
        notes="召回Top2，部分相关",
    )

    print(f"\n添加了 {len(record.evidence_chain)} 条样本证据")

    print("\n排班同事看到的可点击证据链接：")
    clickable = manager.get_clickable_evidence(record.record_id)
    for idx, link in enumerate(clickable, 1):
        print(f"  {idx}. {link['display_text']}")
        print(f"     URL: {link['url']}")
        print(f"     分数贡献度: {link['score_contribution']:.4f}")

    print("\n证据摘要（给排班同事看）：")
    summary = manager.evidence_manager.build_evidence_summary(record)
    print(f"  证据数量: {summary['evidence_count']}")
    print(f"  有可点击链接: {summary['has_clickable_evidence']}")
    print(f"  覆盖特征: {summary['features_covered']}")
    print(f"  是否通过: {summary['is_approved']}")


def demo_duplicate_run_id():
    print("\n" + "=" * 70)
    print("【示例3】run_id重复检测 - 不写入正常通过结果")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    gray_config = {"阈值": 0.7, "小样本量": 30}

    print("\n创建第一条记录，run_id = 'run_duplicate_001'")
    record1 = manager.create_snapshot(
        run_id="run_duplicate_001",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config,
        score=0.85,
        threshold=0.7,
    )
    print(f"  记录ID: {record1.record_id}")
    print(f"  状态: {record1.processing_status}")
    print(f"  是否通过: {record1.is_approved()}")

    print("\n创建第二条记录，run_id 相同（重复），分数更高（0.95）")
    record2 = manager.create_snapshot(
        run_id="run_duplicate_001",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config,
        score=0.95,
        threshold=0.7,
    )
    print(f"  记录ID: {record2.record_id}")
    print(f"  状态: {record2.processing_status}")
    print(f"  是否通过: {record2.is_approved()} (即使分数高也不算通过！)")
    print(f"  错误信息: {record2.processing_errors}")

    print("\n重复检测摘要：")
    dup_summary = manager.get_duplicate_summary()
    print(f"  重复run_id数量: {dup_summary['duplicated_run_id_count']}")
    print(f"  重复记录总数: {dup_summary['total_duplicated_records']}")
    print(f"  重复组: {dup_summary['duplicate_groups']}")


def demo_bad_data_detection():
    print("\n" + "=" * 70)
    print("【示例4】坏数据检测 - 指出原始行或具体对象")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    config_rows = [
        {
            "run_id": "run_bad_001",
            "vector_index_version": "v2.3.1",
            "score": 0.85,
            "threshold": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_bad_002",
            "vector_index_version": "v2.3.1",
            "score": "not_a_number",
            "threshold": 0.7,
            "小样本量": "thirty",
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_bad_003",
            "vector_index_version": "v2.3.1",
            "score": 1.5,
            "threshold": 0.7,
            "小样本量": -5,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_bad_004",
            "vector_index_version": "v2.3.1",
            "score": 0.85,
            "阈值": 2.0,
            "min_sample_size": 30,
        },
    ]

    print(f"\n处理 {len(config_rows)} 行配置数据...")
    records = manager.create_snapshots_from_configs(config_rows)

    print("\n坏数据检测结果：")
    bad_data_summary = manager.get_bad_data_summary()
    print(f"  总问题数: {bad_data_summary['total_issues']}")
    print(f"  按行号分布: {bad_data_summary['issues_by_source_line']}")
    print(f"  按类型分布: {bad_data_summary['issues_by_type']}")

    print("\n第2行坏数据的精确定位：")
    bad_record = records[1]
    for err in bad_record.processing_errors:
        print(f"  {err}")

    print("\n定位到原始配置行：")
    location = manager.pinpoint_bad_data_source(bad_record.record_id, "small_sample_size")
    if location:
        print(f"  行号: {location.get('row_number')}")
        print(f"  原始字段名: {location.get('field_name')}")
        print(f"  原始值: {location.get('field_value')}")
        print(f"  对象路径: {location.get('object_path')}")

    print("\n第4行阈值问题的修复建议：")
    bad_record_4 = records[3]
    issue_details = manager.bad_data_detector.pinpoint_config_issue(
        bad_record_4.gray_config, "阈值超出合理范围"
    )
    print(f"  问题: {issue_details['issue']}")
    print(f"  有问题的字段: {issue_details['problematic_fields']}")
    print(f"  原始配置片段: {issue_details['raw_config_snippet']}")
    print(f"  修复建议: {issue_details['fix_suggestion']}")


def demo_misjudged_sample_explanation():
    print("\n" + "=" * 70)
    print("【示例5】旧模型误判样本的改判解释")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    gray_config = {"阈值": 0.7, "小样本量": 30, "均值覆盖比": 0.8}

    print("\n场景：旧模型把一个样本误判为不相关，新模型正确识别了")

    new_record = manager.create_snapshot(
        run_id="run_revise_001",
        vector_index_version="v2.4.0",
        raw_gray_config=gray_config,
        score=0.82,
        threshold=0.7,
    )

    manager.add_sample_evidence(
        record_id=new_record.record_id,
        sample_id="SAMPLE_MISJUDGED",
        sample_content={"query": "深度学习推荐", "item_id": "ITEM_789"},
        source_system="sample_db",
        features={
            "query_text": "深度学习推荐系统",
            "matched_item": "深度学习在推荐系统中的应用",
            "similarity_score": 0.88,
            "recall_rank": 1,
            "semantic_match": 0.91,
            "keyword_match": 0.75,
        },
        labels={"human_label": "relevant"},
        notes="新模型召回Top1",
    )

    old_misjudged_sample = SampleEvidence(
        evidence_id="evi_old_001",
        sample_id="SAMPLE_MISJUDGED",
        sample_content={"query": "深度学习推荐", "item_id": "ITEM_789"},
        source_system="sample_db",
        features={
            "query_text": "深度学习推荐系统",
            "matched_item": "深度学习在推荐系统中的应用",
            "similarity_score": 0.62,
            "recall_rank": 15,
            "semantic_match": 0.58,
            "keyword_match": 0.72,
        },
        labels={
            "old_score": 0.62,
            "old_model_version": "v2.3.1",
            "human_label": "relevant",
        },
        notes="旧模型漏召回，排在第15位",
    )

    print("\n旧模型结果: 分数0.62 < 阈值0.7，判定为不相关（漏报）")
    print("新模型结果: 分数0.82 ≥ 阈值0.7，判定为相关（正确）")

    explanation = manager.explain_misjudged_sample(
        record_id=new_record.record_id,
        misjudged_sample=old_misjudged_sample,
        old_model_label="negative",
    )

    print("\n" + explanation.to_human_readable())


def demo_small_sample_masking():
    print("\n" + "=" * 70)
    print("【示例6】小样本被平均数盖住的关系记录")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    gray_config = {
        "阈值": 0.7,
        "小样本量": 30,
        "均值覆盖比": 0.8,
    }

    print("\n配置：样本量<30 且 均值/阈值≥0.8 时，小样本将被均值掩盖")

    print("\n情况1：样本量5 < 30，原始平均分0.58，均值掩盖比0.83 ≥ 0.8 → 被掩盖")
    record_masked = manager.create_snapshot(
        run_id="run_mask_001",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config,
        score=0.75,
        threshold=0.7,
        raw_mean_score=0.58,
        sample_size=5,
    )
    print(f"  原始平均分: {record_masked.raw_mean_score}")
    print(f"  掩盖后分数: {record_masked.score}")
    print(f"  是否已掩盖: {record_masked.small_sample_masked}")
    print(f"  掩盖原因: {record_masked.small_sample_mask_reason}")

    print("\n情况2：样本量50 ≥ 30 → 不触发掩盖")
    record_not_masked = manager.create_snapshot(
        run_id="run_mask_002",
        vector_index_version="v2.3.1",
        raw_gray_config=gray_config,
        score=0.75,
        threshold=0.7,
        raw_mean_score=0.75,
        sample_size=50,
    )
    print(f"  是否已掩盖: {record_not_masked.small_sample_masked}")

    print("\n灰度配置与小样本掩盖的关系（给小许留底）：")
    rel = manager.get_masking_relationship(record_masked.record_id)
    print(f"  掩盖条件: {rel['masking_condition']}")
    for field, ref in rel['raw_field_references'].items():
        print(f"  {field}: {ref}")


def demo_decision_for_xu():
    print("\n" + "=" * 70)
    print("【示例7】给推荐算法小许的决策输出 - 补材料/放行")
    print("=" * 70)

    manager = VectorIndexSnapshotManager()

    def sample_link_gen(sid):
        return f"https://sample-db.com/{sid}"

    manager.register_evidence_link_generator("internal_db", sample_link_gen)

    config_rows = [
        {
            "run_id": "run_final_001",
            "vector_index_version": "v2.4.0",
            "score": 0.88,
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_final_002",
            "vector_index_version": "v2.4.0",
            "score": 0.72,
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_final_001",
            "vector_index_version": "v2.4.0",
            "score": 0.95,
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_final_003",
            "vector_index_version": "v2.4.0",
            "score": "invalid",
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_final_004",
            "vector_index_version": "v2.4.0",
            "score": 0.55,
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
        },
        {
            "run_id": "run_final_005",
            "vector_index_version": "v2.4.0",
            "score": 0.75,
            "threshold": 0.7,
            "阈值": 0.7,
            "小样本量": 30,
            "均值覆盖比": 0.8,
            "raw_mean_score": 0.55,
            "sample_size": 5,
        },
    ]

    print(f"\n处理 {len(config_rows)} 条记录...")
    records = manager.create_snapshots_from_configs(config_rows)

    for idx, rec in enumerate(records):
        if idx in [0, 1, 4]:
            manager.add_sample_evidence(
                record_id=rec.record_id,
                sample_id=f"SAMPLE_{idx:03d}",
                sample_content={"query": f"test_{idx}"},
                source_system="internal_db",
                features={
                    "query_text": f"查询{idx}",
                    "matched_item": f"商品{idx}",
                    "similarity_score": rec.score if isinstance(rec.score, (int, float)) else 0.5,
                },
            )

    decisions, summary = manager.process_all()

    print(summary)

    print("\n查看单条决策详情：")
    for d in decisions[:2]:
        print(d.to_human_readable())


def main():
    print("\n" + "🎯" * 35)
    print("向量索引版本快照系统 - 完整功能演示")
    print("🎯" * 35)

    demo_gray_config_field_mapping()
    demo_sample_evidence_chain()
    demo_duplicate_run_id()
    demo_bad_data_detection()
    demo_misjudged_sample_explanation()
    demo_small_sample_masking()
    demo_decision_for_xu()

    print("\n" + "=" * 70)
    print("✅ 所有示例运行完成！")
    print("=" * 70)


if __name__ == "__main__":
    main()
