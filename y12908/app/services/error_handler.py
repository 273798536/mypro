from typing import List, Dict, Optional
from flask import jsonify
from app.models.models import SecurityRule, SEVERITY_LEVEL


class DiagnosisError(Exception):
    def __init__(self, message: str, error_code: str = 'DIAGNOSIS_ERROR',
                 severity: SEVERITY_LEVEL = SEVERITY_LEVEL.medium,
                 actionable_steps: Optional[List[str]] = None,
                 missing_rules: Optional[List[str]] = None):
        self.message = message
        self.error_code = error_code
        self.severity = severity
        self.actionable_steps = actionable_steps or []
        self.missing_rules = missing_rules or []
        super().__init__(self.message)

    def to_dict(self) -> Dict:
        return {
            'error': {
                'code': self.error_code,
                'message': self.message,
                'severity': self.severity.name,
                'actionable_steps': self.actionable_steps,
                'missing_rules': self._get_missing_rules_details(),
            }
        }

    def _get_missing_rules_details(self) -> List[Dict]:
        if not self.missing_rules:
            return []
        rules = SecurityRule.query.filter(SecurityRule.rule_code.in_(self.missing_rules)).all()
        return [
            {
                'rule_code': rule.rule_code,
                'rule_name': rule.rule_name,
                'description': rule.description,
                'severity': rule.severity.name,
            }
            for rule in rules
        ]


class LeakageDetectionError(DiagnosisError):
    def __init__(self, message: str, sample_id: Optional[int] = None,
                 missing_rules: Optional[List[str]] = None,
                 matched_rules: Optional[List[str]] = None):
        actionable_steps = self._build_actionable_steps(missing_rules, matched_rules)
        super().__init__(
            message=message,
            error_code='LEAKAGE_DETECTION_FAILED',
            severity=SEVERITY_LEVEL.high,
            actionable_steps=actionable_steps,
            missing_rules=missing_rules,
        )
        self.sample_id = sample_id
        self.matched_rules = matched_rules or []

    def _build_actionable_steps(self, missing_rules: Optional[List[str]],
                                matched_rules: Optional[List[str]]) -> List[str]:
        steps = []
        if missing_rules:
            rules_str = ', '.join(missing_rules)
            steps.append(f'请先配置安全规则: {rules_str}，可在"安全规则管理"页面添加')
        if matched_rules:
            rules_str = ', '.join(matched_rules)
            steps.append(f'已触发规则: {rules_str}，请检查训练集与验证集划分是否正确')
        steps.append('参考《训练验证泄漏排查指南》进行人工复核')
        steps.append('如需跳过此样本，可在"人工修正"中标记为"已审核通过"')
        return steps


class SecurityRuleMissingError(DiagnosisError):
    def __init__(self, rule_codes: List[str], context: str = ''):
        message = f'检测训练验证泄漏时缺少必要的安全规则配置。{context}'
        actionable_steps = [
            f'请立即在"安全规则管理"页面配置以下规则: {", ".join(rule_codes)}',
            '规则配置完成后，重新运行诊断任务',
            '配置前可参考《安全规则配置规范V2.0》',
        ]
        super().__init__(
            message=message,
            error_code='SECURITY_RULE_MISSING',
            severity=SEVERITY_LEVEL.critical,
            actionable_steps=actionable_steps,
            missing_rules=rule_codes,
        )
        self.rule_codes = rule_codes


class DuplicateImportConflictError(DiagnosisError):
    def __init__(self, message: str, existing_batch_id: str, new_batch_id: str):
        actionable_steps = [
            f'检测到同一批数据已使用批次 {existing_batch_id} 导入过',
            '如果需要重新导入，请先在"批次管理"中删除旧批次',
            '或者修改批次名称后重新导入',
            '系统已自动跳过重复记录，不会产生冲突结论',
        ]
        super().__init__(
            message=message,
            error_code='DUPLICATE_IMPORT_CONFLICT',
            severity=SEVERITY_LEVEL.medium,
            actionable_steps=actionable_steps,
        )
        self.existing_batch_id = existing_batch_id
        self.new_batch_id = new_batch_id


def handle_diagnosis_error(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DiagnosisError as e:
            return jsonify(e.to_dict()), 400
        except Exception as e:
            error = DiagnosisError(
                message=f'系统内部错误: {str(e)}',
                error_code='INTERNAL_ERROR',
                severity=SEVERITY_LEVEL.high,
                actionable_steps=[
                    '请截图保存此页面，联系技术支持',
                    '可尝试刷新页面后重试',
                    '如问题持续，请检查日志排查具体原因',
                ]
            )
            return jsonify(error.to_dict()), 500
    wrapper.__name__ = func.__name__
    return wrapper
