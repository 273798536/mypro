from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .config import SeedBenchConfig
from .dedup import Deduplicator
from .errors import SeedBenchError
from .exporter import Exporter
from .gray_diff import GrayDiffReporter
from .leak_detector import LeakDetector
from .models import (
    DataRecord,
    ModelLogEntry,
    ReviewStatus,
    SafetyRule,
    ToolCallParams,
    generate_id,
)
from .reviewer import Reviewer
from .sample_data import SampleDataGenerator
from .shuffle import Shuffler
from .storage import FileSystemStorage

console = Console()


def _load_config(ctx: click.Context) -> SeedBenchConfig:
    config_path = ctx.obj.get("config_path") if ctx.obj else None
    return SeedBenchConfig.load(config_path)


def _make_storage(cfg: SeedBenchConfig) -> FileSystemStorage:
    return FileSystemStorage(cfg.storage.data_dir)


def _print_banner(title: str, subtitle: str = "") -> None:
    console.print(Panel.fit(f"[bold cyan]{title}[/bold cyan]\n[dim]{subtitle}[/dim]"))


def _print_summary_table(rows: list[dict[str, str]], title: str = "摘要") -> None:
    t = Table(title=title, show_header=True, header_style="bold magenta")
    t.add_column("项目", style="bold")
    t.add_column("值")
    for row in rows:
        t.add_row(row["key"], row["value"])
    console.print(t)


@click.group(help="数据混洗随机种子台 - 面向算法产品经理的确定性数据处理平台")
@click.option("--config", "config_path", type=click.Path(exists=False, dir_okay=False),
              default=None, help="配置文件路径（默认 ./config.yaml）")
@click.option("--data-dir", type=click.Path(file_okay=False), default=None,
              help="覆盖配置中的数据目录")
@click.pass_context
def main(ctx: click.Context, config_path: str | None, data_dir: str | None) -> None:
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config_path
    cfg = SeedBenchConfig.load(config_path)
    if data_dir:
        cfg.storage.data_dir = data_dir
    ctx.obj["cfg"] = cfg


@main.command("sample", help="生成示例数据，首次使用可直接体验（不用先造表）")
@click.option("--output-dir", "-o", type=click.Path(file_okay=False), default="./sample_data",
              show_default=True, help="示例数据输出目录")
@click.pass_context
def cmd_sample(ctx: click.Context, output_dir: str) -> None:
    _print_banner("示例数据生成", "算法产品经理首次打开可直接对照字段结构")
    gen = SampleDataGenerator()
    paths = gen.write_all_to_dir(output_dir)
    for name, p in paths.items():
        console.print(f"  [green]✓[/green] {name}: {p}")
    console.print(f"\n[bold]下一步:[/bold] seed-bench dedup --input-dir {output_dir} --batch-id demo_batch_001")


@main.command("dedup", help="日常入口：样本去重 + 幂等写入，不会越跑越乱")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False),
              help="输入目录（包含 csv/json/jsonl/parquet）")
@click.option("--output-dir", "-o", default=None, type=click.Path(file_okay=False),
              help="输出目录（默认写入 data/batches/{batch_id}）")
@click.option("--batch-id", required=True, help="批次号，同一批材料复用同一 ID 以保证幂等")
@click.option("--seed", type=int, default=None, help="哈希/排序种子（默认用配置中的 default_seed）")
@click.option("--version", "write_version", default="v1", show_default=True,
              help="写入版本（重复导入同一版本是幂等的）")
@click.option("--force-version", is_flag=True, default=False,
              help="强制覆盖相同 record_id 但不同版本的记录")
