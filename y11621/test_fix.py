#!/usr/bin/env python3
"""验证修复的测试脚本"""

import tempfile
import os
import sys

from voucher_matcher.state_manager import StateManager
from voucher_matcher.matcher import MatchingEngine
from voucher_matcher.models import MatchStatus, DataSource, MatchRecord
from voucher_matcher.sample_data import load_sample_data


def test_enum_deserialization():
    """测试 Enum 反序列化"""
    print("=== 测试 1: Enum 反序列化 ===")
    temp_state = tempfile.mktemp(suffix='.json')

    sm1 = StateManager(state_file=temp_state)
    load_sample_data(sm1)
    engine = MatchingEngine()
    matches = engine.match_all(sm1.state.bank_flows, sm1.state.invoices, sm1.state.contracts)
    for m in matches:
        sm1.add_match(m)

    print(f"  第一次运行: {len(sm1.state.matches)} 条记录")
    m = sm1.state.matches[0]
    assert isinstance(m.status, MatchStatus), f"status 应为 MatchStatus，实际是 {type(m.status)}"
    assert isinstance(m.sources[0], DataSource), f"source 应为 DataSource，实际是 {type(m.sources[0])}"
    print(f"  ✓ 原始类型正确: status={type(m.status).__name__}, source={type(m.sources[0]).__name__}")

    sm2 = StateManager(state_file=temp_state)
    print(f"  重新加载后: {len(sm2.state.matches)} 条记录")
    m2 = sm2.state.matches[0]
    assert isinstance(m2.status, MatchStatus), f"反序列化后 status 应为 MatchStatus，实际是 {type(m2.status)}"
    assert isinstance(m2.sources[0], DataSource), f"反序列化后 source 应为 DataSource，实际是 {type(m2.sources[0])}"
    print(f"  ✓ 反序列化后类型正确: status={type(m2.status).__name__}, source={type(m2.sources[0]).__name__}")

    for i, m in enumerate(sm2.state.matches):
        _ = m.status.value
        for s in m.sources:
            _ = s.value
    print("  ✓ 所有记录的 .value 访问正常")

    os.unlink(temp_state)
    print("  ✓ Enum 反序列化测试通过\n")
    return True


def test_value_access_after_reload():
    """测试重新加载后 cli.py 中用到的 .value 访问"""
    print("=== 测试 2: CLI 相关的 .value 访问 ===")
    temp_state = tempfile.mktemp(suffix='.json')

    sm = StateManager(state_file=temp_state)
    load_sample_data(sm)
    engine = MatchingEngine()
    matches = engine.match_all(sm.state.bank_flows, sm.state.invoices, sm.state.contracts)
    for m in matches:
        sm.add_match(m)

    sm2 = StateManager(state_file=temp_state)

    print("  模拟 cli.py:120 的状态筛选...")
    status_filter = "已匹配"
    filtered = [m for m in sm2.state.matches if m.status.value == status_filter]
    print(f"    '已匹配' 筛选: {len(filtered)} 条")

    print("  模拟 cli.py:130 的状态显示...")
    for m in sm2.state.matches[:3]:
        status_text = m.status.value
        print(f"    {m.bank_flow_id}: {status_text}")

    print("  模拟 cli.py:418 的历史来源显示...")
    from voucher_matcher.models import HistoryEntry
    test_history = HistoryEntry(
        record_id="test",
        field_name="test",
        old_value="a",
        new_value="b",
        source=DataSource.MANUAL
    )
    sm2.add_history(test_history)
    sm2.save()

    sm3 = StateManager(state_file=temp_state)
    assert isinstance(sm3.state.history[0].source, DataSource)
    print(f"    历史记录 source: {sm3.state.history[0].source.value}")

    print("  模拟 cli.py:68 的统计...")
    stats = {
        'matched': len([m for m in sm3.state.matches if m.status == MatchStatus.MATCHED]),
        'conflict': len([m for m in sm3.state.matches if m.status == MatchStatus.CONFLICT]),
        'pending': len([m for m in sm3.state.matches if m.status == MatchStatus.PENDING]),
        'red': len([m for m in sm3.state.matches if m.status == MatchStatus.RED_INVOICE]),
    }
    print(f"    统计结果: {stats}")

    os.unlink(temp_state)
    print("  ✓ CLI .value 访问测试通过\n")
    return True


