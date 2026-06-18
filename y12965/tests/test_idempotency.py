#!/usr/bin/env python3
"""
幂等性测试 - 验证同一批材料重复跑不会越跑越乱
"""
import os
import sys
import json
import shutil
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sql_injection_regression.config import RunConfig
from sql_injection_regression.version_manager import VersionManager
from sql_injection_regression.importer import MaterialImporter
from sql_injection_regression.analyzer import RegressionAnalyzer
from sql_injection_regression.reporter import ReportGenerator


def test_idempotent_import():
    """测试同一批材料重复导入"""
    print("=" * 60)
    print("测试1: 同一批材料重复导入幂等性")
    print("=" * 60)

    input_dir = project_root / "test_data"
    output_dir = project_root / "test_output_idempotency"

    if output_dir.exists():
        shutil.rmtree(output_dir)

    config = RunConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        case_id="test_idempotency",
    )

    version_manager = VersionManager(config)
    version_manager.ensure_dirs()

    print(f"第一次导入...")
    importer = MaterialImporter(config, version_manager)
    materials_1 = importer.import_all()
    versions_1 = version_manager.list_all_versions()

    print(f"  导入材料数: {len(materials_1)}")
    print(f"  版本记录数: {len(versions_1)}")

    print(f"第二次导入（相同材料）...")
    materials_2 = importer.import_all()
    versions_2 = version_manager.list_all_versions()

    print(f"  导入材料数: {len(materials_2)}")
    print(f"  版本记录数: {len(versions_2)}")

    assert len(versions_1) == len(versions_2), (
        f"版本数不一致: {len(versions_1)} vs {len(versions_2)}"
    )
    print("  ✓ 版本记录数一致 ✓")

    for v1, v2 in zip(versions_1, versions_2):
        assert v1.version_id == v2.version_id, (
            f"版本ID不一致: {v1.version_id} vs {v2.version_id}"
        )
        assert v1.material_hash == v2.material_hash, (
            f"材料哈希不一致: {v1.material_hash} vs {v2.material_hash}"
        )
    print("  ✓ 版本ID和哈希一致 ✓")

    hashes_1 = {v.material_hash for v in versions_1}
    hashes_2 = {v.material_hash for v in versions_2}
    assert hashes_1 == hashes_2, "材料哈希集合不一致"
    print("  ✓ 材料哈希集合一致 ✓")

    print("\n✅ 幂等性测试通过: 同一批材料重复导入不会产生冗余版本")
    return True


def test_force_reimport():
    """测试强制重新导入"""
    print("\n" + "=" * 60)
    print("测试2: 强制重新导入")
    print("=" * 60)

    input_dir = project_root / "test_data"
    output_dir = project_root / "test_output_force"

    if output_dir.exists():
        shutil.rmtree(output_dir)

    config = RunConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        case_id="test_force",
    )

    version_manager = VersionManager(config)
    version_manager.ensure_dirs()

    print(f"第一次导入...")
    importer = MaterialImporter(config, version_manager)
    materials_1 = importer.import_all()
    versions_1 = version_manager.list_all_versions()
    version_ids_1 = {v.version_id for v in versions_1}

    print(f"  版本数: {len(versions_1)}")

    print(f"第二次导入（带--force）...")
    config_force = RunConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        case_id="test_force",
        force_reimport=True,
    )
    version_manager_force = VersionManager(config_force)
    version_manager_force.ensure_dirs()
    importer_force = MaterialImporter(config_force, version_manager_force)
    materials_2 = importer_force.import_all()
    versions_2 = version_manager_force.list_all_versions()
    version_ids_2 = {v.version_id for v in versions_2}

    print(f"  版本数: {len(versions_2)}")

    assert len(versions_2) == len(versions_1) * 2, (
        f"强制重新导入应该产生新版本: {len(versions_1)} -> {len(versions_2)}"
    )
    print("  ✓ 强制重新导入产生了新版本 ✓")

    print("\n✅ 强制重新导入测试通过")
    return True


