import os
import sys
from datetime import datetime
from typing import Optional

import click
from tabulate import tabulate

from .deduplicator import AudioDeduplicator, DedupResult, DuplicateType, ConfirmStatus
from .reference_tracker import ReferenceTracker
from . import reporter


pass_context = click.make_pass_decorator(dict, ensure=True)


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='显示详细输出')
@click.option('--output-dir', '-o', default='./dedup_output', help='输出目录')
@pass_context
def cli(ctx, verbose, output_dir):
    """音频素材去重CLI工具 - 基于音频指纹的重复检测与引用追踪"""
    ctx['verbose'] = verbose
    ctx['output_dir'] = output_dir
    ctx['deduplicator'] = AudioDeduplicator()
    ctx['tracker'] = ReferenceTracker()
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)


@cli.command()
@click.argument('path', type=click.Path(exists=True))
@click.option('--recursive', '-r', is_flag=True, help='递归扫描子目录')
@click.option('--save-fingerprints', '-s', is_flag=True, help='保存指纹到文件')
@pass_context
def scan(ctx, path, recursive, save_fingerprints):
    """扫描音频文件并提取指纹
    
    PATH: 音频文件或目录路径
    """
    dedup = ctx['deduplicator']
    verbose = ctx['verbose']
    
    click.echo(f"正在扫描: {path}")
    
    if os.path.isfile(path):
        fp = dedup.add_file(path)
        if fp:
            click.echo(f"已处理: {fp.file_name} ({fp.duration:.2f}秒)")
        else:
            click.echo(f"处理失败: {path}")
    else:
        fingerprints = dedup.scan_directory(path)
        click.echo(f"共扫描 {len(fingerprints)} 个音频文件")
        
        if verbose:
            for fp in fingerprints:
                click.echo(f"  - {fp.file_name}: {fp.duration:.2f}秒, MD5: {fp.hash_str[:16]}...")
    
    if save_fingerprints:
        output_path = os.path.join(ctx['output_dir'], 'fingerprints.json')
        reporter.save_fingerprints(dedup.fingerprints, output_path)
        click.echo(f"指纹已保存到: {output_path}")
    
    ctx['fingerprints'] = dedup.fingerprints


@cli.command('import-tags')
@click.argument('tag_file', type=click.Path(exists=True))
@pass_context
def import_tags(ctx, tag_file):
    """从标签表导入音频元数据
    
    TAG_FILE: 标签文件路径 (JSON/YAML)
    """
    tracker = ctx['tracker']
    
    click.echo(f"正在导入标签: {tag_file}")
    refs = tracker.import_tag_table(tag_file)
    click.echo(f"成功导入 {len(refs)} 条标签记录")


@cli.command('scan-project')
@click.argument('project_dir', type=click.Path(exists=True))
@pass_context
def scan_project(ctx, project_dir):
    """扫描项目目录中的音频引用
    
    PROJECT_DIR: 项目代码目录
    """
    tracker = ctx['tracker']
    
    click.echo(f"正在扫描项目: {project_dir}")
    refs = tracker.scan_project_directory(project_dir)
    click.echo(f"发现 {len(refs)} 个音频引用")
    
    unused = tracker.get_unused_files()
    if unused:
        click.echo(f"警告: 发现 {len(unused)} 个未使用的音频文件")


@cli.command()
@pass_context
def check(ctx):
    """检测重复音频"""
    dedup = ctx['deduplicator']
    verbose = ctx['verbose']
    
    if not dedup.fingerprints:
        click.echo("错误: 请先运行 'scan' 命令扫描音频文件")
        return
    
    click.echo("正在检测重复音频...")
    result = dedup.find_duplicates()
    ctx['result'] = result
    
    stats = dedup.get_statistics(result)
    
    click.echo("\n" + "=" * 60)
    click.echo("重复检测统计")
    click.echo("=" * 60)
    click.echo(f"总文件数: {stats['total_files']}")
    click.echo(f"唯一文件: {stats['unique_files']}")
    click.echo(f"精确重复: {stats['exact_duplicates']}")
    click.echo(f"近重复: {stats['near_duplicates']}")
    click.echo(f"变速版本: {stats['speed_variations']}")
    click.echo(f"同名异声: {stats['same_name_different']}")
    click.echo(f"短音待确认: {stats['short_audio_candidates']}")
    click.echo("=" * 60)
    
    _show_duplicate_details(result, verbose)


