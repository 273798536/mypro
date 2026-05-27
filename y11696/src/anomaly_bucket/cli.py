from __future__ import annotations

import csv
import json
import sys
from datetime import datetime
from pathlib import Path

import click

from .analyzer import MetricAnalyzer
from .bucket import BucketAssigner
from .models import (
    AnomalyLevel,
    BucketCategory,
    HolidayRecord,
    MetricRecord,
    QuantileConfig,
    SeasonalConfig,
    TagConfig,
)
from .reporter import ReportGenerator
from .validator import InputValidator


def _parse_tags(tags_str: str) -> list[str]:
    if not tags_str:
        return []
    return [t.strip() for t in tags_str.split('|') if t.strip()]


def _read_metrics(filepath: Path) -> list[MetricRecord]:
    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(MetricRecord(
                date=row.get('date', '').strip(),
                metric_name=row.get('metric', '').strip(),
                value=row.get('value', '0').strip(),
                tags=_parse_tags(row.get('tags', '')),
                source=row.get('source', '').strip(),
                remark=row.get('remark', '').strip(),
            ))
    return records


def _read_holidays(filepath: Path) -> list[HolidayRecord]:
    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(HolidayRecord(
                date=row.get('date', '').strip(),
                name=row.get('name', '').strip(),
                impact=row.get('impact', 'normal').strip(),
            ))
    return records


def _load_config(filepath: Path | None) -> dict:
    if filepath and filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


@click.group()
def main():
    """统计异常分桶CLI - 风控交易指标异常检测与分桶工具"""


@main.command()
@click.option('--metrics', '-m', required=True, type=click.Path(exists=True),
              help='交易指标CSV文件路径')
@click.option('--holidays', '-h', type=click.Path(exists=True),
              help='节假日日历CSV文件路径')
@click.option('--config', '-c', type=click.Path(exists=True),
              help='配置JSON文件路径')
@click.option('--output', '-o', type=click.Path(),
              help='输出报告路径(目录或文件前缀)')
@click.option('--format', '-f', 'fmt', type=click.Choice(['csv', 'json', 'txt']),
              default='csv', help='导出格式')
@click.option('--quantile-upper', type=float, default=0.95,
              help='上四分位阈值 (默认0.95)')
@click.option('--quantile-lower', type=float, default=0.05,
              help='下四分位阈值 (默认0.05)')
@click.option('--seasonal-window', type=int, default=7,
              help='季节性窗口大小 (默认7)')
@click.option('--min-series', type=int, default=14,
              help='最小序列长度 (默认14)')
