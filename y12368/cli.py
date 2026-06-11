#!/usr/bin/env python3
import click
import yaml
import json
from pathlib import Path
from datetime import datetime

from acoustic_localizer import TDOALocalizer, ErrorEstimator, ReportGenerator, EvidenceManager
from acoustic_localizer.triangulation import Microphone, TimeDifference
from acoustic_localizer.evidence import TuningNote


def load_config(config_path: str) -> dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        if config_path.endswith('.yaml') or config_path.endswith('.yml'):
            return yaml.safe_load(f)
        else:
            return json.load(f)


@click.group()
def cli():
    """声源定位三角测量工具 - 用于会场啸叫声源定位"""
    pass


@cli.command()
@click.option('--config', '-c', required=True, help='配置文件路径 (YAML/JSON)')
@click.option('--output', '-o', default='reports', help='报告输出目录')
@click.option('--name', '-n', default='未命名案例', help='案例名称')
@click.option('--description', '-d', default='', help='案例描述')
@click.option('--format', 'formats', multiple=True, default=['markdown', 'json'],
              type=click.Choice(['markdown', 'json']), help='输出格式')
def locate(config, output, name, description, formats):
    """执行声源定位并生成报告"""
    click.echo(f"📡 加载配置文件: {config}")

    try:
        cfg = load_config(config)
    except Exception as e:
        click.echo(f"❌ 配置文件加载失败: {e}", err=True)
        return

    localizer = TDOALocalizer(
        speed_of_sound=cfg.get('speed_of_sound', 343.0)
    )

    evidence_mgr = EvidenceManager(case_id=name)

    for mic_cfg in cfg.get('microphones', []):
        mic = Microphone(
            id=mic_cfg['id'],
            x=mic_cfg['x'],
            y=mic_cfg['y'],
            z=mic_cfg.get('z', 0.0),
            notes=mic_cfg.get('notes', '')
        )
        localizer.add_microphone(mic)

    for td_cfg in cfg.get('time_differences', []):
        td = TimeDifference(
            mic1_id=td_cfg['mic1'],
            mic2_id=td_cfg['mic2'],
            delta_t=td_cfg['delta_t'],
            confidence=td_cfg.get('confidence', 1.0),
            notes=td_cfg.get('notes', ''),
            noise_peak=td_cfg.get('noise_peak')
        )
        localizer.add_time_difference(td)

    for note_cfg in cfg.get('tuning_notes', []):
        note = TuningNote(
            id='',
            timestamp=datetime.now().isoformat(),
            author=note_cfg.get('author', 'system'),
            category=note_cfg.get('category', 'general'),
            content=note_cfg['content'],
            related_evidence=note_cfg.get('related_evidence', []),
            severity=note_cfg.get('severity', 'info'),
            resolved=note_cfg.get('resolved', False)
        )
        evidence_mgr.add_tuning_note(note)

    click.echo(f"✅ 加载 {len(localizer.microphones)} 个麦克风")
    click.echo(f"✅ 加载 {len(localizer.time_differences)} 个时间差")

    mics_dict = {
        mid: {"x": m.x, "y": m.y, "z": m.z}
        for mid, m in localizer.microphones.items()
    }
    tds_list = [
        {
            "mic1": td.mic1_id,
            "mic2": td.mic2_id,
            "delta_t": td.delta_t,
            "confidence": td.confidence,
            "noise_peak": td.noise_peak,
            "notes": td.notes
        }
        for td in localizer.time_differences
    ]

    localization_success = True
    try:
        result = localizer.localize_2d_chan()
        click.echo(f"📍 定位结果: ({result.source_position[0]:.4f}, {result.source_position[1]:.4f}) m")
        click.echo(f"📊 残差误差: {result.error:.6f} m")
        click.echo(f"🎯 一致性得分: {result.consistency_score:.4f}")

        if result.tuning_notes:
            click.echo(f"⚠️  调音备注: {len(result.tuning_notes)} 条")
            for note in result.tuning_notes:
                click.echo(f"   - {note}")
    except Exception as e:
        click.echo(f"❌ 定位失败: {e}", err=True)
        localization_success = False
        evidence_mgr._add_evidence_item(
            type="localization_failure",
            description="定位算法执行失败",
            data={"error": str(e)},
            source="locate_command"
        )

    click.echo("")
    click.echo("🔍 执行声学证据复盘...")

    source_pos = result.source_position.tolist() if localization_success else None
    detect_result = evidence_mgr.auto_detect_all(
        mics_dict=mics_dict,
        tds_list=tds_list,
        source_position=source_pos,
        speed_of_sound=localizer.speed_of_sound
    )

    click.echo(f"   📍 坐标问题检测: {detect_result['coordinate_issues']} 项")
    click.echo(f"   ⏱️  时间差异常: {detect_result['time_difference_gaps']} 项")
    click.echo(f"   🎚️  噪声峰值归档: {detect_result['archived_noise_peaks']} 项")

    ev_summary = evidence_mgr.generate_evidence_summary()
    click.echo(f"   📋 证据总数: {ev_summary['total_evidence_items']} 条")

    if not localization_success:
        click.echo("")
        click.echo("⚠️  定位失败，已生成部分证据报告，建议检查输入数据后重试")
        return

    click.echo("")
    click.echo("� 生成定位报告...")

    reporter = ReportGenerator(localizer, evidence_mgr)
    report = reporter.generate_report(
        case_name=name,
        case_description=description
    )

    reporter.save_report(report, output_dir=output, formats=list(formats))

    click.echo("")
    click.echo("🎯 候选位置排序:")
    for cand in report.candidates[:3]:
        click.echo(f"   #{cand['rank']} ({cand['method']}): "
                   f"({cand['x']:.4f}, {cand['y']:.4f}) | "
                   f"误差: {cand['error']:.6f}m | "
                   f"得分: {cand['score']:.4f}")

    click.echo("")
    quality_passed = report.conclusion.get('quality_passed', True)
    if quality_passed:
        click.echo("✅ 质量评估通过，定位结果有效")
    else:
        click.echo("⚠️  质量评估未完全通过，建议人工复核报告")
        for rec in report.conclusion.get('recommendations', []):
            click.echo(f"   - {rec}")

    click.echo("")
    click.echo("📍 定位流程完成!")


