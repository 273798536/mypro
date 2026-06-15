import click
from pathlib import Path
from typing import Optional
from .archiver import process_lesson_list
from .exporter import export_result
from .models import ArchiveResult


def print_summary(result: ArchiveResult) -> None:
    click.echo("")
    click.echo("=" * 50)
    click.echo("琴房课时清单归档 - 处理报告")
    click.echo("=" * 50)
    click.echo(f"已处理行:    {result.total_processed}")
    click.echo(f"坏行:        {result.total_bad}  (数据缺失或格式错误)")
    click.echo(f"跳过行:      {result.total_skipped}  (主动标记作废/取消)")
    click.echo(f"旧版母带:    {result.total_old_master}  (已标记)")
    click.echo(f"音频已匹配:  {result.total_with_audio}")
    click.echo("-" * 50)
    click.echo(f"原始记录总数: {len(result.records)}")
    click.echo(f"最终归档数:   {len(result.final_records)}")
    click.echo("=" * 50)


def print_details(result: ArchiveResult, show_all: bool = False) -> None:
    click.echo("\n--- 坏行明细 ---")
    for r in result.records:
        if r.is_bad_row:
            click.echo(f"  行{r.line_number}: {r.bad_reason} | 原始: {r.raw}")

    click.echo("\n--- 跳过行明细 ---")
    for r in result.records:
        if r.is_skipped and not r.is_bad_row:
            click.echo(f"  行{r.line_number}: {r.skip_reason} | {r.raw.get('学生姓名', '')}")

    click.echo("\n--- 旧版母带标记 ---")
    for r in result.records:
        if r.is_old_master:
            tag = "坏行" if r.is_bad_row else ("跳过" if r.is_skipped else "正常")
            click.echo(f"  行{r.line_number} [{tag}]: {r.raw.get('学生姓名', '')} {r.raw.get('上课日期', '')}")

    if show_all:
        click.echo("\n--- 学生进度备注 (老师关心的) ---")
        for r in result.final_records:
            if r.progress_notes:
                click.echo(f"  {r.raw.get('学生姓名', '')}: {r.progress_notes}")
            if r.audio_file:
                click.echo(f"    音频: {Path(r.audio_file).name}")


@click.group()
def cli():
    """琴房课时清单归档工具"""
    pass


@cli.command()
@click.argument("lesson_file", type=click.Path(exists=True, path_type=Path))
@click.option("--audio-dir", "-a", type=click.Path(exists=True, path_type=Path), help="音频文件夹")
@click.option("--tracklist", "-t", type=click.Path(exists=True, path_type=Path), help="曲目表文件")
@click.option("--auth-note", "-n", default="", help="授权备注")
@click.option("--output-dir", "-o", type=click.Path(path_type=Path), default=Path("./archive_output"), help="输出目录")
@click.option("--show-all", is_flag=True, help="显示所有详情")
def archive(lesson_file: Path, audio_dir: Optional[Path], tracklist: Optional[Path],
            auth_note: str, output_dir: Path, show_all: bool):
    """执行归档流程"""
    result = process_lesson_list(lesson_file, audio_dir, tracklist, auth_note=auth_note)
    print_summary(result)
    print_details(result, show_all)

    paths = export_result(result, output_dir)
    click.echo(f"\n导出文件已保存到: {output_dir}")
    for k, v in paths.items():
        click.echo(f"  {k}: {Path(v).name}")

    if auth_note:
        click.echo(f"\n授权备注已关联: {auth_note}")
        if result.final_records:
            first = result.final_records[0]
            click.echo(f"对齐验证: 文件={Path(first.source_file).name}, 曲目表={len(result.tracklist_records)}条, 最终清单={len(result.final_records)}条")


@cli.command("list")
@click.argument("lesson_file", type=click.Path(exists=True, path_type=Path))
@click.option("--filter", "-f", "filter_type", type=click.Choice(["all", "bad", "skipped", "old_master", "final"]),
              default="all", help="筛选类型")
@click.option("--tracklist", "-t", type=click.Path(exists=True, path_type=Path), help="曲目表文件")
def list_records(lesson_file: Path, filter_type: str, tracklist: Optional[Path]):
    """查看记录（可筛选）"""
    result = process_lesson_list(lesson_file, None, tracklist)

    if filter_type == "bad":
        records = [r for r in result.records if r.is_bad_row]
    elif filter_type == "skipped":
        records = [r for r in result.records if r.is_skipped and not r.is_bad_row]
    elif filter_type == "old_master":
        records = [r for r in result.records if r.is_old_master]
    elif filter_type == "final":
        records = result.final_records
    else:
        records = result.records

    click.echo(f"\n共 {len(records)} 条记录 [{filter_type}]")
    for r in records:
        flags = []
        if r.is_bad_row:
            flags.append(click.style("坏行", fg="red"))
        if r.is_skipped:
            flags.append(click.style("跳过", fg="yellow"))
        if r.is_old_master:
            flags.append(click.style("旧版母带", fg="magenta"))
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        click.echo(f"  行{r.line_number}{flag_str}: {r.raw.get('学生姓名', '')} {r.raw.get('上课日期', '')}")
        if r.progress_notes:
            click.echo(f"    进度: {r.progress_notes}")
        if r.audio_file:
            click.echo(f"    音频: {Path(r.audio_file).name}")


@cli.command()
@click.argument("lesson_file", type=click.Path(exists=True, path_type=Path))
@click.option("--output-dir", "-o", type=click.Path(path_type=Path), default=Path("./archive_output"))
@click.option("--audio-dir", "-a", type=click.Path(exists=True, path_type=Path))
@click.option("--tracklist", "-t", type=click.Path(exists=True, path_type=Path))
@click.option("--auth-note", "-n", default="")
def export(lesson_file: Path, output_dir: Path, audio_dir: Optional[Path],
           tracklist: Optional[Path], auth_note: str):
    """导出带标记的归档文件"""
    result = process_lesson_list(lesson_file, audio_dir, tracklist, auth_note=auth_note)
    paths = export_result(result, output_dir)
    click.echo("导出完成:")
    for k, v in paths.items():
        click.echo(f"  {k}: {v}")


if __name__ == "__main__":
    cli()