@click.option('--verbose/--quiet', default=False, help='显示详细信息')
def analyze(
    metrics: str,
    holidays: str | None,
    config: str | None,
    output: str | None,
    fmt: str,
    quantile_upper: float,
    quantile_lower: float,
    seasonal_window: int,
    min_series: int,
    verbose: bool,
):
    """分析交易指标并生成异常分桶报告"""

    metrics_path = Path(metrics)
    holidays_path = Path(holidays) if holidays else None
    config_path = Path(config) if config else None

    try:
        metric_records = _read_metrics(metrics_path)
    except Exception as e:
        click.echo(f'❌ 读取指标文件失败: {e}', err=True)
        sys.exit(1)

    holiday_records = []
    if holidays_path:
        try:
            holiday_records = _read_holidays(holidays_path)
        except Exception as e:
            click.echo(f'⚠️ 读取节假日文件失败: {e}', err=True)

    user_config = _load_config(config_path)

    q_config = QuantileConfig(
        upper=user_config.get('quantile', {}).get('upper', quantile_upper),
        lower=user_config.get('quantile', {}).get('lower', quantile_lower),
    )
    s_config = SeasonalConfig(
        window=user_config.get('seasonal', {}).get('window', seasonal_window),
    )
    t_config = TagConfig(
        tag_groups=user_config.get('tag_groups', {}),
        conflict_tags=user_config.get('conflict_tags', []),
    )

    validator = InputValidator(
        tag_config=t_config,
        min_series_length=min_series,
    )
    issues = validator.validate(metric_records, holiday_records)

    if verbose or issues:
        click.echo(validator.summary())

    if validator.has_blocking_issues():
        click.echo('❌ 存在阻断性问题，终止分析', err=True)
        sys.exit(1)

    analyzer = MetricAnalyzer(
        quantile_config=q_config,
        seasonal_config=s_config,
        tag_config=t_config,
        holidays=holiday_records,
    )
    results = analyzer.analyze(metric_records)

    assigner = BucketAssigner(
        quantile_config=q_config,
        holidays=holiday_records,
    )
    all_scored = []
    for metric, scored in results.items():
        all_scored.extend(scored)
    assigner.assign(all_scored, analyzer)

    reporter = ReportGenerator(validator, assigner)

    if output:
        output_path = Path(output)
        if output_path.suffix:
            if fmt == 'csv':
                reporter.export_csv(output_path)
            elif fmt == 'json':
                reporter.export_json(output_path)
            else:
                output_path.write_text(reporter.generate_detail_report(metric_records), encoding='utf-8')
        else:
            output_path.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            reporter.export_csv(output_path / f'bucket_report_{timestamp}.csv')
            reporter.export_json(output_path / f'bucket_report_{timestamp}.json')
        click.echo(f'✅ 报告已导出: {output_path}')

    click.echo('')
    click.echo(reporter.generate_summary())

    if verbose:
        assignments = assigner.get_assignments()
        for i, a in enumerate(assignments[:20]):
            click.echo(f'  #{i + 1} {reporter.build_explanation_text(a)}')
        if len(assignments) > 20:
            click.echo(f'  ... 共 {len(assignments)} 条异常记录')


@main.command()
@click.option('--output', '-o', type=click.Path(), default='./examples',
              help='示例数据输出目录')
def init_examples(output: str):
    """生成示例数据文件"""
    out = Path(output)
    out.mkdir(parents=True, exist_ok=True)

    with open(out / 'sample_metrics.csv', 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'metric', 'value', 'tags', 'source', 'remark'])
        base_date = datetime(2026, 4, 1)
        for i in range(30):
            d = base_date.fromordinal(base_date.toordinal() + i)
            is_friday = (d.weekday() == 4)
            val = 100 + (10 if is_friday else 0) + (i % 7) * 2
            if i == 15:
                val = 50
            if i == 22:
                val = 180
            writer.writerow([
                d.strftime('%Y-%m-%d'),
                'daily_tx_amount',
                f'{val:.1f}',
                'friday_peak' if is_friday else '',
                'risk_system',
                '异常波动' if i in (15, 22) else '',
            ])

    with open(out / 'sample_holidays.csv', 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'name', 'impact'])
        writer.writerow(['2026-04-05', '清明节', 'high'])
        writer.writerow(['2026-05-01', '劳动节', 'high'])

    with open(out / 'sample_config.json', 'w', encoding='utf-8') as f:
        json.dump({
            'quantile': {'upper': 0.95, 'lower': 0.05},
            'seasonal': {'window': 7, 'method': 'rolling_zscore', 'threshold': 2.0},
            'tag_groups': {
                'risk_events': ['system_alert', 'manual_review'],
                'peak_periods': ['friday_peak', 'month_end'],
            },
            'conflict_tags': ['high_risk', 'low_risk'],
        }, f, ensure_ascii=False, indent=2)

    click.echo(f'✅ 示例数据已生成到: {out.absolute()}')
    click.echo('  - sample_metrics.csv (交易指标)')
    click.echo('  - sample_holidays.csv (节假日日历)')
    click.echo('  - sample_config.json (分析配置)')


@main.command()
def version():
    """显示版本信息"""
    from . import __version__
    click.echo(f'anomaly-bucket v{__version__}')


if __name__ == '__main__':
    main()
