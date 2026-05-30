#!/usr/bin/env python3
"""测试脚本 - 验证核心功能"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
from multi_objective_carbon.data_cleaner import DataCleaner
from multi_objective_carbon.optimizer import MultiObjectiveOptimizer
from multi_objective_carbon.models import OptimizationConstraint, ObjectiveType

print("=" * 60)
print("核心功能测试")
print("=" * 60)

cleaner = DataCleaner()

emissions_df = pd.read_csv("examples/department_emissions.csv")
budgets_df = pd.read_csv("examples/budget_limits.csv")
projects_df = pd.read_csv("examples/reduction_projects.csv")

print("\n1. 测试数据清洗...")
emissions, _ = cleaner.clean_department_emissions(emissions_df)
budgets, _ = cleaner.clean_budget_limits(budgets_df)
projects, _ = cleaner.clean_reduction_projects(projects_df)

total_emission = sum(e.emission for e in emissions)
total_budget = sum(b.budget_amount for b in budgets if not b.department_id)
available_projects = [p for p in projects if p.status.value != "completed"]
total_project_cost = sum(p.cost for p in available_projects)
total_possible_reduction = sum(p.reduction_potential for p in available_projects)

print(f"   总排放量: {total_emission:.2f} 吨CO2e")
print(f"   公司级预算: {total_budget:.2f} 元")
print(f"   可用项目数: {len(available_projects)}")
print(f"   最大可能减排: {total_possible_reduction:.2f} 吨CO2e")
print(f"   最大减排比例: {total_possible_reduction/total_emission*100:.2f}%")
print(f"   全部项目成本: {total_project_cost:.2f} 元")

print("\n2. 测试宽松约束优化（应该可行）...")
constraint = OptimizationConstraint(
    max_budget_utilization=1.0,
    min_reduction_ratio=0.1,
    allow_over_budget=True
)

optimizer = MultiObjectiveOptimizer(emissions, budgets, projects)
result = optimizer._solve_with_pulp(constraint, ObjectiveType.BALANCE)

if result:
    print(f"   ✓ 找到可行方案")
    print(f"   选中项目: {len(result.selected_projects)} 个")
    print(f"   总成本: {result.total_cost:.2f} 元")
    print(f"   总减排: {result.total_reduction:.2f} 吨CO2e")
    print(f"   预算使用率: {result.budget_utilization*100:.2f}%")
    print(f"   超限金额: {result.over_budget_amount:.2f} 元")

    budget_check = optimizer.check_budget_overrun(result)
    print(f"   预算结论: {budget_check['conclusion']}")
else:
    print(f"   ✗ 未找到可行方案")

print("\n3. 测试中等约束（可能超限）...")
constraint2 = OptimizationConstraint(
    max_budget_utilization=0.8,
    min_reduction_ratio=0.2,
    allow_over_budget=True
)

result2 = optimizer._solve_with_pulp(constraint2, ObjectiveType.BALANCE)
if result2:
    print(f"   ✓ 找到可行方案")
    print(f"   总成本: {result2.total_cost:.2f} 元")
    print(f"   总减排: {result2.total_reduction:.2f} 吨CO2e")
    print(f"   预算使用率: {result2.budget_utilization*100:.2f}%")
    print(f"   超限金额: {result2.over_budget_amount:.2f} 元")

    if result2.over_budget_amount > 0:
        print(f"   ✓ 成功触发预算超限场景")
        budget_check = optimizer.check_budget_overrun(result2)
        print(f"   超限结论: {budget_check['conclusion']}")

print("\n4. 测试帕累托前沿生成...")
pareto = optimizer._generate_pareto_front(constraint, num_points=5)
print(f"   ✓ 生成 {len(pareto)} 个帕累托最优解")
for i, r in enumerate(pareto[:3], 1):
    print(f"   方案{i}: 成本={r.total_cost:.0f}, 减排={r.total_reduction:.1f}, 排名={r.rank}")

print("\n5. 测试冲突检测...")
from multi_objective_carbon.conflict_detector import ConflictDetector
detector = ConflictDetector(emissions, budgets, projects)
conflicts = detector.get_all_conflicts(result, constraint)
print(f"   ✓ 检测到 {len(conflicts)} 个冲突")
for c in conflicts[:2]:
    print(f"   - [{c.conflict_type}] {c.description}")
    print(f"     建议: {c.suggestions[0] if c.suggestions else '无'}")

print("\n" + "=" * 60)
print("核心功能测试完成！")
print("=" * 60)
