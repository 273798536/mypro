from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import db, PlanCompare, PlanVersion, PlanItem, InspectionRecord, Remark


class VersionService:

    @staticmethod
    def create_new_version(plan_id: int, source: str = 'current',
                           created_by: str = None, description: str = None,
                           items_data: List[Dict] = None) -> PlanVersion:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            raise ValueError(f'方案 {plan_id} 不存在')

        new_version_num = plan.current_version + 1

        new_version = PlanVersion(
            plan_compare_id=plan_id,
            version_num=new_version_num,
            title=f'{plan.title} v{new_version_num}',
            source=source,
            created_by=created_by,
            description=description or f'版本 {new_version_num}'
        )
        db.session.add(new_version)
        db.session.flush()

        if items_data:
            for idx, item_data in enumerate(items_data):
                item = PlanItem(
                    version_id=new_version.id,
                    sort_order=idx,
                    **item_data
                )
                db.session.add(item)
        else:
            current_version = plan.get_current_version()
            if current_version:
                for old_item in current_version.items:
                    new_item = PlanItem(
                        version_id=new_version.id,
                        sort_order=old_item.sort_order,
                        location=old_item.location,
                        booth_count=old_item.booth_count,
                        area=old_item.area,
                        business_type=old_item.business_type,
                        operating_hours=old_item.operating_hours,
                        status=old_item.status,
                        impact_factor=old_item.impact_factor,
                        original_source=old_item.original_source,
                        notes=old_item.notes
                    )
                    db.session.add(new_item)

        plan.current_version = new_version_num
        plan.updated_at = datetime.now()
        db.session.commit()
        return new_version

    @staticmethod
    def rollback_to_version(plan_id: int, version_num: int, reason: str = None) -> PlanVersion:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            raise ValueError(f'方案 {plan_id} 不存在')

        target_version = plan.versions.filter_by(version_num=version_num).first()
        if not target_version:
            raise ValueError(f'版本 {version_num} 不存在')

        new_version_num = plan.current_version + 1
        new_version = PlanVersion(
            plan_compare_id=plan_id,
            version_num=new_version_num,
            title=f'{plan.title} v{new_version_num}',
            source='rollback',
            description=f'回退到 v{version_num}' + (f'，原因：{reason}' if reason else '')
        )
        db.session.add(new_version)
        db.session.flush()

        for old_item in target_version.items:
            new_item = PlanItem(
                version_id=new_version.id,
                sort_order=old_item.sort_order,
                location=old_item.location,
                booth_count=old_item.booth_count,
                area=old_item.area,
                business_type=old_item.business_type,
                operating_hours=old_item.operating_hours,
                status=old_item.status,
                impact_factor=old_item.impact_factor,
                original_source=f'回退自v{version_num}',
                notes=old_item.notes
            )
            db.session.add(new_item)

        plan.current_version = new_version_num
        plan.updated_at = datetime.now()
        db.session.commit()
        return new_version

    @staticmethod
    def compare_versions(plan_id: int, v1: int, v2: int) -> Dict[str, Any]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return {}

        version1 = plan.versions.filter_by(version_num=v1).first()
        version2 = plan.versions.filter_by(version_num=v2).first()
        if not version1 or not version2:
            return {}

        items1 = {item.location: item for item in version1.items}
        items2 = {item.location: item for item in version2.items}

        all_locations = set(items1.keys()) | set(items2.keys())

        added = []
        removed = []
        modified = []
        unchanged = []

        for loc in all_locations:
            if loc in items1 and loc not in items2:
                removed.append(loc)
            elif loc not in items1 and loc in items2:
                added.append(loc)
            else:
                i1, i2 = items1[loc], items2[loc]
                changes = []
                if i1.booth_count != i2.booth_count:
                    changes.append(f'摊位数量: {i1.booth_count} → {i2.booth_count}')
                if i1.area != i2.area:
                    changes.append(f'面积: {i1.area} → {i2.area}')
                if i1.status != i2.status:
                    changes.append(f'状态: {i1.status} → {i2.status}')
                if i1.business_type != i2.business_type:
                    changes.append(f'业态: {i1.business_type} → {i2.business_type}')
                if changes:
                    modified.append({'location': loc, 'changes': changes})
                else:
                    unchanged.append(loc)

        return {
            'version1': v1,
            'version2': v2,
            'added': added,
            'removed': removed,
            'modified': modified,
            'unchanged': unchanged,
            'total_changes': len(added) + len(removed) + len(modified)
        }

    @staticmethod
    def list_versions(plan_id: int) -> List[PlanVersion]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return []
        return plan.versions.all()


