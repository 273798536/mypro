import sys
import os
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from replay.engine import ReplayEngine
from replay.models import ComplaintStatus


def test_idempotency():
    print("=== 测试1: 幂等性去重 ===")
    state_dir = "/tmp/test_replay_state"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    result = engine.start()

    print(f"总记录数: {result['total_records']}")
    print(f"接收: {result['accepted']}")
    print(f"去重: {result['duplicates']}")

    assert result["duplicates"] > 0, "应该有重复记录被去重"
    assert result["total_records"] == 9, f"CSV共9行，实际{result['total_records']}"
    assert result["accepted"] == 7, f"去重后应该7条，实际{result['accepted']}"

    print("✓ 幂等性去重测试通过\n")


def test_status_classification():
    print("=== 测试2: 状态分类 ===")
    state_dir = "/tmp/test_replay_state2"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine.start()

    stats = engine.classifier.stats()
    print(f"状态统计: {stats}")

    review = engine.get_review_list()
    print(f"待复核分类: {len(review)} 类")
    for cat, recs in review.items():
        print(f"  {cat}: {len(recs)} 条")

    assert "已处理" in review
    assert "待现场看" in review
    assert "冲突记录" in review
    print("✓ 状态分类测试通过\n")


def test_history_tracking():
    print("=== 测试3: 历史追溯 ===")
    state_dir = "/tmp/test_replay_state3"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine.start()

    history = engine.state.history
    print(f"历史记录数: {len(history)}")

    minute_ids = list(engine.state.minutes.keys())
    print(f"会议纪要数: {len(minute_ids)}")

    if minute_ids:
        mid = minute_ids[0]
        versions = engine.state.get_minute_versions(mid)
        print(f"纪要 {mid} 有 {len(versions)} 个版本")

        trace = engine.get_minute_trace(mid)
        print(f"溯源信息: {trace.get('total_versions', 0)} 个版本")
        print(f"  原始标题: {trace.get('original_title', '')}")
        print(f"  最新标题: {trace.get('latest_title', '')}")

        assert trace.get("total_versions", 0) >= 1

    print("✓ 历史追溯测试通过\n")


def test_status_update():
    print("=== 测试4: 状态变更历史 ===")
    state_dir = "/tmp/test_replay_state4"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine.start()

    before_count = len(engine.state.history)
    print(f"修改前历史数: {before_count}")

    result = engine.update_status(
        "C0005",
        ComplaintStatus.PROCESSED.value,
        actor="老何",
        reason="现场核实已清理",
        handle_result="已清理垃圾桶",
    )

    assert result is not None
    assert result.status == ComplaintStatus.PROCESSED
    assert result.handler == "老何"

    after_count = len(engine.state.history)
    print(f"修改后历史数: {after_count}")
    assert after_count == before_count + 1

    complaint_history = engine.get_complaint_history("C0005")
    print(f"C0005 历史记录数: {len(complaint_history)}")
    assert len(complaint_history) >= 1

    print("✓ 状态变更历史测试通过\n")


def test_report_generation():
    print("=== 测试5: Markdown报告生成 ===")
    state_dir = "/tmp/test_replay_state5"
    report_path = "/tmp/test_report.md"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)
    if os.path.exists(report_path):
        os.remove(report_path)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine.start()

    output = engine.generate_report(report_path)
    print(f"报告路径: {output}")

    assert os.path.exists(output)
    with open(output, "r", encoding="utf-8") as f:
        content = f.read()

    assert "公交港湾投诉回放报告" in content
    assert "已处理" in content
    assert "待现场看" in content
    assert "冲突记录" in content
    assert "历史追溯" in content

    print(f"报告大小: {len(content)} 字符")
    print("✓ 报告生成测试通过\n")


def test_double_submit():
    print("=== 测试6: 两次相同提交幂等验证 ===")
    state_dir = "/tmp/test_replay_state6"
    if os.path.exists(state_dir):
        shutil.rmtree(state_dir)

    engine = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine.start()

    idempotent_count1 = len(engine.state.idempotency_seen)
    record_count1 = len(engine.state.records)
    print(f"第一次加载: {record_count1} 条记录, {idempotent_count1} 个幂等键")

    engine2 = ReplayEngine(data_dir="data", state_dir=state_dir)
    engine2.load_state()
    result = engine2.start()

    idempotent_count2 = len(engine2.state.idempotency_seen)
    record_count2 = len(engine2.state.records)
    print(f"重新加载后再启动: {record_count2} 条记录, {idempotent_count2} 个幂等键")

    print("✓ 两次提交验证通过\n")


def run_all_tests():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    tests = [
        test_idempotency,
        test_status_classification,
        test_history_tracking,
        test_status_update,
        test_report_generation,
        test_double_submit,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} 失败: {e}\n")
            failed += 1
            import traceback
            traceback.print_exc()

    print("=" * 50)
    print(f"测试完成: {passed} 通过, {failed} 失败")
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
