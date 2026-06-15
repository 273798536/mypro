import argparse
import json
import os
import sys

from db_init import init_db, DB_PATH
from import_tide import import_tide_csv
from import_track import import_track_csv
from conflict_detect import detect_tide_track_conflicts, resolve_conflict
from assessment import (
    create_assessment, revise_assessment, transition_status,
    get_assessment, get_audit_trail, risk_stratification, explain_change,
)


def cmd_init(args):
    os.environ["POLAR_ICE_DB"] = args.db
    path = init_db(args.db)
    print(json.dumps({"ok": True, "db": path}, ensure_ascii=False))


def cmd_import_tide(args):
    result = import_tide_csv(args.csv, batch_label=args.batch, operator=args.operator)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_import_track(args):
    result = import_track_csv(args.csv, batch_label=args.batch, operator=args.operator)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_detect_conflicts(args):
    result = detect_tide_track_conflicts(route_name=args.route, assess_date=args.date)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_resolve_conflict(args):
    result = resolve_conflict(args.id, args.resolution, operator=args.operator, reason=args.reason)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_assess_create(args):
    result = create_assessment(
        route_name=args.route, assess_date=args.date,
        ice_condition=args.ice, wind_wave_forecast=args.wind,
        risk_level=args.risk, operator=args.operator,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_assess_revise(args):
    fields = {}
    if args.ice:
        fields["ice_condition"] = args.ice
    if args.wind:
        fields["wind_wave_forecast"] = args.wind
    if args.risk:
        fields["risk_level"] = args.risk
    if args.tide_conflict:
        fields["tide_conflict"] = args.tide_conflict
    if args.track_issue:
        fields["track_issue"] = args.track_issue
    result = revise_assessment(args.id, fields, operator=args.operator, reason=args.reason)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_assess_status(args):
    result = transition_status(args.id, args.status, operator=args.operator, reason=args.reason)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_assess_list(args):
    result = get_assessment(route_name=args.route, assess_date=args.date, status=args.status)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_audit_log(args):
    result = get_audit_trail(args.id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_explain(args):
    result = explain_change(args.id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_risk(args):
    result = risk_stratification(risk_level=args.risk, route_name=args.route, limit=args.limit)
    print(json.dumps(result, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(
        prog="polar-ice",
        description="极地航线冰情评估 - 本地数据库命令行工具",
    )
    sub = parser.add_subparsers(dest="command")

    p_init = sub.add_parser("init", help="初始化数据库")
    p_init.add_argument("--db", default="polar_ice.db", help="数据库文件路径")
    p_init.set_defaults(func=cmd_init)

    p_it = sub.add_parser("import-tide", help="导入潮汐表CSV")
    p_it.add_argument("csv", help="潮汐表CSV文件路径")
    p_it.add_argument("--batch", help="批次标签（默认自动生成）")
    p_it.add_argument("--operator", default="system")
    p_it.set_defaults(func=cmd_import_tide)

    p_ik = sub.add_parser("import-track", help="导入船舶轨迹CSV")
    p_ik.add_argument("csv", help="船舶轨迹CSV文件路径")
    p_ik.add_argument("--batch", help="批次标签（默认自动生成）")
    p_ik.add_argument("--operator", default="system")
    p_ik.set_defaults(func=cmd_import_track)

    p_dc = sub.add_parser("detect-conflicts", help="检测潮汐-轨迹冲突")
    p_dc.add_argument("--route", help="航线名")
    p_dc.add_argument("--date", help="评估日期 YYYY-MM-DD")
    p_dc.set_defaults(func=cmd_detect_conflicts)

    p_rc = sub.add_parser("resolve-conflict", help="解决冲突")
    p_rc.add_argument("id", type=int, help="评估记录ID")
    p_rc.add_argument("resolution", help="解决方案描述")
    p_rc.add_argument("--operator", default="system")
    p_rc.add_argument("--reason")
    p_rc.set_defaults(func=cmd_resolve_conflict)

    p_ac = sub.add_parser("assess-create", help="创建评估记录")
    p_ac.add_argument("--route", required=True, help="航线名")
    p_ac.add_argument("--date", required=True, help="评估日期 YYYY-MM-DD")
    p_ac.add_argument("--ice", help="冰情描述")
    p_ac.add_argument("--wind", help="风浪预报")
    p_ac.add_argument("--risk", choices=["low", "medium", "high", "extreme"], help="风险等级")
    p_ac.add_argument("--operator", default="system")
    p_ac.set_defaults(func=cmd_assess_create)

    p_ar = sub.add_parser("assess-revise", help="修正评估记录（留痕）")
    p_ar.add_argument("id", type=int, help="评估记录ID")
    p_ar.add_argument("--ice", help="冰情描述")
    p_ar.add_argument("--wind", help="风浪预报")
    p_ar.add_argument("--risk", choices=["low", "medium", "high", "extreme"])
    p_ar.add_argument("--tide-conflict", help="潮汐冲突说明")
    p_ar.add_argument("--track-issue", help="轨迹问题说明")
    p_ar.add_argument("--operator", default="system")
    p_ar.add_argument("--reason", help="修正原因")
    p_ar.set_defaults(func=cmd_assess_revise)

    p_as = sub.add_parser("assess-status", help="变更评估状态")
    p_as.add_argument("id", type=int, help="评估记录ID")
    p_as.add_argument("status", choices=["pending", "approved", "rejected", "revised"])
    p_as.add_argument("--operator", default="system")
    p_as.add_argument("--reason")
    p_as.set_defaults(func=cmd_assess_status)

    p_al = sub.add_parser("assess-list", help="查询评估记录")
    p_al.add_argument("--route")
    p_al.add_argument("--date")
    p_al.add_argument("--status")
    p_al.set_defaults(func=cmd_assess_list)

    p_audit = sub.add_parser("audit-log", help="查看审计日志")
    p_audit.add_argument("id", type=int, help="评估记录ID")
    p_audit.set_defaults(func=cmd_audit_log)

    p_explain = sub.add_parser("explain", help="解释评估变更前后差异")
    p_explain.add_argument("id", type=int, help="评估记录ID")
    p_explain.set_defaults(func=cmd_explain)

    p_risk = sub.add_parser("risk", help="风险分层日常入口")
    p_risk.add_argument("--risk", choices=["low", "medium", "high", "extreme"])
    p_risk.add_argument("--route")
    p_risk.add_argument("--limit", type=int, default=50)
    p_risk.set_defaults(func=cmd_risk)

    args = parser.parse_args()
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    args.func(args)


if __name__ == "__main__":
    main()
