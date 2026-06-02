"""命令行接口"""

import os
import sys
import json
import click
from typing import List, Optional, Dict
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from midi_cleaner.midi_parser import MidiParser, ParsedMidi
from midi_cleaner.velocity_cleaner import VelocityCleaner, CleanedVelocityData
from midi_cleaner.measure_align import MeasureAlignChecker, AlignmentResult
from midi_cleaner.version_tracker import VersionTracker, VersionCheckResult
from midi_cleaner.data_store import (
    JsonDataStore, CleaningSession, FileRelationship,
    CorrectionRecord, CorrectionHistory
)
from midi_cleaner.report_generator import ReportGenerator, GenerationReport
from midi_cleaner.manual_correction import ManualCorrector, ComparisonResult


@click.group()
@click.option('--data-dir', default='./data', help='数据目录路径')
@click.pass_context
def cli(ctx, data_dir):
    """MIDI力度曲线清洗工具"""
    ctx.ensure_object(dict)

    abs_data_dir = os.path.abspath(data_dir)
    ctx.obj['data_store'] = JsonDataStore(base_dir=abs_data_dir)
    ctx.obj['data_dir'] = abs_data_dir


@cli.command()
@click.argument('midi_file')
@click.option('--source-version', default='unknown', help='来源版本标识')
@click.option('--track-version', default='unknown', help='轨道版本标识')
@click.option('--output-dir', default=None, help='输出目录')
@click.option('--std-dev-threshold', default=2.5, type=float, help='标准差阈值')
@click.option('--iqr-threshold', default=1.5, type=float, help='IQR阈值')
@click.option('--sudden-change-threshold', default=40, type=int, help='力度突变阈值')
@click.option('--deviation-threshold', default=0.1, type=float, help='节拍偏差阈值')
@click.option('--generate-report', is_flag=True, default=True, help='是否生成报告')
@click.pass_context
def clean(
    ctx,
    midi_file,
    source_version,
    track_version,
    output_dir,
    std_dev_threshold,
    iqr_threshold,
    sudden_change_threshold,
    deviation_threshold,
    generate_report
):
    """清洗MIDI文件的力度曲线"""

    data_store: JsonDataStore = ctx.obj['data_store']
    abs_midi_file = os.path.abspath(midi_file)

    if not os.path.exists(abs_midi_file):
        click.echo(f"错误: MIDI文件不存在: {abs_midi_file}", err=True)
        sys.exit(1)

    click.echo(f"开始解析MIDI文件: {abs_midi_file}")
    parser = MidiParser(source_version=source_version, track_version=track_version)
    parsed_midi = parser.parse_file(abs_midi_file)
    click.echo(f"  解析完成，共 {len(parsed_midi.notes)} 个音符，{len(parsed_midi.bad_rows)} 条坏行")

    click.echo("开始力度清洗...")
    velocity_cleaner = VelocityCleaner(
        std_dev_threshold=std_dev_threshold,
        iqr_threshold=iqr_threshold,
        sudden_change_threshold=sudden_change_threshold
    )
    cleaned_data = velocity_cleaner.clean(parsed_midi)
    click.echo(f"  检测到 {len(cleaned_data.anomalies)} 个力度异常")

    click.echo("开始小节对齐检查...")
    align_checker = MeasureAlignChecker(
        deviation_threshold=deviation_threshold
    )
    alignment_result = align_checker.check_alignment(parsed_midi)
    click.echo(f"  检测到 {len(alignment_result.misalignments)} 个对齐异常")

    click.echo("开始版本检查...")
    version_tracker = VersionTracker(
        expected_source_version=source_version if source_version != 'unknown' else None,
        expected_track_version=track_version if track_version != 'unknown' else None
    )
    version_result = version_tracker.check_versions([parsed_midi])
    click.echo(f"  检测到 {len(version_result.conflicts)} 个版本冲突，{len(version_result.mismatches)} 个版本不匹配")

    session_id = data_store.generate_session_id()
    click.echo(f"会话ID: {session_id}")

    click.echo("保存数据...")
    data_store.save_parsed_midi(parsed_midi, session_id)

    saved_files = data_store.save_cleaned_data(
        cleaned_data, alignment_result, version_result, session_id
    )

    if generate_report:
        click.echo("生成报告...")
        report_gen = ReportGenerator()

        file_hash = parsed_midi.metadata.file_hash
        correction_history = data_store.load_correction_history(file_hash)

        rel_path = saved_files.get("velocity_data", "")
        curve_path = saved_files.get("velocity_curve", "")
        version_path = saved_files.get("version_data", "")

        now = datetime.now().isoformat()
        relationship = FileRelationship(
            midi_file=abs_midi_file,
            midi_hash=file_hash,
            cleaned_data_file=rel_path,
            velocity_curve_file=curve_path,
            report_json_file="",
            report_markdown_file="",
            correction_history_file=os.path.join(
                ctx.obj['data_dir'], 'cleaned', f"{file_hash}_corrections.json"
            ),
            created_at=now,
            updated_at=now
        )

        report = report_gen.generate_report(
            parsed_midi, cleaned_data, alignment_result, version_result,
            session_id, relationship, correction_history
        )

        report_dict = report_gen.to_json(report)
        report_md = report_gen.to_markdown(report)

        report_files = data_store.save_reports(report_dict, report_md, session_id)

        relationship.report_json_file = report_files["report_json"]
        relationship.report_markdown_file = report_files["report_markdown"]

        has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

        session = CleaningSession(
            session_id=session_id,
            midi_file_path=abs_midi_file,
            midi_file_hash=file_hash,
            source_version=source_version,
            track_version=track_version,
            parsed_at=parsed_midi.metadata.parsed_at,
            cleaned_at=datetime.now().isoformat(),
            has_manual_corrections=has_manual_corrections,
            statistics_modified=cleaned_data.statistics.is_manually_modified,
            modified_fields=cleaned_data.statistics.modified_fields,
            relationships=relationship
        )

        data_store.register_session(session, abs_midi_file, relationship)

        click.echo("")
        click.echo("=" * 50)
        click.echo("清洗完成！")
        click.echo("=" * 50)
        click.echo("")
        click.echo("报告摘要:")
        click.echo(f"  总音符数: {report.summary['total_notes']}")
        click.echo(f"  坏行数: {report.summary['total_bad_rows']}")
        click.echo(f"  力度爆点: {report.summary['anomaly_counts']['velocity_spikes']}")
        click.echo(f"  统计异常: {report.summary['anomaly_counts']['statistical_outliers']}")
        click.echo(f"  小节错位: {report.summary['anomaly_counts']['measure_misalignments']}")
        click.echo(f"  系统性错位: {report.summary['anomaly_counts']['systematic_misalignments']}")
        click.echo(f"  版本混用: {report.summary['anomaly_counts']['version_conflicts']}")
        click.echo(f"  整体风险等级: {report.summary['overall_risk_level'].upper()}")
        click.echo("")
        click.echo("输出文件:")
        click.echo(f"  清洗数据: {saved_files.get('velocity_data', '')}")
        click.echo(f"  力度曲线: {saved_files.get('velocity_curve', '')}")
        click.echo(f"  对齐数据: {saved_files.get('alignment_data', '')}")
        if version_path:
            click.echo(f"  版本数据: {version_path}")
        click.echo(f"  JSON报告: {report_files['report_json']}")
        click.echo(f"  Markdown报告: {report_files['report_markdown']}")
        click.echo("")
        click.echo(f"文件对应关系已保存，可通过会话ID {session_id} 或文件哈希 {file_hash} 查询")

    else:
        click.echo("清洗完成（未生成报告）")

    return session_id


