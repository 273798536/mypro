from typing import List, Optional, Tuple
from datetime import datetime
import uuid
from .models import (
    EmployeeIncome,
    TaxBracket,
    TaxCalculationResult,
    AnomalyRecord,
    AnomalyType,
    SourceInfo,
    SourceType,
    DeductionItem
)


class TaxCalculator:
    def __init__(self, tax_brackets: List[TaxBracket], threshold: float = 5000.0):
        self.tax_brackets = sorted(tax_brackets, key=lambda x: x.lower_bound)
        self.threshold = threshold
        self._validate_brackets()
    
    def _validate_brackets(self) -> None:
        for i, bracket in enumerate(self.tax_brackets):
            if i == 0 and bracket.lower_bound != 0:
                raise ValueError("第一个税率级距的下限必须为0")
            if i > 0 and bracket.lower_bound != self.tax_brackets[i-1].upper_bound:
                raise ValueError(f"税率级距不连续: 第{i}级和第{i+1}级之间存在间隙")
    
    def find_bracket(self, amount: float) -> Optional[TaxBracket]:
        for bracket in self.tax_brackets:
            if bracket.contains(amount):
                return bracket
        return None
    
    def calculate_tax(self, taxable_income: float) -> Tuple[float, Optional[TaxBracket], List[str]]:
        calculation_log = []
        
        if taxable_income <= 0:
            calculation_log.append(f"应纳税所得额 {taxable_income:.2f} 元 ≤ 0，无需纳税")
            return 0.0, None, calculation_log
        
        calculation_log.append(f"应纳税所得额: {taxable_income:.2f} 元")
        
        bracket = self.find_bracket(taxable_income)
        if not bracket:
            calculation_log.append("警告: 未找到适用的税率级距")
            return 0.0, None, calculation_log
        
        if bracket.upper_bound is not None:
            calculation_log.append(
                f"适用税率级距: {bracket.lower_bound:.2f} - {bracket.upper_bound:.2f} 元, "
                f"税率 {bracket.rate*100:.1f}%, 速算扣除数 {bracket.quick_deduction:.2f} 元"
            )
        else:
            calculation_log.append(
                f"适用税率级距: {bracket.lower_bound:.2f} 元以上, "
                f"税率 {bracket.rate*100:.1f}%, 速算扣除数 {bracket.quick_deduction:.2f} 元"
            )
        
        tax = taxable_income * bracket.rate - bracket.quick_deduction
        tax = max(0.0, tax)
        
        calculation_log.append(
            f"个税计算公式: {taxable_income:.2f} × {bracket.rate*100:.1f}% - {bracket.quick_deduction:.2f} = {tax:.2f} 元"
        )
        
        return tax, bracket, calculation_log
    
    def calculate(self, income: EmployeeIncome) -> TaxCalculationResult:
        anomalies: List[AnomalyRecord] = []
        source_refs = {}
        
        source_refs["income"] = income.source
        for i, ded in enumerate(income.deductions):
            source_refs[f"deduction_{i}"] = ded.source
        
        anomalies.extend(self._check_boundary_values(income))
        anomalies.extend(self._check_missing_deductions(income))
        anomalies.extend(self._check_supplements(income))
        anomalies.extend(self._check_overwrites(income))
        anomalies.extend(self._check_unit_consistency(income))
        
        total_income = income.total_income
        total_deductions = income.total_deductions + self.threshold
        taxable_income = max(0.0, total_income - total_deductions)
        
        tax_amount, bracket, calculation_log = self.calculate_tax(taxable_income)
        
        if bracket:
            source_refs["tax_bracket"] = bracket.source
        
        result = TaxCalculationResult(
            employee_id=income.employee_id,
            employee_name=income.employee_name,
            year=income.year,
            month=income.month,
            total_income=total_income,
            total_deductions=total_deductions,
            taxable_income=taxable_income,
            tax_amount=tax_amount,
            unit=income.unit,
            applicable_bracket=bracket,
            calculation_log=calculation_log,
            anomalies=anomalies,
            source_refs=source_refs
        )
        
        return result
    
    def _check_boundary_values(self, income: EmployeeIncome) -> List[AnomalyRecord]:
        anomalies = []
        
        for bracket in self.tax_brackets:
            if bracket.upper_bound is not None:
                boundary = bracket.upper_bound
                tolerance = 0.01
                
                if abs(income.taxable_income - boundary) < tolerance:
                    anomalies.append(AnomalyRecord(
                        anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.BOUNDARY_VALUE,
                        employee_id=income.employee_id,
                        employee_name=income.employee_name,
                        description=f"应纳税所得额 ({income.taxable_income:.2f} 元) 接近税率级距边界 {boundary:.2f} 元，请确认",
                        month=income.month,
                        related_field="taxable_income",
                        old_value=None,
                        new_value=income.taxable_income,
                        source=income.source
                    ))
        
        return anomalies
    
    def _check_missing_deductions(self, income: EmployeeIncome) -> List[AnomalyRecord]:
        anomalies = []
        expected_deductions = ["基本养老保险", "基本医疗保险", "失业保险", "住房公积金"]
        
        actual_deduction_names = [d.name for d in income.deductions]
        
        for expected in expected_deductions:
            if expected not in actual_deduction_names:
                anomalies.append(AnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.MISSING_DEDUCTION,
                    employee_id=income.employee_id,
                    employee_name=income.employee_name,
                    description=f"缺少标准扣除项: {expected}",
                    month=income.month,
                    related_field=f"deduction.{expected}",
                    old_value=None,
                    new_value=None,
                    source=income.source
                ))
        
        return anomalies
    
    def _check_supplements(self, income: EmployeeIncome) -> List[AnomalyRecord]:
        anomalies = []
        
        for ded in income.deductions:
            if ded.is_supplement:
                anomalies.append(AnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.LATE_SUPPLEMENT,
                    employee_id=income.employee_id,
                    employee_name=income.employee_name,
                    description=f"扣除项 '{ded.name}' 为逾期补录，原因为: {ded.supplement_reason or '未说明'}",
                    month=income.month,
                    related_field=f"deduction.{ded.deduction_id}",
                    old_value=ded.previous_amount,
                    new_value=ded.amount,
                    source=ded.source
                ))
        
        return anomalies
    
    def _check_overwrites(self, income: EmployeeIncome) -> List[AnomalyRecord]:
        anomalies = []
        
        if income.version > 1 and income.previous_total is not None:
            if abs(income.total_income - income.previous_total) > 0.01:
                anomalies.append(AnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.OVERWRITE_HISTORY,
                    employee_id=income.employee_id,
                    employee_name=income.employee_name,
                    description=f"收入数据已被覆盖，版本从{income.version - 1}更新为{income.version}",
                    month=income.month,
                    related_field="total_income",
                    old_value=income.previous_total,
                    new_value=income.total_income,
                    source=income.source
                ))
        
        for ded in income.deductions:
            if ded.version > 1 and ded.previous_amount is not None:
                if abs(ded.amount - ded.previous_amount) > 0.01:
                    anomalies.append(AnomalyRecord(
                        anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.OVERWRITE_HISTORY,
                        employee_id=income.employee_id,
                        employee_name=income.employee_name,
                        description=f"扣除项 '{ded.name}' 数据已被覆盖，版本从{ded.version - 1}更新为{ded.version}",
                        month=income.month,
                        related_field=f"deduction.{ded.deduction_id}.amount",
                        old_value=ded.previous_amount,
                        new_value=ded.amount,
                        source=ded.source
                    ))
        
        return anomalies
    
    def _check_unit_consistency(self, income: EmployeeIncome) -> List[AnomalyRecord]:
        anomalies = []
        
        for ded in income.deductions:
            if ded.unit != income.unit:
                anomalies.append(AnomalyRecord(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.UNIT_MISMATCH,
                    employee_id=income.employee_id,
                    employee_name=income.employee_name,
                    description=f"扣除项 '{ded.name}' 单位({ded.unit})与收入单位({income.unit})不一致",
                    month=income.month,
                    related_field=f"deduction.{ded.deduction_id}.unit",
                    old_value=None,
                    new_value=None,
                    source=ded.source
                ))
        
        return anomalies


class BatchTaxCalculator:
    def __init__(self, calculator: TaxCalculator):
        self.calculator = calculator
        self.all_results: List[TaxCalculationResult] = []
        self.all_anomalies: List[AnomalyRecord] = []
    
    def calculate_batch(self, incomes: List[EmployeeIncome]) -> Tuple[List[TaxCalculationResult], List[AnomalyRecord]]:
        self.all_results = []
        self.all_anomalies = []
        
        for income in incomes:
            result = self.calculator.calculate(income)
            self.all_results.append(result)
            self.all_anomalies.extend(result.anomalies)
        
        return self.all_results, self.all_anomalies
