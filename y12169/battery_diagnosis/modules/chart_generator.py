import json
import base64
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Union
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib import rcParams

from ..core.models import (
    DiagnosisResult, FactorContribution, AnomalyInstance,
    TripRecord, RangeEstimate, AnomalyType
)
from ..core.config import EXPORTS_DIR

rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
rcParams['axes.unicode_minus'] = False

ANOMALY_COLORS = {
    AnomalyType.LOW_TEMPERATURE: '#3498db',
    AnomalyType.FAST_CHARGING_EXCESS: '#e74c3c',
    AnomalyType.ABNORMAL_TRIP: '#f39c12',
    AnomalyType.BATTERY_DEGRADATION: '#9b59b6',
    AnomalyType.DRIVING_HABIT: '#1abc9c',
}

ANOMALY_LABELS = {
    AnomalyType.LOW_TEMPERATURE: '低温影响',
    AnomalyType.FAST_CHARGING_EXCESS: '快充过多',
    AnomalyType.ABNORMAL_TRIP: '行程异常',
    AnomalyType.BATTERY_DEGRADATION: '电池衰减',
    AnomalyType.DRIVING_HABIT: '驾驶习惯',
}


class ChartGenerator:
    def _fig_to_base64(self, fig) -> str:
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_base64

    def _fig_to_file(self, fig, filename: str) -> Path:
        filepath = EXPORTS_DIR / filename
        fig.savefig(filepath, format='png', dpi=150, bbox_inches='tight')
        plt.close(fig)
        return filepath

    def generate_factor_breakdown_chart(
        self,
        factors: List[FactorContribution],
        to_base64: bool = True
    ) -> Optional[Union[str, Path]]:
        if not factors:
            return None

        labels = [ANOMALY_LABELS.get(f.factor, f.factor.value) for f in factors]
        sizes = [f.contribution_percent for f in factors]
        colors = [ANOMALY_COLORS.get(f.factor, '#95a5a6') for f in factors]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

        wedges, texts, autotexts = ax1.pie(
            sizes, labels=labels, colors=colors,
            autopct='%1.1f%%', startangle=90
        )
        ax1.set_title('续航衰减因素分解', fontsize=14, fontweight='bold')
        for text in texts:
            text.set_fontsize(10)
        for autotext in autotexts:
            autotext.set_fontsize(10)
            autotext.set_color('white')

        y_pos = range(len(factors))
        ax2.barh(y_pos, sizes, color=colors, alpha=0.8)
        ax2.set_yticks(y_pos)
        ax2.set_yticklabels(labels, fontsize=10)
        ax2.set_xlabel('贡献度 (%)', fontsize=12)
        ax2.set_title('各因素影响程度', fontsize=14, fontweight='bold')

        for i, v in enumerate(sizes):
            ax2.text(v + 1, i, f'{v:.1f}%', va='center', fontsize=10)

        ax2.set_xlim(0, max(sizes) * 1.15 if sizes else 100)

        plt.tight_layout()

        if to_base64:
            return self._fig_to_base64(fig)
        else:
            return self._fig_to_file(fig, f'factor_breakdown_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png')

    def generate_range_comparison_chart(
        self,
        range_estimate: RangeEstimate,
        to_base64: bool = True
    ) -> Optional[Union[str, Path]]:
        fig, ax = plt.subplots(figsize=(10, 6))

        categories = ['标称续航', '实际估算续航']
        values = [range_estimate.nominal_range_km, range_estimate.actual_estimated_range_km]
        colors = ['#2ecc71', '#e74c3c']

        bars = ax.bar(categories, values, color=colors, width=0.5, alpha=0.8)

        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + 5,
                    f'{value:.0f} km', ha='center', va='bottom', fontsize=12, fontweight='bold')

        deficit = range_estimate.nominal_range_km - range_estimate.actual_estimated_range_km
        if deficit > 0:
            ax.annotate(f'↓ {deficit:.0f} km',
                        xy=(1, range_estimate.actual_estimated_range_km + deficit / 2),
                        fontsize=11, color='#c0392b', ha='center',
                        arrowprops=dict(arrowstyle='->', color='#c0392b'))

        ax.set_ylabel('续航里程 (km)', fontsize=12)
        ax.set_title(f'续航对比 - 置信度: {range_estimate.confidence_score:.2f}',
                     fontsize=14, fontweight='bold')
        ax.set_ylim(0, max(values) * 1.2)
        ax.grid(axis='y', alpha=0.3)

        plt.tight_layout()

        if to_base64:
            return self._fig_to_base64(fig)
        else:
            return self._fig_to_file(fig, f'range_comparison_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png')

    def generate_trip_consumption_chart(
        self,
        trips: List[TripRecord],
        anomalies: List[AnomalyInstance],
        to_base64: bool = True
    ) -> Optional[Union[str, Path]]:
        if not trips:
            return None

        sorted_trips = sorted(trips, key=lambda t: t.start_time)

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10), sharex=True)

        dates = [t.start_time for t in sorted_trips]
        consumptions = []
        for t in sorted_trips:
            soc_used = max(0.1, t.start_soc - t.end_soc)
            energy_used = (soc_used / 100.0) * 70.0
            consumption = (energy_used / t.distance_km) * 100.0 if t.distance_km > 0 else 0
            consumptions.append(min(50, max(5, consumption)))

        ax1.plot(dates, consumptions, marker='o', linewidth=2, markersize=6,
                 color='#3498db', label='实际能耗', alpha=0.8)
        ax1.axhline(y=15, color='#2ecc71', linestyle='--', linewidth=2, label='基准能耗 (15kWh/100km)')
        ax1.axhline(y=25, color='#e74c3c', linestyle=':', linewidth=2, label='高能耗阈值')

        anomalous_trip_ids = set()
        for anomaly in anomalies:
            anomalous_trip_ids.update(anomaly.trip_ids)

        for i, (t, cons) in enumerate(zip(sorted_trips, consumptions)):
            if t.trip_id in anomalous_trip_ids:
                ax1.plot(dates[i], cons, marker='*', markersize=12,
                         color='#e74c3c', markeredgecolor='white', markeredgewidth=2)

        ax1.set_ylabel('能耗 (kWh/100km)', fontsize=12)
        ax1.set_title('行程能耗趋势', fontsize=14, fontweight='bold')
        ax1.legend(fontsize=10)
        ax1.grid(alpha=0.3)
        ax1.set_ylim(0, max(consumptions) * 1.2 if consumptions else 50)

        temps = [t.avg_temp_c for t in sorted_trips]
        ax2.bar(dates, temps, width=0.5, color='#f39c12', alpha=0.7, label='平均温度')
        ax2.axhline(y=0, color='#3498db', linestyle='--', linewidth=1.5, label='0°C 阈值')

        for i, (t, temp) in enumerate(zip(sorted_trips, temps)):
            if t.trip_id in anomalous_trip_ids:
                ax2.plot(dates[i], temp, marker='*', markersize=10,
                         color='#e74c3c', markeredgecolor='white', markeredgewidth=2)

        ax2.set_ylabel('温度 (°C)', fontsize=12)
        ax2.set_title('环境温度变化', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(alpha=0.3)

        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax2.xaxis.set_major_locator(mdates.AutoDateLocator())
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)

        plt.tight_layout()

        if to_base64:
            return self._fig_to_base64(fig)
        else:
            return self._fig_to_file(fig, f'trip_consumption_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png')

    def generate_anomaly_severity_chart(
        self,
        anomalies: List[AnomalyInstance],
        to_base64: bool = True
    ) -> Optional[Union[str, Path]]:
        if not anomalies:
            return None

        severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        sorted_anomalies = sorted(anomalies, key=lambda a: severity_order.get(a.severity, 0), reverse=True)

        fig, ax = plt.subplots(figsize=(12, 6))

        labels = []
        values = []
        colors = []
        for a in sorted_anomalies:
            label = ANOMALY_LABELS.get(a.anomaly_type, a.anomaly_type.value)
            labels.append(f"{label}\n({a.severity})")
            values.append(severity_order.get(a.severity, 1))
            colors.append(ANOMALY_COLORS.get(a.anomaly_type, '#95a5a6'))

        bars = ax.bar(range(len(values)), values, color=colors, alpha=0.8, width=0.6)

        for i, (bar, anomaly) in enumerate(zip(bars, sorted_anomalies)):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + 0.1,
                    f'影响 {anomaly.affected_range_km:.0f}km',
                    ha='center', va='bottom', fontsize=10)

        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, fontsize=10)
        ax.set_ylabel('严重程度', fontsize=12)
        ax.set_title('异常检测结果 - 严重程度分布', fontsize=14, fontweight='bold')
        ax.set_ylim(0, 5)
        ax.set_yticks([1, 2, 3, 4])
        ax.set_yticklabels(['低', '中', '高', '严重'], fontsize=10)
        ax.grid(axis='y', alpha=0.3)

        plt.tight_layout()

        if to_base64:
            return self._fig_to_base64(fig)
        else:
            return self._fig_to_file(fig, f'anomaly_severity_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png')

    def generate_all_charts(
        self,
        diagnosis_result: DiagnosisResult,
        trips: List[TripRecord],
        to_base64: bool = True
    ) -> Dict[str, Optional[Union[str, Path]]]:
        return {
            'factor_breakdown': self.generate_factor_breakdown_chart(
                diagnosis_result.factor_breakdown, to_base64
            ),
            'range_comparison': self.generate_range_comparison_chart(
                diagnosis_result.range_estimate, to_base64
            ),
            'trip_consumption': self.generate_trip_consumption_chart(
                trips, diagnosis_result.anomalies, to_base64
            ),
            'anomaly_severity': self.generate_anomaly_severity_chart(
                diagnosis_result.anomalies, to_base64
            ),
        }


def generate_charts(
    diagnosis_result: DiagnosisResult,
    trips: List[TripRecord],
    to_base64: bool = True
) -> Dict[str, Optional[Union[str, Path]]]:
    generator = ChartGenerator()
    return generator.generate_all_charts(diagnosis_result, trips, to_base64)