@cli.command('list-bad-rows')
@click.argument('session_id')
@click.option('--type', 'bad_type', default=None, help='按坏行类型过滤')
@click.pass_context
def list_bad_rows(ctx, session_id, bad_type):
    """查看坏行明细"""

    data_store: JsonDataStore = ctx.obj['data_store']
    session = data_store.get_session(session_id)

    if not session:
        click.echo(f"错误: 会话不存在: {session_id}", err=True)
        sys.exit(1)

    cleaned_data = data_store.load_cleaned_data(session_id)
    if not cleaned_data:
        click.echo(f"错误: 无法加载清洗数据", err=True)
        sys.exit(1)

    bad_rows = cleaned_data.get('bad_rows', [])

    if bad_type:
        bad_rows = [r for r in bad_rows if r.get('type') == bad_type]

    if not bad_rows:
        click.echo("没有找到坏行")
        return

    click.echo(f"共找到 {len(bad_rows)} 条坏行:")
    click.echo("")

    from collections import defaultdict
    grouped = defaultdict(list)
    for row in bad_rows:
        grouped[row.get('type', 'unknown')].append(row)

    for row_type, rows in grouped.items():
        click.echo(f"【{row_type}】({len(rows)} 条)")
        click.echo("-" * 40)
        for i, row in enumerate(rows, 1):
            click.echo(f"{i}. {row.get('description', '无描述')}")
            click.echo(f"   轨道: {row.get('track', 'N/A')}, 通道: {row.get('channel', 'N/A')}")
            if 'pitch' in row:
                click.echo(f"   音高: {row['pitch']}")
            if 'time' in row:
                click.echo(f"   时间: {row['time']:.3f}s")
            if 'velocity' in row:
                click.echo(f"   力度: {row['velocity']}")
        click.echo("")


