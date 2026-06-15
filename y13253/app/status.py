from datetime import datetime
from typing import Optional
from .models import db, PlanCompare
from .versioning import VersionService


class StatusService:

    STATUS_FLOW = {
        'draft': ['reviewing', 'obsolete'],
        'reviewing': ['confirmed', 'draft', 'pending'],
        'confirmed': ['approved', 'reviewing'],
        'pending': ['confirmed', 'reviewing'],
        'approved': ['reviewing', 'obsolete'],
        'rejected': ['reviewing', 'obsolete'],
        'obsolete': ['draft']
    }

    STATUS_LABELS = {
        'draft': '草稿',
        'reviewing': '复核中',
        'confirmed': '已确认',
        'pending': '待人工确认',
        'approved': '已通过',
        'rejected': '已驳回',
        'obsolete': '已废弃'
    }

    @classmethod
    def can_transition(cls, current_status: str, target_status: str) -> bool:
        allowed = cls.STATUS_FLOW.get(current_status, [])
        return target_status in allowed

    @classmethod
    def get_status_label(cls, status: str) -> str:
        return cls.STATUS_LABELS.get(status, status)

    @classmethod
    def get_allowed_statuses(cls, current_status: str) -> list:
        return cls.STATUS_FLOW.get(current_status, [])

    @staticmethod
    def transition(plan_id: int, target_status: str, reason: str = None,
                   operator: str = None) -> Optional[PlanCompare]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return None

        if not StatusService.can_transition(plan.status, target_status):
            raise ValueError(
                f'无法从状态 [{StatusService.get_status_label(plan.status)}] '
                f'转移到 [{StatusService.get_status_label(target_status)}]'
            )

        old_status = plan.status
        plan.status = target_status
        plan.updated_at = datetime.now()

        if target_status == 'pending':
            plan.need_confirm = True
            plan.confirm_reason = reason
        else:
            plan.need_confirm = False
            if reason:
                plan.next_step = reason

        db.session.commit()
        return plan

    @staticmethod
    def confirm(plan_id: int, confirmed: bool, operator: str = None,
                comment: str = None) -> Optional[PlanCompare]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return None

        if not plan.need_confirm:
            raise ValueError('该方案当前不需要人工确认')

        if confirmed:
            plan.status = 'confirmed'
            plan.need_confirm = False
            if comment:
                plan.next_step = comment
        else:
            plan.status = 'reviewing'
            plan.need_confirm = False
            if comment:
                plan.confirm_reason = comment

        plan.updated_at = datetime.now()
        db.session.commit()
        return plan

    @staticmethod
    def rerun(plan_id: int, operator: str = None, reason: str = None) -> Optional[PlanCompare]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return None

        VersionService.create_new_version(
            plan_id=plan_id,
            source='rerun',
            created_by=operator,
            description=f'重跑生成' + (f'，原因：{reason}' if reason else '')
        )

        plan.status = 'draft'
        plan.need_confirm = False
        plan.updated_at = datetime.now()
        db.session.commit()

        return plan

    @staticmethod
    def get_status_info(plan_id: int) -> dict:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return {}

        return {
            'status': plan.status,
            'status_label': StatusService.get_status_label(plan.status),
            'need_confirm': plan.need_confirm,
            'confirm_reason': plan.confirm_reason,
            'next_step': plan.next_step,
            'current_version': plan.current_version,
            'updated_at': plan.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'allowed_statuses': StatusService.get_allowed_statuses(plan.status)
        }
