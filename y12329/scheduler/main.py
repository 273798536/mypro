import argparse
import sys
import os

from scheduler.db import init_db, get_connection, start_run, complete_run, get_run_history, get_all_issues
from scheduler.importer import IMPORTERS
from scheduler.checker import run_all_checks
from scheduler.report import export_report_text, export_report_json


def cmd_import(args):
    init_db(args.db)
    conn = get_connection(args.db)

    data_type = args.type
    path = args.file

    if not os.path.exists(path):
        print(f"文件不存在: {path}")
        sys.exit(1)

    if data_type not in IMPORTERS:
        print(f"不支持的数据类型: {data_type}")
        print(f"可用类型: {', '.join(IMPORTERS.keys())}")
        sys.exit(1)

    print(f"[导入] {data_type} <- {path}")
    IMPORTERS[data_type](conn, path)
    conn.close()


def cmd_import_all(args):
    init_db(args.db)
    conn = get_connection(args.db)
    data_dir = args.dir

    if not os.path.isdir(data_dir):
        print(f"目录不存在: {data_dir}")
        sys.exit(1)

    type_file_map = {
        "tickets": "tickets.csv",
        "customer_levels": "customer_levels.csv",
        "timeout_rules": "timeout_rules.csv",
        "handling_durations": "handling_durations.csv",
        "scheduling_records": "scheduling_records.csv",
    }

    for dtype, fname in type_file_map.items():
        fpath = os.path.join(data_dir, fname)
        if os.path.exists(fpath):
            print(f"[导入] {dtype} <- {fpath}")
            IMPORTERS[dtype](conn, fpath)
        else:
            json_path = fpath.replace(".csv", ".json")
            if os.path.exists(json_path):
                print(f"[导入] {dtype} <- {json_path}")
                IMPORTERS[dtype](conn, json_path)
            else:
                print(f"[跳过] {dtype}: 未找到 {fname}")

    conn.close()


def cmd_check(args):
    init_db(args.db)
    conn = get_connection(args.db)
    run_id = start_run(conn)
    print(f"[运行] 检查运行ID: {run_id}")

    result = run_all_checks(conn, run_id)
    complete_run(conn, run_id)
    conn.close()

    total = sum(result.values())
    if total > 0:
        print(f"\n发现 {total} 条新问题，建议执行 report 命令导出报告")
    else:
        print("\n未发现新问题")


def cmd_report(args):
    init_db(args.db)
    conn = get_connection(args.db)

    run_id = args.run_id
    if not run_id:
        runs = get_run_history(conn)
        if runs:
            run_id = runs[0]["run_id"]
            print(f"[报告] 使用最近运行ID: {run_id}")
        else:
            print("无运行记录，请先执行 check")
            conn.close()
            sys.exit(1)

    fmt = args.format
    output = args.output

    if fmt == "text":
        export_report_text(conn, run_id, output)
    elif fmt == "json":
        export_report_json(conn, run_id, output)
    else:
        export_report_text(conn, run_id, output)

    conn.close()


def cmd_run(args):
    init_db(args.db)
    conn = get_connection(args.db)

    data_dir = args.data_dir
    if data_dir and os.path.isdir(data_dir):
        type_file_map = {
            "tickets": "tickets.csv",
            "customer_levels": "customer_levels.csv",
            "timeout_rules": "timeout_rules.csv",
            "handling_durations": "handling_durations.csv",
            "scheduling_records": "scheduling_records.csv",
        }
        print("=" * 50)
        print("步骤1: 导入数据")
        print("=" * 50)
        for dtype, fname in type_file_map.items():
            fpath = os.path.join(data_dir, fname)
            if os.path.exists(fpath):
                print(f"[导入] {dtype} <- {fpath}")
                IMPORTERS[dtype](conn, fpath)
            else:
                json_path = fpath.replace(".csv", ".json")
                if os.path.exists(json_path):
                    print(f"[导入] {dtype} <- {json_path}")
                    IMPORTERS[dtype](conn, json_path)

    print("\n" + "=" * 50)
    print("步骤2: 公平性检查")
    print("=" * 50)
    run_id = start_run(conn)
    print(f"[运行] 检查运行ID: {run_id}")
    result = run_all_checks(conn, run_id)
    complete_run(conn, run_id)

    print("\n" + "=" * 50)
    print("步骤3: 导出报告")
    print("=" * 50)
    fmt = args.format
    output = args.output
    if fmt == "json":
        path = export_report_json(conn, run_id, output)
    else:
        path = export_report_text(conn, run_id, output)

    print(f"\n完整流程结束，报告: {path}")
    conn.close()


