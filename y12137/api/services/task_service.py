import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from api.models.database import get_db_connection, row_to_dict, rows_to_list
from api.core.audit_trail import AuditTrail


class TaskService:
    def __init__(self):
        self.audit_trail = AuditTrail()

    def create_task(self, name: str) -> Dict[str, Any]:
        task_id = f'task-{uuid.uuid4().hex[:8]}'

        with get_db_connection() as conn:
            conn.execute(
                'INSERT INTO calculation_tasks (id, name, status, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                (task_id, name, 'pending')
            )

            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

        return row_to_dict(task)

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            if not task:
                return None

            packages = conn.execute(
                'SELECT * FROM raw_data_packages WHERE task_id = ? ORDER BY imported_at',
                (task_id,)
            ).fetchall()

            task_dict = row_to_dict(task)
            task_dict['rawDataPackages'] = rows_to_list(packages)

        return task_dict

    def get_all_tasks(self, status: Optional[str] = None, include_duplicates: bool = True) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            if status:
                tasks = conn.execute(
                    'SELECT * FROM calculation_tasks WHERE status = ? ORDER BY updated_at DESC',
                    (status,)
                ).fetchall()
            else:
                tasks = conn.execute(
                    'SELECT * FROM calculation_tasks ORDER BY updated_at DESC'
                ).fetchall()

            task_list = []
            for task in tasks:
                task_dict = row_to_dict(task)

                packages = conn.execute(
                    'SELECT * FROM raw_data_packages WHERE task_id = ? ORDER BY imported_at',
                    (task_dict['id'],)
                ).fetchall()
                task_dict['rawDataPackages'] = rows_to_list(packages)

                latest_result = conn.execute(
                    'SELECT * FROM calculation_results WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1',
                    (task_dict['id'],)
                ).fetchone()
                if latest_result:
                    result_dict = row_to_dict(latest_result)
                    task_dict['latestResult'] = {
                        'id': result_dict['id'],
                        'contentHash': result_dict['content_hash'],
                        'calculatedAt': result_dict['calculated_at'],
                        'energy_model': result_dict.get('energy_model', '{}'),
                        'return_threshold': result_dict.get('return_threshold', '{}'),
                        'risks': result_dict.get('risks', '[]'),
                    }

                if not include_duplicates:
                    content_hash = task_dict.get('latestResult', {}).get('contentHash')
                    if content_hash:
                        existing = conn.execute(
                            'SELECT task_id FROM content_hashes WHERE hash = ? AND task_id < ? ORDER BY task_id LIMIT 1',
                            (content_hash, task_dict['id'])
                        ).fetchone()
                        if existing:
                            task_dict['isDuplicate'] = True
                            task_dict['originalTaskId'] = existing['task_id']
                        else:
                            task_dict['isDuplicate'] = False
                    else:
                        task_dict['isDuplicate'] = False

                task_list.append(task_dict)

        if not include_duplicates:
            task_list = [t for t in task_list if not t.get('isDuplicate', False)]

        return task_list

    def import_data_package(
        self,
        task_id: str,
        package_type: str,
        content: Dict[str, Any],
        source: str,
        imported_by: str = 'user'
    ) -> Dict[str, Any]:
        package_id = f'pkg-{uuid.uuid4().hex[:8]}'
        content_str = json.dumps(content, ensure_ascii=False)

        with get_db_connection() as conn:
            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            if not task:
                raise ValueError(f"Task {task_id} not found")

            conn.execute(
                '''INSERT INTO raw_data_packages
                   (id, task_id, type, content, source, imported_at)
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                (package_id, task_id, package_type, content_str, source)
            )

            conn.execute(
                'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ('pending', task_id)
            )

            package = conn.execute(
                'SELECT * FROM raw_data_packages WHERE id = ?',
                (package_id,)
            ).fetchone()

            self.audit_trail.log_import(
                task_id=task_id,
                package_type=package_type,
                source=source,
                imported_by=imported_by,
                content_summary=f'{package_type} data import',
                metadata={'package_id': package_id}
            )

            for audit_entry in self.audit_trail.to_dict(task_id):
                conn.execute(
                    '''INSERT OR IGNORE INTO correction_logs
                       (id, task_id, field, old_value, new_value, corrected_by, reason, corrected_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (
                        audit_entry['id'],
                        audit_entry['taskId'],
                        audit_entry['field'] or audit_entry['action'],
                        audit_entry.get('oldValue'),
                        audit_entry.get('newValue'),
                        audit_entry['performedBy'],
                        audit_entry.get('reason'),
                        audit_entry['timestamp']
                    )
                )

        return {
            'packageId': package_id,
            'taskId': task_id,
            'type': package_type,
            'source': source,
            'message': f'{package_type}数据导入成功'
        }

    def import_mixed_package(
        self,
        task_id: str,
        content: Dict[str, Any],
        source: str,
        imported_by: str = 'user'
    ) -> Dict[str, Any]:
        return self.import_data_package(
            task_id=task_id,
            package_type='mixed',
            content=content,
            source=source,
            imported_by=imported_by
        )

    def update_task_status(self, task_id: str, status: str, updated_by: str = 'system') -> Dict[str, Any]:
        valid_statuses = ['pending', 'calculating', 'completed', 'failed']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}")

        with get_db_connection() as conn:
            old_task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            if not old_task:
                raise ValueError(f"Task {task_id} not found")

            old_status = old_task['status']

            conn.execute(
                'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (status, task_id)
            )

            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            self.audit_trail.log_status_change(
                task_id=task_id,
                old_status=old_status,
                new_status=status,
                changed_by=updated_by,
                reason='Status update'
            )

        return {
            'taskId': task_id,
            'oldStatus': old_status,
            'newStatus': status,
            'message': f'任务状态已更新为: {status}'
        }

    def delete_task(self, task_id: str) -> Dict[str, Any]:
        with get_db_connection() as conn:
            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            if not task:
                raise ValueError(f"Task {task_id} not found")

            conn.execute('DELETE FROM calculation_tasks WHERE id = ?', (task_id,))

        return {
            'taskId': task_id,
            'message': '任务已删除'
        }

    def get_task_history(self, task_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            results = conn.execute(
                'SELECT * FROM calculation_results WHERE task_id = ? ORDER BY calculated_at DESC',
                (task_id,)
            ).fetchall()

            history = []
            for result in results:
                result_dict = row_to_dict(result)
                history.append({
                    'resultId': result_dict['id'],
                    'calculatedAt': result_dict['calculated_at'],
                    'contentHash': result_dict['content_hash'],
                    'energyModelSummary': {
                        'totalEnergyRequired': json.loads(result_dict['energy_model']).get('totalEnergyRequired')
                    }
                })

        return history

    def clone_task(self, source_task_id: str, new_name: str) -> Dict[str, Any]:
        new_task = self.create_task(new_name)
        new_task_id = new_task['id']

        with get_db_connection() as conn:
            packages = conn.execute(
                'SELECT * FROM raw_data_packages WHERE task_id = ?',
                (source_task_id,)
            ).fetchall()

            for pkg in packages:
                pkg_dict = row_to_dict(pkg)
                new_pkg_id = f'pkg-{uuid.uuid4().hex[:8]}'
                conn.execute(
                    '''INSERT INTO raw_data_packages
                       (id, task_id, type, content, source, imported_at)
                       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                    (new_pkg_id, new_task_id, pkg_dict['type'], pkg_dict['content'], pkg_dict['source'])
                )

        return {
            'newTaskId': new_task_id,
            'sourceTaskId': source_task_id,
            'message': f'任务已克隆为: {new_name}'
        }