@cli.command()
@click.argument('mic1')
@click.argument('mic2')
@click.argument('delta_t', type=float)
@click.option('--speed', '-v', default=343.0, help='声速 (m/s)')
def td2dd(mic1, mic2, delta_t, speed):
    """计算时间差对应的距离差"""
    distance_diff = delta_t * speed
    click.echo(f"时间差: {delta_t*1000:.3f} ms")
    click.echo(f"声速: {speed} m/s")
    click.echo(f"距离差: {distance_diff:.4f} m")
    click.echo(f"")
    click.echo(f"公式: Δd = Δt × v = {delta_t}s × {speed}m/s = {distance_diff:.4f}m")


@cli.command()
@click.option('--output', '-o', default='examples', help='示例输出目录')
@click.option('--type', 'example_type', default='basic',
              type=click.Choice(['basic', 'consistent', 'inconsistent', 'multi']),
              help='示例类型')
def example(output, example_type):
    """生成示例配置文件"""
    Path(output).mkdir(parents=True, exist_ok=True)

    examples = {
        'basic': {
            'speed_of_sound': 343.0,
            'microphones': [
                {'id': 'MIC1', 'x': 0.0, 'y': 0.0, 'z': 1.5, 'notes': '舞台左侧'},
                {'id': 'MIC2', 'x': 5.0, 'y': 0.0, 'z': 1.5, 'notes': '舞台中央'},
                {'id': 'MIC3', 'x': 10.0, 'y': 0.0, 'z': 1.5, 'notes': '舞台右侧'},
                {'id': 'MIC4', 'x': 5.0, 'y': 5.0, 'z': 1.5, 'notes': '观众区中央'}
            ],
            'time_differences': [
                {'mic1': 'MIC1', 'mic2': 'MIC2', 'delta_t': 0.004373, 'confidence': 0.95, 'noise_peak': 75.2,
                 'notes': '啸叫频率: 2.3kHz'},
                {'mic1': 'MIC1', 'mic2': 'MIC3', 'delta_t': 0.008746, 'confidence': 0.92, 'noise_peak': 73.1},
                {'mic1': 'MIC1', 'mic2': 'MIC4', 'delta_t': 0.002915, 'confidence': 0.88, 'noise_peak': 70.5}
            ],
            'tuning_notes': [
                {'author': '调音师A', 'category': 'observation', 'severity': 'warning',
                 'content': '会场左侧扬声器附近可能存在反射面', 'resolved': False}
            ]
        },
        'consistent': {
            'description': '完全一致的理想测试数据 - 声源位于(3,4)',
            'speed_of_sound': 343.0,
            'microphones': [
                {'id': 'MIC1', 'x': 0.0, 'y': 0.0},
                {'id': 'MIC2', 'x': 10.0, 'y': 0.0},
                {'id': 'MIC3', 'x': 5.0, 'y': 8.0}
            ],
            'time_differences': [
                {'mic1': 'MIC1', 'mic2': 'MIC2', 'delta_t': 0.007445, 'confidence': 1.0},
                {'mic1': 'MIC1', 'mic2': 'MIC3', 'delta_t': -0.002915, 'confidence': 1.0}
            ]
        },
        'inconsistent': {
            'description': '含坐标错位的测试数据 - 用于验证检测功能',
            'speed_of_sound': 343.0,
            'microphones': [
                {'id': 'MIC1', 'x': 0.0, 'y': 0.0},
                {'id': 'MIC2', 'x': 10.5, 'y': 0.0, 'notes': '实际应为10.0m，存在0.5m偏移'},
                {'id': 'MIC3', 'x': 5.0, 'y': 8.0}
            ],
            'time_differences': [
                {'mic1': 'MIC1', 'mic2': 'MIC2', 'delta_t': 0.007445, 'confidence': 0.9},
                {'mic1': 'MIC1', 'mic2': 'MIC3', 'delta_t': -0.002915, 'confidence': 0.95}
            ],
            'tuning_notes': [
                {'author': '系统', 'category': 'calibration', 'severity': 'error',
                 'content': 'MIC2坐标可能存在偏差，建议重新测量', 'resolved': False}
            ]
        },
        'multi': {
            'description': '多麦克风阵列会场配置',
            'speed_of_sound': 343.0,
            'microphones': [
                {'id': 'FL', 'x': 0.0, 'y': 0.0, 'notes': '前左'},
                {'id': 'FR', 'x': 12.0, 'y': 0.0, 'notes': '前右'},
                {'id': 'CL', 'x': 0.0, 'y': 6.0, 'notes': '中左'},
                {'id': 'CR', 'x': 12.0, 'y': 6.0, 'notes': '中右'},
                {'id': 'BL', 'x': 0.0, 'y': 12.0, 'notes': '后左'},
                {'id': 'BR', 'x': 12.0, 'y': 12.0, 'notes': '后右'}
            ],
            'time_differences': [
                {'mic1': 'FL', 'mic2': 'FR', 'delta_t': 0.005831, 'confidence': 0.85},
                {'mic1': 'FL', 'mic2': 'CL', 'delta_t': 0.008746, 'confidence': 0.82},
                {'mic1': 'FL', 'mic2': 'CR', 'delta_t': 0.002915, 'confidence': 0.88},
                {'mic1': 'FL', 'mic2': 'BL', 'delta_t': 0.017493, 'confidence': 0.78},
                {'mic1': 'FL', 'mic2': 'BR', 'delta_t': 0.011662, 'confidence': 0.80}
            ]
        }
    }

    cfg = examples[example_type]
    filename = f"{example_type}_config.yaml"
    filepath = Path(output) / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    click.echo(f"✅ 示例配置已生成: {filepath}")
    click.echo("")
    click.echo("使用方法:")
    click.echo(f"  python cli.py locate -c {filepath}")