def cmd_history(args):
    init_db(args.db)
    conn = get_connection(args.db)
    runs = get_run_history(conn)

    print("=" * 50)
    print("运行历史")
    print("=" * 50)
    if not runs:
        print("暂无运行记录")
    else:
        for r in runs:
            print(f"  运行 {r['run_id'][:8]}... | "
                  f"开始: {r['started_at']} | "
                  f"完成: {r['completed_at'] or '进行中'} | "
                  f"状态: {r['status']}")

    issues = get_all_issues(conn)
    print(f"\n累计问题记录: {len(issues)} 条")
    for iss in issues:
        print(f"  [{iss['issue_type']}] {iss['severity']} | "
              f"{iss['description'][:60]}... | "
              f"检出: {iss['detected_at'][:19]}")

    conn.close()


def cmd_list_issues(args):
    init_db(args.db)
    conn = get_connection(args.db)
    issues = get_all_issues(conn)

    if args.type:
        from scheduler.db import get_issues_by_type
        issues = get_issues_by_type(conn, args.type)

    print("=" * 50)
    print(f"问题清单 ({args.type or '全部'})")
    print("=" * 50)
    if not issues:
        print("暂无问题记录")
    else:
        import json
        for iss in issues:
            print(f"\n  问题ID: {iss['issue_id']}")
            print(f"  类型: {iss['issue_type']}")
            print(f"  严重程度: {iss['severity']}")
            print(f"  描述: {iss['description']}")
            affected = json.loads(iss["affected_ticket_ids"]) if isinstance(iss["affected_ticket_ids"], str) else iss["affected_ticket_ids"]
            print(f"  受影响工单: {', '.join(affected)}")
            sources = json.loads(iss["source_records"]) if isinstance(iss["source_records"], str) else iss["source_records"]
            print(f"  来源溯源:")
            for sk, sv in sources.items():
                print(f"    {sk}: {sv}")
            print(f"  检出时间: {iss['detected_at']}")
            print(f"  运行ID: {iss['run_id'][:8]}...")

    conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="队列公平调度器 — 工单公平性检查与报告",
        prog="queue_scheduler",
    )
    parser.add_argument("--db", default="queue_scheduler.db", help="数据库路径")

    sub = parser.add_subparsers(dest="command")

    p_import = sub.add_parser("import", help="导入数据")
    p_import.add_argument("--type", required=True, choices=IMPORTERS.keys(), help="数据类型")
    p_import.add_argument("--file", required=True, help="数据文件路径(CSV/JSON)")

    p_import_all = sub.add_parser("import-all", help="批量导入目录下所有数据文件")
    p_import_all.add_argument("--dir", required=True, help="数据目录")

    p_check = sub.add_parser("check", help="执行公平性检查")

    p_report = sub.add_parser("report", help="导出调度报告")
    p_report.add_argument("--run-id", default=None, help="指定运行ID")
    p_report.add_argument("--format", choices=["text", "json"], default="text", help="报告格式")
    p_report.add_argument("--output", default=None, help="输出文件路径")

    p_run = sub.add_parser("run", help="一键执行: 导入 → 检查 → 报告")
    p_run.add_argument("--data-dir", default="data", help="数据目录")
    p_run.add_argument("--format", choices=["text", "json"], default="text", help="报告格式")
    p_run.add_argument("--output", default=None, help="输出文件路径")

    p_history = sub.add_parser("history", help="查看运行历史和问题记录")

    p_issues = sub.add_parser("issues", help="查看问题清单")
    p_issues.add_argument("--type", choices=["VIP挤占", "技能组缺人", "超时连锁"], default=None, help="按类型筛选")

    args = parser.parse_args()

    if args.command == "import":
        cmd_import(args)
    elif args.command == "import-all":
        cmd_import_all(args)
    elif args.command == "check":
        cmd_check(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "run":
        cmd_run(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "issues":
        cmd_list_issues(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
