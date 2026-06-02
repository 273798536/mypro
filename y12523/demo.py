#!/usr/bin/env python3
from src import (
    TaxCalculator,
    BatchTaxCalculator,
    ReportGenerator,
    save_excel_report,
    TaxBracket,
    EmployeeIncome,
    DeductionItem,
    SourceInfo,
    SourceType,
    AnomalyType
)
from datetime import datetime


def create_china_tax_brackets():
    return [
        TaxBracket(
            lower_bound=0,
            upper_bound=3000,
            rate=0.03,
            quick_deduction=0,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=3000,
            upper_bound=12000,
            rate=0.10,
            quick_deduction=210,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=12000,
            upper_bound=25000,
            rate=0.20,
            quick_deduction=1410,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=25000,
            upper_bound=35000,
            rate=0.25,
            quick_deduction=2660,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=35000,
            upper_bound=55000,
            rate=0.30,
            quick_deduction=4410,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=55000,
            upper_bound=80000,
            rate=0.35,
            quick_deduction=7160,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        ),
        TaxBracket(
            lower_bound=80000,
            upper_bound=None,
            rate=0.45,
            quick_deduction=15160,
            source=SourceInfo(
                source_type=SourceType.TAX_BUREAU,
                source_id="TAX-2024-V1",
                operator="税务局",
                remark="个人所得税综合所得税率表（月度）"
            )
        )
    ]


def create_realistic_sample_data():
    employees = []
    
    employees.append(EmployeeIncome(
        employee_id="EMP001",
        employee_name="张三",
        year=2024,
        month=11,
        salary=15000,
        bonus=2000,
        other_income=0,
        unit="元",
        source=SourceInfo(
            source_type=SourceType.HR_SYSTEM,
            source_id="HR-202411-001",
            operator="HR系统自动导入",
            remark="2024年11月工资"
        ),
        deductions=[
            DeductionItem(
                deduction_id="DED001-1",
                name="基本养老保险",
                amount=1200,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-001",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED001-2",
                name="基本医疗保险",
                amount=300,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-001",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED001-3",
                name="失业保险",
                amount=75,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-001",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED001-4",
                name="住房公积金",
                amount=1800,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-HF-001",
                    operator="财务系统",
                    remark="公积金系统同步"
                )
            )
        ]
    ))
    
    employees.append(EmployeeIncome(
        employee_id="EMP002",
        employee_name="李四",
        year=2024,
        month=11,
        salary=25000,
        bonus=5000,
        other_income=1000,
        unit="元",
        source=SourceInfo(
            source_type=SourceType.HR_SYSTEM,
            source_id="HR-202411-002",
            operator="HR系统自动导入",
            remark="2024年11月工资+季度奖金"
        ),
        deductions=[
            DeductionItem(
                deduction_id="DED002-1",
                name="基本养老保险",
                amount=2000,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-002",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED002-2",
                name="基本医疗保险",
                amount=500,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-002",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED002-3",
                name="失业保险",
                amount=125,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-002",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED002-4",
                name="住房公积金",
                amount=3000,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.SUPPLEMENT,
                    source_id="SUP-HF-002",
                    operator="财税助理-小王",
                    remark="11月28日补录，员工补缴上月差额",
                    entry_time=datetime(2024, 11, 28, 14, 30)
                ),
                is_supplement=True,
                supplement_reason="员工补缴上月公积金差额",
                previous_amount=2800,
                version=2
            )
        ],
        version=2,
        previous_total=28800
    ))
    
    employees.append(EmployeeIncome(
        employee_id="EMP003",
        employee_name="王五",
        year=2024,
        month=11,
        salary=8000,
        bonus=0,
        other_income=0,
        unit="元",
        source=SourceInfo(
            source_type=SourceType.MANUAL_ENTRY,
            source_id="MAN-202411-003",
            operator="财税助理-小李",
            remark="新入职员工，HR系统尚未同步"
        ),
        deductions=[
            DeductionItem(
                deduction_id="DED003-1",
                name="基本养老保险",
                amount=640,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.MANUAL_ENTRY,
                    source_id="MAN-INS-003",
                    operator="财税助理-小李",
                    remark="人工录入"
                )
            )
        ]
    ))
    
    employees.append(EmployeeIncome(
        employee_id="EMP004",
        employee_name="赵六",
        year=2024,
        month=11,
        salary=22000,
        bonus=0,
        other_income=0,
        unit="元",
        source=SourceInfo(
            source_type=SourceType.HR_SYSTEM,
            source_id="HR-202411-004",
            operator="HR系统自动导入",
            remark="2024年11月工资"
        ),
        deductions=[
            DeductionItem(
                deduction_id="DED004-1",
                name="基本养老保险",
                amount=1760,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-004",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED004-2",
                name="基本医疗保险",
                amount=440,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-004",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED004-3",
                name="失业保险",
                amount=110,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-004",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED004-4",
                name="住房公积金",
                amount=2640,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-HF-004",
                    operator="财务系统",
                    remark="公积金系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED004-5",
                name="子女教育专项附加扣除",
                amount=1000,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.SUPPLEMENT,
                    source_id="SUP-SPC-004",
                    operator="财税助理-小王",
                    remark="11月29日补录，员工补交材料",
                    entry_time=datetime(2024, 11, 29, 9, 15)
                ),
                is_supplement=True,
                supplement_reason="员工提交子女教育专项附加扣除材料较晚"
            )
        ]
    ))
    
    employees.append(EmployeeIncome(
        employee_id="EMP005",
        employee_name="孙七",
        year=2024,
        month=11,
        salary=10000,
        bonus=0,
        other_income=0,
        unit="元",
        source=SourceInfo(
            source_type=SourceType.HR_SYSTEM,
            source_id="HR-202411-005",
            operator="HR系统自动导入",
            remark="2024年11月工资"
        ),
        deductions=[
            DeductionItem(
                deduction_id="DED005-1",
                name="基本养老保险",
                amount=800,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-005",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED005-2",
                name="基本医疗保险",
                amount=200,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-005",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED005-3",
                name="失业保险",
                amount=50,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-INS-005",
                    operator="财务系统",
                    remark="社保系统同步"
                )
            ),
            DeductionItem(
                deduction_id="DED005-4",
                name="住房公积金",
                amount=1200,
                month=11,
                source=SourceInfo(
                    source_type=SourceType.FINANCE_SYSTEM,
                    source_id="FIN-HF-005",
                    operator="财务系统",
                    remark="公积金系统同步"
                )
            )
        ]
    ))
    
    return employees


