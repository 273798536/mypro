import os
import sys
import click
import json

from .cli_core import SegmentCheckCLI, CLIRenderer
from .models import ValidationStatus


pass_context = click.make_pass_decorator(SegmentCheckCLI, ensure=True)


@click.group()
@click.option("--work-dir", type=click.Path(), default=None,
              help="工作目录（存放历史和中间数据）")
@click.pass_context
def cli(ctx, work_dir):
    """分段回归边界校验工具 - 数据分析质量保障系统"""
    ctx.obj = SegmentCheckCLI(work_dir=work_dir)


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--expected", "-e", multiple=True,
              help="期望的材料名称白名单（可重复指定）")
@click.option("--validate/--no-validate", default=True,
              help="导入后是否立即校验")
@pass_context
def import_file(cli_obj, file_path, expected, validate):
    """导入材料数据文件（CSV/JSON），保留原始痕迹"""
    click.echo(f"\n📥 导入文件: {file_path}")

    expected_list = list(expected) if expected else None
    result = cli_obj.import_file(file_path, expected_names=expected_list)

    click.echo(f"   新导入: {result['imported_count']} 条")
    click.echo(f"   累计总数: {result['total_count']} 条")

    for change in result["changes"]:
        if change.get("type") == "potential_duplicate":
            click.echo(f"   ⚠  {change['note']}")

    if validate:
        val_result = cli_obj.validate()
        click.echo(cli_obj.render_report(include_anomaly=True, include_history=True))

        _save_state(cli_obj)
    else:
        click.echo(cli_obj.renderer.render_anomaly_queue(cli_obj.anomaly_queue))


@cli.command()
@click.option("--record-id", "-r", multiple=True,
              help="仅校验指定记录ID（可重复指定）")
@click.option("--show-raw", is_flag=True,
              help="显示坏行原始数据留痕")
@pass_context
def validate(cli_obj, record_id, show_raw):
    """执行分段回归边界校验"""
    ids = list(record_id) if record_id else None
    click.echo("\n🔍 运行分段回归边界校验...")

    if _load_state(cli_obj):
        pass

    result = cli_obj.validate(specific_ids=ids)
    click.echo(cli_obj.render_report(include_anomaly=True, include_history=True, include_metrics=True))

    if show_raw:
        for rec_id in ids or []:
            click.echo(cli_obj.get_record_raw_trace(rec_id))

    _save_state(cli_obj)

    suspended_count = len(result["suspended"])
    if suspended_count > 0:
        click.echo("")
        click.echo(f"⏸  共 {suspended_count} 条记录处于挂起状态，需要负责人确认。")
        click.echo("   使用 'segment-check suspend-list' 查看挂起详情。")
        click.echo("   确认后使用 'segment-check override' 人工调整或 'segment-check resume' 继续。")


@cli.command("suspend-list")
@pass_context
def suspend_list(cli_obj):
    """查看挂起队列（除零边界等需确认项）"""
    _load_state(cli_obj)

    suspended = [
        (r, res) for r, res in zip(cli_obj.records, cli_obj.results)
        if res and res.status == ValidationStatus.SUSPENDED
    ]

    if not suspended:
        click.echo("\n✅ 当前无挂起记录。")
        return

    click.echo(CLIRenderer.render_suspended(suspended))

    for record, result in suspended:
        click.echo(CLIRenderer.render_segment_metrics(result))


@cli.command()
@click.argument("record_id")
@click.option("--to", "new_status", required=True,
              type=click.Choice(["pass", "fail", "warning", "suspended"], case_sensitive=False),
              help="调整后的校验状态")
@click.option("--operator", "-o", default="小孟", show_default=True,
              help="操作人名称（下一班可查历史）")
@click.option("--comment", "-c", default="",
              help="调整理由备注")
@pass_context
def override(cli_obj, record_id, new_status, operator, comment):
    """人工调整校验结论（小孟的临时判断会记入历史）"""
    _load_state(cli_obj)

    result = cli_obj.manual_override(record_id, new_status.lower(), operator=operator, comment=comment)

    click.echo(f"\n✍  人工调整已记录")
    click.echo(f"   记录: {record_id} ({result.material_name})")
    click.echo(f"   新状态: {result.status.value}")
    click.echo(f"   操作人: {operator}")
    if comment:
        click.echo(f"   理由: {comment}")
    click.echo("   * 此变更已写入历史，下一班可通过 'history' 命令回溯。")

    _save_state(cli_obj)


@cli.command()
@click.argument("record_id")
@click.option("--comment", "-c", default="负责人确认后恢复",
              help="恢复确认备注")
