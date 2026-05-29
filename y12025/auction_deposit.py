#!/usr/bin/env python3
import argparse
import csv
import json
import os
import sys
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

DB_DIR = Path(".auction_deposit")
DB_FILE = DB_DIR / "db.json"
OVERDUE_DAYS = 30

BID_REGISTRATION_UNIQUE = {"deposit_amount", "保证金金额", "registered_at", "登记时间"}
TRANSACTION_CONFIRM_UNIQUE = {"confirmation_no", "hammer_price", "确认书编号", "落槌价", "佣金比例"}
FUND_TRANSACTION_UNIQUE = {"transaction_no", "direction", "fund_type", "流水号", "收支方向", "资金类型"}

CN_MAP_BID = {
    "竞买人编号": "bidder_id", "竞买人姓名": "bidder_name",
    "拍卖会编号": "auction_id", "拍品编号": "lot_id",
    "拍品名称": "lot_name", "保证金金额": "deposit_amount",
    "登记时间": "registered_at",
}
CN_MAP_CONFIRM = {
    "确认书编号": "confirmation_no", "竞买人编号": "bidder_id",
    "拍卖会编号": "auction_id", "拍品编号": "lot_id",
    "落槌价": "hammer_price", "佣金比例": "commission_rate",
    "确认时间": "confirmed_at",
}
CN_MAP_FUND = {
    "流水号": "transaction_no", "竞买人编号": "bidder_id",
    "金额": "amount", "收支方向": "direction",
    "资金类型": "fund_type", "交易时间": "transaction_at",
    "拍品编号": "lot_id", "备注": "note",
}


def _record_fingerprint(rec):
    parts = [rec.get("source_file", ""), str(rec.get("source_row", "")),
             rec.get("bidder_id", ""), rec.get("lot_id", ""),
             rec.get("transaction_no", "") or rec.get("confirmation_no", "")]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]


def _finding_fingerprint(rule_id, bidder_id, lot_id, extra=""):
    parts = [rule_id, bidder_id or "", lot_id or "", extra]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]


def _detect_row_type(row):
    keys = set(row.keys())
    fund_score = len(keys & FUND_TRANSACTION_UNIQUE)
    confirm_score = len(keys & TRANSACTION_CONFIRM_UNIQUE)
    bid_score = len(keys & BID_REGISTRATION_UNIQUE)
    if fund_score >= confirm_score and fund_score >= bid_score and fund_score > 0:
        return "fund_transaction"
    if confirm_score >= bid_score and confirm_score > 0:
        return "transaction_confirmation"
    if bid_score > 0:
        return "bid_registration"
    explicit = row.get("type", "").lower()
    if "confirm" in explicit:
        return "transaction_confirmation"
    if "fund" in explicit or "流水" in explicit:
        return "fund_transaction"
    return "bid_registration"


def _translate_row(row, type_):
    mapping = {
        "bid_registration": CN_MAP_BID,
        "transaction_confirmation": CN_MAP_CONFIRM,
        "fund_transaction": CN_MAP_FUND,
    }[type_]
    out = {}
    for k, v in row.items():
        out[mapping.get(k, k)] = v
    return out


def _coerce_types(rec, type_):
    for field in ("deposit_amount", "hammer_price", "commission_rate", "amount"):
        if field in rec and rec[field] != "":
            try:
                val = str(rec[field]).replace(",", "").strip()
                rec[field] = float(val)
            except ValueError:
                pass
    if "direction" in rec:
        d = str(rec["direction"]).strip()
        if d in ("收入", "in", "IN", "In"):
            rec["direction"] = "in"
        elif d in ("支出", "out", "OUT", "Out"):
            rec["direction"] = "out"
    if "fund_type" in rec:
        ft = str(rec["fund_type"]).strip()
        cn_to_en = {"保证金缴纳": "deposit_payment", "保证金退回": "deposit_refund",
                     "尾款支付": "balance_payment", "其他": "other"}
        rec["fund_type"] = cn_to_en.get(ft, ft)
    return rec


def _parse_datetime(val):
    if not val:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d", "%Y/%m/%d %H:%M"):
        try:
            return datetime.strptime(str(val).strip(), fmt)
        except ValueError:
            continue
    return None


def load_db():
    if DB_FILE.exists():
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "bid_registrations": [],
        "transaction_confirmations": [],
        "fund_transactions": [],
        "findings": [],
        "imported_files": [],
    }


def save_db(db):
    DB_DIR.mkdir(exist_ok=True)
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)


