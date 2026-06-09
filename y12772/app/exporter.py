import os
import pandas as pd
from datetime import datetime
from . import EXPORT_DIR
from .storage import Storage


def _stat_rows():
    return [
        ('Mn', '数均分子量', '按分子数目加权的平均分子量'),
        ('Mw', '重均分子量', '按分子重量加权的平均分子量'),
        ('Mz', 'Z均分子量', '对高分子量组分更敏感的统计量'),
        ('Mp', '峰位分子量', '重量分数最高处对应的分子量'),
        ('Mw/Mn', '多分散比', '分布宽度的基本量度'),
        ('PDI', '多分散指数(PDI)', '等同于 Mw/Mn'),
        ('Mz/Mw', 'Z/M 比', '反映高分子量尾部延伸程度'),
        ('M10', '10%分位分子量', '累积重量 10% 处的分子量'),
        ('M50', '50%分位分子量(中位数)', '累积重量 50% 处的分子量'),
        ('M90', '90%分位分子量', '累积重量 90% 处的分子量'),
    ]


def export_batch_excel(batch_no):
    batch = Storage.get_batch(batch_no)
    if not batch:
        return None

    runs = [r for r in Storage.get_runs() if r['batch_no'] == batch_no]
    anomalies = Storage.get_anomalies_for_batch(batch_no)

    fname = f'MWD_{batch_no}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    fpath = os.path.join(EXPORT_DIR, fname)

    with pd.ExcelWriter(fpath, engine='openpyxl') as writer:
        summary = pd.DataFrame({
            '项目': ['批号', '首次导入时间', '最近一次导入时间', '累计导入次数', '备注'],
            '内容': [
                batch_no,
                batch.get('first_seen', ''),
                batch.get('last_seen', ''),
                batch.get('run_count', 0),
                batch.get('meta', {}).get('note', ''),
            ],
        })
        summary.to_excel(writer, sheet_name='摘要', index=False)

        stat_rows = _stat_rows()
        latest = batch.get('latest_stats', {})
        stats_df = pd.DataFrame({
            '符号': [r[0] for r in stat_rows],
            '中文名称': [r[1] for r in stat_rows],
            '说明': [r[2] for r in stat_rows],
            '最新结果': [latest.get(r[0], '') for r in stat_rows],
        })
        if batch.get('stats_history') and len(batch['stats_history']) > 1:
            for i, h in enumerate(batch['stats_history'][:-1]):
                stats_df[f'第{i + 1}次结果'] = [h.get(r[0], '') for r in stat_rows]
        stats_df.to_excel(writer, sheet_name='统计结果', index=False)

        dp = batch.get('latest_data_points', {})
        if dp.get('mw'):
            dist_df = pd.DataFrame({
                '分子量(M)': dp['mw'],
                'log10(M)': dp['log_mw'],
                '归一化重量分数 dW/dlogM': dp['weight'],
                '累积重量分数': dp['cumulative'],
            })
            dist_df.to_excel(writer, sheet_name='分布曲线数据', index=False)

        if runs:
            runs_df = pd.DataFrame([
                {
                    '运行编号': r['run_id'],
                    '处理时间': r['timestamp'],
                    '数据点数': r.get('row_count', ''),
                    'Mn': r.get('stats', {}).get('Mn', ''),
                    'Mw': r.get('stats', {}).get('Mw', ''),
                    'PDI': r.get('stats', {}).get('PDI', ''),
                    '是否与前次重复': '是(已合并)' if r.get('conflict_info') and r['conflict_info'].get('exists') else '否',
                }
                for r in runs
            ])
            runs_df.to_excel(writer, sheet_name='处理记录', index=False)

        if anomalies:
            anom_df = pd.DataFrame([
                {
                    '异常编号': a['anomaly_id'],
                    '关联运行': a.get('run_id', ''),
                    '严重程度': '警告' if a.get('severity') == 'warning' else ('提示' if a.get('severity') == 'info' else a.get('severity')),
                    '标题': a.get('title', ''),
                    '具体描述': a.get('description', ''),
                    '处理建议': a.get('suggestion', ''),
                    '安全备注': a.get('safety_note', ''),
                    '检测时间': a.get('timestamp', ''),
                }
                for a in anomalies
            ])
            anom_df.to_excel(writer, sheet_name='异常记录', index=False)
        else:
            pd.DataFrame({'提示': ['本次及历史记录未检测到异常。']}).to_excel(
                writer, sheet_name='异常记录', index=False)

        dup_note = pd.DataFrame({
            '说明': [
                '关于批号重复：',
                '同一批号多次导入时，系统不会生成两份互相矛盾的结论，而是：',
                '  1) 在"统计结果"表中同时列出每次导入的计算值，便于对比；',
                '  2) 在"处理记录"表中逐次登记来源；',
                '  3) "摘要"表中的"最新结果"以最近一次导入为准。',
                '',
                '如发现两次结果差异过大，请核对：样品是否同批次、GPC测试条件是否一致、积分区间是否相同。',
            ]
        })
        dup_note.to_excel(writer, sheet_name='关于批号重复', index=False)

    return fpath


def export_all_batches_excel():
    batches = Storage.get_batches()
    if not batches:
        return None

    fname = f'MWD_汇总_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    fpath = os.path.join(EXPORT_DIR, fname)

    rows = []
    stat_rows = _stat_rows()
    for bn, b in batches.items():
        s = b.get('latest_stats', {})
        row = {
            '批号': bn,
            '首次导入': b.get('first_seen', ''),
            '最近导入': b.get('last_seen', ''),
            '累计导入次数': b.get('run_count', 0),
        }
        for k, cn, _ in stat_rows:
            row[cn] = s.get(k, '')
        row['异常条数'] = len(Storage.get_anomalies_for_batch(bn))
        rows.append(row)
    pd.DataFrame(rows).to_excel(fpath, index=False)
    return fpath