def test_split_and_merge():
    """测试拆分和合并功能"""
    print("=== 测试 3: 拆分和合并功能 ===")
    temp_state = tempfile.mktemp(suffix='.json')

    sm = StateManager(state_file=temp_state)
    load_sample_data(sm)
    engine = MatchingEngine()

    match_to_split = MatchRecord(
        bank_flow_id="BF_TEST",
        matched_amount=22600.00,
        status=MatchStatus.MATCHED,
        match_score=85,
        match_method="测试拆分",
        sources=[DataSource.BANK],
    )
    sm.add_match(match_to_split)

    print(f"  拆分前: {match_to_split.bank_flow_id}, 金额 {match_to_split.matched_amount}")
    new_matches = engine.split_match(match_to_split, [10000.00, 12600.00], sm.state.invoices)
    print(f"  拆分为 {len(new_matches)} 条: {[m.matched_amount for m in new_matches]}")
    assert len(new_matches) == 2
    assert sum(m.matched_amount for m in new_matches) == 22600.00

    for nm in new_matches:
        sm.add_match(nm)

    print("  测试合并...")
    target = new_matches[0]
    source = [new_matches[1]]
    merged, histories = engine.merge_matches(target, source)
    print(f"  合并后金额: {merged.matched_amount}")
    print(f"  合并后状态: {merged.status.value}")
    print(f"  合并标记: {merged.flags}")
    print(f"  历史记录数: {len(histories)}")
    assert merged.matched_amount == 22600.00
    assert merged.status == MatchStatus.MANUAL
    assert "合并付款" in merged.flags
    assert len(histories) == 2

    os.unlink(temp_state)
    print("  ✓ 拆分和合并测试通过\n")
    return True


def test_full_cli_flow():
    """测试完整的 CLI 流程"""
    print("=== 测试 4: 完整状态恢复 ===")
    temp_state = tempfile.mktemp(suffix='.json')

    print("  会话1: 加载数据、匹配、人工确认...")
    sm1 = StateManager(state_file=temp_state)
    load_sample_data(sm1)
    engine = MatchingEngine()
    matches = engine.match_all(sm1.state.bank_flows, sm1.state.invoices, sm1.state.contracts)
    for m in matches:
        sm1.add_match(m)

    conflict_match = next(m for m in sm1.state.matches if m.status == MatchStatus.CONFLICT)
    print(f"  找到冲突记录: {conflict_match.bank_flow_id}, 候选发票: {conflict_match.invoice_ids}")

    updated, history = engine.manual_confirm(conflict_match, conflict_match.invoice_ids[0])
    sm1.update_match(updated)
    sm1.add_history(history)
    print(f"  人工确认为: {updated.invoice_ids}, 状态: {updated.status.value}")

    sm1.save()

    print("\n  会话2: 重新启动，验证状态恢复...")
    sm2 = StateManager(state_file=temp_state)
    print(f"  匹配记录数: {len(sm2.state.matches)}")
    print(f"  历史记录数: {len(sm2.state.history)}")

    reloaded = next(m for m in sm2.state.matches if m.bank_flow_id == conflict_match.bank_flow_id)
    print(f"  冲突记录状态: {reloaded.status.value}")
    print(f"  确认的发票: {reloaded.invoice_ids}")
    print(f"  版本号: {reloaded.version}")

    assert reloaded.status == MatchStatus.MANUAL
    assert reloaded.invoice_ids == [conflict_match.invoice_ids[0]]
    assert reloaded.version == 2

    assert len(sm2.state.history) == 1
    h = sm2.state.history[0]
    assert isinstance(h.source, DataSource)
    print(f"  历史记录来源: {h.source.value}")

    os.unlink(temp_state)
    print("  ✓ 完整状态恢复测试通过\n")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("银行流水凭证匹配工具 - 修复验证测试")
    print("=" * 60 + "\n")

    tests = [
        test_enum_deserialization,
        test_value_access_after_reload,
        test_split_and_merge,
        test_full_cli_flow,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            failed += 1
            print(f"  ❌ 失败: {e}\n")
            import traceback
            traceback.print_exc()

    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
