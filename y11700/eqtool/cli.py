from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click

from .models import Session, ImportStrategy
from .warnings import WarningCollector, WarningLevel, WarningCategory
from . import loader as _loader
from . import validator as _validator
from . import irt as _irt
from . import equating as _equating
from . import exporter as _exporter
from . import history as _history


@click.group()
@click.version_option(version="0.1.0", prog_name="eqtool")
def cli():
    """考试等值换算工具 - 多试卷原始分等值分批量换算"""
    pass


@cli.command()
@click.option("--input", "-i", "input_path", required=True,
              type=click.Path(exists=True),
              help="数据目录或单个文件路径 (支持 CSV/Excel)")
@click.option("--name", "-n", "name", default="",
              help="会话名称 (便于识别)")
@click.option("--strategy", "-s",
              type=click.Choice(["ignore", "overwrite", "append"], case_sensitive=False),
              default="ignore",
              help="重复数据处理策略: ignore(忽略) / overwrite(覆盖) / append(追加)")
@click.option("--method", "-m",
              type=click.Choice(["auto", "mean_sigma", "linear", "anchor_mean_sigma", "irt_true_score"], case_sensitive=False),
              default="auto",
              help="等值换算方法")
@click.option("--output", "-o", "output_dir", default=".",
              type=click.Path(),
              help="报告输出目录 (默认当前目录)")
@click.option("--min-sample", default=30, type=int,
              help="最小样本量警告阈值 (默认 30)")
@click.option("--no-charts", is_flag=True, default=False,
              help="不生成图表")
def run(input_path: str, name: str, strategy: str, method: str,
        output_dir: str, min_sample: int, no_charts: bool):
    """运行等值换算: 加载数据 → 验证 → 估计 → 换算 → 导出"""
    p = Path(input_path)
    strategy_map = {"ignore": ImportStrategy.IGNORE, "overwrite": ImportStrategy.OVERWRITE, "append": ImportStrategy.APPEND}
    import_strategy = strategy_map.get(strategy, ImportStrategy.IGNORE)
    warnings = WarningCollector()
    session = Session(name=name or p.stem)

    click.echo(f"📂 加载数据: {input_path}")
    if p.is_dir():
        session = _loader.auto_load(str(p), session, import_strategy, warnings)
    else:
        name_lower = p.stem.lower()
        if any(kw in name_lower for kw in ["学生成绩", "student_score", "scores", "成绩"]):
            session = _loader.load_student_scores(str(p), session, import_strategy, warnings=warnings)
        elif any(kw in name_lower for kw in ["试卷版本", "test_form", "forms", "试卷"]):
            session = _loader.load_test_forms(str(p), session, import_strategy, warnings=warnings)
        elif any(kw in name_lower for kw in ["锚题", "anchor_item", "anchors"]):
            session = _loader.load_anchor_items(str(p), session, import_strategy, warnings=warnings)
        elif any(kw in name_lower for kw in ["难度参数", "difficulty_param", "params"]):
            session = _loader.load_difficulty_params(str(p), session, import_strategy, warnings=warnings)
        elif any(kw in name_lower for kw in ["缺考", "absence_mark", "absent"]):
            session = _loader.load_absence_marks(str(p), session, import_strategy, warnings=warnings)
        elif any(kw in name_lower for kw in ["换算报告", "conversion_report", "report"]):
            session = _loader.load_conversion_report(str(p), session, import_strategy, warnings=warnings)
        else:
            session = _loader.load_student_scores(str(p), session, import_strategy, warnings=warnings)
            warnings.add(WarningCategory.OUTLIER, WarningLevel.WARNING,
                        f"文件名无法识别类型，默认按学生成绩处理: {p.name}")

    total_scores = sum(len(v) for v in session.student_scores.values())
    click.echo(f"  学生成绩: {total_scores} 条, 试卷: {len(session.test_forms)} 套, 锚题: {len(session.anchor_items)} 条")

    click.echo("🔍 验证数据...")
    session = _validator.validate_all(session, min_sample=min_sample, warnings=warnings)
    ws = warnings.summary()
    click.echo(f"  警告: {ws['CRITICAL']} 严重, {ws['WARNING']} 警告, {ws['INFO']} 信息")
    if ws["CRITICAL"] > 0:
        click.echo(f"\n⚠  存在严重警告，请检查后继续：")
        for w in warnings.all():
            if w.level == WarningLevel.CRITICAL:
                click.echo(f"  ✖ {w.format()}")

    click.echo("📐 IRT 能力估计...")
    session = _irt.estimate_abilities_two_step(session)
    session = _irt.compute_form_statistics(session)

    click.echo("🔄 等值换算...")
    session = _equating.equate_all(session, method=method)
    session = _equating.apply_equating(session)
    for key, eq in session.equating_results.items():
        click.echo(f"  {eq.reference_form} → {eq.target_form}: 斜率={eq.slope:.4f}, 截距={eq.intercept:.4f} (方法: {eq.method})")

    click.echo("💾 保存会话...")
    _history.save_session(session)
    click.echo(f"  会话ID: {session.session_id}")

    out = Path(output_dir) / f"eqtool_{session.session_id}"
    click.echo(f"📊 导出报告: {out}")
    results = _exporter.export_all(session, str(out))
    for label, path in results.items():
        click.echo(f"  ✓ {label}: {Path(path).name}")
    if not no_charts:
        charts = _exporter.plot_charts(session, str(out / "charts"))
        for label, path in charts.items():
            click.echo(f"  ✓ {label}: {Path(path).name}")

    click.echo(f"\n✅ 完成！会话 {session.session_id} 已保存")
    if ws["CRITICAL"] > 0:
        click.echo(f"⚠  警告: 存在 {ws['CRITICAL']} 条严重问题，请检查导出的警告日志。")