def cmd_import(db, args):
    filepath = Path(args.file)
    if not filepath.exists():
        print(f"错误: 文件不存在 {filepath}", file=sys.stderr)
        return 1
    if filepath.name in db["imported_files"] and not args.force:
        print(f"跳过: {filepath.name} 已导入（使用 --force 强制重导入）")
        return 0
    ext = filepath.suffix.lower()
    rows = []
    if ext == ".csv":
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 2):
                row["_source_row"] = i
                rows.append(row)
    elif ext == ".json":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            for i, item in enumerate(data, 1):
                if isinstance(item, dict):
                    item["_source_row"] = i
                    rows.append(item)
        elif isinstance(data, dict):
            for type_key in ("bid_registrations", "transaction_confirmations", "fund_transactions"):
                for i, item in enumerate(data.get(type_key, []), 1):
                    item["_source_row"] = i
                    item["_force_type"] = type_key
                    rows.append(item)
    else:
        print(f"错误: 不支持的文件格式 {ext}", file=sys.stderr)
        return 1

    existing_fps = {_record_fingerprint(r) for r in db["bid_registrations"]}
    existing_fps |= {_record_fingerprint(r) for r in db["transaction_confirmations"]}
    existing_fps |= {_record_fingerprint(r) for r in db["fund_transactions"]}
    counts = {"bid_registration": 0, "transaction_confirmation": 0, "fund_transaction": 0}
    skipped = 0
    for row in rows:
        source_row = row.pop("_source_row", None)
        force_type = row.pop("_force_type", None)
        type_ = force_type if force_type else _detect_row_type(row)
        rec = _translate_row(row, type_)
        rec = _coerce_types(rec, type_)
        rec["source_file"] = filepath.name
        rec["source_row"] = source_row
        rec["imported_at"] = datetime.now().isoformat()
        fp = _record_fingerprint(rec)
        if fp in existing_fps:
            skipped += 1
            continue
        existing_fps.add(fp)
        target_key = {"bid_registration": "bid_registrations",
                      "transaction_confirmation": "transaction_confirmations",
                      "fund_transaction": "fund_transactions"}[type_]
        db[target_key].append(rec)
        counts[type_] += 1
    if filepath.name not in db["imported_files"]:
        db["imported_files"].append(filepath.name)
    save_db(db)
    print(f"导入完成: {filepath.name}")
    for t, c in counts.items():
        if c:
            label = {"bid_registration": "竞买登记", "transaction_confirmation": "成交确认",
                     "fund_transaction": "资金流水"}[t]
            print(f"  {label}: {c} 条")
    if skipped:
        print(f"  跳过重复: {skipped} 条")
    return 0


def _build_index(db):
    reg_by_bidder_lot = defaultdict(list)
    for r in db["bid_registrations"]:
        key = (r.get("bidder_id"), r.get("lot_id"))
        reg_by_bidder_lot[key].append(r)
    confirm_by_bidder_lot = defaultdict(list)
    for c in db["transaction_confirmations"]:
        key = (c.get("bidder_id"), c.get("lot_id"))
        confirm_by_bidder_lot[key].append(c)
    funds_by_bidder = defaultdict(list)
    funds_by_bidder_lot = defaultdict(list)
    for f in db["fund_transactions"]:
        bidder = f.get("bidder_id")
        lot = f.get("lot_id")
        funds_by_bidder[bidder].append(f)
        if lot:
            funds_by_bidder_lot[(bidder, lot)].append(f)
    return reg_by_bidder_lot, confirm_by_bidder_lot, funds_by_bidder, funds_by_bidder_lot


def _source_tag(rec):
    return f"{rec.get('source_file', '?')}#L{rec.get('source_row', '?')}"


def _existing_finding_ids(db):
    return {f["id"] for f in db["findings"]}


def _add_finding(db, finding_id, rule_id, severity, bidder_id, lot_id,
                 description, sources, suggestion=""):
    if finding_id in _existing_finding_ids(db):
        return False
    db["findings"].append({
        "id": finding_id,
        "rule_id": rule_id,
        "severity": severity,
        "bidder_id": bidder_id,
        "lot_id": lot_id,
        "description": description,
        "sources": sources,
        "suggestion": suggestion,
        "created_at": datetime.now().isoformat(),
    })
    return True


