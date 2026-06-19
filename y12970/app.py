import os
import json
import hashlib
import uuid
import csv
from datetime import datetime, timedelta
from io import BytesIO
from functools import wraps

from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'audit_platform.db')
REPORT_DIR = os.path.join(BASE_DIR, 'reports')
os.makedirs(REPORT_DIR, exist_ok=True)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_AS_ASCII'] = False

db = SQLAlchemy(app)


class ImportBatch(db.Model):
    __tablename__ = 'import_batches'
    id = db.Column(db.Integer, primary_key=True)
    batch_no = db.Column(db.String(50), unique=True, nullable=False)
    source_system = db.Column(db.String(50), nullable=False)
    import_type = db.Column(db.String(50), nullable=False)
    total_records = db.Column(db.Integer, default=0)
    success_count = db.Column(db.Integer, default=0)
    duplicate_count = db.Column(db.Integer, default=0)
    error_count = db.Column(db.Integer, default=0)
    import_time = db.Column(db.DateTime, default=datetime.now)
    operator = db.Column(db.String(100))
    status = db.Column(db.String(20), default='processing')
    error_message = db.Column(db.Text)
    checksum = db.Column(db.String(64))


class BackupRecord(db.Model):
    __tablename__ = 'backup_records'
    id = db.Column(db.Integer, primary_key=True)
    backup_id = db.Column(db.String(100), unique=True, nullable=False)
    backup_type = db.Column(db.String(50), nullable=False)
    source_system = db.Column(db.String(50), nullable=False)
    backup_time = db.Column(db.DateTime, nullable=False)
    backup_path = db.Column(db.String(500))
    file_size = db.Column(db.BigInteger)
    checksum = db.Column(db.String(64))
    record_count = db.Column(db.Integer)
    backup_operator = db.Column(db.String(100))
    verification_status = db.Column(db.String(20), default='pending')
    verification_time = db.Column(db.DateTime)
    verification_result = db.Column(db.Text)
    is_valid = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)


class SchemaCompareResult(db.Model):
    __tablename__ = 'schema_compare_results'
    id = db.Column(db.Integer, primary_key=True)
    compare_id = db.Column(db.String(100), unique=True, nullable=False)
    source_schema = db.Column(db.String(100), nullable=False)
    target_schema = db.Column(db.String(100), nullable=False)
    compare_time = db.Column(db.DateTime, default=datetime.now)
    total_differences = db.Column(db.Integer, default=0)
    differences = db.Column(db.Text)
    conclusion = db.Column(db.Text)
    operator = db.Column(db.String(100))
    status = db.Column(db.String(20), default='completed')
    created_at = db.Column(db.DateTime, default=datetime.now)


class AuditReport(db.Model):
    __tablename__ = 'audit_reports'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(100), unique=True, nullable=False)
    report_type = db.Column(db.String(50), nullable=False)
    report_period_start = db.Column(db.DateTime)
    report_period_end = db.Column(db.DateTime)
    generated_time = db.Column(db.DateTime, default=datetime.now)
    total_records = db.Column(db.Integer, default=0)
    approved_count = db.Column(db.Integer, default=0)
    rejected_count = db.Column(db.Integer, default=0)
    need_review_count = db.Column(db.Integer, default=0)
    critical_issues = db.Column(db.Integer, default=0)
    high_issues = db.Column(db.Integer, default=0)
    medium_issues = db.Column(db.Integer, default=0)
    low_issues = db.Column(db.Integer, default=0)
    report_content = db.Column(db.Text)
    report_path = db.Column(db.String(500))
    operator = db.Column(db.String(100))
    status = db.Column(db.String(20), default='generated')
    created_at = db.Column(db.DateTime, default=datetime.now)


class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    permission_id = db.Column(db.String(100), unique=True, nullable=False)
    user_account = db.Column(db.String(100), nullable=False)
    user_name = db.Column(db.String(100))
    department = db.Column(db.String(100))
    resource = db.Column(db.String(200), nullable=False)
    resource_type = db.Column(db.String(50))
    permission_level = db.Column(db.String(50))
    action = db.Column(db.String(50))
    source_system = db.Column(db.String(50), nullable=False)
    grant_time = db.Column(db.DateTime)
    expire_time = db.Column(db.DateTime)
    granted_by = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('import_batches.id'), nullable=False)
    raw_data = db.Column(db.Text)
    data_hash = db.Column(db.String(64))
    record_status = db.Column(db.String(20), default='valid')
    risk_level = db.Column(db.String(20), default='low')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class PermissionViolation(db.Model):
    __tablename__ = 'permission_violations'
    id = db.Column(db.Integer, primary_key=True)
    violation_id = db.Column(db.String(100), unique=True, nullable=False)
    violation_type = db.Column(db.String(50), nullable=False)
    user_account = db.Column(db.String(100), nullable=False)
    user_name = db.Column(db.String(100))
    department = db.Column(db.String(100))
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id'))
    resource = db.Column(db.String(200), nullable=False)
    resource_type = db.Column(db.String(50))
    action = db.Column(db.String(50))
    source_system = db.Column(db.String(50))
    detected_time = db.Column(db.DateTime, default=datetime.now)
    risk_level = db.Column(db.String(20), default='medium')
    description = db.Column(db.Text)
    evidence = db.Column(db.Text)
    audit_status = db.Column(db.String(20), default='pending')
    audit_comment = db.Column(db.Text)
    auditor = db.Column(db.String(100))
    audit_time = db.Column(db.DateTime)
    is_index_failure = db.Column(db.Boolean, default=False)
    needs_engineer_review = db.Column(db.Boolean, default=False)
    review_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


