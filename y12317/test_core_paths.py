"""
全面验证脚本 - 测试矩阵一致性评分器的所有核心路径
"""
import numpy as np
from matrix_scorer import (
    MatrixConsistencyScorer,
    JudgeScore,
    SupplierMaterial,
    InspectionReport,
)


def test_scenario_1_weight_not_normalized():
    """测试场景1：权重不归一（直接权重未归一）"""
    print("\n" + "=" * 80)
    print("测试场景1：权重不归一（直接权重未归一）")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
        JudgeScore(
            judge_id="J002",
            judge_name="王专家",
            comparison_matrix=None,
            direct_weights=np.array([0.6, 0.3, 0.15, 0.1]),
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="甲科技",
            criteria_scores={"技术实力": 90.0, "交付能力": 85.0, "报价合理性": 80.0, "服务响应": 85.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：检测到JUDGE_WEIGHT_NOT_NORMALIZED
    has_judge_norm_warning = any("JUDGE_WEIGHT_NOT_NORMALIZED" in d for d in result["diagnoses"])
    print(f"✅ 检测到评委直接权重未归一化警告: {has_judge_norm_warning}")

    # 验证：检测到WEIGHT_NOT_NORMALIZED
    has_consensus_norm_warning = any("WEIGHT_NOT_NORMALIZED" in d for d in result["diagnoses"])
    print(f"✅ 检测到聚合权重未归一化警告: {has_consensus_norm_warning}")

    # 验证：原因分析正确（提到王专家）
    correct_cause = any("王专家" in d and "直接权重" in d for d in result["diagnoses"])
    print(f"✅ 原因分析正确指向王专家的直接权重: {correct_cause}")

    # 验证：没有错误的"浮点累积"原因
    no_wrong_cause = not any("浮点累积" in d for d in result["diagnoses"])
    print(f"✅ 没有错误的'浮点累积'原因: {no_wrong_cause}")

    # 验证：自动归一化
    consensus_sum = sum(result["consensus_weights"])
    print(f"✅ 共识权重已自动归一化，和为{consensus_sum:.6f}: {abs(consensus_sum - 1.0) < 1e-6}")

    return all([has_judge_norm_warning, has_consensus_norm_warning, correct_cause, no_wrong_cause, abs(consensus_sum - 1.0) < 1e-6])


def test_scenario_2_all_normalized():
    """测试场景2：所有权重都归一化"""
    print("\n" + "=" * 80)
    print("测试场景2：所有权重都归一化")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
        JudgeScore(
            judge_id="J002",
            judge_name="李经理",
            comparison_matrix=None,
            direct_weights=np.array([0.5, 0.3, 0.1, 0.1]),
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="甲科技",
            criteria_scores={"技术实力": 90.0, "交付能力": 85.0, "报价合理性": 80.0, "服务响应": 85.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：没有JUDGE_WEIGHT_NOT_NORMALIZED
    no_judge_norm_warning = not any("JUDGE_WEIGHT_NOT_NORMALIZED" in d for d in result["diagnoses"])
    print(f"✅ 没有评委权重未归一化警告: {no_judge_norm_warning}")

    # 验证：WEIGHT_NORMALIZED正常
    has_normalized_info = any("WEIGHT_NORMALIZED" in d for d in result["diagnoses"])
    print(f"✅ 聚合权重归一化正常: {has_normalized_info}")

    # 验证：共识权重和为1
    consensus_sum = sum(result["consensus_weights"])
    print(f"✅ 共识权重和为{consensus_sum:.6f}: {abs(consensus_sum - 1.0) < 1e-6}")

    return all([no_judge_norm_warning, has_normalized_info, abs(consensus_sum - 1.0) < 1e-6])


def test_scenario_3_cr_exceed_judge_excluded():
    """测试场景3：评委一致性不通过被排除"""
    print("\n" + "=" * 80)
    print("测试场景3：评委一致性不通过被排除")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
        JudgeScore(
            judge_id="J002",
            judge_name="刘总",
            comparison_matrix=np.array([
                [1.0, 2.0, 9.0, 1.0],
                [1/2, 1.0, 1/9, 9.0],
                [1/9, 9.0, 1.0, 2.0],
                [1.0, 1/9, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="甲科技",
            criteria_scores={"技术实力": 90.0, "交付能力": 85.0, "报价合理性": 80.0, "服务响应": 85.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：检测到CR_EXCEED
    has_cr_exceed = any("CR_EXCEED" in d for d in result["diagnoses"])
    print(f"✅ 检测到CR超限错误: {has_cr_exceed}")

    # 验证：元数据中刘总被排除
    lius_metadata = result["judge_metadata"]["J002"]
    is_excluded = not lius_metadata["included_in_consensus"]
    print(f"✅ 刘总被正确排除: {is_excluded}")

    # 验证：元数据中有排除原因
    has_excluded_reason = "一致性检验不通过" in lius_metadata["excluded_reason"]
    print(f"✅ 有明确的排除原因: {has_excluded_reason}")

    # 验证：在报告中显示未参与聚合的评委
    has_excluded_in_report = any("未参与聚合" in d for d in result["diagnoses"]) or ("judge_metadata" in result and any(not m["included_in_consensus"] for m in result["judge_metadata"].values()))
    print(f"✅ 被排除评委有记录: {has_excluded_in_report}")

    # 验证：实际参与聚合的只有张主任
    included_count = sum(1 for m in result["judge_metadata"].values() if m["included_in_consensus"])
    print(f"✅ 参与聚合的评委数量正确: {included_count} == 1? {included_count == 1}")

    return all([has_cr_exceed, is_excluded, has_excluded_reason, has_excluded_in_report, included_count == 1])


def test_scenario_4_missing_scores():
    """测试场景4：打分缺项"""
    print("\n" + "=" * 80)
    print("测试场景4：打分缺项")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=["报价合理性"],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="丙网络",
            criteria_scores={"技术实力": 80.0, "交付能力": 75.0, "服务响应": 85.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：检测到评委缺项
    has_judge_missing = any("SCORE_MISSING" in d and "张主任" in d and "报价合理性" in d for d in result["diagnoses"])
    print(f"✅ 检测到评委张主任缺少报价合理性打分: {has_judge_missing}")

    # 验证：检测到供应商缺项
    has_supplier_missing = any("SUPPLIER_SCORE_MISSING" in d and "丙网络" in d and "报价合理性" in d for d in result["diagnoses"])
    print(f"✅ 检测到供应商丙网络缺少报价合理性打分: {has_supplier_missing}")

    return all([has_judge_missing, has_supplier_missing])


def test_scenario_5_score_conflict():
    """测试场景5：材料打架（检查报告与供应商资料冲突）"""
    print("\n" + "=" * 80)
    print("测试场景5：材料打架（检查报告与供应商资料冲突）")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="乙信息",
            criteria_scores={"技术实力": 88.0, "交付能力": 90.0, "报价合理性": 82.0, "服务响应": 95.0},
        ),
    ]

    reports = [
        InspectionReport(
            report_id="R001",
            supplier_id="S001",
            inspector="赵工",
            criteria_scores={"技术实力": 65.0},
            notes="差异较大",
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports(reports)

    result = scorer.run()

    # 验证：检测到SCORE_CONFLICT
    has_conflict = any("SCORE_CONFLICT" in d for d in result["diagnoses"])
    print(f"✅ 检测到评分冲突: {has_conflict}")

    # 验证：提示中明确说"不要自行修改口径"
    no_modify = any("不要自行修改口径" in d for d in result["diagnoses"])
    print(f"✅ 提示明确说明不要自行修改口径: {no_modify}")

    # 验证：具体到检查员、供应商、准则
    specific_details = any("赵工" in d and "乙信息" in d and "技术实力" in d for d in result["diagnoses"])
    print(f"✅ 提示具体到检查员、供应商、准则: {specific_details}")

    return all([has_conflict, no_modify, specific_details])


def test_scenario_6_extreme_judge():
    """测试场景6：极端评委检测"""
    print("\n" + "=" * 80)
    print("测试场景6：极端评委检测")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
        JudgeScore(
            judge_id="J002",
            judge_name="李经理",
            comparison_matrix=np.array([
                [1.0, 2.0, 8.0, 4.0],
                [1/2, 1.0, 6.0, 3.0],
                [1/8, 1/6, 1.0, 1/3],
                [1/4, 1/3, 3.0, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
        JudgeScore(
            judge_id="J003",
            judge_name="王专家",
            comparison_matrix=None,
            direct_weights=np.array([0.9, 0.05, 0.03, 0.02]),
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="甲科技",
            criteria_scores={"技术实力": 90.0, "交付能力": 85.0, "报价合理性": 80.0, "服务响应": 85.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=1.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：检测到EXTREME_JUDGE
    has_extreme = any("EXTREME_JUDGE" in d for d in result["diagnoses"])
    print(f"✅ 检测到极端评委: {has_extreme}")

    # 验证：王专家被检测为极端
    wang_is_extreme = any("王专家" in d and "EXTREME_JUDGE" in d for d in result["diagnoses"])
    print(f"✅ 王专家被检测为极端: {wang_is_extreme}")

    # 验证：极端评委结果中包含权重来源
    has_weight_source = all("weight_source" in ej for ej in result["extreme_judges"])
    print(f"✅ 极端评委结果包含权重来源: {has_weight_source}")

    # 验证：极端评委诊断消息中包含权重来源
    has_source_in_detail = any("权重来源" in d for d in result["diagnoses"])
    print(f"✅ 极端评委诊断包含权重来源: {has_source_in_detail}")

    return all([has_extreme, wang_is_extreme, has_weight_source, has_source_in_detail])


def test_scenario_7_ranking():
    """测试场景7：排名与解释"""
    print("\n" + "=" * 80)
    print("测试场景7：排名与解释")
    print("=" * 80)

    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judges = [
        JudgeScore(
            judge_id="J001",
            judge_name="张主任",
            comparison_matrix=np.array([
                [1.0, 3.0, 5.0, 7.0],
                [1/3, 1.0, 3.0, 5.0],
                [1/5, 1/3, 1.0, 2.0],
                [1/7, 1/5, 1/2, 1.0],
            ]),
            direct_weights=None,
            raw_scores=None,
            missing_criteria=[],
        ),
    ]

    suppliers = [
        SupplierMaterial(
            supplier_id="S001",
            supplier_name="甲科技",
            criteria_scores={"技术实力": 95.0, "交付能力": 85.0, "报价合理性": 70.0, "服务响应": 85.0},
        ),
        SupplierMaterial(
            supplier_id="S002",
            supplier_name="乙信息",
            criteria_scores={"技术实力": 85.0, "交付能力": 90.0, "报价合理性": 85.0, "服务响应": 90.0},
        ),
    ]

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=2.0)
    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports([])

    result = scorer.run()

    # 验证：有排名结果
    has_rankings = len(result["rankings"]) == 2
    print(f"✅ 有排名结果: {has_rankings}")

    # 验证：排名有贡献分解
    has_contribution = all("contribution" in r for r in result["rankings"])
    print(f"✅ 排名有贡献分解: {has_contribution}")

    # 验证：有RANK_EXPLANATION
    has_explanation = any("RANK_EXPLANATION" in d for d in result["diagnoses"])
    print(f"✅ 有排名解释: {has_explanation}")

    # 验证：排名顺序正确（技术实力权重最高，甲科技技术实力95最高）
    rank1_correct = result["rankings"][0]["supplier_name"] == "甲科技"
    print(f"✅ 第1名正确（甲科技）: {rank1_correct}")

    return all([has_rankings, has_contribution, has_explanation, rank1_correct])


def main():
    print("\n" + "=" * 80)
    print("矩阵一致性评分器 - 核心路径验证测试")
    print("=" * 80)

    test_results = []

    test_results.append(("场景1：权重不归一（直接权重）", test_scenario_1_weight_not_normalized()))
    test_results.append(("场景2：所有权重归一化", test_scenario_2_all_normalized()))
    test_results.append(("场景3：评委一致性不通过被排除", test_scenario_3_cr_exceed_judge_excluded()))
    test_results.append(("场景4：打分缺项", test_scenario_4_missing_scores()))
    test_results.append(("场景5：材料打架", test_scenario_5_score_conflict()))
    test_results.append(("场景6：极端评委检测", test_scenario_6_extreme_judge()))
    test_results.append(("场景7：排名与解释", test_scenario_7_ranking()))

    print("\n" + "=" * 80)
    print("测试结果汇总")
    print("=" * 80)

    all_passed = True
    for name, passed in test_results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} | {name}")
        if not passed:
            all_passed = False

    print("-" * 80)
    if all_passed:
        print("  所有测试通过！✅")
    else:
        print("  部分测试失败！请检查。")

    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