@cli.command()
@click.option('--config', '-c', required=True, help='配置文件路径')
@click.option('--output', '-o', default=None, help='证据导出路径 (JSON)')
def validate(config, output):
    """验证输入数据的一致性"""
    click.echo(f"🔍 验证配置文件: {config}")

    try:
        cfg = load_config(config)
    except FileNotFoundError:
        click.echo(f"❌ 配置文件不存在: {config}", err=True)
        return
    except Exception as e:
        click.echo(f"❌ 配置文件加载失败: {e}", err=True)
        return

    mics = cfg.get('microphones', [])
    tds = cfg.get('time_differences', [])

    click.echo(f"📋 麦克风数量: {len(mics)}")
    click.echo(f"⏱️  时间差数量: {len(tds)}")
    click.echo("")

    evidence_mgr = EvidenceManager(case_id="validate")

    mic_ids = set(m['id'] for m in mics)
    errors = 0

    for i, td in enumerate(tds, 1):
        if td['mic1'] not in mic_ids:
            click.echo(f"❌ 时间差 #{i}: 麦克风 {td['mic1']} 不存在")
            errors += 1
            evidence_mgr._add_evidence_item(
                type="validation_error",
                description=f"时间差 #{i} 引用不存在的麦克风 {td['mic1']}",
                data={"td_index": i, "missing_mic": td['mic1']},
                source="validate_command"
            )
        if td['mic2'] not in mic_ids:
            click.echo(f"❌ 时间差 #{i}: 麦克风 {td['mic2']} 不存在")
            errors += 1
            evidence_mgr._add_evidence_item(
                type="validation_error",
                description=f"时间差 #{i} 引用不存在的麦克风 {td['mic2']}",
                data={"td_index": i, "missing_mic": td['mic2']},
                source="validate_command"
            )

    min_mics = 3
    min_tds = 2

    if len(mics) < min_mics:
        click.echo(f"⚠️  麦克风数量不足: 需要至少 {min_mics} 个")
        errors += 1

    if len(tds) < min_tds:
        click.echo(f"⚠️  时间差数量不足: 需要至少 {min_tds} 个")
        errors += 1

    click.echo("")
    click.echo("🔬 深度质量检测")
    click.echo("-" * 40)

    mics_dict = {m['id']: {"x": m.get('x', 0), "y": m.get('y', 0), "z": m.get('z', 0)} for m in mics}
    tds_list = [
        {
            "mic1": td['mic1'],
            "mic2": td['mic2'],
            "delta_t": td['delta_t'],
            "confidence": td.get('confidence', 1.0),
            "noise_peak": td.get('noise_peak'),
            "notes": td.get('notes', '')
        }
        for td in tds
    ]

    geometry_issues = evidence_mgr.analyze_microphone_geometry(mics_dict)
    click.echo(f"📍 坐标几何检查: {len(geometry_issues)} 项问题")
    for issue in geometry_issues:
        click.echo(f"   ⚠️  {issue.microphone_id}: {issue.detected_by} "
                   f"(置信度: {issue.confidence:.0%})")

    noise_peaks = evidence_mgr.archive_time_difference_noise_peaks(tds_list)
    click.echo(f"🎚️  噪声峰值归档: {len(noise_peaks)} 条记录")
    for peak in noise_peaks:
        click.echo(f"   📦 {peak.microphone_id}: {peak.amplitude_db:.1f} dB")

    click.echo("")
    ev_summary = evidence_mgr.generate_evidence_summary()
    click.echo(f"📊 证据摘要: 总数 {ev_summary['total_evidence_items']} | "
               f"坐标 {ev_summary['coordinate_issues']} | "
               f"时差 {ev_summary['time_gaps']} | "
               f"噪声 {ev_summary['archived_noise_peaks']}")

    if output:
        evidence_mgr.export_evidence(output)
        click.echo(f"")
        click.echo(f"💾 证据已导出: {output}")

    click.echo("")
    if errors == 0:
        click.echo("✅ 基础验证通过")
    else:
        click.echo(f"❌ 发现 {errors} 个问题")
    if geometry_issues:
        click.echo(f"⚠️  存在 {len(geometry_issues)} 项几何质量警告")


