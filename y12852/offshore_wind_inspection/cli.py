"""CLI 命令行接口：owi 命令"""

import argparse
import sys
import json
import os

from .db import init_db, DB_PATH
from . import data_import
from . import scheduler
from . import trace
from . import report


def cmd_init(args):
    """初始化数据库"""
    init_db()
    print(f"✅ 数据库已初始化: {os.path.abspath(DB_PATH)}")


def cmd_import(args):
    """导入数据"""
    data_type = args.type

    if args.file:
        result = data_import.import_json_file(args.file, data_type)
        print(f"✅ 已从 {args.file} 导入 {len(result)} 条 {data_type} 数据")
    elif args.data:
        data = json.loads(args.data)
        if data_type == "wave_forecast":
            result = data_import.import_wave_forecast(data)
        elif data_type == "water_quality":
            result = data_import.import_water_quality(data)
        else:
            print(f"❌ 不支持的数据类型: {data_type}")
            return
        print(f"✅ 已导入 {len(result)} 条 {data_type} 数据")
    else:
        print("❌ 请指定 --file 或 --data 参数")


def cmd_task(args):
    """创建或查询巡检任务"""
    if args.action == "create":
        result = data_import.create_inspection_task(
            task_code=args.code,
            wind_farm=args.wind_farm,
            planned_date=args.date,
            tide_window_start=args.tide_start,
            tide_window_end=args.tide_end,
            ship_name=args.ship
        )
        print(f"✅ 任务创建成功: {result['task_code']} (ID: {result['id']})")
    elif args.action == "list":
        from .db import get_conn
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM inspection_tasks ORDER BY planned_date DESC
            """).fetchall()
            print(f"共 {len(rows)} 个任务:")
            for r in rows:
                print(f"  {r['task_code']}  {r['wind_farm']}  {r['planned_date']}  状态: {r['status']}")
    elif args.action == "show":
        result = trace.trace_from_task(args.code)
        if "error" in result:
            print(f"❌ {result['error']}")
            return
        task = result["task"]
        print(f"任务编号: {task['task_code']}")
        print(f"风场: {task['wind_farm']}")
        print(f"计划日期: {task['planned_date']}")
        print(f"状态: {task['status']}")
        print(f"风险评估次数: {len(result['risk_assessments'])}")
        print(f"船舶轨迹: {len(result['ship_tracks'])} 条")


def cmd_assess(args):
    """风险评估"""
    if args.task:
        result = scheduler.assess_task_risk(args.task)
        print(f"✅ 风险评估完成")
        print(f"  任务: {result['task_code']}")
        print(f"  等级: {result['risk_level']}")
        print(f"  分数: {result['risk_score']}")
        if result["alerts"]:
            print(f"  预警: {len(result['alerts'])} 条")
            for a in result["alerts"]:
                print(f"    - [{a['alert_level']}] {a['alert_type']}")
    elif args.batch:
        results = scheduler.batch_assess(
            date_from=args.date_from,
            date_to=args.date_to,
            wind_farm=args.wind_farm
        )
        print(f"✅ 批量评估完成，共 {len(results)} 个任务")
        for r in results:
            print(f"  {r['task_code']}: {r['risk_level']} ({r['risk_score']}分)")


def cmd_report(args):
    """生成报告"""
    if args.task:
        content = report.generate_task_report(args.task, format=args.format)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ 报告已保存到 {args.output}")
        else:
            print(content)
    elif args.batch:
        content = report.generate_batch_report(
            date_from=args.date_from,
            date_to=args.date_to,
            wind_farm=args.wind_farm
        )
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ 报告已保存到 {args.output}")
        else:
            print(content)


def cmd_trace(args):
    """追溯：从异常往回查"""
    if args.alert:
        result = trace.trace_from_alert(args.alert)
    elif args.risk:
        result = trace.trace_from_risk(args.risk)
    elif args.task:
        result = trace.trace_from_task(args.task)
    else:
        print("❌ 请指定 --alert 或 --risk 或 --task 参数")
        return

    if "error" in result:
        print(f"❌ {result['error']}")
        return

    print("=" * 60)
    print("       追溯结果")
    print("=" * 60)

    if result.get("alert"):
        alert = result["alert"]
        print(f"\n📌 预警信息:")
        print(f"  ID: {alert['id']}")
        print(f"  类型: {alert['alert_type']}")
        print(f"  等级: {alert['alert_level']}")
        print(f"  描述: {alert['description']}")
        print(f"  触发时间: {alert['triggered_at']}")

    if result.get("risk_assessment"):
        risk = result["risk_assessment"]
        print(f"\n📌 风险评估 (ID: {risk['id']}):")
        print(f"  任务: {risk['task_code']}")
        print(f"  等级: {risk['risk_level']}")
        print(f"  分数: {risk['risk_score']}")
        print(f"  状态: {risk['status']}")

    if result.get("task"):
        task = result["task"]
        print(f"\n📌 巡检任务:")
        print(f"  编号: {task['task_code']}")
        print(f"  风场: {task['wind_farm']}")
        print(f"  日期: {task['planned_date']}")
        if task["ship_name"]:
            print(f"  船舶: {task['ship_name']}")

    if result.get("ship_tracks"):
        tracks = result["ship_tracks"]
        print(f"\n📌 船舶轨迹 (共 {len(tracks)} 条):")
        for t in tracks[:5]:
            print(f"  {t['timestamp']}  ({t['lon']}, {t['lat']})  "
                  f"速度: {t.get('speed', '-') or '-'} kn")
        if len(tracks) > 5:
            print(f"  ... 还有 {len(tracks) - 5} 条")

    if result.get("wave_forecast"):
        wf = result["wave_forecast"]
        print(f"\n📌 风浪预报数据 (来源记录 ID: {wf['id']}):")
        print(f"  日期: {wf['forecast_date']}")
        print(f"  浪高: {wf['wave_height']} m")
        print(f"  风速: {wf['wind_speed']} m/s")
        if wf["is_delayed"]:
            print(f"  ⚠️  预报晚到")
        if wf["source_file"]:
            print(f"  来源文件: {wf['source_file']}")
        if wf["data_source"]:
            print(f"  数据来源: {wf['data_source']}")

    if result.get("water_quality"):
        wq = result["water_quality"]
        print(f"\n📌 水质监测数据 (来源记录 ID: {wq['id']}):")
        print(f"  采样日期: {wq['sample_date']}")
        print(f"  浊度: {wq['turbidity']} NTU")
        print(f"  溶解氧: {wq['dissolved_oxygen']} mg/L")
        print(f"  pH: {wq['ph']}")
        if wq["source_file"]:
            print(f"  来源文件: {wq['source_file']}")

    if result.get("reviews"):
        print(f"\n📌 复核记录 (共 {len(result['reviews'])} 条):")
        for r in result["reviews"]:
            print(f"  ID: {r['id']}")
            print(f"    类型: {r['review_type']}")
            print(f"    原值: {r['original_value']} → 修正: {r['corrected_value']}")
            print(f"    复核人: {r['reviewer']}")
            print(f"    原因: {r['reason']}")
            print(f"    时间: {r['created_at']}")

    if result.get("processing_logs"):
        logs = result["processing_logs"]
        print(f"\n📌 处理记录 (共 {len(logs)} 条) - 按时间顺序:")
        for l in logs:
            print(f"  [{l['timestamp']}] {l['operation']}")
            print(f"    实体: {l['entity_type']}:{l['entity_id']}")
            if l["source_ref"]:
                print(f"    来源: {l['source_ref']}")
            if l["result_ref"]:
                print(f"    结果: {l['result_ref']}")
            if l["details"]:
                print(f"    详情: {l['details']}")

    print("\n" + "=" * 60)
    print("💡 提示: 可使用 'owi review' 命令对风险评估进行复核")
    print("=" * 60)


def cmd_review(args):
    """复核入口"""
    if args.action == "list-delayed":
        delayed = scheduler.get_delayed_forecasts()
        print(f"⚠️  共 {len(delayed)} 条晚到预报记录，需要复核:")
        for d in delayed:
            print(f"  ID: {d['id']}  {d['wind_farm']} {d['forecast_date']}"
                  f"  浪高: {d['wave_height']}m"
                  f"  相关任务: {d.get('task_code', '无')}")
        if delayed:
            print("\n💡 找到关联的风险评估后，可用以下命令复核:")
            print("   owi review <risk_id> --type risk_level --value <新等级> --reviewer <姓名> --reason <原因>")
    elif args.action == "do":
        result = scheduler.create_review(
            risk_assessment_id=args.risk_id,
            review_type=args.type,
            corrected_value=args.value,
            reviewer=args.reviewer,
            reason=args.reason
        )
        print(f"✅ 复核完成")
        print(f"  复核ID: {result['id']}")
        print(f"  类型: {result['review_type']}")
        print(f"  原值: {result['original']}")
        print(f"  修正: {result['corrected']}")


def cmd_track(args):
    """船舶轨迹相关"""
    if args.action == "import":
        if args.file:
            with open(args.file, "r", encoding="utf-8") as f:
                data = json.load(f)
        elif args.data:
            data = json.loads(args.data)
        else:
            print("❌ 请指定 --file 或 --data")
            return

        result = data_import.import_ship_track(
            task_id=args.task_id,
            tracks=data,
            source=args.source
        )
        print(f"✅ 已导入 {len(result)} 条船舶轨迹")


def main():
    parser = argparse.ArgumentParser(
        prog="owi",
        description="海上风电巡检排程工具 (Offshore Wind Inspection Scheduler)"
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    p_init = subparsers.add_parser("init", help="初始化数据库")
    p_init.set_defaults(func=cmd_init)

    p_import = subparsers.add_parser("import", help="导入数据")
    p_import.add_argument("type", choices=["wave_forecast", "water_quality"],
                          help="数据类型")
    p_import.add_argument("--file", "-f", help="JSON 文件路径")
    p_import.add_argument("--data", "-d", help="JSON 字符串数据")
    p_import.set_defaults(func=cmd_import)

    p_task = subparsers.add_parser("task", help="巡检任务管理")
    p_task.add_argument("action", choices=["create", "list", "show"], help="操作")
    p_task.add_argument("--code", "-c", help="任务编号")
    p_task.add_argument("--wind-farm", "-w", help="风场名称")
    p_task.add_argument("--date", help="计划日期 (YYYY-MM-DD)")
    p_task.add_argument("--tide-start", help="潮汐窗口开始时间")
    p_task.add_argument("--tide-end", help="潮汐窗口结束时间")
    p_task.add_argument("--ship", help="执行船舶")
    p_task.set_defaults(func=cmd_task)

    p_assess = subparsers.add_parser("assess", help="风险评估")
    p_assess.add_argument("--task", "-t", help="评估单个任务")
    p_assess.add_argument("--batch", action="store_true", help="批量评估")
    p_assess.add_argument("--date-from", help="开始日期")
    p_assess.add_argument("--date-to", help="结束日期")
    p_assess.add_argument("--wind-farm", help="风场过滤")
    p_assess.set_defaults(func=cmd_assess)

    p_report = subparsers.add_parser("report", help="生成报告")
    p_report.add_argument("--task", "-t", help="单个任务报告")
    p_report.add_argument("--batch", action="store_true", help="批量报告")
    p_report.add_argument("--format", "-f", default="text", choices=["text", "json"],
                          help="输出格式")
    p_report.add_argument("--output", "-o", help="输出文件")
    p_report.add_argument("--date-from", help="开始日期")
    p_report.add_argument("--date-to", help="结束日期")
    p_report.add_argument("--wind-farm", help="风场过滤")
    p_report.set_defaults(func=cmd_report)

    p_trace = subparsers.add_parser("trace", help="追溯：从异常往回查")
    p_trace.add_argument("--alert", "-a", type=int, help="从预警ID追溯")
    p_trace.add_argument("--risk", "-r", type=int, help="从风险评估ID追溯")
    p_trace.add_argument("--task", "-t", help="从任务编号追溯")
    p_trace.set_defaults(func=cmd_trace)

    p_review = subparsers.add_parser("review", help="复核管理")
    p_review.add_argument("action", choices=["list-delayed", "do"],
                          help="操作: list-delayed 列出晚到预报; do 执行复核")
    p_review.add_argument("risk_id", nargs="?", type=int, help="风险评估ID")
    p_review.add_argument("--type", choices=["risk_level", "risk_score"],
                          help="复核类型")
    p_review.add_argument("--value", help="修正后的值")
    p_review.add_argument("--reviewer", help="复核人")
    p_review.add_argument("--reason", help="复核原因")
    p_review.set_defaults(func=cmd_review)

    p_track = subparsers.add_parser("track", help="船舶轨迹管理")
    p_track.add_argument("action", choices=["import"], help="操作")
    p_track.add_argument("--task-id", type=int, help="任务ID")
    p_track.add_argument("--file", "-f", help="JSON 文件路径")
    p_track.add_argument("--data", "-d", help="JSON 字符串数据")
    p_track.add_argument("--source", help="数据来源")
    p_track.set_defaults(func=cmd_track)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return

    args.func(args)


if __name__ == "__main__":
    main()
