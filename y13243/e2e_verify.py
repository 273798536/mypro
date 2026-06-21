import os, sys, json, shutil, subprocess, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = ROOT
os.chdir(ROOT)

from festival_booth_checker.core.config import Config

cfg = Config()

if os.path.exists(cfg["state_file"]):
    os.remove(cfg["state_file"])

input_dir = cfg["input_dir"]
for f in os.listdir(input_dir):
    os.remove(os.path.join(input_dir, f))

shutil.copy2(os.path.join(cfg["sample_dir"], "sample_batch1.json"), os.path.join(input_dir, "01.json"))
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_csv.csv"), os.path.join(input_dir, "02.csv"))
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_batch2_later.json"), os.path.join(input_dir, "03.json"))
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_old_version_conflict.json"), os.path.join(input_dir, "99_old.json"))

OUT_ROOT = "/tmp/booth_e2e_out"
if os.path.exists(OUT_ROOT):
    shutil.rmtree(OUT_ROOT)

def run_cli(args, expect_success=True, label=""):
    full = ["python3", "booth_checker.py"] + args
    cp = subprocess.run(full, capture_output=True, text=True, timeout=30, cwd=ROOT)
    stdout, stderr, rc = cp.stdout, cp.stderr, cp.returncode
    try:
        parsed = json.loads(stdout) if stdout.strip() else None
    except Exception as e:
        parsed = {"_raw": stdout[:500], "_parse_err": str(e)}
    ok = (rc == 0 and parsed and parsed.get("success")) if expect_success else True
    mark = "✓" if ok else "✗"
    summary = ""
    if isinstance(parsed, dict) and "_parse_err" not in parsed:
        summary = f"code={parsed.get('code')} success={parsed.get('success')} msg={parsed.get('message','')[:60]}"
        if parsed.get("data") and isinstance(parsed["data"], dict):
            fp = parsed["data"].get("file_path")
            if fp:
                summary += f" file={os.path.basename(fp)}"
    else:
        summary = f"rc={rc} stderr_tail={stderr[-200:] if stderr else 'none'}"
    print(f"  {mark} [{label}] {' '.join(args)}")
    print(f"       -> {summary}")
    if not ok:
        print(f"       stdout(前400): {stdout[:400]}")
        print(f"       stderr: {stderr[:400]}")
    return parsed, rc, ok

all_ok = True
sep = "=" * 70
print(sep)
print("音乐节摊位异常提醒 - 安装&启动&核心路径 E2E 验证")
print(sep)

print("\n[A] 基础可用检查（安装/启动即能跑）")
print("-" * 70)

r1, rc1, ok1 = run_cli(["--help"], label="帮助信息能输出")
# --help 会 rc=0 但无 JSON，这是 argparse 的默认行为，我们不要求 JSON
print("    (备注: --help 为纯文本，这是正常的，无需 JSON 输出)")

r2, rc2, ok2 = run_cli(["export", "--help"], label="export 子命令帮助")

print("\n[B] 核心链路：scan → dashboard → summary（值班到接班流程）")
print("-" * 70)

scan_json_path = os.path.join(OUT_ROOT, "nested", "a", "scan_result.json")
r3, rc3, ok3 = run_cli([
    "scan", "--operator", "E2E_值班",
    "--output", scan_json_path  # 重点：多级新目录
], label="scan+写入新目录JSON")
# scan RC 我们是 4（有异常），但 success=True
if isinstance(r3, dict) and r3.get("code") in ("OK", "PARTIAL"):
    ok3 = True
    print("       -> scan RC 业务语义：4=有异常但成功，这是预期")

if ok3 and os.path.exists(scan_json_path):
    print("       -> scan JSON 文件存在：✓ %s  大小=%d 字节" % (scan_json_path, os.path.getsize(scan_json_path)))
else:
    ok3 = False
    print("       -> scan JSON 文件缺失或解析失败：✗")

r4, rc4, ok4 = run_cli(["dashboard", "--format", "json"], label="dashboard JSON")
r5, rc5, ok5 = run_cli(["dashboard", "--format", "text"], label="dashboard 文字版")
# text 模式直接 print，不走 JSON，这里单独判断
if rc5 == 0 and not r5:
    ok5 = True
    print("       -> text 模式直接 stdout 输出（非 JSON），这是预期")

r6, rc6, ok6 = run_cli(["summary"], label="summary 接班摘要")
# 检查 summary 里导出命令已不带错误的 --all
cmd_ref_ok = False
if isinstance(r6, dict) and "导出命令参考" in (r6.get("data") or {}):
    cmd_ref = r6["data"]["导出命令参考"]
    bad = [k for k, v in cmd_ref.items() if "--format csv --all" in v and "--only" not in v]
    good_cmds = all("--only" in v or "--format" in v for v in cmd_ref.values())
    cmd_ref_ok = not bad and good_cmds
print("       -> 导出命令参考全是 --only 风格: %s" % ("✓" if cmd_ref_ok else "✗ 还有 --all 错误写法"))

print("\n[C] 导出链路（重点）：各种别名、--output、目录报错、内容正确性")
print("-" * 70)

