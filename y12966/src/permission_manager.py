import json
from .db import execute_query, execute_insert


class PermissionManager:
    def __init__(self):
        pass

    def check_permission(self, user_id, action, resource_type=None, resource_id=None):
        user_perms = execute_query(
            "SELECT * FROM permissions WHERE user_id = ? AND is_active = 1",
            (user_id,)
        )
        
        if not user_perms:
            return {
                'allowed': False,
                'reason': '用户不存在或无权限',
                'user_id': user_id,
                'action': action
            }
        
        original_allowed = False
        allowed_perm = None
        
        for perm in user_perms:
            allowed_actions = perm['allowed_actions'].split(',')
            if perm['permission_scope'] == 'all' and action in allowed_actions:
                original_allowed = True
                allowed_perm = perm
                break
            if perm['permission_scope'] == resource_type and action in allowed_actions:
                original_allowed = True
                allowed_perm = perm
                break
        
        return {
            'allowed': original_allowed,
            'reason': '权限验证通过' if original_allowed else f'无{action}操作权限',
            'user_id': user_id,
            'user_name': user_perms[0]['user_name'] if user_perms else None,
            'role': allowed_perm['role'] if allowed_perm else user_perms[0]['role'] if user_perms else None,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id
        }

    def override_permission(self, override_user_id, action, resource_type, resource_id, audit_note, target_user_id=None):
        actual_target_user = target_user_id or override_user_id
        original_check = self.check_permission(actual_target_user, action, resource_type, resource_id)
        
        override_user = execute_query(
            "SELECT * FROM permissions WHERE user_id = ? AND is_active = 1",
            (override_user_id,)
        )
        
        can_override = False
        for perm in override_user:
            if 'override_permission' in perm['allowed_actions'].split(','):
                can_override = True
                break
        
        if not can_override:
            return {
                'allowed': False,
                'reason': '无越权操作权限'
            }
        
        original_result = json.dumps(original_check, ensure_ascii=False)
        
        overridden_check = original_check.copy()
        overridden_check['allowed'] = True
        overridden_check['user_id'] = actual_target_user
        overridden_check['reason'] = f'权限被越权覆盖: {audit_note}'
        overridden_result = json.dumps(overridden_check, ensure_ascii=False)
        
        execute_insert(
            """INSERT INTO permission_audit 
               (user_id, action, resource_type, resource_id, original_result, 
                overridden_result, has_override, audit_note)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
            (
                actual_target_user,
                action,
                resource_type,
                resource_id,
                original_result,
                overridden_result,
                audit_note
            )
        )
        
        return overridden_check

    def get_audit_log(self, user_id=None):
        if user_id:
            audits = execute_query(
                "SELECT * FROM permission_audit WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            )
        else:
            audits = execute_query(
                "SELECT * FROM permission_audit ORDER BY created_at DESC"
            )
        
        for audit in audits:
            if audit['original_result']:
                audit['original_result'] = json.loads(audit['original_result'])
            if audit['overridden_result']:
                audit['overridden_result'] = json.loads(audit['overridden_result'])
        
        return {
            'status': 'success',
            'count': len(audits),
            'audits': audits
        }

    def get_boundary_test_cases(self):
        return [
            {
                'case_id': 'CASE-001',
                'name': '分析师执行迁移（越权）',
                'description': '分析师角色无migrate权限，验证越权覆盖后的结果变化',
                'user_id': 'U003',
                'user_name': '王五',
                'role': 'analyst',
                'action': 'migrate',
                'resource_type': 'migration',
                'resource_id': 'MIG20250601001',
                'expected_original': False,
                'expected_overridden': True,
                'impact': '分析师本应无法执行迁移，越权后可以执行，会改变迁移状态和血缘分析结果'
            },
            {
                'case_id': 'CASE-002',
                'name': '工程师执行回滚（越权）',
                'description': '工程师角色无rollback权限，验证越权覆盖后的结果变化',
                'user_id': 'U002',
                'user_name': '李四',
                'role': 'engineer',
                'action': 'rollback',
                'resource_type': 'migration',
                'resource_id': 'MIG20250601001',
                'expected_original': False,
                'expected_overridden': True,
                'impact': '工程师本应无法回滚迁移，越权后可以执行，会将迁移状态从executed改为rolled_back'
            },
            {
                'case_id': 'CASE-003',
                'name': '审计员执行数据导入（越权）',
                'description': '审计员角色无import权限，验证越权覆盖后的结果变化',
                'user_id': 'U004',
                'user_name': '赵六',
                'role': 'auditor',
                'action': 'import',
                'resource_type': 'slow_query_log',
                'resource_id': 'SQ2025060100001',
                'expected_original': False,
                'expected_overridden': True,
                'impact': '审计员本应无法导入数据，越权后可以导入，会新增或修改慢查询日志记录'
            }
        ]

    def run_boundary_test(self, case_id, override=False, override_user_id='U001'):
        cases = self.get_boundary_test_cases()
        case = next((c for c in cases if c['case_id'] == case_id), None)
        
        if not case:
            return {'status': 'error', 'reason': '测试用例不存在'}
        
        original_result = self.check_permission(
            case['user_id'], case['action'], case['resource_type'], case['resource_id']
        )
        
        if not override:
            return {
                'status': 'success',
                'case_id': case_id,
                'case_name': case['name'],
                'description': case['description'],
                'original_permission_check': original_result,
                'expected_original': case['expected_original'],
                'test_passed': original_result['allowed'] == case['expected_original'],
                'impact': case['impact']
            }
        
        overridden_result = self.override_permission(
            override_user_id, case['action'], case['resource_type'], 
            case['resource_id'], f'边界测试: {case_id} - 为用户{case["user_id"]}越权'
        )
        if overridden_result.get('allowed'):
            overridden_result['user_id'] = case['user_id']
            overridden_result['user_name'] = case['user_name']
            overridden_result['role'] = case['role']
        
        return {
            'status': 'success',
            'case_id': case_id,
            'case_name': case['name'],
            'description': case['description'],
            'original_permission_check': original_result,
            'overridden_permission_check': overridden_result,
            'expected_original': case['expected_original'],
            'expected_overridden': case['expected_overridden'],
            'original_test_passed': original_result['allowed'] == case['expected_original'],
            'overridden_test_passed': overridden_result['allowed'] == case['expected_overridden'],
            'result_changed': original_result['allowed'] != overridden_result['allowed'],
            'impact': case['impact'],
            'side_by_side': {
                '字段': ['是否允许', '原因'],
                '越权前': [
                    '允许' if original_result['allowed'] else '拒绝',
                    original_result['reason']
                ],
                '越权后': [
                    '允许' if overridden_result['allowed'] else '拒绝',
                    overridden_result['reason']
                ]
            }
        }