def api_error_handler(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except SQLAlchemyError as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': '数据库操作失败',
                'suggestion': '请检查数据库连接，或联系数据平台工程师排查',
                'detail': str(e)
            }), 500
        except KeyError as e:
            return jsonify({
                'success': False,
                'error': f'缺少必填字段: {str(e)}',
                'suggestion': f'请在请求中补充 "{str(e)}" 字段后重试'
            }), 400
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'suggestion': '请检查输入参数格式是否正确'
            }), 400
        except FileNotFoundError as e:
            return jsonify({
                'success': False,
                'error': f'文件不存在: {str(e)}',
                'suggestion': '请确认文件路径正确，或先上传/生成对应文件'
            }), 404
        except Exception as e:
            return jsonify({
                'success': False,
                'error': '服务内部异常',
                'suggestion': '请记录错误时间和操作步骤，联系数据平台工程师处理',
                'detail': str(e)
            }), 500
    return decorated


def calc_data_hash(data_dict):
    sorted_str = json.dumps(data_dict, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(sorted_str.encode('utf-8')).hexdigest()


def generate_batch_no():
    return f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"


def calc_risk_level(resource, action, permission_level):
    sensitive_resources = ['finance', 'salary', 'tax', 'customer_pii', 'bank_card']
    high_risk_actions = ['delete', 'drop', 'truncate', 'export_all', 'grant']
    
    resource_lower = str(resource).lower()
    action_lower = str(action).lower() if action else ''
    level_lower = str(permission_level).lower() if permission_level else ''
    
    if any(s in resource_lower for s in sensitive_resources) and action_lower in high_risk_actions:
        return 'critical'
    if any(s in resource_lower for s in sensitive_resources):
        return 'high'
    if action_lower in high_risk_actions:
        return 'high'
    if level_lower in ['super_admin', 'root', 'dba']:
        return 'high'
    if action_lower in ['update', 'insert', 'write', 'import']:
        return 'medium'
    return 'low'


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'success': True,
        'service': '事务隔离异常演示 - 权限审计平台',
        'status': 'running',
        'database': os.path.exists(DB_PATH),
        'time': datetime.now().isoformat()
    })


@app.route('/api/import/permissions', methods=['POST'])
@api_error_handler
def import_permissions():
    data = request.get_json(force=True)
    source_system = data.get('source_system', 'unknown')
    operator = data.get('operator', 'system')
    records = data.get('records', [])
    
    if not records:
        return jsonify({
            'success': False,
            'error': '导入记录为空',
            'suggestion': '请在 records 字段中提供至少一条权限记录'
        }), 400
    
    batch_no = generate_batch_no()
    
    batch = ImportBatch(
        batch_no=batch_no,
        source_system=source_system,
        import_type='permissions',
        total_records=len(records),
        operator=operator,
        status='processing'
    )
    db.session.add(batch)
    db.session.flush()
    
    success_count = 0
    duplicate_count = 0
    error_count = 0
    duplicate_details = []
    
    for idx, record in enumerate(records):
        try:
            required_fields = ['user_account', 'resource']
            for field in required_fields:
                if field not in record or not str(record[field]).strip():
                    raise ValueError(f'第 {idx + 1} 条记录缺少必填字段: {field}')
            
            perm_id = record.get('permission_id') or f"PERM-{uuid.uuid4().hex[:12]}"
            
            hashable = {k: v for k, v in record.items() if k not in ['permission_id', 'raw_data']}
            data_hash = calc_data_hash(hashable)
            
            existing = Permission.query.filter(
                Permission.user_account == record['user_account'],
                Permission.resource == record['resource'],
                Permission.action == (record.get('action') or ''),
                Permission.source_system == source_system
            ).first()
            
            if existing and existing.data_hash == data_hash:
                duplicate_count += 1
                duplicate_details.append({
                    'index': idx + 1,
                    'user_account': record['user_account'],
                    'resource': record['resource'],
                    'reason': '完全相同的权限记录已存在'
                })
                continue
            
            grant_time = record.get('grant_time')
            if isinstance(grant_time, str) and grant_time:
                grant_time = datetime.fromisoformat(grant_time.replace('Z', '+00:00'))
            
            expire_time = record.get('expire_time')
            if isinstance(expire_time, str) and expire_time:
                expire_time = datetime.fromisoformat(expire_time.replace('Z', '+00:00'))
            
            is_active = True
            if expire_time and isinstance(expire_time, datetime):
                is_active = expire_time > datetime.now()
            
            risk_level = calc_risk_level(
                record.get('resource', ''),
                record.get('action', ''),
                record.get('permission_level', '')
            )
            
            perm = Permission(
                permission_id=perm_id,
                user_account=record['user_account'],
                user_name=record.get('user_name', ''),
                department=record.get('department', ''),
                resource=record['resource'],
                resource_type=record.get('resource_type', 'database'),
                permission_level=record.get('permission_level', 'read'),
                action=record.get('action', 'select'),
                source_system=source_system,
                grant_time=grant_time,
                expire_time=expire_time,
                granted_by=record.get('granted_by', ''),
                is_active=is_active,
                batch_id=batch.id,
                raw_data=json.dumps(record, ensure_ascii=False),
                data_hash=data_hash,
                record_status='valid',
                risk_level=risk_level
            )
            db.session.add(perm)
            success_count += 1
        except ValueError as e:
            error_count += 1
            duplicate_details.append({'index': idx + 1, 'error': str(e)})
        except Exception as e:
            error_count += 1
            duplicate_details.append({'index': idx + 1, 'error': f'解析失败: {str(e)}'})
    
    batch.success_count = success_count
    batch.duplicate_count = duplicate_count
    batch.error_count = error_count
    batch.status = 'completed' if error_count == 0 else 'completed_with_errors'
    batch.checksum = hashlib.sha256(json.dumps(records).encode('utf-8')).hexdigest()
    db.session.commit()
    
    response = {
        'success': True,
        'batch_no': batch_no,
        'summary': {
            'total': len(records),
            'success': success_count,
            'duplicate': duplicate_count,
            'error': error_count
        }
    }
    
    if duplicate_count > 0:
        response['duplicate_warning'] = {
            'message': f'检测到 {duplicate_count} 条重复记录已跳过',
            'suggestion': f'请使用新的批次号，或调用 /api/import/{batch_no}/rollback 回滚该批次后重新导入',
            'details': duplicate_details[:20]
        }
    
    if error_count > 0:
        response['error_details'] = duplicate_details[-error_count:]
    
    return jsonify(response)


