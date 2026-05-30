import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import argparse

from data_loader import TimeSeriesLoader
from trend_decomposition import TrendDecomposer
from calendar_manager import CalendarManager
from attribution import AnomalyAttributor
from exporter import DataExporter, ReportGenerator


class TimeSeriesAnalyzer:
    def __init__(self, freq: str = 'H', timezone: str = 'Asia/Shanghai',
                 seasonal_period: int = 24, anomaly_threshold: float = 3.0):
        self.loader = TimeSeriesLoader(expected_freq=freq, timezone=timezone)
        self.decomposer = TrendDecomposer(
            seasonal_period=seasonal_period,
            anomaly_threshold=anomaly_threshold
        )
        self.calendar_manager = CalendarManager(target_timezone=timezone)
        self.attributor = AnomalyAttributor(timezone=timezone)
        self.exporter = DataExporter(timezone=timezone)
        self.reporter = ReportGenerator()
        self.timezone = timezone
        self.freq = freq

    def analyze(self, timeseries_df: pd.DataFrame,
                calendars: list = None,
                timestamp_col: str = 'timestamp',
                value_col: str = 'value',
                metric_name: str = 'metric') -> dict:
        ts_data = self.loader.load_dataframe(
            timeseries_df, timestamp_col, value_col, metric_name
        )

        decomposition = self.decomposer.decompose(
            ts_data.processed_data, 'value', 'timestamp'
        )

        calendar_result = None
        annotated_ts = ts_data.processed_data.copy()
        if calendars and len(calendars) > 0:
            calendar_result = self.calendar_manager.merge_calendars(calendars)
            annotated_ts = self.calendar_manager.annotate_timeseries(
                ts_data.processed_data, calendar_result
            )

        attribution = self.attributor.attribute_anomalies(
            decomposition.anomaly_df,
            annotated_ts,
            calendar_result.conflicts if calendar_result else [],
            ts_data.sampling_gaps
        )

        quality_result = self._determine_quality_result(ts_data, calendar_result)

        analysis_result = {
            'metadata': {
                'metric_name': metric_name,
                'start_time': ts_data.processed_data['timestamp'].min(),
                'end_time': ts_data.processed_data['timestamp'].max(),
                'frequency': self.freq,
                'timezone': self.timezone
            },
            'raw_data': ts_data.processed_data,
            'decomposed_data': decomposition.original_data,
            'decomposition': decomposition,
            'anomalies': decomposition.anomalies,
            'annotated_anomalies': attribution.annotated_anomalies,
            'attribution': attribution,
            'quality_issues_detail': ts_data.issues,
            'sampling_gaps': ts_data.sampling_gaps,
            'calendar_result': calendar_result,
            'calendar_data': calendar_result.merged_calendar if calendar_result else pd.DataFrame(),
            'calendar_conflicts': calendar_result.conflicts if calendar_result else [],
            'event_overlaps': calendar_result.overlapping_events if calendar_result else [],
            'stats': {
                **decomposition.stats,
                'attribution_rate': attribution.summary.get('attribution_rate', 0)
            },
            'quality_issues': {
                'sampling_gaps': len(ts_data.sampling_gaps),
                'duplicates': sum(1 for i in ts_data.issues if getattr(i, 'type', '') == 'duplicate_timestamps'),
                'null_values': sum(1 for i in ts_data.issues if getattr(i, 'type', '') == 'null_values'),
                'calendar_conflicts': len(calendar_result.conflicts) if calendar_result else 0,
                'event_overlaps': len(calendar_result.overlapping_events) if calendar_result else 0,
                'timezone_issues': len(calendar_result.timezone_issues) if calendar_result else 0
            },
            'cause_distribution': attribution.cause_distribution,
            'quality_result': quality_result
        }

        return analysis_result

    def _determine_quality_result(self, ts_data, calendar_result) -> str:
        high_severity_count = sum(
            1 for issue in ts_data.issues
            if getattr(issue, 'severity', '') == 'high'
        )

        if high_severity_count > 0:
            return 'FAIL'
        elif calendar_result and len(calendar_result.conflicts) > 3:
            return 'WARN'
        else:
            return 'PASS'

    def export_excel(self, analysis_result: dict, output_path: str):
        return self.exporter.export_to_excel(analysis_result, output_path)

    def export_csv(self, analysis_result: dict, output_dir: str):
        return self.exporter.export_to_csv(analysis_result, output_dir)

    def generate_report(self, analysis_result: dict, output_path: str):
        return self.reporter.generate_markdown_report(analysis_result, output_path)


