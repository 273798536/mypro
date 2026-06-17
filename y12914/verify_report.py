import csv
import json
import os
import glob

report_files = glob.glob("./reports/report_*.json")
if not report_files:
    print("未找到报告文件")
    raise SystemExit(1)

json_path = sorted(report_files)[-1]
base = os.path.basename(json_path).replace(".json", "")
csv_path = f"./reports/{base}.csv"
md_path = f"./reports/{base}.md"

print(f"验证报告: {base}")
print("=" * 60)

with open(csv_path, encoding="utf-8-sig") as f:
    rows = list(csv.reader(f))

print(f"[1] CSV 解析成功，共 {len(rows)} 行")
for r in rows:
    if r and "汇总统计" in r[0]:
        print(f"    汇总行: {r}")
        break

bias_ids = ("SAMPLE_001", "SAMPLE_006", "SAMPLE_009")
print("\n[2] 偏科样本状态检查（CSV）:")
for r in rows:
    if r and r[0] in bias_ids:
        print(f"    {r[0]}: 状态={r[1]}, 问题类型={r[3]}")
        assert r[1] != "通过", f"{r[0]} 状态仍为通过!"
print("    -> 偏科样本均非“通过” ✓")

with open(json_path, encoding="utf-8") as f:
    j = json.load(f)

print("\n[3] JSON 汇总:")
print(f"    by_status: {j['summary']['by_status']}")
print(f"    by_issue_type: {j['summary']['by_issue_type']}")
print(f"    pass_rate: {j['summary']['pass_rate']:.1f}%")

csv_sig = rows[1][3].split("：")[-1].strip()
json_sig = j["data_signature"]
print(f"\n[4] 数据签名一致性:")
print(f"    CSV:  {csv_sig}")
print(f"    JSON: {json_sig}")
assert csv_sig == json_sig, "签名不一致!"
print("    -> 签名一致 ✓")

with open(md_path, encoding="utf-8") as f:
    md = f.read()
assert csv_sig in md, "MD 中未找到数据签名"
print("    MD 中包含相同签名 ✓")

print("\n[5] 偏科样本状态检查（JSON）:")
for d in j["details"]:
    if d["sample_id"] in bias_ids:
        types = [i["check_type"] for i in d["issues"]]
        print(f"    {d['sample_id']}: status={d['status']}, issues={types}")
        assert d["status"] != "通过", f"{d['sample_id']} 状态仍为通过!"
print("    -> 偏科样本均非“通过” ✓")

pass_count = j["summary"]["by_status"]["通过"]
pending_count = j["summary"]["by_status"]["待确认"]
fail_count = j["summary"]["by_status"]["不通过"]
total = j["summary"]["total"]
print(f"\n[6] 汇总数值校验:")
print(f"    总数={total}, 通过={pass_count}, 待确认={pending_count}, 不通过={fail_count}")
assert pass_count + pending_count + fail_count == total, "状态计数之和 != 总数"
print("    -> 计数之和 == 总数 ✓")

print("\n" + "=" * 60)
print("全部验证通过 ✓")
