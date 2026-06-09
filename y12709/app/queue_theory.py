import math
import json
import numpy as np
from datetime import datetime
from scipy.special import factorial


DUPLICATE_CHECK_FIELDS = ['arrival_rate', 'service_rate', 'window_count', 'queue_model']
INVALID_REASON_NO_CALCULATION = '未完成计算'
INVALID_REASON_STALE_CALCULATION = '计算结果已过期（图表截图晚到）'
INVALID_REASON_DUPLICATE = '重复样本'
INVALID_REASON_REVIEW_REJECTED = '复核未通过'


def calculate_mm1(arrival_rate, service_rate):
    lam = arrival_rate
    mu = service_rate
    if lam >= mu:
        return None, '到达率必须小于服务率，否则排队系统将无限增长'

    rho = lam / mu
    P0 = 1 - rho
    L = rho / (1 - rho)
    Lq = rho ** 2 / (1 - rho)
    W = 1 / (mu - lam)
    Wq = lam / (mu * (mu - lam))

    return {
        'model': 'M/M/1',
        'arrival_rate': lam,
        'service_rate': mu,
        'utilization': rho,
        'idle_probability': P0,
        'avg_queue_length': Lq,
        'avg_system_length': L,
        'avg_wait_time': Wq,
        'avg_system_time': W,
        'window_count': 1
    }, None


def _erlang_c(c, rho):
    numerator = (c * rho) ** c / factorial(c) * 1 / (1 - rho)
    denominator = sum([(c * rho) ** k / factorial(k) for k in range(c)]) + numerator
    return numerator / denominator


def calculate_mmc(arrival_rate, service_rate, window_count):
    lam = arrival_rate
    mu = service_rate
    c = window_count
    if c < 1:
        return None, '窗口数必须大于等于1'
    if c == 1:
        return calculate_mm1(lam, mu)

    rho = lam / (c * mu)
    if rho >= 1:
        return None, '系统利用率必须小于1，即到达率必须小于窗口数×服务率'

    r = lam / mu

    sum_term = sum([r ** k / factorial(k) for k in range(c)])
    last_term = r ** c / factorial(c) / (1 - rho)
    P0 = 1 / (sum_term + last_term)

    Pw = _erlang_c(c, rho)
    Lq = Pw * rho / (1 - rho)
    Wq = Lq / lam
    W = Wq + 1 / mu
    L = lam * W

    return {
        'model': f'M/M/{c}',
        'arrival_rate': lam,
        'service_rate': mu,
        'utilization': rho,
        'idle_probability': P0,
        'avg_queue_length': Lq,
        'avg_system_length': L,
        'avg_wait_time': Wq,
        'avg_system_time': W,
        'window_count': c,
        'wait_probability': Pw
    }, None


def calculate(arrival_rate, service_rate, window_count=1, model='M/M/c'):
    if window_count == 1 or model == 'M/M/1':
        return calculate_mm1(arrival_rate, service_rate)
    return calculate_mmc(arrival_rate, service_rate, window_count)


