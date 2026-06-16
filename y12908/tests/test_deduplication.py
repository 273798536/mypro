import pytest
from app.services.deduplication_service import DeduplicationService
from app.models.models import Sample, generate_content_hash


class TestDeduplicationService:

    def test_import_samples_success(self, app, sample_test_data):
        with app.app_context():
            result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name=sample_test_data['batch_name'],
                created_by='test_user'
            )

            assert result['batch_id'] is not None
            assert result['total'] == 2
            assert result['imported'] == 2
            assert result['duplicates'] == 0
            assert result['failed'] == 0

            samples = Sample.query.all()
            assert len(samples) == 2
            assert samples[0].batch_name == sample_test_data['batch_name']
            assert samples[0].status.name == 'PENDING'

    def test_import_samples_duplicate_detection(self, app, sample_test_data):
        with app.app_context():
            result1 = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name=sample_test_data['batch_name'],
                created_by='test_user'
            )

            duplicate_samples = sample_test_data['samples'] * 2
            result2 = DeduplicationService.import_samples(
                samples_data=duplicate_samples,
                batch_name=sample_test_data['batch_name'] + '_v2',
                created_by='test_user'
            )

            assert result2['total'] == 4
            assert result2['imported'] == 2
            assert result2['duplicates'] == 2

    def test_import_samples_same_batch_idempotent(self, app, sample_test_data):
        with app.app_context():
            batch_id = None
            for i in range(3):
                result = DeduplicationService.import_samples(
                    samples_data=sample_test_data['samples'],
                    batch_name=sample_test_data['batch_name'],
                    created_by='test_user'
                )
                if batch_id is None:
                    batch_id = result['batch_id']
                assert result['batch_id'] == batch_id
                assert result['imported'] == (2 if i == 0 else 0)
                assert result['duplicates'] == (0 if i == 0 else 2)

            total_samples = Sample.query.filter_by(batch_id=batch_id).count()
            assert total_samples == 2

    def test_import_evaluation_bank_duplicate_protection(self, app, eval_test_data):
        with app.app_context():
            result1 = DeduplicationService.import_evaluation_bank(
                questions_data=eval_test_data['questions'],
                bank_name=eval_test_data['bank_name'],
                imported_by='test_user'
            )
            assert result1['imported'] == 2

            with pytest.raises(Exception) as excinfo:
                DeduplicationService.import_evaluation_bank(
                    questions_data=eval_test_data['questions'],
                    bank_name=eval_test_data['bank_name'],
                    import_batch_id=result1['import_batch_id'],
                    imported_by='test_user'
                )
            assert '已存在' in str(excinfo.value)

    def test_find_duplicates_exact_match(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='dup_test_batch_1',
                created_by='test_user'
            )
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='dup_test_batch_2',
                created_by='test_user'
            )

            duplicates = DeduplicationService.find_duplicates()

            assert len(duplicates) == 2
            for dup in duplicates:
                assert dup['type'] == 'exact_duplicate'
                assert dup['similarity'] == 1.0

    def test_generate_content_hash_consistency(self):
        content1 = {"turns": [{"user": "你好", "assistant": "您好"}]}
        content2 = {"turns": [{"user": "你好", "assistant": "您好"}]}
        content3 = {"turns": [{"user": "你好吗", "assistant": "您好"}]}

        hash1 = generate_content_hash(content1)
        hash2 = generate_content_hash(content2)
        hash3 = generate_content_hash(content3)

        assert hash1 == hash2
        assert hash1 != hash3
        assert len(hash1) == 64

    def test_list_batches(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_1',
                created_by='test_user'
            )
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='batch_2',
                created_by='test_user'
            )

            batches = DeduplicationService.list_batches()
            assert len(batches) == 2
            assert {b['batch_name'] for b in batches} == {'batch_1', 'batch_2'}
