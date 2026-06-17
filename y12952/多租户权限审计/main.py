#!/usr/bin/env python3
"""多租户权限审计工具 - 命令行入口。"""
import argparse
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
if "audit" in sys.modules and hasattr(sys.modules["audit"], "__file__") and \
        os.path.abspath(sys.modules["audit"].__file__) == os.path.abspath(__file__):
    del sys.modules["audit"]

import json

from core.database import get_db, Database
from core.sample_data import load_sample_data
from core.models import FINDING_TYPES, RISK_LEVELS, REVIEW_STATUSES
from audit.analyzer import AuditAnalyzer
from audit.review import ReviewManager
from audit.trace import TraceEngine
from report.generator import ReportGenerator


DB_PATH_ENV = "AUDIT_DB_PATH"


def _get_db():
    path = os.environ.get(DB_PATH_ENV)
    db = get_db(path)
    return db


def cmd_init(args):
    db = _get_db()
    loaded = load_sample_data(db, force=args.force)
    if loaded:
        print("✅ 已初始化数据库并加载样例数据。")
        print("   （样例数据覆盖：备份缺口、外键断链、权限泄漏、角色超权、跨租户、孤立租户、迁移失败 7 类）")
        print("   建议直接运行 `python main.py dashboard` 或 `python main.py report` 查看。")
    else:
        print("ℹ️  数据库非空，未加载样例数据。使用 --force 可强制重置。")
    t_cnt = len(db.list_tenants())
    m_cnt = len(db.list_migration_scripts())
    p_cnt = len(db.list_permission_rules())
    r_cnt = len(db.list_processing_records())
    f_cnt = len(db.list_audit_findings())
    print(f"   现状：{t_cnt} 个租户 / {m_cnt} 个迁移脚本 / {p_cnt} 条权限规则 / "
          f"{r_cnt} 条处理记录 / {f_cnt} 条审计异常。")


def cmd_dashboard(args):
    db = _get_db()
    analyzer = AuditAnalyzer(db)
    s = analyzer.summary(tenant_id=args.tenant)
    tenant_label = "全部"
    if args.tenant:
        t = db.get_tenant(args.tenant)
        tenant_label = f"{t['tenant_name']}（{t['tenant_id']}）" if t else args.tenant
    print("=" * 66)
    print("多租户权限审计 · 总览")
    print(f"  范围：{tenant_label}    DB: {db.db_path}")
    print("=" * 66)
    print(f"  异常总数：{s['total_findings']}   待复核：{s['pending_review']}   "
          f"严重+高危：{s['needs_attention']}")
    print("")
    print("  按类型：")
    for k, v in s["by_type_labeled"].items():
        print(f"    · {k:<14} {v}")
    print("")
    print("  按风险：")
    for k, v in s["by_risk_labeled"].items():
        print(f"    · {k:<8} {v}")
    print("")
    print("  按复核状态：")
    for k, v in s["by_status_labeled"].items():
        print(f"    · {k:<8} {v}")
    print("")
    if s["batches"]:
        print("  批处理（迁移 & 权限共用记录）：")
        for b, info in s["batches"].items():
            print(f"    {b}:  总 {info['total']}, 成功 {info['success']}, "
                  f"失败 {info['failed']}, 跳过/审计 {info['skipped']}")
    print("")
    print(" 待复核 TOP 异常：")
    pending = ReviewManager(db).list_pending(tenant_id=args.tenant)
    if not pending:
        print("    （空）")
    else:
        for f in pending[:10]:
            type_lbl = FINDING_TYPES.get(f["finding_type"], f["finding_type"])
            risk_lbl = RISK_LEVELS.get(f["risk_level"], f["risk_level"])
            tenant = db.get_tenant(f["tenant_id"]) if f["tenant_id"] else None
            tn = tenant["tenant_name"] if tenant else (f["tenant_id"] or "-")
            print(f"    [{risk_lbl}] {f['finding_id']} {type_lbl} - {tn} - {f['title']}")
    print("")
    print("提示：  查看全部细节执行  `python main.py report`")
    print("提示：  复核操作         `python main.py review --finding Fxxx ...`")
    print("提示：  异常溯源         `python main.py trace --finding Fxxx`")


def cmd_report(args):
    db = _get_db()
    gen = ReportGenerator(db)
    content = gen.generate_report(
        format=args.format,
        tenant_id=args.tenant,
        include_pending_only=args.pending_only,
    )
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(content)
        print(f"✅ 报告已写入 {args.output}")
    else:
        print(content)