def generate_explanation(result, for_report=False):
    if not result:
        return ''
    parts = []
    parts.append(f"本样本采用{result['model']}排队模型，到达率λ={result['arrival_rate']}人/单位时间，"
                 f"服务率μ={result['service_rate']}人/单位时间，共{result['window_count']}个服务窗口。")

    util = result['utilization']
    if util < 0.5:
        util_desc = '系统利用率偏低，窗口资源存在较大闲置，可考虑减少窗口或引入其他业务'
    elif util < 0.75:
        util_desc = '系统利用率适中，处于较为理想的运营区间'
    elif util < 0.9:
        util_desc = '系统利用率较高，排队压力偏大，需关注客户等待体验'
    else:
        util_desc = '系统利用率过高，接近饱和状态，客户等待时间将显著增加，建议增设窗口或提升服务效率'
    parts.append(f"系统利用率ρ={util:.2%}，{util_desc}。")

    parts.append(f"窗口空闲概率P₀={result['idle_probability']:.2%}，"
                 f"平均排队长度Lq={result['avg_queue_length']:.2f}人，"
                 f"系统内平均顾客数L={result['avg_system_length']:.2f}人。")

    parts.append(f"顾客平均等待时间Wq={result['avg_wait_time']:.2f}单位时间，"
                 f"平均逗留时间W={result['avg_system_time']:.2f}单位时间。")

    if result.get('wait_probability') is not None:
        Pw = result['wait_probability']
        if Pw < 0.2:
            pw_desc = '绝大多数顾客无需排队即可获得服务'
        elif Pw < 0.5:
            pw_desc = '约半数顾客到达后需要排队等待'
        else:
            pw_desc = '多数顾客到达后需要排队等待，排队现象较为普遍'
        parts.append(f"顾客到达需要排队的概率Pw={Pw:.2%}，{pw_desc}。")

    if for_report:
        parts.append("\n【指标解读】")
        parts.append("• 系统利用率ρ：反映窗口繁忙程度，过高则排队严重，过低则资源浪费。")
        parts.append("• 平均排队长度Lq：顾客到达后平均需要等待的人数。")
        parts.append("• 平均等待时间Wq：顾客从到达至开始接受服务的平均耗时。")
        parts.append("• 排队概率Pw：顾客到达后不能立即服务、需要排队的概率。")

    return ''.join(parts)


def generate_duplicate_explanation(sample, duplicate_of_sample):
    """生成重复样本拦截原因解释（用于复核和导出报告）"""
    parts = []
    parts.append(f"【重复样本拦截说明】")
    parts.append(f"样本编号「{sample.sample_no}」被判定为重复样本，已与样本编号「{duplicate_of_sample.sample_no}」匹配。")
    parts.append(f"匹配依据：到达率λ={sample.arrival_rate}、服务率μ={sample.service_rate}、"
                 f"窗口数={sample.window_count}、排队模型={sample.queue_model} 完全一致。")
    parts.append(f"重复样本的计算结果与原始样本完全相同，无需重复测算。")
    parts.append(f"如需使用该样本，请修改参数后重新提交，或沿用原始样本「{duplicate_of_sample.sample_no}」的测算结论。")
    return '\n'.join(parts)


def check_duplicate(sample_data, existing_samples):
    """检测样本是否为重复样本
    
    Args:
        sample_data: dict, 包含 arrival_rate, service_rate, window_count, queue_model
        existing_samples: list of Sample 对象
    
    Returns:
        (is_duplicate: bool, duplicate_of: Sample or None, reason: str)
    """
    for existing in existing_samples:
        match = True
        for field in DUPLICATE_CHECK_FIELDS:
            s_val = sample_data.get(field)
            e_val = getattr(existing, field, None)
            if field in ['arrival_rate', 'service_rate']:
                if s_val is None or e_val is None or abs(float(s_val) - float(e_val)) > 1e-6:
                    match = False
                    break
            else:
                if s_val != e_val:
                    match = False
                    break
        if match:
            reason = (f"与样本「{existing.sample_no}」参数重复："
                      f"到达率={sample_data.get('arrival_rate')}, "
                      f"服务率={sample_data.get('service_rate')}, "
                      f"窗口数={sample_data.get('window_count')}, "
                      f"模型={sample_data.get('queue_model')}")
            return True, existing, reason
    return False, None, None


def get_affected_conclusions_when_chart_late():
    """当图表截图晚到时，返回受影响的结论列表及说明"""
    return [
        {
            'conclusion': '系统利用率',
            'impact': '图表中实际到达率/服务率可能与录入参数存在偏差，利用率测算可能失真',
            'severity': '高'
        },
        {
            'conclusion': '平均排队长度',
            'impact': '排队长度依赖实际到达分布，图表缺失时无法验证理论值与实际值的吻合度',
            'severity': '高'
        },
        {
            'conclusion': '平均等待时间',
            'impact': '等待时间对服务率波动敏感，无图表佐证时该结论仅为理论估算',
            'severity': '高'
        },
        {
            'conclusion': '系统平均逗留时间',
            'impact': '逗留时间=等待时间+服务时间，两者均可能受图表实际数据影响',
            'severity': '中'
        },
        {
            'conclusion': '排队概率',
            'impact': '排队概率受实际到达波动影响较大，仅在有实测图表时可信度较高',
            'severity': '中'
        }
    ]


