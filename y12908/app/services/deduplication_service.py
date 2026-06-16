from typing import List, Dict, Tuple, Optional
from datetime import datetime
import json
import pandas as pd
from sqlalchemy.exc import IntegrityError
from app import db
from app.models.models import (
    Sample,
    SampleVersion,
    EvaluationBank,
    SAMPLE_STATUS,
    generate_content_hash,
    generate_batch_id,
)
from app.services.error_handler import DuplicateImportConflictError


class DeduplicationService:

    @staticmethod
    def import_samples(samples_data: List[Dict], batch_name: str,
                       created_by: str = 'system') -> Dict:
        batch_id = generate_batch_id(batch_name)
        results = {
            'batch_id': batch_id,
            'batch_name': batch_name,
            'total': len(samples_data),
            'imported': 0,
            'duplicates': 0,
            'failed': 0,
            'failed_items': [],
        }

        for idx, sample_data in enumerate(samples_data):
            try:
                content = sample_data.get('content', sample_data)
                content_hash = generate_content_hash(content)

                existing_same_hash = Sample.query.filter_by(
                    content_hash=content_hash,
                    batch_id=batch_id
                ).first()

                if existing_same_hash:
                    results['duplicates'] += 1
                    continue

                sample = Sample(
                    content_hash=content_hash,
                    batch_id=batch_id,
                    batch_name=batch_name,
                    conversation_id=sample_data.get('conversation_id'),
                    user_id=sample_data.get('user_id'),
                    turn_count=len(content.get('turns', [])) if isinstance(content, dict) else 0,
                    content=json.dumps(content, ensure_ascii=False),
                    source_dataset=sample_data.get('source_dataset'),
                    split_type=sample_data.get('split_type'),
                    status=SAMPLE_STATUS.PENDING,
                    created_by=created_by,
                )
                db.session.add(sample)
                db.session.flush()

                initial_version = SampleVersion(
                    sample_id=sample.id,
                    version_number=1,
                    content=sample.content,
                    content_hash=content_hash,
                    change_reason='初始导入',
                    changed_by=created_by,
                )
                db.session.add(initial_version)

                results['imported'] += 1

            except IntegrityError as e:
                db.session.rollback()
                if 'UNIQUE constraint failed' in str(e):
                    results['duplicates'] += 1
                else:
                    results['failed'] += 1
                    results['failed_items'].append({
                        'index': idx,
                        'error': str(e),
                        'data': sample_data
                    })
            except Exception as e:
                db.session.rollback()
                results['failed'] += 1
                results['failed_items'].append({
                    'index': idx,
                    'error': str(e),
                    'data': sample_data
                })

        db.session.commit()
        return results

    @staticmethod
    def import_evaluation_bank(questions_data: List[Dict], bank_name: str,
                               import_batch_id: Optional[str] = None,
                               imported_by: str = 'system') -> Dict:
        if import_batch_id is None:
            import_batch_id = generate_batch_id(bank_name + '_eval')

        existing_bank = EvaluationBank.query.filter_by(
            import_batch_id=import_batch_id
        ).first()

        if existing_bank:
            raise DuplicateImportConflictError(
                message=f'评测题库批次 {import_batch_id} 已存在，禁止重复导入',
                existing_batch_id=import_batch_id,
                new_batch_id=import_batch_id
            )

        results = {
            'import_batch_id': import_batch_id,
            'bank_name': bank_name,
            'total': len(questions_data),
            'imported': 0,
            'duplicates': 0,
            'failed': 0,
        }

        existing_same_day = EvaluationBank.query.filter(
            EvaluationBank.bank_name == bank_name,
            EvaluationBank.created_at >= datetime.now().replace(hour=0, minute=0, second=0)
        ).all()

        existing_hashes = {eb.bank_hash for eb in existing_same_day}

        for idx, question_data in enumerate(questions_data):
            try:
                content = question_data.get('content', question_data)
                bank_hash = generate_content_hash(content)

                if bank_hash in existing_hashes:
                    results['duplicates'] += 1
                    continue

                existing = EvaluationBank.query.filter_by(
                    bank_hash=bank_hash,
                    import_batch_id=import_batch_id
                ).first()

                if existing:
                    results['duplicates'] += 1
                    continue

                eb = EvaluationBank(
                    bank_hash=bank_hash,
                    import_batch_id=import_batch_id,
                    bank_name=bank_name,
                    question_id=question_data.get('question_id'),
                    content=json.dumps(content, ensure_ascii=False),
                    source=question_data.get('source'),
                    imported_by=imported_by,
                )
                db.session.add(eb)
                results['imported'] += 1
                existing_hashes.add(bank_hash)

            except IntegrityError:
                db.session.rollback()
                results['duplicates'] += 1
            except Exception as e:
                db.session.rollback()
                results['failed'] += 1

        db.session.commit()
        return results

    @staticmethod
    def find_duplicates(batch_id: Optional[str] = None,
                        threshold: float = 0.95) -> List[Dict]:
        query = Sample.query
        if batch_id:
            query = query.filter_by(batch_id=batch_id)

        samples = query.all()
        duplicates = []
        seen_hashes = {}

        for sample in samples:
            if sample.content_hash in seen_hashes:
                original = seen_hashes[sample.content_hash]
                duplicates.append({
                    'type': 'exact_duplicate',
                    'similarity': 1.0,
                    'original_sample_id': original.id,
                    'duplicate_sample_id': sample.id,
                    'original_conversation_id': original.conversation_id,
                    'duplicate_conversation_id': sample.conversation_id,
                    'content_hash': sample.content_hash,
                })
            else:
                seen_hashes[sample.content_hash] = sample

        return duplicates

    @staticmethod
    def import_from_excel(file_path: str, batch_name: str,
                          sheet_name: Optional[str] = None) -> Dict:
        if sheet_name:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        else:
            df = pd.read_excel(file_path)

        samples_data = []
        for _, row in df.iterrows():
            sample = row.to_dict()
            if 'content' not in sample and 'conversation' in sample:
                sample['content'] = sample.pop('conversation')
            samples_data.append(sample)

        return DeduplicationService.import_samples(samples_data, batch_name)

    @staticmethod
    def get_batch_info(batch_id: str) -> Optional[Dict]:
        samples = Sample.query.filter_by(batch_id=batch_id).all()
        if not samples:
            return None

        status_counts = {}
        for sample in samples:
            status = sample.status.name
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            'batch_id': batch_id,
            'batch_name': samples[0].batch_name,
            'total_count': len(samples),
            'status_counts': status_counts,
            'created_at': min(s.created_at for s in samples).isoformat(),
            'created_by': samples[0].created_by,
        }

    @staticmethod
    def list_batches(limit: int = 100) -> List[Dict]:
        batch_ids = db.session.query(Sample.batch_id, Sample.batch_name,
                                    db.func.min(Sample.created_at).label('created_at')) \
            .group_by(Sample.batch_id, Sample.batch_name) \
            .order_by(db.desc('created_at')) \
            .limit(limit).all()

        result = []
        for batch_id, batch_name, created_at in batch_ids:
            info = DeduplicationService.get_batch_info(batch_id)
            if info:
                result.append(info)
        return result
