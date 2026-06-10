import os
import sys
import tempfile
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import DataImporter, PedigreeValidator, DashboardData, db, init_db
from app.models import ValidationStatus, ConflictType
from config import Config

@pytest.fixture
def setup_test_data():
    test_db_path = os.path.join(tempfile.gettempdir(), 'test_validation.db')
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    
    Config.SQLALCHEMY_DATABASE_URI = f'sqlite:///{test_db_path}'
    
    from flask import Flask
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)
    
    with app.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        sample_df = pd.DataFrame({
            '样本编号': ['S001', 'S002', 'S003', 'S004', 'S005'],
            '姓名': ['张三', '李四', '王五', '赵六', '钱七'],
            '性别': ['男', '女', '男', '女', '男'],
            '样本类型': ['血液', '血液', '唾液', '血液', '唾液'],
        })
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            sample_file = f.name
        sample_df.to_excel(sample_file, index=False)
        
        seq_df = pd.DataFrame({
            '样本编号': ['S001', 'S002', 'S003', 'S005'],
            '测序ID': ['SEQ001', 'SEQ002', 'SEQ003', 'SEQ005'],
            '基因': ['BRCA1', 'BRCA2', 'BRCA1', 'BRCA1'],
            '变异': ['c.123A>G', 'c.456C>T', 'c.123A>G', 'c.123A>G'],
            '基因型': ['A/G', 'C/T', 'A/G', 'A/A'],
            '质量值': [99.9, 98.5, 99.9, 99.9],
            '深度': [150, 120, 180, 200]
        })
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            seq_file = f.name
        seq_df.to_excel(seq_file, index=False)
        
        ped_df = pd.DataFrame({
            '家系ID': ['FAM001', 'FAM001', 'FAM001', 'FAM001'],
            '个体ID': ['S001', 'S002', 'S003', 'S004'],
            '父亲ID': ['', '', 'S001', 'S001'],
            '母亲ID': ['', '', 'S002', 'S002'],
            '性别': ['男', '女', '女', '女'],
            '患病状态': ['正常', '正常', '患病', '正常'],
            '关联样本ID': ['S001', 'S002', 'S003', 'S004']
        })
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            ped_file = f.name
        ped_df.to_excel(ped_file, index=False)
        
        importer.import_data(sample_file, 'sample', 'VALIDATION-TEST', user='test')
        importer.import_data(seq_file, 'sequencing', 'VALIDATION-TEST', user='test')
        importer.import_data(ped_file, 'pedigree', 'VALIDATION-TEST', user='test')
        
        os.unlink(sample_file)
        os.unlink(seq_file)
        os.unlink(ped_file)
        
        from app.models import ReagentBatch
        batch = ReagentBatch.query.filter_by(batch_number='VALIDATION-TEST').first()
        yield app, batch.id
    
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

def test_gender_consistency_validation(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        result = validator.run_all_validations(batch_id)
        
        assert result['success'] == True
        
        gender_rule = None
        for rule in result['rules']:
            if rule['rule_id'] == 'gender_consistency':
                gender_rule = rule
                break
        
        assert gender_rule is not None
        assert gender_rule['stats']['mismatch'] >= 1
        assert gender_rule['status'] == ValidationStatus.FAIL

def test_sample_sequencing_match_validation(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        result = validator.run_all_validations(batch_id)
        
        match_rule = None
        for rule in result['rules']:
            if rule['rule_id'] == 'sample_sequencing_match':
                match_rule = rule
                break
        
        assert match_rule is not None
        assert match_rule['stats']['samples_without_sequencing'] == 1
        assert match_rule['status'] == ValidationStatus.REVIEW

def test_pedigree_relationship_validation(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        result = validator.run_all_validations(batch_id)
        
        rel_rule = None
        for rule in result['rules']:
            if rule['rule_id'] == 'pedigree_relationship':
                rel_rule = rule
                break
        
        assert rel_rule is not None
        assert rel_rule['stats']['gender_violations'] >= 1

def test_data_completeness_validation(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        result = validator.run_all_validations(batch_id)
        
        completeness_rule = None
        for rule in result['rules']:
            if rule['rule_id'] == 'data_completeness':
                completeness_rule = rule
                break
        
        assert completeness_rule is not None

def test_validation_summary(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        result = validator.run_all_validations(batch_id)
        
        assert result['summary']['total_rules'] == 6
        assert result['summary']['total_conflicts'] > 0
        
        conflicts = validator.get_conflicts(batch_id)
        assert len(conflicts) > 0
        
        gender_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.GENDER_MISMATCH]
        assert len(gender_conflicts) > 0

def test_batch_diff(setup_test_data):
    app, batch1_id = setup_test_data
    with app.app_context():
        importer = DataImporter(upload_dir=tempfile.gettempdir())
        
        df = pd.DataFrame({
            '样本编号': ['S001', 'S002', 'S006'],
            '姓名': ['张三改', '李四', '新样本'],
            '性别': ['男', '女', '男'],
        })
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            batch2_file = f.name
        df.to_excel(batch2_file, index=False)
        
        importer.import_data(batch2_file, 'sample', 'VALIDATION-TEST-2', user='test', skip_duplicate_check=True)
        
        from app.models import ReagentBatch
        batch2 = ReagentBatch.query.filter_by(batch_number='VALIDATION-TEST-2').first()
        
        validator = PedigreeValidator()
        diff = validator.diff_batches(batch1_id, batch2.id)
        
        assert len(diff['only_in_batch1']) == 3
        assert len(diff['only_in_batch2']) == 1
        assert len(diff['in_both']) == 2
        assert len(diff['differences']) >= 1
        
        os.unlink(batch2_file)

def test_conflict_resolution(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        validator.run_all_validations(batch_id)
        
        conflicts = validator.get_conflicts(batch_id, status='open')
        assert len(conflicts) > 0
        
        conflict_id = conflicts[0].id
        result = validator.resolve_conflict(conflict_id, '测试解决备注', 'test_user')
        
        assert result == True
        
        resolved = validator.get_conflicts(batch_id, status='resolved')
        assert len(resolved) >= 1

def test_usability_assessment(setup_test_data):
    app, batch_id = setup_test_data
    with app.app_context():
        validator = PedigreeValidator()
        validator.run_all_validations(batch_id)
        
        dashboard = DashboardData()
        usability = dashboard.get_usability_assessment(batch_id)
        
        assert usability['assessment'] in ['ready', 'review', 'not_ready']
        
        details = usability['details']
        total = (len(details['ready_samples']) + 
                 len(details['needs_review_samples']) + 
                 len(details['not_usable_samples']))
        assert total >= 0

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