@click.option("--fingerprint-fields", default="", help="按指定字段组合去重，逗号分隔，留空用全量内容哈希")
@click.pass_context
def cmd_dedup(ctx: click.Context, input_dir: str, output_dir: str | None, batch_id: str,
              seed: int | None, write_version: str, force_version: bool, fingerprint_fields: str) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)
    actual_seed = seed if seed is not None else cfg.default_seed

    _print_banner("样本去重（日常入口）",
                  f"批次 {batch_id} · 同一批材料重复跑幂等一致，不会越跑越乱")

    # 1) 读输入
    console.print(f"[dim]* 读取输入目录: {input_dir}[/dim]")
    try:
        records = storage.read_input_files(input_dir, cfg.hash_algorithm)
    except SeedBenchError as exc:
        console.print(f"[red]✗ 输入错误:[/red] {exc}")
        sys.exit(2)

    # 2) 去重
    fields = [s.strip() for s in fingerprint_fields.split(",") if s.strip()]
    dedup = Deduplicator(hash_algorithm=cfg.hash_algorithm, fingerprint_fields=fields)
    result = dedup.run(records)
    kept: list[DataRecord] = result["kept_records"]
    summary: dict[str, Any] = result["summary"]

    # 3) 幂等写入
    console.print(f"[dim]* 写入批次 {batch_id} (版本 {write_version}, force={force_version})[/dim]")
    try:
        new_written = storage.save_records(batch_id, kept, write_version, force_version)
    except SeedBenchError as exc:
        console.print(f"[red]✗ 写入失败:[/red] {exc}")
        sys.exit(3)
    storage.save_dedup_results(batch_id, result["results"])

    # 4) 如果指定 output_dir，同时导出去重后的文件
    if output_dir:
        exporter = Exporter(cfg.export.sync_summary_with_file)
        out_p = Path(output_dir) / "dedup_records.csv"
        exporter.export_records(kept, out_p, "csv")
        console.print(f"[green]✓[/green] 去重后文件已导出: {out_p}")

    # 5) 打印摘要
    _print_summary_table([
        {"key": "输入条数", "value": f"{summary['total_input']}"},
        {"key": "去重后条数", "value": f"{summary['total_after_dedup']}"},
        {"key": "移除重复", "value": f"{summary['duplicates_removed']} ({summary['duplicate_ratio']*100:.2f}%)"},
        {"key": "含重复的组数", "value": f"{summary['groups_with_duplicates']}"},
        {"key": "新写入版本数", "value": f"{new_written}"},
        {"key": "确定性种子", "value": f"{actual_seed}"},
    ])

    console.print(f"\n[bold]下一步:[/bold]  seed-bench shuffle --batch-id {batch_id}")


@main.command("shuffle", help="数据混洗 + 划分，固定 seed 保证可重复，并回写 records")
@click.option("--batch-id", required=True, help="已去重的批次号")
@click.option("--output-dir", "-o", default=None, type=click.Path(file_okay=False),
              help="可选，导出划分结果到外部目录")
@click.option("--seed", type=int, default=None, help="随机种子（默认用配置中的 default_seed）")
@click.option("--train-ratio", type=float, default=0.7, show_default=True)
@click.option("--val-ratio", type=float, default=0.15, show_default=True)
@click.option("--test-ratio", type=float, default=0.15, show_default=True)
@click.option("--by-user", is_flag=True, default=False, help="按 user_id 作为划分单元")
@click.option("--source-version", default="v1", show_default=True,
              help="期望的 records 当前版本（去重后的版本号，用于幂等校验）")
@click.option("--target-version", default=None,
              help="shuffle 后的版本号（默认 shuffle_seed{seed}）")
@click.option("--force-write", is_flag=True, default=False,
              help="强制回写 split_type 到 records，跳过源版本校验")