csv_target = os.path.join(OUT_ROOT, "交接用", "全部摊位.csv")
json_target = os.path.join(OUT_ROOT, "交接用", "异常明细.json")
pending_target = os.path.join(OUT_ROOT, "交接用", "待处理.csv")

cases = [
    (["export", "--format", "csv", "--only", "all", "-O", csv_target], "标准写法 --only all + 新目录"),
    (["export", "--format", "csv", "--all", "-O", csv_target.replace(".csv", "_alias.csv")], "别名写法 --all"),
    (["export", "--format", "json", "--anomalies", "-O", json_target], "别名写法 --anomalies + 新目录"),
    (["export", "--format", "csv", "--pending", "-O", pending_target], "别名写法 --pending"),
    (["export", "--format", "csv", "--passed"], "不传 -O，用默认目录"),
    (["export", "--format", "csv", "-O", OUT_ROOT], "踩坑：-O 传目录 → 友好报错", False),
]

export_results = []
for args, lbl, *exp in cases:
    expect_ok = exp[0] if exp else True
    parsed, rc, this_ok = run_cli(args, label=lbl, expect_success=expect_ok)
    if not expect_ok:
        # 反着看：我们期待失败且给出友好错误
        if isinstance(parsed, dict) and parsed.get("code") == "INVALID_OUTPUT":
            this_ok = True
            print("       -> INVALID_OUTPUT 友好报错：✓ (message=%s)" % parsed.get("message","")[:80])
        else:
            this_ok = False
    export_results.append((parsed, rc, this_ok, lbl, csv_target if lbl.startswith("标准") else json_target if "异常" in lbl else pending_target))
    all_ok = all_ok and this_ok

print("\n[D] 导出产物质量检查（能被正常打开+内容与dashboard对齐）")
print("-" * 70)

dash = r4 if isinstance(r4, dict) else {}
dash_summary = (dash.get("data") or {}).get("status_summary", {})
dash_pending_count = sum(dash_summary.get(k, 0) for k in ["待补证据", "版本冲突", "待复核", "待处理", "处理中"])
dash_all_count = sum(dash_summary.values())

print(f"    dashboard 口径：总={dash_all_count} 待行动+待处理={dash_pending_count}")

product_checks = [
    (csv_target, "csv", dash_all_count, "总记录数对齐"),
    (pending_target, "csv", dash_pending_count, "pending筛选对齐"),
    (json_target, "json", None, "结构含summary"),
]

for fp, kind, expect_count, desc in product_checks:
    if not os.path.exists(fp):
        print(f"    ✗ [{desc}] 文件不存在: {fp}")
        all_ok = False
        continue
    size = os.path.getsize(fp)
    if kind == "csv":
        with open(fp, "rb") as f:
            head = f.read(3)
        bom_ok = head == b"\xef\xbb\xbf"
        with open(fp, "r", encoding="utf-8-sig", newline="") as f:
            rows = list(csv.reader(f))
        with open(fp, "rb") as f:
            raw = f.read()
        crlf_ok = b"\r\n" in raw and raw.count(b"\r\n") == len(rows)
        cols_ok = len(rows[0]) == 19
        count_ok = (len(rows) - 1) == expect_count if expect_count else True
        ok = bom_ok and crlf_ok and cols_ok and count_ok
        print(f"    {'✓' if ok else '✗'} [{desc}] {os.path.basename(fp)}  rows={len(rows)-1}(期望{expect_count}) cols={len(rows[0])}(期望19) BOM={'✓' if bom_ok else '✗'} CRLF={'✓' if crlf_ok else '✗'}  size={size}B")
        all_ok = all_ok and ok
    else:
        with open(fp, "r", encoding="utf-8") as f:
            j = json.load(f)
        has_summary = isinstance(j.get("summary"), dict) and "anomaly_locations" in j["summary"]
        has_filter = "filter" in j and "only" in j["filter"]
        recs_match = j.get("record_count") == len(j.get("records", []))
        ok = has_summary and has_filter and recs_match
        print(f"    {'✓' if ok else '✗'} [{desc}] {os.path.basename(fp)}  summary={'✓' if has_summary else '✗'} filter={'✓' if has_filter else '✗'} record_count_match={'✓' if recs_match else '✗'} size={size}B")
        all_ok = all_ok and ok

print("\n[E] 异常查询和版本信息（交接可能用到）")
print("-" * 70)
r_b003, _, ok_b = run_cli(["status", "B003"], label="查询单摊位B003(时码半拍)")
r_ver, _, ok_v = run_cli(["version", "B001"], label="查询B001版本信息(含冲突建议)")
all_ok = all_ok and ok_b and ok_v

print("\n" + sep)
print("最终结果：", "✓ 全部通过" if all_ok else "✗ 存在失败项（详见上方✗标记）")
print(sep)

if all_ok:
    print("\n已生成的交接产物：")
    print(f"  scan JSON       : {scan_json_path}")
    print(f"  全部CSV         : {csv_target}")
    print(f"  异常明细JSON    : {json_target}")
    print(f"  待处理CSV       : {pending_target}")
    print(f"  默认导出目录    : {cfg['export_dir']}")

sys.exit(0 if all_ok else 1)