@app.route('/api/import/<batch_no>/rollback', methods=['POST'])
@api_error_handler
def rollback_batch(batch_no):
    batch = ImportBatch.query.filter_by(batch_no=batch_no).first()
    if not batch:
        return jsonify({
            'success': False,
            'error': f'批次号不存在: {batch_no}',
            'suggestion': '请检查批次号是否正确，或调用 /api/import/batches 查看所有批次'
        }), 404
    
    deleted = Permission.query.filter_by(batch_id=batch.id).delete()
    PermissionViolation.query.filter(
        PermissionViolation.permission_id.in_(
            db.session.query(Permission.id).filter_by(batch_id=batch.id)
        )
    ).delete(synchronize_session=False)
    
    batch.status = 'rolled_back'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'batch_no': batch_no,
        'rolled_back_permissions': deleted,
        'message': f'批次 {batch_no} 已成功回滚，共删除 {deleted} 条权限记录'
    })


@app.route('/api/import/batches', methods=['GET'])
@api_error_handler
def list_batches():
    batches = ImportBatch.query.order_by(ImportBatch.import_time.desc()).limit(50).all()
    return jsonify({
        'success': True,
        'batches': [{
            'batch_no': b.batch_no,
            'source_system': b.source_system,
            'import_type': b.import_type,
            'total': b.total_records,
            'success': b.success_count,
            'duplicate': b.duplicate_count,
            'error': b.error_count,
            'status': b.status,
            'import_time': b.import_time.isoformat() if b.import_time else None,
            'operator': b.operator
        } for b in batches]
    })


