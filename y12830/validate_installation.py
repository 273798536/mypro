#!/usr/bin/env python
import os
import sys
import tempfile

def check_python_version():
    print("=" * 60)
    print("检查Python版本...")
    print("=" * 60)
    version = sys.version_info
    print(f"Python版本: {version.major}.{version.minor}.{version.micro}")
    if version.major >= 3 and version.minor >= 9:
        print("✓ Python版本符合要求 (>= 3.9)")
        return True
    else:
        print("✗ Python版本过低，需要 >= 3.9")
        return False

def check_dependencies():
    print("\n" + "=" * 60)
    print("检查依赖包...")
    print("=" * 60)
    
    required_packages = [
        'dash', 'flask', 'flask_sqlalchemy', 'pandas', 'plotly',
        'openpyxl', 'reportlab', 'PIL', 'sqlalchemy', 'numpy'
    ]
    
    all_ok = True
    for pkg in required_packages:
        try:
            if pkg == 'PIL':
                from PIL import Image
            else:
                __import__(pkg)
            print(f"✓ {pkg} 已安装")
        except ImportError as e:
            print(f"✗ {pkg} 未安装: {e}")
            all_ok = False
    
    return all_ok

def check_imports():
    print("\n" + "=" * 60)
    print("检查模块导入...")
    print("=" * 60)
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from config import Config, BASE_DIR, DATA_DIR, UPLOAD_DIR, EXPORT_DIR, TEST_DIR
        print("✓ config 导入成功")
        
        from app.database import db, init_db, get_engine, get_session
        print("✓ app.database 导入成功")
        
        from app.models import (
            ReagentBatch, Sample, SequencingResult, PedigreeMember,
            ImportRecord, ValidationResult, ImageAnnotation, ConflictRecord,
            ValidationStatus, ConflictType
        )
        print("✓ app.models 导入成功")
        
        from app.utils import (
            calculate_file_hash, clean_filename, safe_str, safe_int,
            parse_gender, parse_affection, standardize_sample_id
        )
        print("✓ app.utils 导入成功")
        
        from app.importer import DataImporter
        print("✓ app.importer 导入成功")
        
        from app.validator import PedigreeValidator
        print("✓ app.validator 导入成功")
        
        from app.image_annotator import ImageAnnotator
        print("✓ app.image_annotator 导入成功")
        
        from app.dashboard import DashboardData
        print("✓ app.dashboard 导入成功")
        
        from app.exporter import ReportExporter
        print("✓ app.exporter 导入成功")
        
        from app import (
            db, init_db, DataImporter, PedigreeValidator, ImageAnnotator,
            ReportExporter, DashboardData, ReagentBatch, ValidationStatus, ConflictType
        )
        print("✓ app 包整体导入成功")
        
        return True
    except Exception as e:
        print(f"✗ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_directories():
    print("\n" + "=" * 60)
    print("检查目录结构...")
    print("=" * 60)
    
    from config import BASE_DIR, DATA_DIR, UPLOAD_DIR, EXPORT_DIR, TEST_DIR
    
    dirs = [
        ('项目根目录', BASE_DIR),
        ('数据目录', DATA_DIR),
        ('上传目录', UPLOAD_DIR),
        ('导出目录', EXPORT_DIR),
        ('测试数据目录', TEST_DIR),
        ('app目录', os.path.join(BASE_DIR, 'app')),
        ('tests目录', os.path.join(BASE_DIR, 'tests')),
    ]
    
    all_ok = True
    for name, path in dirs:
        if os.path.exists(path):
            print(f"✓ {name}: {path}")
        else:
            print(f"✗ {name} 不存在: {path}")
            all_ok = False
    
    return all_ok

def check_files():
    print("\n" + "=" * 60)
    print("检查核心文件...")
    print("=" * 60)
    
    from config import BASE_DIR
    
    required_files = [
        'config.py',
        'requirements.txt',
        'app.py',
        'run_tests.py',
        'app/__init__.py',
        'app/database.py',
        'app/models.py',
        'app/utils.py',
        'app/importer.py',
        'app/validator.py',
        'app/image_annotator.py',
        'app/dashboard.py',
        'app/exporter.py',
        'tests/__init__.py',
        'tests/test_import.py',
        'tests/test_validation.py',
    ]
    
    all_ok = True
    for f in required_files:
        path = os.path.join(BASE_DIR, f)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"✓ {f} ({size} bytes)")
        else:
            print(f"✗ {f} 不存在")
            all_ok = False
    
    return all_ok

