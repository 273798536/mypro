#!/usr/bin/env python3
"""采样包素材分账对齐工具

三件事:
  1. 放样例 — 把合同扫描件(JSON)放进 contracts/ 目录，运行 scan 检查版本冲突
  2. 重跑   — 修改合同后再次运行 align，输出新时间戳的CSV，不覆盖旧结果
  3. 查明细 — 运行 view <csv文件> 查看对齐结果表格

退出码: 0=全部正常  1=部分异常(补录/版本冲突)  2=失败

合同JSON必填字段: contract_id, artist_name, sample_pack_name, version
选填字段: producer, split_ratio, scan_date, source_file, assets, note

status含义: ok=正常  supplement=补录  exception=异常(缺字段/缺比例)
           version_conflict=旧版文件(不覆盖新版)
"""
import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

EXIT_OK = 0
EXIT_PARTIAL = 1
EXIT_FAIL = 2

CONTRACT_FIELDS = [
    "contract_id", "artist_name", "sample_pack_name", "producer",
    "split_ratio", "version", "scan_date", "source_file", "assets", "note"
]

REQUIRED_FIELDS = ["contract_id", "artist_name", "sample_pack_name", "version"]

RECON_CSV_FIELDS = [
    "record_id", "contract_id", "artist_name", "sample_pack_name",
    "asset_name", "asset_type", "revenue", "producer_share",
    "artist_share", "expected_producer", "expected_artist",
    "status", "version", "failure_reason"
]

VERSION_CSV_FIELDS = [
    "contract_id", "sample_pack_name", "found_version",
    "latest_version", "is_latest", "source_file",
    "scan_date", "suggestion"
]


def load_contracts(contracts_dir):
    contracts = []
    errors = []
    dir_path = Path(contracts_dir)
    if not dir_path.is_dir():
        return contracts, [{"error": f"contracts_dir not found: {contracts_dir}"}]

    for f in sorted(dir_path.glob("*.json")):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            missing = [fld for fld in REQUIRED_FIELDS if fld not in data or data[fld] is None]
            if missing:
                errors.append({
                    "file": f.name,
                    "error": f"missing required fields: {', '.join(missing)}"
                })
                data["_validation_error"] = f"missing: {', '.join(missing)}"
            data["_source_file"] = f.name
            contracts.append(data)
        except json.JSONDecodeError as e:
            errors.append({"file": f.name, "error": f"invalid JSON: {e}"})
        except Exception as e:
            errors.append({"file": f.name, "error": f"read failed: {e}"})

    return contracts, errors


def detect_version_conflicts(contracts):
    pack_versions = {}
    for c in contracts:
        key = (c.get("artist_name", ""), c.get("sample_pack_name", ""))
        if key not in pack_versions:
            pack_versions[key] = []
        pack_versions[key].append(c)

    conflicts = []
    for key, versions in pack_versions.items():
        if len(versions) <= 1:
            continue
        sorted_v = sorted(versions, key=lambda x: parse_version(x.get("version", "0")))
        latest = sorted_v[-1]
        for c in sorted_v:
            v = c.get("version", "0")
            is_latest = (c is latest)
            if not is_latest:
                suggestion = (
                    f"旧版v{v}，勿覆盖新版v{latest.get('version', '?')}；"
                    f"建议保留新版数据，旧版标记为历史归档"
                )
            else:
                suggestion = "当前最新版本，正常使用"
            conflicts.append({
                "contract_id": c.get("contract_id", ""),
                "sample_pack_name": c.get("sample_pack_name", ""),
                "found_version": v,
                "latest_version": latest.get("version", ""),
                "is_latest": is_latest,
                "source_file": c.get("_source_file", ""),
                "scan_date": c.get("scan_date", ""),
                "suggestion": suggestion,
                "_contract": c,
                "_is_old": not is_latest,
            })
    return conflicts


def parse_version(v):
    parts = []
    for p in str(v).split("."):
        try:
            parts.append(int(p))
        except ValueError:
            parts.append(0)
    return tuple(parts)


