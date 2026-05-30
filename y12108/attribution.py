import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from datetime import timedelta


@dataclass
class AnomalyAttribution:
    anomaly_timestamp: pd.Timestamp
    anomaly_type: str
    severity: str
    value: float
    expected_value: float
    deviation_pct: float
    primary_cause: str
    primary_cause_confidence: float
    contributing_factors: List[str]
    evidence: List[str]
    human_readable: str
    source_tags: List[str]


@dataclass
class AttributionResult:
    annotated_anomalies: pd.DataFrame
    attributions: List[AnomalyAttribution]
    summary: Dict
    cause_distribution: Dict[str, int]


class AnomalyAttributor:
    def __init__(self, timezone: str = 'Asia/Shanghai'):
        self.timezone = timezone
        self.cause_definitions = {
            'holiday_impact': {
                'keywords': ['holiday', '节假日', 'festival', 'vacation'],
                'description': '节假日影响',
                'confidence_base': 0.8
            },
            'event_impact': {
                'keywords': ['promotion', '活动', 'campaign', 'sale'],
                'description': '营销活动影响',
                'confidence_base': 0.85
            },
            'event_end': {
                'keywords': ['end', '结束', 'finish'],
                'description': '活动结束回落',
                'confidence_base': 0.75
            },
            'system_issue': {
                'keywords': ['error', '故障', 'outage', 'downtime'],
                'description': '系统故障',
                'confidence_base': 0.6
            },
            'seasonal_effect': {
                'keywords': ['seasonal', '季节性', 'weekend', '周末'],
                'description': '季节性/周末效应',
                'confidence_base': 0.7
            },
            'trend_change': {
                'keywords': ['trend', '趋势', 'growth', 'decline'],
                'description': '趋势变化',
                'confidence_base': 0.65
            },
            'unknown': {
                'keywords': [],
                'description': '原因待查',
                'confidence_base': 0.0
            }
        }

    def attribute_anomalies(self, anomaly_df: pd.DataFrame,
                            annotated_ts: pd.DataFrame,
                            calendar_conflicts: List = None,
                            sampling_gaps: pd.DataFrame = None) -> AttributionResult:
        if anomaly_df.empty:
            return AttributionResult(
                annotated_anomalies=pd.DataFrame(),
                attributions=[],
                summary={'total_anomalies': 0, 'attributed_count': 0},
                cause_distribution={}
            )

        calendar_conflicts = calendar_conflicts if calendar_conflicts is not None else []
        sampling_gaps = sampling_gaps if (sampling_gaps is not None and not sampling_gaps.empty) else pd.DataFrame()

        attributions = []
        annotated_list = []

        for _, anomaly in anomaly_df.iterrows():
            attribution = self._attribute_single_anomaly(
                anomaly, annotated_ts, calendar_conflicts, sampling_gaps
            )
            attributions.append(attribution)
            annotated_list.append({
                **anomaly.to_dict(),
                'primary_cause': attribution.primary_cause,
                'primary_cause_desc': self.cause_definitions.get(
                    attribution.primary_cause, {}
                ).get('description', '未知'),
                'cause_confidence': attribution.primary_cause_confidence,
                'human_readable': attribution.human_readable,
                'source_tags': ';'.join(attribution.source_tags)
            })

        annotated_anomalies = pd.DataFrame(annotated_list)

        cause_dist = {}
        for attr in attributions:
            cause_dist[attr.primary_cause] = cause_dist.get(attr.primary_cause, 0) + 1

        summary = {
            'total_anomalies': len(attributions),
            'attributed_count': len([a for a in attributions if a.primary_cause != 'unknown']),
            'attribution_rate': len([a for a in attributions if a.primary_cause != 'unknown']) / len(attributions),
            'high_confidence_count': len([a for a in attributions if a.primary_cause_confidence >= 0.8]),
            'medium_confidence_count': len([a for a in attributions if 0.5 <= a.primary_cause_confidence < 0.8]),
            'low_confidence_count': len([a for a in attributions if a.primary_cause_confidence < 0.5])
        }

        return AttributionResult(
            annotated_anomalies=annotated_anomalies,
            attributions=attributions,
            summary=summary,
            cause_distribution=cause_dist
        )

    def _attribute_single_anomaly(self, anomaly: pd.Series,
                                  annotated_ts: pd.DataFrame,
                                  calendar_conflicts: List,
                                  sampling_gaps: pd.DataFrame) -> AnomalyAttribution:
        ts = anomaly['timestamp']
        anomaly_type = anomaly['anomaly_type']
        value = anomaly['value']
        expected = anomaly['expected']
        deviation_pct = anomaly['deviation_pct']

        context = self._get_context_window(annotated_ts, ts, window_hours=24)

        causes = []
        evidence = []
        source_tags = []

        if context.get('is_holiday', False):
            holiday_name = context.get('holiday_name', '节假日')
            confidence = 0.8
            causes.append(('holiday_impact', confidence, f'正值{holiday_name}'))
            evidence.append(f'该时间点处于{holiday_name}期间')
            source_tags.append('calendar')

        if context.get('is_event', False):
            event_names = context.get('event_name', '活动')
            event_type = context.get('event_type', '')
            confidence = 0.85
            causes.append(('event_impact', confidence, f'活动进行中: {event_names}'))
            evidence.append(f'营销活动{event_names}({event_type})正在进行')
            source_tags.append('events')

        post_event = self._check_post_event_effect(annotated_ts, ts)
        if post_event and anomaly_type == 'drop':
            causes.append(('event_end', 0.75, f'活动"{post_event}"结束后回落'))
            evidence.append(f'活动"{post_event}"刚刚结束，流量通常会出现回落')
            source_tags.append('events')

        near_gap = self._check_near_sampling_gap(sampling_gaps, ts)
        if near_gap:
            causes.append(('data_quality', 0.4, f'附近存在数据中断'))
            evidence.append(f'注意：该时间点前后{near_gap}存在数据采样中断，可能影响分析准确性')
            source_tags.append('data_quality')

        is_weekend = ts.dayofweek >= 5
        if is_weekend and not context.get('is_holiday', False):
            causes.append(('seasonal_effect', 0.5, '周末效应'))
            evidence.append('该时间点为周末，业务指标通常与工作日有差异')
            source_tags.append('calendar')

        if context.get('has_trend_change', False):
            causes.append(('trend_change', 0.6, '趋势变化期'))
            evidence.append('近期整体趋势发生变化，可能是长期因素影响')
            source_tags.append('trend')

        has_conflict = self._check_calendar_conflict(calendar_conflicts, ts)
        if has_conflict:
            evidence.append(f'注意：该日期存在日历数据冲突：{has_conflict}')
            source_tags.append('conflict')

        if not causes:
            primary_cause = 'unknown'
            primary_confidence = 0.0
        else:
            causes.sort(key=lambda x: x[1], reverse=True)
            primary_cause = causes[0][0]
            primary_confidence = causes[0][1]

        contributing_factors = [c[2] for c in causes[1:]] if len(causes) > 1 else []

        human_readable = self._generate_human_readable(
            anomaly_type, value, expected, deviation_pct,
            primary_cause, causes, evidence
        )

        return AnomalyAttribution(
            anomaly_timestamp=ts,
            anomaly_type=anomaly_type,
            severity=anomaly.get('severity', 'medium'),
            value=float(value),
            expected_value=float(expected),
            deviation_pct=float(deviation_pct),
            primary_cause=primary_cause,
            primary_cause_confidence=float(primary_confidence),
            contributing_factors=contributing_factors,
            evidence=evidence,
            human_readable=human_readable,
            source_tags=list(set(source_tags))
        )

    def _get_context_window(self, annotated_ts: pd.DataFrame,
                            ts: pd.Timestamp, window_hours: int = 24) -> Dict:
        context = {}

        if 'timestamp' in annotated_ts.columns:
            mask = annotated_ts['timestamp'] == ts
            if mask.any():
                row = annotated_ts[mask].iloc[0]
                context['is_holiday'] = bool(row.get('is_holiday', False))
                context['holiday_name'] = row.get('holiday_name')
                context['is_event'] = bool(row.get('is_event', False))
                context['event_name'] = row.get('event_name')
                context['event_type'] = row.get('event_type')
                context['event_sources'] = row.get('event_sources')

        start_window = ts - timedelta(hours=window_hours)
        end_window = ts + timedelta(hours=window_hours)
        window_mask = (annotated_ts['timestamp'] >= start_window) & \
                      (annotated_ts['timestamp'] <= end_window)
        window_data = annotated_ts[window_mask]

        if len(window_data) >= 2:
            mid = len(window_data) // 2
            before = window_data.iloc[:mid]['value'].mean()
            after = window_data.iloc[mid:]['value'].mean()
            if abs((after - before) / before) > 0.1 if before != 0 else False:
                context['has_trend_change'] = True

        return context

    def _check_post_event_effect(self, annotated_ts: pd.DataFrame,
                                  ts: pd.Timestamp) -> Optional[str]:
        window_start = ts - timedelta(hours=48)
        mask = (annotated_ts['timestamp'] >= window_start) & \
               (annotated_ts['timestamp'] < ts)
        prior_data = annotated_ts[mask]

        if prior_data.get('is_event', False).any():
            current_mask = annotated_ts['timestamp'] == ts
            if current_mask.any() and not annotated_ts[current_mask]['is_event'].iloc[0]:
                event_rows = prior_data[prior_data['is_event'] == True]
                if not event_rows.empty:
                    return event_rows.iloc[-1].get('event_name', '活动')
        return None

    def _check_near_sampling_gap(self, sampling_gaps: pd.DataFrame,
                                  ts: pd.Timestamp, threshold_hours: int = 6) -> Optional[str]:
        if sampling_gaps.empty:
            return None

        threshold = timedelta(hours=threshold_hours)
        for _, gap in sampling_gaps.iterrows():
            if abs(gap['gap_start'] - ts) < threshold or abs(gap['gap_end'] - ts) < threshold:
                duration = gap['duration']
                return f"持续{duration}的数据中断"
        return None

    def _check_calendar_conflict(self, conflicts: List, ts: pd.Timestamp) -> Optional[str]:
        ts_date = ts.date()
        for conflict in conflicts:
            if hasattr(conflict, 'timestamp') and conflict.timestamp.date() == ts_date:
                return conflict.message
        return None

    def _generate_human_readable(self, anomaly_type: str, value: float,
                                  expected: float, deviation_pct: float,
                                  primary_cause: str, causes: List, evidence: List) -> str:
        direction = "暴涨" if anomaly_type == 'spike' else "暴跌"
        change_desc = f"{deviation_pct:+.1f}%" if deviation_pct != 0 else "无变化"

        cause_desc = self.cause_definitions.get(primary_cause, {}).get('description', '原因待查')

        if primary_cause == 'unknown':
            explanation = (f"该时间点指标发生{direction}，实际值{value:.2f}，"
                          f"预期值{expected:.2f}，偏离{change_desc}。"
                          f"未能匹配到明确的影响因素，建议人工核查。")
        else:
            explanation = (f"该时间点指标发生{direction}，实际值{value:.2f}，"
                          f"预期值{expected:.2f}，偏离{change_desc}。"
                          f"最可能原因是：{cause_desc}。")

        if len(evidence) > 0:
            explanation += " 相关线索：" + "；".join(evidence[:3])

        return explanation
