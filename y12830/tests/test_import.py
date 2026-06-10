import os
import sys
import tempfile
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import DataImporter, db, init_db
from config import Config

@pytest.fixture
def test_db():
    test_db_path = os.path.join(tempfile.gettempdir(), 'test_pedigree.db')
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    
    Config.SQLALCHEMY_DATABASE_URI = f'sqlite:///{test_db_path}'
    
    from flask import Flask
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)
    
    with app.app_context():
        yield app
    
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

def create_test_sample_excel(filepath):
    df = pd.DataFrame({
        '样本编号': ['S001', 'S002', 'S003', 'S004', 'S005'],
        '姓名': ['张三', '李四', '王五', '赵六', '钱七'],
        '性别': ['男', '女', '男', '女', '男'],
        '样本类型': ['血液', '血液', '唾液', '血液', '唾液'],
        '采集日期': ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'],
        '备注': ['', '', '性别存疑', '', '']
    })
    df.to_excel(filepath, index=False)

def create_test_sequencing_excel(filepath):
    df = pd.DataFrame({
        '样本编号': ['S001', 'S001', 'S002', 'S003', 'S005', 'S006'],
        '测序ID': ['SEQ001', 'SEQ002', 'SEQ003', 'SEQ004', 'SEQ005', 'SEQ006'],
        '基因': ['BRCA1', 'BRCA2', 'BRCA1', 'TP53', 'BRCA1', 'BRCA2'],
        '变异': ['c.123A>G', 'c.456C>T', 'c.123A>G', 'c.789G>A', 'c.123A>G', 'c.456C>T'],
        '基因型': ['杂合', '纯合', '杂合', '杂合', '纯合', '杂合'],
        '质量值': [99.9, 98.5, 99.9, 85.0, 99.9, 95.0],
        '深度': [150, 120, 180, 30, 200, 90]
    })
    df.to_excel(filepath, index=False)

def create_test_pedigree_excel(filepath):
    df = pd.DataFrame({
        '家系ID': ['FAM001', 'FAM001', 'FAM001', 'FAM001', 'FAM002', 'FAM002'],
        '个体ID': ['S001', 'S002', 'S003', 'S004', 'S005', 'S006'],
        '父亲ID': ['', '', 'S001', 'S001', '', 'S005'],
        '母亲ID': ['', '', 'S002', 'S002', '', ''],
        '性别': ['男', '女', '男', '女', '男', '女'],
        '患病状态': ['正常', '正常', '患病', '正常', '患病', '正常'],
        '关系': ['父亲', '母亲', '儿子', '女儿', '父亲', '女儿'],
        '代次': [1, 1, 2, 2, 1, 2],
        '关联样本ID': ['S001', 'S002', 'S003', 'S004', 'S005', 'S006']
    })
    df.to_excel(filepath, index=False)

def test_normal_import_flow(test_db):
    with test_db.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            sample_file = f.name
        create_test_sample_excel(sample_file)
        
        result = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number='TEST-BATCH-001',
            user='test_user',
            source_notes='测试导入-样本清单'
        )
        
        assert result['success'] == True
        assert result['imported_rows'] == 5
        assert result['skipped_rows'] == 0
        assert result['duplicate_rows'] == 0
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            seq_file = f.name
        create_test_sequencing_excel(seq_file)
        
        result = importer.import_data(
            filepath=seq_file,
            import_type='sequencing',
            batch_number='TEST-BATCH-001',
            user='test_user',
            source_notes='测试导入-测序结果'
        )
        
        assert result['success'] == True
        assert result['imported_rows'] == 5
        assert result['skipped_rows'] == 1
        assert result['duplicate_rows'] == 0
        
        summary = result.get('summary', {})
        assert summary.get('mismatch_count', 0) == 1
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            ped_file = f.name
        create_test_pedigree_excel(ped_file)
        
        result = importer.import_data(
            filepath=ped_file,
            import_type='pedigree',
            batch_number='TEST-BATCH-001',
            user='test_user',
            source_notes='测试导入-家系信息'
        )
        
        assert result['success'] == True
        assert result['imported_rows'] == 6
        
        os.unlink(sample_file)
        os.unlink(seq_file)
        os.unlink(ped_file)

def test_duplicate_import_detection(test_db):
    with test_db.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            sample_file = f.name
        create_test_sample_excel(sample_file)
        
        result1 = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number='TEST-BATCH-002',
            user='test_user'
        )
        assert result1['success'] == True
        
        result2 = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number='TEST-BATCH-002',
            user='test_user'
        )
        assert result2['success'] == False
        assert result2['duplicate'] == True
        assert result2['existing_import'] is not None
        
        result3 = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number='TEST-BATCH-002',
            user='test_user',
            skip_duplicate_check=True
        )
        assert result3['success'] == True
        
        os.unlink(sample_file)

def test_duplicate_sample_ids_in_same_file(test_db):
    with test_db.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        df = pd.DataFrame({
            '样本编号': ['S001', 'S002', 'S001', 'S003'],
            '姓名': ['张三', '李四', '张三重复', '王五'],
            '性别': ['男', '女', '男', '男'],
        })
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            dup_file = f.name
        df.to_excel(dup_file, index=False)
        
        result = importer.import_data(
            filepath=dup_file,
            import_type='sample',
            batch_number='TEST-BATCH-003',
            user='test_user'
        )
        
        assert result['success'] == True
        assert result['imported_rows'] == 3
        assert result['duplicate_rows'] == 1
        
        os.unlink(dup_file)

def test_import_history(test_db):
    with test_db.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            sample_file = f.name
        create_test_sample_excel(sample_file)
        
        for i in range(3):
            importer.import_data(
                filepath=sample_file,
                import_type='sample',
                batch_number=f'TEST-BATCH-00{i+4}',
                user='test_user',
                skip_duplicate_check=True
            )
        
        history = importer.get_import_history()
        assert len(history) >= 3
        
        batch_history = importer.get_import_history('TEST-BATCH-004')
        assert len(batch_history) >= 1
        
        os.unlink(sample_file)

def test_column_mapping(test_db):
    with test_db.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        df = pd.DataFrame({
            'SampleID': ['S001', 'S002'],
            'Name': ['张三', '李四'],
            'Gender': ['Male', 'Female'],
            'Sample Type': ['血液', '唾液'],
        })
        
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            english_file = f.name
        df.to_excel(english_file, index=False)
        
        result = importer.import_data(
            filepath=english_file,
            import_type='sample',
            batch_number='TEST-BATCH-007',
            user='test_user'
        )
        
        assert result['success'] == True
        assert result['imported_rows'] == 2
        
        os.unlink(english_file)

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