def test_utils():
    print("\n" + "=" * 60)
    print("测试工具函数...")
    print("=" * 60)
    
    from app.utils import (
        calculate_file_hash, clean_filename, safe_str, safe_int,
        parse_gender, parse_affection, standardize_sample_id
    )
    
    all_ok = True
    
    # 测试 parse_gender
    test_cases = [
        ('男', 'Male'), ('女', 'Female'), ('M', 'Male'), ('F', 'Female'),
        ('1', 'Male'), ('2', 'Female'), ('unknown', 'Unknown')
    ]
    for input_val, expected in test_cases:
        result = parse_gender(input_val)
        if result == expected:
            print(f"✓ parse_gender('{input_val}') = '{result}'")
        else:
            print(f"✗ parse_gender('{input_val}') = '{result}', 期望 '{expected}'")
            all_ok = False
    
    # 测试 parse_affection
    test_cases = [
        ('患病', 'Affected'), ('正常', 'Unaffected'), ('是', 'Affected'),
        ('否', 'Unaffected'), ('1', 'Affected'), ('0', 'Unaffected')
    ]
    for input_val, expected in test_cases:
        result = parse_affection(input_val)
        if result == expected:
            print(f"✓ parse_affection('{input_val}') = '{result}'")
        else:
            print(f"✗ parse_affection('{input_val}') = '{result}', 期望 '{expected}'")
            all_ok = False
    
    # 测试 standardize_sample_id
    result = standardize_sample_id('s-001')
    if result == 'S001':
        print(f"✓ standardize_sample_id('s-001') = '{result}'")
    else:
        print(f"✗ standardize_sample_id('s-001') = '{result}', 期望 'S001'")
        all_ok = False
    
    # 测试 calculate_file_hash
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write('test content')
        temp_file = f.name
    try:
        hash1 = calculate_file_hash(temp_file)
        hash2 = calculate_file_hash(temp_file)
        if hash1 == hash2 and len(hash1) == 64:
            print(f"✓ calculate_file_hash 生成一致的SHA256哈希")
        else:
            print(f"✗ calculate_file_hash 哈希不一致或长度错误")
            all_ok = False
    finally:
        os.unlink(temp_file)
    
    return all_ok

def test_database_init():
    print("\n" + "=" * 60)
    print("测试数据库初始化...")
    print("=" * 60)
    
    try:
        import tempfile
        from flask import Flask
        from app.database import init_db, db
        from app.models import ReagentBatch, Sample, ConflictRecord
        
        test_db_path = os.path.join(tempfile.gettempdir(), 'validate_test.db')
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
        
        from config import Config
        original_uri = Config.SQLALCHEMY_DATABASE_URI
        Config.SQLALCHEMY_DATABASE_URI = f'sqlite:///{test_db_path}'
        
        app = Flask(__name__)
        app.config.from_object(Config)
        init_db(app)
        
        with app.app_context():
            # 测试创建数据
            batch = ReagentBatch(
                batch_number='VALIDATE-TEST-001',
                name='验证测试批次',
                created_by='test'
            )
            db.session.add(batch)
            db.session.commit()
            
            sample = Sample(
                sample_id='S001',
                batch_id=batch.id,
                original_row_number=1,
                source_file='test.xlsx',
                source_sheet='Sheet1',
                name='张三',
                gender='Male'
            )
            db.session.add(sample)
            db.session.commit()
            
            # 测试查询
            batch2 = ReagentBatch.query.filter_by(batch_number='VALIDATE-TEST-001').first()
            if batch2 and batch2.name == '验证测试批次':
                print("✓ 数据库创建和查询正常")
            else:
                print("✗ 数据库查询失败")
                return False
            
            # 测试 ConflictRecord
            conflict = ConflictRecord(
                batch_id=batch.id,
                sample_id=sample.id,
                conflict_type='gender_mismatch',
                severity='warning',
                status='open',
                message='测试冲突',
                priority=1
            )
            db.session.add(conflict)
            db.session.commit()
            
            if conflict.is_critical == False:
                print("✓ ConflictRecord.is_critical 属性正常")
            else:
                print("✗ ConflictRecord.is_critical 属性错误")
                return False
            
            # 测试可用性评估逻辑
            critical_count = 1 if conflict.is_critical else 0
            usability = 'ready' if critical_count == 0 else 'not_ready'
            if usability == 'ready':
                print("✓ 可用性评估逻辑正常 (无严重冲突时为ready)")
            else:
                print("✗ 可用性评估逻辑错误")
        
        Config.SQLALCHEMY_DATABASE_URI = original_uri
        
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
        
        return True
        
    except Exception as e:
        print(f"✗ 数据库测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "=" * 60)
    print("遗传家系谱系校验系统 - 安装验证")
    print("=" * 60)
    
    results = []
    
    results.append(('Python版本', check_python_version()))
    results.append(('依赖包', check_dependencies()))
    results.append(('目录结构', check_directories()))
    results.append(('核心文件', check_files()))
    results.append(('模块导入', check_imports()))
    results.append(('工具函数', test_utils()))
    results.append(('数据库', test_database_init()))
    
    print("\n" + "=" * 60)
    print("验证结果汇总")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ 所有验证通过！系统已准备就绪。")
        print("\n下一步:")
        print("  1. 运行演示: python run_tests.py")
        print("  2. 启动Web服务: python app.py")
        print("  3. 运行pytest测试: python run_tests.py pytest")
    else:
        print("✗ 部分验证失败，请检查上述错误信息。")
        print("\n建议:")
        print("  1. 安装依赖: pip install -r requirements.txt")
        print("  2. 确保Python版本 >= 3.9")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
