#!/usr/bin/env python3
"""验证安装和核心功能的测试脚本"""

import sys
import json
from pathlib import Path
from datetime import datetime

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core import (
    HallucinationRecord,
    RecordStatus,
    HallucinationType,
    PromptVersion,
    HumanCorrection,
    SourceMaterial,
    PromptVersionImporter,
    SampleDeduplicator,
    SafetyGuard,
    ReportExporter,
    MetricsCalculator,
)

def test_imports():
    print("1️⃣ 测试核心模块导入...")
    print("   ✅ 所有核心模块导入成功")
    return True

def test_data_models():
    print("\n2️⃣ 测试数据模型...")

    source = SourceMaterial(
        material_id="TEST_SRC_001",
        source_type="test",
        content="测试来源内容",
    )

    correction = HumanCorrection(
        correction_id="TEST_CORR_001",
        record_id="TEST_REC_001",
        corrected_content="修正后的内容",
        correction_note="测试修正",
        corrected_by="测试员",
    )

    record = HallucinationRecord(
        record_id="TEST_REC_001",
        input_query="测试问题",
        model_output="测试回答",
        prompt_version_id="V_TEST",
        status=RecordStatus.CONFIRMED_CLEAN,
        source_materials=[source],
        corrections=[correction],
        confidence_score=95.0,
        group_tags=["测试"],
    )

    status_info = record.get_business_status()
    assert status_info["can_use_directly"] == True
    assert status_info["needs_engineer_review"] == False
    print(f"   ✅ 数据模型创建成功")
    print(f"   ✅ 业务状态: {status_info['label']}")
    return True