def _show_duplicate_details(result: DedupResult, verbose: bool):
    def show_matches(matches, title, show_next_action=True):
        if not matches:
            return
        
        click.echo(f"\n{title}:")
        click.echo("-" * 60)
        
        for i, match in enumerate(matches, 1):
            fp1, fp2 = match.fingerprint1, match.fingerprint2
            click.echo(f"\n[{i}] {fp1.file_name} <-> {fp2.file_name}")
            click.echo(f"    相似度: {match.similarity:.2%}")
            if match.speed_ratio:
                click.echo(f"    变速比: {match.speed_ratio:.2f}x")
            if match.notes:
                click.echo(f"    说明: {match.notes}")
            if match.confirm_status == ConfirmStatus.PENDING:
                click.echo(f"    状态: 待确认")
            elif match.confirm_status == ConfirmStatus.AUTO_CONFIRMED:
                click.echo(f"    状态: 自动确认")
            
            if show_next_action:
                click.echo(f"    下一步: {match.get_next_action()}")
    
    show_matches(result.exact_duplicates, "精确重复 (可自动处理)")
    show_matches(result.near_duplicates, "近重复 (需要人工确认)")
    show_matches(result.speed_variations, "变速版本 (需要声音设计师确认)")
    show_matches(result.same_name_different, "同名异声 (需要策划核对)")
    show_matches(result.short_audio_candidates, "短音频待确认 (建议试听)")


@cli.command('add-usage')
@click.argument('file_path')
@click.argument('used_by')
@click.option('--user', '-u', default='system', help='操作人')
@pass_context
def add_usage(ctx, file_path, used_by, user):
    """补录音频使用记录
    
    FILE_PATH: 音频文件路径
    USED_BY: 使用者/场景
    """
    tracker = ctx['tracker']
    
    ref = tracker.add_usage_record(file_path, used_by, user)
    if ref:
        click.echo(f"已添加使用记录: {file_path} -> {used_by}")
        
        history = tracker.get_modification_history(file_path)
        if history:
            click.echo(f"该文件共有 {len(history)} 条修改记录")
    else:
        click.echo(f"未找到文件引用: {file_path}，请先导入标签或扫描项目")


@cli.command('confirm')
@click.option('--type', '-t', 'dup_type', 
              type=click.Choice(['exact', 'near', 'speed', 'name', 'short', 'all']),
              default='all', help='确认的重复类型')
@click.option('--accept/--reject', default=True, help='接受或拒绝重复')
@pass_context
def confirm_duplicates(ctx, dup_type, accept):
    """批量确认重复检测结果
    
    该命令用于标记重复检测结果的确认状态
    """
    result = ctx.get('result')
    if not result:
        click.echo("错误: 请先运行 'check' 命令检测重复")
        return
    
    status = ConfirmStatus.CONFIRMED if accept else ConfirmStatus.REJECTED
    action = "确认" if accept else "拒绝"
    
    def update_matches(matches, name):
        for match in matches:
            match.confirm_status = status
            result.record_modification(f"{action}_{name}", match)
    
    if dup_type in ['exact', 'all']:
        update_matches(result.exact_duplicates, "exact")
    if dup_type in ['near', 'all']:
        update_matches(result.near_duplicates, "near")
    if dup_type in ['speed', 'all']:
        update_matches(result.speed_variations, "speed")
    if dup_type in ['name', 'all']:
        update_matches(result.same_name_different, "name")
    if dup_type in ['short', 'all']:
        update_matches(result.short_audio_candidates, "short")
    
    click.echo(f"已{action} {dup_type} 类型的重复检测结果")


@cli.command()
@click.option('--format', '-f', 'fmt', 
              type=click.Choice(['html', 'json', 'markdown', 'all']),
              default='html', help='报告格式')