def cmd_check(db, args):
    db["findings"] = []
    reg_idx, confirm_idx, funds_by_bidder, funds_by_bidder_lot = _build_index(db)
    total = 0
    all_keys = set(reg_idx.keys()) | set(confirm_idx.keys())
    for key in sorted(all_keys):
        bidder_id, lot_id = key
        regs = reg_idx.get(key, [])
        confirms = confirm_idx.get(key, [])
        lot_funds = funds_by_bidder_lot.get(key, [])
        bidder_funds = funds_by_bidder.get(bidder_id, [])
        sources = [_source_tag(r) for r in regs + confirms + lot_funds]
        deposit_locked = _check_deposit_lock(db, bidder_id, lot_id, regs, confirms,
                                             lot_funds, bidder_funds, sources)
        _check_bidding_status(db, bidder_id, lot_id, regs, confirms, lot_funds, sources)
        _check_overdue(db, bidder_id, lot_id, regs, confirms, lot_funds, bidder_funds, sources)
        total += deposit_locked
    save_db(db)
    print(f"检查完成，共 {len(all_keys)} 条竞买记录")
    _print_findings(db)
    return 0


def _check_deposit_lock(db, bidder_id, lot_id, regs, confirms, lot_funds,
                        bidder_funds, sources):
    if not regs:
        return 0
    deposit_amt = sum(r.get("deposit_amount", 0) or 0 for r in regs)
    deposit_in = sum(f.get("amount", 0) or 0 for f in bidder_funds
                     if f.get("direction") == "in" and f.get("fund_type") == "deposit_payment")
    deposit_out = sum(f.get("amount", 0) or 0 for f in bidder_funds
                      if f.get("direction") == "out" and f.get("fund_type") == "deposit_refund")
    has_confirm = len(confirms) > 0
    is_failed = any(f.get("fund_type") == "deposit_refund" for f in lot_funds
                    if f.get("direction") == "out") and not has_confirm
    is_withdrawn = _is_withdrawn(regs, lot_funds)
    if has_confirm:
        fid = _finding_fingerprint("DL-002", bidder_id, lot_id)
        _add_finding(db, fid, "DL-002", "info", bidder_id, lot_id,
                     f"竞买人 {bidder_id} 拍品 {lot_id}: 已成交，保证金 {deposit_amt} 锁定转部分付款",
                     sources, "保证金已锁定，无需操作")
        refund_on_confirmed = [f for f in lot_funds
                               if f.get("direction") == "out" and f.get("fund_type") == "deposit_refund"]
        if refund_on_confirmed:
            refund_total = sum(f.get("amount", 0) or 0 for f in refund_on_confirmed)
            refund_src = [_source_tag(f) for f in refund_on_confirmed]
            fid_r = _finding_fingerprint("DL-CONFLICT", bidder_id, lot_id)
            _add_finding(db, fid_r, "DL-CONFLICT", "error", bidder_id, lot_id,
                         f"竞买人 {bidder_id} 拍品 {lot_id}: 已成交但存在保证金退回 {refund_total}，"
                         f"疑似脏数据（成交不应退保证金）",
                         sources + refund_src,
                         "核实退回流水是否录入错误，已成交拍品保证金不应退回")
    elif is_withdrawn:
        fid = _finding_fingerprint("DL-004", bidder_id, lot_id)
        _add_finding(db, fid, "DL-004", "warning", bidder_id, lot_id,
                     f"竞买人 {bidder_id} 拍品 {lot_id}: 竞价已撤销，保证金应解锁退回",
                     sources, "核实撤销后执行保证金退回")
    elif is_failed:
        fid = _finding_fingerprint("DL-003", bidder_id, lot_id)
        _add_finding(db, fid, "DL-003", "info", bidder_id, lot_id,
                     f"竞买人 {bidder_id} 拍品 {lot_id}: 流拍，保证金应退回",
                     sources, "确认退回金额与缴纳金额一致")
        if deposit_out != deposit_in and deposit_out > 0:
            fid2 = _finding_fingerprint("DL-003-MISMATCH", bidder_id, lot_id)
            _add_finding(db, fid2, "DL-003", "error", bidder_id, lot_id,
                         f"竞买人 {bidder_id} 拍品 {lot_id}: 流拍退回金额异常 "
                         f"(缴纳 {deposit_in}, 退回 {deposit_out})",
                         sources, "核对退回金额是否与缴纳金额一致")
    else:
        fid = _finding_fingerprint("DL-001", bidder_id, lot_id)
        _add_finding(db, fid, "DL-001", "info", bidder_id, lot_id,
                     f"竞买人 {bidder_id} 拍品 {lot_id}: 已登记，保证金 {deposit_amt} 锁定中",
                     sources, "等待成交或流拍结果")
    if deposit_in <= 0 and deposit_amt > 0:
        fid = _finding_fingerprint("DL-MISSING-IN", bidder_id, lot_id)
        _add_finding(db, fid, "DL-MISSING", "error", bidder_id, lot_id,
                     f"竞买人 {bidder_id} 拍品 {lot_id}: 有保证金登记 {deposit_amt} 但无对应缴款流水",
                     sources, "确认保证金是否实际到账")
    return 1


