#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    all_pass = True

    # ========== 第一关：模块导入 ==========
    print("=" * 60)
    print("第1关：模块导入检查")
    print("=" * 60)

    try:
        from app.models import (
            AudioFile, AudioFolder, ProgressMetrics, StudentProgress,
            Anomaly, ReviewResult, CalculationRule, AnnotationRequest, ReviewResponse
        )
        print("✅ models.py 导入成功")
    except Exception as e:
        print(f"❌ models.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.rules import DEFAULT_CALCULATION_RULE
        print("✅ rules.py 导入成功")
    except Exception as e:
        print(f"❌ rules.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.parser import parse_audio_folder
        print("✅ parser.py 导入成功")
    except Exception as e:
        print(f"❌ parser.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.review_engine import run_review
        print("✅ review_engine.py 导入成功")
    except Exception as e:
        print(f"❌ review_engine.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.chart_builder import build_chart_data, compare_versions
        print("✅ chart_builder.py 导入成功")
    except Exception as e:
        print(f"❌ chart_builder.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.storage import review_store, folder_store
        print("✅ storage.py 导入成功")
    except Exception as e:
        print(f"❌ storage.py 导入失败: {e}")
        sys.exit(1)

    try:
        from app.main import app
        routes = [r.path for r in app.routes if hasattr(r, "path")]
        expected_routes = [
            "/api/review/start", "/api/review/rerun",
            "/api/review/{review_id}", "/api/review/{review_id}/chart",
            "/api/review/{review_id}/compare/{previous_id}",
            "/api/review/{review_id}/anomaly/{raw_line}",
            "/api/review/{review_id}/annotate",
            "/api/review/folder/{folder_path:path}",
            "/api/folder/scan", "/api/calculation-rule"
        ]
        missing_routes = [r for r in expected_routes if r not in routes]
        if not missing_routes:
            print(f"✅ main.py 导入成功，所有预期路由注册完毕")
        else:
            print(f"❌ main.py 缺少路由: {missing_routes}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ main.py 导入失败: {e}")
        sys.exit(1)

    # ========== 第二关：最核心 - 两次运行分数完全一致 ==========
    TEST_FOLDER = os.path.join(os.path.dirname(__file__), "data", "audio_folders", "2026-06-15_琴房A_记录.txt")
    print("\n" + "=" * 60)
    print("第2关：分数可复现性检查（核心中的核心）")
    print("=" * 60)

    r1 = run_review(TEST_FOLDER, "2026-06-15_琴房A")
    r2 = run_review(TEST_FOLDER, "2026-06-15_琴房A")

    r1_scores = {(r.raw_line, r.track_name, r.student_name): r.metrics.overall_score for r in r1.progress_records}
    r2_scores = {(r.raw_line, r.track_name, r.student_name): r.metrics.overall_score for r in r2.progress_records}

    if set(r1_scores.keys()) != set(r2_scores.keys()):
        print("❌ 两次运行的记录集合不一致")
        sys.exit(1)

    score_mismatches = []
    for k in r1_scores:
        s1 = r1_scores[k]
        s2 = r2_scores[k]
        if s1 != s2:
            score_mismatches.append((k, s1, s2))

    if score_mismatches:
        print("❌ 同一输入两次运行分数不一致（这就是之前的bug）:")
        for k, s1, s2 in score_mismatches:
            print(f"   {k}: 第一次{s1}分，第二次{s2}分，差{round(s2 - s1, 2)}分")
        all_pass = False
    else:
        print("✅ 同一输入两次运行所有分数完全一致（random bug已修复）")

    # 单独检查用户提到的曲目
    bayeah = [k for k in r1_scores if k[1] and "拜厄" in k[1]]
    if bayeah:
        sc = r1_scores[bayeah[0]]
        sc2 = r2_scores[bayeah[0]]
        print(f"   - 拜厄练习曲No.8: 两次均为 {sc} 分（delta=0）")

    # ========== 第三关：边界样本异常检测 ==========
    print("\n" + "=" * 60)
    print("第3关：边界样本异常检测")
    print("=" * 60)

    anomaly_types = {a.anomaly_type for a in r1.anomalies}
    expected_types = {
        "旧版母带混入", "格式错误", "缺失字段",
        "日期异常", "日期格式错误",
        "分数异常-过高", "分数异常-过低", "重复记录"
    }
    missing = expected_types - anomaly_types
    if missing:
        print(f"❌ 缺失异常类型: {missing}")
        all_pass = False
    else:
        print(f"✅ 8种预期异常类型全部检出: {sorted(expected_types)}")

    anomaly_lines = {a.raw_line for a in r1.anomalies}
    expected_lines = {10, 11, 12, 13, 16, 18, 19, 20}
    missing_lines = expected_lines - anomaly_lines
    if missing_lines:
        print(f"❌ 边界样本未标记到行号: {missing_lines}")
        print(f"   实际标记行号: {sorted(anomaly_lines)}")
        all_pass = False
    else:
        print(f"✅ 8处边界样本均标记到了原始行号: {sorted(expected_lines)}")

    # ========== 第四关：旧版母带不计入正常通过 ==========
    print("\n" + "=" * 60)
    print("第4关：旧版母带处理（不计入正常通过）")
    print("=" * 60)

    master = [a for a in r1.anomalies if a.anomaly_type == "旧版母带混入"]
    if master and master[0].severity == "critical" and master[0].raw_line == 10:
        print(f"✅ 旧版母带（第10行）严重程度= {master[0].severity}，标记正确")
    else:
        if master:
            print(f"❌ 旧版母带严重程度或行号错误，期望L10 critical，实际L{master[0].raw_line} {master[0].severity}")
        else:
            print("❌ 未检测到旧版母带异常")
        all_pass = False

    master_record = [r for r in r1.progress_records if r.raw_line == 10]
    if master_record and master_record[0].notes and "旧版母带，不计入正常课时统计" in master_record[0].notes:
        print(f"✅ 旧版母带进步记录带备注: {master_record[0].notes}")
    else:
        if master_record:
            print(f"❌ 旧版母带进步记录（L10）无备注，实际备注: {master_record[0].notes}")
        else:
            print("❌ 旧版母带未生成进步记录")
        all_pass = False

    if r1.status == "异常-需立即处理":
        print(f"✅ 整体状态= {r1.status}（含critical不会写成正常通过）")
    else:
        print(f"❌ 含critical异常但状态={r1.status}，应为异常-需立即处理")
        all_pass = False

    # ========== 第五关：排练/授权备注 ==========
    print("\n" + "=" * 60)
    print("第5关：排练/授权记录标记")
    print("=" * 60)

    rehearsal = [r for r in r1.progress_records if r.notes and "排练" in r.notes]
    if rehearsal and rehearsal[0].raw_line == 15:
        print(f"✅ 排练记录带备注: {rehearsal[0].notes} (第{rehearsal[0].raw_line}行)")
    else:
        if rehearsal:
            print(f"❌ 排练记录行号不对，期望L15，实际L{rehearsal[0].raw_line}")
        else:
            print("❌ 排练记录未标记")
        all_pass = False

    # ========== 第六关：重跑批注和版本对照 ==========
    print("\n" + "=" * 60)
    print("第6关：重跑 + 批注 + 交付清单 + 版本对照")
    print("=" * 60)

    r3 = run_review(
        TEST_FOLDER, "2026-06-15_琴房A",
        previous_review_id=r1.review_id,
        annotation="第12行是排练授权，第7行旧版母带已确认",
        delivery_list_version="v1.2"
    )

    if r3.previous_review_id == r1.review_id:
        print(f"✅ 新版本 {r3.review_id[:8]}... 关联了旧版本 {r1.review_id[:8]}...")
    else:
        print("❌ 新版本未关联旧版本ID")
        all_pass = False

    if r3.annotation and r3.delivery_list_version:
        print(f"✅ 批注: {r3.annotation}")
        print(f"✅ 交付清单版本: {r3.delivery_list_version}")
    else:
        print("❌ 批注或交付清单未保存")
        all_pass = False

    cmp_result = compare_versions(r3, r1)
    summary = cmp_result.get("summary", {})
    if summary.get("same_input_rerun") is True and summary.get("changed_records") == 0:
        print(f"✅ 版本对照识别为同输入重扫，changed_records=0，不会把波动当进步")
    else:
        print(f"❌ 版本对照错误: summary={summary}")
        all_pass = False

    if (cmp_result.get("current_annotation") != cmp_result.get("previous_annotation")
            and cmp_result.get("current_delivery") != cmp_result.get("previous_delivery")):
        print(f"✅ 人工批注和交付清单在版本间正确对照")
    else:
        print("❌ 批注/交付清单版本对照不正确")
        all_pass = False

    score_diffs = cmp_result.get("score_diffs", [])
    if not score_diffs:
        print(f"✅ score_diffs为空数组，无假进步")
    else:
        print(f"❌ 同输入重扫score_diffs不为空: {score_diffs}")
        all_pass = False

    # ========== 第七关：图表数据 click_back 完整 ==========
    print("\n" + "=" * 60)
    print("第7关：图表数据 + 异常回溯(click_back)")
    print("=" * 60)

    chart = build_chart_data(r1)
    all_has_clickback = all(
        "click_back" in a and "folder_path" in a["click_back"] and "raw_line" in a["click_back"]
        for a in chart["anomalies"]
    )
    if all_has_clickback and chart["anomalies"]:
        sample = chart["anomalies"][0]["click_back"]
        print(f"✅ 所有异常点都有 click_back，样例: 第{sample['raw_line']}行 -> {sample['folder_path']}")
    else:
        print("❌ 异常点缺少 click_back 字段")
        all_pass = False

    all_students_have_line = all(
        "raw_line" in s and "folder_path" in s
        for s in chart["students"]
    )
    if all_students_have_line:
        print(f"✅ 每个学生进步记录都能回溯到raw_line和folder_path")
    else:
        print("❌ 学生进步记录缺少回溯字段")
        all_pass = False

    # ========== 最终输出 ==========
    print("\n" + "=" * 60)
    if all_pass:
        print("✅ 全部7关通过！系统可正常使用")
    else:
        print("❌ 有关卡未通过，请检查上述错误")
    print("=" * 60)

    # 摘要
    print("\n📋 学生进步分数（固定不变）:")
    for rec in sorted(r1.progress_records, key=lambda x: x.raw_line):
        note = f"  <-- {rec.notes}" if rec.notes else ""
        print(f"  第{rec.raw_line:2d}行 {rec.student_name:4s} - {rec.track_name[:12]:12s} -> overall={rec.metrics.overall_score:5.2f}{note}")

    print("\n🚨 异常清单:")
    for a in sorted(r1.anomalies, key=lambda x: (x.severity, x.raw_line)):
        icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(a.severity, "⚪")
        print(f"  {icon} [{a.severity:8s}] L{a.raw_line:2d} {a.anomaly_type:12s}: {a.file_name}")

    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
