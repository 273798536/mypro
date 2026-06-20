#!/usr/bin/env python3
"""AB实验任务追踪

一条命令跑完整包样例:
    python ab_tracker.py demo

常用命令:
    python ab_tracker.py run    --version <别名>     跑指定版本的追踪
    python ab_tracker.py alias  --list               列出所有版本别名
    python ab_tracker.py diff   --v1 <旧别名> --v2 <新别名>   版本对比
    python ab_tracker.py timeline                    查看历史时间线
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SAMPLE_DIR = BASE_DIR / "sample_data"
ALIAS_FILE = SAMPLE_DIR / "alias_registry.json"
HISTORY_FILE = SAMPLE_DIR / "run_history.json"

FIELD_ALIASES = {
    "sample_count": ["sample_count", "n_samples", "num_samples", "样本数", "samples"],
    "threshold": ["threshold", "cutoff", "阈值", "thresh"],
    "manual_correction": ["manual_correction", "human_correction", "人工修正", "manual_fix", "override"],
    "metric": ["metric", "auc", "score", "指标", "metric_value"],
    "metric_name": ["metric_name", "metric_type", "指标名", "指标名称"],
    "experiment_id": ["experiment_id", "exp_id", "ab_id", "实验ID", "实验编号"],
    "group": ["group", "arm", "分组", "group_name"],
}

STATUS_COLORS = {
    "processed": ("\033[32m", "已处理"),
    "needs_material": ("\033[33m", "待补材料"),
    "manual_review": ("\033[35m", "人工改判"),
}


def load_json(path: Path, must_exist=True):
    if not path.exists():
        if must_exist:
            return None
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_fields(raw: dict) -> dict:
    """值班人给的字段名前后不一，统一到标准字段名。
    保住 source 和 status，这两个绝对不能丢。"""
    normalized = {
        "source": raw.get("_source_path", "unknown"),
        "status": raw.get("status", "needs_material"),
    }
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in raw and raw[alias] is not None:
                normalized[canonical] = raw[alias]
                break
    return normalized


def load_aliases():
    return load_json(ALIAS_FILE, must_exist=False) or {}


def resolve_alias(alias: str):
    """版本别名 → 日志文件路径。
    卡壳时必须说清楚：别名是否存在、指向哪里、文件在不在。"""
    aliases = load_aliases()
    if alias not in aliases:
        print(f"\n\033[31m[卡住] 版本别名 '{alias}' 未注册。\033[0m")
        print(f"  已注册的别名: {list(aliases.keys()) if aliases else '(空)'}")
        print(f"  下一步: 用 'python ab_tracker.py alias --add {alias}=<日志文件路径>' 先注册别名")
        print(f"           或检查拼写是否正确")
        sys.exit(2)

    entry = aliases[alias]
    log_path = Path(entry["log_path"])
    if not log_path.is_absolute():
        log_path = BASE_DIR / log_path

    if not log_path.exists():
        print(f"\n\033[31m[卡住] 版本别名 '{alias}' 指向的文件不存在。\033[0m")
        print(f"  别名 '{alias}' → {log_path}")
        print(f"  注册信息: {json.dumps(entry, ensure_ascii=False)}")
        print(f"  下一步: 1) 确认日志文件是否已生成")
        print(f"           2) 若路径变了，用 'python ab_tracker.py alias --add {alias}=<新路径>' 覆盖")
        print(f"           3) 若别名不再使用，用 'python ab_tracker.py alias --remove {alias}' 清理")
        sys.exit(3)

    return alias, log_path, entry


def run_tracking(alias: str):
    """跑单个版本的AB实验追踪。"""
    alias_name, log_path, alias_entry = resolve_alias(alias)
    raw_logs = load_json(log_path)
    if raw_logs is None:
        print(f"\n\033[31m[卡住] 日志文件读取失败: {log_path}\033[0m")
        sys.exit(4)

    if isinstance(raw_logs, dict):
        raw_list = raw_logs.get("experiments", [raw_logs])
    else:
        raw_list = raw_logs

    records = []
    small_samples = []
    for idx, raw in enumerate(raw_list):
        raw["_source_path"] = str(log_path)
        norm = normalize_fields(raw)

        if "experiment_id" not in norm:
            norm["experiment_id"] = f"exp_{idx:03d}"
        if "group" not in norm:
            norm["group"] = "unknown"

        sample_count = norm.get("sample_count")
        threshold = norm.get("threshold")

        if sample_count is not None and threshold is not None and sample_count < threshold:
            norm["status"] = "needs_material"
            norm["_reason"] = f"样本数({sample_count}) < 阈值({threshold})，小样本被平均数盖住，需补材料"
            small_samples.append(norm)
        elif "manual_correction" in norm:
            norm["status"] = "manual_review"
            norm["_reason"] = f"存在人工修正: {norm['manual_correction']}"
        else:
            norm["status"] = "processed"

        records.append(norm)

    history = load_json(HISTORY_FILE, must_exist=False) or []
    history.append({
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "alias": alias_name,
        "log_path": str(log_path),
        "total": len(records),
        "processed": sum(1 for r in records if r["status"] == "processed"),
        "needs_material": sum(1 for r in records if r["status"] == "needs_material"),
        "manual_review": sum(1 for r in records if r["status"] == "manual_review"),
        "small_samples": [
            {"experiment_id": s.get("experiment_id"), "sample_count": s.get("sample_count"),
             "threshold": s.get("threshold"), "reason": s.get("_reason")}
            for s in small_samples
        ],
        "records": records,
    })
    save_json(HISTORY_FILE, history)

    print(f"\n\033[1m=== AB实验追踪结果 · {alias_name} ===\033[0m")
    print(f"  来源日志: {log_path}")
    print(f"  总记录数: {len(records)}")
    print(f"  已处理:   {sum(1 for r in records if r['status'] == 'processed')}")
    print(f"  待补材料: {sum(1 for r in records if r['status'] == 'needs_material')}")
    print(f"  人工改判: {sum(1 for r in records if r['status'] == 'manual_review')}")

    if small_samples:
        print(f"\n\033[33m⚠  小样本告警 (被平均数盖住的风险):\033[0m")
        for s in small_samples:
            print(f"  - {s.get('experiment_id')} [{s.get('group')}] 样本={s.get('sample_count')} "
                  f"阈值={s.get('threshold')} → {s.get('_reason')}")

    manual = [r for r in records if r["status"] == "manual_review"]
    if manual:
        print(f"\n\033[35m✎  人工改判记录:\033[0m")
        for r in manual:
            print(f"  - {r.get('experiment_id')} [{r.get('group')}] 修正={r.get('manual_correction')}")

    return records


def cmd_alias(args):
    aliases = load_aliases()

    if args.list:
        print("\n\033[1m=== 版本别名注册表 ===\033[0m")
        if not aliases:
            print("  (空)")
            return
        for name, entry in aliases.items():
            path = entry["log_path"]
            real_path = Path(path)
            if not real_path.is_absolute():
                real_path = BASE_DIR / real_path
            exists = "✓" if real_path.exists() else "✗ 不存在"
            print(f"  {name:20s} → {path}   [{exists}]")
            if entry.get("note"):
                print(f"    备注: {entry['note']}")
        return

    if args.add:
        for pair in args.add:
            if "=" not in pair:
                print(f"[错误] 格式应为 别名=路径，收到: {pair}")
                sys.exit(1)
            name, path = pair.split("=", 1)
            aliases[name] = {
                "log_path": path,
                "created_at": datetime.now().isoformat(timespec="seconds"),
                "note": args.note or "",
            }
            print(f"已注册别名: {name} → {path}")
        save_json(ALIAS_FILE, aliases)
        return

    if args.remove:
        for name in args.remove:
            if name in aliases:
                del aliases[name]
                print(f"已删除别名: {name}")
            else:
                print(f"[警告] 别名 '{name}' 不存在")
        save_json(ALIAS_FILE, aliases)
        return


def cmd_run(args):
    for alias in args.version:
        run_tracking(alias)


def cmd_timeline(args):
    history = load_json(HISTORY_FILE, must_exist=False) or []
    if not history:
        print("\n\033[33m暂无历史记录。先跑一下: python ab_tracker.py demo\033[0m")
        return

    print("\n\033[1m=== AB实验历史时间线 ===\033[0m")
    for h in reversed(history):
        ts = h["timestamp"]
        alias = h["alias"]
        color_map = [
            ("processed", h.get("processed", 0)),
            ("needs_material", h.get("needs_material", 0)),
            ("manual_review", h.get("manual_review", 0)),
        ]
        parts = []
        for status, count in color_map:
            if count > 0:
                color, label = STATUS_COLORS[status]
                parts.append(f"{color}{label}:{count}\033[0m")
        summary = "  ".join(parts) if parts else "  (无记录)"
        print(f"\n  [{ts}] \033[1m{alias}\033[0m  总计{h.get('total', 0)}条")
        print(f"    {summary}")

        small = h.get("small_samples", [])
        if small:
            print(f"    \033[33m待补材料明细:\033[0m")
            for s in small:
                print(f"      · {s.get('experiment_id')} 样本={s.get('sample_count')} 阈值={s.get('threshold')}")


def cmd_diff(args):
    alias1, path1, _ = resolve_alias(args.v1)
    alias2, path2, _ = resolve_alias(args.v2)

    r1 = {r.get("experiment_id", ""): r for r in _load_and_normalize(path1)}
    r2 = {r.get("experiment_id", ""): r for r in _load_and_normalize(path2)}

    all_ids = sorted(set(r1) | set(r2))

    print(f"\n\033[1m=== 版本对比 · {alias1} ↔ {alias2} ===\033[0m")
    print(f"  {alias1}: {path1}")
    print(f"  {alias2}: {path2}")
    print(f"  实验数: {len(r1)} ↔ {len(r2)}  (共 {len(all_ids)} 个唯一实验ID)")

    sections = [
        ("样本数", "sample_count", "samples"),
        ("阈值", "threshold", "threshold"),
        ("人工修正", "manual_correction", "manual"),
        ("指标", "metric", "metric"),
    ]

    for label, key, short in sections:
        changes = []
        for eid in all_ids:
            a = r1.get(eid, {}).get(key)
            b = r2.get(eid, {}).get(key)
            if a != b and (a is not None or b is not None):
                changes.append((eid, a, b))
        if changes:
            print(f"\n  \033[4m[{label}]\033[0m  共 {len(changes)} 处变化")
            for eid, a, b in changes:
                marker = " ⚠" if short == "samples" and a is not None and b is not None and b < a else ""
                print(f"    {eid:15s}  {alias1}: {a!r:15s}  →  {alias2}: {b!r:15s}{marker}")

    status_only_in_old = [eid for eid in all_ids if eid in r1 and eid not in r2]
    status_only_in_new = [eid for eid in all_ids if eid in r2 and eid not in r1]
    if status_only_in_old:
        print(f"\n  \033[4m[仅在旧版出现]\033[0m  {status_only_in_old}")
    if status_only_in_new:
        print(f"\n  \033[4m[仅在新版出现]\033[0m  {status_only_in_new}")


def _load_and_normalize(path: Path):
    raw = load_json(path) or []
    if isinstance(raw, dict):
        raw = raw.get("experiments", [raw])
    result = []
    for r in raw:
        r["_source_path"] = str(path)
        result.append(normalize_fields(r))
    return result


def cmd_demo(args):
    print("\n" + "=" * 60)
    print("  AB实验任务追踪 · 整包样例演示")
    print("=" * 60)

    print("\n\033[1m[1/5] 检查样例数据...\033[0m")
    demo_setup()
    print("  ✓ 样例数据就绪")

    print(f"\n\033[1m[2/5] 查看版本别名...\033[0m")
    cmd_alias(argparse.Namespace(list=True, add=None, remove=None, note=None))

    print(f"\n\033[1m[3/5] 跑前一版 (v1_baseline)...\033[0m")
    run_tracking("v1_baseline")

    print(f"\n\033[1m[4/5] 跑当前版 (v2_current)...\033[0m")
    run_tracking("v2_current")

    print(f"\n\033[1m[5/5] 前一版 vs 当前版 对比...\033[0m")
    cmd_diff(argparse.Namespace(v1="v1_baseline", v2="v2_current"))

    print(f"\n\033[1m--- 历史时间线 ---\033[0m")
    cmd_timeline(argparse.Namespace())

    print("\n" + "=" * 60)
    print("  演示完成 ✓")
    print("  材料入口:   python ab_tracker.py alias --list")
    print("  异常出口:   当别名/日志有问题，脚本会退出码+打印原因+下一步")
    print("  再次跑样例: python ab_tracker.py demo")
    print("=" * 60)


def demo_setup():
    """生成整包样例数据（别名+日志+历史）。幂等，已存在就跳过。"""
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

    v1_log = SAMPLE_DIR / "train_log_v1.json"
    if not v1_log.exists():
        save_json(v1_log, {
            "experiments": [
                {"exp_id": "exp_001", "arm": "control", "样本数": 1500, "阈值": 500, "auc": 0.78, "metric_name": "AUC"},
                {"exp_id": "exp_002", "arm": "treatment_a", "n_samples": 200, "cutoff": 500, "score": 0.72, "指标名": "AUC"},
                {"exp_id": "exp_003", "arm": "treatment_b", "samples": 1200, "thresh": 500, "指标": 0.81, "人工修正": "剔除异常用户3个"},
            ]
        })

    v2_log = SAMPLE_DIR / "train_log_v2.json"
    if not v2_log.exists():
        save_json(v2_log, [
            {"experiment_id": "exp_001", "group": "control", "sample_count": 1500, "threshold": 500, "metric": 0.79, "metric_name": "AUC"},
            {"experiment_id": "exp_002", "group": "treatment_a", "sample_count": 180, "threshold": 500, "metric": 0.70, "metric_name": "AUC"},
            {"experiment_id": "exp_003", "group": "treatment_b", "sample_count": 1300, "threshold": 500, "metric": 0.83, "metric_name": "AUC", "manual_correction": "剔除异常用户5个，调整权重"},
            {"experiment_id": "exp_004", "group": "treatment_c", "sample_count": 600, "threshold": 500, "metric": 0.75, "metric_name": "AUC"},
        ])

    aliases = load_aliases()
    updated = False
    if "v1_baseline" not in aliases:
        aliases["v1_baseline"] = {
            "log_path": "sample_data/train_log_v1.json",
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "note": "前一版基线，字段名不统一（样本数/阈值/auc等混用）",
        }
        updated = True
    if "v2_current" not in aliases:
        aliases["v2_current"] = {
            "log_path": "sample_data/train_log_v2.json",
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "note": "当前版，字段名标准化",
        }
        updated = True
    if updated:
        save_json(ALIAS_FILE, aliases)


def build_parser():
    p = argparse.ArgumentParser(
        description="AB实验任务追踪 · 值班人交接工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
材料入口：
  python ab_tracker.py alias --list      查看所有版本别名及日志路径

异常出口（脚本会打印原因+下一步后退出）：
  退出码 2 → 别名不存在
  退出码 3 → 别名指向的文件不存在
  退出码 4 → 日志文件格式错误或读取失败

常用示例：
  python ab_tracker.py demo                            跑整包样例
  python ab_tracker.py run --version v2_current        跑单个版本
  python ab_tracker.py diff --v1 v1_baseline --v2 v2_current    两版对比
  python ab_tracker.py timeline                        看历史时间线
        """,
    )
    sub = p.add_subparsers(dest="command", required=True)

    sp_run = sub.add_parser("run", help="跑指定版本的AB实验追踪")
    sp_run.add_argument("--version", "-v", nargs="+", required=True, help="版本别名，可多个")
    sp_run.set_defaults(func=cmd_run)

    sp_alias = sub.add_parser("alias", help="管理版本别名")
    sp_alias.add_argument("--list", action="store_true", help="列出所有别名")
    sp_alias.add_argument("--add", nargs="*", help="添加别名，格式 别名=路径")
    sp_alias.add_argument("--remove", nargs="*", help="删除别名")
    sp_alias.add_argument("--note", help="添加别名时的备注")
    sp_alias.set_defaults(func=cmd_alias)

    sp_tl = sub.add_parser("timeline", help="查看历史时间线")
    sp_tl.set_defaults(func=cmd_timeline)

    sp_diff = sub.add_parser("diff", help="对比两个版本")
    sp_diff.add_argument("--v1", required=True, help="前一版别名")
    sp_diff.add_argument("--v2", required=True, help="当前版别名")
    sp_diff.set_defaults(func=cmd_diff)

    sp_demo = sub.add_parser("demo", help="跑整包样例（一键演示全部功能）")
    sp_demo.set_defaults(func=cmd_demo)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