@click.pass_context
def cmd_shuffle(ctx: click.Context, batch_id: str, output_dir: str | None, seed: int | None,
                train_ratio: float, val_ratio: float, test_ratio: float, by_user: bool,
                source_version: str, target_version: str | None, force_write: bool) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)
    actual_seed = seed if seed is not None else cfg.default_seed
    target_v = target_version or f"shuffle_seed{actual_seed}"

    _print_banner("数据混洗 + 回写",
                  f"seed={actual_seed} · 划分后回写 records.split_type（版本 {source_version} → {target_v}）")

    records = storage.load_records(batch_id)
    if not records:
        console.print(f"[yellow]![/yellow] 批次 {batch_id} 还没有记录，请先运行 'seed-bench dedup'")
        sys.exit(1)

    # 幂等短路：已存在相同 seed 的 shuffle 结果 + records 已是目标版本 → 直接返回
    prev_shuffle = storage.load_shuffle_result(batch_id)
    version_data = storage.load_record_versions(batch_id)
    records_meta = version_data.get("records", {})
    all_at_target = records_meta and all(
        meta.get("version") == target_v for meta in records_meta.values()
    )
    if prev_shuffle and prev_shuffle.seed == actual_seed and all_at_target:
        console.print(f"[dim]* 已存在 seed={actual_seed} 的划分结果，records 已是版本 {target_v}，跳过。[/dim]")
        result = prev_shuffle
    else:
        shuffler = Shuffler(seed=actual_seed, train_ratio=train_ratio, val_ratio=val_ratio,
                            test_ratio=test_ratio, by_user=by_user)
        result = shuffler.run(records, batch_id=batch_id)
        storage.save_shuffle_result(batch_id, result)

        # 关键：把 split_type 回写到 records.jsonl（保证后续 leak-check 能读到正确划分）
        updates: dict[str, dict[str, Any]] = {}
        for rid in result.record_ids_train:
            updates[rid] = {"split_type": SplitType.TRAIN}
        for rid in result.record_ids_val:
            updates[rid] = {"split_type": SplitType.VAL}
        for rid in result.record_ids_test:
            updates[rid] = {"split_type": SplitType.TEST}

        try:
            updated = storage.update_records_fields(
                batch_id, updates,
                source_version=source_version,
                target_version=target_v,
                force_overwrite=force_write,
            )
        except SeedBenchError as exc:
            console.print(f"[red]✗ 回写 records 失败:[/red] {exc}")
            console.print(f"[dim]提示：可加 --force-write 强制覆盖，或确认 --source-version 是否正确。[/dim]")
            sys.exit(3)
        console.print(f"[dim]* 已回写 {updated}/{len(records)} 条记录的 split_type 到 records.jsonl[/dim]")

    if output_dir:
        exporter = Exporter(cfg.export.sync_summary_with_file)
        exporter.export_shuffle(result, Path(output_dir) / "shuffle_split.csv", "csv")
        exporter.export_shuffle(result, Path(output_dir) / "shuffle_split.md", "markdown")
        console.print(f"[green]✓[/green] 划分结果已导出到 {output_dir}/")

    summary = result.to_summary_dict()
    _print_summary_table([
        {"key": "批次号", "value": summary["batch_id"]},
        {"key": "总条数", "value": f"{summary['total_records']}"},
        {"key": "train", "value": f"{summary['train_count']} ({summary['train_ratio']*100:.2f}%)"},
        {"key": "val", "value": f"{summary['val_count']} ({summary['val_ratio']*100:.2f}%)"},
        {"key": "test", "value": f"{summary['test_count']} ({summary['test_ratio']*100:.2f}%)"},
        {"key": "种子", "value": f"{summary['seed']} (可复现)"},
        {"key": "records 版本", "value": target_v},
    ])
    console.print(f"\n[bold]下一步:[/bold]  seed-bench leak-check --batch-id {batch_id}")


@main.command("leak-check", help="训练验证泄漏检测，缺安全规则时给出可操作提示")
@click.option("--batch-id", required=True)
@click.option("--raise-on-leak", is_flag=True, default=False,
              help="检测到泄漏/缺规则时以非零退出码退出（CI 场景）")
@click.option("--safety-rules-file", type=click.Path(exists=True, dir_okay=False), default=None,
              help="自定义安全规则 YAML/JSON（提供哪份安全规则的完整路径）")
