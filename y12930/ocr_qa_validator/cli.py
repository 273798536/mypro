"""CLI 命令行入口 - OCR 文档问答校验工具"""

import os
import sys
import json
from pathlib import Path

import click

from .workflow import ValidationWorkflow
from .examples import seed_demo_data, get_demo_description
from .config import ensure_dirs


def _get_workflow(config_path: str = None) -> ValidationWorkflow:
    """获取工作流实例，带友好错误提示"""
    try:
        return ValidationWorkflow(config_path)
    except FileNotFoundError as e:
        click.echo(f"❌ 错误: {e}", err=True)
        click.echo("   请确保在项目根目录运行，或使用 --config 指定配置文件路径。", err=True)
        sys.exit(1)


@click.group()
@click.option("--config", "-c", type=click.Path(), default=None, help="配置文件路径")
@click.pass_context
def cli(ctx, config):
    """OCR 文档问答校验工具 - AI/ML 工作流工具

    用于 OCR 问答训练样本的质量校验、版本追踪、安全拦截和报告导出。
    """
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config


@cli.command()
@click.option("--output", "-o", is_flag=True, help="输出完整 JSON 结果")
def status(output):
    """查看当前校验状态摘要"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))
    summary = wf.get_status_summary()

    click.echo("📊 OCR 文档问答校验 - 状态摘要")
    click.echo("=" * 50)
    click.echo(f"  总样本数:      {summary['total_samples']}")
    click.echo(f"  已校验样本数:  {summary['validated_count']}")
    click.echo()

    click.echo("  校验状态分布:")
    for status, count in summary.get("status_counts", {}).items():
        status_label = {
            "passed": "✅ 通过",
            "blocked": "🚫 被拦截",
            "needs_review": "⚠️  待复核",
            "pending": "⏳ 待处理",
        }.get(status, status)
        click.echo(f"    {status_label}: {count}")

    click.echo()
    click.echo("  版本记录:")
    versions = summary.get("versions", [])
    if versions:
        for v in versions[:5]:
            click.echo(f"    {v['version_name']} - {v['sample_count']} 条样本 - {v['created_at'][:19]}")
    else:
        click.echo("    暂无版本记录")

    ann = summary.get("annotation_summary", {})
    click.echo()
    click.echo("  标注记录:")
    click.echo(f"    总记录数: {ann.get('total', 0)}")
    click.echo(f"    待处理:   {ann.get('pending', 0)}")
    click.echo(f"    已修正:   {ann.get('corrected', 0)}")

    if output:
        click.echo()
        click.echo(json.dumps(summary, ensure_ascii=False, indent=2))


@cli.command("seed-demo")
def seed_demo():
    """加载演示样例数据（3条：顺利/待确认/坏数据）"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    click.echo("📦 加载演示样例数据...")
    click.echo()

    samples = seed_demo_data(wf.sample_store)

    descriptions = get_demo_description()
    for i, desc in enumerate(descriptions):
        sample = samples[i] if i < len(samples) else None
        click.echo(f"  [{desc['index']}] {desc['type']}")
        click.echo(f"      {desc['description']}")
        for feat in desc["features"]:
            click.echo(f"      • {feat}")
        if sample:
            click.echo(f"      样本ID: {sample.sample_id}")
        click.echo()

    click.echo(f"✅ 已加载 {len(samples)} 条演示样例到样本库")
    click.echo(f"   样本目录: {wf.config['paths']['samples_dir']}")
    click.echo()
    click.echo("   下一步: 运行 'ocr-qa validate' 执行校验")


