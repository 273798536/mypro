from __future__ import annotations

from pathlib import Path
from typing import Optional

import click

from engine import (
    apply_manual_correction,
    classify_rows,
    compute_metrics,
    supplement_missing_sample,
)
from history import collect_correction_trail, diff_versions, find_history_entry
from models import (
    HistoryEntry,
    JudgmentStatus,
    ProcessingStats,
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


def _print_stats(stats: ProcessingStats) -> None:
    click.echo()
    click.echo(divider("="))
    click.echo("  📊 处理统计")
    click.echo(divider("="))
    click.echo(f"  总数:      {stats.total}")
    click.echo(f"  ✅ 已处理:  {stats.processed}  -> {stats.processed_samples}")
    click.echo(f"  ❌ 坏行:    {stats.bad}  -> {stats.bad_samples}")
    click.echo(f"  ⏭  跳过行:  {stats.skipped}  -> {stats.skipped_samples}")
    click.echo(divider("="))


def _print_pending_confirmations(pending) -> None:
    if not pending:
        return
    click.echo()
    click.echo(divider("!"))
    click.echo("  ⚠️  待确认事项（未完成最终判定，需人工介入）")
    click.echo(divider("!"))
    for idx, p in enumerate(pending, 1):
        click.echo(f"  [{idx}] 原因: {p.reason}")
        click.echo(f"      影响版本: {p.affected_version}")
        if p.affected_sample_ids:
            click.echo(f"      涉及样本: {p.affected_sample_ids}")
        click.echo(f"      影响范围: {p.impact_scope}")
    click.echo(divider("!"))
    click.echo()


def _print_version_note_info(note) -> None:
    click.echo()
    click.echo(divider("~"))
    click.echo(f"  📋 版本说明: {note.version}")
    click.echo(divider("~"))
    click.echo(f"  发布人:   {note.operator}")
    click.echo(f"  发布时间: {format_datetime(note.release_time)}")
    click.echo(f"  描述:     {note.description}")
    if note.threshold_adjustment:
        click.echo(f"  阈值调整: {note.threshold_adjustment}")
    if note.attachments:
        click.echo("  附件列表:")
        for att in note.attachments:
            tag = " [晚到]" if att.is_late else ""
            click.echo(f"    - {att.name}{tag}")
    click.echo(divider("~"))


def _print_metrics(metrics: dict) -> None:
    click.echo()
    click.echo(divider("="))
    click.echo("  📈 指标汇总")
    click.echo(divider("="))
    for k, v in metrics.items():
        if isinstance(v, float):
            click.echo(f"  {k}: {v * 100:.2f}%" if "率" in k else f"  {k}: {v}")
        else:
            click.echo(f"  {k}: {v}")
    click.echo(divider("="))


@click.group(help="病历问答人工改判 CLI 工具")
def cli() -> None:
    pass


@cli.command("run", help="执行一次人工改判流程")
@click.option("--samples", "samples_file", required=True, type=click.Path(exists=True, path_type=Path), help="样本数据 JSON 文件")
@click.option("--version-note", "note_file", required=True, type=click.Path(exists=True, path_type=Path), help="版本说明 JSON 文件")
@click.option("--operator", default="周姐", help="操作人姓名，默认：周姐")
@click.option("--output-dir", type=click.Path(path_type=Path), default=DATA_DIR, help="输出目录")
def run_cmd(samples_file: Path, note_file: Path, operator: str, output_dir: Path) -> None:
    click.echo(banner("病历问答人工改判 · 执行流程"))

    samples = load_samples(samples_file)
    note = load_version_note(note_file)

    _print_version_note_info(note)

    has_issues, pending = parse_version_note(note, samples)
    _print_pending_confirmations(pending)

    if has_issues:
        click.echo("  ⏸  检测到待确认事项，已暂停最终判定输出。")
        click.echo("     请根据上述原因补充数据或人工确认后再继续。")
    else:
        click.echo("  ✅ 版本说明校验通过，无引用缺失。")

    stats = classify_rows(samples, note)
    _print_stats(stats)

    metrics = compute_metrics(samples)
    _print_metrics(metrics)

    entry = HistoryEntry(
        version=note.version,
        samples=samples,
        stats=stats,
        version_note=note,
        pending_confirmations=pending,
    )
    append_history(HISTORY_FILE, entry)

    output_dir.mkdir(parents=True, exist_ok=True)
    result_file = output_dir / f"result_{note.version}.json"
    save_json(result_file, entry.model_dump())
    click.echo(f"\n  💾 本次改判结果已保存至: {result_file}")
    click.echo(f"  📜 已追加写入历史记录: {HISTORY_FILE}")
    click.echo(banner("执行完成", "="))


@cli.command("correct", help="人工修正某条样本的判定")
@click.option("--version", "version_str", required=True, help="目标版本号")
@click.option("--sample-id", required=True, help="样本 ID")
@click.option("--new-status", required=True, type=click.Choice(["正确", "错误", "待确认", "跳过"]), help="新的判定状态")
@click.option("--reason", required=True, help="修正原因")
@click.option("--operator", default="周姐", help="操作人姓名")
def correct_cmd(version_str: str, sample_id: str, new_status: str, reason: str, operator: str) -> None:
    click.echo(banner(f"人工修正 · {version_str} / {sample_id}"))

    history = load_history(HISTORY_FILE)
    entry = find_history_entry(history, version_str)
    if not entry:
        click.echo(f"  ❌ 未找到版本 {version_str} 的历史记录")
        return

    target = next((s for s in entry.samples if s.sample_id == sample_id), None)
    if not target:
        click.echo(f"  ❌ 版本 {version_str} 中未找到样本 {sample_id}")
        return

    old = target.final_status.value
    status_map = {"正确": JudgmentStatus.CORRECT, "错误": JudgmentStatus.INCORRECT,
                  "待确认": JudgmentStatus.PENDING, "跳过": JudgmentStatus.SKIPPED}
    apply_manual_correction(target, operator, status_map[new_status], reason)

    new_stats = classify_rows(entry.samples, entry.version_note)
    entry.stats = new_stats

    save_json(HISTORY_FILE, [e.model_dump() for e in history])

    click.echo(f"  ✅ 样本 {sample_id} 判定已修正")
    click.echo(f"     原状态: {old}")
    click.echo(f"     新状态: {new_status}")
    click.echo(f"     操作人: {operator}")
    click.echo(f"     原因:   {reason}")
    click.echo(f"  📜 该次修正已写入历史记录，可通过 trail 命令追溯")


@cli.command("supplement", help="补录缺失样本数据")
@click.option("--version", "version_str", required=True, help="目标版本号")
@click.option("--sample-id", required=True, help="样本 ID")
@click.option("--question", default=None, help="补录问题文本")
@click.option("--answer", default=None, help="补录答案文本")
@click.option("--reference", default=None, help="补录参考答案")
@click.option("--operator", default="周姐", help="操作人姓名")
def supplement_cmd(version_str: str, sample_id: str, question, answer, reference, operator: str) -> None:
    click.echo(banner(f"补录记录 · {version_str} / {sample_id}"))

    history = load_history(HISTORY_FILE)
    entry = find_history_entry(history, version_str)
    if not entry:
        click.echo(f"  ❌ 未找到版本 {version_str} 的历史记录")
        return

    target = next((s for s in entry.samples if s.sample_id == sample_id), None)
    if not target:
        click.echo(f"  ❌ 版本 {version_str} 中未找到样本 {sample_id}")
        return

    supplement_missing_sample(target, operator, reference, question, answer)
    new_stats = classify_rows(entry.samples, entry.version_note)
    entry.stats = new_stats

    save_json(HISTORY_FILE, [e.model_dump() for e in history])

    if target.row_status.value == "坏行":
        click.echo(f"  ⚠️  补录后仍为坏行：{target.bad_reason}")
    else:
        click.echo(f"  ✅ 样本 {sample_id} 补录成功，已转为已处理状态")


@cli.command("trail", help="查看人工修正完整轨迹")
@click.option("--version", "version_str", default=None, help="只看指定版本，不填则查看全部")
def trail_cmd(version_str: Optional[str]) -> None:
    click.echo(banner("人工修正轨迹 · 历史记录"))

    history = load_history(HISTORY_FILE)
    if version_str:
        history = [e for e in history if e.version == version_str]

    if not history:
        click.echo("  暂无历史记录")
        return

    all_trail = []
    for entry in history:
        all_trail.extend(collect_correction_trail(entry.samples))

    if not all_trail:
        click.echo("  尚未有人工修正记录")
        return

    for t in all_trail:
        click.echo(divider("-"))
        for k, v in t.items():
            click.echo(f"  {k}: {v}")
    click.echo(divider("-"))


@cli.command("diff", help="对比两个版本的差异")
@click.option("--a", "version_a", required=True, help="版本 A")
@click.option("--b", "version_b", required=True, help="版本 B")
def diff_cmd(version_a: str, version_b: str) -> None:
    click.echo(banner(f"版本对比 · {version_a}  ↔  {version_b}"))

    history = load_history(HISTORY_FILE)
    ea = find_history_entry(history, version_a)
    eb = find_history_entry(history, version_b)

    if not ea:
        click.echo(f"  ❌ 未找到版本 {version_a}")
        return
    if not eb:
        click.echo(f"  ❌ 未找到版本 {version_b}")
        return

    d = diff_versions(ea, eb)

    if d.sample_changes:
        click.echo()
        click.echo("  🔁 样本变化:")
        for sid, changes in d.sample_changes.items():
            click.echo(f"    {sid}:")
            for k, v in changes.items():
                click.echo(f"      - {k}: {v}")
    else:
        click.echo("  🔁 样本变化: 无")

    if d.threshold_changes:
        click.echo()
        click.echo("  🎚  阈值变化:")
        for k, v in d.threshold_changes.items():
            click.echo(f"    {k}: {v['旧值']} → {v['新值']}")
    else:
        click.echo("  🎚  阈值变化: 无")

    if d.metric_changes:
        click.echo()
        click.echo("  📈 指标变化:")
        for k, v in d.metric_changes.items():
            va, vb = v["旧值"], v["新值"]
            if isinstance(va, float) and isinstance(vb, float) and "率" in k:
                click.echo(f"    {k}: {va*100:.2f}% → {vb*100:.2f}%")
            else:
                click.echo(f"    {k}: {va} → {vb}")
    else:
        click.echo("  📈 指标变化: 无")

    click.echo()
    click.echo("  📝 人工修正对比:")
    ta = collect_correction_trail(ea.samples)
    tb = collect_correction_trail(eb.samples)
    click.echo(f"    {version_a} 修正次数: {len(ta)}")
    click.echo(f"    {version_b} 修正次数: {len(tb)}")
    if len(tb) > len(ta):
        click.echo(f"    新增 {len(tb) - len(ta)} 条修正记录（见 trail 命令详情）")


@cli.command("history", help="查看全部历史版本列表")
def history_cmd() -> None:
    click.echo(banner("历史版本列表"))

    history = load_history(HISTORY_FILE)
    if not history:
        click.echo("  暂无历史记录")
        return

    for entry in history:
        click.echo(divider("-"))
        click.echo(f"  版本:       {entry.version}")
        click.echo(f"  记录时间:   {format_datetime(entry.timestamp)}")
        click.echo(f"  操作人:     {entry.version_note.operator}")
        click.echo(f"  样本总数:   {entry.stats.total}")
        click.echo(f"  已处理:     {entry.stats.processed}")
        click.echo(f"  坏行:       {entry.stats.bad}")
        click.echo(f"  跳过:       {entry.stats.skipped}")
        if entry.pending_confirmations:
            click.echo(f"  ⚠️  待确认:  {len(entry.pending_confirmations)} 项")
    click.echo(divider("-"))


if __name__ == "__main__":
    cli()