@click.option('--name', '-n', default=None, help='报告名称')
@pass_context
def report(ctx, fmt, name):
    """生成去重报告
    
    报告包含音频指纹分析和引用追踪结果
    """
    result = ctx.get('result')
    tracker = ctx['tracker']
    output_dir = ctx['output_dir']
    
    if not result and not tracker.references:
        click.echo("警告: 没有检测结果或引用数据，报告可能不完整")
    
    if not name:
        name = f"dedup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    click.echo(f"正在生成报告: {name}")
    
    if fmt in ['html', 'all']:
        html_path = os.path.join(output_dir, f"{name}.html")
        reporter.generate_html_report(result, tracker, html_path)
        click.echo(f"HTML报告已生成: {html_path}")
    
    if fmt in ['json', 'all']:
        json_path = os.path.join(output_dir, f"{name}.json")
        reporter.generate_json_report(result, tracker, json_path)
        click.echo(f"JSON报告已生成: {json_path}")
    
    if fmt in ['markdown', 'all']:
        md_path = os.path.join(output_dir, f"{name}.md")
        reporter.generate_markdown_report(result, tracker, md_path)
        click.echo(f"Markdown报告已生成: {md_path}")


@cli.command()
@click.argument('path', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='./dedup_output', help='输出目录')
@click.option('--project-dir', '-p', default=None, help='项目代码目录（用于引用追踪）')
@click.option('--tag-file', '-t', default=None, help='标签文件路径')
@click.option('--format', '-f', 'fmt', 
              type=click.Choice(['html', 'json', 'markdown', 'all']),
              default='html', help='报告格式')
@click.pass_context
def full(ctx, path, output_dir, project_dir, tag_file, fmt):
    """一键执行完整流程: 扫描 -> 检测 -> 报告
    
    PATH: 音频文件或目录路径
    """
    click.echo("=" * 60)
    click.echo("音频素材去重 - 完整流程")
    click.echo("=" * 60)
    
    ctx.obj['output_dir'] = output_dir
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    click.echo("\n[1/4] 扫描音频文件...")
    ctx.forward(scan)
    
    if tag_file and os.path.exists(tag_file):
        click.echo("\n[2/4] 导入标签...")
        ctx.params['tag_file'] = tag_file
        ctx.forward(import_tags)
    
    if project_dir and os.path.exists(project_dir):
        click.echo("\n[3/4] 扫描项目引用...")
        ctx.params['project_dir'] = project_dir
        ctx.forward(scan_project)
    
    click.echo("\n[4/4] 检测重复并生成报告...")
    ctx.forward(check)
    ctx.params['fmt'] = fmt
    ctx.forward(report)
    
    click.echo("\n" + "=" * 60)
    click.echo("处理完成!")
    click.echo(f"输出目录: {output_dir}")
    click.echo("=" * 60)


@cli.command('export-refs')
@click.option('--output', '-o', default='references.json', help='输出文件路径')
@click.option('--format', '-f', 'fmt', 
              type=click.Choice(['json', 'yaml']),
              default='json', help='输出格式')
@pass_context
def export_refs(ctx, output, fmt):
    """导出引用追踪数据"""
    tracker = ctx['tracker']
    
    output_path = os.path.join(ctx['output_dir'], output)
    tracker.export_references(output_path, fmt)
    click.echo(f"引用数据已导出: {output_path}")


@cli.command('history')
@click.argument('file_path', required=False)
@pass_context
def show_history(ctx, file_path):
    """查看修改历史
    
    FILE_PATH: 可选，指定文件查看历史
    """
    tracker = ctx['tracker']
    
    history = tracker.get_modification_history(file_path)
    
    if not history:
        click.echo("暂无修改记录")
        return
    
    click.echo(f"修改历史 (共 {len(history)} 条):")
    click.echo("-" * 80)
    
    for mod in history:
        click.echo(f"[{mod.timestamp}] {mod.user} - {mod.action}")
        click.echo(f"  文件: {mod.file_path}")
        click.echo(f"  字段: {mod.field}")
        click.echo(f"  变更: {mod.old_value} -> {mod.new_value}")
        click.echo()


if __name__ == '__main__':
    cli()