@app.route('/api/detect/violations', methods=['POST'])
@api_error_handler
def detect_violations():
    data = request.get_json(force=True) or {}
    source_system = data.get('source_system')
    operator = data.get('operator', 'audit_system')
    
    query = Permission.query
    if source_system:
        query = query.filter_by(source_system=source_system)
    
    permissions = query.all()
    
    if not permissions:
        suggestion_msg = f'请先调用 /api/import/permissions 导入 {source_system} 的权限数据，或确认 source_system 参数是否正确' if source_system is not None else '请先调用 /api/import/permissions 导入权限数据'
        return jsonify({
            'success': False,
            'error': '没有找到可检测的权限记录',
            'suggestion': suggestion_msg
        }), 400
    
    existing_count = PermissionViolation.query.count()
    if existing_count > 0:
        PermissionViolation.query.delete()
    
    violations = []
    
    sensitive_resources = ['finance', 'salary', 'tax', 'customer_pii', 'bank_card', 'credit_card', 'ssn']
    
    for perm in permissions:
        resource_lower = str(perm.resource).lower()
        action_lower = str(perm.action).lower() if perm.action else ''
        level_lower = str(perm.permission_level).lower() if perm.permission_level else ''
        
        is_sensitive = any(s in resource_lower for s in sensitive_resources)
        
        if is_sensitive and action_lower in ['delete', 'drop', 'truncate', 'export_all']:
            violations.append({
                'violation_type': '越权操作-敏感资源高危操作',
                'perm': perm,
                'risk_level': 'critical',
                'description': f'用户 {perm.user_account} 对敏感资源 {perm.resource} 拥有 {perm.action} 权限，超出最小权限原则',
                'evidence': f'permission_id={perm.permission_id}, resource_type={perm.resource_type}, level={perm.permission_level}',
                'is_index_failure': False,
                'needs_engineer_review': False
            })
        
        if is_sensitive and perm.department and not any(d in str(perm.department).lower() for d in ['finance', 'hr', 'audit', 'dba', 'security', '财务', '人力', '审计']):
            violations.append({
                'violation_type': '部门越权-敏感资源',
                'perm': perm,
                'risk_level': 'high',
                'description': f'{perm.department} 部门的 {perm.user_account} 不应访问敏感资源 {perm.resource}',
                'evidence': f'department={perm.department}, resource={perm.resource}, granted_by={perm.granted_by}',
                'is_index_failure': False,
                'needs_engineer_review': False
            })
        
        if perm.expire_time and perm.expire_time < datetime.now() and perm.is_active:
            violations.append({
                'violation_type': '过期权限未回收',
                'perm': perm,
                'risk_level': 'medium',
                'description': f'用户 {perm.user_account} 的权限 {perm.permission_id} 已于 {perm.expire_time.strftime("%Y-%m-%d")} 过期，但仍处于激活状态',
                'evidence': f'grant_time={perm.grant_time}, expire_time={perm.expire_time}, is_active={perm.is_active}',
                'is_index_failure': False,
                'needs_engineer_review': False
            })
        
        if level_lower in ['super_admin', 'root', 'dba', 'sa'] and not perm.granted_by:
            violations.append({
                'violation_type': '高危权限无审批人',
                'perm': perm,
                'risk_level': 'high',
                'description': f'用户 {perm.user_account} 拥有 {perm.permission_level} 权限，但记录中无审批人信息',
                'evidence': f'permission_level={perm.permission_level}, granted_by={perm.granted_by or "空"}',
                'is_index_failure': True,
                'needs_engineer_review': True
            })
        
        if action_lower in ['grant', 'grant option', 'with grant option']:
            violations.append({
                'violation_type': '权限转授权',
                'perm': perm,
                'risk_level': 'high',
                'description': f'用户 {perm.user_account} 拥有对资源 {perm.resource} 的转授权能力，可能导致权限扩散',
                'evidence': f'action={perm.action}, granted_by={perm.granted_by}',
                'is_index_failure': False,
                'needs_engineer_review': True
            })
        
        if not perm.data_hash:
            violations.append({
                'violation_type': '数据完整性异常-索引失效',
                'perm': perm,
                'risk_level': 'medium',
                'description': f'权限记录 {perm.permission_id} 的校验哈希为空，可能索引失效或数据被篡改，请工程师复核原始备份',
                'evidence': f'data_hash={perm.data_hash}, batch_id={perm.batch_id}',
                'is_index_failure': True,
                'needs_engineer_review': True
            })
    
    for v in violations:
        perm = v['perm']
        violation_id = f"VIO-{uuid.uuid4().hex[:12]}"
        vio = PermissionViolation(
            violation_id=violation_id,
            violation_type=v['violation_type'],
            user_account=perm.user_account,
            user_name=perm.user_name,
            department=perm.department,
            permission_id=perm.id,
            resource=perm.resource,
            resource_type=perm.resource_type,
            action=perm.action,
            source_system=perm.source_system,
            risk_level=v['risk_level'],
            description=v['description'],
            evidence=v['evidence'],
            is_index_failure=v['is_index_failure'],
            needs_engineer_review=v['needs_engineer_review'],
            audit_status='pending'
        )
        db.session.add(vio)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'detected_count': len(violations),
        'by_risk': {
            'critical': sum(1 for v in violations if v['risk_level'] == 'critical'),
            'high': sum(1 for v in violations if v['risk_level'] == 'high'),
            'medium': sum(1 for v in violations if v['risk_level'] == 'medium'),
            'low': sum(1 for v in violations if v['risk_level'] == 'low')
        },
        'by_type': {vt: sum(1 for v in violations if v['violation_type'] == vt) for vt in set(v['violation_type'] for v in violations)},
        'index_failure_count': sum(1 for v in violations if v['is_index_failure']),
        'needs_engineer_review_count': sum(1 for v in violations if v['needs_engineer_review']),
        'message': f'共检测到 {len(violations)} 条异常。请调用 /api/report/export 导出完整报告给审计组。'
    })


