#!/usr/bin/env python3
"""排班推荐人工改判 - 端到端验证脚本

模拟风控运营老唐的完整工作流：
1. 导入样本表 v1
2. 提交第一批改判
3. 导入口径变更后的样本表 v2
4. 提交第二批改判（覆盖第一次的部分结果）
5. 导出沟通用 CSV
6. 对比两次改判批次
7. 查看单个样本的审计链
"""
import json
import os
import shutil
import subprocess
import sys
import csv
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
JUDGE = ROOT / "judge.py"
DATA_DIR = ROOT / "_demo_data"
EXAMPLES = ROOT / "examples"
OUTPUTS = ROOT / "_demo_outputs"


def run(cmd, check=True):
    print(f"\n$ {' '.join(cmd)}")
    p = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:")
    try:
        parsed = json.loads(p.stdout) if p.stdout.strip() else {}
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    except Exception:
        print(p.stdout)
    if p.stderr.strip():
        print("STDERR:", p.stderr)
    print(f"EXIT CODE: {p.returncode}")
    if check and p.returncode not in (0, 2):
        raise RuntimeError(f"命令失败: {cmd}")
    return p, (json.loads(p.stdout) if p.stdout.strip() else {})


def read_csv_head(path, n=5):
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = []
        for i, row in enumerate(reader):
            rows.append(row)
            if i >= n:
                break
    return rows