@cli.command('list-anomalies')
@click.argument('session_id')
@click.option('--category', type=click.Choice(['spikes', 'statistical', 'measure', 'systematic', 'all']),
              default='all', help='异常类别')
@click.option('--severity', type=click.Choice(['high', 'medium', 'low', 'all']),
              default='all', help='严重程度')
@click.pass_context
def list_anomalies(ctx, session_id, category, severity):
    """查看异常明细"""

    data_store: JsonDataStore = ctx.obj['data_store']
    session = data_store.get_session(session_id)

    if not session:
        click.echo(f"错误: 会话不存在: {session_id}", err=True)
        sys.exit(1)

    cleaned_data = data_store.load_cleaned_data(session_id)
    if not cleaned_data:
        click.echo(f"错误: 无法加载清洗数据", err=True)
        sys.exit(1)

    anomalies = cleaned_data.get('anomalies', [])

    spike_types = {'out_of_range', 'sudden_change', 'local_outlier'}
    stat_types = {'z_score_outlier', 'iqr_outlier'}

    filtered = []
    for a in anomalies:
        if severity != 'all' and a.get('severity') != severity:
            continue

        a_type = a.get('type', '')
        if category == 'spikes' and a_type not in spike_types:
            continue
        elif category == 'statistical' and a_type not in stat_types:
            continue
        elif category == 'measure' and a_type != 'individual_note':
            continue
        elif category == 'systematic' and a_type != 'systematic_offset':
            continue

        filtered.append(a)

    if not filtered:
        click.echo("没有找到匹配的异常")
        return

    click.echo(f"共找到 {len(filtered)} 个异常:")
    click.echo("")

    for i, a in enumerate(filtered, 1):
        click.echo(f"{i}. [{a.get('anomaly_id', 'N/A')}] {a.get('type', 'unknown')} ({a.get('severity', 'unknown').upper()})")
        click.echo(f"   {a.get('description', '无描述')}")
        if 'measure' in a and a['measure']:
            click.echo(f"   位置: 第 {a['measure']} 小节，拍位 {a.get('beat_position', 'N/A')}")
        if 'original_velocity' in a:
            vel_info = f"   力度: {a['original_velocity']}"
            if a.get('suggested_velocity') is not None:
                vel_info += f" -> 建议: {a['suggested_velocity']}"
            if a.get('corrected_velocity') is not None:
                vel_info += f" -> 已修正: {a['corrected_velocity']}"
            click.echo(vel_info)
        if a.get('is_manually_corrected'):
            click.echo(f"   ✅ 已人工修正")
        click.echo("")


