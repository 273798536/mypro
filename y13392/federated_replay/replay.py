#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / "samples"
OUTPUT_DIR = BASE_DIR / "output"
LATE_DIR = OUTPUT_DIR / "late_records"
FAILED_DIR = SAMPLES_DIR / "failed_queue"
RESULTS_DIR = OUTPUT_DIR / "results"

LATE_THRESHOLD_SECONDS = 300

STATUS_NORMAL = "normal"
STATUS_LATE = "late_feature"
STATUS_FAILED = "failed"


def ensure_dirs():
    for d in [SAMPLES_DIR, OUTPUT_DIR, LATE_DIR, FAILED_DIR, RESULTS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def load_jsonl(path):
    records = []
    if not path.exists():
        return records
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def save_jsonl(path, records):
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def is_late(record):
    try:
        ts = datetime.fromisoformat(record["feature_timestamp"])
        expected = datetime.fromisoformat(record["expected_timestamp"])
        return (ts - expected).total_seconds() > LATE_THRESHOLD_SECONDS
    except (KeyError, ValueError):
        return False


def next_failed_attempt_dir():
    existing = sorted(FAILED_DIR.glob("attempt_*"))
    if not existing:
        return FAILED_DIR / "attempt_001"
    last_num = int(existing[-1].name.split("_")[1])
    return FAILED_DIR / f"attempt_{last_num + 1:03d}"


def classify(records):
    normal, late, failed = [], [], []
    for r in records:
        raw = json.dumps(r, ensure_ascii=False)
        enriched = {
            "id": r.get("id", f"rec_{int(time.time() * 1000)}"),
            "source": r.get("source", "unknown"),
            "status": STATUS_NORMAL,
            "raw_data": raw,
            "replay_time": datetime.now().isoformat(),
        }
        if r.get("force_fail"):
            enriched["status"] = STATUS_FAILED
            enriched["fail_reason"] = r.get("fail_reason", "unknown error")
            failed.append(enriched)
        elif is_late(r):
            enriched["status"] = STATUS_LATE
            ts = datetime.fromisoformat(r["feature_timestamp"])
            expected = datetime.fromisoformat(r["expected_timestamp"])
            enriched["late_seconds"] = int((ts - expected).total_seconds())
            enriched["late_stage"] = r.get("late_stage", "feature_join")
            late.append(enriched)
        else:
            enriched["prediction"] = r.get("prediction", 0)
            enriched["label"] = r.get("label", 0)
            normal.append(enriched)
    return normal, late, failed


def compare_misjudge(old_record, new_prediction):
    old_pred = old_record.get("old_prediction", old_record.get("prediction", 0))
    label = old_record.get("label", 0)
    reasons = []
    if old_record.get("feature_missing"):
        reasons.append(f"旧模型缺失特征: {old_record['feature_missing']}")
    if old_record.get("model_version_diff"):
        reasons.append(f"模型版本差异: {old_record['model_version_diff']}")
    if old_record.get("threshold_changed"):
        reasons.append(f"阈值调整: {old_record['threshold_changed']}")
    if not reasons:
        reasons.append("特征分布偏移或模型迭代导致")
    return {
        "id": old_record.get("id", "unknown"),
        "label": label,
        "old_prediction": old_pred,
        "new_prediction": new_prediction,
        "old_correct": old_pred == label,
        "new_correct": new_prediction == label,
        "reasons": reasons,
    }


def replay_file(path):
    records = load_jsonl(path)
    return classify(records)


def run_failed_replay():
    attempt_dir = next_failed_attempt_dir()
    attempt_dir.mkdir(parents=True, exist_ok=True)
    previous = sorted(FAILED_DIR.glob("attempt_*"))
    if len(previous) < 2:
        return [], attempt_dir
    prev_dir = previous[-2]
    rerun_results = []
    for jsonl in prev_dir.glob("*.jsonl"):
        records = load_jsonl(jsonl)
        for r in records:
            rerun_results.append(r)
    save_jsonl(attempt_dir / "replayed.jsonl", rerun_results)
    return rerun_results, attempt_dir


def build_report(normal, late, failed, misjudge_results, failed_attempt_info):
    lines = []
    lines.append(f"# 联邦客户端异常回放报告")
    lines.append("")
    lines.append(f"生成时间: {datetime.now().isoformat()}")
    lines.append("")
    lines.append("## 概览")
    lines.append("")
    lines.append(f"| 类别 | 数量 | 状态 |")
    lines.append(f"| --- | --- | --- |")
    lines.append(f"| 正常回放 | {len(normal)} | ✅ 已完成 |")
    lines.append(f"| 特征迟到 | {len(late)} | ⚠️ 已隔离 |")
    lines.append(f"| 失败重试 | {len(failed)} | ❌ 见失败队列 |")
    lines.append(f"| 误判对比 | {len(misjudge_results)} | 🔍 见下文 |")
    lines.append("")

    if late:
        lines.append("## 特征迟到记录（已单独拎出，未混入正常结果）")
        lines.append("")
        lines.append(f"| ID | 来源 | 迟到秒数 | 卡在哪 | 状态 |")
        lines.append(f"| --- | --- | --- | --- | --- |")
        for r in late:
            lines.append(f"| {r['id']} | {r['source']} | {r['late_seconds']}s | {r['late_stage']} | ⚠️ 迟到 |")
        lines.append("")

    if failed:
        lines.append("## 失败队列（保留原始来源，重跑不覆盖旧证据）")
        lines.append("")
        lines.append(f"最新重跑目录: `{failed_attempt_info}`")
        lines.append("")
        lines.append(f"| ID | 来源 | 失败原因 | 状态 |")
        lines.append(f"| --- | --- | --- | --- |")
        for r in failed:
            lines.append(f"| {r['id']} | {r['source']} | {r['fail_reason']} | ❌ 失败 |")
        lines.append("")

    if misjudge_results:
        lines.append("## 旧模型误判样本改判解释")
        lines.append("")
        for m in misjudge_results:
            old_ok = "✅" if m["old_correct"] else "❌"
            new_ok = "✅" if m["new_correct"] else "❌"
            lines.append(f"### 样本 {m['id']}")
            lines.append("")
            lines.append(f"- 真实标签: {m['label']}")
            lines.append(f"- 旧模型预测: {m['old_prediction']} {old_ok}")
            lines.append(f"- 新模型预测: {m['new_prediction']} {new_ok}")
            lines.append(f"- 改判原因:")
            for reason in m["reasons"]:
                lines.append(f"  - {reason}")
            lines.append("")

    lines.append("## 文件位置（小许接班用）")
    lines.append("")
    lines.append(f"- 样例目录: `{SAMPLES_DIR}`")
    lines.append(f"- 迟到隔离: `{LATE_DIR}`")
    lines.append(f"- 失败队列: `{FAILED_DIR}`")
    lines.append(f"- 回放结果: `{RESULTS_DIR}`")
    lines.append(f"- 本报告: `{OUTPUT_DIR / 'report.md'}`")
    lines.append("")
    return "\n".join(lines)


def print_exit_summary(normal, late, failed, misjudge_results):
    print("\n" + "=" * 60)
    print("联邦客户端异常回放 完成")
    print("=" * 60)
    print(f"  正常回放: {len(normal)} 条")
    print(f"  特征迟到: {len(late)} 条 → 已单独拎出在 output/late_records/")
    if late:
        for r in late[:3]:
            print(f"    - {r['id']} 卡在哪: {r['late_stage']} (迟到{r['late_seconds']}s)")
        if len(late) > 3:
            print(f"    ... 共 {len(late)} 条")
    print(f"  失败重试: {len(failed)} 条 → 见 samples/failed_queue/attempt_*")
    print(f"  误判对比: {len(misjudge_results)} 条")
    print(f"  报告文件: {OUTPUT_DIR / 'report.md'}")
    print("=" * 60)
    print("小许接班只看三样:")
    print(f"  1. 样例在哪 → {SAMPLES_DIR}")
    print(f"  2. 异常在哪 → 迟到:{LATE_DIR} 失败:{FAILED_DIR}")
    print(f"  3. 结果导出 → {OUTPUT_DIR / 'report.md'}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="联邦客户端异常回放")
    parser.add_argument("--sample", default=None, help="指定单个样例文件，默认跑整包")
    args = parser.parse_args()

    ensure_dirs()

    if args.sample:
        target_files = [Path(args.sample)]
    else:
        target_files = sorted(SAMPLES_DIR.glob("*.jsonl"))

    all_normal, all_late, all_failed = [], [], []
    misjudge_results = []

    for f in target_files:
        if f.name.startswith("_"):
            continue
        normal, late, failed = replay_file(f)
        all_normal.extend(normal)
        all_late.extend(late)
        all_failed.extend(failed)
        if "misjudge" in f.name:
            for r in normal:
                raw = json.loads(r["raw_data"])
                new_pred = 1 - raw.get("old_prediction", raw.get("prediction", 0))
                misjudge_results.append(compare_misjudge(raw, new_pred))

    save_jsonl(RESULTS_DIR / "normal.jsonl", all_normal)
    save_jsonl(LATE_DIR / "late.jsonl", all_late)

    failed_attempt_info = "无"
    if all_failed:
        attempt_dir = next_failed_attempt_dir()
        attempt_dir.mkdir(parents=True, exist_ok=True)
        save_jsonl(attempt_dir / "failed.jsonl", all_failed)
        failed_attempt_info = str(attempt_dir)
        _, retry_info = run_failed_replay()
        failed_attempt_info += f" (重跑证据保留在: {retry_info})"

    report = build_report(all_normal, all_late, all_failed, misjudge_results, failed_attempt_info)
    report_path = OUTPUT_DIR / "report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print_exit_summary(all_normal, all_late, all_failed, misjudge_results)
    return 0


if __name__ == "__main__":
    sys.exit(main())
