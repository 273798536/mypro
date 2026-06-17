import json
import csv
import glob
import os
import sys

V1 = "v20260618033933_89h0"
V2 = "v20260618033933_hbtw"
V2_report_prefix = "report_d6638c5d668f"

print("=" * 60)
print("最终验证：导出内容、格式、触发结果")
print("=" * 60)

# -------- 1. 找 V2 报告 --------
json_path = f"./reports/{V2_report_prefix}.json"
csv_path = f"./reports/{V2_report_prefix}.csv"
md_path = f"./reports/{V2_report_prefix}.md"

if not os.path.exists(json_path):
    candidates = glob.glob("./reports/report_*.json")
    if candidates:
        json_path = sorted(candidates)[-1]
        prefix = os.path.basename(json_path).replace(".json", "")
        csv_path = f"./reports/{prefix}.csv"
        md_path = f"./reports/{prefix}.md"

print(f"\n[1] 报告路径：")
print(f"  JSON: {json_path}")
print(f"  CSV:  {csv_path}")
print(f"  MD:   {md_path}")
assert os.path.exists(json_path) and os.path.exists(csv_path) and os.path.exists(md_path)
print("  -> 三端文件均存在 ✓")

# -------- 2. 验证 JSON 核心数据 --------
with open(json_path, encoding="utf-8") as f:
    j = json.load(f)

print(f"\n[2] JSON 汇总：")
print(f"  version_id: {j['version_id']}")
print(f"  data_signature: {j['data_signature']}")
print(f"  by_status: {j['summary']['by_status']}")
print(f"  by_issue_type: {j['summary']['by_issue_type']}")
print(f"  pass_rate: {j['summary']['pass_rate']:.1f}%")

bs = j["summary"]["by_status"]
assert bs["通过"] == 12 and bs["待确认"] == 0 and bs["不通过"] == 0, f"V2 汇总有误: {bs}"
print("  -> V2 汇总 12/0/0 正确 ✓")

# -------- 3. 验证偏科样本状态 --------
print(f"\n[3] 偏科拦截样本状态（V2 应全部通过，偏科解除）：")
bias_ids = ["SAMPLE_001", "SAMPLE_006", "SAMPLE_007", "SAMPLE_008", "SAMPLE_009"]
for bid in bias_ids:
    d = next(x for x in j["details"] if x["sample_id"] == bid)
    types = [i["check_type"] for i in d["issues"]]
    print(f"  {bid}: status={d['status']}, issues={types}")
    assert d["status"] == "通过", f"{bid} 不是通过状态"
    assert "评测集偏科检查" not in types, f"{bid} 仍有偏科问题"
print("  -> 5条偏科样本全部通过，偏科问题解除 ✓")

# -------- 4. 验证 SAMPLE_002 补录 --------
print(f"\n[4] SAMPLE_002 补录验证：")
d = next(x for x in j["details"] if x["sample_id"] == "SAMPLE_002")
types = [i["check_type"] for i in d["issues"]]
print(f"  status: {d['status']}")
print(f"  issues: {types}")
print(f"  manual_note: {d.get('manual_note')}")
assert d["status"] == "通过", "SAMPLE_002 不是通过"
assert "缺图检查" not in types, "SAMPLE_002 仍有缺图问题"
assert d.get("manual_note") and "后台日志再确认" in d["manual_note"], "人工备注丢失/被改写"
print("  -> 补图后状态为通过、缺图问题消失、人工备注原样保留 ✓")

# -------- 5. 验证 CSV 格式 --------
print(f"\n[5] CSV 格式验证：")
with open(csv_path, encoding="utf-8-sig") as f:
    rows = list(csv.reader(f))

print(f"  总行数: {len(rows)}")
assert len(rows) > 10, "CSV 行数太少，可能损坏"

# 查找普通话解释行
explanation_rows = [r for r in rows if r and "普通话解释" in r[0]]
assert len(explanation_rows) >= 1, "未找到普通话解释标记"
print(f"  普通话解释标记行位置: 行 {rows.index(explanation_rows[0]) + 1}")

# 验证普通话解释下一行是整段文本（含换行）
explanation_idx = rows.index(explanation_rows[0])
next_row = rows[explanation_idx + 1]
assert len(next_row) == 1, f"普通话解释应只占1个单元格，实际占{len(next_row)}个"
assert "多模态样本缺图检查结果说明" in next_row[0], "普通话解释内容缺失"
assert "被拦截的样本清单及原因" in next_row[0], "普通话解释缺少拦截清单段落"
print(f"  普通话解释整段写入单个单元格 ✓")

# -------- 6. 验证三端数据签名一致 --------
_HEX = set("0123456789abcdef")
def _extract_sig(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch in _HEX)[:16]

print(f"\n[6] 三端数据签名一致：")
csv_sig = None
for r in rows[:5]:
    for cell in r:
        if "数据签名：" in cell:
            raw = cell.split("：")[-1]
            csv_sig = _extract_sig(raw)
md_sig = None
with open(md_path, encoding="utf-8") as f:
    for line in f:
        if "数据签名：" in line:
            raw = line.split("数据签名：")[1]
            md_sig = _extract_sig(raw)
            break
json_sig = j["data_signature"]
print(f"  CSV  签名: {csv_sig}")
print(f"  MD   签名: {md_sig}")
print(f"  JSON 签名: {json_sig}")
assert csv_sig == json_sig == md_sig, f"签名不一致 CSV={csv_sig} MD={md_sig} JSON={json_sig}"
print("  -> 三端签名完全一致 ✓")

# -------- 7. 验证 CSV 明细和 JSON 明细对得上 --------
print(f"\n[7] CSV 明细与 JSON 明细一致性：")
json_status_map = {d["sample_id"]: d["status"] for d in j["details"] if d["sample_id"]}
csv_status_map = {}
for r in rows:
    if r and r[0] and r[0].startswith("SAMPLE_"):
        csv_status_map[r[0]] = r[1]
mismatch = []
for sid, st in json_status_map.items():
    if sid in csv_status_map and csv_status_map[sid] != st:
        mismatch.append((sid, csv_status_map[sid], st))
print(f"  JSON 样本数: {len(json_status_map)}, CSV 匹配到: {len(csv_status_map)}")
assert not mismatch, f"状态不一致: {mismatch}"
print("  -> CSV/JSON 明细状态完全匹配 ✓")

# -------- 8. 验证版本历史完整性 --------
print(f"\n[8] 版本历史与版本链：")
import sys
sys.path.insert(0, ".")
from version_tracker import VersionTracker
tracker = VersionTracker(storage_path="./version_history")
chain = tracker.get_version_chain(V2)
print(f"  版本链长度: {len(chain)}")
print(f"  版本序列: {' → '.join(v.version_id for v in chain)}")
assert chain[0].parent_version_id is None, "链头应有空 parent"
assert chain[-1].version_id == V2, "链尾应为 V2"
print("  -> 版本链完整且正确 ✓")

print("\n" + "=" * 60)
print("所有 8 个验证点全部通过 ✓")
print("=" * 60)
