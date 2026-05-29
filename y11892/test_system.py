from models import CallRecord, CustomerLevel, SkillType
from store import store
from fairness_service import fairness_service
from report_generator import report_generator
from data_seed import seed_sample_data

seed_sample_data()
print('=== 样本数据加载成功 ===')
print(f'来电记录数: {len(store.get_all_calls())}')
print(f'坐席数: {len(store.get_all_agents())}')
print(f'策略数: {len(store.get_all_strategies())}')

result = fairness_service.calculate_fairness_score()
print()
print('=== 公平性评分计算成功 ===')
print(f'综合评分: {result.overall_score} {result.score_unit}')
print(f'适用范围: {result.applicable_scope}')
print(f'数据版本: {result.data_version}')
print()
print('=== 公平性指标 ===')
for metric in result.metrics:
    status = '正常' if metric.is_normal else '异常'
    print(f'  {metric.metric_name}: {metric.value} {metric.unit} [{status}]')
    print(f'    适用范围: {metric.applicable_scope}, 阈值: {metric.threshold}{metric.unit}')

print()
print('=== 待确认异常 ===')
for item in result.pending_confirmations:
    print(f'  [{item.severity}] {item.anomaly_type.value}: {item.description}')

print()
print('=== 策略对比 ===')
for strategy, score in result.strategy_comparison.items():
    print(f'  {strategy}: {score}分')

print()
print('=== 失败原因 ===')
for reason in result.failure_reasons:
    print(f'  - {reason}')

print()
print('=== 测试派单策略补录 ===')
log = fairness_service.supplement_strategy_and_track_changes('S001', '测试管理员')
print(f'补录日志ID: {log.log_id}')
print(f'受影响来电数: {len(log.affected_calls)}')
print(f'结论变更数: {len(log.conclusion_changes)}')
for change in log.conclusion_changes[:3]:
    print(f'  {change.call_id}: {change.original_conclusion} -> {change.new_conclusion}')

print()
print('=== 生成下载报告 ===')
report, terminal_summary = report_generator.generate_download_report(result)
print(terminal_summary)
print(f'数据一致性: {"一致" if report.data_consistent else "不一致"}')
print(f'VIP结论数: {len(report.vip_conclusions)}')
print(f'普通用户结论数: {len(report.regular_conclusions)}')

print()
print('=== 系统验证通过 ===')
