import numpy as np
import pandas as pd


def calculate_mwd(mw_list, weight_list=None):
    mw = np.array(mw_list, dtype=float)
    if weight_list is None:
        w = np.ones_like(mw) / len(mw)
    else:
        w = np.array(weight_list, dtype=float)
        w = w / w.sum()

    mn = 1.0 / np.sum(w / mw)
    mw_avg = np.sum(w * mw)
    mz = np.sum(w * mw ** 2) / np.sum(w * mw)
    mw_mn = mw_avg / mn
    mz_mw = mz / mw_avg
    pdi = mw_mn

    mw_sorted = np.sort(mw)
    w_sorted = w[np.argsort(mw)]
    cum_w = np.cumsum(w_sorted)

    def percentile(p):
        idx = np.searchsorted(cum_w, p / 100.0)
        idx = min(idx, len(mw_sorted) - 1)
        return float(mw_sorted[idx])

    return {
        'Mn': float(mn),
        'Mw': float(mw_avg),
        'Mz': float(mz),
        'Mw/Mn': float(mw_mn),
        'Mz/Mw': float(mz_mw),
        'PDI': float(pdi),
        'Mp': float(mw_sorted[np.argmax(w_sorted)]),
        'M10': percentile(10),
        'M50': percentile(50),
        'M90': percentile(90),
    }


def build_distribution_dataframe(raw_df):
    required_cols = ['分子量', '重量分数']
    if not all(c in raw_df.columns for c in required_cols):
        for col in raw_df.columns:
            cl = col.lower()
            if '分子量' in col or 'molecular' in cl or 'mw' in cl:
                raw_df = raw_df.rename(columns={col: '分子量'})
            if '重量' in col or 'weight' in cl or 'wi' in cl or 'w_' in cl:
                raw_df = raw_df.rename(columns={col: '重量分数'})
    if '分子量' not in raw_df.columns and raw_df.shape[1] >= 1:
        raw_df = raw_df.rename(columns={raw_df.columns[0]: '分子量'})
    if '重量分数' not in raw_df.columns and raw_df.shape[1] >= 2:
        raw_df = raw_df.rename(columns={raw_df.columns[1]: '重量分数'})

    df = raw_df[['分子量', '重量分数']].copy()
    df['分子量'] = pd.to_numeric(df['分子量'], errors='coerce')
    df['重量分数'] = pd.to_numeric(df['重量分数'], errors='coerce')
    df = df.dropna()
    df = df.sort_values('分子量').reset_index(drop=True)
    return df


def distribution_points(df):
    mw = df['分子量'].values
    w = df['重量分数'].values
    w_norm = w / w.sum()
    cum = np.cumsum(w_norm)
    log_mw = np.log10(mw)
    return {
        'mw': mw.tolist(),
        'log_mw': log_mw.tolist(),
        'weight': w_norm.tolist(),
        'cumulative': cum.tolist(),
    }


def detect_anomalies(df, stats, batch_no, run_id, thresholds=None):
    anomalies = []
    if thresholds is None:
        thresholds = {
            'pdi_high': 3.0,
            'pdi_low': 1.0,
            'mn_min': 500,
            'mn_max': 1_000_000,
            'zero_weight_ratio': 0.3,
        }

    if stats['PDI'] > thresholds['pdi_high']:
        anomalies.append({
            'type': 'pdi_high',
            'severity': 'warning',
            'title': '多分散指数(PDI)偏高',
            'description': f'当前 PDI = {stats["PDI"]:.3f}，超过警戒值 {thresholds["pdi_high"]}。通常表明分子量分布过宽，可能由聚合反应条件波动、终止反应异常或混样导致。',
            'suggestion': '建议核查聚合温度、引发剂用量及反应时间；必要时重复 GPC 测试确认。',
            'safety_note': 'PDI 过宽可能影响材料力学性能重现性，用于批量生产前需额外验证。',
            'batch_no': batch_no,
            'run_id': run_id,
        })
    elif stats['PDI'] < thresholds['pdi_low']:
        anomalies.append({
            'type': 'pdi_low',
            'severity': 'info',
            'title': '多分散指数(PDI)异常偏低',
            'description': f'当前 PDI = {stats["PDI"]:.3f}，低于典型值 {thresholds["pdi_low"]}。若不是活性聚合样品，需警惕测试条件或数据处理问题。',
            'suggestion': '请确认色谱柱分离范围是否匹配，以及样品浓度是否合理。',
            'safety_note': '无直接安全风险，但可能导致 Mn/Mw 计算失真。',
            'batch_no': batch_no,
            'run_id': run_id,
        })

    if stats['Mn'] < thresholds['mn_min'] or stats['Mn'] > thresholds['mn_max']:
        anomalies.append({
            'type': 'mn_out_of_range',
            'severity': 'warning',
            'title': '数均分子量超出常规范围',
            'description': f'当前 Mn = {stats["Mn"]:.0f}，超出常规区间 [{thresholds["mn_min"]}, {thresholds["mn_max"]}]。',
            'suggestion': '请核对样品类型与预期分子量范围，并确认 GPC 标准曲线是否适用。',
            'safety_note': '低分子量组分可能存在残留单体/寡聚物气味或皮肤刺激性风险。',
            'batch_no': batch_no,
            'run_id': run_id,
        })

    zero_ratio = (df['重量分数'] <= 0).sum() / len(df)
    if zero_ratio > thresholds['zero_weight_ratio']:
        anomalies.append({
            'type': 'sparse_data',
            'severity': 'warning',
            'title': '数据点有效率偏低',
            'description': f'{zero_ratio * 100:.0f}% 的数据点重量分数为 0 或缺失，统计结果可靠性下降。',
            'suggestion': '请检查原始数据文件是否完整、积分区间是否设置正确。',
            'safety_note': '数据质量问题本身无安全风险，但基于不可靠数据得出的结论需谨慎使用。',
            'batch_no': batch_no,
            'run_id': run_id,
        })

    if df['分子量'].duplicated().any():
        dup_count = df['分子量'].duplicated().sum()
        anomalies.append({
            'type': 'duplicate_mw',
            'severity': 'info',
            'title': '分子量取值有重复',
            'description': f'检测到 {dup_count} 个重复的分子量取值。若为自动积分数据一般可接受；若为手工录入请核对。',
            'suggestion': '可在导入前去重或忽略本提示。',
            'safety_note': '无安全风险。',
            'batch_no': batch_no,
            'run_id': run_id,
        })

    return anomalies
