#!/usr/bin/env python3
import sys
import os
import json
import csv
import io

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    all_pass = True
    TEST_FOLDER = os.path.join(os.path.dirname(__file__), "data", "audio_folders", "2026-06-15_琴房A_记录.txt")
    BAD_PATH = "/不存在/的/路径/假文件.txt"
    EMPTY_NAME = ""

    # ========== 第1关：模块导入 ==========
    print("=" * 60)
    print("第1关：模块与路由导入")
    print("=" * 60)

    try:
        from app.models import (
            AudioFile, AudioFolder, ProgressMetrics, StudentProgress,
            Anomaly, ReviewResult, CalculationRule, AnnotationRequest, ReviewResponse
        )
        from app.rules import DEFAULT_CALCULATION_RULE
        from app.parser import parse_audio_folder, InvalidFolderPathError
        from app.review_engine import run_review
        from app.chart_builder import build_chart_data, compare_versions
        from app.storage import review_store, folder_store
        from app.exporter import (
            export_review_json, export_progress_csv, export_anomalies_csv, save_exports_to_disk
        )
        from app.main import app
        print("✅ 所有模块导入成功")
    except Exception as e:
        exc_type, _, _ = sys.exc_info()
        print(f"❌ 模块导入失败 [{exc_type.__name__}]: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)

    routes = [r.path for r in app.routes if hasattr(r, "path")]
    expected_routes = [
        "/api/review/start", "/api/review/rerun",
        "/api/review/{review_id}", "/api/review/{review_id}/chart",
        "/api/review/{review_id}/compare/{previous_id}",
        "/api/review/{review_id}/anomaly/{raw_line}",
        "/api/review/{review_id}/annotate",
        "/api/review/folder/{folder_path:path}",
        "/api/folder/scan", "/api/calculation-rule",
        "/api/review/{review_id}/export/json",
        "/api/review/{review_id}/export/progress.csv",
        "/api/review/{review_id}/export/anomalies.csv",
        "/api/review/{review_id}/export",
    ]
    missing_routes = [r for r in expected_routes if r not in routes]
    if not missing_routes:
        print(f"✅ 所有预期路由注册完毕（{len(expected_routes)}条，含4条下载导出接口）")
    else:
        print(f"❌ 缺少路由: {missing_routes}")
        sys.exit(1)

    # ========== 第2关：坏路径不静默 ==========
    print("\n" + "=" * 60)
    print("第2关：坏路径不静默（入口-记录-复核三对一，前置）")
    print("=" * 60)

    # 2.1 不存在路径
    try:
        run_review(BAD_PATH, "坏测试")
        print("❌ 不存在的路径未抛异常，仍静默生成假结果")
        all_pass = False
    except Exception as e:
        if "InvalidFolderPath" in type(e).__name__ or "音频文件夹记录无效" in str(e):
            print(f"✅ 不存在路径正确抛异常: {type(e).__name__}: {str(e)[:60]}...")
        else:
            print(f"❌ 异常类型不对: {type(e).__name__}: {e}")
            all_pass = False

    # 2.2 空 folder_name
    try:
        r0 = run_review(TEST_FOLDER, EMPTY_NAME)
        entry_anom = [a for a in r0.anomalies if a.anomaly_type == "入口字段缺失"]
        if entry_anom and entry_anom[0].severity == "high":
            print(f"✅ folder_name为空时，标记入口字段缺失异常(severity=high)")
        else:
            print(f"❌ folder_name为空未正确标记，异常数={len(entry_anom)}")
            all_pass = False
    except Exception as e:
        print(f"❌ folder_name空路径处理异常: {type(e).__name__}: {e}")
        all_pass = False

    # ========== 第3关：分数可复现 + 入口路径一致 ==========
    print("\n" + "=" * 60)
    print("第3关：分数可复现 + 入口/记录/复核路径一致")
    print("=" * 60)

    r1 = run_review(TEST_FOLDER, "2026-06-15_琴房A")
    r2 = run_review(TEST_FOLDER, "2026-06-15_琴房A")

    abs_expected = os.path.abspath(TEST_FOLDER)

    # 3.1 路径一致性（三对一：入口→解析→ReviewResult 三段相同）
    if r1.folder_path == abs_expected and r2.folder_path == abs_expected:
        print(f"✅ 入口-解析-复核结果三段路径一致: {os.path.basename(abs_expected)}")
    else:
        print(f"❌ 路径不一致，期望 {abs_expected}，实际 R1={r1.folder_path}, R2={r2.folder_path}")
        all_pass = False

    # 3.2 每个 StudentProgress 的 folder_path 也要对上
    mismatched = [r for r in r1.progress_records if r.folder_path != abs_expected]
    if not mismatched:
        print(f"✅ 所有 progress_records.folder_path 与入口一致")
    else:
        print(f"❌ {len(mismatched)} 条 progress_records.folder_path 不一致")
        all_pass = False

    # 3.3 每个 Anomaly 的 folder_path 也要对上
    mismatched_anom = [a for a in r1.anomalies if a.folder_path != abs_expected]
    if not mismatched_anom:
        print(f"✅ 所有 anomalies.folder_path 与入口一致")
    else:
        print(f"❌ {len(mismatched_anom)} 条 anomalies.folder_path 不一致")
        all_pass = False

    # 3.4 两次运行分数完全一致
    r1_scores = {(r.raw_line, r.track_name, r.student_name): r.metrics.overall_score for r in r1.progress_records}
    r2_scores = {(r.raw_line, r.track_name, r.student_name): r.metrics.overall_score for r in r2.progress_records}
    if set(r1_scores.keys()) != set(r2_scores.keys()):
        print("❌ 两次运行记录集合不一致")
        all_pass = False
    else:
        mismatches = [(k, v, r2_scores[k]) for k, v in r1_scores.items() if v != r2_scores[k]]
        if mismatches:
            print("❌ 同一输入两次运行分数不一致:")
            for k, s1, s2 in mismatches:
                print(f"   {k}: 第一次{s1}，第二次{s2}")
            all_pass = False
        else:
            print("✅ 同一输入两次运行分数完全一致")
            for k in list(r1_scores.keys())[:1]:
                print(f"   - {k[1][:10]}:{k[2]} 两次均为 {r1_scores[k]} 分")

    # ========== 第4关：边界样本异常检测 ==========
    print("\n" + "=" * 60)
    print("第4关：边界样本异常检测")
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
        print(f"   实际: {sorted(anomaly_types)}")
        all_pass = False
    else:
        print(f"✅ 8种预期异常类型全部检出")

    anomaly_lines = {a.raw_line for a in r1.anomalies}
    expected_lines = {10, 11, 12, 13, 16, 18, 19, 20}
    missing_lines = expected_lines - anomaly_lines
    if missing_lines:
        print(f"❌ 边界样本未标记到行号: {missing_lines}")
        print(f"   实际标记: {sorted(anomaly_lines)}")
        all_pass = False
    else:
        print(f"✅ 8处边界样本均标记到原始行号: {sorted(expected_lines)}")

    # ========== 第5关：母带 + 排练标记 ==========
    print("\n" + "=" * 60)
    print("第5关：旧版母带不计入正常通过 + 排练/授权标记")
    print("=" * 60)

    master = [a for a in r1.anomalies if a.anomaly_type == "旧版母带混入"]
    if master and master[0].severity == "critical" and master[0].raw_line == 10:
        print(f"✅ 旧版母带（L10）severity=critical")
    else:
        print("❌ 旧版母带严重程度或行号错误")
        all_pass = False

    master_record = [r for r in r1.progress_records if r.raw_line == 10]
    if master_record and master_record[0].notes and "旧版母带，不计入正常课时统计" in master_record[0].notes:
        print(f"✅ 母带进步记录备注正确")
    else:
        print("❌ 母带进步记录无备注")
        all_pass = False

    if r1.status == "异常-需立即处理":
        print(f"✅ 整体状态= 异常-需立即处理（含critical，不标正常通过）")
    else:
        print(f"❌ 含critical异常但状态={r1.status}")
        all_pass = False

    rehearsal = [r for r in r1.progress_records if r.notes and "排练" in r.notes]
    if rehearsal and rehearsal[0].raw_line == 15:
        print(f"✅ 排练记录标记正确（L15）")
    else:
        print("❌ 排练记录未标记")
        all_pass = False

    # ========== 第6关：重跑 + 批注 + 版本对照 ==========
    print("\n" + "=" * 60)
    print("第6关：重跑+批注+交付清单+版本对照不误判")
    print("=" * 60)

    r3 = run_review(
        TEST_FOLDER, "2026-06-15_琴房A",
        previous_review_id=r1.review_id,
        annotation="第15行是排练授权，L10母带已确认",
        delivery_list_version="v1.2"
    )

    ok = True
    if r3.previous_review_id != r1.review_id:
        ok = False
    if not r3.annotation or not r3.delivery_list_version:
        ok = False
    if ok:
        print("✅ 版本关联、批注、交付清单保存正确")
    else:
        print("❌ 版本关联或批注保存错误")
        all_pass = False

    cmp_result = compare_versions(r3, r1)
    smry = cmp_result.get("summary", {})
    if smry.get("same_input_rerun") is True and smry.get("changed_records") == 0 and not cmp_result.get("score_diffs"):
        print(f"✅ 同输入重扫不误判：changed_records=0，score_diffs=[]")
    else:
        print(f"❌ 同输入重扫误判：summary={smry}, score_diffs={cmp_result.get('score_diffs')}")
        all_pass = False

    if (cmp_result.get("current_annotation") != cmp_result.get("previous_annotation")
            and cmp_result.get("current_delivery") != cmp_result.get("previous_delivery")):
        print("✅ 批注与交付清单在版本间正确对照")
    else:
        print("❌ 批注/交付清单对照失败")
        all_pass = False

    # ========== 第7关：导出文件（JSON/CSV）与页面一致 ==========
    print("\n" + "=" * 60)
    print("第7关：导出内容与 /chart 严格对齐，格式可正常打开")
    print("=" * 60)

    chart = build_chart_data(r3)

    # 7.1 JSON 导出一致性
    fn_j, content_j = export_review_json(r3)
    try:
        data = json.loads(content_j.decode("utf-8"))
        jchart = data["chart"]
        jstudents = {(s["raw_line"], s["audio_file"]): s for s in jchart["students"]}
        pstudents = {(s["raw_line"], s["audio_file"]): s for s in chart["students"]}
        if jstudents == pstudents and len(jchart["anomalies"]) == len(chart["anomalies"]):
            print(f"✅ JSON导出与/chart一致：学生数={len(jstudents)}，异常数={len(jchart['anomalies'])}")
        else:
            print(f"❌ JSON导出与/chart不一致")
            all_pass = False
    except (json.JSONDecodeError, KeyError) as e:
        print(f"❌ JSON导出损坏，无法正常解析: {e}")
        all_pass = False

    # 7.2 progress CSV 导出一致性
    fn_p, content_p = export_progress_csv(r3)
    try:
        reader = csv.DictReader(io.StringIO(content_p.lstrip("\ufeff")))
        rows = list(reader)
        expected_headers = {"raw_line", "student_name", "track_name", "overall_score", "folder_path", "review_id"}
        actual_headers = set(rows[0].keys()) if rows else set()
        if expected_headers.issubset(actual_headers):
            print(f"✅ progress CSV 头完整，共 {len(rows)} 行可正常打开")
        else:
            print(f"❌ progress CSV 缺失列，期望含 {expected_headers - actual_headers}")
            all_pass = False

        # 和 chart 里的分数逐行对
        csv_scores = {(int(r["raw_line"]), r["audio_file"]): float(r["overall_score"]) for r in rows}
        chart_scores = {(s["raw_line"], s["audio_file"]): s["metrics"]["overall_score"] for s in chart["students"]}
        if csv_scores == chart_scores:
            print("✅ progress CSV 分数与页面/chart逐行对齐，无漂移")
        else:
            diff = set(csv_scores.items()) ^ set(chart_scores.items())
            print(f"❌ progress CSV 与 chart 分数不一致，差异点={len(diff)}")
            all_pass = False
    except Exception as e:
        print(f"❌ progress CSV 损坏: {e}")
        all_pass = False

    # 7.3 anomalies CSV 导出一致性
    fn_a, content_a = export_anomalies_csv(r3)
    try:
        reader = csv.DictReader(io.StringIO(content_a.lstrip("\ufeff")))
        rows = list(reader)
        expected_headers = {"raw_line", "file_name", "anomaly_type", "severity", "severity_cn",
                            "folder_path", "click_back_url"}
        actual_headers = set(rows[0].keys()) if rows else set()
        if expected_headers.issubset(actual_headers):
            print(f"✅ anomalies CSV 头完整，共 {len(rows)} 行可正常打开")
        else:
            print(f"❌ anomalies CSV 缺失列: {expected_headers - actual_headers}")
            all_pass = False

        csv_lines = sorted(int(r["raw_line"]) for r in rows)
        chart_lines = sorted(a["raw_line"] for a in chart["anomalies"])
        if csv_lines == chart_lines:
            print(f"✅ anomalies CSV 异常行号与 /chart 逐行对齐")
        else:
            print(f"❌ anomalies CSV 行号不一致")
            all_pass = False
    except Exception as e:
        print(f"❌ anomalies CSV 损坏: {e}")
        all_pass = False

    # 7.4 落盘到 data/exports 目录
    try:
        saved = save_exports_to_disk(r3)
        if all(os.path.exists(p) for p in saved.values()):
            print(f"✅ 导出文件已同步落盘到 data/exports: {list(saved.values())}")
        else:
            print("❌ 导出文件未真正落盘")
            all_pass = False
    except Exception as e:
        print(f"❌ 落盘失败: {e}")
        all_pass = False

    # 7.5 重跑导出 + 路径匹配（入口-导出的folder_path一致）
    for r in rows:
        if r["folder_path"] != abs_expected and int(r["raw_line"]) != 0:
            print(f"❌ anomalies CSV内路径不匹配: L{r['raw_line']}={r['folder_path']}")
            all_pass = False
            break
    else:
        print("✅ anomalies CSV 内所有 folder_path 与入口路径一致")

    # ========== 第8关：click_back 能回到具体对象 ==========
    print("\n" + "=" * 60)
    print("第8关：异常点 click_back 可回到音频行和计算口径")
    print("=" * 60)

    all_cb = all(
        "click_back" in a and a["click_back"].get("folder_path") == abs_expected
        for a in chart["anomalies"]
    )
    if all_cb and chart["anomalies"]:
        print("✅ 所有异常点 click_back.folder_path 与入口一致，可回到原始行")
        print(f"   示例: L{chart['anomalies'][0]['raw_line']} -> {chart['anomalies'][0]['click_back']['calculation_rule_version']}")
    else:
        print("❌ click_back 路径不完整")
        all_pass = False

    all_student_cb = all(
        s.get("folder_path") == abs_expected for s in chart["students"]
    )
    if all_student_cb:
        print("✅ 每个学生进步记录可通过 folder_path+raw_line 回到音频文件夹对象")
    else:
        print("❌ 学生进步记录回溯字段缺失")
        all_pass = False

    # ========== 最终 ==========
    print("\n" + "=" * 60)
    if all_pass:
        print("✅ 全部8关通过，修复目标达成")
    else:
        print("❌ 有关卡未通过")
    print("=" * 60)

    print("\n📋 固定分数与备注摘要：")
    for rec in sorted(r1.progress_records, key=lambda x: x.raw_line):
        note = f"  <-- {rec.notes}" if rec.notes else ""
        print(f"  L{rec.raw_line:2d} {rec.student_name:4s} {rec.track_name[:12]:12s} overall={rec.metrics.overall_score:5.2f}{note}")

    print("\n🚨 异常汇总：")
    sev_icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
    for a in sorted(r1.anomalies, key=lambda x: (x.severity, x.raw_line)):
        print(f"  {sev_icon.get(a.severity, '⚪')} [{a.severity:8s}] L{a.raw_line:2d} {a.anomaly_type:12s} {a.file_name}")

    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