@cli.command('correct')
@click.argument('session_id')
@click.argument('note_id', type=int)
@click.argument('new_velocity', type=int)
@click.option('--reason', required=True, help='修正原因')
@click.option('--corrected-by', default='cli_user', help='修正人')
@click.option('--anomaly-id', default=None, help='关联的异常ID')
@click.pass_context
def correct(ctx, session_id, note_id, new_velocity, reason, corrected_by, anomaly_id):
    """手动修正单个音符的力度"""

    data_store: JsonDataStore = ctx.obj['data_store']
    session = data_store.get_session(session_id)

    if not session:
        click.echo(f"错误: 会话不存在: {session_id}", err=True)
        sys.exit(1)

    if new_velocity < 0 or new_velocity > 127:
        click.echo(f"错误: 力度值必须在0-127之间", err=True)
        sys.exit(1)

    midi_file = session['midi_file_path']
    source_version = session['source_version']
    track_version = session['track_version']

    parser = MidiParser(source_version=source_version, track_version=track_version)
    parsed_midi = parser.parse_file(midi_file)

    velocity_cleaner = VelocityCleaner()
    cleaned_data = velocity_cleaner.clean(parsed_midi)

    file_hash = parsed_midi.metadata.file_hash
    correction_history = data_store.load_correction_history(file_hash)

    for corr in (correction_history.corrections if correction_history else []):
        if corr.note_id == note_id:
            for note in parsed_midi.notes:
                if note.note_id == note_id:
                    note.velocity = corr.new_velocity
                    note.is_manually_corrected = True
                    note.original_velocity = corr.old_velocity
                    note.correction_reason = corr.reason
                    break
            for note in cleaned_data.cleaned_notes:
                if note.note_id == note_id:
                    note.velocity = corr.new_velocity
                    note.is_manually_corrected = True
                    note.original_velocity = corr.old_velocity
                    note.correction_reason = corr.reason
                    break

    corrector = ManualCorrector(data_store)

    try:
        new_parsed, new_cleaned, correction = corrector.apply_correction(
            parsed_midi, cleaned_data, note_id, new_velocity,
            reason, corrected_by, anomaly_id
        )
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)

    original_cleaned = velocity_cleaner.clean(parser.parse_file(midi_file))
    comparison = corrector.compare_versions(original_cleaned, new_cleaned)

    click.echo("修正成功！")
    click.echo("")
    click.echo("修正详情:")
    click.echo(f"  修正ID: {correction.correction_id}")
    click.echo(f"  音符ID: {correction.note_id}")
    click.echo(f"  原力度: {correction.old_velocity}")
    click.echo(f"  新力度: {correction.new_velocity}")
    click.echo(f"  变化量: {correction.new_velocity - correction.old_velocity:+}")
    click.echo(f"  修正原因: {correction.reason}")
    click.echo(f"  修正人: {correction.corrected_by}")
    click.echo(f"  修正时间: {correction.corrected_at}")
    click.echo("")
    click.echo("统计影响:")
    for stat_name, diff in comparison.original_stats_diff.items():
        click.echo(f"  {stat_name}: {diff:+}")

    align_checker = MeasureAlignChecker()
    alignment_result = align_checker.check_alignment(new_parsed)

    version_tracker = VersionTracker()
    version_result = version_tracker.check_versions([new_parsed])

    saved_files = data_store.save_cleaned_data(
        new_cleaned, alignment_result, version_result, session_id
    )

    correction_history = data_store.load_correction_history(file_hash)
    has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

    data_store.update_session_correction_status(
        session_id,
        has_manual_corrections=has_manual_corrections,
        statistics_modified=new_cleaned.statistics.is_manually_modified,
        modified_fields=new_cleaned.statistics.modified_fields
    )

    click.echo("")
    click.echo("是否重新生成报告？(y/n)")
    if click.confirm('重新生成报告？', default=True):
        report_gen = ReportGenerator()
        now = datetime.now().isoformat()

        relationship = FileRelationship(
            midi_file=midi_file,
            midi_hash=file_hash,
            cleaned_data_file=saved_files.get("velocity_data", ""),
            velocity_curve_file=saved_files.get("velocity_curve", ""),
            report_json_file="",
            report_markdown_file="",
            correction_history_file=os.path.join(
                ctx.obj['data_dir'], 'cleaned', f"{file_hash}_corrections.json"
            ),
            created_at=now,
            updated_at=now
        )

        report = report_gen.generate_report(
            new_parsed, new_cleaned, alignment_result, version_result,
            session_id, relationship, correction_history
        )

        report_dict = report_gen.to_json(report)
        report_md = report_gen.to_markdown(report)
        report_files = data_store.save_reports(report_dict, report_md, session_id)

        click.echo(f"报告已更新: {report_files['report_markdown']}")