def generate_stale_warning():
    """生成计算结果过期警告文本（图表截图晚到场景）"""
    affected = get_affected_conclusions_when_chart_late()
    parts = []
    parts.append("⚠️ 注意：图表截图上传晚于当前计算结果，以下结论可能受影响：")
    for item in affected:
        parts.append(f"  • [{item['severity']}] {item['conclusion']}：{item['impact']}")
    parts.append("建议重新执行计算后再进行复核或导出。")
    return '\n'.join(parts)


def check_sample_validity(sample):
    """月底转交场景：检查样本记录是否可用
    
    Returns:
        (is_valid: bool, reasons: list of str)
    """
    reasons = []

    if sample.status == 'duplicate':
        reasons.append(f"{INVALID_REASON_DUPLICATE}（与样本「{sample.duplicate_of.sample_no if sample.duplicate_of else '?'}」重复）")

    if sample.status == 'invalid':
        reasons.append("样本状态标记为无效")

    if sample.calculation is None and sample.status != 'duplicate':
        reasons.append(INVALID_REASON_NO_CALCULATION)

    if sample.calculation and sample.is_calculation_stale():
        reasons.append(INVALID_REASON_STALE_CALCULATION)

    rejected_review = None
    if sample.reviews:
        for r in sample.reviews:
            if r.status == 'rejected':
                rejected_review = r
                break
    if rejected_review:
        reasons.append(f"{INVALID_REASON_REVIEW_REJECTED}（复核人：{rejected_review.reviewer.real_name if rejected_review.reviewer else '未知'}，"
                       f"意见：{rejected_review.comment or '无'}）")

    return len(reasons) == 0, reasons


def generate_validity_summary(samples):
    """月底转交场景：生成样本批次有效性汇总"""
    total = len(samples)
    valid_count = 0
    invalid_samples = []
    invalid_reason_stats = {}

    for sample in samples:
        is_valid, reasons = check_sample_validity(sample)
        if is_valid:
            valid_count += 1
        else:
            invalid_samples.append({
                'sample_no': sample.sample_no,
                'title': sample.title,
                'reasons': reasons
            })
            for r in reasons:
                invalid_reason_stats[r] = invalid_reason_stats.get(r, 0) + 1

    return {
        'total_count': total,
        'valid_count': valid_count,
        'invalid_count': total - valid_count,
        'valid_rate': valid_count / total if total > 0 else 0,
        'invalid_samples': invalid_samples,
        'invalid_reason_stats': invalid_reason_stats
    }


def recalculate_after_history_answer(sample, history_answer):
    """历史答案补录后，重新计算并更新相关复核标记
    
    Args:
        sample: Sample 对象
        history_answer: HistoryAnswer 对象
    
    Returns:
        (updated_result: dict or None, needs_review_update: list of ReviewRecord, message: str)
    """
    needs_review_update = []
    message = ''

    result, err = calculate(sample.arrival_rate, sample.service_rate,
                            sample.window_count, sample.queue_model)
    if err:
        return None, [], f"历史答案补录后重算失败：{err}"

    explanation = generate_explanation(result)

    for review in sample.reviews:
        if review.status == 'pending':
            needs_review_update.append(review)

    if needs_review_update:
        message = (f"历史答案已补录（来源：{history_answer.source}），"
                   f"有 {len(needs_review_update)} 条待复核记录需要同步更新结论")
    else:
        message = f"历史答案已补录（来源：{history_answer.source}），计算结果已同步更新"

    return result, needs_review_update, message


