#!/usr/bin/env python3
"""不依赖CLI子进程，直接调用Python模块做端到端验证"""
import json
import os
import shutil
import sys
import csv
from pathlib import Path

ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(ROOT))

from src.storage import DataStore
from src.services import (
    SampleImporter, JudgmentSubmitter, JudgmentComparer, CsvExporter
)

DATA_DIR = ROOT / "_demo_data"
EXAMPLES = ROOT / "examples"
OUTPUTS = ROOT / "_demo_outputs"


def header(title):
    print("\n" + "=" * 68)
    print(f"  {title}")
    print("=" * 68)


def pretty(obj, indent=2):
    print(json.dumps(obj, ensure_ascii=False, indent=indent))


def read_csv_rows(path, n=5):
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        return [row for i, row in enumerate(reader) if i < n]


def main():
    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    if OUTPUTS.exists():
        shutil.rmtree(OUTPUTS)
    OUTPUTS.mkdir(parents=True, exist_ok=True)

    store = DataStore(str(DATA_DIR))
    importer = SampleImporter(store)
    submitter = JudgmentSubmitter(store)
    comparer = JudgmentComparer(store)
    exporter = CsvExporter(store)

    # === Step 1 ===
    header("Step 1: 导入样本表 v1 (samples_v1.csv)")
    r = importer.import_csv(
        str(EXAMPLES / "samples_v1.csv"),
        batch_note="社区公示前第一批v1"
    )
    batch_1_import = r["batch_id"]
    print(f"  导入成功: {r['imported_count']} 条")
    print(f"  批次ID: {batch_1_import}")
    print(f"  源文件哈希: {r['source_hash']}")

    # === Step 2 ===
    header("Step 2: 老唐提交第一批改判 (judgments_batch_1.csv)")
    r = submitter.submit_batch(
        str(EXAMPLES / "judgments_batch_1.csv"),
        operator="老唐",
        model_version="v2.1",
        sample_csv_path=str(EXAMPLES / "samples_v1.csv")
    )
    print(f"  总数: {r['total']}, 成功: {r['success']}, 失败: {r['failed']}")
    batch_1_id = None
    for res in r["results"]:
        if res.get("batch_id"):
            batch_1_id = res["batch_id"]
            break
        if res.get("ref_trace"):
            for t in res["ref_trace"]:
                print(f"    引用: {t}")
    print(f"  批次1 ID: {batch_1_id}")

    # === Step 3 ===
    header("Step 3: 老唐临时补一条单条改判 (S004)")
    r = submitter.submit(
        sample_id="S004",
        manual_label="低风险",
        operator="老唐",
        model_version="v2.1",
        note="稳定高收入，电话核实过",
        override_reason="补充人工确认"
    )
    pretty({k: v for k, v in r.items() if k != "source_row_content"})

    # === Step 4 ===
    header("Step 4: 样本表口径变了，重新导入 samples_v2_changed.csv")
    r = importer.import_csv(
        str(EXAMPLES / "samples_v2_changed.csv"),
        batch_note="6-19下午口径变更后重导"
    )
    print(f"  检测到 {len(r['changed_samples'])} 个样本口径变更:")
    for c in r["changed_samples"]:
        print(f"    - {c['sample_id']}:")
        for f, d in c["fields"].items():
            print(f"        {f}: '{d['before']}' -> '{d['after']}'")

    # === Step 5 ===
    header("Step 5: 老唐提交第二批改判（覆盖第一次S003的结果）")
    r = submitter.submit_batch(
        str(EXAMPLES / "judgments_batch_2_revised.csv"),
        operator="老唐",
        model_version="v2.1",
        sample_csv_path=str(EXAMPLES / "samples_v2_changed.csv")
    )
    print(f"  总数: {r['total']}, 成功: {r['success']}, 失败: {r['failed']}")
    batch_2_id = None
    for res in r["results"]:
        if res.get("batch_id"):
            batch_2_id = res["batch_id"]
        if res.get("warnings"):
            for w in res["warnings"]:
                print(f"    ⚠️  {w}")
    print(f"  批次2 ID: {batch_2_id}")

    # === Step 6 ===
    header("Step 6: S003完整历史（第一次改判被覆盖但保留）")
    jh = store.get_judgments_for_sample("S003")
    print(f"  S003 共 {len(jh)} 次改判:")
    for j in jh:
        tag = "[当前]" if not j.is_overridden else "[已覆盖]"
        print(f"    {tag} {j.created_at} {j.operator} 标签={j.manual_label} "
              f"模型={j.model_version} 备注={j.note[:20]}")
        if j.is_overridden:
            print(f"        被 {j.overridden_by} 覆盖, 原因: {j.override_reason}")

    # === Step 7 ===
    header("Step 7: S001 样本导入历史（2次，口径变更）")
    sh = store.get_sample_history("S001")
    print(f"  S001 共 {len(sh)} 次导入:")
    for s in sh:
        note = s.content.get("样本标签说明", "")
        label = s.content.get("模型标签", "")
        print(f"    {s.imported_at} 批次={s.import_batch_id[:14]} "
              f"模型标签={label} 说明={note[:25]}")

    # === Step 8 ===
    header("Step 8: 导出当前有效改判CSV（沟通用）")
    out_csv = str(OUTPUTS / "沟通用明细_当前有效.csv")
    r = exporter.export_latest(out_csv)
    print(f"  输出文件: {r['output_path']}")
    print(f"  行数: {r['total_rows']}")
    print(f"  引用缺失数: {len(r['missing_references'])}")
    rows = read_csv_rows(out_csv, 3)
    print(f"  列数: {len(rows[0])}")
    print(f"  关键列: {[c for c in rows[0][:10]]}")

    # === Step 9 ===
    header("Step 9: 导出含历史的CSV（看到被覆盖的判断）")
    out_csv_hist = str(OUTPUTS / "沟通用明细_含历史版本.csv")
    r = exporter.export_latest(out_csv_hist, include_history=True)
    print(f"  行数（含历史）: {r['total_rows']}")
    rows = read_csv_rows(out_csv_hist, 5)
    col_status = rows[0].index("状态") if "状态" in rows[0] else -1
    col_manual = rows[0].index("人工改判标签")
    if col_status >= 0:
        for row in rows[1:]:
            print(f"    {row[0]}: {row[col_status]} / {row[col_manual]}")

    # === Step 10 ===
    header("Step 10: 对比批次1和批次2（排班同事用）")
    cmp_result = comparer.compare_batches(batch_1_id, batch_2_id)
    print(f"  一致: {cmp_result['same_count']}")
    print(f"  字段差异: {cmp_result['diff_count']}")
    print(f"  仅批次A: {cmp_result['only_in_a_count']}, 仅批次B: {cmp_result['only_in_b_count']}")
    for d in cmp_result["different"]:
        print(f"    {d['sample_id']} 字段差异: {list(d['field_diffs'].keys())}")

    cmp_csv = str(OUTPUTS / "批次对比_批次1vs2.csv")
    r = exporter.export_compare(cmp_result, cmp_csv)
    print(f"  对比CSV: {r['output_path']} ({r['rows']} 行)")

    # === Step 11 ===
    header("Step 11: 导出S001完整审计链（给老唐解释用）")
    audit_csv = str(OUTPUTS / "S001_审计链.csv")
    r = exporter.export_sample_audit_trail("S001", audit_csv)
    print(f"  {r['sample_id']} 审计链: {r['rows']} 行")
    rows = read_csv_rows(audit_csv, 10)
    for row in rows[1:]:
        if row:
            print(f"    {row[0]:16s} {row[1]} {row[5][:25] if len(row)>5 else ''}")

    # === Step 12 ===
    header("Step 12: 验证引用缺失不会含糊")
    r = submitter.submit(
        sample_id="NOT_EXIST_999",
        manual_label="高风险",
        operator="老唐",
        require_sample_exists=False,
        note="测试引用缺失场景"
    )
    pretty({"success": r["success"], "warnings": r.get("warnings"),
            "errors": r.get("errors")})
    missing = store.read_missing_refs()
    print(f"  missing_refs 日志记录数: {len(missing)}")
    if missing:
        pretty(missing[-1])

    # === Step 13 ===
    header("Step 13: 整体统计")
    all_js = store.list_all_judgments()
    active_js = store.list_active_judgments()
    sample_idx = store.load_samples_index()
    print(f"  样本数: {len(sample_idx)}")
    print(f"  全部改判: {len(all_js)} (其中被覆盖={sum(1 for j in all_js if j.is_overridden)})")
    print(f"  当前有效: {len(active_js)}")
    runs = store.list_runs()
    print(f"  操作记录: {len(runs)} 条")

    # === Summary ===
    header("生成文件列表")
    for f in sorted(OUTPUTS.iterdir()):
        print(f"  {f.name:40s} {f.stat().st_size:>8d} bytes")

    print(f"\n✅ 验证完成！数据保存在: {DATA_DIR}")
    print(f"   导出的CSV保存在: {OUTPUTS}")
    print(f"""
核心命令（值班脚本用）:
  SCHEDULE_JUDGE_DATA={DATA_DIR}
  python judge.py submit --sample-id S001 --manual-label 中风险 --operator 老唐 --model-version v2.1
  python judge.py submit-batch ./改判表.csv --operator 老唐 --model-version v2.1
  python judge.py history --sample-id S003
  python judge.py compare --batch-a XXXX --batch-b YYYY
  python judge.py export --output ./沟通明细.csv

所有命令输出JSON：
  字段：success, run_id, errors[], warnings[], ref_trace[], ...
  退出码：0成功 / 1失败 / 2部分成功有警告
""")


if __name__ == "__main__":
    main()