@cli.command('compare')
@click.argument('session_id')
@click.option('--output', 'output_file', default=None, help='输出对比报告文件')
@click.pass_context
def compare(ctx, session_id, output_file):
    """生成新旧结果对比报告"""

    data_store: JsonDataStore = ctx.obj['data_store']
    session = data_store.get_session(session_id)

    if not session:
        click.echo(f"错误: 会话不存在: {session_id}", err=True)
        sys.exit(1)

    midi_file = session['midi_file_path']
    source_version = session['source_version']
    track_version = session['track_version']
    file_hash = session['midi_file_hash']

    parser = MidiParser(source_version=source_version, track_version=track_version)
    original_parsed = parser.parse_file(midi_file)

    velocity_cleaner = VelocityCleaner()
    original_cleaned = velocity_cleaner.clean(original_parsed)

    correction_history = data_store.load_correction_history(file_hash)
    if not correction_history or not correction_history.corrections:
        click.echo("该会话没有人工修正记录，无法对比")
        return

    modified_parsed = parser.parse_file(midi_file)
    for corr in correction_history.corrections:
        for note in modified_parsed.notes:
            if note.note_id == corr.note_id:
                note.velocity = corr.new_velocity
                note.is_manually_corrected = True
                note.original_velocity = corr.old_velocity
                note.correction_reason = corr.reason
                break

    modified_cleaned = velocity_cleaner.clean(modified_parsed)

    corrector = ManualCorrector(data_store)
    comparison = corrector.compare_versions(original_cleaned, modified_cleaned, correction_history)

    md_report = corrector.generate_comparison_markdown(comparison, session_id)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(md_report)
        click.echo(f"对比报告已保存到: {output_file}")
    else:
        click.echo(md_report)

    click.echo("")
    click.echo("=" * 50)
    click.echo("对比摘要")
    click.echo("=" * 50)
    click.echo(f"总修正数: {comparison.total_corrections}")
    click.echo(f"总力度变化: {comparison.total_velocity_change:+}")
    click.echo(f"平均变化: {comparison.average_change:+}")
    click.echo("")
    click.echo("统计变化:")
    for stat_name, diff in comparison.original_stats_diff.items():
        click.echo(f"  {stat_name}: {diff:+}")


@cli.command('list-sessions')
@click.pass_context
def list_sessions(ctx):
    """列出所有清洗会话"""

    data_store: JsonDataStore = ctx.obj['data_store']
    sessions = data_store.get_all_sessions()

    if not sessions:
        click.echo("没有找到会话")
        return

    click.echo(f"共找到 {len(sessions)} 个会话:")
    click.echo("")

    for s in sessions:
        has_corrections = "✅" if s.get('has_manual_corrections') else "  "
        stats_modified = "✏️" if s.get('statistics_modified') else "  "
        click.echo(f"{has_corrections}{stats_modified} {s['session_id']}")
        click.echo(f"   文件: {os.path.basename(s['midi_file_path'])}")
        click.echo(f"   版本: {s['source_version']} / {s['track_version']}")
        click.echo(f"   清洗时间: {s['cleaned_at']}")
        if s.get('modified_fields'):
            click.echo(f"   已修改字段: {', '.join(s['modified_fields'])}")
        click.echo("")