@cli.command()
@click.option('--config', '-c', required=True, help='配置文件路径')
def inspect(config):
    """显示详细的中间计算过程"""
    try:
        cfg = load_config(config)
    except FileNotFoundError:
        click.echo(f"❌ 配置文件不存在: {config}", err=True)
        return
    except Exception as e:
        click.echo(f"❌ 配置文件加载失败: {e}", err=True)
        return

    localizer = TDOALocalizer(speed_of_sound=cfg.get('speed_of_sound', 343.0))
    evidence_mgr = EvidenceManager(case_id="inspect")

    for mic_cfg in cfg.get('microphones', []):
        localizer.add_microphone(Microphone(**mic_cfg))

    for td_cfg in cfg.get('time_differences', []):
        td = TimeDifference(
            mic1_id=td_cfg['mic1'],
            mic2_id=td_cfg['mic2'],
            delta_t=td_cfg['delta_t'],
            confidence=td_cfg.get('confidence', 1.0),
            noise_peak=td_cfg.get('noise_peak'),
            notes=td_cfg.get('notes', '')
        )
        localizer.add_time_difference(td)

    for note_cfg in cfg.get('tuning_notes', []):
        note = TuningNote(
            id='',
            timestamp=datetime.now().isoformat(),
            author=note_cfg.get('author', 'system'),
            category=note_cfg.get('category', 'general'),
            content=note_cfg['content'],
            related_evidence=note_cfg.get('related_evidence', []),
            severity=note_cfg.get('severity', 'info'),
            resolved=note_cfg.get('resolved', False)
        )
        evidence_mgr.add_tuning_note(note)

    mics_dict = {
        mid: {"x": m.x, "y": m.y, "z": m.z}
        for mid, m in localizer.microphones.items()
    }
    tds_list = [
        {
            "mic1": td.mic1_id,
            "mic2": td.mic2_id,
            "delta_t": td.delta_t,
            "confidence": td.confidence,
            "noise_peak": td.noise_peak,
            "notes": td.notes
        }
        for td in localizer.time_differences
    ]

    localization_success = True
    try:
        result = localizer.localize_2d_chan()
    except Exception as e:
        click.echo(f"❌ 定位失败: {e}", err=True)
        localization_success = False
        evidence_mgr._add_evidence_item(
            type="localization_failure",
            description="定位算法执行失败",
            data={"error": str(e)},
            source="inspect_command"
        )

    if localization_success:
        click.echo("=" * 60)
        click.echo("📊 三角定位计算过程")
        click.echo("=" * 60)
        click.echo("")

        for i, step in enumerate(result.intermediate_steps, 1):
            click.echo(f"步骤 {i}: {step.description}")
            click.echo(f"  公式: {step.formula}")
            click.echo(f"  结果: {step.value}")
            click.echo(f"  单位: {step.unit}")
            click.echo("")

        click.echo("=" * 60)
        click.echo(f"📍 最终位置: ({result.source_position[0]:.4f}, {result.source_position[1]:.4f}) m")
        click.echo(f"📊 残差误差: {result.error:.6f} m")
        click.echo("=" * 60)

    click.echo("")
    click.echo("🔍 证据检测详情")
    click.echo("=" * 60)

    source_pos = result.source_position.tolist() if localization_success else None
    detect_result = evidence_mgr.auto_detect_all(
        mics_dict=mics_dict,
        tds_list=tds_list,
        source_position=source_pos,
        speed_of_sound=localizer.speed_of_sound
    )

    click.echo(f"📍 坐标问题: {detect_result['coordinate_issues']} 项")
    if evidence_mgr.coordinate_issues:
        for issue in evidence_mgr.coordinate_issues:
            click.echo(f"   - {issue.microphone_id}: "
                       f"位移 {issue.displacement:.4f}m "
                       f"({issue.detected_by})")

    click.echo(f"⏱️  时间差异常: {detect_result['time_difference_gaps']} 项")
    if evidence_mgr.time_gaps:
        for gap in evidence_mgr.time_gaps:
            click.echo(f"   - {gap.pair}: "
                       f"预期 {gap.expected_value*1000:.3f}ms, "
                       f"实际 {gap.actual_value*1000:.3f}ms "
                       f"[{gap.severity}]")

    click.echo(f"🎚️  噪声峰值归档: {detect_result['archived_noise_peaks']} 项")
    if evidence_mgr.noise_peak_archive:
        for peak in evidence_mgr.noise_peak_archive:
            click.echo(f"   - {peak.microphone_id}: "
                       f"{peak.amplitude_db:.1f}dB @ {peak.frequency_hz:.0f}Hz")

    ev_summary = evidence_mgr.generate_evidence_summary()
    click.echo("")
    click.echo(f"📋 证据摘要: 总数 {ev_summary['total_evidence_items']} | "
               f"坐标 {ev_summary['coordinate_issues']} | "
               f"时差 {ev_summary['time_gaps']} | "
               f"噪声 {ev_summary['archived_noise_peaks']}")


if __name__ == '__main__':
    cli()