def align_contract(contract, version_conflicts, record_counter):
    records = []
    cid = contract.get("contract_id", "")
    artist = contract.get("artist_name", "")
    pack = contract.get("sample_pack_name", "")
    version = contract.get("version", "")
    split = contract.get("split_ratio")
    assets = contract.get("assets", [])
    val_err = contract.get("_validation_error", "")

    conflict_info = None
    for vc in version_conflicts:
        if vc["contract_id"] == cid:
            conflict_info = vc
            break

    if val_err:
        for asset in assets:
            record_counter[0] += 1
            records.append({
                "record_id": f"REC-{record_counter[0]:04d}",
                "contract_id": cid,
                "artist_name": artist,
                "sample_pack_name": pack,
                "asset_name": asset.get("asset_name", ""),
                "asset_type": asset.get("type", ""),
                "revenue": asset.get("revenue", 0),
                "producer_share": "",
                "artist_share": "",
                "expected_producer": "",
                "expected_artist": "",
                "status": "exception",
                "version": version,
                "failure_reason": val_err,
            })
        return records

    if conflict_info and conflict_info["_is_old"]:
        for asset in assets:
            record_counter[0] += 1
            records.append({
                "record_id": f"REC-{record_counter[0]:04d}",
                "contract_id": cid,
                "artist_name": artist,
                "sample_pack_name": pack,
                "asset_name": asset.get("asset_name", ""),
                "asset_type": asset.get("type", ""),
                "revenue": asset.get("revenue", 0),
                "producer_share": "",
                "artist_share": "",
                "expected_producer": "",
                "expected_artist": "",
                "status": "version_conflict",
                "version": version,
                "failure_reason": (
                    f"旧版文件v{version}，新版v{conflict_info['latest_version']}已存在；"
                    f"未覆盖新版，请确认是否保留旧版数据"
                ),
            })
        return records

    if not split:
        for asset in assets:
            record_counter[0] += 1
            records.append({
                "record_id": f"REC-{record_counter[0]:04d}",
                "contract_id": cid,
                "artist_name": artist,
                "sample_pack_name": pack,
                "asset_name": asset.get("asset_name", ""),
                "asset_type": asset.get("type", ""),
                "revenue": asset.get("revenue", 0),
                "producer_share": "",
                "artist_share": "",
                "expected_producer": "",
                "expected_artist": "",
                "status": "exception",
                "version": version,
                "failure_reason": "split_ratio为空，合同分账比例缺失，需补录后重跑",
            })
        return records

    producer_rate = split.get("producer", 0)
    artist_rate = split.get("artist", 0)

    for asset in assets:
        record_counter[0] += 1
        rev = asset.get("revenue", 0)
        producer_amt = round(rev * producer_rate, 2)
        artist_amt = round(rev * artist_rate, 2)
        is_supplement = "补录" in contract.get("note", "")

        records.append({
            "record_id": f"REC-{record_counter[0]:04d}",
            "contract_id": cid,
            "artist_name": artist,
            "sample_pack_name": pack,
            "asset_name": asset.get("asset_name", ""),
            "asset_type": asset.get("type", ""),
            "revenue": rev,
            "producer_share": producer_amt,
            "artist_share": artist_amt,
            "expected_producer": producer_amt,
            "expected_artist": artist_amt,
            "status": "supplement" if is_supplement else "ok",
            "version": version,
            "failure_reason": "",
        })

    return records


def write_csv(records, output_path):
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=RECON_CSV_FIELDS)
        writer.writeheader()
        for r in records:
            writer.writerow(r)


def write_version_csv(conflicts, output_path):
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=VERSION_CSV_FIELDS)
        writer.writeheader()
        for c in conflicts:
            writer.writerow({k: c[k] for k in VERSION_CSV_FIELDS})


def read_csv(csv_path):
    rows = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def cmd_scan(args):
    contracts, errors = load_contracts(args.contracts_dir)
    if errors:
        print("[scan] 加载合同出现以下问题：", file=sys.stderr)
        for e in errors:
            print(f"  - {e.get('file', '?')}: {e.get('error', '?')}", file=sys.stderr)

    if not contracts:
        print("[scan] 未找到任何有效合同，退出", file=sys.stderr)
        return EXIT_FAIL

    conflicts = detect_version_conflicts(contracts)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    version_csv_path = out_dir / f"version_conflicts_{ts}.csv"
    write_version_csv(conflicts, version_csv_path)
    print(f"[scan] 版本冲突报告: {version_csv_path}")

    if conflicts:
        old_count = sum(1 for c in conflicts if c["_is_old"])
        print(f"[scan] 发现 {old_count} 个旧版文件，已列出版本来源和处理建议，未覆盖新版")

    for c in contracts:
        print(f"  已扫描: {c.get('contract_id')} v{c.get('version')} ({c.get('_source_file')})")

    return EXIT_OK if not errors else EXIT_PARTIAL