@cli.command('show-relationship')
@click.argument('midi_file', required=False)
@click.option('--session-id', default=None, help='通过会话ID查询')
@click.option('--file-hash', default=None, help='通过文件哈希查询')
@click.pass_context
def show_relationship(ctx, midi_file, session_id, file_hash):
    """显示文件对应关系"""

    data_store: JsonDataStore = ctx.obj['data_store']

    relationship = None
    if midi_file:
        relationship = data_store.get_relationship_by_midi(midi_file)
    elif session_id:
        session = data_store.get_session(session_id)
        if session:
            relationship = session.get('relationships')
    elif file_hash:
        relationship = data_store.get_relationship_by_hash(file_hash)

    if not relationship:
        click.echo("没有找到对应关系")
        return

    click.echo("文件对应关系:")
    click.echo("=" * 50)
    click.echo(f"MIDI文件: {relationship.get('midi_file', 'N/A')}")
    click.echo(f"文件哈希: {relationship.get('midi_hash', 'N/A')}")
    click.echo("-" * 50)
    click.echo(f"清洗数据: {relationship.get('cleaned_data_file', 'N/A')}")
    click.echo(f"力度曲线: {relationship.get('velocity_curve_file', 'N/A')}")
    click.echo(f"JSON报告: {relationship.get('report_json_file', 'N/A')}")
    click.echo(f"Markdown报告: {relationship.get('report_markdown_file', 'N/A')}")
    click.echo(f"修正历史: {relationship.get('correction_history_file', 'N/A')}")
    click.echo("-" * 50)
    click.echo(f"创建时间: {relationship.get('created_at', 'N/A')}")
    click.echo(f"更新时间: {relationship.get('updated_at', 'N/A')}")


@cli.command('export-midi')
@click.argument('session_id')
@click.argument('output_file')
@click.option('--use-corrected', is_flag=True, default=True, help='使用修正后的力度值')
@click.pass_context
def export_midi(ctx, session_id, output_file, use_corrected):
    """导出清洗后的MIDI文件"""

    data_store: JsonDataStore = ctx.obj['data_store']
    session = data_store.get_session(session_id)

    if not session:
        click.echo(f"错误: 会话不存在: {session_id}", err=True)
        sys.exit(1)

    midi_file = session['midi_file_path']
    source_version = session['source_version']
    track_version = session['track_version']
    file_hash = session['midi_file_hash']

    import mido

    parser = MidiParser(source_version=source_version, track_version=track_version)
    parsed_midi = parser.parse_file(midi_file)

    if use_corrected:
        correction_history = data_store.load_correction_history(file_hash)
        if correction_history:
            for corr in correction_history.corrections:
                for note in parsed_midi.notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        break

    velocity_cleaner = VelocityCleaner()
    cleaned_data = velocity_cleaner.clean(parsed_midi)

    mid = mido.MidiFile()
    mid.ticks_per_beat = parsed_midi.metadata.ticks_per_beat

    from collections import defaultdict
    track_notes = defaultdict(list)
    for note in cleaned_data.cleaned_notes:
        track_notes[note.track].append(note)

    for track_idx in sorted(track_notes.keys()):
        track = mido.MidiTrack()
        mid.tracks.append(track)

        track_name = parsed_midi.metadata.track_names[track_idx] if track_idx < len(parsed_midi.metadata.track_names) else f"Track {track_idx}"
        track.append(mido.MetaMessage('track_name', name=track_name, time=0))

        notes_sorted = sorted(track_notes[track_idx], key=lambda n: n.start_time)

        current_time = 0
        for note in notes_sorted:
            delta_start = int((note.start_time - current_time) * mid.ticks_per_beat * 2)
            track.append(mido.Message('note_on', note=note.pitch, velocity=note.velocity,
                                      channel=note.channel, time=delta_start))

            delta_end = int(note.duration * mid.ticks_per_beat * 2)
            track.append(mido.Message('note_off', note=note.pitch, velocity=0,
                                      channel=note.channel, time=delta_end))

            current_time = note.end_time

    mid.save(output_file)
    click.echo(f"MIDI文件已导出到: {output_file}")


if __name__ == '__main__':
    cli(obj={})