def _is_withdrawn(regs, lot_funds):
    for r in regs:
        status = str(r.get("status", "")).strip().lower()
        if status in ("withdrawn", "已撤销", "撤销"):
            return True
    for f in lot_funds:
        ft = str(f.get("fund_type", "")).strip()
        note = str(f.get("note", "")).strip()
        if "撤销" in ft or "撤销" in note or "withdraw" in ft.lower():
            return True
    return False


def _check_bidding_status(db, bidder_id, lot_id, regs, confirms, lot_funds, sources):
    if not regs:
        return
    is_withdrawn = _is_withdrawn(regs, lot_funds)
    has_refund_no_confirm = (any(f.get("direction") == "out" and f.get("fund_type") == "deposit_refund"
                                 for f in lot_funds) and not confirms)
    if is_withdrawn:
        status = "已撤销"
        rule = "BS-004"
    elif confirms:
        status = "已成交"
        rule = "BS-002"
    elif has_refund_no_confirm:
        status = "流拍"
        rule = "BS-003"
    else:
        status = "已登记"
        rule = "BS-001"
    fid = _finding_fingerprint(rule, bidder_id, lot_id)
    _add_finding(db, fid, rule, "info", bidder_id, lot_id,
                 f"竞买人 {bidder_id} 拍品 {lot_id}: 竞价状态={status}",
                 sources, "")


def _check_overdue(db, bidder_id, lot_id, regs, confirms, lot_funds, bidder_funds, sources):
    for c in confirms:
        confirmed_at = _parse_datetime(c.get("confirmed_at"))
        if not confirmed_at:
            continue
        hammer = c.get("hammer_price", 0) or 0
        deposit = sum(r.get("deposit_amount", 0) or 0 for r in regs)
        balance_due = hammer - deposit
        if balance_due <= 0:
            continue
        balance_paid = sum(f.get("amount", 0) or 0 for f in lot_funds
                           if f.get("direction") == "in" and f.get("fund_type") == "balance_payment")
        balance_paid_all = sum(f.get("amount", 0) or 0 for f in bidder_funds
                               if f.get("direction") == "in" and f.get("fund_type") == "balance_payment")
        if balance_paid >= balance_due:
            continue
        overdue_date = confirmed_at + timedelta(days=OVERDUE_DAYS)
        now = datetime.now()
        confirm_src = _source_tag(c)
        all_src = sources + [confirm_src]
        cross_lot_merge = balance_paid != balance_paid_all and balance_paid_all > balance_paid
        if now > overdue_date:
            days_over = (now - overdue_date).days
            fid = _finding_fingerprint("OW-001", bidder_id, lot_id, c.get("confirmation_no", ""))
            desc = (f"竞买人 {bidder_id} 拍品 {lot_id}: 尾款逾期 {days_over} 天 "
                    f"(应付 {balance_due}, 本拍品已付 {balance_paid})")
            _add_finding(db, fid, "OW-001", "error", bidder_id, lot_id, desc, all_src,
                         f"催收尾款 {balance_due - balance_paid} 或启动违约流程")
            if cross_lot_merge:
                fid_m = _finding_fingerprint("OW-MERGE", bidder_id, lot_id,
                                             c.get("confirmation_no", ""))
                _add_finding(db, fid_m, "OW-MERGE", "warning", bidder_id, lot_id,
                             f"竞买人 {bidder_id} 拍品 {lot_id}: 该竞买人多拍品尾款合计 "
                             f"{balance_paid_all}，但本拍品仅到账 {balance_paid}，"
                             f"请勿将其他拍品尾款计入本拍品",
                             all_src, "按拍品逐一核对尾款，避免跨拍品合并")
        elif now > overdue_date - timedelta(days=7):
            days_left = (overdue_date - now).days
            fid = _finding_fingerprint("OW-PRE", bidder_id, lot_id, c.get("confirmation_no", ""))
            _add_finding(db, fid, "OW-PRE", "warning", bidder_id, lot_id,
                         f"竞买人 {bidder_id} 拍品 {lot_id}: 尾款即将逾期，剩余 {days_left} 天 "
                         f"(应付 {balance_due}, 已付 {balance_paid})",
                         all_src,
                         f"提醒竞买人尽快支付尾款 {balance_due - balance_paid}")


