"""运行完整复核流程"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data import SampleDataLoader, create_field_sample_data
from src.review import CutPointReviewer, ReviewStatus


def test_full_workflow():
    """测试完整复核流程"""
    print("=" * 70)
    print("📊 图论割点边界复核 - 完整流程测试")
    print("=" * 70)
    print()

    print("步骤1：加载样例数据...")
    dataset = create_field_sample_data()
    print(f"✓ 已加载 {len(dataset.records)} 条样本记录")
    print()

    print("步骤2：检测数据完整性...")
    loader = SampleDataLoader()
    loader.save_to_json(dataset, "field_samples.json")
    reloaded = loader.load_from_json("field_samples.json")

    for orig, loaded in zip(dataset.records, reloaded.records):
        assert orig.checksum == loaded.checksum, f"{orig.sample_id} 校验和不匹配"
    print("✓ 数据校验通过，所有样本校验和一致")
    print()

    print("步骤3：检测重复样本...")
    duplicates = dataset.find_duplicates()
    if duplicates:
        print(f"⚠️  检测到 {len(duplicates)} 组重复样本：")
        for r1, r2 in duplicates:
            print(f"   {r1.sample_id} <-> {r2.sample_id}")
            print(f"   校验和：{r1.checksum}")
            print(f"   来源1：{r1.source}")
            print(f"   来源2：{r2.source}")
    else:
        print("✓ 未检测到重复样本")
    print()

    print("步骤4：运行割点复核...")
    print("-" * 70)
    reviewer = CutPointReviewer()
    summary = reviewer.review_dataset(dataset)

    print(reviewer.format_summary(summary))
    print("-" * 70)
    print()

    print("步骤5：输出详细复核报告...")
    print()
    for result in summary.results:
        print(reviewer.format_result(result))

    print("=" * 70)
    print("📋 测试验证：")
    print("-" * 70)

    all_passed = True

    sample001 = next(r for r in summary.results if r.record.sample_id == "SAMPLE-001")
    print(f"SAMPLE-001 状态：{sample001.status.display_name}")
    assert sample001.status == ReviewStatus.PENDING, "SAMPLE-001 应该因重复检测进入待确认状态"
    has_duplicate_issue = any("重复" in i.message for i in sample001.issues)
    assert has_duplicate_issue, "SAMPLE-001 应该有重复检测相关问题"
    print("✓ SAMPLE-001 正确进入待确认状态（因存在重复样本）")

    sample004 = next(r for r in summary.results if r.record.sample_id == "SAMPLE-004")
    print(f"SAMPLE-004 状态：{sample004.status.display_name}")
    assert sample004.status == ReviewStatus.PENDING, "SAMPLE-004 应该因重复标记进入待确认状态"
    is_dup_marked = sample004.record.is_duplicate
    assert is_dup_marked, "SAMPLE-004 应该被标记为重复样本"
    print("✓ SAMPLE-004 正确进入待确认状态（重复样本 + 有补录说明）")

    sample002 = next(r for r in summary.results if r.record.sample_id == "SAMPLE-002")
    print(f"SAMPLE-002 状态：{sample002.status.display_name}")
    assert sample002.status == ReviewStatus.PENDING, "SAMPLE-002 应该因边界样本进入待确认状态"
    has_boundary_note = sample002.record.boundary_flag
    has_supplementary = sample002.record.supplementary_note is not None
    assert has_boundary_note and has_supplementary, "SAMPLE-002 应该有边界标记和补录说明"
    print("✓ SAMPLE-002 正确进入待确认状态（边界样本 + 有补录说明）")

    sample005 = next(r for r in summary.results if r.record.sample_id == "SAMPLE-005")
    print(f"SAMPLE-005 状态：{sample005.status.display_name}")
    assert sample005.status == ReviewStatus.SAFE, "SAMPLE-005 应该是安全状态"
    assert sample005.match_expected, "SAMPLE-005 结果应该匹配"
    print("✓ SAMPLE-005 正确为安全状态（双连通图无割点）")

    sample006 = next(r for r in summary.results if r.record.sample_id == "SAMPLE-006")
    print(f"SAMPLE-006 状态：{sample006.status.display_name}")
    assert sample006.status == ReviewStatus.PENDING, "SAMPLE-006 应该因极端边界进入待确认状态"
    print("✓ SAMPLE-006 正确进入待确认状态（极端边界样本 + 有补录说明）")

    print("-" * 70)

    print(f"统计结果：安全 {summary.safe_count}，待确认 {summary.pending_count}，需补材料 {summary.missing_count}")
    pending_ids = [r.record.sample_id for r in summary.results if r.status == ReviewStatus.PENDING]
    print(f"待确认样本：{', '.join(pending_ids)}")

    assert "SAMPLE-004" in pending_ids, "重复样本必须进入复核分支！"
    print()
    print("🎉 所有测试通过！重复样本 SAMPLE-004 已正确进入待确认复核分支")
    print("=" * 70)

    return summary


if __name__ == "__main__":
    try:
        test_full_workflow()
    except AssertionError as e:
        print(f"\n❌ 测试失败：{e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 运行出错：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
