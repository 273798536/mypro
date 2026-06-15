#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.models import (
        AudioFile, AudioFolder, ProgressMetrics, StudentProgress,
        Anomaly, ReviewResult, CalculationRule, AnnotationRequest, ReviewResponse
    )
    print("✅ models 导入成功")
except Exception as e:
    print(f"❌ models 导入失败: {e}")
    sys.exit(1)

try:
    from app.rules import DEFAULT_CALCULATION_RULE
    print("✅ rules 导入成功")
except Exception as e:
    print(f"❌ rules 导入失败: {e}")
    sys.exit(1)

try:
    from app.parser import parse_audio_folder
    print("✅ parser 导入成功")
except Exception as e:
    print(f"❌ parser 导入失败: {e}")
    sys.exit(1)

try:
    from app.review_engine import run_review
    print("✅ review_engine 导入成功")
except Exception as e:
    print(f"❌ review_engine 导入失败: {e}")
    sys.exit(1)

try:
    from app.chart_builder import build_chart_data, compare_versions
    print("✅ chart_builder 导入成功")
except Exception as e:
    print(f"❌ chart_builder 导入失败: {e}")
    sys.exit(1)

try:
    from app.storage import review_store, folder_store
    print("✅ storage 导入成功")
except Exception as e:
    print(f"❌ storage 导入失败: {e}")
    sys.exit(1)

print("\n=== 所有模块导入成功，开始业务逻辑测试 ===")

TEST_FOLDER = "./data/audio_folders/2026-06-15_琴房A_记录.txt"

print("\n1. 测试解析音频文件夹...")
folder, anomalies = parse_audio_folder(TEST_FOLDER, "2026-06-15_琴房A")
print(f"   解析文件数: {len(folder.files)}")
print(f"   解析异常数: {len(anomalies)}")

anomaly_types = set(a.anomaly_type for a in anomalies)
print(f"   异常类型: {anomaly_types}")

expected_anomalies = {"格式错误", "缺失字段", "日期异常", "日期格式错误", "旧版母带混入"}
missing = expected_anomalies - anomaly_types
if missing:
    print(f"❌ 缺少异常类型: {missing}")
else:
    print(f"✅ 所有预期异常类型都已检测到")

print("\n2. 测试复核核心逻辑...")
result = run_review(TEST_FOLDER, "2026-06-15_琴房A")
print(f"   复核ID: {result.review_id}")
print(f"   状态: {result.status}")
print(f"   总异常数: {len(result.anomalies)}")

all_anomaly_types = set(a.anomaly_type for a in result.anomalies)
print(f"   全部异常类型: {all_anomaly_types}")

expected_full = {
    "格式错误", "缺失字段", "日期异常", "日期格式错误",
    "旧版母带混入", "分数异常-过高", "分数异常-过低", "重复记录"
}
missing_full = expected_full - all_anomaly_types
if missing_full:
    print(f"❌ 缺少异常类型: {missing_full}")
    sys.exit(1)
else:
    print(f"✅ 所有预期异常类型都已检测到")

print("\n3. 测试边界样本处理...")
master_anomalies = [a for a in result.anomalies if a.anomaly_type == "旧版母带混入"]
if master_anomalies and master_anomalies[0].severity == "critical":
    print(f"✅ 旧版母带标记为 critical，第{master_anomalies[0].raw_line}行")
    master_record = [r for r in result.progress_records if r.raw_line == master_anomalies[0].raw_line]
    if master_record and "旧版母带" in (master_record[0].notes or ""):
        print(f"✅ 母带记录有特殊备注: {master_record[0].notes}")
    else:
        print(f"❌ 母带记录缺少备注")
        sys.exit(1)
else:
    print(f"❌ 旧版母带处理不正确")
    sys.exit(1)

rehearsal_records = [r for r in result.progress_records if "排练" in (r.notes or "")]
if rehearsal_records:
    print(f"✅ 排练记录有特殊标记，第{rehearsal_records[0].raw_line}行")