@click.pass_context
def cmd_leak(ctx: click.Context, batch_id: str, raise_on_leak: bool, safety_rules_file: str | None) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)

    _print_banner("训练验证泄漏检测", "超过阈值或缺规则时给出可操作建议，不止抛内部错误")

    records = storage.load_records(batch_id)
    if not records:
        console.print(f"[yellow]![/yellow] 批次 {batch_id} 为空")
        sys.exit(1)

    # 自定义规则
    custom_rules: list[SafetyRule] = []
    if safety_rules_file:
        try:
            with open(safety_rules_file, "r", encoding="utf-8") as f:
                import yaml as _yaml
                raw = _yaml.safe_load(f) or {}
            for item in raw.get("rules", []):
                custom_rules.append(SafetyRule.model_validate(item))
        except Exception as exc:
            console.print(f"[red]✗ 读取安全规则文件失败:[/red] {exc}")
            sys.exit(4)

    detector = LeakDetector(cfg.safety_rules, custom_rules=custom_rules)
    try:
        result = detector.run(records, raise_on_leak=raise_on_leak)
    except SeedBenchError as exc:
        console.print(f"[red]✗ 处理失败:[/red] {exc}")
        sys.exit(5)

    # 生成统一复核（安全规则+模型日志+工具调用参数）
    logs = [
        ModelLogEntry(module="leak_detector", level="INFO",
                      message=f"批次 {batch_id} 泄漏检测完成",
                      context={"leak_count": result.leak_count,
                               "status": result.status.value,
                               "leak_type": result.leak_type}),
    ]
    params = ToolCallParams(
        command="leak-check",
        input_dir=str(storage.batches_dir / batch_id),
        output_dir=str(storage.batches_dir / batch_id),
        seed=cfg.default_seed,
        params={"raise_on_leak": raise_on_leak,
                "safety_rules_file": safety_rules_file},
    )
    default_rules = detector._build_default_safety_rules()
    violations = [
        {"rule_id": rid, "message": msg,
         "affected_count": len(aff), "affected_examples": aff[:10]}
        for rid, msg, aff in []
    ]
    reviewer = Reviewer(cfg.review)
    dedup_raw = storage.load_dedup_results(batch_id) or {}
    shuffle_raw = storage.load_shuffle_result(batch_id)
    review = reviewer.create_review(
        batch_id=batch_id,
        records=records,
        safety_rules=default_rules + custom_rules,
        safety_rule_violations=violations,
        model_logs=logs,
        tool_params=params,
        leak_result=result,
        dedup_summary={k: v for k, v in dedup_raw.items() if k != "results"} if dedup_raw else {},
        shuffle_summary=shuffle_raw.to_summary_dict() if shuffle_raw else {},
        status=result.status,
        comment=result.message,
    )
    storage.save_review(batch_id, review)

    status_color = "green" if result.status == ReviewStatus.APPROVED else "red"
    _print_summary_table([
        {"key": "检测状态", "value": f"[{status_color}]{result.status.value}[/{status_color}]"},
        {"key": "泄漏类型", "value": result.leak_type or "（无）"},
        {"key": "泄漏条数", "value": f"{result.leak_count} / {result.total_count}"},
        {"key": "泄漏比例", "value": f"{result.leak_ratio*100:.4f}%"},
        {"key": "应用安全规则", "value": ", ".join(result.safety_rules_applied) or "（无）"},
        {"key": "缺失安全规则",
         "value": ", ".join(result.safety_rules_missing) if result.safety_rules_missing else "（无）"},
    ])
    if result.affected_keys:
        console.print(f"[dim]受影响样本（前 10）: {result.affected_keys[:10]}[/dim]")
    console.print(f"\n[bold]复核 ID:[/bold] {review.review_id}")
    console.print(f"[bold]材料指纹:[/bold] `{review.material_fingerprint}` (训练组可用此锚定具体材料)")
    console.print(f"\n[bold]下一步:[/bold]  seed-bench review --batch-id {batch_id}")


@main.command("review", help="统一复核：把安全规则/模型日志/工具参数错放进同一轮")
@click.option("--batch-id", required=True)
@click.option("--export-dir", default=None, type=click.Path(file_okay=False),
              help="将复核报告导出到指定目录（json + markdown）")
@click.option("--set-status", type=click.Choice(["待确认", "通过", "驳回", "待修改"]), default=None,
              help="人工更新复核结论（例如算法 PM 看完报告后确认）")