def cmd_explain(args):
    db = _get_db()
    f = db.get_audit_finding(args.finding)
    if not f:
        print(f"❌ 未找到异常 {args.finding}")
        sys.exit(1)
    gen = ReportGenerator(db)
    exp = gen.explain_finding(f)
    print("=" * 60)
    print(f"[{exp['risk_label']}] {exp['type_label']} — {f['finding_id']}: {exp['title']}")
    print("=" * 60)
    print("")
    print("★ 一句话解释：")
    print(f"   {exp['short_explanation']}")
    print("")
    print("★ 详细解释：")
    for ln in exp["detail_explanation"].splitlines():
        print(f"   {ln}")
    print("")
    print("✉  可直接复制转发同事：")
    print("   --- CUT BEGIN ---")
    for ln in exp["copy_paragraph"].splitlines():
        print(f"   {ln}")
    print("   ---  CUT END  ---")


def cmd_trace(args):
    db = _get_db()
    gen = ReportGenerator(db)
    print(gen.finding_trace_report(args.finding, format=args.format))


def cmd_review(args):
    db = _get_db()
    manager = ReviewManager(db)
    f = db.get_audit_finding(args.finding)
    if not f:
        print(f"❌ 未找到异常 {args.finding}")
        sys.exit(1)
    try:
        result = manager.review_finding(
            finding_id=args.finding,
            action=args.action,
            reviewer=args.reviewer,
            comment=args.comment,
            handler_opinion=args.handler_opinion,
        )
    except Exception as e:
        print(f"❌ 复核失败：{e}")
        sys.exit(1)
    old = REVIEW_STATUSES.get(result["old_status"], result["old_status"])
    new = REVIEW_STATUSES.get(result["new_status"], result["new_status"])
    print("=" * 60)
    print("✅ 复核成功（历史已留痕）：")
    print(f"   异常:    {args.finding}")
    print(f"   动作:    {result['action']}")
    print(f"   状态:    {old}  →  {new}")
    print(f"   操作人:  {result['reviewer']}")
    print(f"   时间:    {result['reviewed_at']}")
    print(f"   备注:    {result['comment']}")
    if args.handler_opinion:
        print(f"   处理意见: {args.handler_opinion}")
    print("=" * 60)
    print("💡 再次查看复核历史： `python main.py history --finding " + args.finding + "`")


def cmd_history(args):
    db = _get_db()
    hists = db.list_review_histories(args.finding)
    f = db.get_audit_finding(args.finding)
    if not f:
        print(f"❌ 未找到异常 {args.finding}")
        sys.exit(1)
    print("=" * 66)
    print(f"复核历史 · 异常 {args.finding}: {f['title']}")
    print(f"  当前状态：{REVIEW_STATUSES.get(f['review_status'], f['review_status'])}")
    print("=" * 66)
    if not hists:
        print("  （暂无复核记录）")
        return
    for i, h in enumerate(hists, 1):
        old = REVIEW_STATUSES.get(h["old_status"], h["old_status"])
        new = REVIEW_STATUSES.get(h["new_status"], h["new_status"])
        print(f"  [{i}] {h['reviewed_at']}")
        print(f"      操作人: {h['reviewer']}   动作: {h['action']}")
        print(f"      状态:   {old} → {new}")
        if h["comment"]:
            print(f"      原因:   {h['comment']}")
        print()


def cmd_batches(args):
    db = _get_db()
    analyzer = AuditAnalyzer(db)
    records = analyzer.migration_status(batch_no=args.batch)
    cmp_result = analyzer.compare_migration_vs_permission(batch_no=args.batch)
    if args.batch:
        print(f"批处理记录 · 批次 {args.batch}：")
    else:
        print("批处理记录（迁移 & 权限共用同一批记录）：")
    print(f"  总记录数：{len(records)}   "
          f"其中关联审计异常：{cmp_result['records_with_findings']}   "
          f"未关联异常：{cmp_result['records_without_findings']}")
    print("")
    print(f"{'#':>3} | {'批次':<22} | {'租户':<5} | {'类型':<10} | "
          f"{'状态':<8} | 源表:主键 → 目标表:主键 | 关联异常")
    print("-" * 110)
    for i, r in enumerate(records, 1):
        src = f"{r['source_table'] or '-'}:{r['source_pk'] or '-'}"
        tgt = f"{r['target_table'] or '-'}.{r['target_pk'] or '-'}"
        linked = next(
            (s for s in cmp_result["shared_records"] if s["record_id"] == r["record_id"]),
            None,
        )
        link_lbl = "-"
        if linked and linked["finding_id"]:
            risk = RISK_LEVELS.get(linked["risk_level"], linked["risk_level"])
            ftype = FINDING_TYPES.get(linked["finding_type"], linked["finding_type"])
            link_lbl = f"{linked['finding_id']} [{risk}] {ftype}"
        print(f"{i:>3} | {r['batch_no']:<22} | {r['tenant_id']:<5} | "
              f"{r['record_type_label']:<10} | {r['status_label']:<8} | "
              f"{src} → {tgt} | {link_lbl}")


