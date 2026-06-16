# -*- coding: utf-8 -*-
"""简单测试脚本，验证核心功能"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from context_truncation_audit.core import TruncationAuditor, TruncationReason
from context_truncation_audit.versioning import VersionTracker


def test_basic_audit():
    print("=" * 50)
    print("测试1：基本截断审计")
    print("=" * 50)
    
    auditor = TruncationAuditor(max_tokens=50, context_window=100)
    
    short_text = "这是一段很短的文字。"
    result = auditor.audit_record("TEST-001", short_text)
    print(f"短文本 - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    assert not result.is_truncated, "短文本不应该被截断"
    
    long_text = "非常长的文本。" * 100
    result = auditor.audit_record("TEST-002", long_text)
    print(f"长文本 - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    print(f"   Token数: {result.token_count}, 字符数: {result.char_count}")
    
    empty_text = ""
    result = auditor.audit_record("TEST-003", empty_text)
    print(f"空文本 - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    assert result.is_truncated, "空文本应该被标记为不完整"
    
    print("✅ 基本审计测试通过\n")


def test_manual_note():
    print("=" * 50)
    print("测试2：人工备注检测")
    print("=" * 50)
    
    auditor = TruncationAuditor()
    text = "一些正常内容"
    
    result = auditor.audit_record("TEST-101", text, manual_note="这里内容被截断了")
    print(f"备注含'截断' - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    assert result.is_truncated
    assert result.reason == TruncationReason.MANUAL_TRUNCATION
    
    result = auditor.audit_record("TEST-102", text, manual_note="部分省略")
    print(f"备注含'省略' - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    assert result.is_truncated
    
    result = auditor.audit_record("TEST-103", text, manual_note="已审核通过")
    print(f"正常备注 - 是否截断: {result.is_truncated}")
    assert not result.is_truncated
    
    print("✅ 人工备注测试通过\n")


def test_tool_call_error():
    print("=" * 50)
    print("测试3：工具调用参数错误")
    print("=" * 50)
    
    auditor = TruncationAuditor()
    text = "正常的查询内容"
    
    result = auditor.audit_record(
        "TEST-201", 
        text, 
        metadata={"tool_call_error": True, "tool_call_error_detail": "参数类型错误"}
    )
    print(f"参数错误 - 是否截断: {result.is_truncated}, 原因: {result.reason.value}")
    print(f"   详细说明: {result.reason_detail}")
    assert result.is_truncated
    assert result.reason == TruncationReason.TOOL_CALL_ERROR
    
    print("✅ 工具调用错误测试通过\n")


def test_version_tracking():
    print("=" * 50)
    print("测试4：版本追踪和对比")
    print("=" * 50)
    
    tracker = VersionTracker()
    
    tracker.add_version(
        record_id="VER-001",
        is_truncated=True,
        reason="token超限",
        reason_detail="Token数量超过限制",
        severity="high",
        auditor="system",
        change_summary="初始版本",
    )
    
    tracker.add_version(
        record_id="VER-001",
        is_truncated=False,
        reason="人工复核-不截断",
        reason_detail="人工复核后确认内容完整",
        severity="low",
        auditor="人工复核",
        change_summary="人工修正判断",
    )
    
    latest = tracker.get_latest("VER-001")
    print(f"最新版本: v{latest.version}, 审计人: {latest.auditor}")
    print(f"是否截断: {latest.is_truncated}")
    
    diff = tracker.compare_versions("VER-001")
    print(f"\n版本对比 - 变更数量: {diff['change_count']}")
    for field, change in diff["changes"].items():
        print(f"  {field}: {change['旧值']} → {change['新值']}")
    
    assert diff["has_changes"]
    assert "是否截断" in diff["changes"]
    
    changed_records = tracker.get_changed_records()
    print(f"\n有变更的记录数: {len(changed_records)}")
    
    print("✅ 版本追踪测试通过\n")


def test_edge_cases():
    print("=" * 50)
    print("测试5：边界案例（工具调用参数错误）")
    print("=" * 50)
    
    auditor = TruncationAuditor()
    text = "查询用户信息"
    
    edge_cases = [
        ("参数类型错误", {"tool_call_error": True, "tool_call_error_detail": "期望string实际是number"}),
        ("缺少必填参数", {"tool_call_error": True, "tool_call_error_detail": "缺少file_path参数"}),
        ("参数值非法", {"tool_call_error": True, "tool_call_error_detail": "max_results不能为负数"}),
    ]
    
    for name, metadata in edge_cases:
        result = auditor.audit_record(f"EDGE-{name}", text, metadata=metadata)
        print(f"{name} - 截断: {result.is_truncated}, 原因: {result.reason.value}")
        assert result.is_truncated, f"{name} 应该被判定为截断"
        assert result.reason == TruncationReason.TOOL_CALL_ERROR
    
    print("\n这3个边界案例都会真实改变判断结果：")
    print("  - 正常调用 → 不截断")
    print("  - 参数错误 → 截断（工具调用失败）")
    
    print("✅ 边界案例测试通过\n")


def test_statistics():
    print("=" * 50)
    print("测试6：统计功能")
    print("=" * 50)
    
    auditor = TruncationAuditor(max_tokens=30)
    
    records = [
        {"id": "S-001", "original_text": "短文本"},
        {"id": "S-002", "original_text": "非常长的文本" * 20},
        {"id": "S-003", "original_text": ""},
        {"id": "S-004", "original_text": "中等长度的内容，测试一下"},
        {"id": "S-005", "original_text": "又是一段超长的内容" * 15},
    ]
    
    results = auditor.audit_batch(records)
    stats = auditor.get_statistics(results)
    
    print(f"总记录数: {stats['总记录数']}")
    print(f"截断记录数: {stats['截断记录数']}")
    print(f"截断率: {stats['截断率']}")
    print(f"按原因统计: {stats['按原因统计']}")
    
    assert stats["总记录数"] == 5
    
    print("✅ 统计功能测试通过\n")


if __name__ == "__main__":
    print("\n" + "🚀 " * 10 + "开始测试" + " 🚀" * 10 + "\n")
    
    try:
        test_basic_audit()
        test_manual_note()
        test_tool_call_error()
        test_version_tracking()
        test_edge_cases()
        test_statistics()
        
        print("=" * 50)
        print("🎉 所有测试通过！")
        print("=" * 50)
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