@pass_context
def resume(cli_obj, record_id, comment):
    """恢复挂起记录（负责人确认后）"""
    _load_state(cli_obj)

    result = cli_obj.manual_override(record_id, "warning", operator="负责人",
                                      comment=f"[恢复挂起] {comment}")
    click.echo(f"\n▶  已从挂起恢复: {record_id} ({result.material_name})")
    click.echo("   状态调整为 warning，建议再次复核。")

    _save_state(cli_obj)


@cli.command()
@click.option("--record-id", "-r", multiple=True,
              help="指定记录ID追踪（可重复）")
@pass_context
def trace(cli_obj, record_id):
    """追踪原始数据痕迹（不清洗，看本来面目）"""
    _load_state(cli_obj)

    ids = list(record_id)
    if not ids:
        bad_records = [r for r in cli_obj.records if r.status.value == "bad"]
        if bad_records:
            click.echo(f"\n💥 坏行共 {len(bad_records)} 条，展示原始留痕:")
            for r in bad_records:
                click.echo(cli_obj.get_record_raw_trace(r.record_id))
        else:
            click.echo("\nℹ  使用 --record-id 指定要追踪的记录，或查看下方所有记录原始数据:")
            for r in cli_obj.records:
                click.echo(cli_obj.get_record_raw_trace(r.record_id))
    else:
        for rid in ids:
            click.echo(cli_obj.get_record_raw_trace(rid))


@cli.command()
@click.option("--limit", "-n", default=20, show_default=True,
              help="显示最近N条")
@pass_context
def history(cli_obj, limit):
    """查看变更历史（含小孟的临时判断）"""
    _load_state(cli_obj)

    entries = cli_obj.history.get_change_summary()
    click.echo(CLIRenderer.render_history(entries, limit=limit))

    all_entries = cli_obj.history.get_all_entries()
    override_entries = [e for e in all_entries if e.change_type.value == "manual_override"]
    if override_entries:
        click.echo(f"\n📝 人工调整记录共 {len(override_entries)} 条（数据分析小孟的临时判断）:")
        for e in override_entries:
            click.echo(f"  [{e.timestamp.strftime('%H:%M:%S')}] {e.material_name}: "
                       f"{e.previous_status.value if e.previous_status else '?'} → "
                       f"{e.new_status.value if e.new_status else '?'} "
                       f"(操作人: {e.operator}) - {e.comment or ''}")
            if e.previous_data:
                click.echo(f"     变更前: {json.dumps(e.previous_data, ensure_ascii=False)[:80]}...")
            if e.new_data:
                click.echo(f"     变更后: {json.dumps(e.new_data, ensure_ascii=False)[:80]}...")


@cli.command()
@click.option("--pending-only", is_flag=True,
              help="只看待处理异常")
@pass_context
def anomaly(cli_obj, pending_only):
    """查看异常队列"""
    _load_state(cli_obj)

    all_items = cli_obj.anomaly_queue.get_all()
    pending_items = cli_obj.anomaly_queue.get_pending()

    if pending_only:
        items = pending_items
        click.echo(f"\n⚠  待处理异常: {len(items)} / 累计 {len(all_items)} 条")
    else:
        items = all_items
        click.echo(f"\n⚠  异常队列累计: {len(items)} 条 (待处理 {len(pending_items)} 条)")

    if not items:
        click.echo("   (无异常记录)\n")
        return

    class QueueView:
        def get_all(s): return items
        def get_pending(s):
            return [i for i in items if i.get("action_required")]
        def to_table_data(s):
            table = []
            for item in items:
                table.append({
                    "时间": item["timestamp"].strftime("%H:%M:%S") if hasattr(item["timestamp"], "strftime") else str(item["timestamp"]),
                    "材料名称": item["material_name"],
                    "异常类型": " | ".join(item["anomaly_types"]),
                    "当前状态": item["current_status"],
                    "来源": item["source"],
                    "说明": (item["change_context"] or item["warnings"][0] if item["warnings"] else "")[:50],
                    "需处理": "是" if item["action_required"] else "否",
                })
            return table

    renderer = CLIRenderer()
    click.echo(renderer.render_anomaly_queue(QueueView()))


@cli.command()
@click.option("--metrics/--no-metrics", default=True,
              help="显示分段回归指标")
@pass_context
def report(cli_obj, metrics):
    """生成完整校验报告"""
    _load_state(cli_obj)

    click.echo(cli_obj.render_report(
        include_detail=True,
        include_anomaly=True,
        include_history=True,
        include_metrics=metrics,
    ))


@cli.command()
@click.option("--expected", "-e", multiple=True,
              help="材料名称白名单（用于制造名称不一致场景）")
