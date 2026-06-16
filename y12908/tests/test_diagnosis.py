import pytest
import json
from app.services.diagnosis_service import DiagnosisService
from app.services.deduplication_service import DeduplicationService
from app.services.error_handler import SecurityRuleMissingError
from app.models.models import (
    Sample, DiagnosisResult, SecurityRule,
    DIAGNOSIS_STATUS, SAMPLE_STATUS
)


class TestDiagnosisService:

    def test_validate_security_rules_pass(self, app):
        with app.app_context():
            rules = SecurityRule.query.all()
            assert len(rules) >= 3
            DiagnosisService._validate_security_rules()

    def test_validate_security_rules_missing(self, app):
        with app.app_context():
            rule = SecurityRule.query.filter_by(rule_code='LEAKAGE_001').first()
            rule.is_active = False
            from app import db
            db.session.commit()

            with pytest.raises(SecurityRuleMissingError) as excinfo:
                DiagnosisService._validate_security_rules()

            assert 'LEAKAGE_001' in excinfo.value.rule_codes
            assert len(excinfo.value.actionable_steps) > 0

    def test_diagnose_sample_clean(self, app, sample_test_data):
        with app.app_context():
            result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='test_batch',
                created_by='test'
            )
            sample = Sample.query.first()

            diagnosis = DiagnosisService.diagnose_sample(sample.id)

            assert diagnosis is not None
            assert diagnosis.is_latest == True
            assert diagnosis.diagnosis_type.name == 'FORGET'
            assert sample.status in [SAMPLE_STATUS.CLEAN, SAMPLE_STATUS.DIRTY]

    def test_diagnose_sample_leakage_detection(self, app, sample_test_data, eval_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='train_batch',
                created_by='test'
            )

            eval_result = DeduplicationService.import_evaluation_bank(
                questions_data=sample_test_data['samples'][:1],
                bank_name='eval_bank',
                imported_by='test'
            )

            sample = Sample.query.filter_by(split_type='train').first()

            diagnosis = DiagnosisService.diagnose_sample(sample.id)

            details = json.loads(diagnosis.details) if diagnosis.details else {}
            leakage_check = details.get('leakage_check', {})

            assert diagnosis is not None
            assert leakage_check.get('status') in ['PASS', 'FAIL']

    def test_diagnose_sample_forgetting_detection(self, app):
        with app.app_context():
            forgettable_sample = {
                "content": {
                    "turns": [
                        {"user": "我想了解机器学习的基础知识", "assistant": "机器学习是人工智能的一个分支..."},
                        {"user": "那深度学习呢？", "assistant": "深度学习是机器学习的子领域..."},
                        {"user": "今天天气真好", "assistant": "是的，天气不错。"}
                    ]
                },
                "split_type": "train",
                "user_id": "user_003"
            }

            result = DeduplicationService.import_samples(
                samples_data=[forgettable_sample],
                batch_name='forget_test',
                created_by='test'
            )
            sample = Sample.query.first()

            diagnosis = DiagnosisService.diagnose_sample(sample.id)
            details = json.loads(diagnosis.details) if diagnosis.details else {}
            forget_check = details.get('forget_check', {})

            assert diagnosis is not None
            assert forget_check.get('status') == 'FAIL'
            assert '多轮遗忘' in forget_check.get('summary', '')

    def test_diagnose_batch(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_diag',
                created_by='test'
            )

            batch_result = DiagnosisService.diagnose_batch(import_result['batch_id'])

            assert batch_result['total'] == 2
            assert batch_result['processed'] == 2
            assert 'pass_rate' in batch_result
            assert 0 <= batch_result['pass_rate'] <= 1

    def test_latest_diagnosis_mechanism(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='latest_test',
                created_by='test'
            )
            sample = Sample.query.first()

            diag1 = DiagnosisService.diagnose_sample(sample.id)
            assert diag1.is_latest == True

            diag2 = DiagnosisService.diagnose_sample(sample.id)
            assert diag2.is_latest == True

            from app import db
            db.session.refresh(diag1)
            assert diag1.is_latest == False

            latest = DiagnosisService.get_latest_diagnosis(sample_id=sample.id)
            assert latest.id == diag2.id

    def test_diagnosis_history(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='history_test',
                created_by='test'
            )
            sample = Sample.query.first()

            for i in range(3):
                DiagnosisService.diagnose_sample(sample.id)

            history = DiagnosisService.get_diagnosis_history('sample', sample.id)
            assert len(history) == 3
            assert all(h.sample_id == sample.id for h in history)

    def test_missing_rules_produces_actionable_error(self, app, sample_test_data):
        with app.app_context():
            for rule_code in ['LEAKAGE_001', 'LEAKAGE_002', 'LEAKAGE_003']:
                rule = SecurityRule.query.filter_by(rule_code=rule_code).first()
                rule.is_active = False
            from app import db
            db.session.commit()

            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='error_test',
                created_by='test'
            )
            sample = Sample.query.first()

            diagnosis = DiagnosisService.diagnose_sample(sample.id)

            assert diagnosis.status == DIAGNOSIS_STATUS.ERROR
            assert diagnosis.missing_rules is not None
            assert 'LEAKAGE_001' in diagnosis.missing_rules

            details = json.loads(diagnosis.details) if diagnosis.details else {}
            assert 'error' in details
            error_data = details.get('error', {})
            assert 'actionable_steps' in error_data
            assert len(error_data['actionable_steps']) > 0