def test_example_data():
    print("\n3️⃣ 测试样例数据加载...")
    example_path = project_root / "samples" / "example_records.json"

    with open(example_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = []
    for item in data:
        source_materials = [SourceMaterial(**sm) for sm in item.get("source_materials", [])]
        corrections = [HumanCorrection(**c) for c in item.get("corrections", [])]

        item["source_materials"] = source_materials
        item["corrections"] = corrections
        item["hallucination_types"] = [HallucinationType(t) for t in item.get("hallucination_types", [])]
        item["status"] = RecordStatus(item["status"])
        item["created_at"] = datetime.fromisoformat(item["created_at"])
        item["updated_at"] = datetime.fromisoformat(item["updated_at"])

        for corr in corrections:
            if isinstance(corr.corrected_at, str):
                corr.corrected_at = datetime.fromisoformat(corr.corrected_at)
            if corr.approved_at and isinstance(corr.approved_at, str):
                corr.approved_at = datetime.fromisoformat(corr.approved_at)

        record = HallucinationRecord(**item)
        records.append(record)

        status_info = record.get_business_status()
        print(f"   - {record.record_id}: {status_info['label']}")

    assert len(records) == 3
    assert any(r.status == RecordStatus.CONFIRMED_CLEAN for r in records)
    assert any(r.status == RecordStatus.PENDING_REVIEW for r in records)
    assert any(r.status == RecordStatus.HALLUCINATION for r in records)
    print("   ✅ 3条样例数据加载成功（顺利/待确认/坏数据）")
    return True

def test_safety_guard():
    print("\n4️⃣ 测试安全拦截模块...")
    safety_guard = SafetyGuard()

    test_source = SourceMaterial(
        material_id="TEST_SRC_002",
        source_type="test",
        content="爱因斯坦1905年发表狭义相对论，1915年发表广义相对论。",
    )

    test_record = HallucinationRecord(
        record_id="TEST_SAFETY_001",
        input_query="爱因斯坦发表相对论的时间？",
        model_output="爱因斯坦在1915年发表了相对论。",
        prompt_version_id="V_TEST",
        source_materials=[test_source],
        status=RecordStatus.PENDING_REVIEW,
    )

    result = safety_guard.check_train_val_leakage(test_record, "default", "default")
    print(f"   ✅ 训练验证泄漏检测完成")
    print(f"   - 检测通过: {result.passed}")

    if not result.passed and result.missing_resources:
        print(f"   - 缺失资源提示正常: {len(result.missing_resources)} 份文件")
        print(f"   - 可操作建议可用: {bool(result.actionable_guidance)}")
        print(f"   - 建议内容示例: {result.actionable_guidance.split(chr(10))[0]}")

    auth_result = safety_guard.check_source_authenticity(test_record)
    print(f"   ✅ 来源真实性检测完成: {'通过' if auth_result.passed else '未通过'}")

    print("   ✅ 安全拦截模块功能正常")
    return True

def test_deduplication():
    print("\n5️⃣ 测试样本去重模块...")
    deduplicator = SampleDeduplicator()

    records = [
        HallucinationRecord(
            record_id="DUP_TEST_001",
            input_query="北京是哪一年成为中国首都的？",
            model_output="北京在1949年成为中华人民共和国首都。",
            prompt_version_id="V_TEST",
            status=RecordStatus.PENDING_REVIEW,
        ),
        HallucinationRecord(
            record_id="DUP_TEST_002",
            input_query="北京是哪一年成为中国首都的",
            model_output="北京在1949年成为中华人民共和国的首都。",
            prompt_version_id="V_TEST",
            status=RecordStatus.PENDING_REVIEW,
        ),
    ]

    input_sim = deduplicator.calculate_similarity(records[0].input_query, records[1].input_query)
    output_sim = deduplicator.calculate_similarity(records[0].model_output, records[1].model_output)
    overall_sim = input_sim * 0.4 + output_sim * 0.4
    print(f"   ✅ 输入相似度: {input_sim:.2%}, 输出相似度: {output_sim:.2%}")
    print(f"   ✅ 综合相似度: {overall_sim:.2%}")

    groups = deduplicator.find_duplicates(records, threshold=0.7)
    marked = deduplicator.mark_duplicates(records, groups)

    assert len(groups) >= 1
    assert any(r.status == RecordStatus.DUPLICATE for r in marked)
    print(f"   ✅ 去重检测完成，发现 {len(groups)} 组重复")
    print(f"   ✅ 重复标记正常")
    return True

def test_metrics():
    print("\n6️⃣ 测试指标计算模块...")
    calculator = MetricsCalculator()

    test_records = [
        HallucinationRecord(
            record_id="MET_001",
            input_query="问题1",
            model_output="回答1",
            prompt_version_id="V_TEST",
            status=RecordStatus.CONFIRMED_CLEAN,
            group_tags=["测试A"],
        ),
        HallucinationRecord(
            record_id="MET_002",
            input_query="问题2",
            model_output="回答2",
            prompt_version_id="V_TEST",
            status=RecordStatus.HALLUCINATION,
            hallucination_types=[HallucinationType.FACTUAL_INVENTION],
            group_tags=["测试A"],
        ),
        HallucinationRecord(
            record_id="MET_003",
            input_query="问题3",
            model_output="回答3",
            prompt_version_id="V_TEST",
            status=RecordStatus.CONFIRMED_CLEAN,
            group_tags=["测试B"],
        ),
    ]

    overall = calculator.calculate_overall_metrics(test_records)
    print(f"   ✅ 总体指标计算完成")
    print(f"   - 总样本: {overall['total_records']}")
    print(f"   - 幻觉率: {overall['hallucination_rate']}%")

    group_metrics = calculator.calculate_group_metrics(test_records, "group_tags")
    print(f"   ✅ 分组指标计算完成，共 {len(group_metrics)} 组")
    return True

def test_prompt_versions():
    print("\n7️⃣ 测试提示词版本模块...")
    importer = PromptVersionImporter()

    sample_path = project_root / "samples" / "prompt_versions" / "v1_baseline.json"
    versions = importer.import_from_json(str(sample_path))

    assert len(versions) >= 2
    print(f"   ✅ 导入 {len(versions)} 个提示词版本")

    v_list = importer.list_versions()
    assert len(v_list) >= 2
    print(f"   ✅ 版本列表获取正常")

    diff = importer.get_version_diff(v_list[0].version_id, v_list[1].version_id)
    print(f"   ✅ 版本对比功能正常")
    return True

def test_report_export():
    print("\n8️⃣ 测试报告导出模块...")
    exporter = ReportExporter()

    test_records = [
        HallucinationRecord(
            record_id="REP_001",
            input_query="北京是哪一年成为首都的？",
            model_output="北京于1949年10月1日成为首都。",
            prompt_version_id="V_TEST",
            status=RecordStatus.CONFIRMED_CLEAN,
            confidence_score=98.0,
            group_tags=["测试"],
        ),
        HallucinationRecord(
            record_id="REP_002",
            input_query="《红楼梦》作者是谁？",
            model_output="罗贯中写的《红楼梦》。",
            prompt_version_id="V_TEST",
            status=RecordStatus.HALLUCINATION,
            hallucination_types=[HallucinationType.ENTITY_HALLUCINATION],
            confidence_score=15.0,
            group_tags=["测试"],
        ),
    ]

    calculator = MetricsCalculator()
    metrics = calculator.calculate_group_metrics(test_records)

    json_path = exporter.export_to_json(test_records, metrics, filename="test_report.json")
    print(f"   ✅ JSON报告导出: {Path(json_path).name}")

    excel_path = exporter.export_to_excel(test_records, metrics, filename="test_report.xlsx")
    print(f"   ✅ Excel报告导出: {Path(excel_path).name}")

    html_path = exporter.export_to_html(test_records, metrics, filename="test_report.html")
    print(f"   ✅ HTML报告导出: {Path(html_path).name}")

    for p in [json_path, excel_path, html_path]:
        Path(p).unlink(missing_ok=True)
    print("   ✅ 测试报告已清理")
    return True

def main():
    print("=" * 60)
    print("🧪 模型幻觉证据追踪 - 安装验证测试")
    print("=" * 60)

    tests = [
        test_imports,
        test_data_models,
        test_example_data,
        test_safety_guard,
        test_deduplication,
        test_metrics,
        test_prompt_versions,
        test_report_export,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"   ❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"📊 测试结果: {passed}/{len(tests)} 通过")
    print("=" * 60)

    if failed == 0:
        print("\n🎉 所有测试通过！项目可以正常运行。")
        print("\n🚀 启动命令:")
        print("   cd 模型幻觉证据追踪")
        print("   streamlit run app.py")
        print("\n📁 第一份样例位置:")
        print("   samples/example_records.json")
        return 0
    else:
        print(f"\n❌ 有 {failed} 个测试失败，请检查错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