class RecordService:

    @staticmethod
    def add_record(plan_id: int, record_type: str, title: str, content: str,
                   source: str = None, is_old_version: bool = False,
                   affects_conclusion: bool = False,
                   related_item_id: int = None) -> InspectionRecord:
        record = InspectionRecord(
            plan_compare_id=plan_id,
            record_type=record_type,
            title=title,
            content=content,
            source=source,
            is_old_version=is_old_version,
            affects_conclusion=affects_conclusion,
            related_item_id=related_item_id
        )
        db.session.add(record)

        plan = PlanCompare.query.get(plan_id)
        if plan:
            plan.updated_at = datetime.now()

        db.session.commit()
        return record

    @staticmethod
    def get_records(plan_id: int, record_type: str = None,
                    affects_conclusion: bool = None) -> List[InspectionRecord]:
        query = InspectionRecord.query.filter_by(plan_compare_id=plan_id)
        if record_type:
            query = query.filter_by(record_type=record_type)
        if affects_conclusion is not None:
            query = query.filter_by(affects_conclusion=affects_conclusion)
        return query.order_by(InspectionRecord.created_at.desc()).all()

    @staticmethod
    def analyze_conclusion_impact(plan_id: int) -> List[Dict[str, Any]]:
        records = RecordService.get_records(plan_id, affects_conclusion=True)
        result = []
        for r in records:
            result.append({
                'id': r.id,
                'type': r.record_type,
                'title': r.title,
                'is_old': r.is_old_version,
                'source': r.source,
                'content': r.content,
                'related_item_id': r.related_item_id
            })
        return result


class RemarkService:

    @staticmethod
    def add_remark(plan_id: int, content: str, author: str = None,
                   remark_type: str = 'normal', source: str = None) -> Remark:
        remark = Remark(
            plan_compare_id=plan_id,
            content=content,
            author=author,
            remark_type=remark_type,
            source=source
        )
        db.session.add(remark)

        plan = PlanCompare.query.get(plan_id)
        if plan:
            plan.updated_at = datetime.now()

        db.session.commit()
        return remark

    @staticmethod
    def merge_remarks(plan_id: int, remark_ids: List[int], merged_content: str,
                      author: str = None) -> Remark:
        remarks = Remark.query.filter(
            Remark.id.in_(remark_ids),
            Remark.plan_compare_id == plan_id
        ).all()

        original_texts = [f'[{r.created_at.strftime("%Y-%m-%d %H:%M")} {r.author or "匿名"}] {r.content}'
                          for r in remarks]

        merged = Remark(
            plan_compare_id=plan_id,
            content=merged_content,
            author=author,
            remark_type='merged',
            is_merged=True,
            merged_from='\n'.join(original_texts)
        )
        db.session.add(merged)

        for r in remarks:
            r.is_merged = True

        plan = PlanCompare.query.get(plan_id)
        if plan:
            plan.updated_at = datetime.now()

        db.session.commit()
        return merged

    @staticmethod
    def get_remarks(plan_id: int, include_merged: bool = True) -> List[Remark]:
        query = Remark.query.filter_by(plan_compare_id=plan_id)
        if not include_merged:
            query = query.filter_by(is_merged=False)
        return query.order_by(Remark.created_at.desc()).all()