@cli.command()
@click.option("--version", "-v", "version_name", default=None, help="指定数据集版本")
@click.option("--report/--no-report", default=True, help="是否生成报告")
def validate(version_name, report):
    """执行样本校验（安全拦截 + 状态判定）"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    click.echo("🔍 执行 OCR 文档问答校验...")
    click.echo()

    if version_name:
        results = wf.validate_version(version_name)
        click.echo(f"  校验版本: {version_name}")
    else:
        results = wf.validate_all()
        click.echo("  校验范围: 全部样本")

    click.echo(f"  校验样本数: {len(results)}")
    click.echo()

    status_counts = {}
    for r in results:
        status_counts[r.validation_status] = status_counts.get(r.validation_status, 0) + 1

    click.echo("  校验结果:")
    for status, count in status_counts.items():
        status_label = {
            "passed": "✅ 通过",
            "blocked": "🚫 被拦截",
            "needs_review": "⚠️  待复核",
            "pending": "⏳ 待处理",
        }.get(status, status)
        click.echo(f"    {status_label}: {count}")

    click.echo()

    for r in results:
        sample = wf.sample_store.load(r.sample_id)
        if not sample:
            continue

        status_emoji = {
            "passed": "✅",
            "blocked": "🚫",
            "needs_review": "⚠️ ",
            "pending": "⏳",
        }.get(r.validation_status, "❓")

        status_label = {
            "passed": "通过",
            "blocked": "拦截",
            "needs_review": "待复核",
            "pending": "待处理",
        }.get(r.validation_status, r.validation_status)

        q_preview = sample.question[:30] + "..." if len(sample.question) > 30 else sample.question
        click.echo(f"  {status_emoji} [{status_label}] {q_preview}")
        if r.safety_check.blocked_reasons:
            for reason in r.safety_check.blocked_reasons[:2]:
                click.echo(f"      ↳ {reason}")

    click.echo()

    if report:
        pipeline_result = wf.run_full_pipeline(version_name)
        report_path = pipeline_result["report_path"]
        click.echo(f"📄 报告已生成: {report_path}")

        biases = pipeline_result.get("biases", [])
        if biases:
            click.echo()
            click.echo("⚠️  偏科检测提示:")
            for bias in biases[:3]:
                tag = "需复核" if bias["needs_kr_review"] else "可用"
                click.echo(f"  • [{tag}] {bias['dimension']}: {bias['group']} - 偏差 {bias['deviation']}")

    click.echo()
    click.echo("✅ 校验完成")


@cli.group()
def version():
    """版本管理 - 创建、查看、对比数据集版本"""
    pass


@version.command("list")
def version_list():
    """列出所有版本"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))
    versions = wf.version_tracker.list_versions()

    click.echo("📚 数据集版本列表")
    click.echo("=" * 50)

    if not versions:
        click.echo("  暂无版本记录")
        return

    for i, v in enumerate(versions):
        marker = " 👈 最新" if i == 0 else ""
        click.echo(f"  {v['version_name']}{marker}")
        click.echo(f"    样本数: {v['sample_count']}")
        click.echo(f"    创建时间: {v['created_at'][:19]}")
        if v.get("description"):
            click.echo(f"    描述: {v['description']}")
        click.echo()


@version.command("create")
@click.argument("version_name")
@click.option("--description", "-d", default="", help="版本描述")
@click.option("--from-samples", is_flag=True, help="从当前所有样本创建")
def version_create(version_name, description, from_samples):
    """创建新版本

    VERSION_NAME: 版本名称，如 v1.0
    """
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    if from_samples:
        version = wf.version_tracker.create_version(
            version_name=version_name,
            description=description,
        )
    else:
        samples = wf.sample_store.list_all()
        version = wf.version_tracker.create_version(
            version_name=version_name,
            description=description,
            samples=samples,
        )

    click.echo(f"✅ 已创建版本: {version.version_name}")
    click.echo(f"   版本ID: {version.version_id}")
    click.echo(f"   样本数: {version.sample_count}")
    click.echo(f"   描述: {version.description or '无'}")


