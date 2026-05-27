from datetime import datetime
from typing import List, Dict, Any, Optional
from io import BytesIO
import base64
import json

import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams
rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei']
rcParams['axes.unicode_minus'] = False

from . import models, schemas
from .models import Currency, ExposureStatus


def export_exposure_to_excel(records: List[models.ExposureRecord],
                            alerts: List[models.Alert]) -> bytes:
    output = BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        exposure_data = []
        for rec in records:
            exposure_data.append({
                '记录日期': rec.record_date.strftime('%Y-%m-%d %H:%M:%S'),
                '币种': rec.currency,
                '订单总额': rec.total_order_amount,
                '合约总额': rec.total_contract_amount,
                '净敞口(原币)': rec.net_exposure,
                '净敞口(CNY)': rec.net_exposure_cny,
                '覆盖率': f"{rec.coverage_ratio * 100:.1f}%",
                '状态': rec.status,
                '记录ID': rec.id
            })

        if exposure_data:
            df_exposure = pd.DataFrame(exposure_data)
            df_exposure.to_excel(writer, sheet_name='敞口记录', index=False)

        alert_data = []
        for alert in alerts:
            alert_data.append({
                '创建时间': alert.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                '预警类型': alert.alert_type,
                '严重程度': alert.severity,
                '消息': alert.message,
                '关联订单ID': alert.related_order_id if alert.related_order_id else '',
                '关联合约ID': alert.related_contract_id if alert.related_contract_id else '',
                '是否已处理': '是' if alert.is_resolved else '否',
                '处理备注': alert.resolution_note if alert.resolution_note else '',
                '处理时间': alert.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if alert.resolved_at else ''
            })

        if alert_data:
            df_alerts = pd.DataFrame(alert_data)
            df_alerts.to_excel(writer, sheet_name='预警记录', index=False)

    return output.getvalue()


def generate_exposure_chart(results: List[schemas.ExposureCalculationResult]) -> str:
    currencies = [r.currency for r in results]
    net_exposures = [abs(r.net_exposure_cny) for r in results]
    coverage_ratios = [r.coverage_ratio * 100 for r in results]
    limit_usages = [r.limit_usage * 100 for r in results]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    colors = ['#2ECC71' if r.status == ExposureStatus.NORMAL
              else '#F39C12' if r.status == ExposureStatus.WARNING
              else '#E74C3C' for r in results]

    bars = ax1.bar(currencies, net_exposures, color=colors, alpha=0.8)
    ax1.set_title('各币种净敞口(CNY)', fontsize=12, fontweight='bold')
    ax1.set_ylabel('净敞口 (CNY)')
    ax1.grid(axis='y', alpha=0.3)

    for bar, val in zip(bars, net_exposures):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2., height,
                f'{val:,.0f}', ha='center', va='bottom', fontsize=9)

    x = range(len(currencies))
    width = 0.35
    ax2.bar([i - width/2 for i in x], coverage_ratios, width,
            label='覆盖率(%)', color='#3498DB', alpha=0.8)
    ax2.bar([i + width/2 for i in x], limit_usages, width,
            label='限额使用率(%)', color='#E67E22', alpha=0.8)
    ax2.set_title('覆盖率与限额使用率', fontsize=12, fontweight='bold')
    ax2.set_xticks(x)
    ax2.set_xticklabels(currencies)
    ax2.set_ylabel('百分比 (%)')
    ax2.legend()
    ax2.grid(axis='y', alpha=0.3)
    ax2.axhline(y=80, color='#F39C12', linestyle='--', alpha=0.7, label='预警线(80%)')
    ax2.axhline(y=100, color='#E74C3C', linestyle='--', alpha=0.7, label='限额线(100%)')

    plt.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close()

    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return img_base64


def generate_trend_chart(records: List[models.ExposureRecord], currency: Currency) -> str:
    currency_records = [r for r in records if r.currency == currency]
    currency_records.sort(key=lambda x: x.record_date)

    if not currency_records:
        return ""

    dates = [r.record_date.strftime('%m-%d %H:%M') for r in currency_records]
    net_exposures = [abs(r.net_exposure_cny) for r in currency_records]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(dates, net_exposures, marker='o', linewidth=2, color='#3498DB', markersize=6)
    ax.fill_between(dates, net_exposures, alpha=0.3, color='#3498DB')

    ax.set_title(f'{currency} 敞口趋势图', fontsize=12, fontweight='bold')
    ax.set_xlabel('时间')
    ax.set_ylabel('净敞口 (CNY)')
    ax.grid(True, alpha=0.3)
    plt.xticks(rotation=45)

    for i, (date, val) in enumerate(zip(dates, net_exposures)):
        if i % max(1, len(dates) // 5) == 0:
            ax.annotate(f'{val:,.0f}', (date, val), textcoords="offset points",
                       xytext=(0, 10), ha='center', fontsize=8)

    plt.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close()

    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return img_base64


def generate_daily_report(results: List[schemas.ExposureCalculationResult],
                         records: List[models.ExposureRecord]) -> Dict[str, Any]:
    summary = {
        'report_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'total_exposure_cny': sum(abs(r.net_exposure_cny) for r in results),
        'currencies': []
    }

    for result in results:
        currency_data = {
            'currency': result.currency,
            'total_orders': result.total_orders,
            'total_contracts': result.total_contracts,
            'net_exposure': result.net_exposure,
            'net_exposure_cny': result.net_exposure_cny,
            'coverage_ratio': f"{result.coverage_ratio * 100:.1f}%",
            'limit_usage': f"{result.limit_usage * 100:.1f}%",
            'status': result.status,
            'alert_count': len(result.alerts),
            'alerts': result.alerts
        }
        summary['currencies'].append(currency_data)

    status_counts = {}
    for result in results:
        status = result.status
        status_counts[status] = status_counts.get(status, 0) + 1

    summary['status_summary'] = status_counts
    summary['total_alerts'] = sum(len(r.alerts) for r in results)

    return summary