def main():
    print("=" * 70)
    print("排班推荐人工改判 - 端到端演示")
    print("=" * 70)

    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    if OUTPUTS.exists():
        shutil.rmtree(OUTPUTS)
    OUTPUTS.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["SCHEDULE_JUDGE_DATA"] = str(DATA_DIR)

    base_cmd = [sys.executable, str(JUDGE)]

    def judge(*args):
        return subprocess.run(base_cmd + list(args), capture_output=True,
                              text=True, env=env)

    # === Step 1: 导入样本表 v1 ===
    print("\n" + "=" * 70)
    print("Step 1: 老唐导入样本表 v1 (samples_v1.csv)")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "import-samples",
                str(EXAMPLES / "samples_v1.csv"),
                "--batch-note", "社区公示前第一批v1",
                "--data-dir", str(DATA_DIR)])

    # === Step 2: 提交第一批改判 ===
    print("\n" + "=" * 70)
    print("Step 2: 老唐提交第一批改判 (judgments_batch_1.csv)")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "submit-batch",
                str(EXAMPLES / "judgments_batch_1.csv"),
                "--operator", "老唐",
                "--model-version", "v2.1",
                "--sample-csv", str(EXAMPLES / "samples_v1.csv"),
                "--data-dir", str(DATA_DIR)])
    batch_1_id = None
    if r.get("results"):
        for res in r["results"]:
            if res.get("batch_id"):
                batch_1_id = res["batch_id"]
                break
    print(f"  -> 批次1 ID: {batch_1_id}")

    # === Step 3: 单条改判示例（也可以单独提交） ===
    print("\n" + "=" * 70)
    print("Step 3: 老唐临时补一条改判 (submit 单条命令)")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "submit",
                "--sample-id", "S004",
                "--manual-label", "低风险",
                "--operator", "老唐",
                "--model-version", "v2.1",
                "--note", "稳定高收入，确认没问题，电话核实过",
                "--override-reason", "补充人工确认",
                "--data-dir", str(DATA_DIR)])

    # === Step 4: 导入口径变更后的样本表 v2 ===
    print("\n" + "=" * 70)
    print("Step 4: 样本表口径改了，重新导入 samples_v2_changed.csv")
    print("         (S001 和 S006 的模型标签和说明变了)")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "import-samples",
                str(EXAMPLES / "samples_v2_changed.csv"),
                "--batch-note", "6-19下午口径变更后重导",
                "--data-dir", str(DATA_DIR)])
    changed = r.get("changed_samples", [])
    print(f"  -> 检测到 {len(changed)} 个样本口径有变更:")
    for c in changed:
        print(f"     - {c['sample_id']}: {list(c['fields'].keys())}")

    # === Step 5: 提交第二批改判（覆盖第一次的部分结果） ===
    print("\n" + "=" * 70)
    print("Step 5: 老唐提交第二批改判 - 复核后调整 (judgments_batch_2_revised.csv)")
    print("         这次 S003 会覆盖第一次的改判，历史会被保留")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "submit-batch",
                str(EXAMPLES / "judgments_batch_2_revised.csv"),
                "--operator", "老唐",
                "--model-version", "v2.1",
                "--sample-csv", str(EXAMPLES / "samples_v2_changed.csv"),
                "--data-dir", str(DATA_DIR)])
    batch_2_id = None
    if r.get("results"):
        for res in r["results"]:
            if res.get("batch_id"):
                batch_2_id = res["batch_id"]
                break
    print(f"  -> 批次2 ID: {batch_2_id}")

    # === Step 6: 查看 S003 的完整历史（覆盖前后都能看到） ===
    print("\n" + "=" * 70)
    print("Step 6: 查 S003 的完整历史（应该有2次改判，第一次被覆盖）")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "history",
                "--sample-id", "S003",
                "--data-dir", str(DATA_DIR)])
    jh = r.get("judgment_history", [])
    print(f"  -> S003 共 {len(jh)} 次改判:")
    for j in jh:
        status = "当前有效" if not j["is_overridden"] else "已覆盖"
        print(f"     - [{status}] {j['created_at']} {j['operator']} "
              f"{j['manual_label']} (ID={j['judgment_id']})")

    # === Step 7: 查看 S001 的历史，应该有样本口径变更痕迹 ===
    print("\n" + "=" * 70)
    print("Step 7: 查 S001 的样本历史（2次导入，口径有变更）")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "history",
                "--sample-id", "S001",
                "--data-dir", str(DATA_DIR)])
    sh = r.get("sample_import_history", [])
    print(f"  -> S001 共 {len(sh)} 次导入:")
    for s in sh:
        note = s["content"].get("样本标签说明", "")
        label = s["content"].get("模型标签", "")
        print(f"     - {s['imported_at']} 批次{s['import_batch_id'][:12]}... "
              f"模型标签={label} 说明={note[:30]}")

    # === Step 8: 导出当前有效的CSV（给排班同事沟通用） ===
    print("\n" + "=" * 70)
    print("Step 8: 导出当前有效的改判明细CSV")
    print("         这份可以直接拿去和排班、模型组沟通")
    print("=" * 70)
    out_csv = str(OUTPUTS / "沟通用明细_当前有效.csv")
    p, r = run([sys.executable, str(JUDGE), "export",
                "--output", out_csv,
                "--data-dir", str(DATA_DIR)])

    rows = read_csv_head(out_csv, n=3)
    if rows:
        print(f"\n  -> 导出文件: {out_csv}")
        print(f"  -> 列数: {len(rows[0])}")
        print(f"  -> 前几列名: {rows[0][:8]} ...")
        if len(rows) > 1:
            print(f"  -> 第一条样本ID: {rows[1][0]}, 人工标签: {rows[1][7]}")

    # === Step 9: 导出包含完整历史的CSV ===
    print("\n" + "=" * 70)
    print("Step 9: 导出包含历史版本的CSV（能看到被覆盖的判断）")
    print("=" * 70)
    out_csv_hist = str(OUTPUTS / "沟通用明细_含历史版本.csv")
    p, r = run([sys.executable, str(JUDGE), "export",
                "--output", out_csv_hist,
                "--include-history",
                "--data-dir", str(DATA_DIR)])
    rows = read_csv_head(out_csv_hist, n=4)
    if rows:
        status_idx = rows[0].index("状态") if "状态" in rows[0] else -1
        print(f"  -> 共 {r.get('total_rows')} 行 (含被覆盖)")
        if status_idx >= 0 and len(rows) >= 3:
            for i in range(1, min(len(rows), 4)):
                print(f"     - {rows[i][0]}: {rows[i][status_idx]} / {rows[i][7]}")

    # === Step 10: 对比两次改判批次 ===
    print("\n" + "=" * 70)
    print("Step 10: 排班同事对比 batch_1 和 batch_2 差异")
    print("=" * 70)
    if batch_1_id and batch_2_id:
        cmp_csv = str(OUTPUTS / "批次对比_批次1vs2.csv")
        p, r = run([sys.executable, str(JUDGE), "compare",
                    "--batch-a", batch_1_id,
                    "--batch-b", batch_2_id,
                    "--export-csv", cmp_csv,
                    "--data-dir", str(DATA_DIR)])
        print(f"  -> 一致: {r.get('same_count')}")
        print(f"  -> 字段差异: {r.get('diff_count')}")
        print(f"  -> 仅批次A有: {r.get('only_in_a_count')}")
        print(f"  -> 仅批次B有: {r.get('only_in_b_count')}")
        print(f"  -> 对比CSV: {cmp_csv}")
    else:
        print("  !! 批次ID缺失，跳过对比")

    # === Step 11: 导出单个样本的审计链 ===
    print("\n" + "=" * 70)
    print("Step 11: 导出 S001 完整审计链（给老唐临时解释用）")
    print("=" * 70)
    audit_csv = str(OUTPUTS / "S001_审计链.csv")
    p, r = run([sys.executable, str(JUDGE), "export-sample-audit",
                "--sample-id", "S001",
                "--output", audit_csv,
                "--data-dir", str(DATA_DIR)])
    rows = read_csv_head(audit_csv, n=8)
    if rows:
        print(f"  -> 事件数: {len(rows)-1}")
        for row in rows[1:]:
            if row:
                print(f"     - {row[0]} {row[1]} {row[5][:30] if len(row)>5 else ''}")

    # === Step 12: 查看整体统计 ===
    print("\n" + "=" * 70)
    print("Step 12: 整体统计")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "stats",
                "--data-dir", str(DATA_DIR)])

    # === Step 13: 引用缺失测试 ===
    print("\n" + "=" * 70)
    print("Step 13: 验证引用缺失不会变成含糊警告")
    print("         故意提交一条不存在的样本，查看missing-refs")
    print("=" * 70)
    p, r = run([sys.executable, str(JUDGE), "submit",
                "--sample-id", "NOT_EXIST_999",
                "--manual-label", "高风险",
                "--operator", "老唐",
                "--allow-missing-sample",
                "--data-dir", str(DATA_DIR)], check=False)
    p, r = run([sys.executable, str(JUDGE), "missing-refs",
                "--data-dir", str(DATA_DIR)])

    # === Summary ===
    print("\n" + "=" * 70)
    print("演示完成！生成的文件：")
    print("=" * 70)
    for f in sorted(OUTPUTS.iterdir()):
        size = f.stat().st_size
        print(f"  {f.name}  ({size} bytes)")
    print(f"\n数据目录: {DATA_DIR}")
    print("关键命令示例（值班脚本用）:")
    print(f"  export SCHEDULE_JUDGE_DATA={DATA_DIR}")
    print(f"  python {JUDGE} submit --sample-id S001 --manual-label 中风险 --operator 老唐 --model-version v2.1")
    print(f"  python {JUDGE} export --output ./沟通明细.csv")
    print(f"  python {JUDGE} history --sample-id S001")
    print(f"\n所有命令输出均为JSON，脚本可用 jq/python -m json.tool 解析")
    print(f"退出码：0=成功，1=失败，2=部分成功（有警告）")


if __name__ == "__main__":
    main()