def cmd_align(args):
    contracts, errors = load_contracts(args.contracts_dir)
    if errors:
        print("[align] 加载合同出现以下问题：", file=sys.stderr)
        for e in errors:
            print(f"  - {e.get('file', '?')}: {e.get('error', '?')}", file=sys.stderr)

    if not contracts:
        print("[align] 未找到任何有效合同，退出", file=sys.stderr)
        return EXIT_FAIL

    conflicts = detect_version_conflicts(contracts)
    record_counter = [0]
    all_records = []

    for contract in contracts:
        records = align_contract(contract, conflicts, record_counter)
        all_records.extend(records)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    recon_csv_path = out_dir / f"recon_detail_{ts}.csv"
    write_csv(all_records, recon_csv_path)

    version_csv_path = out_dir / f"version_conflicts_{ts}.csv"
    write_version_csv(conflicts, version_csv_path)

    ok_count = sum(1 for r in all_records if r["status"] == "ok")
    supp_count = sum(1 for r in all_records if r["status"] == "supplement")
    exc_count = sum(1 for r in all_records if r["status"] == "exception")
    vc_count = sum(1 for r in all_records if r["status"] == "version_conflict")

    print(f"[align] 分账对齐完成")
    print(f"  总记录: {len(all_records)}")
    print(f"  正常: {ok_count}  补录: {supp_count}  异常: {exc_count}  版本冲突: {vc_count}")
    print(f"  明细CSV: {recon_csv_path}")
    print(f"  版本CSV: {version_csv_path}")

    if vc_count > 0:
        print(f"  ⚠ 存在旧版文件，已标记为version_conflict，未覆盖新版数据")

    if exc_count > 0 or vc_count > 0:
        return EXIT_PARTIAL
    return EXIT_OK


def cmd_view(args):
    csv_path = Path(args.csv_file)
    if not csv_path.is_file():
        print(f"[view] 文件不存在: {csv_path}", file=sys.stderr)
        return EXIT_FAIL

    rows = read_csv(csv_path)
    if not rows:
        print("[view] CSV为空", file=sys.stderr)
        return EXIT_FAIL

    fields = rows[0].keys()
    col_widths = {}
    for f in fields:
        col_widths[f] = max(len(str(f)), *(len(str(r.get(f, ""))) for r in rows[:20]))
        col_widths[f] = min(col_widths[f], 28)

    header = " | ".join(f.ljust(col_widths[f]) for f in fields)
    sep = "-+-".join("-" * col_widths[f] for f in fields)
    print(header)
    print(sep)

    for row in rows[:50]:
        line = " | ".join(str(row.get(f, "")).ljust(col_widths[f]) for f in fields)
        print(line)

    if len(rows) > 50:
        print(f"... 共 {len(rows)} 行，仅显示前50行")

    return EXIT_OK


def build_parser():
    parser = argparse.ArgumentParser(
        prog="sample_pack_recon",
        description="采样包素材分账对齐工具"
    )
    sub = parser.add_subparsers(dest="action", required=True)

    p_scan = sub.add_parser("scan", help="扫描合同目录，检测版本冲突")
    p_scan.add_argument("--contracts-dir", default="./contracts",
                        help="合同扫描件目录 (默认 ./contracts)")
    p_scan.add_argument("--output-dir", default="./output",
                        help="输出目录 (默认 ./output)")

    p_align = sub.add_parser("align", help="执行分账对齐，输出CSV明细")
    p_align.add_argument("--contracts-dir", default="./contracts",
                         help="合同扫描件目录 (默认 ./contracts)")
    p_align.add_argument("--output-dir", default="./output",
                         help="输出目录 (默认 ./output)")

    p_view = sub.add_parser("view", help="查看CSV明细")
    p_view.add_argument("csv_file", help="CSV文件路径")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.action == "scan":
        return cmd_scan(args)
    elif args.action == "align":
        return cmd_align(args)
    elif args.action == "view":
        return cmd_view(args)
    else:
        parser.print_help()
        return EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main())