def batch_review_with_history(samples):
    """批量复核：结合历史答案自动更新
    
    Args:
        samples: list of Sample 对象
    
    Returns:
        dict: 批量复核结果统计
    """
    stats = {
        'total': len(samples),
        'updated_with_history': 0,
        'need_manual_review': 0,
        'auto_approved': 0,
        'errors': []
    }

    for sample in samples:
        try:
            history_count = sample.history_answers.count() if hasattr(sample.history_answers, 'count') else len(sample.history_answers)

            if history_count > 0:
                latest_history = None
                for ha in sample.history_answers:
                    if latest_history is None or ha.recorded_at > latest_history.recorded_at:
                        latest_history = ha
                if latest_history:
                    result, reviews, msg = recalculate_after_history_answer(sample, latest_history)
                    stats['updated_with_history'] += 1
                    if result:
                        stats['auto_approved'] += 1
            else:
                stats['need_manual_review'] += 1
        except Exception as e:
            stats['errors'].append(f"样本「{sample.sample_no}」处理失败：{str(e)}")

    return stats


def export_report_data(samples, include_duplicate_detail=True):
    """导出报告数据（含重复样本拦截原因说明）
    
    Args:
        samples: list of Sample 对象
        include_duplicate_detail: bool, 是否在报告中包含重复样本详细说明
    
    Returns:
        dict: 报告数据，可直接用于渲染或序列化
    """
    report = {
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'summary': generate_validity_summary(samples),
        'samples': []
    }

    for sample in samples:
        item = {
            'sample_no': sample.sample_no,
            'title': sample.title,
            'status': sample.status,
            'owner': sample.owner.real_name if sample.owner else '未知',
            'created_at': sample.created_at.strftime('%Y-%m-%d %H:%M:%S') if sample.created_at else '',
            'parameters': {
                'arrival_rate': sample.arrival_rate,
                'service_rate': sample.service_rate,
                'window_count': sample.window_count,
                'queue_model': sample.queue_model
            }
        }

        is_valid, validity_reasons = check_sample_validity(sample)
        item['is_valid'] = is_valid
        item['validity_reasons'] = validity_reasons

        if sample.status == 'duplicate' and sample.duplicate_of:
            item['duplicate_detail'] = generate_duplicate_explanation(sample, sample.duplicate_of)
        elif sample.status == 'duplicate':
            item['duplicate_detail'] = f"【重复样本拦截说明】样本「{sample.sample_no}」被标记为重复样本，{sample.duplicate_reason or '未记录具体原因'}"

        if sample.calculation:
            item['calculation'] = {
                'utilization': sample.calculation.utilization,
                'avg_queue_length': sample.calculation.avg_queue_length,
                'avg_wait_time': sample.calculation.avg_wait_time,
                'avg_system_time': sample.calculation.avg_system_time,
                'idle_probability': sample.calculation.idle_probability,
                'explanation': sample.calculation.explanation or ''
            }
            calc_dict = {
                'model': f'M/M/{sample.window_count}',
                'arrival_rate': sample.arrival_rate,
                'service_rate': sample.service_rate,
                'utilization': sample.calculation.utilization,
                'idle_probability': sample.calculation.idle_probability,
                'avg_queue_length': sample.calculation.avg_queue_length,
                'avg_system_length': (sample.calculation.avg_system_time or 0) * sample.arrival_rate if sample.calculation.avg_system_time else None,
                'avg_wait_time': sample.calculation.avg_wait_time,
                'avg_system_time': sample.calculation.avg_system_time,
                'window_count': sample.window_count,
                'wait_probability': sample.calculation.service_level
            }
            item['calculation']['explanation_full'] = generate_explanation(calc_dict, for_report=True)

            if sample.is_calculation_stale():
                item['calculation']['stale_warning'] = generate_stale_warning()
                item['calculation']['affected_conclusions'] = get_affected_conclusions_when_chart_late()

        report['samples'].append(item)

    return report


