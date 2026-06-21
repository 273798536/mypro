import json
import sys
from pathlib import Path

import click

from topo_error_tracker.audit import AuditManager
from topo_error_tracker.report import ReportGenerator
from topo_error_tracker.store import Store
from topo_error_tracker.tracker import TopologyTracker
from topo_error_tracker.workflow import WorkflowManager, WorkflowStepOrderError

_DB_OPTION = click.option(
    "--db",
    envvar="TOPO_DB",
    default="topo_tracker.db",
    help="SQLite 数据库路径",
)
_DRAFTS_OPTION = click.option(
    "--drafts-dir",
    envvar="TOPO_DRAFTS",
    default="drafts",
    help="草稿 JSON 目录",
)


def _make_store(db: str, drafts_dir: str) -> Store:
    return Store(db_path=db, drafts_dir=drafts_dir)


@click.group()
@click.version_option("0.1.0")
def cli():
    """拓扑路径错因追踪工具——面向数学教学"""
    pass


@cli.command("import")
@click.argument("json_path", type=click.Path(exists=True))
@click.option("--batch-id", required=True, help="批次标识")
@click.option("--source-label", default=None, help="来源标签")
@click.option("--operator", default=None, help="操作人")
@_DB_OPTION
@_DRAFTS_OPTION
def import_materials(json_path, batch_id, source_label, operator, db, drafts_dir):
    """导入分批材料，保留原始说法和导入时间"""
    store = _make_store(db, drafts_dir)
    try:
        materials = store.import_batch_from_json(json_path, batch_id, source_label)
        wf = WorkflowManager(store)
        wf.complete_import_step(batch_id, operator)
        click.echo(f"✓ 导入完成：批次 {batch_id}，共 {len(materials)} 条材料")
        for m in materials:
            click.echo(f"  - {m.id}: {m.original_text[:60]}...")
    finally:
        store.close()


@cli.command("annotate")
@click.argument("material_id")
@click.option("--field", required=True, help="修改的字段名")
@click.option("--old-value", required=True, help="旧值")
@click.option("--new-value", required=True, help="新值")
@click.option("--editor", required=True, help="编辑人")
@click.option("--reason", required=True, help="改动原因")
@click.option("--batch-id", default=None, help="批次标识（完成备注步骤时需要）")
@click.option("--operator", default=None, help="操作人")
@_DB_OPTION
@_DRAFTS_OPTION
def annotate(material_id, field, old_value, new_value, editor, reason, batch_id, operator, db, drafts_dir):
    """为材料补充备注/人工改动"""
    store = _make_store(db, drafts_dir)
    try:
        wf = WorkflowManager(store)
        edit = wf.add_annotation(material_id, field, old_value, new_value, editor, reason)
        click.echo(f"✓ 备注已添加：{edit.id}")
        if batch_id:
            try:
                wf.complete_annotate_step(batch_id, operator)
                click.echo(f"✓ 批次 {batch_id} 备注步骤已完成")
            except WorkflowStepOrderError as e:
                click.echo(f"⚠ {e}", err=True)
    finally:
        store.close()


@cli.command("track")
@click.argument("material_id")
@_DB_OPTION
@_DRAFTS_OPTION
def track(material_id, db, drafts_dir):
    """执行拓扑路径错因追踪"""
    store = _make_store(db, drafts_dir)
    try:
        material = store.get_material(material_id)
        if material is None:
            click.echo(f"✗ 材料 {material_id} 不存在", err=True)
            sys.exit(1)
        tracker = TopologyTracker(store)
        result = tracker.track(material)
        click.echo(f"✓ 追踪完成：{result.path_id}")
        click.echo(f"  错因节点数：{len(result.error_nodes)}")
        click.echo(f"  综合解释：{result.explanation}")
        if result.anomalous_samples:
            click.echo(f"  异常样本：{len(result.anomalous_samples)} 条")
            for s in result.anomalous_samples:
                click.echo(f"    - {s}")
    finally:
        store.close()


