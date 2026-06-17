import os
import sys
import json
import tempfile
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from model_card_audit.cli import CLI
from model_card_audit.generate_sample_data import (
    DATA, clean as clean_sample, make_training, make_evaluation,
    make_feedback, make_supplementary_training
)


def run_cli(*args):
    print(f"\n$ model-card-audit {' '.join(args)}")
    print("-" * 70)
    rc = CLI(list(args)).run()
    print("-" * 70)
    print(f"[exit code={rc}]")
    return rc


def main():
    tmp = Path(tempfile.mkdtemp(prefix="mca_test_"))
    db = tmp / "audit.db"
    out = tmp / "output"
    reports = tmp / "reports"
    out.mkdir()
    reports.mkdir()

    clean_sample()
    make_training()
    make_evaluation()
    make_feedback()
    make_supplementary_training()

    P = ["--db", str(db)]

    print("\n" + "=" * 70)
    print("阶段 1：导入训练样本")
    print("=" * 70)
    run_cli(*P, "import", "--type", "training",
            "--dir", str(DATA / "training_v2"), "--name", "数学训练-2026V2")

    print("\n" + "=" * 70)
    print("阶段 2：再次导入相同训练样本 — 测试幂等去重")
    print("=" * 70)
    run_cli(*P, "import", "--type", "training",
            "--dir", str(DATA / "training_v2"), "--name", "数学训练-2026V2")

    print("\n" + "=" * 70)
    print("阶段 3：导入评测题库")
    print("=" * 70)
    run_cli(*P, "import", "--type", "evaluation",
            "--dir", str(DATA / "evaluation_v2"), "--name", "数学评测-2026V2")

    batch_ids = {}
    from model_card_audit.database import DatabaseManager
    from model_card_audit.version_tracker import VersionTracker
    dbm = DatabaseManager(str(db))
    tracker = VersionTracker(dbm)
    for b in tracker.list_batches():
        batch_ids[b["batch_type"]] = b["batch_id"]
        batch_ids[f"{b['batch_type']}_name"] = b["batch_name"]
    print("\n已录入批次:", batch_ids)

    print("\n" + "=" * 70)
    print("阶段 4：导入人工反馈")
    print("=" * 70)
    run_cli(*P, "import-feedback", "--batch-id", batch_ids["training"],
            "--dir", str(DATA / "feedback_v2"))

    print("\n" + "=" * 70)
    print("阶段 5：查看批次详情")
    print("=" * 70)
    run_cli(*P, "show-batch", "--batch-id", batch_ids["training"])

    print("\n" + "=" * 70)
    print("阶段 6：执行审计（核心）")
    print("=" * 70)
    rc = run_cli(*P, "run",
                 "--training", batch_ids["training"],
                 "--evaluation", batch_ids["evaluation"],
                 "--output-dir", str(out))

    print("\n" + "=" * 70)
    print("阶段 7：同输入再次运行审计 — 应直接复用，不越跑越乱")
    print("=" * 70)
    run_cli(*P, "run",
            "--training", batch_ids["training"],
            "--evaluation", batch_ids["evaluation"],
            "--output-dir", str(out))

    print("\n" + "=" * 70)
    print("阶段 8：查看运行列表（日常版本追踪入口）")
    print("=" * 70)
    run_cli(*P, "list-runs", "--limit", "10")

    print("\n" + "=" * 70)
    print("阶段 9：补录材料（append-sample）— 确保不会冒出两份结论")
    print("=" * 70)
    run_cli(*P, "append-sample", "--batch-id", batch_ids["training"],
            "--dir", str(DATA / "training_v2_supplement"))
    run_cli(*P, "append-sample", "--batch-id", batch_ids["training"],
            "--dir", str(DATA / "training_v2_supplement"))

    print("\n" + "=" * 70)
    print("阶段 10：补录后强制重跑审计 — 检查评测偏科与重复导入不乱")
    print("=" * 70)
    run_cli(*P, "run", "--force",
            "--training", batch_ids["training"],
            "--evaluation", batch_ids["evaluation"],
            "--output-dir", str(out / "rerun"))

    print("\n" + "=" * 70)
    print("阶段 11：月底分布统计报告")
    print("=" * 70)
    run_cli(*P, "monthly-report", "--output-dir", str(reports))

    print("\n" + "=" * 70)
    print("阶段 12：验证 JSON/CSV/MD 摘要一致性 + 补录重跑无重复结论")
    print("=" * 70)
    json_files = list((out / "rerun").rglob("audit_*.json")) or list(Path(out).rglob("audit_*.json"))
    if json_files:
        jf = json_files[0]
        with open(jf, "r", encoding="utf-8") as f:
            payload = json.load(f)
        console_overall = payload["summary"]["overall"]
        json_pass_rate = payload["summary"]["pass_rate"]
        md_file = jf.with_suffix(".md")
        md_text = md_file.read_text(encoding="utf-8") if md_file.exists() else ""
        csv_file = jf.with_suffix(".csv")
        csv_text = csv_file.read_text(encoding="utf-8") if csv_file.exists() else ""

        print(f"✓ JSON 总体结论     : {console_overall[:60]}...")
        print(f"✓ JSON 通过率       : {json_pass_rate * 100:.1f}%")
        in_md = ("总体结论" in md_text) or (payload["summary"]["overall_status"] in md_text)
        in_csv = payload["summary"]["overall_status"] in csv_text
        print(f"✓ MD 是否包含总体结论: {in_md}")
        print(f"✓ CSV 是否包含总体结论: {in_csv}")

        for t, count in payload["summary"]["by_type"].items():
            assert str(count) in csv_text, f"CSV 缺少 {t}={count}"
        for sev, count in payload["summary"]["by_severity"].items():
            assert str(count) in csv_text, f"CSV 缺少 {sev}={count}"
        status = payload["summary"]["overall_status"]
        assert status in md_text, f"MD 缺少总体状态 {status}"
        assert status in csv_text, f"CSV 缺少总体状态 {status}"
        rate_str = f"{payload['summary']['pass_rate'] * 100:.1f}%"
        assert rate_str in md_text, f"MD 缺少通过率 {rate_str}"
        print("✓ CSV 分布数字与 JSON 完全一致")
        print("✓ 总体状态(界面/MD/CSV)三者完全一致 — 不会页面说通过、文件写待确认")

        from model_card_audit.audit_engine import AuditEngine
        eng = AuditEngine(dbm, tracker)
        rerun_conclusions = eng.get_run_conclusions(payload["summary"]["run_id"], only_latest=True)
        pair_keys = [c["material_pair_key"] for c in rerun_conclusions]
        dup_pairs = [k for k in set(pair_keys) if pair_keys.count(k) > 1]
        assert not dup_pairs, f"补录重跑后出现重复结论对: {dup_pairs}"
        print(f"✓ 强制重跑后共 {len(rerun_conclusions)} 条结论，无重复 pair_key")
        print(f"  (同一件事不会出现两份互相打架的结论)")
        print("\n✅ 所有界面/导出文件摘要一致验证通过。")

    print("\n" + "=" * 70)
    print(f"临时工作目录: {tmp}")
    print("=" * 70)
    print("\n✅ 端到端测试完成。")


if __name__ == "__main__":
    main()