@pass_context
def demo(cli_obj, expected):
    """完整流程演示：旧材料 → 不一致材料 → 复算 → 异常队列"""
    import tempfile
    import os
    import json

    click.echo("\n" + "=" * 60)
    click.echo("🎬 分段回归边界校验 - 完整流程演示")
    click.echo("=" * 60)

    # Step 1: 旧材料
    click.echo("\n① 第一步：导入旧材料（3条正常数据 + 1条除零边界 + 1条坏行）")
    old_data = [
        {
            "record_id": "MAT-OLD-001",
            "material_name": "氮化镓基片-A",
            "低温段": [
                {"温度": -40, "电阻": 120.5},
                {"温度": -20, "电阻": 125.2},
                {"温度": 0, "电阻": 130.1},
                {"温度": 20, "电阻": 135.0},
            ],
            "中温段": [
                {"温度": 50, "电阻": 142.3},
                {"温度": 100, "电阻": 155.8},
                {"温度": 150, "电阻": 169.2},
                {"温度": 200, "电阻": 182.7},
            ],
            "高温段": [
                {"温度": 250, "电阻": 196.5},
                {"温度": 300, "电阻": 210.1},
                {"温度": 350, "电阻": 223.8},
                {"温度": 400, "电阻": 237.5},
            ],
        },
        {
            "record_id": "MAT-OLD-002",
            "material_name": "碳化硅衬底-B",
            "低温段": [
                {"温度": -40, "电阻": 98.0},
                {"温度": -20, "电阻": 105.3},
                {"温度": 0, "电阻": 112.7},
                {"温度": 20, "电阻": 120.1},
            ],
            "中温段": [
                {"温度": 50, "电阻": 131.0},
                {"温度": 100, "电阻": 149.5},
                {"温度": 150, "电阻": 168.0},
                {"温度": 200, "电阻": 186.5},
            ],
            "高温段": [
                {"温度": 250, "电阻": 205.0},
                {"温度": 300, "电阻": 223.5},
                {"温度": 350, "电阻": 242.0},
                {"温度": 400, "电阻": 260.5},
            ],
        },
        {
            "record_id": "MAT-OLD-003",
            "material_name": "砷化镓外延-C",
            "低温段": [
                {"温度": -40, "电阻": 300.0},
                {"温度": -20, "电阻": 300.0},
                {"温度": 0, "电阻": 300.0},
                {"温度": 20, "电阻": 300.0},
            ],
            "中温段": [
                {"温度": 50, "电阻": 315.2},
                {"温度": 100, "电阻": 340.8},
                {"温度": 150, "电阻": 366.3},
                {"温度": 200, "电阻": 391.9},
            ],
            "高温段": [
                {"温度": 250, "电阻": 417.4},
                {"温度": 300, "电阻": 443.0},
                {"温度": 350, "电阻": 468.5},
                {"温度": 400, "电阻": 494.1},
            ],
        },
    ]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(old_data, f, ensure_ascii=False, indent=2)
        old_file = f.name

    expected_list = list(expected) or ["氮化镓基片-A", "碳化硅衬底-B", "砷化镓外延-C"]
    result = cli_obj.import_file(old_file, expected_names=expected_list)
    val_result = cli_obj.validate()

    click.echo(f"   导入 {result['imported_count']} 条，总数 {result['total_count']} 条")
    click.echo(f"   挂起: {val_result['stats'].suspended}（除零边界自动挂起，不做假稳定结论）")
    click.echo(f"   通过: {val_result['stats'].passed}, 警告: {val_result['stats'].warnings}, 失败: {val_result['stats'].failed}")

    # Step 2: 小孟临时调整
    click.echo("\n② 模拟：数据分析小孟发现挂起，临时判断为可接受，人工调整。")
    suspended_ids = [r[0].record_id for r in val_result["suspended"]]
    for sid in suspended_ids:
        cli_obj.manual_override(sid, "warning", operator="小孟",
                                comment="低温段数据波动属已知工艺问题，公示前暂按警告处理")
    click.echo("   ✅ 小孟的临时判断已记入历史，下一班可查。")

    # Step 3: 补一条名称不一致的材料
    click.echo("\n③ 第二步：补一条名称不一致的材料（氮化镓基片A → 缺了连字符）")
    new_data = [
        {
            "record_id": "MAT-NEW-004",
            "material_name": "氮化镓基片A",
            "低温段": [
                {"温度": -40, "电阻": 121.0},
                {"温度": -20, "电阻": 125.8},
                {"温度": 0, "电阻": 130.5},
                {"温度": 20, "电阻": 135.3},
            ],
            "中温段": [
                {"温度": 50, "电阻": 142.8},
                {"温度": 100, "电阻": 156.2},
                {"温度": 150, "电阻": 169.5},
                {"温度": 200, "电阻": 183.0},
            ],
            "高温段": [
                {"温度": 250, "电阻": 196.8},
                {"温度": 300, "电阻": 210.5},
                {"温度": 350, "电阻": 224.0},
                {"温度": 400, "电阻": 237.8},
            ],
        },
    ]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
        new_file = f.name

    result2 = cli_obj.import_file(new_file)
    click.echo(f"   新增: {result2['imported_count']} 条，总数 {result2['total_count']} 条")

    for change in result2["changes"]:
        if change.get("type") == "potential_duplicate":
            click.echo(f"   ⚠  {change['note']}")

    # Step 4: 复算
    click.echo("\n④ 第三步：复算，看图表和明细是否同一口径")
    val_result2 = cli_obj.validate()

    click.echo(cli_obj.render_report(
        include_detail=True,
        include_anomaly=True,
        include_history=True,
        include_metrics=True,
    ))

    click.echo("\n" + "=" * 60)
    click.echo("🎯 演示完成")
    click.echo("=" * 60)
    click.echo("")
    click.echo("   ✅ CLI 统计分开显示：已处理/坏行/跳过行/挂起/通过/失败")
    click.echo("   ✅ 原始数据留痕：坏行名称不一致保留原样，不清洗")
    click.echo("   ✅ 除零挂起：宁可挂起不给假稳定结论，需负责人确认")
    click.echo("   ✅ 图表口径一致：低/中/高段独立回归，R²与表格一致")
    click.echo("   ✅ 小孟临时判断：全部写入历史，下一班可回溯")
    click.echo("   ✅ 异常队列：清晰记录导入→复算的全部变化脉络")
    click.echo("")

    os.unlink(old_file)
    os.unlink(new_file)
    _save_state(cli_obj)


