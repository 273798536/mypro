import os
import json
import base64
import io
import datetime
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from config import EXPORT_DIR


def generate_plot(t, x, x_fit, anomalies, period_info, record_id=None):
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    x_fit = np.asarray(x_fit, dtype=float)
    
    fig, axes = plt.subplots(2, 1, figsize=(10, 8), gridspec_kw={'height_ratios': [3, 1]})
    
    ax1, ax2 = axes
    
    ax1.plot(t, x, 'o', label='实验数据', markersize=3, alpha=0.7)
    ax1.plot(t, x_fit, 'r-', label='拟合曲线', linewidth=2)
    
    anomaly_indices = [a['index'] for a in anomalies if 'index' in a]
    if anomaly_indices:
        anomaly_indices = [i for i in anomaly_indices if i < len(t)]
        if anomaly_indices:
            ax1.plot(t[anomaly_indices], x[anomaly_indices], 
                     'ro', markersize=8, label='异常点', 
                     markeredgecolor='black', markerfacecolor='none')
    
    if period_info and period_info.get('period'):
        T = period_info['period']
        ax1.axvline(x=T, color='g', linestyle='--', alpha=0.5, label=f'周期 T={T:.4f}s')
    
    ax1.set_xlabel('时间 (s)')
    ax1.set_ylabel('位移 (m)')
    ax1.set_title('弹簧振子阻尼振动拟合')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    residuals = x - x_fit
    ax2.plot(t, residuals, 'b.-', markersize=3)
    ax2.axhline(y=0, color='r', linestyle='--', alpha=0.5)
    ax2.set_xlabel('时间 (s)')
    ax2.set_ylabel('残差')
    ax2.set_title('拟合残差')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    plt.close()
    
    buf.seek(0)
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    filename = None
    if record_id:
        filename = f'plot_{record_id}.png'
        filepath = os.path.join(EXPORT_DIR, filename)
        buf.seek(0)
        with open(filepath, 'wb') as f:
            f.write(buf.getvalue())
    
    return img_base64, filename


def generate_report(data, fit_result, anomalies, anomaly_summary, period_peak, validation, record_id):
    t = data['time']
    x = data['displacement']
    
    img_base64, plot_filename = generate_plot(t, x, fit_result['fitted_curve'], anomalies, fit_result, record_id)
    
    report = {
        'record_id': record_id,
        'generated_at': datetime.datetime.now().isoformat(),
        'student_id': data.get('metadata', {}).get('student_id', '未知'),
        'data_source': data.get('source', '未知'),
        'summary': generate_summary(fit_result, anomaly_summary, validation),
        'fit_results': {
            'period': fit_result['period'],
            'frequency': fit_result['frequency'],
            'gamma': fit_result['gamma'],
            'omega': fit_result['omega'],
            'amplitude': fit_result['amplitude'],
            'damping_ratio': fit_result['damping_ratio'],
            'quality_factor': fit_result['quality_factor'],
            'r_squared': fit_result['r_squared'],
            'fit_success': fit_result['fit_success'],
            'fit_message': fit_result['fit_message']
        },
        'anomalies': anomalies,
        'anomaly_summary': anomaly_summary,
        'period_peak_estimate': period_peak,
        'validation': validation,
        'plot_image': img_base64,
        'plot_filename': plot_filename,
        'corrections': []
    }
    
    return report


def generate_summary(fit_result, anomaly_summary, validation):
    parts = []
    
    if fit_result['fit_success']:
        parts.append("✓ 拟合成功")
    else:
        parts.append("✗ 拟合失败")
    
    parts.append(f"周期 T = {fit_result['period']:.4f} s")
    parts.append(f"阻尼系数 γ = {fit_result['gamma']:.6f} s⁻¹")
    parts.append(f"拟合优度 R² = {fit_result['r_squared']:.4f}")
    
    if anomaly_summary['total'] > 0:
        parts.append(f"检测到 {anomaly_summary['total']} 个异常点")
    
    if validation.get('warnings'):
        parts.append(f"{len(validation['warnings'])} 条警告")
    
    return " | ".join(parts)


def save_report_json(report, record_id):
    filename = f'report_{record_id}.json'
    filepath = os.path.join(EXPORT_DIR, filename)
    
    report_copy = report.copy()
    report_copy.pop('plot_image', None)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(report_copy, f, ensure_ascii=False, indent=2)
    
    return filename


def export_report_data(report):
    lines = []
    
    lines.append("=" * 60)
    lines.append("弹簧振子实验拟合报告")
    lines.append("=" * 60)
    lines.append(f"报告编号: {report['record_id']}")
    lines.append(f"生成时间: {report['generated_at']}")
    lines.append(f"学生编号: {report['student_id']}")
    lines.append(f"数据来源: {report['data_source']}")
    lines.append("")
    
    lines.append("-" * 60)
    lines.append("一、数据摘要")
    lines.append("-" * 60)
    lines.append(report['summary'])
    lines.append("")
    
    lines.append("-" * 60)
    lines.append("二、拟合结果")
    lines.append("-" * 60)
    lines.append(f"周期 T = {report['fit_results']['period']:.6f} s")
    lines.append(f"频率 f = {report['fit_results']['frequency']:.6f} Hz")
    lines.append(f"角频率 ω = {report['fit_results']['omega']:.6f} rad/s")
    lines.append(f"振幅 A = {report['fit_results']['amplitude']:.6f} m")
    lines.append(f"阻尼系数 γ = {report['fit_results']['gamma']:.6f} s⁻¹")
    lines.append(f"阻尼比 ζ = {report['fit_results']['damping_ratio']:.6f}")
    lines.append(f"品质因数 Q = {report['fit_results']['quality_factor']:.6f}")
    lines.append(f"拟合优度 R² = {report['fit_results']['r_squared']:.6f}")
    lines.append("")
    
    lines.append("-" * 60)
    lines.append("三、异常检测")
    lines.append("-" * 60)
    lines.append(f"异常点总数: {report['anomaly_summary']['total']}")
    for atype, count in report['anomaly_summary']['by_type'].items():
        lines.append(f"  - {atype}: {count} 个")
    if report['anomaly_summary']['total'] > 0:
        lines.append("")
        lines.append("异常详情:")
        for i, anomaly in enumerate(report['anomalies'][:10]):
            if 'index' in anomaly:
                lines.append(f"  [{i+1}] 索引 {anomaly['index']}: {anomaly.get('type', 'unknown')}")
            else:
                lines.append(f"  [{i+1}] {anomaly}")
    lines.append("")
    
    lines.append("-" * 60)
    lines.append("四、数据验证")
    lines.append("-" * 60)
    if report['validation'].get('errors'):
        lines.append("错误:")
        for err in report['validation']['errors']:
            lines.append(f"  ✗ {err}")
    if report['validation'].get('warnings'):
        lines.append("警告:")
        for warn in report['validation']['warnings']:
            lines.append(f"  ⚠ {warn}")
    if not report['validation'].get('errors') and not report['validation'].get('warnings'):
        lines.append("✓ 数据验证通过")
    lines.append("")
    
    lines.append("=" * 60)
    
    return "\n".join(lines)
