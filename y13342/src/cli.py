import json
import os
import sys
import traceback
from typing import Optional

import click

from .storage import DataStore
from .services import (
    SampleImporter, JudgmentSubmitter, JudgmentComparer, CsvExporter
)

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_PARTIAL = 2


def _store(data_dir: str) -> DataStore:
    return DataStore(data_dir)


def _emit(obj: dict, exit_code: int = EXIT_OK):
    click.echo(json.dumps(obj, ensure_ascii=False, indent=2))
    sys.exit(exit_code)


def _safe_run(fn):
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            tb = traceback.format_exc()
            _emit({
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": tb
            }, EXIT_ERROR)
    wrapper.__name__ = fn.__name__
    wrapper.__doc__ = fn.__doc__
    return wrapper


@click.group()
@click.option("--data-dir",
              default=lambda: os.environ.get("SCHEDULE_JUDGE_DATA",
                                             os.path.join(os.getcwd(), "judge_data")),
              show_default=True,
              help="数据存储根目录，也可用环境变量 SCHEDULE_JUDGE_DATA")
@click.pass_context
def cli(ctx, data_dir):
    """排班推荐人工改判 - 命令行工具

    所有命令执行后会输出一段JSON到stdout，包含success/run_id/error等字段，
    便于值班脚本解析。失败时进程退出码非0。
    """
    ctx.ensure_object(dict)
    ctx.obj["data_dir"] = os.path.abspath(data_dir)


@cli.command("import-samples")
@click.argument("csv_path", type=click.Path(exists=True, dir_okay=False))
@click.option("--id-column", default=None, help="样本ID列名（默认自动识别）")
@click.option("--label-column", default=None, help="模型标签列名（默认自动识别）")
@click.option("--batch-note", default="", help="本次导入的备注，例如'6月第3批'")
@click.pass_context
@_safe_run
def import_samples(ctx, csv_path, id_column, label_column, batch_note):
    """导入样本表CSV，保存快照用于后续引用溯源。"""
    store = _store(ctx.obj["data_dir"])
    svc = SampleImporter(store)
    result = svc.import_csv(
        csv_path=csv_path,
        id_column=id_column,
        label_column=label_column,
        batch_note=batch_note
    )
    result["success"] = True
    code = EXIT_OK
    if result.get("missing_id_rows") or result.get("duplicate_ids"):
        code = EXIT_PARTIAL
    _emit(result, code)


@cli.command("submit")
@click.option("--sample-id", required=True, help="样本ID")
@click.option("--manual-label", required=True, help="人工改判后的标签")
@click.option("--operator", required=True, help="操作人（风控运营老唐等）")
@click.option("--model-version", default="unknown", help="模型版本号，留空=unknown")
@click.option("--original-model-label", default="", help="模型原始标签（留空则从样本表推断）")
@click.option("--note", default="", help="口头说明/备注")
@click.option("--override-reason", default="", help="这次改判覆盖上次的原因")
@click.option("--require-sample-exists/--allow-missing-sample",
              default=True, help="样本不存在时是否拒绝（默认拒绝）")
@click.option("--sample-csv", default=None, type=click.Path(exists=True, dir_okay=False),
              help="关联的样本表CSV路径（仅记录用）")
@click.pass_context
@_safe_run
def submit(ctx, sample_id, manual_label, operator, model_version,
           original_model_label, note, override_reason,
           require_sample_exists, sample_csv):
    """提交一条人工改判。"""
    store = _store(ctx.obj["data_dir"])
    svc = JudgmentSubmitter(store)
    result = svc.submit(
        sample_id=sample_id,
        manual_label=manual_label,
        operator=operator,
        model_version=model_version,
        original_model_label=original_model_label,
        note=note,
        override_reason=override_reason,
        require_sample_exists=require_sample_exists,
        sample_csv_path=sample_csv
    )
    code = EXIT_OK if result["success"] else EXIT_ERROR
    if result.get("warnings") and result["success"]:
        code = EXIT_PARTIAL
    _emit(result, code)


@cli.command("submit-batch")
@click.argument("judgments_csv", type=click.Path(exists=True, dir_okay=False))
@click.option("--operator", required=True, help="操作人")
@click.option("--model-version", default="unknown", help="模型版本号")
@click.option("--sample-id-column", default=None, help="样本ID列名")
@click.option("--manual-label-column", default=None, help="人工改判标签列名")
@click.option("--note-column", default=None, help="备注/口头说明列名")
@click.option("--require-sample-exists/--allow-missing-sample",
              default=True)
@click.option("--sample-csv", default=None,
              type=click.Path(exists=True, dir_okay=False))
@click.pass_context
@_safe_run
def submit_batch(ctx, judgments_csv, operator, model_version,
                 sample_id_column, manual_label_column, note_column,
                 require_sample_exists, sample_csv):
    """从CSV批量提交人工改判。"""
    store = _store(ctx.obj["data_dir"])
    svc = JudgmentSubmitter(store)
    result = svc.submit_batch(
        judgments_csv_path=judgments_csv,
        operator=operator,
        model_version=model_version,
        sample_id_column=sample_id_column,
        manual_label_column=manual_label_column,
        note_column=note_column,
        require_sample_exists=require_sample_exists,
        sample_csv_path=sample_csv
    )
    code = EXIT_OK
    if result["failed"] > 0 and result["success"] > 0:
        code = EXIT_PARTIAL
    elif result["failed"] > 0:
        code = EXIT_ERROR
    result_out = {"success": result["failed"] == 0, **result}
    _emit(result_out, code)


