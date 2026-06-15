import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from festival_booth_checker.core.models import BoothRecord, BoothStatus, ProcessingResult
from festival_booth_checker.core.config import Config
from festival_booth_checker.core.storage import BoothStorage
from festival_booth_checker.core.detector import AnomalyDetector
from festival_booth_checker.core.scanner import FileScanner
from festival_booth_checker.core.processor import BoothProcessor
from festival_booth_checker.core.exporter import BoothExporter

print("=== 1. 导入测试 ===")
print("models OK")
print("config OK")
print("storage OK")
print("detector OK")
print("scanner OK")
print("processor OK")
print("exporter OK")

cfg = Config()
print("\n=== 2. 配置检查 ===")
print("sample_dir:", cfg["sample_dir"])
print("input_dir:", cfg["input_dir"])
print("output_dir:", cfg["output_dir"])
print("export_dir:", cfg["export_dir"])

state_file = cfg["state_file"]
if os.path.exists(state_file):
    os.remove(state_file)
    print("已清理旧状态文件")

proc = BoothProcessor(cfg)
result = proc.scan_and_process(input_dir=cfg["input_dir"], operator="值班脚本_v1")

print("\n=== 3. 第一批扫描结果 ===")
print("code:", result.code)
print("message:", result.message)
print("success:", result.success)
print("screenshot_hints 数量:", len(result.screenshot_hints))

data = result.data or {}
for key in ["processed", "skipped", "conflicts"]:
    items = data.get(key, [])
    print(f"\n--- {key}: {len(items)} 条 ---")
    for it in items[:5]:
        print(" ", it)

if result.screenshot_hints:
    print("\n=== 4. 截图提示 ===")
    for sh in result.screenshot_hints:
        print("-", sh)

with open("/tmp/scan1_result.json", "w", encoding="utf-8") as f:
    f.write(result.to_json())
print("\n完整JSON已写入 /tmp/scan1_result.json")

print("\n=== 5. 测试第二批增量材料（不覆盖旧判断） ===")
proc2 = BoothProcessor(cfg)
result2 = proc2.scan_and_process(
    input_dir=os.path.join(cfg["sample_dir"]),
    operator="值班脚本_v2_第二批"
)
print("code:", result2.code)
print("message:", result2.message)
data2 = result2.data or {}
totals2 = data2.get("totals", {})
print("totals:", totals2)
conflicts2 = data2.get("conflicts", [])
if conflicts2:
    print("\n版本冲突列表（未覆盖）：")
    for c in conflicts2:
        print(" ", c)

with open("/tmp/scan2_result.json", "w", encoding="utf-8") as f:
    f.write(result2.to_json())
print("\n第二批JSON已写入 /tmp/scan2_result.json")

print("\n=== 6. 状态看板 ===")
dash = proc2.get_dashboard()
print("code:", dash.code)
print("message:", dash.message)
dd = dash.data or {}
for k, v in dd.get("status_summary", {}).items():
    print(f"  {k}: {v}")
print(f"  已处理: {dd.get('handled_count', 0)}")
print(f"  待行动: {dd.get('action_needed_count', 0)}")

if dd.get("need_evidence_list"):
    print("\n需补证据:")
    for x in dd["need_evidence_list"]:
        print(" ", x["booth_id"], x["booth_name"], "- 来源:", x["version_source"])

if dd.get("anomaly_locations"):
    print("\n异常明细:")
    for x in dd["anomaly_locations"][:5]:
        print(" ", f"{x['booth_id']} | {x['type']}({x['level']}) | {x['location']}")

with open("/tmp/dashboard.json", "w", encoding="utf-8") as f:
    f.write(dash.to_json())
print("\n看板JSON已写入 /tmp/dashboard.json")

print("\n=== 7. 演出统筹阿蓝接班摘要 ===")
summary = proc2.get_summary_for_alan()
print(summary.to_json())
with open("/tmp/summary_alan.json", "w", encoding="utf-8") as f:
    f.write(summary.to_json())
print("\n接班摘要JSON已写入 /tmp/summary_alan.json")

print("\n=== 8. 导出测试 ===")
exporter = BoothExporter(cfg, proc2.storage)
exp_csv = exporter.export_all(fmt="csv", only="all")
print("CSV:", exp_csv.code, exp_csv.message)
print("  文件:", exp_csv.data.get("file_path") if exp_csv.data else "")

exp_json = exporter.export_all(fmt="json", only="anomalies")
print("JSON(仅异常):", exp_json.code, exp_json.message)
print("  文件:", exp_json.data.get("file_path") if exp_json.data else "")

print("\n=== 9. 单摊位查询（B003 - 时码偏半拍样例） ===")
rec = proc2.storage.get("B003")
if rec:
    print(f"摊位B003状态: {rec.status.value}")
    print(f"时码偏差: {rec.timing_offset_ms}ms")
    print(f"异常数量: {len(rec.anomalies)}")
    for a in rec.anomalies:
        print(f"  - {a.type.value}({a.level.value}): {a.description}")
else:
    print("B003 未找到")

print("\n=== 10. 查询 B004 版本历史 ===")
rec4 = proc2.storage.get("B004")
if rec4:
    print(f"当前版本来源: {rec4.version.source}")
    print(f"状态: {rec4.status.value}")
    print(f"历史记录数: {len(rec4.history)}")
    for h in rec4.history[-3:]:
        print(f"  - {h.get('timestamp')[:19]} {h.get('action')}: {h.get('detail')}")

print("\n=== 全部测试完成 ===")
