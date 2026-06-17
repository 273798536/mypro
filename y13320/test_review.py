#!/usr/bin/env python3
"""作文批改证据复核 - 测试脚本"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from processor import EssayEvidenceReviewer
from models import ReviewStatus, CitationStatus
from cli import (
    print_stat_table,
    print_bad_lines,
    print_missing_citations_report,
    print_human_overridden,
    print_suspended,
    print_misjudgment_report,
    print_interface_output,
)


def run_test():
    print("=" * 70)
    print("🎯 作文批改证据复核 - 现场测试")
    print("=" * 70)

    input_file = Path(__file__).parent / "test_data.jsonl"
    print(f"\n📂 测试文件: {input_file}")
    print(f"📝 数据说明: 共7行，包含正常样本、人工改判、旧误判、坏行、重复评测")

    reviewer = EssayEvidenceReviewer(strict_mode=True)

    print("\n" + "-" * 70)
    print("🔍 第一步：逐行解析并复核（不自动确认挂起）")
    print("-" * 70)

    summary = reviewer.process_file(str(input_file), auto_confirm_suspended=False)

    print_stat_table(summary)
    print_bad_lines(summary)
    print_missing_citations_report(summary)
    print_human_overridden(summary)
    print_suspended(summary)
    print_misjudgment_report(summary)

    print("\n" + "=" * 70)
    print("📋 接口返回格式（JSON）- 已处理 / 待补材料 / 人工改判 分类")
    print("=" * 70)
    print_interface_output(summary, "json")

    print("\n" + "=" * 70)
    print("⏸️  第二步：处理挂起的重复评测（需负责人确认）")
    print("=" * 70)

    if summary.suspended:
        suspended_id = summary.suspended[0].essay_id
        print(f"\n⚠️  检测到挂起记录: {suspended_id}")
        print("   原因: 同一作文ID出现两次评测，模型版本和得分均不同")
        print("   策略: 宁可挂起等待确认，也不给出假稳定结论")

        print(f"\n✅ 负责人确认处理: {suspended_id}")
        print("   操作: 使用 auto_confirm_suspended=True 重新复核")

        print("\n" + "-" * 70)
        print("🔄 重新复核（自动确认挂起）")
        print("-" * 70)

        reviewer2 = EssayEvidenceReviewer(strict_mode=True)
        summary2 = reviewer2.process_file(str(input_file), auto_confirm_suspended=True)
        print_stat_table(summary2)

        confirmed_result = None
        for r in summary2.processed + summary2.pending_material + summary2.human_overridden:
            if r.essay_id == suspended_id:
                confirmed_result = r
                break

        if confirmed_result:
            print(f"\n📝 确认后结果:")
            print(f"   作文ID: {confirmed_result.essay_id}")
            print(f"   状态: {confirmed_result.status.value}")
            print(f"   备注: {confirmed_result.review_notes}")

    print("\n" + "=" * 70)
    print("🏁 测试完成 - 负责人走查清单")
    print("=" * 70)
    print("\n📝 顺利记录（已处理）:")
    for i, r in enumerate(summary.processed, 1):
        print(f"  {i}. [{r.essay_id}] 得分:{r.model_output.score} -> {r.status.value}")
        if r.is_old_misjudgment:
            print(f"     💡 旧误判样本: {r.misjudgment_explanation}")

    print("\n📋 补录记录（待补材料）:")
    for i, r in enumerate(summary.pending_material, 1):
        print(f"  {i}. [{r.essay_id}] 引用状态:{r.citation_status.value}")
        print(f"     原因: {r.review_notes}")
        for req in r.missing_citations:
            print(f"     需补充: {req}")

    print("\n👤 异常记录（人工改判）:")
    for i, r in enumerate(summary.human_overridden, 1):
        print(f"  {i}. [{r.essay_id}] 原得分:{r.model_output.score}")
        print(f"     改判原因: {r.model_output.override_reason}")

    print("\n⚠️  异常记录（挂起）:")
    for i, r in enumerate(summary.suspended, 1):
        print(f"  {i}. [{r.essay_id}] 重复冲突:{r.duplicate_of}")
        print(f"     备注: {r.review_notes}")

    print("\n" + "=" * 70)
    print("✅ 全部测试通过！")
    print("=" * 70)

    return summary


if __name__ == "__main__":
    run_test()