def _print_findings(db):
    by_sev = defaultdict(list)
    for f in db["findings"]:
        by_sev[f["severity"]].append(f)
    order = [("error", "错误"), ("warning", "警告"), ("info", "信息")]
    for sev, label in order:
        items = by_sev.get(sev, [])
        if not items:
            continue
        print(f"\n--- {label} ({len(items)}) ---")
        for f in items:
            src_str = ", ".join(f["sources"][:3])
            if len(f["sources"]) > 3:
                src_str += f" 等{len(f['sources'])}项"
            print(f"  [{f['rule_id']}] {f['description']}")
            print(f"    来源: {src_str}")
            if f["suggestion"]:
                print(f"    建议: {f['suggestion']}")


def cmd_fix(db, args):
    if not db["findings"]:
        print("无可修正的检查结果，请先执行 check")
        return 1
    errors = [f for f in db["findings"] if f["severity"] == "error"]
    warnings = [f for f in db["findings"] if f["severity"] == "warning"]
    if not errors and not warnings:
        print("所有检查项均正常，无需修正")
        return 0
    print("=== 需要修正的问题 ===\n")
    for f in errors + warnings:
        print(f"[{f['rule_id']}] {f['description']}")
        print(f"  来源: {', '.join(f['sources'])}")
        print(f"  修正建议: {f['suggestion']}")
        print()
    return 0


def cmd_export(db, args):
    fmt = args.format
    out_path = args.output
    export_data = {
        "exported_at": datetime.now().isoformat(),
        "summary": {
            "bid_registrations": len(db["bid_registrations"]),
            "transaction_confirmations": len(db["transaction_confirmations"]),
            "fund_transactions": len(db["fund_transactions"]),
            "findings": len(db["findings"]),
            "findings_by_severity": {
                "error": len([f for f in db["findings"] if f["severity"] == "error"]),
                "warning": len([f for f in db["findings"] if f["severity"] == "warning"]),
                "info": len([f for f in db["findings"] if f["severity"] == "info"]),
            },
        },
        "findings": db["findings"],
        "bid_registrations": db["bid_registrations"],
        "transaction_confirmations": db["transaction_confirmations"],
        "fund_transactions": db["fund_transactions"],
    }
    if fmt == "json":
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    else:
        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["规则", "严重程度", "竞买人", "拍品", "描述", "来源", "建议"])
            for finding in db["findings"]:
                src = "; ".join(finding["sources"])
                writer.writerow([
                    finding["rule_id"], finding["severity"],
                    finding["bidder_id"], finding["lot_id"],
                    finding["description"], src, finding["suggestion"],
                ])
    print(f"导出完成: {out_path} ({fmt})")
    return 0


def cmd_status(db, args):
    n_reg = len(db["bid_registrations"])
    n_conf = len(db["transaction_confirmations"])
    n_fund = len(db["fund_transactions"])
    n_find = len(db["findings"])
    n_err = len([f for f in db["findings"] if f["severity"] == "error"])
    n_warn = len([f for f in db["findings"] if f["severity"] == "warning"])
    print("=== 艺术品拍卖保证金 - 当前状态 ===")
    print(f"竞买登记: {n_reg} 条")
    print(f"成交确认: {n_conf} 条")
    print(f"资金流水: {n_fund} 条")
    print(f"检查结论: {n_find} 条 (错误 {n_err}, 警告 {n_warn})")
    print(f"已导入文件: {', '.join(db['imported_files']) or '无'}")
    print(f"数据文件: {DB_FILE}")
    return 0


def main():
    parser = argparse.ArgumentParser(
        prog="auction_deposit",
        description="艺术品拍卖保证金管理 - 命令行工具",
    )
    sub = parser.add_subparsers(dest="command")

    p_import = sub.add_parser("import", help="导入竞买登记/成交确认/资金流水文件")
    p_import.add_argument("file", help="CSV 或 JSON 文件路径")
    p_import.add_argument("--force", action="store_true", help="强制重新导入已导入文件")

    sub.add_parser("check", help="执行保证金锁定、竞价状态、逾期预警检查")
    sub.add_parser("fix", help="查看修正建议")
    sub.add_parser("status", help="查看当前数据状态")

    p_export = sub.add_parser("export", help="导出检查结论")
    p_export.add_argument("--format", choices=["csv", "json"], default="csv")
    p_export.add_argument("--output", default="auction_deposit_export.csv",
                          help="导出文件路径")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1

    db = load_db()
    dispatch = {
        "import": cmd_import,
        "check": cmd_check,
        "fix": cmd_fix,
        "export": cmd_export,
        "status": cmd_status,
    }
    return dispatch[args.command](db, args)


if __name__ == "__main__":
    sys.exit(main())
