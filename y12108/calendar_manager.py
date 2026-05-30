import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import pytz


@dataclass
class CalendarConflict:
    conflict_type: str
    timestamp: pd.Timestamp
    source_a: str
    source_b: str
    value_a: Optional[str]
    value_b: Optional[str]
    severity: str
    message: str


@dataclass
class OverlappingEvent:
    event1_name: str
    event2_name: str
    overlap_start: pd.Timestamp
    overlap_end: pd.Timestamp
    overlap_duration: timedelta
    event1_source: str
    event2_source: str


@dataclass
class CalendarMergeResult:
    merged_calendar: pd.DataFrame
    conflicts: List[CalendarConflict]
    overlapping_events: List[OverlappingEvent]
    timezone_issues: List[Dict]
    stats: Dict


class CalendarManager:
    def __init__(self, target_timezone: str = 'Asia/Shanghai'):
        self.target_timezone = target_timezone

    def load_holidays(self, file_path: str, source_name: str = 'holidays') -> pd.DataFrame:
        df = pd.read_csv(file_path)
        return self._process_calendar_data(df, source_name, 'holiday')

    def load_events(self, file_path: str, source_name: str = 'events') -> pd.DataFrame:
        df = pd.read_csv(file_path)
        return self._process_calendar_data(df, source_name, 'event')

    def load_dataframe(self, df: pd.DataFrame, source_name: str,
                       data_type: str = 'event') -> pd.DataFrame:
        return self._process_calendar_data(df.copy(), source_name, data_type)

    def _process_calendar_data(self, df: pd.DataFrame, source_name: str,
                               data_type: str) -> pd.DataFrame:
        required_cols = ['date', 'name', 'type']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"日历数据缺少必需列: {col}")

        df['source'] = source_name
        df['data_type'] = data_type

        df['date'] = pd.to_datetime(df['date'])

        if 'start_time' in df.columns and 'end_time' in df.columns:
            df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
            df['end_time'] = pd.to_datetime(df['end_time'], errors='coerce')
        else:
            if df['date'].dt.tz is None:
                df['start_time'] = df['date'].apply(
                    lambda x: pd.Timestamp(x).tz_localize(self.target_timezone)
                )
            else:
                df['start_time'] = df['date']
            df['end_time'] = df['start_time'] + pd.Timedelta(days=1)

        df = self._ensure_timezone(df, 'start_time')
        df = self._ensure_timezone(df, 'end_time')

        if 'impact' not in df.columns:
            df['impact'] = 'unknown'
        if 'description' not in df.columns:
            df['description'] = df['name']

        return df

    def _ensure_timezone(self, df: pd.DataFrame, col: str) -> pd.DataFrame:
        if df[col].dt.tz is None:
            df[col] = df[col].dt.tz_localize(self.target_timezone)
        else:
            df[col] = df[col].dt.tz_convert(self.target_timezone)
        return df

    def merge_calendars(self, calendars: List[pd.DataFrame],
                        resolve_conflicts: bool = False) -> CalendarMergeResult:
        if len(calendars) == 0:
            raise ValueError("至少需要一个日历数据源")

        all_conflicts = []
        timezone_issues = []

        for i, cal in enumerate(calendars):
            tz_issues = self._check_timezone_consistency(cal)
            for issue in tz_issues:
                issue['source'] = cal['source'].iloc[0] if len(cal) > 0 else f'calendar_{i}'
                timezone_issues.append(issue)

        merged = pd.concat(calendars, ignore_index=True)
        merged = merged.sort_values('start_time').reset_index(drop=True)

        conflicts = self._detect_conflicts(merged)
        all_conflicts.extend(conflicts)

        overlaps = self._detect_overlapping_events(merged)

        if not resolve_conflicts:
            for conflict in conflicts:
                pass
        else:
            merged = self._resolve_conflicts(merged, conflicts)

        stats = {
            'total_events': len(merged),
            'total_sources': merged['source'].nunique(),
            'conflict_count': len(conflicts),
            'overlap_count': len(overlaps),
            'timezone_issue_count': len(timezone_issues),
            'events_by_source': merged['source'].value_counts().to_dict(),
            'events_by_type': merged['type'].value_counts().to_dict()
        }

        return CalendarMergeResult(
            merged_calendar=merged,
            conflicts=all_conflicts,
            overlapping_events=overlaps,
            timezone_issues=timezone_issues,
            stats=stats
        )

    def _check_timezone_consistency(self, df: pd.DataFrame) -> List[Dict]:
        issues = []

        if len(df) == 0:
            return issues

        start_tzs = df['start_time'].apply(lambda x: str(x.tz)).unique()
        end_tzs = df['end_time'].apply(lambda x: str(x.tz)).unique()

        all_tzs = set(start_tzs) | set(end_tzs)
        if len(all_tzs) > 1:
            issues.append({
                'type': 'mixed_timezones',
                'severity': 'high',
                'message': f'数据中存在多个时区: {", ".join(all_tzs)}',
                'timezones': list(all_tzs)
            })

        df['start_hour'] = df['start_time'].dt.hour
        unusual_hours = df[(df['start_hour'] < 6) | (df['start_hour'] > 22)]
        if len(unusual_hours) > 0:
            issues.append({
                'type': 'unusual_hours',
                'severity': 'warning',
                'message': f'发现 {len(unusual_hours)} 条记录在非工作时段开始',
                'count': len(unusual_hours)
            })

        return issues

    def _detect_conflicts(self, merged: pd.DataFrame) -> List[CalendarConflict]:
        conflicts = []

        date_groups = merged.groupby(merged['start_time'].dt.date)
        for date, group in date_groups:
            if len(group) > 1:
                sources = group['source'].unique()
                if len(sources) > 1:
                    for i in range(len(group)):
                        for j in range(i + 1, len(group)):
                            row1 = group.iloc[i]
                            row2 = group.iloc[j]

                            if row1['type'] != row2['type']:
                                conflict = CalendarConflict(
                                    conflict_type='type_mismatch',
                                    timestamp=row1['start_time'],
                                    source_a=row1['source'],
                                    source_b=row2['source'],
                                    value_a=row1['type'],
                                    value_b=row2['type'],
                                    severity='medium',
                                    message=(f"{row1['start_time'].strftime('%Y-%m-%d')} 在 {row1['source']} "
                                             f"标记为 '{row1['type']}'，但在 {row2['source']} "
                                             f"标记为 '{row2['type']}'")
                                )
                                conflicts.append(conflict)

                            if row1['name'] != row2['name']:
                                conflict = CalendarConflict(
                                    conflict_type='name_mismatch',
                                    timestamp=row1['start_time'],
                                    source_a=row1['source'],
                                    source_b=row2['source'],
                                    value_a=row1['name'],
                                    value_b=row2['name'],
                                    severity='low',
                                    message=(f"{row1['start_time'].strftime('%Y-%m-%d')} 名称不一致: "
                                             f"{row1['source']}='{row1['name']}', "
                                             f"{row2['source']}='{row2['name']}'")
                                )
                                conflicts.append(conflict)

        return conflicts

    def _detect_overlapping_events(self, merged: pd.DataFrame) -> List[OverlappingEvent]:
        overlaps = []

        for i in range(len(merged)):
            for j in range(i + 1, len(merged)):
                event1 = merged.iloc[i]
                event2 = merged.iloc[j]

                overlap_start = max(event1['start_time'], event2['start_time'])
                overlap_end = min(event1['end_time'], event2['end_time'])

                if overlap_start < overlap_end:
                    overlap_duration = overlap_end - overlap_start

                    overlap = OverlappingEvent(
                        event1_name=event1['name'],
                        event2_name=event2['name'],
                        overlap_start=overlap_start,
                        overlap_end=overlap_end,
                        overlap_duration=overlap_duration,
                        event1_source=event1['source'],
                        event2_source=event2['source']
                    )
                    overlaps.append(overlap)

        return overlaps

    def _resolve_conflicts(self, df: pd.DataFrame,
                           conflicts: List[CalendarConflict]) -> pd.DataFrame:
        return df

    def annotate_timeseries(self, ts_df: pd.DataFrame, calendar_result: CalendarMergeResult,
                            timestamp_col: str = 'timestamp') -> pd.DataFrame:
        df = ts_df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])

        if df['timestamp'].dt.tz is None:
            df['timestamp'] = df['timestamp'].dt.tz_localize(self.target_timezone)
        else:
            df['timestamp'] = df['timestamp'].dt.tz_convert(self.target_timezone)

        calendar = calendar_result.merged_calendar

        df['is_holiday'] = False
        df['is_event'] = False
        df['holiday_name'] = None
        df['event_name'] = None
        df['event_type'] = None
        df['event_impact'] = None
        df['event_sources'] = None

        for _, event in calendar.iterrows():
            mask = (df['timestamp'] >= event['start_time']) & (df['timestamp'] < event['end_time'])

            if mask.any():
                if event['data_type'] == 'holiday':
                    df.loc[mask, 'is_holiday'] = True
                    df.loc[mask, 'holiday_name'] = event['name']
                else:
                    df.loc[mask, 'is_event'] = True

                    current_names = df.loc[mask, 'event_name']
                    new_names = current_names.apply(
                        lambda x: f"{x};{event['name']}" if pd.notna(x) and x else event['name']
                    )
                    df.loc[mask, 'event_name'] = new_names

                    current_types = df.loc[mask, 'event_type']
                    new_types = current_types.apply(
                        lambda x: f"{x};{event['type']}" if pd.notna(x) and x else event['type']
                    )
                    df.loc[mask, 'event_type'] = new_types

                    current_sources = df.loc[mask, 'event_sources']
                    new_sources = current_sources.apply(
                        lambda x: f"{x};{event['source']}" if pd.notna(x) and x else event['source']
                    )
                    df.loc[mask, 'event_sources'] = new_sources

        return df