else:
    print(f"❌ 排练记录未标记")

print("\n4. 测试原始行回溯...")
anomaly_lines = {a.raw_line for a in result.anomalies}
expected_lines = {7, 8, 9, 10, 13, 15, 16}
missing_lines = expected_lines - anomaly_lines
if missing_lines:
    print(f"❌ 缺少原始行标记: {missing_lines}")
    sys.exit(1)
else:
    print(f"✅ 所有边界样本都已标记到原始行: {sorted(anomaly_lines & expected_lines)}")

print("\n5. 测试计算口径关联...")
for a in result.anomalies:
    if not hasattr(a, 'folder_path') or not hasattr(a, 'raw_line'):
        print(f"❌ 异常缺少回溯字段: {a}")
        sys.exit(1)
print(f"✅ 所有异常都包含 folder_path 和 raw_line 回溯字段")

print("\n6. 测试重跑和批注...")
result2 = run_review(
    TEST_FOLDER, "2026-06-15_琴房A",
    previous_review_id=result.review_id,
    annotation="第10行是排练授权，第7行是旧版母带已确认",
    delivery_list_version="v1.2"
)

if result2.previous_review_id == result.review_id:
    print(f"✅ 新版本关联了旧版本ID: {result.review_id}")
else:
    print(f"❌ 版本关联失败")
    sys.exit(1)

if result2.annotation and result2.delivery_list_version:
    print(f"✅ 人工批注和交付清单版本已保存")
    print(f"   批注: {result2.annotation}")
    print(f"   交付清单: {result2.delivery_list_version}")
else:
    print(f"❌ 批注或版本未保存")
    sys.exit(1)

print("\n7. 测试图表数据构建...")
chart_data = build_chart_data(result)
if "students" in chart_data and "anomalies" in chart_data:
    print(f"✅ 图表数据构建成功")
    for a in chart_data["anomalies"]:
        if "click_back" in a:
            print(f"   异常点含 click_back: {a['click_back']['raw_line']}")
            break
else:
    print(f"❌ 图表数据不完整")
    sys.exit(1)

print("\n8. 测试版本对照...")
comparison = compare_versions(result2, result)
if "score_diffs" in comparison and "new_anomalies" in comparison:
    print(f"✅ 版本对照功能正常")
    print(f"   新旧状态对比: {comparison['previous_status']} -> {comparison['current_status']}")
    print(f"   新旧批注对比: {comparison['previous_annotation']} -> {comparison['current_annotation']}")
else:
    print(f"❌ 版本对照功能异常")
    sys.exit(1)

print("\n9. 测试状态判定...")
if result.status == "异常-需立即处理":
    print(f"✅ 含critical异常的复核状态正确: {result.status}")
else:
    print(f"❌ 状态判定错误，期望'异常-需立即处理'，实际: {result.status}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 所有测试通过！")
print("=" * 60)

print("\n=== 异常详情摘要 ===")
for a in sorted(result.anomalies, key=lambda x: x.raw_line):
    severity_icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(a.severity, "⚪")
    print(f"{severity_icon} 第{a.raw_line:2d}行 [{a.severity:8s}] {a.anomaly_type:12s}: {a.file_name}")
    if a.field_name:
        print(f"     字段: {a.field_name}, 期望: {a.expected}, 实际: {a.actual}")

print("\n=== 学生进步记录摘要 ===")
for r in sorted(result.progress_records, key=lambda x: x.raw_line):
    note = f" ({r.notes})" if r.notes else ""
    print(f"  第{r.raw_line:2d}行 {r.student_name:4s} -> {r.metrics.overall_score:5.1f}分 {r.track_name}{note}")

print("\n=== 版本链 ===")
print(f"  V1: {result.review_id} ({result.status})")
print(f"  V2: {result2.review_id} ({result2.status}) <- 基于 V1")
print(f"  批注: {result2.annotation}")
print(f"  交付清单: {result2.delivery_list_version}")