def generate_sample_data(output_dir: str = 'sample_data'):
    import os
    os.makedirs(output_dir, exist_ok=True)

    end_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=14)

    timestamps = []
    current = start_time
    while current < end_time:
        timestamps.append(current)
        current += timedelta(hours=1)

    values = []
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        day_of_week = ts.weekday()

        base = 1000
        base += np.sin(hour / 24 * 2 * np.pi) * 300

        if day_of_week >= 5:
            base *= 0.7

        trend = i * 1.5

        noise = np.random.normal(0, 50)

        value = base + trend + noise

        if i == 24 * 2 + 12:
            value *= 0.25
        if i == 24 * 5 + 14:
            value *= 1.8
        if i == 24 * 8 + 9:
            value *= 0.2
        if i == 24 * 10 + 20:
            value *= 1.5

        values.append(round(value, 2))

    ts_df = pd.DataFrame({
        'timestamp': timestamps,
        'value': values
    })

    ts_df.to_csv(f'{output_dir}/timeseries.csv', index=False)
    print(f"生成时间序列数据: {output_dir}/timeseries.csv ({len(ts_df)} 条)")

    holidays = [
        {'date': (start_time + timedelta(days=6)).strftime('%Y-%m-%d'),
         'name': '周末', 'type': 'weekend', 'impact': 'medium'},
        {'date': (start_time + timedelta(days=7)).strftime('%Y-%m-%d'),
         'name': '周末', 'type': 'weekend', 'impact': 'medium'},
        {'date': (start_time + timedelta(days=13)).strftime('%Y-%m-%d'),
         'name': '周末', 'type': 'weekend', 'impact': 'medium'},
    ]
    pd.DataFrame(holidays).to_csv(f'{output_dir}/holidays.csv', index=False)
    print(f"生成节假日数据: {output_dir}/holidays.csv")

    events = [
        {'date': (start_time + timedelta(days=5)).strftime('%Y-%m-%d'),
         'name': '促销活动A', 'type': 'promotion', 'impact': 'high',
         'start_time': (start_time + timedelta(days=5, hours=10)).strftime('%Y-%m-%d %H:%M:%S'),
         'end_time': (start_time + timedelta(days=5, hours=22)).strftime('%Y-%m-%d %H:%M:%S')},
        {'date': (start_time + timedelta(days=8)).strftime('%Y-%m-%d'),
         'name': '品牌日', 'type': 'branding', 'impact': 'high',
         'start_time': (start_time + timedelta(days=8, hours=0)).strftime('%Y-%m-%d %H:%M:%S'),
         'end_time': (start_time + timedelta(days=8, hours=23, minutes=59)).strftime('%Y-%m-%d %H:%M:%S')},
        {'date': (start_time + timedelta(days=10)).strftime('%Y-%m-%d'),
         'name': '会员日', 'type': 'membership', 'impact': 'medium',
         'start_time': (start_time + timedelta(days=10, hours=8)).strftime('%Y-%m-%d %H:%M:%S'),
         'end_time': (start_time + timedelta(days=10, hours=20)).strftime('%Y-%m-%d %H:%M:%S')},
    ]
    pd.DataFrame(events).to_csv(f'{output_dir}/events.csv', index=False)
    print(f"生成活动数据: {output_dir}/events.csv")

    print("\n示例数据生成完成！")


