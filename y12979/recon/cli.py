from __future__ import annotations

import argparse
import os
import sys

from .datadict import get_all_entries, register_new_fields
from .engine import ReconEngine
from .idempotent import (
    check_idempotent,
    compute_fingerprint,
    list_all_files,
    update_state,
)
from .loader import detect_new_fields, load_transactions, load_work_orders
from .perm_audit import audit_data_dict_changes, load_perm_audit
from .reporter import generate_report, write_report
from .rollback import load_rollback_log, prune_stale_open_records, save_rollback_log


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="recon",
        description="账务流水对账查询 — CLI 工具",
    )
    parser.add_argument(
        "--input-dir",
        required=False,
        help="输入材料目录，包含账务流水（CSV/JSON）和业务工单（CSV/JSON）",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="输出目录，存放对账报告、回滚日志、数据字典、权限审计等",
    )
    parser.add_argument(
        "--supplement-rollback",
        nargs=2,
        metavar=("RECORD_ID", "NOTE"),
        help="为指定回滚记录追加补充说明",
    )
    parser.add_argument(
        "--resolve-rollback",
        metavar="RECORD_ID",
        help="将指定回滚记录标记为已解决",
    )
    parser.add_argument(
        "--supplement-datadict",
        nargs=3,
        metavar=("FIELD_NAME", "DESCRIPTION", "FIELD_TYPE"),
        help="为数据字典中的字段补录描述",
    )
    parser.add_argument(
        "--resolve-audit",
        nargs=2,
        metavar=("AUDIT_ID", "ACTION"),
        help="将指定权限审计条目标记为已处理 (grant/revoke/review)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    os.makedirs(args.output_dir, exist_ok=True)

    needs_input = not any([
        args.supplement_rollback,
        args.resolve_rollback,
        args.supplement_datadict,
        args.resolve_audit,
    ])
    if needs_input:
        if not args.input_dir:
            print("[ERROR] 对账运行需要 --input-dir 参数", file=sys.stderr)
            return 1
        if not os.path.isdir(args.input_dir):
            print(f"[ERROR] 输入目录不存在: {args.input_dir}", file=sys.stderr)
            return 1

    if args.supplement_rollback:
        from .rollback import supplement_rollback

        record = supplement_rollback(args.output_dir, args.supplement_rollback[0], args.supplement_rollback[1])
        if record:
            print(f"[OK] 回滚记录 {record.record_id} 已追加说明，状态: {record.status.value}")
        else:
            print(f"[WARN] 未找到回滚记录: {args.supplement_rollback[0]}")
        return 0

    if args.resolve_rollback:
        from .rollback import resolve_rollback

        record = resolve_rollback(args.output_dir, args.resolve_rollback)
        if record:
            print(f"[OK] 回滚记录 {record.record_id} 已解决")
        else:
            print(f"[WARN] 未找到回滚记录: {args.resolve_rollback}")
        return 0

    if args.supplement_datadict:
        from .datadict import supplement_field
        from .perm_audit import audit_data_dict_supplement

        field_name, description, field_type = args.supplement_datadict
        entry = supplement_field(args.output_dir, field_name, description, field_type)
        if entry:
            audit = audit_data_dict_supplement(args.output_dir, field_name)
            print(f"[OK] 数据字典字段「{field_name}」已补录，权限审计已联动更新")
            if audit:
                print(f"     审计ID: {audit.audit_id}")
        else:
            print(f"[WARN] 数据字典中未找到字段: {field_name}")
        return 0

    if args.resolve_audit:
        from .models import PermAuditAction
        from .perm_audit import resolve_audit

        audit_id, action_str = args.resolve_audit
        try:
            action = PermAuditAction(action_str)
        except ValueError:
            print(f"[ERROR] 无效动作: {action_str}，可选: grant/revoke/review")
            return 1
        result = resolve_audit(args.output_dir, audit_id, action)
        if result:
            print(f"[OK] 权限审计 {audit_id} 已处理，动作: {action.value}")
        else:
            print(f"[WARN] 未找到权限审计条目: {audit_id}")
        return 0

    return _run_recon(args.input_dir, args.output_dir)


def _run_recon(input_dir: str, output_dir: str) -> int:
    from .models import ReconSession

    all_files = list_all_files(input_dir)
    if not all_files:
        print("[ERROR] 输入目录中没有文件", file=sys.stderr)
        return 1

    fingerprint = compute_fingerprint(all_files)
    idem = check_idempotent(output_dir, fingerprint)
    is_rerun = idem["is_rerun"]

    state_data = idem
    run_count = state_data.get("run_count", 0) + 1 if is_rerun else 1

    if is_rerun:
        print(f"[INFO] 检测到同批材料重复执行（指纹匹配），第 {run_count} 次运行，结果将覆盖更新")

    session = ReconSession(input_dir=input_dir, output_dir=output_dir, input_fingerprint=fingerprint)

    print(f"[1/6] 加载账务流水与业务工单...")
    transactions = load_transactions(input_dir)
    work_orders = load_work_orders(input_dir)
    print(f"      流水 {len(transactions)} 条，工单 {len(work_orders)} 条")

    if not transactions:
        print("[ERROR] 未找到有效的账务流水数据", file=sys.stderr)
        return 1

    print(f"[2/6] 执行对账引擎...")
    engine = ReconEngine()
    engine.run(transactions, work_orders, session)

    matched = sum(1 for r in session.results if r.status.value == "matched")
    pending = sum(1 for r in session.results if r.status.value == "pending")
    anomaly = sum(1 for r in session.results if r.status.value == "anomaly")
    blocked = sum(1 for r in session.results if r.status.value == "blocked_duplicate_migration")
    print(f"      顺利: {matched} | 待确认: {pending} | 异常: {anomaly} | 拦截迁移重复: {blocked}")

    print(f"[3/6] 保存回滚日志（{len(session.rollbacks)} 条）...")
    if is_rerun and state_data.get("previous_session"):
        existing_rollbacks = prune_stale_open_records(
            output_dir, [state_data["previous_session"]]
        )
        print(f"      已清理上次会话未处理的重复记录，保留 {len(existing_rollbacks)} 条人工处理过的记录")
    else:
        existing_rollbacks = load_rollback_log(output_dir)
    all_rollbacks = existing_rollbacks + session.rollbacks
    save_rollback_log(output_dir, all_rollbacks)
    session.rollbacks = all_rollbacks

    print(f"[4/6] 检测数据字典新字段 & 联动权限审计...")
    new_field_names = detect_new_fields(transactions, work_orders)
    if new_field_names:
        new_entries = register_new_fields(output_dir, new_field_names, source="auto_detected")
        session.data_dict_changes = new_entries
        new_audits = audit_data_dict_changes(output_dir, new_entries)
        session.perm_audits = new_audits
        print(f"      新增字段 {len(new_entries)} 个，权限审计 {len(new_audits)} 条")
    else:
        print(f"      无新字段")
    session.data_dict_changes = list(get_all_entries(output_dir).values())
    session.perm_audits = load_perm_audit(output_dir)

    print(f"[5/6] 生成 HTML 报告...")
    html = generate_report(session, is_rerun=is_rerun, run_count=run_count)
    report_path = write_report(output_dir, html)
    print(f"      报告: {report_path}")

    print(f"[6/6] 更新幂等状态...")
    update_state(output_dir, session.session_id, fingerprint, session.started_at, run_count)

    print(f"\n{'='*50}")
    print(f"对账完成 | 会话: {session.session_id}")
    print(f"顺利: {matched} | 待确认: {pending} | 异常: {anomaly} | 拦截: {blocked}")
    print(f"报告: {report_path}")
    if blocked > 0:
        print(f"\n⚠ 拦截说明: {blocked} 条流水因迁移重复执行被拦截。")
        print(f"   拦截原因: 同一迁移批次被多次执行会导致账务金额重复累加。")
        print(f"   查看回滚日志: {os.path.join(output_dir, 'rollback_log.json')}")
    print(f"{'='*50}")

    return 0
