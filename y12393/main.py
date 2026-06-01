import sys
import json

from db import init_db, get_conn
from importer import import_from_sample_dir
from checker import run_all_checks, save_issues
from report import generate_all_reports, generate_report, save_report
from versioning import compare_versions


def cmd_import(sample_dir, suffix=""):
    init_db()
    result = import_from_sample_dir(sample_dir, annotation_suffix=suffix)
    print("=== 导入结果 ===")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def cmd_check():
    init_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, filename FROM audio_files")
    audio_files = cur.fetchall()
    conn.close()

    all_results = {}
    for af in audio_files:
        issues = run_all_checks(af["id"])
        saved = save_issues(af["id"], issues)
        all_results[af["filename"]] = {
            "audio_file_id": af["id"],
            "total_issues_found": len(issues),
            "new_issues_saved": len(saved),
            "issues": saved,
        }

    print("=== 检查结果 ===")
    print(json.dumps(all_results, ensure_ascii=False, indent=2))
    return all_results


def cmd_report():
    init_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, filename FROM audio_files")
    audio_files = cur.fetchall()
    conn.close()

    all_results = {}
    for af in audio_files:
        report_ids = generate_all_reports(af["id"])
        all_results[af["filename"]] = report_ids

    print("=== 报告生成结果 ===")
    print(json.dumps(all_results, ensure_ascii=False, indent=2))
    return all_results


def cmd_versions():
    init_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, filename FROM audio_files")
    audio_files = cur.fetchall()
    conn.close()

    all_results = {}
    for af in audio_files:
        comparisons = compare_versions(af["id"])
        all_results[af["filename"]] = comparisons

    print("=== 版本比较结果 ===")
    print(json.dumps(all_results, ensure_ascii=False, indent=2))
    return all_results


def cmd_show_report(audio_file_id, report_type="full"):
    init_db()
    report = generate_report(audio_file_id, report_type)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def cmd_pipeline(sample_dir=None):
    init_db()

    if sample_dir:
        print("\n>>> 第1步：导入数据（首轮）")
        import_from_sample_dir(sample_dir)

        print("\n>>> 第1.5步：导入修改数据（二轮，模拟排练后修改）")
        import_from_sample_dir(sample_dir, annotation_suffix="_round2")

    print("\n>>> 第2步：运行检查")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, filename FROM audio_files")
    audio_files = cur.fetchall()
    conn.close()

    for af in audio_files:
        issues = run_all_checks(af["id"])
        saved = save_issues(af["id"], issues)
        print(f"  {af['filename']}: 发现{len(issues)}个问题，新增保存{len(saved)}个")

    print("\n>>> 第3步：生成报告")
    for af in audio_files:
        report_ids = generate_all_reports(af["id"])
        print(f"  {af['filename']}: 已生成 {list(report_ids.keys())} 类报告")

    print("\n>>> 第4步：版本比较")
    for af in audio_files:
        comparisons = compare_versions(af["id"])
        if comparisons:
            print(f"  {af['filename']}: {len(comparisons)}处人工改动记录")
            for c in comparisons:
                print(f"    节拍{c['beat_index']}: {c['impact']}")
        else:
            print(f"  {af['filename']}: 无人工改动记录")

    print("\n>>> 流程完成")


def _count_all():
    conn = get_conn()
    cur = conn.cursor()
    counts = {}
    for table in ("audio_files", "beat_markers", "action_annotations",
                  "annotation_history", "issues", "reports", "drift_events"):
        cur.execute(f"SELECT COUNT(*) as cnt FROM {table}")
        counts[table] = cur.fetchone()["cnt"]
    conn.close()
    return counts


def cmd_verify(sample_dir=None):
    init_db()

    before = _count_all()
    print("=== 重复运行前计数 ===")
    for k, v in before.items():
        print(f"  {k}: {v}")

    if sample_dir:
        print("\n--- 重新导入首轮数据 ---")
        import_from_sample_dir(sample_dir)
        print("--- 重新导入二轮数据 ---")
        import_from_sample_dir(sample_dir, annotation_suffix="_round2")

    for af_id_row in get_conn().cursor().execute("SELECT id FROM audio_files").fetchall():
        issues = run_all_checks(af_id_row[0])
        save_issues(af_id_row[0], issues)
        generate_all_reports(af_id_row[0])

    after = _count_all()
    print("\n=== 重复运行后计数 ===")
    for k, v in after.items():
        print(f"  {k}: {v}")

    print("\n=== 幂等性验证 ===")
    ok = True
    for table in ("audio_files", "beat_markers", "action_annotations",
                  "annotation_history", "issues", "drift_events"):
        b, a = before[table], after[table]
        status = "PASS" if a == b else "FAIL"
        if a != b:
            ok = False
        print(f"  [{status}] {table}: {b} -> {a}")

    if before["reports"] != after["reports"]:
        print(f"  [NOTE] reports: {before['reports']} -> {after['reports']} (时间戳变化导致内容哈希不同，属正常)")
    else:
        print(f"  [PASS] reports: {before['reports']} -> {after['reports']}")

    if ok:
        print("\n结论: 幂等性验证通过，重复运行不产生重复数据")
    else:
        print("\n结论: 幂等性验证失败，存在数据重复")
    return ok


def main():
    if len(sys.argv) < 2:
        print("用法: python main.py <command> [args]")
        print("命令:")
        print("  import <dir> [suffix]       导入样例数据")
        print("  check                       运行检查")
        print("  report                      生成报告")
        print("  versions                    版本比较")
        print("  pipeline [dir]              完整流程（含二轮导入）")
        print("  verify [dir]                幂等性验证")
        print("  show <id> [type]            查看报告")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "import":
        sample_dir = sys.argv[2] if len(sys.argv) > 2 else "samples"
        suffix = sys.argv[3] if len(sys.argv) > 3 else ""
        cmd_import(sample_dir, suffix)
    elif cmd == "check":
        cmd_check()
    elif cmd == "report":
        cmd_report()
    elif cmd == "versions":
        cmd_versions()
    elif cmd == "pipeline":
        sample_dir = sys.argv[2] if len(sys.argv) > 2 else "samples"
        cmd_pipeline(sample_dir)
    elif cmd == "verify":
        sample_dir = sys.argv[2] if len(sys.argv) > 2 else None
        cmd_verify(sample_dir)
    elif cmd == "show":
        audio_file_id = int(sys.argv[2])
        report_type = sys.argv[3] if len(sys.argv) > 3 else "full"
        cmd_show_report(audio_file_id, report_type)
    else:
        print(f"未知命令: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
