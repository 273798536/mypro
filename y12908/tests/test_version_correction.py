import pytest
import json
from app import db
from app.services.version_service import VersionService
from app.services.correction_service import CorrectionService
from app.services.deduplication_service import DeduplicationService
from app.services.diagnosis_service import DiagnosisService
from app.models.models import Sample, SampleVersion, ManualCorrection, SAMPLE_STATUS


class TestVersionService:

    def test_create_version(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='version_test',
                created_by='test'
            )
            sample = Sample.query.first()
            old_hash = sample.content_hash

            new_content = {
                "turns": [
                    {"user": "你好，我想了解一下产品定价", "assistant": "您好！我们产品的基础版是99元/月。"},
                    {"user": "那高级版呢？", "assistant": "高级版是199元/月，包含更多功能。"},
                    {"user": "有优惠吗？", "assistant": "年付可享8折优惠。"},
                    {"user": "好的，谢谢", "assistant": "不客气！"}
                ]
            }

            version = VersionService.create_version(
                sample_id=sample.id,
                new_content=new_content,
                change_reason='补充了优惠信息',
                changed_by='pm_user'
            )

            assert version.version_number == 2
            assert version.content_hash != old_hash
            assert version.change_reason == '补充了优惠信息'
            assert version.changed_by == 'pm_user'

            from app import db
            db.session.refresh(sample)
            assert sample.content_hash == version.content_hash
            assert sample.turn_count == 4

    def test_create_duplicate_content_no_new_version(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='dup_version_test',
                created_by='test'
            )
            sample = Sample.query.first()
            original_content = json.loads(sample.content)

            v1 = VersionService.create_version(
                sample_id=sample.id,
                new_content=original_content,
                change_reason='无变化',
                changed_by='test'
            )

            assert v1.version_number == 1

            v2 = VersionService.create_version(
                sample_id=sample.id,
                new_content=original_content,
                change_reason='还是无变化',
                changed_by='test'
            )

            assert v2.id == v1.id
            assert v2.version_number == 1

    def test_list_versions(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='list_ver_test',
                created_by='test'
            )
            sample = Sample.query.first()
            original_content = json.loads(sample.content)

            for i in range(3):
                new_content = dict(original_content)
                new_content['turns'].append({"user": f"补充问题{i}", "assistant": f"回答{i}"})
                VersionService.create_version(
                    sample_id=sample.id,
                    new_content=new_content,
                    change_reason=f'第{i+1}次修改',
                    changed_by='test'
                )

            versions = VersionService.list_versions(sample.id)
            assert len(versions) == 4
            assert versions[0].version_number == 4
            assert versions[-1].version_number == 1

    def test_revert_to_version(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='revert_test',
                created_by='test'
            )
            sample = Sample.query.first()
            original_content = json.loads(sample.content)
            v0_hash = sample.content_hash

            new_content = dict(original_content)
            new_content['turns'].append({"user": "临时问题", "assistant": "临时回答"})
            v2 = VersionService.create_version(
                sample_id=sample.id,
                new_content=new_content,
                change_reason='临时修改',
                changed_by='test'
            )

            from app import db
            db.session.refresh(sample)
            assert sample.content_hash == v2.content_hash
            assert v2.version_number == 2

            v3 = VersionService.revert_to_version(
                sample_id=sample.id,
                version_number=1,
                revert_reason='回退到初始版本',
                reverted_by='test'
            )

            assert v3.version_number == 3
            db.session.refresh(sample)
            assert sample.content_hash == v0_hash

    def test_compare_versions(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='compare_test',
                created_by='test'
            )
            sample = Sample.query.first()
            original_content = json.loads(sample.content)

            new_content = dict(original_content)
            new_content['turns'][0] = {"user": "修改后的问题", "assistant": "修改后的回答"}
            VersionService.create_version(
                sample_id=sample.id,
                new_content=new_content,
                change_reason='修改第一轮',
                changed_by='test'
            )

            diff = VersionService.compare_versions(sample.id, 1, 2)
            assert diff['total_changes'] == 1
            assert diff['changes'][0]['turn_index'] == 1
            assert diff['changes'][0]['change_type'] == 'modified'


class TestCorrectionService:

    def test_override_diagnosis(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='override_test',
                created_by='test'
            )
            sample = Sample.query.first()
            DiagnosisService.diagnose_sample(sample.id)

            from app import db
            db.session.refresh(sample)
            original_status = sample.status

            correction = CorrectionService.override_diagnosis(
                sample_id=sample.id,
                new_status='PASS',
                reason='人工审核确认无问题',
                overridden_by='pm_user'
            )

            assert correction.correction_type == 'override_diagnosis'
            assert correction.corrected_by == 'pm_user'

            db.session.refresh(sample)
            assert sample.status == SAMPLE_STATUS.CORRECTED

            latest_diag = DiagnosisService.get_latest_diagnosis(sample_id=sample.id)
            assert latest_diag.status.name == 'PASS'
            assert 'manual' in latest_diag.diagnosed_by

    def test_correct_content_creates_version(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='content_corr_test',
                created_by='test'
            )
            sample = Sample.query.first()
            old_version_count = SampleVersion.query.filter_by(sample_id=sample.id).count()

            new_content = {
                "turns": [
                    {"user": "新的对话", "assistant": "新的回答"}
                ]
            }

            correction = CorrectionService.correct_content(
                sample_id=sample.id,
                new_content=new_content,
                reason='修正错误内容',
                corrected_by='pm_user'
            )

            assert correction.correction_type == 'content'
            assert correction.version_number is not None

            new_version_count = SampleVersion.query.filter_by(sample_id=sample.id).count()
            assert new_version_count == old_version_count + 1

    def test_list_corrections(self, app, sample_test_data):
        with app.app_context():
            DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='list_corr_test',
                created_by='test'
            )
            sample = Sample.query.first()

            for i in range(3):
                CorrectionService.create_correction(
                    sample_id=sample.id,
                    correction_type='status',
                    old_value={'status': 'DIRTY'},
                    new_value={'status': 'CLEAN'},
                    correction_reason=f'修正{i}',
                    corrected_by='test',
                    auto_create_version=False
                )

            corrections = CorrectionService.list_corrections(sample_id=sample.id)
            assert len(corrections) == 3

            all_corrections = CorrectionService.list_corrections()
            assert len(all_corrections) >= 3

    def test_correction_stats(self, app, sample_test_data):
        with app.app_context():
            import_result = DeduplicationService.import_samples(
                samples_data=sample_test_data['samples'],
                batch_name='stats_corr_test',
                created_by='test'
            )

            sample1 = Sample.query.first()
            sample2 = Sample.query.offset(1).first()

            DiagnosisService.diagnose_sample(sample1.id)
            db.session.commit()

            CorrectionService.override_diagnosis(
                sample_id=sample1.id,
                new_status='PASS',
                reason='测试修正',
                overridden_by='user1'
            )

            CorrectionService.create_correction(
                sample_id=sample2.id,
                correction_type='status',
                old_value={'status': 'PENDING'},
                new_value={'status': 'CLEAN'},
                correction_reason='测试修正2',
                corrected_by='user2',
                auto_create_version=False
            )

            stats = CorrectionService.get_correction_stats(batch_id=import_result['batch_id'])
            assert stats['total_corrections'] == 2
            assert stats['corrected_samples'] == 2
            assert 'override_diagnosis' in stats['type_counts']
            assert 'status' in stats['type_counts']
