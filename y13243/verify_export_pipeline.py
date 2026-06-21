import os, sys, json, shutil, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from festival_booth_checker.core.config import Config
from festival_booth_checker.core.processor import BoothProcessor
from festival_booth_checker.core.exporter import BoothExporter

cfg = Config()
if os.path.exists(cfg["state_file"]):
    os.remove(cfg["state_file"])

input_dir = cfg["input_dir"]
for f in os.listdir(input_dir):
    os.remove(os.path.join(input_dir, f))

sample_dir = cfg["sample_dir"]
shutil.copy2(os.path.join(sample_dir, "sample_batch1.json"), os.path.join(input_dir, "01.json"))
shutil.copy2(os.path.join(sample_dir, "sample_csv.csv"), os.path.join(input_dir, "02.csv"))
shutil.copy2(os.path.join(sample_dir, "sample_batch2_later.json"), os.path.join(input_dir, "03.json"))
shutil.copy2(os.path.join(sample_dir, "sample_old_version_conflict.json"), os.path.join(input_dir, "99_old.json"))

print("=" * 70)
print("导出链路端到端验收")
print("=" * 70)

proc = BoothProcessor(cfg)
r = proc.scan_and_process(operator="验收脚本")
print(f"[1/6] 扫描处理: {r.code} | {r.message}")
totals = (r.data or {}).get("totals", {})
print(f"      统计: {totals}")

dash = proc.get_dashboard()
dd = dash.data or {}
print(f"[2/6] 状态看板: {dash.code}")
print(f"      status_counts: {dd.get('status_summary')}")
print(f"      已处理={dd.get('handled_count')} 待行动={dd.get('action_needed_count')} 处理中={dd.get('pending_count')}")

summary = proc.get_summary_for_alan()
sd = summary.data or {}
print(f"[3/6] summary 命令内容检查:")
print(f"      样例目录: {sd.get('样例目录')}")
print(f"      异常位置条数: {len(sd.get('异常位置', []))}")
cmd_ref = sd.get("导出命令参考", {})
cmd_ok = True
for k, v in cmd_ref.items():
    bad = "--all" in v and "--only" not in v
    print(f"      {k}: {'✓' if not bad else '✗ 参数错误'}  {v}")
    if bad:
        cmd_ok = False
print(f"      导出命令参数正确性: {'✓' if cmd_ok else '✗ FAIL'}")

print(f"\n[4/6] CLI 参数容错测试（通过 subprocess 调用）:")
import subprocess
cli_cases = [
    (["python3", "booth_checker.py", "export", "--format", "csv", "--all"], "--all 别名"),
    (["python3", "booth_checker.py", "export", "--format", "csv", "--only", "all"], "--only all 标准"),
    (["python3", "booth_checker.py", "export", "--format", "json", "--anomalies"], "--anomalies 别名"),
    (["python3", "booth_checker.py", "export", "--format", "csv", "--pending"], "--pending 别名"),
]
cli_ok = True
for cmd, desc in cli_cases:
    cp = subprocess.run(cmd, capture_output=True, text=True, timeout=20,
                        cwd=os.path.dirname(os.path.abspath(__file__)))
    stdout = cp.stdout
    try:
        parsed = json.loads(stdout)
        code = parsed.get("code", "NO_CODE")
        success = parsed.get("success", False)
        msg = parsed.get("message", "")
        fp = (parsed.get("data") or {}).get("file_path", "")
        print(f"      {desc}: {'✓' if success and code=='OK' else '✗ FAIL'}  code={code}  file={os.path.basename(fp) if fp else 'N/A'}  msg={msg[:60]}")
        if not success or code != "OK":
            cli_ok = False
            if cp.stderr:
                print(f"         stderr: {cp.stderr[:300]}")
    except Exception as e:
        print(f"      {desc}: ✗ JSON解析失败 err={e} | stdout_head={repr(stdout[:200])} | stderr={cp.stderr[:300]}")
        cli_ok = False

print(f"\n[5/6] 导出内容一致性 & CSV 可打开性校验:")
exporter = BoothExporter(cfg, proc.storage)
r_csv = exporter.export_all("csv", "all")
r_json = exporter.export_all("json", "all")
r_pending = exporter.export_all("csv", "pending")
print(f"      CSV全部: {r_csv.code} {r_csv.message}")
print(f"      JSON全部: {r_json.code} {r_json.message}")
print(f"      CSV待处理: {r_pending.code} {r_pending.message}")

csv_path = (r_csv.data or {}).get("file_path", "")
json_path = (r_json.data or {}).get("file_path", "")
pending_path = (r_pending.data or {}).get("file_path", "")

csv_ok = True
csv_rows = 0
if csv_path and os.path.exists(csv_path):
    with open(csv_path, "rb") as f:
        head = f.read(3)
    has_bom = head == b"\xef\xbb\xbf"
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    csv_rows = len(rows) - 1
    headers = rows[0]
    has_location = "异常定位" in headers
    has_screenshot = "需补截图提示" in headers
    has_bom_str = "✓ UTF-8 BOM" if has_bom else "✗ 缺少BOM"
    print(f"        {has_bom_str} | 行数(含表头)={len(rows)} | 异常定位列={'✓' if has_location else '✗'} | 截图提示列={'✓' if has_screenshot else '✗'}")
    csv_ok = has_bom and has_location and has_screenshot

json_ok = True
if json_path and os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        j = json.load(f)
    has_summary = "summary" in j and "anomaly_locations" in j["summary"]
    has_counts = "summary" in j and "action_needed_count" in j["summary"]
    rec_count_match = len(j.get("records", [])) == j.get("record_count", -1) == csv_rows
    print(f"        JSON含dashboard摘要={'✓' if has_summary else '✗'} | 统计字段={'✓' if has_counts else '✗'} | 记录数与CSV一致={'✓' if rec_count_match else '✗'} (csv={csv_rows} json={len(j.get('records',[]))} stated={j.get('record_count')})")
    json_ok = has_summary and has_counts and rec_count_match

pending_count = len((r_pending.data or {}).get("summary", {}).get("status_counts", {}))
pending_records_csv = (r_pending.data or {}).get("record_count", 0)
pending_expected = dd.get("action_needed_count", 0) + dd.get("pending_count", 0)
pending_ok = pending_records_csv == pending_expected
print(f"      pending筛选与dashboard一致: {'✓' if pending_ok else '✗'} (csv导出={pending_records_csv} 看板合计={pending_expected})")

print(f"\n[6/6] 综合判定:")
all_ok = cmd_ok and cli_ok and csv_ok and json_ok and pending_ok
print(f"  summary命令参数:      {'✓ PASS' if cmd_ok else '✗ FAIL'}")
print(f"  CLI参数容错:         {'✓ PASS' if cli_ok else '✗ FAIL'}")
print(f"  CSV格式兼容(含BOM):  {'✓ PASS' if csv_ok else '✗ FAIL'}")
print(f"  JSON含dashboard摘要: {'✓ PASS' if json_ok else '✗ FAIL'}")
print(f"  导出与页面数据一致:   {'✓ PASS' if pending_ok else '✗ FAIL'}")
print(f"  总结果:              {'✓ 全部通过' if all_ok else '✗ 存在失败项'}")
print("=" * 70)

if csv_path:
    print(f"\n生成文件:")
    print(f"  CSV全部    : {csv_path}")
if json_path:
    print(f"  JSON全部   : {json_path}")
if pending_path:
    print(f"  CSV待处理  : {pending_path}")

sys.exit(0 if all_ok else 1)
