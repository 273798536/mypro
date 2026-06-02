#!/usr/bin/env python3
from flask import Flask, render_template, request, jsonify, send_file
import io
import sys
sys.path.insert(0, '/Users/lzy/pro/solo/workspaces/y12523')

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
)
from datetime import datetime

app = Flask(__name__)


def get_default_tax_brackets():
    return [
        TaxBracket(0, 3000, 0.03, 0),
        TaxBracket(3000, 12000, 0.10, 210),
        TaxBracket(12000, 25000, 0.20, 1410),
        TaxBracket(25000, 35000, 0.25, 2660),
        TaxBracket(35000, 55000, 0.30, 4410),
        TaxBracket(55000, 80000, 0.35, 7160),
        TaxBracket(80000, None, 0.45, 15160),
    ]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json
    
    calculator = TaxCalculator(get_default_tax_brackets(), threshold=5000)
    
    deductions = []
    for i, ded in enumerate(data.get('deductions', [])):
        deductions.append(DeductionItem(
            deduction_id=f"ded_{i}",
            name=ded['name'],
            amount=float(ded['amount']),
            month=int(data['month']),
            source=SourceInfo(
                source_type=SourceType.MANUAL_ENTRY,
                operator="Web界面录入",
                remark=ded.get('remark', '')
            ),
            is_supplement=ded.get('is_supplement', False),
            supplement_reason=ded.get('supplement_reason', '')
        ))
    
    income = EmployeeIncome(
        employee_id=data.get('employee_id', 'WEB001'),
        employee_name=data.get('employee_name', '未命名'),
        year=int(data['year']),
        month=int(data['month']),
        salary=float(data['salary']),
        bonus=float(data.get('bonus', 0)),
        other_income=float(data.get('other_income', 0)),
        source=SourceInfo(
            source_type=SourceType.MANUAL_ENTRY,
            operator="Web界面录入",
            remark="在线计算"
        ),
        deductions=deductions
    )
    
    result = calculator.calculate(income)
    
    return jsonify({
        'success': True,
        'result': {
            'employee_name': result.employee_name,
            'total_income': result.total_income,
            'total_deductions': result.total_deductions,
            'taxable_income': result.taxable_income,
            'tax_amount': result.tax_amount,
            'calculation_log': result.calculation_log,
            'anomalies': [a.to_dict() for a in result.anomalies]
        }
    })


@app.route('/api/download-excel', methods=['POST'])
def download_excel():
    data = request.json
    
    calculator = TaxCalculator(get_default_tax_brackets(), threshold=5000)
    
    incomes = []
    for emp in data['employees']:
        deductions = []
        for i, ded in enumerate(emp.get('deductions', [])):
            deductions.append(DeductionItem(
                deduction_id=f"ded_{i}",
                name=ded['name'],
                amount=float(ded['amount']),
                month=int(emp['month']),
                source=SourceInfo(
                    source_type=SourceType.MANUAL_ENTRY,
                    operator="Web界面录入"
                ),
                is_supplement=ded.get('is_supplement', False),
                supplement_reason=ded.get('supplement_reason', '')
            ))
        
        incomes.append(EmployeeIncome(
            employee_id=emp.get('employee_id', f"EMP{len(incomes)+1:03d}"),
            employee_name=emp['employee_name'],
            year=int(emp['year']),
            month=int(emp['month']),
            salary=float(emp['salary']),
            bonus=float(emp.get('bonus', 0)),
            other_income=float(emp.get('other_income', 0)),
            source=SourceInfo(source_type=SourceType.MANUAL_ENTRY),
            deductions=deductions
        ))
    
    batch = BatchTaxCalculator(calculator)
    results, _ = batch.calculate_batch(incomes)
    
    report_gen = ReportGenerator()
    excel_data = report_gen.generate_simple_excel_data(results)
    
    output = io.BytesIO()
    save_excel_report(excel_data, output)
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f"个税计算报告_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )


if __name__ == '__main__':
    app.run(debug=True, port=5000)