@app.route('/api/violations', methods=['GET'])
@api_error_handler
def list_violations():
    risk = request.args.get('risk_level')
    only_need_review = request.args.get('needs_engineer_review')
    
    query = PermissionViolation.query
    if risk:
        query = query.filter_by(risk_level=risk)
    if only_need_review and only_need_review.lower() in ['1', 'true', 'yes']:
        query = query.filter_by(needs_engineer_review=True)
    
    violations = query.order_by(PermissionViolation.risk_level.desc(), PermissionViolation.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'total': len(violations),
        'violations': [{
            'violation_id': v.violation_id,
            'violation_type': v.violation_type,
            'user_account': v.user_account,
            'user_name': v.user_name,
            'department': v.department,
            'resource': v.resource,
            'action': v.action,
            'risk_level': v.risk_level,
            'description': v.description,
            'audit_status': v.audit_status,
            'is_index_failure': v.is_index_failure,
            'needs_engineer_review': v.needs_engineer_review,
            'usability': '❌ 不可用-需工程师复核' if v.needs_engineer_review or v.is_index_failure else '⚠️ 待审计确认' if v.audit_status == 'pending' else '✅ 可直接使用',
            'detected_time': v.detected_time.isoformat() if v.detected_time else None
        } for v in violations]
    })


@app.route('/api/backup/register', methods=['POST'])
@api_error_handler
def register_backup():
    data = request.get_json(force=True)
    
    required = ['backup_id', 'backup_type', 'source_system', 'backup_time']
    for field in required:
        if field not in data:
            raise KeyError(field)
    
    backup_time = data['backup_time']
    if isinstance(backup_time, str):
        backup_time = datetime.fromisoformat(backup_time.replace('Z', '+00:00'))
    
    existing = BackupRecord.query.filter_by(backup_id=data['backup_id']).first()
    if existing:
        return jsonify({
            'success': False,
            'error': f'备份ID已存在: {data["backup_id"]}',
            'suggestion': f'该备份已注册（注册时间: {existing.created_at.strftime("%Y-%m-%d %H:%M:%S")}），请使用新的 backup_id，或先完成校验'
        }), 409
    
    backup = BackupRecord(
        backup_id=data['backup_id'],
        backup_type=data['backup_type'],
        source_system=data['source_system'],
        backup_time=backup_time,
        backup_path=data.get('backup_path', ''),
        file_size=data.get('file_size'),
        checksum=data.get('checksum', ''),
        record_count=data.get('record_count'),
        backup_operator=data.get('backup_operator', ''),
        verification_status='pending'
    )
    db.session.add(backup)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'backup_id': backup.backup_id,
        'message': f'备份 {backup.backup_id} 已注册，请调用 /api/backup/{backup.backup_id}/verify 执行校验'
    })


@app.route('/api/backup/<backup_id>/verify', methods=['POST'])
@api_error_handler
def verify_backup(backup_id):
    data = request.get_json(force=True) or {}
    expected_checksum = data.get('expected_checksum')
    expected_record_count = data.get('expected_record_count')
    metadata_only = data.get('metadata_only', False)
    operator = data.get('operator', 'system')
    
    backup = BackupRecord.query.filter_by(backup_id=backup_id).first()
    if not backup:
        return jsonify({
            'success': False,
            'error': f'备份记录不存在: {backup_id}',
            'suggestion': '请先调用 /api/backup/register 注册该备份，或确认 backup_id 是否拼写正确。当前已注册的备份可通过 /api/backup/list 查询'
        }), 404
    
    issues = []
    
    if not backup.checksum:
        issues.append('缺少备份文件校验和（checksum）')
    
    if not backup.file_size:
        issues.append('缺少备份文件大小信息')
    
    if not backup.record_count:
        issues.append('缺少备份记录数')
    
    if expected_checksum and backup.checksum and expected_checksum != backup.checksum:
        issues.append(f'校验和不匹配：期望={expected_checksum[:16]}...，实际={backup.checksum[:16]}...')
    
    if expected_record_count and backup.record_count and expected_record_count != backup.record_count:
        issues.append(f'记录数不匹配：期望={expected_record_count}，实际={backup.record_count}')
    
    if not metadata_only and backup.backup_path and not os.path.exists(backup.backup_path):
        issues.append(f'备份文件路径不存在：{backup.backup_path}（如仅做元数据校验，可传 metadata_only=true 跳过此项）')
    
    is_valid = len(issues) == 0
    
    backup.verification_status = 'passed' if is_valid else 'failed'
    backup.verification_time = datetime.now()
    backup.verification_result = '校验通过' if is_valid else '；'.join(issues)
    backup.is_valid = is_valid
    db.session.commit()
    
    response = {
        'success': True,
        'backup_id': backup_id,
        'verification_status': backup.verification_status,
        'is_valid': is_valid
    }
    
    if not is_valid:
        response['issues'] = issues
        response['suggestion'] = '请按以下步骤排查：' + '；'.join([
            f'如缺"{i.split("：")[0]}"，请重新导出备份并补充对应字段' if '缺少' in i else i
            for i in issues[:3]
        ])
    
    return jsonify(response)


@app.route('/api/backup/list', methods=['GET'])
@api_error_handler
def list_backups():
    backups = BackupRecord.query.order_by(BackupRecord.backup_time.desc()).all()
    return jsonify({
        'success': True,
        'backups': [{
            'backup_id': b.backup_id,
            'backup_type': b.backup_type,
            'source_system': b.source_system,
            'backup_time': b.backup_time.isoformat() if b.backup_time else None,
            'verification_status': b.verification_status,
            'is_valid': b.is_valid,
            'record_count': b.record_count,
            'has_checksum': bool(b.checksum)
        } for b in backups]
    })


