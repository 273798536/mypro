import re
from typing import Tuple, List
from .models import EquationRecord, ValidationResult, BadCategory, RecordStatus


REQUIRED_FIELDS = ['record_id', 'source', 'equation_type', 'input_params', 'solution']


class Validator:
    def __init__(self):
        self._equation_patterns = {
            '一阶线性': re.compile(r"y'\s*[+\-]\s*P\(x\)\s*y\s*=\s*Q\(x\)", re.IGNORECASE),
            '可分离变量': re.compile(r"y'\s*=\s*f\(x\)\s*g\(y\)|dy/dx", re.IGNORECASE),
            '二阶常系数齐次': re.compile(r"y''\s*[+\-]\s*[a-zA-Z]\s*y'\s*[+\-]\s*[a-zA-Z]\s*y\s*=\s*0"),
            '二阶常系数非齐次': re.compile(r"y''\s*[+\-]\s*[a-zA-Z]\s*y'\s*[+\-]\s*[a-zA-Z]\s*y\s*=\s*f\(x\)"),
        }

    def validate(self, record: EquationRecord, raw_row: dict) -> ValidationResult:
        result = ValidationResult()

        missing = self._check_missing_fields(record, raw_row)
        if missing:
            result.is_valid = False
            result.bad_category = BadCategory.MISSING
            result.errors.append(f"缺少必要字段: {', '.join(missing)}")
            record.status = RecordStatus.MISSING_FIELD
            return result

        fmt_errors = self._check_format(record)
        if fmt_errors:
            result.is_valid = False
            result.bad_category = BadCategory.FORMAT
            result.errors.extend(fmt_errors)
            record.status = RecordStatus.BAD_FORMAT
            return result

        biz_errors = self._check_business_rules(record)
        if biz_errors:
            result.is_valid = False
            result.bad_category = BadCategory.BUSINESS
            result.errors.extend(biz_errors)
            record.status = RecordStatus.BUSINESS_RULE
            return result

        record.status = RecordStatus.SUCCESS
        return result

    def _check_missing_fields(self, record: EquationRecord, raw_row: dict) -> List[str]:
        missing = []
        for f in REQUIRED_FIELDS:
            if f == 'input_params':
                if not record.input_params:
                    missing.append(f)
            else:
                val = raw_row.get(f)
                if val is None or (isinstance(val, str) and val.strip() == ''):
                    missing.append(f)
        return missing

    def _check_format(self, record: EquationRecord) -> List[str]:
        errors = []

        if record.record_id and not re.match(r'^[A-Za-z0-9_\-]+$', record.record_id):
            errors.append(f"记录ID格式非法: {record.record_id}，仅允许字母数字下划线和横杠")

        if record.equation_type and record.equation_type not in self._equation_patterns:
            errors.append(f"未知的方程类型: {record.equation_type}，支持的类型: {', '.join(self._equation_patterns.keys())}")

        if record.solution:
            if len(record.solution) < 3:
                errors.append(f"解的描述过短: '{record.solution}'")
            if re.search(r'[^\x00-\x7F]', record.solution) and 'e^x' not in record.solution and 'sin' not in record.solution:
                pass

        return errors

    def _check_business_rules(self, record: EquationRecord) -> List[str]:
        errors = []

        if record.equation_type and record.solution:
            etype = record.equation_type
            sol = record.solution

            if etype == '二阶常系数齐次':
                if 'C1' not in sol and 'C2' not in sol:
                    errors.append(f"二阶齐次方程解缺少任意常数 C1/C2: '{sol}'")

            if etype == '一阶线性':
                has_factor = ('∫' in sol or '积分' in sol or 'exp' in sol
                              or 'e^' in sol or '/x' in sol or '1/x' in sol
                              or '/x^' in sol or 'x^(-' in sol or re.search(r'e\^[-\(]', sol))
                if not has_factor:
                    errors.append(f"一阶线性方程解应包含积分因子或积分项: '{sol}'")

            if etype == '可分离变量':
                if 'x' not in sol or 'y' not in sol:
                    errors.append(f"可分离变量方程解应包含 x 和 y: '{sol}'")

        if record.input_params:
            for k, v in record.input_params.items():
                if isinstance(v, str):
                    if v.strip() == '':
                        errors.append(f"参数 {k} 值为空")
                elif isinstance(v, (int, float)):
                    if abs(v) > 1e10:
                        errors.append(f"参数 {k} 值 {v} 超出合理范围")

        if record.remark and len(record.remark) > 0:
            if re.match(r'^[!@#$%^&*]+$', record.remark):
                errors.append(f"备注内容疑似乱码: '{record.remark}'")

        return errors

    def detect_duplicate(self, record: EquationRecord, existing: List[EquationRecord]) -> Tuple[bool, str]:
        for ext in existing:
            if ext.record_id == record.record_id:
                return True, ext.record_id

            if (ext.equation_type == record.equation_type
                    and ext.input_params == record.input_params
                    and ext.solution == record.solution):
                return True, ext.record_id

        return False, ''
