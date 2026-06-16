from typing import List, Dict, Optional
from datetime import datetime
import json
from app import db
from app.models.models import (
    Sample,
    SampleVersion,
    generate_content_hash,
)


class VersionService:

    @staticmethod
    def create_version(sample_id: int, new_content: Dict,
                       change_reason: str, changed_by: str,
                       force_create: bool = False) -> SampleVersion:
        sample = Sample.query.get_or_404(sample_id)
        current_content = json.loads(sample.content)

        new_hash = generate_content_hash(new_content)
        if not force_create and new_hash == sample.content_hash:
            existing_version = SampleVersion.query.filter_by(
                sample_id=sample_id,
                content_hash=new_hash
            ).first()
            if existing_version:
                return existing_version

        latest_version = SampleVersion.query.filter_by(sample_id=sample_id) \
            .order_by(SampleVersion.version_number.desc()).first()
        next_version = (latest_version.version_number + 1) if latest_version else 1

        version = SampleVersion(
            sample_id=sample_id,
            version_number=next_version,
            content=json.dumps(new_content, ensure_ascii=False),
            content_hash=new_hash,
            change_reason=change_reason,
            changed_by=changed_by,
        )
        db.session.add(version)

        sample.content = json.dumps(new_content, ensure_ascii=False)
        sample.content_hash = new_hash
        sample.turn_count = len(new_content.get('turns', [])) if isinstance(new_content, dict) else 0
        sample.updated_at = datetime.now()

        db.session.flush()
        return version

    @staticmethod
    def get_version(sample_id: int, version_number: int) -> Optional[SampleVersion]:
        return SampleVersion.query.filter_by(
            sample_id=sample_id,
            version_number=version_number
        ).first()

    @staticmethod
    def list_versions(sample_id: int, limit: int = 20) -> List[SampleVersion]:
        return SampleVersion.query.filter_by(sample_id=sample_id) \
            .order_by(SampleVersion.version_number.desc()) \
            .limit(limit).all()

    @staticmethod
    def revert_to_version(sample_id: int, version_number: int,
                          revert_reason: str, reverted_by: str) -> SampleVersion:
        target_version = VersionService.get_version(sample_id, version_number)
        if not target_version:
            raise ValueError(f"版本 {version_number} 不存在")

        old_content = json.loads(target_version.content)
        return VersionService.create_version(
            sample_id=sample_id,
            new_content=old_content,
            change_reason=f"回退到版本 {version_number}: {revert_reason}",
            changed_by=reverted_by,
            force_create=True,
        )

    @staticmethod
    def compare_versions(sample_id: int, version_a: int,
                         version_b: int) -> Dict:
        v1 = VersionService.get_version(sample_id, version_a)
        v2 = VersionService.get_version(sample_id, version_b)

        if not v1 or not v2:
            raise ValueError("指定的版本不存在")

        content_a = json.loads(v1.content)
        content_b = json.loads(v2.content)

        changes = []
        if isinstance(content_a, dict) and isinstance(content_b, dict):
            turns_a = content_a.get('turns', [])
            turns_b = content_b.get('turns', [])

            max_turns = max(len(turns_a), len(turns_b))
            for i in range(max_turns):
                turn_a = turns_a[i] if i < len(turns_a) else None
                turn_b = turns_b[i] if i < len(turns_b) else None

                if turn_a != turn_b:
                    changes.append({
                        'turn_index': i + 1,
                        'change_type': 'modified' if turn_a and turn_b else ('added' if turn_b else 'removed'),
                        'old_value': turn_a,
                        'new_value': turn_b,
                    })

        return {
            'sample_id': sample_id,
            'version_a': version_a,
            'version_b': version_b,
            'total_changes': len(changes),
            'changes': changes,
        }

    @staticmethod
    def get_version_diff(sample_id: int, version_number: int) -> Optional[Dict]:
        current = VersionService.get_version(sample_id, version_number)
        previous = VersionService.get_version(sample_id, version_number - 1)

        if not current:
            return None

        if not previous:
            return {
                'sample_id': sample_id,
                'version_number': version_number,
                'diff_type': 'initial',
                'summary': '初始版本',
                'changes': [],
            }

        return VersionService.compare_versions(sample_id, version_number - 1, version_number)