@app.route('/api/schema/compare', methods=['POST'])
@api_error_handler
def compare_schema():
    data = request.get_json(force=True)
    
    required = ['source_schema', 'target_schema']
    for field in required:
        if field not in data:
            raise KeyError(field)
    
    source_schema = data['source_schema']
    target_schema = data['target_schema']
    source_name = data.get('source_name', 'source')
    target_name = data.get('target_name', 'target')
    operator = data.get('operator', 'system')
    
    if not isinstance(source_schema, dict) or not isinstance(target_schema, dict):
        return jsonify({
            'success': False,
            'error': 'schema 格式错误',
            'suggestion': 'source_schema 和 target_schema 都应是对象，例如 {"table1": {"columns": {...}}, "table2": {...}}'
        }), 400
    
    differences = []
    
    all_tables = set(source_schema.keys()) | set(target_schema.keys())
    
    for table in sorted(all_tables):
        if table not in source_schema:
            differences.append({
                'type': 'table_missing_in_source',
                'table': table,
                'description': f'表 {table} 存在于 {target_name} 但不存在于 {source_name}',
                'severity': 'high'
            })
            continue
        if table not in target_schema:
            differences.append({
                'type': 'table_missing_in_target',
                'table': table,
                'description': f'表 {table} 存在于 {source_name} 但不存在于 {target_name}',
                'severity': 'high'
            })
            continue
        
        s_cols = source_schema[table].get('columns', {}) if isinstance(source_schema[table], dict) else {}
        t_cols = target_schema[table].get('columns', {}) if isinstance(target_schema[table], dict) else {}
        
        all_cols = set(s_cols.keys()) | set(t_cols.keys())
        for col in sorted(all_cols):
            if col not in s_cols:
                differences.append({
                    'type': 'column_missing_in_source',
                    'table': table,
                    'column': col,
                    'description': f'列 {table}.{col} 存在于 {target_name} 但不存在于 {source_name}',
                    'severity': 'medium',
                    'target_definition': t_cols[col]
                })
            elif col not in t_cols:
                differences.append({
                    'type': 'column_missing_in_target',
                    'table': table,
                    'column': col,
                    'description': f'列 {table}.{col} 存在于 {source_name} 但不存在于 {target_name}',
                    'severity': 'medium',
                    'source_definition': s_cols[col]
                })
            else:
                s_def = s_cols[col] if isinstance(s_cols[col], dict) else {'type': str(s_cols[col])}
                t_def = t_cols[col] if isinstance(t_cols[col], dict) else {'type': str(t_cols[col])}
                
                for attr in set(s_def.keys()) | set(t_def.keys()):
                    sv = s_def.get(attr)
                    tv = t_def.get(attr)
                    if sv != tv:
                        differences.append({
                            'type': 'attribute_mismatch',
                            'table': table,
                            'column': col,
                            'attribute': attr,
                            'description': f'列 {table}.{col} 的 {attr} 不一致: {source_name}={sv}, {target_name}={tv}',
                            'severity': 'low' if attr not in ['type', 'nullable'] else 'high'
                        })
    
    compare_id = f"SCHEMA-{uuid.uuid4().hex[:12]}"
    
    conclusion_parts = []
    high_count = sum(1 for d in differences if d['severity'] == 'high')
    medium_count = sum(1 for d in differences if d['severity'] == 'medium')
    low_count = sum(1 for d in differences if d['severity'] == 'low')
    
    if high_count > 0:
        conclusion_parts.append(f'存在 {high_count} 处严重差异（表/列缺失或类型不兼容），审计结论不通过，需数据平台工程师核对来源备份')
    elif medium_count > 0:
        conclusion_parts.append(f'存在 {medium_count} 处中等差异，需审计组与数据平台确认是否为预期变更')
    if low_count > 0:
        conclusion_parts.append(f'另有 {low_count} 处轻微差异（默认值等），建议记录但不影响使用')
    if not differences:
        conclusion_parts.append('两个 schema 完全一致，审计材料可直接采信')
    
    conclusion = '；'.join(conclusion_parts)
    
    result = SchemaCompareResult(
        compare_id=compare_id,
        source_schema=source_name,
        target_schema=target_name,
        total_differences=len(differences),
        differences=json.dumps(differences, ensure_ascii=False),
        conclusion=conclusion,
        operator=operator
    )
    db.session.add(result)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'compare_id': compare_id,
        'total_differences': len(differences),
        'by_severity': {
            'high': high_count,
            'medium': medium_count,
            'low': low_count
        },
        'conclusion': conclusion,
        'differences': differences,
        'source_material_ref': {
            'note': '以下差异请追溯至来源备份材料核对',
            'high_severity_items': [d for d in differences if d['severity'] == 'high']
        }
    })