def run_demo():
    print("=" * 60)
    print("时间序列异常分解分析系统 - 演示模式")
    print("=" * 60)

    analyzer = TimeSeriesAnalyzer(freq='H', seasonal_period=24)

    ts_df = pd.read_csv('sample_data/timeseries.csv')
    holidays_df = pd.read_csv('sample_data/holidays.csv')
    events_df = pd.read_csv('sample_data/events.csv')

    cal_holidays = analyzer.calendar_manager.load_dataframe(
        holidays_df, source_name='holidays', data_type='holiday'
    )
    cal_events = analyzer.calendar_manager.load_dataframe(
        events_df, source_name='marketing', data_type='event'
    )

    print("\n开始分析...")
    result = analyzer.analyze(
        ts_df,
        calendars=[cal_holidays, cal_events],
        metric_name='业务指标演示'
    )

    print("\n" + "=" * 60)
    print("分析结果概览")
    print("=" * 60)

    stats = result['stats']
    print(f"\n数据点总数: {stats['total_points']}")
    print(f"异常点数量: {stats['anomaly_count']} ({stats['anomaly_rate']*100:.2f}%)")
    print(f"  - 暴涨: {stats['anomaly_by_type'].get('spike', 0)}")
    print(f"  - 暴跌: {stats['anomaly_by_type'].get('drop', 0)}")

    quality = result['quality_result']
    print(f"\n数据质量检查: {'✅ 通过' if quality == 'PASS' else '⚠️ 警告' if quality == 'WARN' else '❌ 未通过'}")

    issues = result['quality_issues']
    if any(v > 0 for v in issues.values()):
        print("\n数据质量问题:")
        for k, v in issues.items():
            if v > 0:
                print(f"  - {k}: {v}")

    cause_dist = result['cause_distribution']
    if cause_dist:
        print("\n异常归因分布:")
        for cause, count in cause_dist.items():
            print(f"  - {cause}: {count}")

    print("\n" + "=" * 60)
    print("导出数据...")
    print("=" * 60)

    excel_result = analyzer.export_excel(result, 'analysis_result.xlsx')
    print(f"\nExcel导出: {excel_result.message}")

    report_result = analyzer.generate_report(result, 'analysis_report.md')
    print(f"报告生成: {report_result.message}")

    print("\n" + "=" * 60)
    print("演示完成！")
    print("=" * 60)
    print("\n生成的文件:")
    print("  - analysis_result.xlsx (Excel分析结果)")
    print("  - analysis_report.md (分析报告)")
    print("  - dashboard.html (交互式分析看板，用浏览器打开)")


def main():
    parser = argparse.ArgumentParser(description='时间序列异常分解分析系统')
    parser.add_argument('--generate-sample', action='store_true', help='生成示例数据')
    parser.add_argument('--demo', action='store_true', help='运行演示分析')
    parser.add_argument('--input', type=str, help='输入CSV文件路径')
    parser.add_argument('--output', type=str, default='analysis_result.xlsx', help='输出文件路径')
    parser.add_argument('--freq', type=str, default='H', help='采样频率 (H, D, 30min等)')
    parser.add_argument('--seasonal-period', type=int, default=24, help='季节性周期')
    parser.add_argument('--holidays', type=str, help='节假日数据CSV')
    parser.add_argument('--events', type=str, help='活动数据CSV')

    args = parser.parse_args()

    if args.generate_sample:
        generate_sample_data()
        return

    if args.demo:
        import os
        if not os.path.exists('sample_data'):
            generate_sample_data()
        run_demo()
        return

    if args.input:
        analyzer = TimeSeriesAnalyzer(freq=args.freq, seasonal_period=args.seasonal_period)

        ts_df = pd.read_csv(args.input)

        calendars = []
        if args.holidays:
            holidays_df = pd.read_csv(args.holidays)
            calendars.append(analyzer.calendar_manager.load_dataframe(
                holidays_df, source_name='holidays', data_type='holiday'
            ))

        if args.events:
            events_df = pd.read_csv(args.events)
            calendars.append(analyzer.calendar_manager.load_dataframe(
                events_df, source_name='events', data_type='event'
            ))

        result = analyzer.analyze(ts_df, calendars=calendars)

        if args.output.endswith('.xlsx'):
            analyzer.export_excel(result, args.output)
        else:
            analyzer.export_csv(result, args.output)

        print(f"分析完成，结果已导出到: {args.output}")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