def cmd_tenants(args):
    db = _get_db()
    tenants = db.list_tenants()
    print(f"共 {len(tenants)} 个租户：")
    for t in tenants:
        findings = db.list_audit_findings(tenant_id=t["tenant_id"])
        perms = db.list_permission_rules(tenant_id=t["tenant_id"])
        print(f"  {t['tenant_id']}  {t['tenant_name']:<16} 环境={t['environment']:<4} "
              f"异常数={len(findings)}  权限规则数={len(perms)}")


def build_parser():
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="多租户权限审计工具 · BI 分析师巡检小助手",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
子命令速查：
  init        初始化数据库并首次加载样例数据（不加样例数据你就没得看）
  dashboard   看总览：异常 / 风险 / 复核 / 批处理
  report      生成巡检报告（Markdown 或文本，附可复制文案）
  batches     批处理记录（迁移 & 权限共用一套记录，保证口径一致）
  tenants     列出所有租户
  trace       顺着异常往回查：处理记录 → 迁移脚本 → 处理意见
  explain     查看某条异常的普通话解释 + 可复制转发文案
  review      对异常做复核动作，历史自动记录：谁改的 / 什么时候 / 为什么
  history     查看某条异常的所有复核历史

环境变量：
  AUDIT_DB_PATH   指定 SQLite 数据库文件路径，默认 data/audit.db
""",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="初始化数据库 & 加载样例数据")
    p_init.add_argument("--force", action="store_true", help="强制重置并重新加载样例")
    p_init.set_defaults(func=cmd_init)

    p_dash = sub.add_parser("dashboard", help="总览仪表盘")
    p_dash.add_argument("--tenant", "-t", help="指定租户 ID（如 T002），默认全部")
    p_dash.set_defaults(func=cmd_dashboard)

    p_rep = sub.add_parser("report", help="生成完整审计报告")
    p_rep.add_argument("--format", "-f", choices=["md", "text"], default="md",
                       help="输出格式：md(默认)/text")
    p_rep.add_argument("--tenant", "-t", help="只包含某租户")
    p_rep.add_argument("--pending-only", action="store_true", help="只包含待复核的异常")
    p_rep.add_argument("--output", "-o", help="写入文件，否则 stdout")
    p_rep.set_defaults(func=cmd_report)

    p_exp = sub.add_parser("explain", help="单条异常的解释 + 可复制文案")
    p_exp.add_argument("--finding", "-f", required=True, help="异常 ID，如 F001")
    p_exp.set_defaults(func=cmd_explain)

    p_trace = sub.add_parser("trace", help="顺着异常溯源到处理记录、迁移脚本")
    p_trace.add_argument("--finding", "-f", required=True, help="异常 ID，如 F002")
    p_trace.add_argument("--format", choices=["text", "md"], default="text")
    p_trace.set_defaults(func=cmd_trace)

    p_rev = sub.add_parser("review", help="复核异常（自动留痕：谁/何时/为什么）")
    p_rev.add_argument("--finding", "-f", required=True, help="异常 ID，如 F002")
    p_rev.add_argument("--action", "-a", required=True,
                       choices=["APPROVE", "REJECT", "MARK_FIXED", "NEEDS_FIX", "REOPEN"],
                       help="复核动作：APPROVE=通过 / REJECT=驳回 / MARK_FIXED=已修复 / "
                            "NEEDS_FIX=待修复 / REOPEN=重新打开")
    p_rev.add_argument("--reviewer", "-r", required=True, help="操作人姓名/工号，如 张工/zhangwei")
    p_rev.add_argument("--comment", "-c", required=True, help="为什么这么改（必填，不然历史无意义）")
    p_rev.add_argument("--handler-opinion", help="处理意见，会写到异常本身（可选）")
    p_rev.set_defaults(func=cmd_review)

    p_hist = sub.add_parser("history", help="查看复核历史")
    p_hist.add_argument("--finding", "-f", required=True, help="异常 ID")
    p_hist.set_defaults(func=cmd_history)

    p_batch = sub.add_parser("batches", help="批处理记录（迁移+权限共用）")
    p_batch.add_argument("--batch", "-b", help="按批次号过滤")
    p_batch.set_defaults(func=cmd_batches)

    p_tnt = sub.add_parser("tenants", help="列出租户清单")
    p_tnt.set_defaults(func=cmd_tenants)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(0)
    args.func(args)


if __name__ == "__main__":
    main()