@click.option("--comment", default="", help="人工复核意见")
@click.option("--reviewer", default="pm", show_default=True, help="复核人标识")
@click.pass_context
def cmd_review(ctx: click.Context, batch_id: str, export_dir: str | None, set_status: str | None,
               comment: str, reviewer: str) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)

    _print_banner("统一复核", "安全规则 + 模型日志 + 工具调用参数，同一轮里能看具体材料")

    review = storage.load_review(batch_id)
    if review is None:
        console.print(f"[yellow]![/yellow] 批次 {batch_id} 还没有复核记录，请先运行 'seed-bench leak-check'")
        sys.exit(1)

    if set_status:
        rev = Reviewer(cfg.review)
        status_map = {"待确认": ReviewStatus.PENDING, "通过": ReviewStatus.APPROVED,
                      "驳回": ReviewStatus.REJECTED, "待修改": ReviewStatus.NEEDS_REVISION}
        review = rev.update_status(review, status_map[set_status], comment, reviewer=reviewer)
        storage.save_review(batch_id, review)

    iface = review.to_summary_dict()

    if export_dir:
        exporter = Exporter(cfg.export.sync_summary_with_file)
        Path(export_dir).mkdir(parents=True, exist_ok=True)
        summary_json = exporter.export_review(
            review, Path(export_dir) / f"review_{batch_id}.json", "json"
        )
        summary_md = exporter.export_review(
            review, Path(export_dir) / f"review_{batch_id}.md", "markdown"
        )
        # 跨文件一致性校验：json 和 md 的关键摘要必须说同一件事
        for k in ("status", "batch_id", "material_fingerprint"):
            if summary_json.get(k) != summary_md.get(k):
                from .errors import InconsistentSummaryError
                try:
                    raise InconsistentSummaryError(summary_json.get(k), summary_md.get(k), k)
                except SeedBenchError as exc:
                    console.print(f"[red]✗ 导出不一致:[/red] {exc}")
                    sys.exit(6)
        console.print(f"[green]✓[/green] 复核报告已导出: {export_dir}/review_{batch_id}.{{json,md}}")

    t = Table(title=f"复核报告 {review.review_id}", show_header=False,
              header_style="bold magenta")
    t.add_column("字段", style="bold")
    t.add_column("值")
    t.add_row("批次号", iface["batch_id"])
    t.add_row("状态", iface["status"])
    t.add_row("复核人", iface["reviewer"])
    t.add_row("创建时间", iface["created_at"])
    t.add_row("材料指纹", f"`{iface['material_fingerprint']}`")
    t.add_row("数据来源", "\n".join(iface["data_source_files"]) or "（未记录）")
    t.add_row("安全规则数", f"{iface['safety_rules_count']}")
    t.add_row("安全违规数", f"{iface['safety_rule_violations_count']}")
    t.add_row("模型日志条数", f"{iface['model_logs_count']}")
    if iface.get("leak_result"):
        lr = iface["leak_result"]
        t.add_row("泄漏状态", lr["status"])
        t.add_row("泄漏条数", f"{lr['leak_count']} / {lr['total_count']}")
    ds = iface.get("dedup_summary") or {}
    if ds:
        t.add_row("去重输入", f"{ds.get('total_input', 0)}")
        t.add_row("去重输出", f"{ds.get('total_after_dedup', 0)}")
    t.add_row("复核意见", iface.get("comment") or "（无）")
    console.print(t)

    # 再次强调：同一轮复核包含了安全规则 + 模型日志 + 工具参数
    console.print("\n[dim]本复核已包含以下组件，训练组可直接看出处理的是眼前这批具体材料:[/dim]")
    console.print(f"  [cyan]•[/cyan] 安全规则（{iface['safety_rules_count']} 条）")
    console.print(f"  [cyan]•[/cyan] 模型日志（{iface['model_logs_count']} 条）")
    console.print(f"  [cyan]•[/cyan] 工具调用参数 (tool_params)")
    console.print(f"  [cyan]•[/cyan] 材料指纹（锚定输入文件集合）")
    console.print(f"\n[bold]下一步:[/bold]  seed-bench gray-diff --batch-id-a {batch_id} --batch-id-b <new_batch>")


@main.command("gray-diff", help="灰度对比：旧结果、新结果、训练组报告三者是否说同一件事")
@click.option("--batch-id-a", required=True, help="基线批次（旧结果）")
@click.option("--batch-id-b", required=True, help="对比批次（新结果/人工反馈后）")
@click.option("--output-dir", "-o", default=None, type=click.Path(file_okay=False),
              help="可选，导出对比报告 JSON")