@cli.command(name="list")
def list_cmd():
    """列出所有历史会话"""
    sessions = _history.list_sessions()
    if not sessions:
        click.echo("暂无历史会话。")
        return
    click.echo(f"{'会话ID':<14} {'名称':<20} {'试卷':>4} {'学生':>6} {'修正':>4} {'警告':>4} {'更新时间':<20}")
    click.echo("-" * 78)
    for s in sessions:
        click.echo(
            f"{s['session_id']:<14} {s['name'] or '-':<20} "
            f"{s['test_forms']:>4} {s['student_count']:>6} "
            f"{s['corrections']:>4} {s['warnings']:>4} "
            f"{s['updated_at'][:19]:<20}"
        )


@cli.command()
@click.argument("session_id")
def show(session_id: str):
    """查看会话详情"""
    session = _history.load_session(session_id)
    if not session:
        click.echo(f"会话不存在: {session_id}")
        sys.exit(1)
    info = session.summary()
    click.echo(f"会话ID: {session.session_id}")
    click.echo(f"名称: {session.name}")
    click.echo(f"创建: {session.created_at}")
    click.echo(f"更新: {session.updated_at}")
    click.echo(f"来源文件:")
    for path, stype in session.source_files.items():
        click.echo(f"  [{stype}] {path}")
    click.echo(f"\n试卷版本 ({len(session.test_forms)}):")
    for fid, f in session.test_forms.items():
        click.echo(f"  {fid}: 科目={f.subject or '-'} 题目数={f.total_items} "
                   f"锚题={len(f.anchor_items)} 原始均值={f.raw_mean:.1f}±{f.raw_sd:.1f} "
                   f"样本={f.sample_size}")
    if session.equating_results:
        click.echo(f"\n等值换算结果 ({len(session.equating_results)}):")
        for key, eq in session.equating_results.items():
            click.echo(f"  {eq.reference_form} → {eq.target_form}: "
                       f"斜率={eq.slope:.4f} 截距={eq.intercept:.4f} "
                       f"SE={eq.standard_error:.4f} 方法={eq.method}")
    if session.corrections:
        click.echo(f"\n修正痕迹 ({len(session.corrections)}):")
        for c in session.corrections[:10]:
            click.echo(f"  [{c.correction_type.value}] {c.student_id} {c.test_form}: "
                       f"{c.original_value} → {c.corrected_value} ({c.reason})")
        if len(session.corrections) > 10:
            click.echo(f"  ... 共 {len(session.corrections)} 条")
    if session.warnings:
        critical = sum(1 for w in session.warnings if w.get("级别") == "CRITICAL")
        warning = sum(1 for w in session.warnings if w.get("级别") == "WARNING")
        click.echo(f"\n警告: {critical} 严重, {warning} 警告, 共 {len(session.warnings)} 条")


@cli.command()
@click.argument("session_id")
@click.option("--output", "-o", "output_dir", default=".", type=click.Path(),
              help="导出目录")
@click.option("--no-charts", is_flag=True, default=False, help="不生成图表")
def export(session_id: str, output_dir: str, no_charts: bool):
    """导出已有会话的报告"""
    session = _history.load_session(session_id)
    if not session:
        click.echo(f"会话不存在: {session_id}")
        sys.exit(1)
    out = Path(output_dir) / f"eqtool_{session.session_id}"
    click.echo(f"导出会话 {session.session_id} 到 {out}")
    results = _exporter.export_all(session, str(out))
    for label, path in results.items():
        click.echo(f"  ✓ {label}: {Path(path).name}")
    if not no_charts:
        charts = _exporter.plot_charts(session, str(out / "charts"))
        for label, path in charts.items():
            click.echo(f"  ✓ {label}: {Path(path).name}")
    click.echo("✅ 导出完成！")