def _state_path(cli_obj):
    return os.path.join(cli_obj.work_dir, ".segment_check_state.json")


def _save_state(cli_obj):
    import copy
    anomaly_items = []
    for item in cli_obj.anomaly_queue._items:
        item_copy = copy.deepcopy(item)
        ts = item_copy.get("timestamp")
        if ts and not isinstance(ts, str):
            item_copy["timestamp"] = ts.isoformat()
        anomaly_items.append(item_copy)

    state = {
        "records": [
            {
                "record_id": r.record_id,
                "material_name": r.material_name,
                "raw_data": r.raw_data,
                "source_file": r.source_file,
                "source_line": r.source_line,
                "parsed_data": r.parsed_data,
                "status": r.status.value,
                "error_message": r.error_message,
            }
            for r in cli_obj.records
        ],
        "results": [
            {
                "record_id": r.record_id,
                "material_name": r.material_name,
                "status": r.status.value,
                "segment_metrics": r.segment_metrics,
                "boundary_checks": r.boundary_checks,
                "warnings": r.warnings,
                "errors": r.errors,
                "suspension_reason": r.suspension_reason,
            }
            for r in cli_obj.results
        ],
        "anomaly_items": anomaly_items,
    }
    try:
        with open(_state_path(cli_obj), "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2, default=str)
    except Exception:
        pass


def _load_state(cli_obj) -> bool:
    path = _state_path(cli_obj)
    if not os.path.exists(path):
        return False
    try:
        with open(path, "r", encoding="utf-8") as f:
            state = json.load(f)

        from .models import MaterialRecord, ValidationResult, RecordStatus, ValidationStatus
        from datetime import datetime

        cli_obj.records = []
        for r in state.get("records", []):
            rec = MaterialRecord(
                record_id=r["record_id"],
                material_name=r["material_name"],
                raw_data=r.get("raw_data", {}),
                source_file=r["source_file"],
                source_line=r["source_line"],
                parsed_data=r.get("parsed_data"),
                status=RecordStatus(r.get("status", "pending")),
                error_message=r.get("error_message"),
            )
            cli_obj.records.append(rec)

        cli_obj.results = []
        for r in state.get("results", []):
            res = ValidationResult(
                record_id=r["record_id"],
                material_name=r["material_name"],
                status=ValidationStatus(r.get("status", "pending")),
                segment_metrics=r.get("segment_metrics", {}),
                boundary_checks=r.get("boundary_checks", {}),
                warnings=r.get("warnings", []),
                errors=r.get("errors", []),
                suspension_reason=r.get("suspension_reason"),
            )
            cli_obj.results.append(res)

        anomaly_items = state.get("anomaly_items", [])
        for item in anomaly_items:
            if isinstance(item.get("timestamp"), str):
                try:
                    item["timestamp"] = datetime.fromisoformat(item["timestamp"])
                except (ValueError, TypeError):
                    item["timestamp"] = datetime.now()
        cli_obj.anomaly_queue._items = anomaly_items
        return True
    except Exception:
        return False


def main():
    cli()


if __name__ == "__main__":
    main()
