#!/usr/bin/env python3
"""
琴房课时版本复核 - 验证脚本
测试边界样本、坏数据处理、旧版母带标记等功能
"""
import sys
import json
from app.review_engine import run_review
from app.rules import DEFAULT_CALCULATION_RULE

TEST_FOLDER = "./data/audio_folders/2026-06-15_琴房A_记录.txt"


def assert_equal(actual, expected, msg):
    if actual != expected:
        print(f"❌ {msg}")
        print(f"  期望: {expected}")
        print(f"  实际: {actual}")
        return False
    print(f"✅ {msg}")
    return True


def assert_in(item, container, msg):
    if item not in container:
        print(f"❌ {msg}")
        print(f"  找不到: {item}")
        return False
    print(f"✅ {msg}")
    return True


def main():
    print("=" * 60)
    print("琴房课时版本复核 - 边界样本验证")
    print("=" * 60)

    result = run_review(TEST_FOLDER, "2026-06-15_琴房A")

    print(f"\n复核ID: {result.review_id}")
    print(f"状态: {result.status}")
    print(f"总文件数: {result.total_files}")
    print(f"有效文件: {result.valid_files}")
    print(f"无效文件: {result.invalid_files}")
    print(f"异常数量: {len(result.anomalies)}")

    all_pass = True

    anomaly_types = [a.anomaly_type for a in result.anomalies]
    anomaly_lines = [a.raw_line for a in result.anomalies]
    anomaly_severity = {a.anomaly_type: a.severity for a in result.anomalies}

    print("\n--- 异常类型检测 ---")
    all_pass &= assert_in("旧版母带混入", anomaly_types, "检测到旧版母带混入")
    all_pass &= assert_in("格式错误", anomaly_types, "检测到格式错误行")
    all_pass &= assert_in("缺失字段", anomaly_types, "检测到缺失字段")
    all_pass &= assert_in("日期格式错误", anomaly_types, "检测到日期格式错误")
    all_pass &= assert_in("日期异常", anomaly_types, "检测到日期异常")
    all_pass &= assert_in("分数异常-过高", anomaly_types, "检测到极端高分")
    all_pass &= assert_in("分数异常-过低", anomaly_types, "检测到极端低分")
    all_pass &= assert_in("重复记录", anomaly_types, "检测到重复记录")

    print("\n--- 原始行回溯验证 ---")
    all_pass &= assert_in(7, anomaly_lines, "旧版母带在第7行被标记")
    all_pass &= assert_in(8, anomaly_lines, "坏数据在第8行被标记")
    all_pass &= assert_in(9, anomaly_lines, "极端高分在第9行被标记")
    all_pass &= assert_in(10, anomaly_lines, "极端低分在第10行被标记")
    all_pass &= assert_in(13, anomaly_lines, "重复记录在第13行被标记")
    all_pass &= assert_in(15, anomaly_lines, "格式错误在第15行被标记")
    all_pass &= assert_in(16, anomaly_lines, "日期异常在第16行被标记")

    print("\n--- 母带处理验证 ---")
    master_tape_anomaly = [a for a in result.anomalies if a.anomaly_type == "旧版母带混入"]
    if master_tape_anomaly:
        all_pass &= assert_equal(
            master_tape_anomaly[0].severity, "critical",
            "旧版母带严重程度为 critical"
        )
        all_pass &= assert_equal(
            master_tape_anomaly[0].expected, "false（课时录音）",
            "期望值明确标记为课时录音"
        )
        all_pass &= assert_equal(
            master_tape_anomaly[0].actual, "true（母带录音）",
            "实际值明确标记为母带录音"
        )

    print("\n--- 进步记录验证 ---")
    progress_notes = [r.notes for r in result.progress_records if r.notes]
    all_pass &= assert_in("【旧版母带，不计入正常课时统计】", progress_notes, "母带记录有特殊标记")
    all_pass &= assert_in("【排练/授权使用，需额外确认】", progress_notes, "排练记录有特殊标记")

    print("\n--- 状态验证 ---")
    all_pass &= assert_equal(
        result.status, "异常-需立即处理",
        "因有critical级别异常，整体状态为需立即处理"
    )

    print("\n--- 计算口径关联 ---")
    all_pass &= assert_equal(
        result.calculation_rule.version, "v1.0",
        "计算口径版本正确关联"
    )

    print("\n--- 重跑和批注测试 ---")
    result2 = run_review(
        TEST_FOLDER, "2026-06-15_琴房A",
        previous_review_id=result.review_id,
        annotation="第10行已确认是排练授权，不计入统计",
        delivery_list_version="v1.2"
    )

    all_pass &= assert_equal(
        result2.previous_review_id, result.review_id,
        "重跑记录关联了旧版本ID"
    )
    all_pass &= assert_equal(
        result2.annotation, "第10行已确认是排练授权，不计入统计",
        "人工批注已保存"
    )
    all_pass &= assert_equal(
        result2.delivery_list_version, "v1.2",
        "交付清单版本已保存"
    )

    print("\n" + "=" * 60)
    if all_pass:
        print("✅ 所有验证通过")
    else:
        print("❌ 部分验证失败")
        sys.exit(1)

    print("\n--- 异常详情摘要 ---")
    for a in result.anomalies:
        print(f"  [{a.severity}] {a.anomaly_type}: 第{a.raw_line}行 - {a.file_name}")
        if a.field_name:
            print(f"    字段: {a.field_name}, 期望: {a.expected}, 实际: {a.actual}")

    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