@cli.command("compare")
@click.option("--batch-a", "batch_a", required=True, help="改判批次A（从submit-batch的batch_id取）")
@click.option("--batch-b", "batch_b", required=True, help="改判批次B")
@click.option("--export-csv", "export_csv", default=None,
              type=click.Path(dir_okay=False), help="可选：同时导出对比CSV")
@click.pass_context
@_safe_run
def compare(ctx, batch_a, batch_b, export_csv):
    """对比两次改判批次的差异。"""
    store = _store(ctx.obj["data_dir"])
    cmp = JudgmentComparer(store)
    result = cmp.compare_batches(batch_a, batch_b)
    if export_csv:
        exp = CsvExporter(store)
        exp_result = exp.export_compare(result, export_csv)
        result["export_compare"] = exp_result
    result["success"] = True
    _emit(result, EXIT_OK)


@cli.command("export")
@click.option("--output", "output_path", required=True,
              type=click.Path(dir_okay=False), help="输出CSV路径")
@click.option("--include-history/--only-active", default=False,
              help="是否包含被覆盖的历史改判（默认仅当前有效）")
@click.option("--include-ref-trace/--skip-ref-trace", default=True,
              help="是否包含引用溯源列（默认开启）")
@click.option("--filter-model-version", default=None, help="按模型版本过滤")
@click.option("--filter-operator", default=None, help="按操作人过滤")
@click.pass_context
@_safe_run
def export(ctx, output_path, include_history, include_ref_trace,
           filter_model_version, filter_operator):
    """导出当前有效的人工改判为用于沟通的CSV明细。"""
    store = _store(ctx.obj["data_dir"])
    exp = CsvExporter(store)
    result = exp.export_latest(
        output_path=output_path,
        include_history=include_history,
        include_ref_trace=include_ref_trace,
        filter_model_version=filter_model_version,
        filter_operator=filter_operator
    )
    result["success"] = True
    _emit(result, EXIT_OK)


@cli.command("export-sample-audit")
@click.option("--sample-id", required=True)
@click.option("--output", "output_path", required=True,
              type=click.Path(dir_okay=False))
@click.pass_context
@_safe_run
def export_sample_audit(ctx, sample_id, output_path):
    """导出单个样本的完整审计链（口径变更+改判历史）。"""
    store = _store(ctx.obj["data_dir"])
    exp = CsvExporter(store)
    result = exp.export_sample_audit_trail(sample_id, output_path)
    result["success"] = True
    _emit(result, EXIT_OK)


@cli.command("history")
@click.option("--sample-id", required=True, help="要查看的样本ID")
@click.pass_context
@_safe_run
def history(ctx, sample_id):
    """查看单个样本的完整历史（样本导入链+改判链）。"""
    store = _store(ctx.obj["data_dir"])
    s_hist = store.get_sample_history(sample_id)
    j_hist = store.get_judgments_for_sample(sample_id)
    latest_s = store.get_sample_latest(sample_id)
    latest_j = store.get_latest_judgment(sample_id)
    result = {
        "success": True,
        "sample_id": sample_id,
        "sample_exists": latest_s is not None,
        "sample_imports_count": len(s_hist),
        "judgments_count": len(j_hist),
        "active_judgment": latest_j.to_dict() if latest_j else None,
        "latest_sample_snapshot": latest_s.to_dict() if latest_s else None,
        "sample_import_history": [s.to_dict() for s in s_hist],
        "judgment_history": [j.to_dict() for j in j_hist],
        "missing_refs": [r for r in store.read_missing_refs()
                         if r.get("sample_id") == sample_id]
    }
    _emit(result, EXIT_OK)


@cli.command("list-runs")
@click.option("--limit", default=30, help="列出最近N条")
@click.pass_context
@_safe_run
def list_runs(ctx, limit):
    """列出最近的操作记录，用于值班脚本核对。"""
    store = _store(ctx.obj["data_dir"])
    runs = store.list_runs()[-limit:]
    runs.reverse()
    _emit({
        "success": True,
        "count": len(runs),
        "runs": runs
    }, EXIT_OK)


@cli.command("run-detail")
@click.argument("run_id")
@click.pass_context
@_safe_run
def run_detail(ctx, run_id):
    """查看某条操作记录的详情。"""
    store = _store(ctx.obj["data_dir"])
    r = store.get_run(run_id)
    if r is None:
        _emit({"success": False, "error": f"run不存在: {run_id}"}, EXIT_ERROR)
    _emit({"success": True, "run": r}, EXIT_OK)


@cli.command("missing-refs")
@click.pass_context
@_safe_run
def missing_refs(ctx):
    """列出所有引用缺失的记录。"""
    store = _store(ctx.obj["data_dir"])
    refs = store.read_missing_refs()
    _emit({
        "success": True,
        "count": len(refs),
        "details": refs
    }, EXIT_OK)


@cli.command("stats")
@click.pass_context
@_safe_run
def stats(ctx):
    """查看整体统计。"""
    store = _store(ctx.obj["data_dir"])
    all_js = store.list_all_judgments()
    active_js = store.list_active_judgments()
    sample_idx = store.load_samples_index()
    ops = {}
    mvs = {}
    for j in all_js:
        ops[j.operator] = ops.get(j.operator, 0) + 1
        mvs[j.model_version] = mvs.get(j.model_version, 0) + 1
    overridden = sum(1 for j in all_js if j.is_overridden)
    _emit({
        "success": True,
        "samples_count": len(sample_idx),
        "total_judgments": len(all_js),
        "active_judgments": len(active_js),
        "overridden_judgments": overridden,
        "by_operator": ops,
        "by_model_version": mvs,
        "data_dir": ctx.obj["data_dir"]
    }, EXIT_OK)


def main():
    cli(obj={})


if __name__ == "__main__":
    main()
