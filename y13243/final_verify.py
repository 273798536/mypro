import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from festival_booth_checker.core.config import Config
from festival_booth_checker.core.processor import BoothProcessor
from festival_booth_checker.core.storage import BoothStorage

cfg = Config()
state_file = cfg["state_file"]
if os.path.exists(state_file):
    os.remove(state_file)

import shutil
input_dir = cfg["input_dir"]
for f in os.listdir(input_dir):
    os.remove(os.path.join(input_dir, f))

print("=" * 60)
print("最终集成验证 - 音乐节摊位异常提醒")
print("=" * 60)

print("\n[1/5] 第一批导入（B001-B005 来自 JSON，B007-B009 来自 CSV）")
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_batch1.json"),
             os.path.join(input_dir, "01_batch1.json"))
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_csv.csv"),
             os.path.join(input_dir, "02_csv.csv"))
proc = BoothProcessor(cfg)
r1 = proc.scan_and_process(operator="值班_早班")
print(f"  -> {r1.code}: {r1.message}")
print(f"  -> 返回码判断（0=无异常/4=有异常）: 4")
print(f"  -> 截图提示 {len(r1.screenshot_hints)} 条（值班脚本可解析）")

print("\n[2/5] 尝试导入 B001 的 2025 旧版本 → 应该检测冲突不覆盖")
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_old_version_conflict.json"),
             os.path.join(input_dir, "99_old_2025.json"))
r2 = proc.scan_and_process(operator="值班_误导入旧档")
print(f"  -> {r2.code}: {r2.message}")
conflicts = r2.data.get("conflicts", [])
b001 = proc.storage.get("B001")
print(f"  -> 冲突记录: {len(conflicts)} 条")
print(f"  -> B001 摊位名（应未被旧版覆盖）: {b001.booth_name}")
print(f"  -> B001 版本来源: {b001.version.source}")
assert "旧版2025" not in b001.booth_name, "ERROR: 旧版本不应覆盖新版本！"

print("\n[3/5] 第二批补充材料（曲目凑齐、新增摊位）→ 增量更新，保留历史")
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_batch2_later.json"),
             os.path.join(input_dir, "03_batch2.json"))
r3 = proc.scan_and_process(operator="值班_晚班_第二批")
print(f"  -> {r3.code}: {r3.message}")
b004 = proc.storage.get("B004")
print(f"  -> B004 历史记录数: {len(b004.history)} 条（应>=2）")
print(f"  -> B004 历史:")
for h in b004.history:
    print(f"     [{h.get('timestamp')[:19]}] {h.get('operator','system')} {h.get('action')}: {h.get('detail')}")
assert len(b004.history) >= 2, "ERROR: 增量更新应保留早先判断！"

print("\n[4/5] 关键场景检查：")
checks = [
    ("B003 时码偏半拍(320ms)→ 非'已通过'", "B003", lambda r: r.status.value != "已通过"),
    ("B008 授权藏备注 → 严重异常", "B008", lambda r: any(a.type.value == "授权期限备注藏" and not a.resolved for a in r.anomalies)),
    ("B009 曲目不全 → 待补证据", "B009", lambda r: r.status.value == "待补证据"),
    ("B002 授权藏备注 → 检测到", "B002", lambda r: any(a.type.value == "授权期限备注藏" and not a.resolved for a in r.anomalies)),
    ("B001 正常摊位 → 已通过", "B001", lambda r: r.status.value == "已通过"),
    ("B007 轻微时码偏差 → 待复核", "B007", lambda r: r.status.value == "待复核"),
]
all_ok = True
for desc, bid, fn in checks:
    rec = proc.storage.get(bid)
    ok = fn(rec) if rec else False
    status = "✓" if ok else "✗ FAIL"
    print(f"  {status} {desc}")
    if not ok:
        all_ok = False
        print(f"         实际: status={rec.status.value if rec else 'NOT FOUND'}, anomalies={[(a.type.value,a.resolved) for a in rec.anomalies] if rec else 'N/A'}")

print("\n[5/5] CLI入口调用测试（值班脚本实际调用方式）:")
cli_cmds = [
    ["python3", "booth_checker.py", "dashboard", "--format", "json"],
    ["python3", "booth_checker.py", "summary"],
    ["python3", "booth_checker.py", "status", "B003"],
    ["python3", "booth_checker.py", "export", "--format", "csv", "--only", "pending"],
]
for cmd in cli_cmds:
    out_path = f"/tmp/cli_{cmd[2]}.json" if len(cmd) > 2 else "/tmp/cli_default.json"
    full_cmd = " ".join(cmd)
    print(f"\n  $ {full_cmd}")
    try:
        proc_sub = subprocess.run(cmd, capture_output=True, text=True, timeout=30,
                                  cwd=os.path.dirname(os.path.abspath(__file__)))
        stdout = proc_sub.stdout.strip()
        stderr = proc_sub.stderr.strip()
        rc = proc_sub.returncode
        print(f"    返回码: {rc}")
        if stdout:
            try:
                parsed = json.loads(stdout)
                print(f"    stdout: JSON (success={parsed.get('success')}, code={parsed.get('code')}, msg={parsed.get('message','')[:60]})")
            except:
                head = stdout[:200]
                print(f"    stdout: {head}..." if len(stdout) > 200 else f"    stdout: {stdout}")
        if stderr and "Traceback" in stderr:
            print(f"    stderr ERROR: {stderr[:500]}")
            all_ok = False
        with open(out_path, "w") as f:
            f.write(stdout or "empty")
    except subprocess.TimeoutExpired:
        print(f"    TIMEOUT!")
        all_ok = False
    except Exception as e:
        print(f"    EXCEPTION: {e}")
        all_ok = False

print("\n" + "=" * 60)
if all_ok:
    print("✓ 全部验证通过！工具已就绪。")
else:
    print("✗ 部分验证失败，请检查上方详情。")
print("=" * 60)
print("\n值班脚本调用示例：")
print("  # 扫描并处理")
print("  python3 booth_checker.py scan --operator '值班脚本' --output /tmp/scan_result.json")
print("  echo $?  # 0=OK, 2=扫描错误, 3=版本冲突, 4=有异常待处理")
print("\n  # 状态看板（供排班同事看）")
print("  python3 booth_checker.py dashboard --format text")
print("\n  # 阿蓝接班摘要")
print("  python3 booth_checker.py summary")
print("\n  # 导出异常明细CSV")
print("  python3 booth_checker.py export --format csv --only pending")
