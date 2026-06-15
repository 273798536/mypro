import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from festival_booth_checker.core.config import Config
from festival_booth_checker.core.processor import BoothProcessor
from festival_booth_checker.core.storage import BoothStorage

cfg = Config()

state_file = cfg["state_file"]
if os.path.exists(state_file):
    os.remove(state_file)

proc = BoothProcessor(cfg)

print("=== 第一步：扫描 input 目录（第一批） ===")
import shutil
input_dir = cfg["input_dir"]
for f in os.listdir(input_dir):
    os.remove(os.path.join(input_dir, f))

shutil.copy2(os.path.join(cfg["sample_dir"], "sample_batch1.json"),
             os.path.join(input_dir, "01_batch1.json"))
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_csv.csv"),
             os.path.join(input_dir, "02_csv.csv"))

r1 = proc.scan_and_process(operator="值班脚本_v1")
print("code:", r1.code, "|", r1.message)
print("返回参数 params_used:", r1.params_used)
print("返回错误 errors:", r1.errors)
if r1.screenshot_hints:
    print("screenshot_hints:")
    for s in r1.screenshot_hints:
        print("  -", s)

print("\n=== 第二步：模拟CLI的返回码判断 ===")
data = r1.data or {}
totals = data.get("totals", {})
if r1.errors:
    rc = 2
elif totals.get("conflicts", 0) > 0:
    rc = 3
else:
    anomaly_items = sum(1 for p in data.get("processed", []) if p.get("anomaly_count", 0) > 0)
    rc = 4 if anomaly_items > 0 else 0
print(f"CLI返回码将为: {rc} (0=OK/4=有异常)")

print("\n=== 第三步：放入旧版文件测试冲突 ===")
shutil.copy2(os.path.join(cfg["sample_dir"], "sample_old_version_conflict.json"),
             os.path.join(input_dir, "99_old_conflict.json"))

# 修改旧文件的 imported_at 时间戳，模拟更早导入
import json
old_path = os.path.join(cfg["sample_dir"], "sample_old_version_conflict.json")
with open(old_path, "r") as f:
    old_data = json.load(f)

old_records = old_data["records"]
for rec in old_records:
    rec["_forced_imported_at"] = "2025-05-01T10:00:00"

# 直接创建一个旧时间戳的文件，手动构造
old_file_path = os.path.join(input_dir, "99_old_conflict.json")

# 验证是否会冲突（不使用force）
r2 = proc.scan_and_process(operator="值班脚本_v2_补旧档")
print("code:", r2.code, "|", r2.message)
conflicts = r2.data.get("conflicts", [])
if conflicts:
    print("检测到版本冲突（未覆盖！）：")
    for c in conflicts:
        print(" ", c)
else:
    print("无冲突，说明时间戳比较逻辑正常")

# 查看B001的当前版本
rec_b001 = proc.storage.get("B001")
if rec_b001:
    print(f"\n当前 B001 版本来源: {rec_b001.version.source}")
    print(f"当前 B001 摊位名（确认未被旧版覆盖）: {rec_b001.booth_name}")
    print(f"历史记录: {len(rec_b001.history)} 条")
    for h in rec_b001.history:
        print(f"  - {h.get('timestamp')[:19]} {h.get('action')}: {h.get('detail')}")

# 手动模拟旧版本冲突 - 直接构造一个更旧时间戳的记录
print("\n=== 第四步：手动验证版本比较逻辑 ===")
from festival_booth_checker.core.models import VersionInfo, BoothRecord

v_new = VersionInfo(source="新版本.json", imported_at="2026-06-16T12:00:00")
v_old = VersionInfo(source="旧版本.json", imported_at="2025-05-01T10:00:00")

storage = proc.storage
is_older = storage._is_older_version(v_old, v_new)
print(f"导入旧版本(2025) vs 现有(2026): is_older={is_older}  (应该为True, 会被拒绝覆盖)")

is_older2 = storage._is_older_version(v_new, v_old)
print(f"导入新版本(2026) vs 现有(2025): is_older={is_older2}  (应该为False, 允许更新)")

# 构造一个旧版本的B001记录
old_booth = BoothRecord(
    booth_id="B001",
    booth_name="被旧覆盖的错误名字",
    version=VersionInfo(source="旧档2025.json", imported_at="2025-01-01T00:00:00")
)
ok, msg = storage.upsert(old_booth, operator="TEST_OLD_VERSION")
print(f"\n尝试用旧2025档覆盖现有B001: ok={ok}, msg={msg}")

b001_check = storage.get("B001")
print(f"B001 实际摊位名: {b001_check.booth_name}  (应该仍是 主舞台-民谣之夜)")

print("\n=== 全部CLI场景验证完成 ===")