@app.route('/api/report/export', methods=['GET'])
@api_error_handler
def export_report():
    report_type = request.args.get('type', 'full')
    format_type = request.args.get('format', 'xlsx')
    
    violations = PermissionViolation.query.order_by(
        PermissionViolation.risk_level.desc(),
        PermissionViolation.needs_engineer_review.desc(),
        PermissionViolation.created_at.desc()
    ).all()
    
    backups = BackupRecord.query.all()
    schema_results = SchemaCompareResult.query.all()
    
    approved = 0
    rejected = 0
    need_review = 0
    critical = high = medium = low = 0
    
    for v in violations:
        if v.needs_engineer_review or v.is_index_failure:
            need_review += 1
        elif v.risk_level in ['critical', 'high']:
            rejected += 1
        else:
            approved += 1
        
        if v.risk_level == 'critical':
            critical += 1
        elif v.risk_level == 'high':
            high += 1
        elif v.risk_level == 'medium':
            medium += 1
        else:
            low += 1
    
    report_id = f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    
    wb = openpyxl.Workbook()
    
    ws_summary = wb.active
    ws_summary.title = '审计概览'
    
    headers_fill = PatternFill(start_color='305496', end_color='305496', fill_type='solid')
    headers_font = Font(bold=True, color='FFFFFF')
    center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    ws_summary.append(['事务隔离异常演示 - 权限审计报告'])
    ws_summary.merge_cells('A1:F1')
    title_cell = ws_summary['A1']
    title_cell.font = Font(bold=True, size=16, color='305496')
    title_cell.alignment = center_align
    
    ws_summary.append([])
    ws_summary.append(['报告编号', report_id])
    ws_summary.append(['生成时间', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    ws_summary.append(['报告范围', f'权限越权检测结果 + 备份校验 + Schema对比'])
    ws_summary.append([])
    
    summary_headers = ['指标', '数量', '说明']
    ws_summary.append(summary_headers)
    for col, h in enumerate(summary_headers, 1):
        cell = ws_summary.cell(row=ws_summary.max_row, column=col)
        cell.fill = headers_fill
        cell.font = headers_font
        cell.alignment = center_align
    
    summary_rows = [
        ['异常记录总数', len(violations), '检测到的所有权限异常'],
        ['🔴 严重(critical)', critical, '高危敏感资源+高危操作，审计不可用'],
        ['🟠 高(high)', high, '需立即整改，审计不可用'],
        ['🟡 中(medium)', medium, '需关注，建议整改'],
        ['🟢 低(low)', low, '轻微问题'],
        ['✅ 可直接采信', approved, '记录完整、风险可控，审计组可直接使用'],
        ['❌ 不可用-需工程师复核', need_review, '索引失效或缺少来源材料，必须找数据平台工程师核备份'],
        ['⚠️ 待审计确认', rejected, '存在越权行为，需审计组确认处置'],
        ['已注册备份数', len(backups), '已校验备份见"备份校验"页'],
        ['Schema对比次数', len(schema_results), '详细对比见"Schema对比"页']
    ]
    for row in summary_rows:
        ws_summary.append(row)
    
    ws_summary.column_dimensions['A'].width = 28
    ws_summary.column_dimensions['B'].width = 12
    ws_summary.column_dimensions['C'].width = 55
    
    ws_violations = wb.create_sheet('越权明细')
    v_headers = [
        '可用性标记', '风险等级', '违规类型', '用户账号', '用户姓名',
        '部门', '资源', '操作', '资源类型', '来源系统',
        '描述', '是否索引失效', '需工程师复核', '检测时间', '违规ID'
    ]
    ws_violations.append(v_headers)
    for col, h in enumerate(v_headers, 1):
        cell = ws_violations.cell(row=1, column=col)
        cell.fill = headers_fill
        cell.font = headers_font
        cell.alignment = center_align
    
    red_fill = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
    yellow_fill = PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid')
    green_fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
    orange_fill = PatternFill(start_color='FCD5B4', end_color='FCD5B4', fill_type='solid')
    
    for v in violations:
        if v.needs_engineer_review or v.is_index_failure:
            usability = '❌ 不可用-需工程师复核'
            row_fill = red_fill
        elif v.risk_level in ['critical', 'high']:
            usability = '⚠️ 待审计确认-越权'
            row_fill = orange_fill
        else:
            usability = '✅ 可直接使用'
            row_fill = green_fill
        
        risk_display = {'critical': '🔴 严重', 'high': '🟠 高', 'medium': '🟡 中', 'low': '🟢 低'}.get(v.risk_level, v.risk_level)
        
        row_data = [
            usability,
            risk_display,
            v.violation_type,
            v.user_account,
            v.user_name or '',
            v.department or '',
            v.resource,
            v.action or '',
            v.resource_type or '',
            v.source_system or '',
            v.description or '',
            '是' if v.is_index_failure else '否',
            '是' if v.needs_engineer_review else '否',
            v.detected_time.strftime('%Y-%m-%d %H:%M:%S') if v.detected_time else '',
            v.violation_id
        ]
        ws_violations.append(row_data)
        for col_idx in range(1, len(v_headers) + 1):
            cell = ws_violations.cell(row=ws_violations.max_row, column=col_idx)
            cell.fill = row_fill
            cell.alignment = Alignment(vertical='center', wrap_text=True)
    
    col_widths_v = [24, 12, 26, 16, 14, 16, 32, 12, 14, 14, 55, 14, 16, 20, 22]
    for i, w in enumerate(col_widths_v, 1):
        ws_violations.column_dimensions[get_column_letter(i)].width = w
    
    ws_backup = wb.create_sheet('备份校验')
    b_headers = ['备份ID', '备份类型', '来源系统', '备份时间', '校验状态', '是否有效', '记录数', '是否有校验和', '校验结果说明']
    ws_backup.append(b_headers)
    for col, h in enumerate(b_headers, 1):
        cell = ws_backup.cell(row=1, column=col)
        cell.fill = headers_fill
        cell.font = headers_font
        cell.alignment = center_align
    
    for b in backups:
        status_fill = green_fill if b.is_valid else red_fill
        row_data = [
            b.backup_id,
            b.backup_type,
            b.source_system,
            b.backup_time.strftime('%Y-%m-%d %H:%M:%S') if b.backup_time else '',
            {'pending': '待校验', 'passed': '✅ 校验通过', 'failed': '❌ 校验失败'}.get(b.verification_status, b.verification_status),
            '是' if b.is_valid else '否',
            b.record_count or '',
            '是' if b.checksum else '否',
            b.verification_result or ''
        ]
        ws_backup.append(row_data)
        for col_idx in range(1, len(b_headers) + 1):
            cell = ws_backup.cell(row=ws_backup.max_row, column=col_idx)
            cell.fill = status_fill
            cell.alignment = Alignment(vertical='center', wrap_text=True)
    
    col_widths_b = [22, 14, 14, 20, 16, 10, 10, 14, 55]
    for i, w in enumerate(col_widths_b, 1):
        ws_backup.column_dimensions[get_column_letter(i)].width = w
    
    ws_schema = wb.create_sheet('Schema对比')
    s_headers = ['对比ID', '来源Schema', '目标Schema', '对比时间', '差异总数', '严重', '中等', '轻微', '审计结论']
    ws_schema.append(s_headers)
    for col, h in enumerate(s_headers, 1):
        cell = ws_schema.cell(row=1, column=col)
        cell.fill = headers_fill
        cell.font = headers_font
        cell.alignment = center_align
    
    for sr in schema_results:
        diffs = json.loads(sr.differences) if sr.differences else []
        row_data = [
            sr.compare_id,
            sr.source_schema,
            sr.target_schema,
            sr.compare_time.strftime('%Y-%m-%d %H:%M:%S') if sr.compare_time else '',
            sr.total_differences,
            sum(1 for d in diffs if d.get('severity') == 'high'),
            sum(1 for d in diffs if d.get('severity') == 'medium'),
            sum(1 for d in diffs if d.get('severity') == 'low'),
            sr.conclusion or ''
        ]
        ws_schema.append(row_data)
        for col_idx in range(1, len(s_headers) + 1):
            cell = ws_schema.cell(row=ws_schema.max_row, column=col_idx)
            cell.alignment = Alignment(vertical='center', wrap_text=True)
    
    col_widths_s = [22, 16, 16, 20, 10, 8, 8, 8, 70]
    for i, w in enumerate(col_widths_s, 1):
        ws_schema.column_dimensions[get_column_letter(i)].width = w
    
    report_filename = f'{report_id}.xlsx'
    report_path = os.path.join(REPORT_DIR, report_filename)
    wb.save(report_path)
    
    report = AuditReport(
        report_id=report_id,
        report_type=report_type,
        report_period_start=datetime.now() - timedelta(days=30),
        report_period_end=datetime.now(),
        total_records=len(violations),
        approved_count=approved,
        rejected_count=rejected,
        need_review_count=need_review,
        critical_issues=critical,
        high_issues=high,
        medium_issues=medium,
        low_issues=low,
        report_content=json.dumps({
            'violations_count': len(violations),
            'backups_count': len(backups),
            'schema_compare_count': len(schema_results)
        }, ensure_ascii=False),
        report_path=report_path,
        operator='system'
    )
    db.session.add(report)
    db.session.commit()
    
    return send_file(
        report_path,
        as_attachment=True,
        download_name=report_filename,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )


@app.route('/api/reports', methods=['GET'])
@api_error_handler
def list_reports():
    reports = AuditReport.query.order_by(AuditReport.generated_time.desc()).all()
    return jsonify({
        'success': True,
        'reports': [{
            'report_id': r.report_id,
            'report_type': r.report_type,
            'generated_time': r.generated_time.isoformat() if r.generated_time else None,
            'total_records': r.total_records,
            'approved_count': r.approved_count,
            'rejected_count': r.rejected_count,
            'need_review_count': r.need_review_count,
            'critical_issues': r.critical_issues,
            'high_issues': r.h_issues,
            'report_path': r.report_path
        } for r in reports]
    })


def init_db():
    with app.app_context():
        db.create_all()
        print(f'✅ 数据库初始化完成: {DB_PATH}')
        print(f'✅ 报告目录: {REPORT_DIR}')


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=False)