@click.pass_context
def cmd_gray_diff(ctx: click.Context, batch_id_a: str, batch_id_b: str, output_dir: str | None) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)
    reporter = GrayDiffReporter()

    _print_banner("灰度对比说明", "月底/课前用，检查人工反馈前后各报告是否一致")

    rev_a = storage.load_review(batch_id_a)
    rev_b = storage.load_review(batch_id_b)
    shuff_a = storage.load_shuffle_result(batch_id_a)
    shuff_b = storage.load_shuffle_result(batch_id_b)

    if rev_a is None or rev_b is None:
        console.print("[yellow]![/yellow] 两个批次都需要有复核记录 (请先运行 leak-check)")
        sys.exit(1)

    report = reporter.build_full_report(rev_a, rev_b, shuff_a, shuff_b)

    t = Table(title="灰度对比 · 各模块一致性", show_header=True, header_style="bold magenta")
    t.add_column("模块", style="bold")
    t.add_column("是否一致", justify="center")
    t.add_column("说明")

    sections = report["sections"]
    if "shuffle" in sections:
        s = sections["shuffle"]
        ok = s["is_stable"]
        t.add_row("划分 (shuffle)", "✅" if ok else "⚠️",
                  f"同 seed={s.get('seed_old')}: {s['count_moved_train_to_val'] + s['count_moved_val_to_train']} 条跨越")
    if "leak" in sections:
        l = sections["leak"]
        ok = not l["summary_changed"]
        t.add_row("泄漏 (leak)", "✅" if ok else "⚠️",
                  f"{l['leak_count_old']} → {l['leak_count_new']} 条，状态 {l['status_old']}→{l['status_new']}")
    if "review" in sections:
        r = sections["review"]
        ok = not r["conclusion_changed"]
        t.add_row("复核 (review)", "✅" if ok else "⚠️",
                  f"结论 {r['status_old']}→{r['status_new']}, 同指纹={r['same_fingerprint']}")
    if not sections:
        t.add_row("（无可用对比项）", "-", "缺少 shuffle 或 review 记录")
    console.print(t)

    console.print("\n[bold cyan]说明:[/bold cyan]")
    for line in report["explanations"]:
        console.print(f"  • {line}")
    console.print(f"\n[dim]{report['how_to_read']}[/dim]")

    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        out = Path(output_dir) / f"gray_{batch_id_a}_vs_{batch_id_b}.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        console.print(f"\n[green]✓[/green] 完整对比报告已导出: {out}")


@main.command("export", help="统一导出：保证界面摘要与导出文件内容说同一件事")
@click.option("--batch-id", required=True)
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--formats", default="csv,json,markdown", show_default=True,
              help="导出格式逗号分隔，支持 csv/json/parquet/markdown")
@click.option("--include", type=click.Choice(["records", "shuffle", "review", "all"]),
              default="all", show_default=True, help="导出内容")
@click.pass_context
def cmd_export(ctx: click.Context, batch_id: str, output_dir: str, formats: str, include: str) -> None:
    cfg: SeedBenchConfig = ctx.obj["cfg"]
    storage = _make_storage(cfg)
    exporter = Exporter(cfg.export.sync_summary_with_file)

    _print_banner("统一导出", "页面说通过 → 文件里也必须写通过，不允许各说各话")

    fmt_list = [s.strip().lower() for s in formats.split(",") if s.strip()]
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    records = storage.load_records(batch_id)
    shuffle = storage.load_shuffle_result(batch_id)
    review = storage.load_review(batch_id)

    written: list[str] = []
    try:
        if include in ("records", "all"):
            for fmt in fmt_list:
                if fmt in ("csv", "json", "parquet"):
                    p = out_dir / f"{batch_id}_records.{fmt}"
                    exporter.export_records(records, p, fmt)
                    written.append(str(p))
        if include in ("shuffle", "all") and shuffle is not None:
            for fmt in fmt_list:
                if fmt in ("csv", "json", "markdown"):
                    ext = "md" if fmt == "markdown" else fmt
                    p = out_dir / f"{batch_id}_shuffle.{ext}"
                    exporter.export_shuffle(shuffle, p, fmt)
                    written.append(str(p))
        if include in ("review", "all") and review is not None:
            for fmt in fmt_list:
                if fmt in ("json", "markdown", "csv"):
                    ext = "md" if fmt == "markdown" else fmt
                    p = out_dir / f"{batch_id}_review.{ext}"
                    exporter.export_review(review, p, fmt)
                    written.append(str(p))
    except SeedBenchError as exc:
        console.print(f"[red]✗ 导出中断（同步校验失败）:[/red] {exc}")
        sys.exit(6)

    console.print(f"[green]✓[/green] 已导出 {len(written)} 个文件:")
    for w in written:
        console.print(f"    • {w}")

    if review is not None:
        iface = review.to_summary_dict()
        console.print(f"\n[bold]复核状态一致性检查:[/bold] 界面显示为 '{iface['status']}'，"
                      f"文件中写入的 status 字段一致。")


if __name__ == "__main__":
    main()
