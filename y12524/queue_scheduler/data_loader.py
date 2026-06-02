import os
import pandas as pd
import numpy as np
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .models import CallRecord, Shift, Holiday, QueueConfig
from .errors import (
    FileFormatError,
    MissingDataError,
    DataValidationError,
    validate_call_record_columns,
    validate_time_range,
    validate_date_order,
    validate_handle_time,
    QueueSchedulerError
)


CALL_RECORD_COLUMNS = [
    '来电时间', '等待时长(秒)', '通话时长(秒)', '坐席工号', '是否放弃'
]

SHIFT_COLUMNS = [
    '坐席工号', '日期', '上班时间', '下班时间', '休息开始', '休息结束'
]

HOLIDAY_COLUMNS = [
    '日期', '节假日名称', '是否高峰', '来电倍数'
]


class DataLoader:
    def __init__(self):
        self.call_records: List[CallRecord] = []
        self.shifts: List[Shift] = []
        self.holidays: List[Holiday] = []
        self.source_files: Dict[str, str] = {}

    def _read_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileFormatError(
                f"文件不存在：{file_path}",
                suggestion="请检查文件路径是否正确，或使用样例数据先体验功能",
                details=[f"尝试读取的路径：{os.path.abspath(file_path)}"]
            )

        ext = os.path.splitext(file_path)[1].lower()
        try:
            if ext in ['.xlsx', '.xls']:
                return pd.read_excel(file_path)
            elif ext == '.csv':
                encodings = ['utf-8', 'gbk', 'utf-8-sig']
                for enc in encodings:
                    try:
                        return pd.read_csv(file_path, encoding=enc)
                    except UnicodeDecodeError:
                        continue
                raise FileFormatError(
                    f"无法识别文件编码：{file_path}",
                    suggestion="请将文件另存为UTF-8编码的CSV或Excel格式",
                    details=["支持的编码：UTF-8、GBK"]
                )
            else:
                raise FileFormatError(
                    f"不支持的文件格式：{ext}",
                    suggestion="请使用CSV（.csv）或Excel（.xlsx/.xls）格式",
                    details=[f"当前文件：{file_path}"]
                )
        except pd.errors.ParserError as e:
            raise FileFormatError(
                f"文件解析失败：{file_path}",
                suggestion="请检查文件内容是否完整，或使用样例数据作为模板",
                details=[f"错误信息：{str(e)}"]
            )
        except QueueSchedulerError:
            raise
        except Exception as e:
            raise FileFormatError(
                f"读取文件时发生错误：{file_path}",
                suggestion="请检查文件是否损坏或格式是否正确",
                details=[f"错误信息：{str(e)}"]
            )

    def load_call_records(self, file_path: str) -> List[CallRecord]:
        df = self._read_file(file_path)
        self.source_files['来电记录'] = file_path

        required_cols = ['来电时间', '等待时长(秒)', '通话时长(秒)']
        validate_call_record_columns(df, required_cols)

        call_records = []
        invalid_rows = []
        handle_times = []

        for idx, row in df.iterrows():
            try:
                call_time = pd.to_datetime(row['来电时间'])
                if pd.isna(call_time):
                    raise ValueError("来电时间为空")

                wait_seconds = float(row['等待时长(秒)']) if pd.notna(row['等待时长(秒)']) else 0.0
                handle_seconds = float(row['通话时长(秒)']) if pd.notna(row['通话时长(秒)']) else 0.0

                if handle_seconds > 0:
                    handle_times.append(handle_seconds)

                agent_id = str(row['坐席工号']).strip() if '坐席工号' in df.columns and pd.notna(row['坐席工号']) else None
                is_abandoned = bool(row['是否放弃']) if '是否放弃' in df.columns else False

                call_records.append(CallRecord(
                    call_time=call_time.to_pydatetime(),
                    wait_seconds=max(0.0, wait_seconds),
                    handle_seconds=max(0.0, handle_seconds),
                    agent_id=agent_id,
                    is_abandoned=is_abandoned
                ))
            except Exception as e:
                invalid_rows.append({
                    '行号': idx + 2,
                    '错误': str(e),
                    '数据': str(row.to_dict())
                })

        if not call_records:
            raise MissingDataError(
                "没有成功加载任何来电记录",
                suggestion="请检查文件内容格式是否正确，确保包含有效的来电时间和通话时长",
                details=[f"共处理 {len(df)} 行数据，全部无效"]
            )

        if invalid_rows:
            if len(invalid_rows) > len(df) * 0.5:
                raise DataValidationError(
                    f"超过50%的来电记录数据无效（{len(invalid_rows)}/{len(df)}行）",
                    suggestion="请仔细检查数据格式，或使用样例数据作为模板",
                    details=[f"{r['行号']}行：{r['错误']}" for r in invalid_rows[:5]]
                )

        self.call_records = call_records

        if handle_times:
            avg_handle = np.mean(handle_times)
            try:
                validate_handle_time(avg_handle)
            except DataValidationError as e:
                e.details.append(f"当前数据的平均通话时长：{avg_handle:.1f}秒")
                e.details.append(f"数据来源：{file_path}")
                raise

        return call_records

    def load_shifts(self, file_path: str) -> List[Shift]:
        df = self._read_file(file_path)
        self.source_files['班表'] = file_path

        required_cols = ['坐席工号', '日期', '上班时间', '下班时间']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise FileFormatError(
                f"班表文件缺少必要列：{', '.join(missing)}",
                suggestion="请对照样例数据检查文件格式",
                details=[f"需要的列：{', '.join(required_cols)}", f"实际的列：{', '.join(df.columns)}"]
            )

        shifts = []
        invalid_rows = []

        for idx, row in df.iterrows():
            try:
                agent_id = str(row['坐席工号']).strip()
                if not agent_id or agent_id.lower() == 'nan':
                    raise ValueError("坐席工号为空")

                shift_date = pd.to_datetime(row['日期']).date()
                if pd.isna(shift_date):
                    raise ValueError("日期为空")

                start_time = pd.to_datetime(str(row['上班时间'])).time()
                end_time = pd.to_datetime(str(row['下班时间'])).time()

                validate_time_range(start_time, end_time, f"坐席 {agent_id} 的班表时间")

                break_start = None
                break_end = None
                if '休息开始' in df.columns and pd.notna(row['休息开始']):
                    break_start = pd.to_datetime(str(row['休息开始'])).time()
                if '休息结束' in df.columns and pd.notna(row['休息结束']):
                    break_end = pd.to_datetime(str(row['休息结束'])).time()

                if break_start and break_end:
                    validate_time_range(break_start, break_end, f"坐席 {agent_id} 的休息时间")

                shifts.append(Shift(
                    agent_id=agent_id,
                    shift_date=shift_date,
                    start_time=start_time,
                    end_time=end_time,
                    break_start=break_start,
                    break_end=break_end
                ))
            except Exception as e:
                invalid_rows.append({
                    '行号': idx + 2,
                    '错误': str(e),
                    '坐席': str(row.get('坐席工号', '未知'))
                })

        if not shifts:
            raise MissingDataError(
                "没有成功加载任何班表数据",
                suggestion="请检查文件内容格式是否正确",
                details=[f"共处理 {len(df)} 行数据，全部无效"]
            )

        self.shifts = shifts
        return shifts

    def load_holidays(self, file_path: str) -> List[Holiday]:
        df = self._read_file(file_path)
        self.source_files['节假日'] = file_path

        required_cols = ['日期', '节假日名称']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise FileFormatError(
                f"节假日文件缺少必要列：{', '.join(missing)}",
                suggestion="请对照样例数据检查文件格式",
                details=[f"需要的列：{', '.join(required_cols)}", f"实际的列：{', '.join(df.columns)}"]
            )

        holidays = []

        for idx, row in df.iterrows():
            try:
                holiday_date = pd.to_datetime(row['日期']).date()
                if pd.isna(holiday_date):
                    continue

                name = str(row['节假日名称']).strip()
                is_peak = bool(row['是否高峰']) if '是否高峰' in df.columns and pd.notna(row['是否高峰']) else False
                traffic_multiplier = float(row['来电倍数']) if '来电倍数' in df.columns and pd.notna(row['来电倍数']) else 1.0

                if traffic_multiplier <= 0:
                    raise DataValidationError(
                        f"节假日 {name} 的来电倍数 {traffic_multiplier} 无效",
                        suggestion="来电倍数应该是正数，通常在0.5到3.0之间",
                        details=["1.0表示与平时相同，2.0表示两倍来电"]
                    )

                holidays.append(Holiday(
                    holiday_date=holiday_date,
                    name=name,
                    is_peak=is_peak,
                    traffic_multiplier=traffic_multiplier
                ))
            except Exception as e:
                continue

        self.holidays = holidays
        return holidays

    def get_date_range(self) -> Tuple[date, date]:
        if not self.call_records:
            raise MissingDataError(
                "无法确定日期范围，因为没有来电记录",
                suggestion="请先导入来电记录数据"
            )

        dates = [cr.call_time.date() for cr in self.call_records]
        return min(dates), max(dates)

    def analyze_call_patterns(self, start_date: date = None, end_date: date = None) -> pd.DataFrame:
        if not self.call_records:
            raise MissingDataError(
                "无法分析来电规律，因为没有来电记录",
                suggestion="请先导入来电记录数据"
            )

        records = self.call_records
        if start_date and end_date:
            validate_date_order(start_date, end_date, "分析时段")
            records = [cr for cr in records if start_date <= cr.call_time.date() <= end_date]

        if not records:
            raise MissingDataError(
                "指定日期范围内没有来电记录",
                suggestion="请调整日期范围或检查数据是否正确导入"
            )

        data = []
        for cr in records:
            data.append({
                'datetime': cr.call_time,
                'date': cr.call_time.date(),
                'hour': cr.call_time.hour,
                'weekday': cr.call_time.weekday(),
                'wait_seconds': cr.wait_seconds,
                'handle_seconds': cr.handle_seconds,
                'is_abandoned': cr.is_abandoned
            })

        df = pd.DataFrame(data)

        unique_days = df.groupby(['weekday', 'hour'])['date'].nunique().reset_index()
        unique_days.columns = ['weekday', 'hour', 'day_count']

        hourly_stats = df.groupby(['weekday', 'hour']).agg(
            total_calls=('datetime', 'count'),
            avg_wait=('wait_seconds', 'mean'),
            avg_handle=('handle_seconds', lambda x: x[x > 0].mean() if (x > 0).any() else 0),
            abandon_rate=('is_abandoned', 'mean')
        ).reset_index()

        hourly_stats = hourly_stats.merge(unique_days, on=['weekday', 'hour'])
        hourly_stats['call_count'] = hourly_stats['total_calls'] / hourly_stats['day_count']
        hourly_stats = hourly_stats.drop(columns=['total_calls', 'day_count'])

        weekday_map = {0: '周一', 1: '周二', 2: '周三', 3: '周四', 4: '周五', 5: '周六', 6: '周日'}
        hourly_stats['星期'] = hourly_stats['weekday'].map(weekday_map)
        hourly_stats['时段'] = hourly_stats['hour'].apply(lambda x: f"{x:02d}:00-{x+1:02d}:00")

        return hourly_stats

    def get_agents_on_duty(self, target_date: date, target_time: time) -> List[str]:
        if not self.shifts:
            return []

        agents = []
        for shift in self.shifts:
            if shift.shift_date != target_date:
                continue

            if shift.start_time <= target_time < shift.end_time:
                on_break = False
                if shift.break_start and shift.break_end:
                    on_break = shift.break_start <= target_time < shift.break_end

                if not on_break:
                    agents.append(shift.agent_id)

        return agents

    def get_agent_count_by_interval(self, start_date: date, end_date: date, interval_minutes: int = 30) -> pd.DataFrame:
        if not self.shifts:
            raise MissingDataError(
                "无法计算坐席数量，因为没有班表数据",
                suggestion="请先导入班表数据"
            )

        validate_date_order(start_date, end_date, "计算坐席时段")

        intervals = []
        current = datetime.combine(start_date, time(0, 0))
        end_dt = datetime.combine(end_date, time(23, 59, 59))

        while current <= end_dt:
            interval_end = current + timedelta(minutes=interval_minutes)
            mid_time = current + timedelta(minutes=interval_minutes // 2)

            agents = self.get_agents_on_duty(mid_time.date(), mid_time.time())

            intervals.append({
                'datetime': current,
                'date': current.date(),
                'time': current.time(),
                'agent_count': len(agents),
                'agents': ', '.join(agents) if agents else ''
            })

            current = interval_end

        return pd.DataFrame(intervals)

    def get_holiday_multiplier(self, target_date: date) -> float:
        for holiday in self.holidays:
            if holiday.holiday_date == target_date:
                return holiday.traffic_multiplier
        return 1.0

    def is_holiday(self, target_date: date) -> Optional[Holiday]:
        for holiday in self.holidays:
            if holiday.holiday_date == target_date:
                return holiday
        return None

    def merge_data_for_simulation(self, start_date: date = None, end_date: date = None,
                                   interval_minutes: int = 30) -> pd.DataFrame:
        if not self.call_records:
            raise MissingDataError(
                "无法合并数据，因为没有来电记录",
                suggestion="请先导入来电记录数据"
            )

        if not start_date or not end_date:
            start_date, end_date = self.get_date_range()

        validate_date_order(start_date, end_date, "模拟时段")

        call_patterns = self.analyze_call_patterns(start_date, end_date)
        agent_counts = self.get_agent_count_by_interval(start_date, end_date, interval_minutes)

        merged = agent_counts.copy()
        merged['weekday'] = merged['date'].apply(lambda d: d.weekday())
        merged['hour'] = merged['time'].apply(lambda t: t.hour)

        merged = merged.merge(
            call_patterns[['weekday', 'hour', 'call_count', 'avg_handle', 'avg_wait', 'abandon_rate']],
            on=['weekday', 'hour'],
            how='left'
        )

        merged['holiday_multiplier'] = merged['date'].apply(self.get_holiday_multiplier)
        merged['adjusted_calls_per_hour'] = merged['call_count'] * merged['holiday_multiplier']
        merged['arrival_rate'] = merged['adjusted_calls_per_hour']
        merged['avg_handle_seconds'] = merged['avg_handle'].fillna(merged['avg_handle'].mean())

        merged.loc[merged['avg_handle_seconds'] < 5, 'avg_handle_seconds'] = merged['avg_handle'].mean()

        holiday_info = []
        for _, row in merged.iterrows():
            holiday = self.is_holiday(row['date'])
            if holiday:
                holiday_info.append({
                    'datetime': row['datetime'],
                    'holiday_name': holiday.name,
                    'is_peak': holiday.is_peak,
                    'multiplier': holiday.traffic_multiplier
                })

        return merged

    def get_data_summary(self) -> Dict:
        summary = {}

        if self.call_records:
            dates = [cr.call_time.date() for cr in self.call_records]
            valid_handles = [cr.handle_seconds for cr in self.call_records if cr.handle_seconds > 0]

            summary['来电记录'] = {
                '总数': len(self.call_records),
                '日期范围': f"{min(dates)} 至 {max(dates)}",
                '日均来电': round(len(self.call_records) / len(set(dates)), 1),
                '平均通话时长(秒)': round(np.mean(valid_handles), 1) if valid_handles else 0,
                '平均等待时长(秒)': round(np.mean([cr.wait_seconds for cr in self.call_records]), 1),
                '放弃率(%)': round(sum(cr.is_abandoned for cr in self.call_records) / len(self.call_records) * 100, 1)
            }

        if self.shifts:
            agent_dates = defaultdict(set)
            for s in self.shifts:
                agent_dates[s.agent_id].add(s.shift_date)

            summary['班表'] = {
                '坐席总数': len(agent_dates),
                '总班次': len(self.shifts),
                '日期范围': f"{min(s.shift_date for s in self.shifts)} 至 {max(s.shift_date for s in self.shifts)}"
            }

        if self.holidays:
            peak_count = sum(1 for h in self.holidays if h.is_peak)
            summary['节假日'] = {
                '总数': len(self.holidays),
                '高峰日': peak_count,
                '日期范围': f"{min(h.holiday_date for h in self.holidays)} 至 {max(h.holiday_date for h in self.holidays)}"
            }

        summary['数据来源'] = self.source_files

        return summary