@cli.command("report")
@click.argument("material_id")
@click.option("--output", "-o", default=None, help="输出 Markdown 文件路径")
@_DB_OPTION
@_DRAFTS_OPTION
def report(material_id, output, db, drafts_dir):
    """生成 Markdown 报告（含 LaTeX 公式、反例、单位换算、异常样本）"""
    store = _make_store(db, drafts_dir)
    try:
        gen = ReportGenerator(store)
        if output:
            path = gen.write_report(material_id, output)
            click.echo(f"✓ 报告已写入：{path}")
        else:
            content = gen.generate(material_id)
            click.echo(content)
    finally:
        store.close()


@cli.command("review")
@click.argument("material_id")
@click.option("--reviewer", required=True, help="复核人")
@click.option("--approve/--reject", required=True, help="通过或拒绝")
@click.option("--reason", required=True, help="复核原因")
@click.option("--extrapolation", is_flag=True, default=False, help="是否涉及外推越界")
@_DB_OPTION
@_DRAFTS_OPTION
def review(material_id, reviewer, approve, reason, extrapolation, db, drafts_dir):
    """复核材料，记录上一次处理人和未通过原因"""
    store = _make_store(db, drafts_dir)
    try:
        audit = AuditManager(store)
        context = audit.get_review_context(material_id)
        if context.get("previous_reviewer"):
            click.echo(f"  上次处理人：{context['previous_reviewer']}")
            click.echo(f"  上次原因：{context['previous_reason']}")
            click.echo(f"  上次结果：{'通过' if context['previous_approved'] else '未通过'}")

        decision = audit.submit_review(
            material_id, reviewer, approve, reason, extrapolation
        )
        status = "✅ 通过" if approve else "❌ 未通过"
        click.echo(f"✓ 复核完成：{status}")
        click.echo(f"  复核人：{decision.reviewer}")
        click.echo(f"  原因：{decision.reason}")
        if decision.previous_reviewer:
            click.echo(f"  上一次处理人：{decision.previous_reviewer}")
            click.echo(f"  上一次未通过原因：{decision.previous_reason}")
        if extrapolation and not approve:
            click.echo(f"  ⚠️ 触发规则：外推越界复核规则——复核人必须能看到上一次处理人和未通过原因")
    finally:
        store.close()


@cli.command("export")
@click.option("--batch-id", required=True, help="批次标识")
@click.option("--operator", default=None, help="操作人")
@_DB_OPTION
@_DRAFTS_OPTION
def export_batch(batch_id, operator, db, drafts_dir):
    """导出同步校验：检查导出内容是否与标注/编辑同步"""
    store = _make_store(db, drafts_dir)
    try:
        wf = WorkflowManager(store)
        try:
            snapshots = wf.check_export_sync(batch_id, operator)
        except WorkflowStepOrderError as e:
            click.echo(f"✗ {e}", err=True)
            sys.exit(1)

        click.echo(f"✓ 导出同步校验完成：批次 {batch_id}")
        synced_count = sum(1 for s in snapshots if s.synced)
        click.echo(f"  同步：{synced_count}/{len(snapshots)}")
        for s in snapshots:
            status = "✅" if s.synced else "❌"
            click.echo(f"  {status} {s.material_id} (hash={s.content_hash})")
            if s.sync_details:
                click.echo(f"     {s.sync_details}")
    finally:
        store.close()


@cli.command("status")
@click.option("--batch-id", default=None, help="批次标识")
@_DB_OPTION
@_DRAFTS_OPTION
def status(batch_id, db, drafts_dir):
    """查看批次或材料状态"""
    store = _make_store(db, drafts_dir)
    try:
        if batch_id:
            wf = WorkflowManager(store)
            info = wf.get_batch_status(batch_id)
            click.echo(f"批次：{batch_id}")
            for step_name, step_info in info["steps"].items():
                done = "✅" if step_info["completed"] else "⬜"
                click.echo(f"  {done} {step_name} ({step_info['timestamp'] or '未开始'})")
            click.echo(f"材料数：{info['material_count']}")
        else:
            materials = store.list_materials()
            if not materials:
                click.echo("暂无材料")
                return
            for m in materials:
                click.echo(f"  {m.id} [{m.status.value}] {m.batch_id} — {m.original_text[:50]}")
    finally:
        store.close()


if __name__ == "__main__":
    cli()