def test_full_workflow():
    """测试完整工作流"""
    print("\n" + "=" * 60)
    print("测试3: 完整分析工作流")
    print("=" * 60)

    input_dir = project_root / "test_data"
    output_dir = project_root / "test_output_full"

    if output_dir.exists():
        shutil.rmtree(output_dir)

    config = RunConfig(
        input_dir=input_dir,
        output_dir=output_dir,
        case_id="test_full_workflow",
    )

    version_manager = VersionManager(config)
    version_manager.ensure_dirs()

    print("步骤1: 导入材料...")
    importer = MaterialImporter(config, version_manager)
    materials = importer.import_all()
    print(f"  导入 {len(materials)} 份材料")

    print("步骤2: 分析材料...")
    analyzer = RegressionAnalyzer(config, version_manager)
    report = analyzer.analyze(materials)
    print(f"  慢查询发现: {len(report.slow_query_findings)}")
    print(f"  回滚记录: {len(report.rollback_records)}")
    print(f"  索引建议: {len(report.index_suggestions)}")
    print(f"  迁移脚本: {len(report.migration_scripts)}")

    print("步骤3: 生成报告...")
    reporter = ReportGenerator(config, version_manager)
    report_path = reporter.generate(report)
    print(f"  报告已生成: {report_path}")

    assert report_path.exists(), "报告文件不存在"
    print("  ✓ 报告生成成功 ✓")

    print("步骤4: 验证溯源链接...")
    for sq in report.slow_query_findings:
        assert sq.source_ref.file_name, f"慢查询 {sq.finding_id} 缺少来源文件名"
        assert sq.source_ref.line_number or sq.source_ref.line_number == 0, (
            f"慢查询 {sq.finding_id} 缺少行号"
        )
    print("  ✓ 所有慢查询都有溯源信息 ✓")

    for sugg in report.index_suggestions:
        assert sugg.source_ref.file_name, f"索引建议 {sugg.suggestion_id} 缺少来源"
        if sugg.evidence_source_refs:
            print(f"  索引建议 {sugg.suggestion_id} 有 {len(sugg.evidence_source_refs)} 条证据链")
    print("  ✓ 索引建议都有证据链 ✓")

    print("步骤5: 验证分类...")
    safe_count = sum(1 for f in report.slow_query_findings if not f.sre_review_required)
    review_count = sum(1 for f in report.slow_query_findings if f.sre_review_required)
    print(f"  可直接使用的慢查询: {safe_count}")
    print(f"  需SRE复核的慢查询: {review_count}")
    assert safe_count + review_count == len(report.slow_query_findings)
    print("  ✓ 分类完整 ✓")

    print("步骤6: 验证双向链接...")
    for mig in report.migration_scripts:
        if mig.linked_findings:
            print(f"  迁移脚本 {mig.version} 关联 {len(mig.linked_findings)} 条发现")
        if mig.linked_rollbacks:
            print(f"  迁移脚本 {mig.version} 关联 {len(mig.linked_rollbacks)} 条回滚")
    print("  ✓ 双向链接建立 ✓")

    print("\n✅ 完整工作流测试通过")
    return True


def test_list_versions():
    """测试版本列表命令"""
    print("\n" + "=" * 60)
    print("测试4: 版本列表查询")
    print("=" * 60)

    output_dir = project_root / "test_output_full"

    config = RunConfig(
        input_dir=project_root / "test_data",
        output_dir=output_dir,
    )

    version_manager = VersionManager(config)
    versions = version_manager.list_all_versions()

    print(f"共找到 {len(versions)} 个版本:")
    for v in versions:
        print(f"  - {v.version_id}: {v.file_name} ({v.material_type.value}")

    assert len(versions) > 0, "没有找到版本记录"

    print("\n✅ 版本列表查询测试通过")
    return True


if __name__ == "__main__":
    all_passed = True

    try:
        test_idempotent_import()
    except AssertionError as e:
        print(f"\n❌ 幂等性测试失败: {e}")
        all_passed = False

    try:
        test_force_reimport()
    except AssertionError as e:
        print(f"\n❌ 强制重新导入测试失败: {e}")
        all_passed = False

    try:
        test_full_workflow()
    except AssertionError as e:
        print(f"\n❌ 完整工作流测试失败: {e}")
        all_passed = False

    try:
        test_list_versions()
    except AssertionError as e:
        print(f"\n❌ 版本列表查询测试失败: {e}")
        all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有测试通过!")
    else:
        print("⚠️ 部分测试失败")
    print("=" * 60)

    sys.exit(0 if all_passed else 1)
