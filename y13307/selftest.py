from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from engine import (
    apply_manual_correction,
    classify_rows,
    compute_metrics,
    supplement_missing_sample,
)
from history import collect_correction_trail, diff_versions, find_history_entry
from models import (
    CorrectionRecord,
    HistoryEntry,
    JudgmentStatus,
    ProcessingStats,
    QASample,
)
from utils import (
    append_history,
    banner,
    divider,
    format_datetime,
    load_history,
    load_samples,
    load_version_note,
    save_json,
)
from version_parser import parse_version_note

DATA_DIR = Path(__file__).parent / "data"
HISTORY_FILE = DATA_DIR / "history.json"


def main() -> None:
    print(banner("病历问答人工改判 · 自测脚本"))

    if HISTORY_FILE.exists():
        HISTORY_FILE.unlink()

    # ============ 跑 V1 ============
    print(divider("="))
    print("【STEP 1】执行 v2024.05.12 人工改判")
    print(divider("="))

    samples_v1 = load_samples(DATA_DIR / "samples_v1.json")
    note_v1 = load_version_note(DATA_DIR / "version_note_v1.json")

    print(f"  版本: {note_v1.version} | 发布人: {note_v1.operator}")
    print(f"  描述: {note_v1.description}")

    has_issues, pending = parse_version_note(note_v1, samples_v1)
    print(f"  版本说明校验: {'⚠️ 有待确认' if has_issues else '✅ 通过'}")
    for p in pending:
        print(f"    - {p.reason}")

    stats_v1 = classify_rows(samples_v1, note_v1)
    print(f"\n  📊 处理统计:")
    print(f"    总数:     {stats_v1.total}")
    print(f"    已处理:   {stats_v1.processed} -> {stats_v1.processed_samples}")
    print(f"    坏行:     {stats_v1.bad} -> {stats_v1.bad_samples}")
    print(f"    跳过:     {stats_v1.skipped} -> {stats_v1.skipped_samples}")

    metrics_v1 = compute_metrics(samples_v1)
    print(f"\n  📈 指标: {metrics_v1}")

    entry_v1 = HistoryEntry(
        version=note_v1.version,
        samples=samples_v1,
        stats=stats_v1,
        version_note=note_v1,
        pending_confirmations=pending,
    )
    append_history(HISTORY_FILE, entry_v1)
    print(f"  💾 v1 已写入历史")

    # ============ 跑 V2（含引用缺失 + 晚到附件） ============
    print()
    print(divider("="))
    print("【STEP 2】执行 v2024.05.14 人工改判（含引用缺失 + 晚到附件）")
    print(divider("="))

    samples_v2 = load_samples(DATA_DIR / "samples_v2.json")
    note_v2 = load_version_note(DATA_DIR / "version_note_v2.json")

    print(f"  版本: {note_v2.version} | 发布人: {note_v2.operator}")
    print(f"  描述: {note_v2.description}")

    has_issues, pending = parse_version_note(note_v2, samples_v2)
    print(f"\n  ⚠️  待确认事项数量: {len(pending)}")
    for p in pending:
        print(f"    原因:        {p.reason}")
        print(f"    影响版本:    {p.affected_version}")
        print(f"    涉及样本:    {p.affected_sample_ids if p.affected_sample_ids else '无'}")
        print(f"    影响范围:    {p.impact_scope}")
        print()

    if has_issues:
        print("  ⏸  检测到待确认事项，暂停最终判定输出，等待人工介入")
    else:
        print("  ✅ 版本说明校验通过")

    stats_v2 = classify_rows(samples_v2, note_v2)
    print(f"  📊 处理统计:")
    print(f"    总数:     {stats_v2.total}")
    print(f"    已处理:   {stats_v2.processed} -> {stats_v2.processed_samples}")
    print(f"    坏行:     {stats_v2.bad} -> {stats_v2.bad_samples}")
    print(f"    跳过:     {stats_v2.skipped} -> {stats_v2.skipped_samples}")

    for s in samples_v2:
        if s.row_status.value == "跳过":
            print(f"    跳过原因（{s.sample_id}）: notes={s.notes}")
        if s.row_status.value == "坏行":
            print(f"    坏行原因（{s.sample_id}）: {s.bad_reason}")

    metrics_v2 = compute_metrics(samples_v2)
    print(f"\n  📈 指标: {metrics_v2}")

    entry_v2 = HistoryEntry(
        version=note_v2.version,
        samples=samples_v2,
        stats=stats_v2,
        version_note=note_v2,
        pending_confirmations=pending,
    )
    append_history(HISTORY_FILE, entry_v2)
    print(f"  💾 v2 已写入历史")

    # ============ 人工修正 ============
    print()
    print(divider("="))
    print("【STEP 3】模拟周姐人工修正 QA-2024-0514-006：错误 → 正确（临时争议判定）")
    print(divider("="))

    history = load_history(HISTORY_FILE)
    entry = find_history_entry(history, "v2024.05.14")
    s6 = next(s for s in entry.samples if s.sample_id == "QA-2024-0514-006")
    print(f"  修正前: {s6.final_status.value}")
    apply_manual_correction(s6, "周姐", JudgmentStatus.CORRECT,
                            "部分指南推荐CT平扫为排除出血首选，争议题按正确处理")
    print(f"  修正后: {s6.final_status.value}")
    print(f"  修正轨迹条数: {len(s6.corrections)}")

    entry.stats = classify_rows(entry.samples, entry.version_note)
    save_json(HISTORY_FILE, [e.model_dump() for e in history])
    print("  ✅ 修正已写入历史")

    # ============ 补录记录 ============
    print()
    print(divider("="))
    print("【STEP 4】模拟补录 QA-2024-0512-003 的缺失字段")
    print(divider("="))

    entry = find_history_entry(load_history(HISTORY_FILE), "v2024.05.14")
    s3 = next(s for s in entry.samples if s.sample_id == "QA-2024-0512-003")
    print(f"  补录前行状态: {s3.row_status.value}")
    print(f"  补录前问题: '{s3.question}' 答案: '{s3.answer}'")

    supplement_missing_sample(
        s3,
        "周姐",
        question="上消化道出血最常见的病因是？",
        answer="消化性溃疡",
        reference_answer="消化性溃疡（PU）",
    )
    entry.stats = classify_rows(entry.samples, entry.version_note)
    save_json(HISTORY_FILE, [e.model_dump() for e in history])
    print(f"  补录后行状态: {s3.row_status.value}")
    print(f"  补录后问题: '{s3.question}' 答案: '{s3.answer}'")
    print("  ✅ 补录已写入历史")

    # ============ 修正轨迹 ============
    print()
    print(divider("="))
    print("【STEP 5】查看全部人工修正轨迹（确保下一班能看到每一步改动）")
    print(divider("="))

    trail = []
    for e in load_history(HISTORY_FILE):
        trail.extend(collect_correction_trail(e.samples))
    for t in trail:
        print(divider("-"))
        for k, v in t.items():
            print(f"  {k}: {v}")

    # ============ 版本对比 ============
    print()
    print(divider("="))
    print("【STEP 6】v2024.05.12 ↔ v2024.05.14 版本对比")
    print(divider("="))

    history = load_history(HISTORY_FILE)
    ea = find_history_entry(history, "v2024.05.12")
    eb = find_history_entry(history, "v2024.05.14")
    d = diff_versions(ea, eb)

    print("\n  🔁 样本变化:")
    for sid, changes in d.sample_changes.items():
        print(f"    {sid}:")
        for k, v in changes.items():
            print(f"      - {k}: {v}")

    print("\n  🎚  阈值变化:")
    for k, v in d.threshold_changes.items():
        print(f"    {k}: {v['旧值']} → {v['新值']}")

    print("\n  📈 指标变化:")
    for k, v in d.metric_changes.items():
        va, vb = v["旧值"], v["新值"]
        if isinstance(va, float) and isinstance(vb, float) and "率" in k:
            print(f"    {k}: {va*100:.2f}% → {vb*100:.2f}%")
        else:
            print(f"    {k}: {va} → {vb}")

    print()
    print(banner("自测全部完成 ✅", "="))
    print("  CLI 使用方法:")
    print("    python3 cli.py run --samples data/samples_v1.json --version-note data/version_note_v1.json")
    print("    python3 cli.py run --samples data/samples_v2.json --version-note data/version_note_v2.json")
    print("    python3 cli.py correct --version v2024.05.14 --sample-id QA-2024-0514-006 --new-status 正确 --reason '测试修正'")
    print("    python3 cli.py supplement --version v2024.05.14 --sample-id QA-2024-0512-003 --question 'xxx' --answer 'yyy'")
    print("    python3 cli.py trail")
    print("    python3 cli.py diff --a v2024.05.12 --b v2024.05.14")
    print("    python3 cli.py history")
    print()


if __name__ == "__main__":
    main()