def export_report_text(samples):
    """导出纯文本格式报告（学生只看报告也能明白）"""
    data = export_report_data(samples)
    lines = []

    lines.append("=" * 60)
    lines.append("排队论窗口测算报告")
    lines.append(f"生成时间：{data['generated_at']}")
    lines.append("=" * 60)
    lines.append("")

    s = data['summary']
    lines.append("【批次汇总】")
    lines.append(f"样本总数：{s['total_count']}")
    lines.append(f"有效样本：{s['valid_count']}")
    lines.append(f"无效/不可用样本：{s['invalid_count']}")
    lines.append(f"有效率：{s['valid_rate']:.1%}")
    lines.append("")

    if s['invalid_reason_stats']:
        lines.append("【不可用原因统计】")
        for reason, cnt in s['invalid_reason_stats'].items():
            lines.append(f"  • {reason}：{cnt} 条")
        lines.append("")

    if s['invalid_samples']:
        lines.append("【不可用样本明细】（月底转交时请重点关注）")
        for inv in s['invalid_samples']:
            lines.append(f"  ▶ {inv['sample_no']} - {inv['title']}")
            for r in inv['reasons']:
                lines.append(f"    原因：{r}")
        lines.append("")

    lines.append("-" * 60)
    lines.append("【样本详细报告】")
    lines.append("-" * 60)

    for item in data['samples']:
        lines.append("")
        lines.append(f"■ 样本编号：{item['sample_no']}")
        lines.append(f"  标题：{item['title']}")
        lines.append(f"  提交人：{item['owner']}")
        lines.append(f"  提交时间：{item['created_at']}")
        lines.append(f"  状态：{item['status']}")
        lines.append(f"  是否可用：{'✅ 可用' if item['is_valid'] else '❌ 不可用'}")

        if not item['is_valid']:
            lines.append(f"  不可用原因：")
            for r in item['validity_reasons']:
                lines.append(f"    - {r}")

        p = item['parameters']
        lines.append(f"  参数：到达率λ={p['arrival_rate']}, 服务率μ={p['service_rate']}, "
                     f"窗口数={p['window_count']}, 模型={p['queue_model']}")

        if item.get('duplicate_detail'):
            lines.append("")
            lines.append(f"  {item['duplicate_detail']}")

        if item.get('calculation'):
            calc = item['calculation']
            lines.append("")
            lines.append(f"  【测算结果】")
            lines.append(f"    系统利用率ρ：{calc['utilization']:.2%}" if calc.get('utilization') is not None else "    系统利用率ρ：N/A")
            lines.append(f"    平均排队长度Lq：{calc['avg_queue_length']:.2f}" if calc.get('avg_queue_length') is not None else "    平均排队长度Lq：N/A")
            lines.append(f"    平均等待时间Wq：{calc['avg_wait_time']:.2f}" if calc.get('avg_wait_time') is not None else "    平均等待时间Wq：N/A")
            lines.append(f"    平均逗留时间W：{calc['avg_system_time']:.2f}" if calc.get('avg_system_time') is not None else "    平均逗留时间W：N/A")
            lines.append("")
            lines.append(f"  【结果解读】")
            for expline in calc.get('explanation_full', '').split('。'):
                expline = expline.strip()
                if expline:
                    lines.append(f"    {expline}。")

            if calc.get('stale_warning'):
                lines.append("")
                lines.append(f"  {calc['stale_warning']}")

    lines.append("")
    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    return '\n'.join(lines)


def calculate_optimal_windows(arrival_rate, service_rate,
                              target_wait_time=None, target_util_max=0.85):
    results = []
    for c in range(1, 21):
        r, err = calculate(arrival_rate, service_rate, c)
        if err:
            continue
        meets_target = True
        if target_wait_time and r['avg_wait_time'] > target_wait_time:
            meets_target = False
        if r['utilization'] > target_util_max:
            meets_target = False
        r['meets_target'] = meets_target
        r['explanation'] = generate_explanation(r)
        results.append(r)
    return results