def main():
    print("=" * 60)
    print("          分段函数税费计算器 - 演示程序")
    print("=" * 60)
    print()
    
    print("【1/4】初始化税率表...")
    tax_brackets = create_china_tax_brackets()
    calculator = TaxCalculator(tax_brackets, threshold=5000)
    print(f"   ✓ 加载 {len(tax_brackets)} 级税率")
    print()
    
    print("【2/4】加载样例数据（包含真实场景异常）...")
    employees = create_realistic_sample_data()
    print(f"   ✓ 加载 {len(employees)} 名员工数据")
    print("     数据包含：")
    print("       - 正常工资（张三）")
    print("       - 有奖金+补录公积金+覆盖历史（李四）")
    print("       - 新员工缺扣除项（王五）")
    print("       - 有专项附加扣除补录（赵六）")
    print("       - 数据完整（孙七）")
    print()
    
    print("【3/4】批量计算税费...")
    batch_calculator = BatchTaxCalculator(calculator)
    results, anomalies = batch_calculator.calculate_batch(employees)
    print(f"   ✓ 计算完成，共 {len(results)} 条结果")
    print(f"   ⚠ 检测到 {len(anomalies)} 条异常")
    print()
    
    print("【4/4】生成报告...")
    report_gen = ReportGenerator()
    
    text_report = report_gen.generate_summary_text(results)
    with open("data/tax_report.txt", "w", encoding="utf-8") as f:
        f.write(text_report)
    print("   ✓ 文本报告已保存: data/tax_report.txt")
    
    excel_data = report_gen.generate_simple_excel_data(results)
    save_excel_report(excel_data, "data/tax_report.xlsx")
    print("   ✓ Excel报告已保存: data/tax_report.xlsx")
    
    forwarding_note = report_gen.generate_forwarding_note(results)
    with open("data/forwarding_note.txt", "w", encoding="utf-8") as f:
        f.write(forwarding_note)
    print("   ✓ 转发说明已保存: data/forwarding_note.txt")
    print()
    
    print("=" * 60)
    print("                   异常清单摘要")
    print("=" * 60)
    anomaly_summary = {}
    for anomaly in anomalies:
        atype = anomaly.anomaly_type.value
        if atype not in anomaly_summary:
            anomaly_summary[atype] = []
        anomaly_summary[atype].append(f"{anomaly.employee_name}: {anomaly.description}")
    
    for atype, items in anomaly_summary.items():
        print(f"\n【{atype}】({len(items)}条)")
        for item in items:
            print(f"  - {item}")
    print()
    
    print("=" * 60)
    print("                   演示完成！")
    print("=" * 60)
    print()
    print("查看报告文件：")
    print("  1. data/tax_report.txt - 详细文本报告")
    print("  2. data/tax_report.xlsx - Excel表格（个税明细 + 异常清单）")
    print("  3. data/forwarding_note.txt - 转发邮件模板")
    print()


if __name__ == "__main__":
    main()