@cli.command()
@click.argument("target_id")
@click.argument("source_id")
@click.option("--strategy", "-s",
              type=click.Choice(["ignore", "overwrite", "append"], case_sensitive=False),
              default="append",
              help="合并策略: ignore / overwrite / append (默认 append)")
def merge(target_id: str, source_id: str, strategy: str):
    """合并两个会话 (追加数据)"""
    strategy_map = {"ignore": ImportStrategy.IGNORE, "overwrite": ImportStrategy.OVERWRITE, "append": ImportStrategy.APPEND}
    warnings = WarningCollector()
    result = _history.merge_sessions(target_id, source_id, strategy_map[strategy], warnings)
    if result:
        click.echo(f"✅ 合并完成: {source_id} → {target_id}")
        ws = warnings.summary()
        if ws["TOTAL"] > 0:
            click.echo(f"  警告: {ws['CRITICAL']} 严重, {ws['WARNING']} 警告, {ws['INFO']} 信息")
    else:
        click.echo(f"❌ 合并失败")
        sys.exit(1)


@cli.command(name="delete")
@click.argument("session_id")
@click.confirmation_option(prompt="确认删除此会话？")
def delete_cmd(session_id: str):
    """删除一个历史会话"""
    if _history.delete_session(session_id):
        click.echo(f"已删除: {session_id}")
    else:
        click.echo(f"会话不存在: {session_id}")


@cli.command()
@click.option("--output-dir", "-o", default="sample_data", type=click.Path(),
              help="输出目录")
def demo(output_dir: str):
    """生成示例数据用于测试"""
    import csv
    import random
    from pathlib import Path

    random.seed(42)
    p = Path(output_dir)
    p.mkdir(parents=True, exist_ok=True)

    students_a = [f"S{i:04d}" for i in range(1, 101)]
    students_b = [f"S{i:04d}" for i in range(101, 201)]

    with open(p / "试卷版本.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["试卷ID", "科目", "题目数", "锚题列表", "难度均值", "难度标准差", "原始分均值", "原始分标准差"])
        w.writerow(["A卷", "数学", 50, "Q1,Q2,Q3,Q4,Q5", 0.0, 1.0, 60.0, 15.0])
        w.writerow(["B卷", "数学", 50, "Q1,Q2,Q3,Q4,Q5", 0.3, 1.2, 62.0, 14.0])

    with open(p / "锚题得分.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["题目ID", "试卷版本", "难度", "区分度", "是否锚题", "锚题均分", "锚题标准差", "样本量"])
        for i in range(1, 6):
            w.writerow([f"Q{i}", "A卷", round(random.gauss(0, 1), 2), round(random.uniform(0.8, 1.5), 2),
                        "是", round(random.gauss(0.6, 0.1), 3), 0.15, 100])
            w.writerow([f"Q{i}", "B卷", round(random.gauss(0.3, 1.2), 2), round(random.uniform(0.8, 1.5), 2),
                        "是", round(random.gauss(0.58, 0.1), 3), 0.14, 100])

    with open(p / "难度参数.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["题目ID", "试卷版本", "难度参数b", "区分度参数a", "来源"])
        for i in range(1, 51):
            w.writerow([f"Q{i}", "A卷", round(random.gauss(0, 1), 3), round(random.uniform(0.8, 2.0), 3), "教师标定"])
            w.writerow([f"Q{i}", "B卷", round(random.gauss(0.3, 1.2), 3), round(random.uniform(0.8, 2.0), 3), "教师标定"])

    with open(p / "学生成绩.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["学生ID", "试卷版本", "原始分", "满分", "锚题得分"])
        for sid in students_a:
            raw = max(0, min(100, round(random.gauss(60, 15))))
            anchor = round(min(5.0, raw * 0.05 + random.gauss(0, 0.3)), 2)
            w.writerow([sid, "A卷", raw, 100, anchor])
        for sid in students_b:
            raw = max(0, min(100, round(random.gauss(62, 14))))
            anchor = round(min(5.0, raw * 0.048 + random.gauss(0, 0.3)), 2)
            w.writerow([sid, "B卷", raw, 100, anchor])

    with open(p / "缺考标记.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["学生ID", "试卷版本", "缺考状态", "缺考原因"])
        w.writerow(["S0003", "A卷", "缺考", "病假"])
        w.writerow(["S0007", "A卷", "缺考", "事假"])
        w.writerow(["S0103", "B卷", "缺考", "病假"])
        w.writerow(["S0005", "A卷", "无效", "作弊"])

    click.echo(f"✅ 示例数据已生成到: {p.absolute()}")
    click.echo(f"  运行: eqtool run -i {p.absolute()} -n demo")


def main():
    cli()


if __name__ == "__main__":
    main()