@version.command("diff")
@click.argument("version_a")
@click.argument("version_b")
def version_diff(version_a, version_b):
    """对比两个版本的差异"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    diff = wf.version_tracker.diff_versions(version_a, version_b)

    click.echo(f"🔄 版本对比: {version_a} → {version_b}")
    click.echo("=" * 50)
    click.echo(f"  新增样本: {len(diff['added'])} 条")
    click.echo(f"  删除样本: {len(diff['removed'])} 条")
    click.echo(f"  共有样本: {len(diff['common'])} 条")


@cli.group()
def annotation():
    """标注管理 - 人工修正、复核、审批"""
    pass


@annotation.command("list")
@click.option("--status", "-s", default=None, help="按状态筛选")
def annotation_list(status):
    """列出标注记录"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    if status:
        annotations = wf.correction.list_by_status(status)
    else:
        annotations = wf.annotation_store.list_all()

    click.echo(f"📝 标注记录（共 {len(annotations)} 条）")
    click.echo("=" * 50)

    for ann in annotations[:20]:
        status_label = {
            "pending": "⏳ 待处理",
            "approved": "✅ 已通过",
            "rejected": "❌ 已拒绝",
            "needs_review": "⚠️  待复核",
            "corrected": "✏️  已修正",
        }.get(ann.status, ann.status)

        click.echo(f"  [{ann.annotation_id}] {status_label}")
        click.echo(f"      样本ID: {ann.sample_id}")
        click.echo(f"      标注人: {ann.annotator}")
        click.echo(f"      时间: {ann.created_at[:19]}")
        if ann.comment:
            click.echo(f"      备注: {ann.comment[:50]}")
        click.echo()


@annotation.command("add")
@click.argument("sample_id")
@click.option("--annotator", "-a", required=True, help="标注人")
@click.option("--answer", default=None, help="修正后的答案")
@click.option("--question", default=None, help="修正后的问题")
@click.option("--status", "-s", default="pending", help="状态")
@click.option("--comment", "-m", default="", help="备注")
def annotation_add(sample_id, annotator, answer, question, status, comment):
    """添加标注/修正记录"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    sample = wf.sample_store.load(sample_id)
    if not sample:
        click.echo(f"❌ 样本不存在: {sample_id}", err=True)
        sys.exit(1)

    annotation = wf.correction.create_annotation(
        sample_id=sample_id,
        annotator=annotator,
        question_corrected=question,
        answer_corrected=answer,
        status=status,
        comment=comment,
    )

    click.echo(f"✅ 已创建标注记录: {annotation.annotation_id}")
    click.echo(f"   状态: {annotation.status}")


@annotation.command("apply")
@click.argument("annotation_id")
def annotation_apply(annotation_id):
    """应用修正到原始样本"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    sample = wf.correction.apply_correction(annotation_id)
    if not sample:
        click.echo(f"❌ 标注记录不存在: {annotation_id}", err=True)
        sys.exit(1)

    click.echo(f"✅ 修正已应用到样本: {sample.sample_id}")


@cli.command()
@click.option("--version", "-v", "version_name", default=None, help="指定数据集版本")
def report(version_name):
    """生成校验报告（HTML）"""
    wf = _get_workflow(click.get_current_context().obj.get("config_path"))

    click.echo("📄 生成校验报告...")

    result = wf.run_full_pipeline(version_name)
    report_path = result["report_path"]

    click.echo(f"✅ 报告已生成: {report_path}")
    click.echo()

    overall = result["overall"]
    click.echo("  整体指标:")
    click.echo(f"    总样本数: {overall['total']}")
    click.echo(f"    通过率: {overall['pass_rate']}")
    click.echo(f"    待复核率: {overall.get('review_rate', 'N/A')}")
    click.echo(f"    拦截率: {overall.get('block_rate', 'N/A')}")

    biases = result.get("biases", [])
    if biases:
        click.echo()
        click.echo("  ⚠️  偏科检测:")
        for bias in biases:
            tag = "需知识库运营复核" if bias["needs_kr_review"] else "可直接使用"
            click.echo(f"    • {bias['dimension']}/{bias['group']}: {bias['deviation']} ({tag})")


@cli.command()
def init():
    """初始化项目目录结构"""
    config = _load_default_config()
    ensure_dirs(config)

    click.echo("📁 初始化项目目录...")
    for key, path in config["paths"].items():
        click.echo(f"  ✓ {path}/")
    click.echo()
    click.echo("✅ 目录初始化完成")
    click.echo()
    click.echo("   下一步:")
    click.echo("     1. 运行 'ocr-qa seed-demo' 加载演示数据")
    click.echo("     2. 运行 'ocr-qa validate' 执行校验")
    click.echo("     3. 运行 'ocr-qa report' 查看报告")


def _load_default_config():
    """加载默认配置（用于 init 命令）"""
    from .config import load_config
    return load_config()


def main():
    """入口函数"""
    cli(obj={})


if __name__ == "__main__":
    main()
