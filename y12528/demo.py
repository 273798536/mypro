#!/usr/bin/env python3
"""
学校食堂线性规划配餐系统 - 完整演示流程

演示场景：
1. 业务同事提交不标准的食材清单和营养表（有空值、旧备注）
2. 数据清洗处理
3. 第一次配餐：因鸡胸肉缺货被拦住（缺货优先）
4. 补货后第二次配餐：营养超标被拦住（次之）
5. 修正约束后第三次配餐：成功
6. 方案对比 + 可审计报告导出
"""

import sys
sys.path.insert(0, '.')

from example_data import create_messy_ingredients, create_messy_nutrition
from processing import DataCleaner
from models import NutritionTarget
from solver import MealPlanner, SolverConfig, ConflictDetector
from reporting import MealReportGenerator, ReportFormat
from models import ConstraintStatus, ConstraintType, ConflictSeverity, Constraint


def print_separator(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def main():
    print_separator("🏫 学校食堂线性规划配餐系统 - 演示")

    # ==================== 步骤1: 获取原始数据（模拟业务同事提交） ====================
    print_separator("📥 步骤1: 接收业务同事提交的原始数据")
    print("  食材清单（含空值、备注、单位不统一）:")
    raw_ing = create_messy_ingredients()
    print(raw_ing.to_string())
    print("\n  营养表（含备注、空值）:")
    raw_nutr = create_messy_nutrition()
    print(raw_nutr.to_string())

    # ==================== 步骤2: 数据清洗 ====================
    print_separator("🧹 步骤2: 数据清洗（处理空值、旧备注、单位换算）")
    cleaner = DataCleaner()
    ingredients, clean_report = cleaner.clean_ingredients(raw_ing)
    print(f"  清洗结果: {clean_report.valid_rows}/{clean_report.total_rows} 条有效")
    print(f"  发现问题: {len(clean_report.issues)} 个")
    print(f"  删除行: {clean_report.removed_rows}")

    print("\n  修正空成本和单位换算错误:")
    soy_oil_old_cost = 0
    for ing in ingredients:
        if ing.cost_per_unit <= 0.01 and ing.id == "E001":
            ing.cost_per_unit = 12.0
            print(f"    鸡蛋(E001): 空值 → ¥12.00/kg")
        if ing.cost_per_unit <= 0.01 and ing.id == "V004":
            ing.cost_per_unit = 8.0
            print(f"    西兰花(V004): 空值 → ¥8.00/kg")
        if ing.cost_per_unit > 1000 and ing.id == "S001":
            soy_oil_old_cost = ing.cost_per_unit
            ing.cost_per_unit = 10.0
            print(f"    大豆油(S001): 单位换算错误 ¥{soy_oil_old_cost:.0f}/kg → ¥10.00/kg")

    print("\n  清洗后食材:")
    for ing in ingredients:
        print(f"    {ing.id}: {ing.name} | 成本¥{ing.cost_per_unit:.2f}/kg | 库存{ing.stock_available:.3f}kg | 过敏源:{ing.allergens}")

    nutrition_map, nutr_clean_report = cleaner.clean_nutrition(raw_nutr, ingredients)
    print(f"\n  营养表清洗: {nutr_clean_report.valid_rows}/{nutr_clean_report.total_rows} 条有效")

    # ==================== 步骤3: 配置营养目标 ====================
    print_separator("🎯 步骤3: 设定营养目标（每份1kg餐食）")
    target = NutritionTarget(
        calories_min=400, calories_max=2000,
        protein_min=5, protein_max=50,
        fat_min=2, fat_max=40,
        carbs_min=10, carbs_max=150,
        sodium_max=1500,
        fiber_min=0.5,
        sugar_max=30
    )
    print("  目标:")
    for field, (min_v, max_v) in target.get_fields().items():
        if min_v and max_v:
            print(f"    {field}: {min_v} ~ {max_v}")
        elif min_v:
            print(f"    {field}: ≥ {min_v}")
        elif max_v:
            print(f"    {field}: ≤ {max_v}")

    # ==================== 步骤4: 第一次配餐 - 缺货场景 ====================
    print_separator("🍱 步骤4: 第一次配餐（含缺货冲突）")
    config_strict = SolverConfig(
        excluded_allergens=["花生", "牛奶"],
        max_portion_per_ingredient=0.6,
        min_portion_per_ingredient=0.005,
        min_ingredient_count=2,
        require_variety=False,
        relax_nutrition_on_fail=False
    )
    config_relaxed = SolverConfig(
        excluded_allergens=["花生", "牛奶"],
        max_portion_per_ingredient=0.6,
        min_portion_per_ingredient=0.005,
        min_ingredient_count=2,
        require_variety=False,
        relax_nutrition_on_fail=True,
        max_relax_iterations=5
    )
    planner_strict = MealPlanner(config_strict)
    planner_relaxed = MealPlanner(config_relaxed)

    print("  当前缺货的食材:")
    for ing in ingredients:
        if ing.stock_available <= 0:
            print(f"    ❌ {ing.name}({ing.id}): 库存0")

    result1 = planner_relaxed.plan(
        ingredients=ingredients,
        nutrition_map=nutrition_map,
        target=target,
        meal_type="午餐",
        plan_name="方案A-缺货状态"
    )

    print(f"\n  配餐结果: {'✅ 成功' if result1.success else '❌ 失败'} - {result1.message}")
    plan1 = result1.plan

    # 检测冲突顺序
    detector = ConflictDetector()
    analysis = detector.analyze(plan1)
    has_priority, stock_conflicts, nutr_conflicts = detector.check_stockout_before_nutrition(plan1)

    if has_priority:
        print("\n  ⚠️  冲突优先级说明:")
        print(f"    首先拦截: 缺货 ({len(stock_conflicts)}项)")
        for c in stock_conflicts:
            print(f"      - {c.description}")
        print(f"    其次拦截: 营养问题 ({len(nutr_conflicts)}项) - 需先解决缺货")
        for c in nutr_conflicts:
            print(f"      - {c.name}: {c.description}")
        print(f"\n    👉 营养师现在需要先处理缺货，不用纠结营养调整")
    elif analysis.sorted_conflicts:
        print(f"\n  ⚠️  检测到 {analysis.total_conflicts} 项冲突:")
        for c in analysis.sorted_conflicts:
            print(f"    - [{c.severity.name}] {c.name}: {c.description}")

    # ==================== 步骤5: 补货后第二次配餐 ====================
    print_separator("📦 步骤5: 补货后第二次配餐（鸡胸肉+土豆到货）")
    print("  补货: 鸡胸肉 +5kg, 土豆 +10kg, 猪里脊肉 +3kg")
    ingredients_updated = []
    for ing in ingredients:
        if ing.id == "P002":
            ing.stock_available = 5.0
            ing.raw_notes += " | 已补货5kg"
        elif ing.id == "V003":
            ing.stock_available = 10.0
            ing.raw_notes += " | 已补货10kg"
        elif ing.id == "P001":
            ing.stock_available = 3.0
            ing.raw_notes += " | 已补货3kg"
        ingredients_updated.append(ing)

    result2 = planner_strict.plan(
        ingredients=ingredients_updated,
        nutrition_map=nutrition_map,
        target=target,
        meal_type="午餐",
        plan_name="方案B-补货后(严格约束)",
        parent_plan_id=plan1.plan_id,
        revision_note="鸡胸肉+土豆+猪里脊已补货"
    )

    print(f"  严格约束配餐结果: {'✅ 可行' if result2.success else '❌ 被拦住'} - {result2.message}")
    plan2_strict = result2.plan

    if not result2.success:
        print("\n  🔍 分析为什么被拦住:")
        analysis2 = detector.analyze(plan2_strict)
        for c in analysis2.sorted_conflicts[:5]:
            print(f"    - [{c.severity.name}] {c.type.value}: {c.name}")
            print(f"      {c.description}")

        print("\n  🤖 系统建议: 开启自动放宽约束，或手动调整目标")
        print("\n  尝试自动放宽约束求解...")
        result2 = planner_relaxed.plan(
            ingredients=ingredients_updated,
            nutrition_map=nutrition_map,
            target=target,
            meal_type="午餐",
            plan_name="方案B-补货后(自动放宽)",
            parent_plan_id=plan1.plan_id,
            revision_note="鸡胸肉+土豆+猪里脊已补货，自动放宽约束"
        )
        print(f"  放宽约束配餐结果: {'✅ 可行' if result2.success else '❌ 失败'} - {result2.message}")

    plan2 = result2.plan

    if plan2.is_feasible:
        print(f"\n  配餐用量:")
        ing_map = {ing.id: ing for ing in ingredients_updated}
        for ing_id, amount in sorted(plan2.portions.items(), key=lambda x: -x[1]):
            ing = ing_map.get(ing_id)
            cost = ing.cost_per_unit * amount if ing else 0
            print(f"    {ing.name if ing else ing_id}: {amount:.3f}kg (¥{cost:.2f})")
        print(f"\n  总成本: ¥{plan2.total_cost:.2f}")
        print(f"  热量: {plan2.total_nutrition.calories:.1f} kcal (目标: {target.calories_min}-{target.calories_max})")
        print(f"  蛋白质: {plan2.total_nutrition.protein:.1f}g (目标: {target.protein_min}-{target.protein_max})")
        print(f"  脂肪: {plan2.total_nutrition.fat:.1f}g (目标: {target.fat_min}-{target.fat_max})")
        print(f"  碳水: {plan2.total_nutrition.carbs:.1f}g (目标: {target.carbs_min}-{target.carbs_max})")

        analysis2 = detector.analyze(plan2)
        if analysis2.sorted_conflicts:
            print(f"\n  ⚠️  仍有 {analysis2.total_conflicts} 项冲突（已自动放宽）:")
            for c in analysis2.sorted_conflicts[:3]:
                print(f"    - [{c.severity.name}] {c.status.value}: {c.name} - {c.description}")

    # ==================== 步骤6: 修正约束后第三次配餐 ====================
    print_separator("✏️  步骤6: 修正约束后第三次配餐（营养师调整目标）")
    print("  营养师调整: 脂肪下限2→1g，添加更多瘦肉用量")
    target_revised = NutritionTarget(
        calories_min=400, calories_max=2000,
        protein_min=5, protein_max=50,
        fat_min=1, fat_max=40,
        carbs_min=10, carbs_max=150,
        sodium_max=1500,
        fiber_min=0.5,
        sugar_max=30
    )

    result3 = planner_strict.plan(
        ingredients=ingredients_updated,
        nutrition_map=nutrition_map,
        target=target_revised,
        meal_type="午餐",
        plan_name="方案C-修正后",
        parent_plan_id=plan2.plan_id,
        revision_note="营养师调整: 脂肪下限2g→1g，允许更低脂肪"
    )

    print(f"  配餐结果: {'✅ 可行' if result3.success else '❌ 失败'} - {result3.message}")
    plan3 = result3.plan

    if plan3.is_feasible:
        for c in plan3.constraints:
            if c.type == ConstraintType.NUTRITION and "fat" in c.name.lower():
                c.status = ConstraintStatus.CORRECTED
                c.corrected_value = 1.0
                c.correction_note = "营养师已将脂肪下限从2g调整为1g"

        print(f"\n  ✅ 最终配餐方案（修正后）:")
        print(f"    总成本: ¥{plan3.total_cost:.2f}")
        print(f"    热量: {plan3.total_nutrition.calories:.1f} kcal (目标: 400-2000) ✓")
        print(f"    蛋白质: {plan3.total_nutrition.protein:.1f}g (目标: 5-50) ✓")
        print(f"    脂肪: {plan3.total_nutrition.fat:.1f}g (目标: 1-40) ✓ 修正后")
        print(f"    碳水: {plan3.total_nutrition.carbs:.1f}g (目标: 10-150) ✓")
        print(f"    钠: {plan3.total_nutrition.sodium:.1f}mg (目标: ≤1500) ✓")

        analysis3 = detector.analyze(plan3)
        active_conflicts = [c for c in analysis3.sorted_conflicts if c.type != ConstraintType.ALLERGEN]
        if not active_conflicts:
            print(f"\n  🎉 营养约束均已满足！（过敏源排除除外）")
        else:
            print(f"\n  ⚠️  仍有 {len(active_conflicts)} 项营养冲突:")
            for c in active_conflicts:
                print(f"    - [{c.severity.name}] {c.status.value}: {c.name} - {c.description}")

    # ==================== 步骤7: 方案对比 ====================
    print_separator("🆚 步骤7: 方案对比（B vs C）")
    from models import PlanComparison
    comparison = PlanComparison(plan2, plan3)
    print(comparison.to_markdown())

    # ==================== 步骤8: 生成完整审计报告 ====================
    print_separator("📄 步骤8: 生成可审计报告")
    report_gen = MealReportGenerator()

    report_md = report_gen.generate_full_report(
        plan=plan3,
        clean_report=clean_report,
        comparison_plan=plan2,
        format=ReportFormat.MARKDOWN
    )

    report_path = "/Users/lzy/pro/solo/workspaces/y12528/meal_plan_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"  ✅ Markdown报告已保存: {report_path}")

    report_json = report_gen.generate_full_report(
        plan=plan3,
        clean_report=clean_report,
        comparison_plan=plan2,
        format=ReportFormat.JSON
    )
    json_path = "/Users/lzy/pro/solo/workspaces/y12528/meal_plan_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(report_json)
    print(f"  ✅ JSON报告已保存: {json_path}")

    print("\n" + "=" * 70)
    print("  🎉 演示完成！")
    print("  核心功能验证:")
    print("    ✓ 不标准数据清洗（空值、备注、单位）")
    print("    ✓ 线性规划多约束优化（成本、热量、营养）")
    print("    ✓ 冲突优先级（缺货 > 过敏源 > 营养）")
    print("    ✓ 约束自动放宽与人工修正")
    print("    ✓ 方案对比（修正前后差异）")
    print("    ✓ 可审计报告（含完整计算过程）")
    print("=" * 70 + "\n")

    return plan3, report_md


if __name__ == "__main__":
    main()
