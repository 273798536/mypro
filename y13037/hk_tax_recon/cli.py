import os
import sys
import click
from datetime import datetime

from .models.recon import ReconBatch
from .loaders.table_loader import load_emails, load_tax_records, load_eml_file
from .core.reconcile import run_reconciliation
from .reports.markdown_report import generate_markdown_report
from .examples.sample_data import generate_sample_data


@click.group(help="港股通税费口径对账工具")
def cli():
    pass


@cli.command("sample", help="生成样例数据到指定目录")
@click.option("--out-dir", "-o", default="./data", show_default=True, help="样例数据输出目录")
def cmd_sample(out_dir):
    paths = generate_sample_data(out_dir)
    click.echo(f"✅ 样例数据已生成：")
    click.echo(f"   审批邮件：{paths['emails']}")
    click.echo(f"   税费明细：{paths['tax']}")
    click.echo("")
    click.echo(f"下一步：python -m hk_tax_recon.cli run --batch-id BATCH-001 "
               f"--emails {paths['emails']} --tax {paths['tax']} --out ./reports")


@cli.command("run", help="运行一轮对账（首轮或追加新数据）")
@click.option("--batch-id", required=True, help="批次号，如 BATCH-001")
@click.option("--emails", "emails_paths", multiple=True, type=click.Path(exists=True),
              help="审批邮件文件（.xlsx/.csv/.eml），可多次指定")
@click.option("--tax", "tax_paths", multiple=True, type=click.Path(exists=True),
              help="税费明细文件（.xlsx/.csv），可多次指定")
@click.option("--out", "-o", default="./reports", show_default=True, help="报告与批次数据输出目录")
@click.option("--filter", "filter_text", default="", help="筛选口径说明（会写进报告）")
@click.option("--run-date", default=None, help="运行日期 YYYY-MM-DD，默认今天，用于判断凭证晚到")
@click.option("--remark", default=None, help="本轮运行备注")
def cmd_run(batch_id, emails_paths, tax_paths, out, filter_text, run_date, remark):
    os.makedirs(out, exist_ok=True)
    batch = ReconBatch(batch_id=batch_id)
    if filter_text:
        batch.filter_criteria["筛选说明"] = filter_text

    for p in emails_paths:
        if p.lower().endswith(".eml"):
            emails, fmap = load_eml_file(p, batch_id=batch_id)
        else:
            emails, fmap = load_emails(p, batch_id=batch_id)
        batch.emails.extend(emails)
        click.echo(f"📧 加载邮件 {os.path.basename(p)}：{len(emails)} 条")

    for p in tax_paths:
        records, fmap = load_tax_records(p, batch_id=batch_id)
        batch.tax_records.extend(records)
        click.echo(f"📊 加载税费 {os.path.basename(p)}：{len(records)} 条")

    if not batch.emails and not batch.tax_records:
        click.echo("❌ 未加载到任何数据，请检查文件路径")
        sys.exit(1)

    batch = run_reconciliation(batch, run_date=run_date, extra_remark=remark)
    batch_path = os.path.join(out, f"{batch_id}.json")
    batch.save(batch_path)
    report_path = os.path.join(out, f"{batch_id}.md")
    generate_markdown_report(batch, report_path)

    _print_summary(batch)
    click.echo("")
    click.echo(f"📄 报告：{report_path}")
    click.echo(f"💾 批次数据：{batch_path}")
    click.echo("")
    click.echo(f"重跑：python -m hk_tax_recon.cli rerun --batch-json {batch_path} --out {out}")


@cli.command("rerun", help="基于已有批次 JSON 重跑，保留历史对比")
@click.option("--batch-json", required=True, type=click.Path(exists=True), help="上一轮生成的批次 JSON 文件")
@click.option("--emails", "emails_paths", multiple=True, type=click.Path(exists=True),
              help="追加审批邮件文件（可选）")
@click.option("--tax", "tax_paths", multiple=True, type=click.Path(exists=True),
              help="追加税费明细文件（可选）")
@click.option("--out", "-o", default="./reports", show_default=True, help="报告输出目录")
@click.option("--run-date", default=None, help="运行日期 YYYY-MM-DD，默认今天")
@click.option("--remark", default=None, help="本轮备注（会写进报告）")
@click.option("--filter", "filter_text", default=None, help="更新筛选口径说明")
def cmd_rerun(batch_json, emails_paths, tax_paths, out, run_date, remark, filter_text):
    os.makedirs(out, exist_ok=True)
    batch = ReconBatch.load(batch_json)

    for p in emails_paths:
        if p.lower().endswith(".eml"):
            emails, fmap = load_eml_file(p, batch_id=batch.batch_id)
        else:
            emails, fmap = load_emails(p, batch_id=batch.batch_id)
        batch.emails.extend(emails)
        click.echo(f"📧 追加邮件 {os.path.basename(p)}：{len(emails)} 条")

    for p in tax_paths:
        records, fmap = load_tax_records(p, batch_id=batch.batch_id)
        batch.tax_records.extend(records)
        click.echo(f"📊 追加税费 {os.path.basename(p)}：{len(records)} 条")

    if filter_text:
        batch.filter_criteria["筛选说明"] = filter_text

    batch = run_reconciliation(batch, run_date=run_date, extra_remark=remark)

    batch_id = batch.batch_id
    batch_path = os.path.join(out, f"{batch_id}.json")
    batch.save(batch_path)
    report_path = os.path.join(out, f"{batch_id}.md")
    generate_markdown_report(batch, report_path)

    _print_summary(batch)
    click.echo("")
    click.echo(f"📄 报告：{report_path}")
    click.echo(f"💾 批次数据：{batch_path}")


@cli.command("report", help="根据已有的批次 JSON 重新生成/查看 Markdown 报告")
@click.option("--batch-json", required=True, type=click.Path(exists=True), help="批次 JSON 文件")
@click.option("--out", "-o", default="./reports", show_default=True, help="报告输出目录")
@click.option("--open", "do_open", is_flag=True, help="生成后尝试打开报告")
def cmd_report(batch_json, out, do_open):
    os.makedirs(out, exist_ok=True)
    batch = ReconBatch.load(batch_json)
    report_path = os.path.join(out, f"{batch.batch_id}.md")
    generate_markdown_report(batch, report_path)
    click.echo(f"📄 报告已生成：{report_path}")
    _print_summary(batch)
    if do_open:
        try:
            click.launch(report_path)
        except Exception:
            pass


def _print_summary(batch: ReconBatch):
    summary = batch.status_summary()
    click.echo("")
    click.echo(f"===== 对账批次 {batch.batch_id} · 第 {batch.run_count} 轮 =====")
    for k, v in summary.items():
        click.echo(f"  {k}: {v}")
    click.echo(f"  邮件 {len(batch.emails)} 条 ｜ 税费 {len(batch.tax_records)} 条 ｜ 对账条目 {len(batch.items)} 条")


if __name__ == "__main__":
    cli()
