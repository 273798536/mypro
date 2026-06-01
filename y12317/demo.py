import numpy as np
from matrix_scorer import (
    MatrixConsistencyScorer,
    JudgeScore,
    SupplierMaterial,
    InspectionReport,
)


def create_demo_data():
    criteria = ["技术实力", "交付能力", "报价合理性", "服务响应"]

    judge_a = JudgeScore(
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
    )

    judge_b = JudgeScore(
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
        missing_criteria=["报价合理性"],
    )

    judge_c = JudgeScore(
        judge_id="J003",
        judge_name="王专家",
        comparison_matrix=None,
        direct_weights=np.array([0.6, 0.3, 0.15, 0.1]),
        raw_scores=None,
        missing_criteria=[],
    )

    judge_d = JudgeScore(
        judge_id="J004",
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
    )

    supplier1 = SupplierMaterial(
        supplier_id="S001",
        supplier_name="甲科技",
        criteria_scores={
            "技术实力": 92.0,
            "交付能力": 85.0,
            "报价合理性": 78.0,
            "服务响应": 88.0,
        },
    )

    supplier2 = SupplierMaterial(
        supplier_id="S002",
        supplier_name="乙信息",
        criteria_scores={
            "技术实力": 88.0,
            "交付能力": 90.0,
            "报价合理性": 82.0,
            "服务响应": 95.0,
        },
    )

    supplier3 = SupplierMaterial(
        supplier_id="S003",
        supplier_name="丙网络",
        criteria_scores={
            "技术实力": 80.0,
            "交付能力": 75.0,
            "服务响应": 85.0,
        },
    )

    report1 = InspectionReport(
        report_id="R001",
        supplier_id="S001",
        inspector="赵工",
        criteria_scores={
            "技术实力": 92.0,
            "交付能力": 85.0,
        },
        notes="现场核验，资料属实",
    )

    report2 = InspectionReport(
        report_id="R002",
        supplier_id="S002",
        inspector="赵工",
        criteria_scores={
            "技术实力": 65.0,
            "报价合理性": 82.0,
        },
        notes="技术实力评分与供应商资料差异较大，需核实",
    )

    report3 = InspectionReport(
        report_id="R003",
        supplier_id="S999",
        inspector="钱工",
        criteria_scores={
            "技术实力": 85.0,
        },
        notes="未知供应商",
    )

    return criteria, [judge_a, judge_b, judge_c, judge_d], [supplier1, supplier2, supplier3], [report1, report2, report3]


def main():
    print("矩阵一致性评分器 — 演示程序")
    print("=" * 80)
    print("本演示包含以下场景：")
    print("  1. 权重不归一（部分评委被排除后聚合权重总和非1）")
    print("  2. 打分缺项（供应商缺失报价合理性打分）")
    print("  3. 极端评委（王专家权重明显偏离群体）")
    print("  4. 材料打架（检查报告与供应商资料评分差异大）")
    print("  5. 未知供应商（检查报告引用不存在的供应商）")
    print("=" * 80)

    criteria, judges, suppliers, reports = create_demo_data()

    scorer = MatrixConsistencyScorer(criteria=criteria, cr_threshold=0.1, extreme_z_threshold=1.0)

    scorer.load_judge_scores(judges)
    scorer.load_supplier_materials(suppliers)
    scorer.load_inspection_reports(reports)

    result = scorer.run()
    scorer.print_report(result)


if __name__ == "__main__":
    main()
