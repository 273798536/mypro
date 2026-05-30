"""

方案对比器

对比不同生产计划的差异，帮助计划员理解方案变化

"""

from datetime import date

from typing import List, Dict, Any, Optional, Tuple

from dataclasses import dataclass

from enum import Enum

from .models import ProductionPlan, ScheduledTask, Order

class ChangeType(Enum):

    ADDED = "新增"

    REMOVED = "移除"

    MODIFIED = "修改"

    UNCHANGED = "未变"

@dataclass

class TaskChange:

    order_id: str

    change_type: ChangeType

    field_changes: Dict[str, Dict[str, Any]]

    old_value: Optional[ScheduledTask]

    new_value: Optional[ScheduledTask]

    def to_dict(self) -> Dict[str, Any]:

        return {

            "order_id": self.order_id,

            "change_type": self.change_type.value,

            "field_changes": self.field_changes,

            "old_value": self.old_value.to_dict() if self.old_value else None,

            "new_value": self.new_value.to_dict() if self.new_value else None,

        }

@dataclass

class ComparisonResult:

    plan1_name: str

    plan2_name: str

    task_changes: List[TaskChange]

    summary: Dict[str, Any]

    metrics_diff: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:

        return {

            "plan1_name": self.plan1_name,

            "plan2_name": self.plan2_name,

            "task_changes": [tc.to_dict() for tc in self.task_changes],

            "summary": self.summary,

            "metrics_diff": self.metrics_diff,

        }

class PlanComparator:

    def __init__(self, orders: List[Order]):

        self.orders = {o.order_id: o for o in orders}

    def compare(self, plan1: ProductionPlan, plan2: ProductionPlan) -> ComparisonResult:

        tasks1 = self._tasks_by_order(plan1)

        tasks2 = self._tasks_by_order(plan2)

        all_order_ids = set(tasks1.keys()) | set(tasks2.keys())

        task_changes = []

        for order_id in all_order_ids:

            task1 = tasks1.get(order_id)

            task2 = tasks2.get(order_id)

            change = self._compare_task(order_id, task1, task2)

            if change:

                task_changes.append(change)

        summary = self._generate_summary(task_changes)

        metrics_diff = self._compare_metrics(plan1, plan2)

        return ComparisonResult(

            plan1_name=plan1.name,

            plan2_name=plan2.name,

            task_changes=task_changes,

            summary=summary,

            metrics_diff=metrics_diff,

        )

    def _tasks_by_order(self, plan: ProductionPlan) -> Dict[str, ScheduledTask]:

        result = {}

        for task in plan.scheduled_tasks:

            if task.order_id not in result:

                result[task.order_id] = task

            else:

                if task.end_date > result[task.order_id].end_date:

                    result[task.order_id] = task

        return result

    def _compare_task(

        self, order_id: str, task1: Optional[ScheduledTask], task2: Optional[ScheduledTask]

    ) -> Optional[TaskChange]:

        if task1 is None and task2 is not None:

            return TaskChange(

                order_id=order_id,

                change_type=ChangeType.ADDED,

                field_changes={},

                old_value=None,

                new_value=task2,

            )

        if task1 is not None and task2 is None:

            return TaskChange(

                order_id=order_id,

                change_type=ChangeType.REMOVED,

                field_changes={},

                old_value=task1,

                new_value=None,

            )

        if task1 is None or task2 is None:

            return None

        field_changes = {}

        if task1.machine_id != task2.machine_id:

            field_changes["machine_id"] = {

                "old": task1.machine_id,

                "new": task2.machine_id,

            }

        if task1.start_date != task2.start_date:

            field_changes["start_date"] = {

                "old": task1.start_date.isoformat(),

                "new": task2.start_date.isoformat(),

            }

        if task1.end_date != task2.end_date:

            field_changes["end_date"] = {

                "old": task1.end_date.isoformat(),

                "new": task2.end_date.isoformat(),

            }

        if abs(task1.quantity - task2.quantity) > 1e-6:

            field_changes["quantity"] = {

                "old": round(task1.quantity, 2),

                "new": round(task2.quantity, 2),

            }

        if task1.is_delayed != task2.is_delayed:

            field_changes["is_delayed"] = {

                "old": task1.is_delayed,

                "new": task2.is_delayed,

            }

        if field_changes:

            return TaskChange(

                order_id=order_id,

                change_type=ChangeType.MODIFIED,

                field_changes=field_changes,

                old_value=task1,

                new_value=task2,

            )

        return TaskChange(

            order_id=order_id,

            change_type=ChangeType.UNCHANGED,

            field_changes={},

            old_value=task1,

            new_value=task2,

        )

    def _generate_summary(self, task_changes: List[TaskChange]) -> Dict[str, Any]:

        counts = {

            "added": 0,

            "removed": 0,

            "modified": 0,

            "unchanged": 0,

        }

        for change in task_changes:

            if change.change_type == ChangeType.ADDED:

                counts["added"] += 1

            elif change.change_type == ChangeType.REMOVED:

                counts["removed"] += 1

            elif change.change_type == ChangeType.MODIFIED:

                counts["modified"] += 1

            elif change.change_type == ChangeType.UNCHANGED:

                counts["unchanged"] += 1

        modified_fields: Dict[str, int] = {}

        for change in task_changes:

            if change.change_type == ChangeType.MODIFIED:

                for field in change.field_changes.keys():

                    modified_fields[field] = modified_fields.get(field, 0) + 1

        return {

            "total_tasks": len(task_changes),

            "counts": counts,

            "modified_fields": modified_fields,

        }

    def _compare_metrics(self, plan1: ProductionPlan, plan2: ProductionPlan) -> Dict[str, Any]:

        plan1_delay_count = sum(1 for t in plan1.scheduled_tasks if t.is_delayed)

        plan2_delay_count = sum(1 for t in plan2.scheduled_tasks if t.is_delayed)

        plan1_end = max((t.end_date for t in plan1.scheduled_tasks), default=plan1.start_date)

        plan2_end = max((t.end_date for t in plan2.scheduled_tasks), default=plan2.start_date)

        return {

            "task_count": {

                "plan1": len(plan1.scheduled_tasks),

                "plan2": len(plan2.scheduled_tasks),

                "diff": len(plan2.scheduled_tasks) - len(plan1.scheduled_tasks),

            },

            "unscheduled_count": {

                "plan1": len(plan1.unscheduled_orders),

                "plan2": len(plan2.unscheduled_orders),

                "diff": len(plan2.unscheduled_orders) - len(plan1.unscheduled_orders),

            },

            "delayed_count": {

                "plan1": plan1_delay_count,

                "plan2": plan2_delay_count,

                "diff": plan2_delay_count - plan1_delay_count,

            },

            "makespan": {

                "plan1": (plan1_end - plan1.start_date).days,

                "plan2": (plan2_end - plan2.start_date).days,

                "diff": (plan2_end - plan2.start_date).days - (plan1_end - plan1.start_date).days,

                "unit": "天",

            },

            "objective_value": {

                "plan1": round(plan1.objective_value, 2),

                "plan2": round(plan2.objective_value, 2),

                "diff": round(plan2.objective_value - plan1.objective_value, 2),

            },

        }

