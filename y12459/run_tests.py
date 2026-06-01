#!/usr/bin/env python3

from core import BoundaryTestSuite

test_suite = BoundaryTestSuite(seed=42)
results = test_suite.run_all_tests()

for result in results:
    print(f"【{result['test_name']}】")
    print(f"   结果一致: {'✓' if result['is_consistent'] else '✗'}")
    print(f"   分数 Run1: {result['final_score_run1']:.1f}, Run2: {result['final_score_run2']:.1f}")
    print(f"   音量遮盖: {result['volume_mask_count']} 次")
    print(f"   回放步数 Run1/Run2: {result['replay_steps']}")
    if result['differences']:
        print(f"   差异: {result['differences'][:3]}")
    print()

summary = test_suite.get_summary()
print('=' * 60)
print('【测试总结】')
print(f"   总测试数: {summary['total_tests']}")
print(f"   一致性通过率: {summary['consistent_results']}/{summary['total_tests']} ({summary['success_rate']*100:.0f}%)")
print(f"   全部通过: {'✓ 是' if summary['all_consistent'] else '✗ 否'}")
print('=' * 60)
