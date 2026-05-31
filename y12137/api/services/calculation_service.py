import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from api.models.database import get_db_connection, row_to_dict, rows_to_list
from api.core.energy_model import EnergyModel, EnergyModelParams
from api.core.return_threshold import ReturnThresholdCalculator, ThresholdParams
from api.core.risk_detector import RiskDetector
from api.core.source_tracer import SourceTracer
from api.core.deduplication_manager import DeduplicationManager
from api.core.audit_trail import AuditTrail


class CalculationService:
    def __init__(self):
        self.energy_model = EnergyModel()
        self.threshold_calculator = ReturnThresholdCalculator()
        self.risk_detector = RiskDetector()
        self.deduplication_manager = DeduplicationManager()

    def _parse_mixed_package(self, content: str) -> Dict[str, Any]:
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return {}

        parsed = {}
        if 'waypoint_plan' in data:
            parsed['waypoint_plan'] = data['waypoint_plan']
        if 'payload_weight' in data:
            parsed['payload_weight'] = data['payload_weight']
        if 'wind_field' in data:
            parsed['wind_field'] = data['wind_field']
        if 'battery' in data:
            parsed['battery_info'] = data
        if 'no_fly_zones' in data:
            parsed['no_fly_zones'] = data['no_fly_zones']

        return parsed

    def _extract_task_data(self, task_id: str) -> Dict[str, Any]:
        with get_db_connection() as conn:
            packages = conn.execute(
                'SELECT * FROM raw_data_packages WHERE task_id = ? ORDER BY imported_at',
                (task_id,)
            ).fetchall()

        task_data: Dict[str, Any] = {
            'waypoint_plan': None,
            'payload_weight': None,
            'wind_field': None,
            'battery_info': None,
            'no_fly_zones': None,
            'raw_packages': rows_to_list(packages)
        }

        for pkg in packages:
            pkg_dict = row_to_dict(pkg)
            pkg_type = pkg_dict['type']
            content = pkg_dict['content']

            if pkg_type == 'mixed':
                parsed = self._parse_mixed_package(content)
                for key, value in parsed.items():
                    task_data[key] = value
            elif pkg_type == 'waypoint_plan':
                try:
                    data = json.loads(content)
                    if 'waypoint_plan' in data:
                        task_data['waypoint_plan'] = data['waypoint_plan']
                    if 'no_fly_zones' in data:
                        task_data['no_fly_zones'] = data['no_fly_zones']
                    elif 'waypoints' in data:
                        task_data['waypoint_plan'] = data
                except json.JSONDecodeError:
                    pass
            elif pkg_type == 'payload_weight':
                try:
                    data = json.loads(content)
                    if 'payload_weight' in data:
                        task_data['payload_weight'] = data['payload_weight']
                    if 'battery' in data:
                        task_data['battery_info'] = data
                    elif 'payload' in data:
                        task_data['payload_weight'] = data
                except json.JSONDecodeError:
                    pass
            elif pkg_type == 'wind_field':
                try:
                    data = json.loads(content)
                    task_data['wind_field'] = data
                except json.JSONDecodeError:
                    pass
            elif pkg_type == 'battery':
                try:
                    data = json.loads(content)
                    task_data['battery_info'] = data
                except json.JSONDecodeError:
                    pass

        if task_data['wind_field'] is None:
            task_data['wind_field'] = {'baseWindSpeed': 0, 'suddenChange': None}

        return task_data

    def calculate(self, task_id: str) -> Dict[str, Any]:
        with get_db_connection() as conn:
            task = conn.execute(
                'SELECT * FROM calculation_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()

            if not task:
                raise ValueError(f"Task {task_id} not found")

            conn.execute(
                'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ('calculating', task_id)
            )

        try:
            task_data = self._extract_task_data(task_id)

            waypoint_plan = task_data['waypoint_plan'] or {'waypoints': [], 'totalDistance': 0}
            payload_weight = task_data['payload_weight'] or {'payload': 0}
            wind_field = task_data['wind_field']
            battery_info = task_data['battery_info']
            no_fly_zones = task_data['no_fly_zones']

            if not isinstance(payload_weight, dict):
                payload_weight = {'payload': payload_weight}

            payload = payload_weight.get('payload', 0) if isinstance(payload_weight, dict) else payload_weight
            waypoints = waypoint_plan.get('waypoints', [])
            total_distance = waypoint_plan.get('totalDistance', 0)

            aging_factor = 1.0
            if battery_info:
                battery = battery_info.get('battery', battery_info) if isinstance(battery_info, dict) else {}
                aging_factor = battery.get('agingFactor', 1.0)

            source_tracer = SourceTracer()
            audit_trail = AuditTrail()

            raw_package_ids = [p['id'] for p in task_data['raw_packages']]
            if raw_package_ids:
                energy_trace_node = source_tracer.trace_energy_calculation(
                    raw_data_package_id=raw_package_ids[0],
                    payload_weight=payload,
                    wind_speed=wind_field.get('baseWindSpeed', 0),
                    altitude=100.0,
                    speed=15.0,
                    power_consumption=0,
                    calculation_formula='P = P_base × (1 + 0.6×payload/max_payload) × (1 + 0.8×wind/max_wind) × ...'
                )

            energy_result = self.energy_model.calculate_energy_curve(
                waypoints=waypoints,
                total_distance=total_distance,
                payload_weight=payload,
                wind_field=wind_field,
                battery_aging_factor=aging_factor,
                no_fly_zones=no_fly_zones
            )

            threshold_result = self.threshold_calculator.calculate_dynamic_threshold(
                energy_model_result=energy_result,
                wind_sudden_change=wind_field.get('suddenChange'),
                battery_aging_factor=aging_factor
            )

            safety_margins = self.threshold_calculator.calculate_safety_margins(
                threshold=threshold_result,
                energy_model_result=energy_result
            )
            threshold_result['safetyMargins'] = safety_margins

            risks = self.risk_detector.detect_all_risks(
                waypoint_plan=waypoint_plan,
                payload_weight=payload_weight,
                wind_field=wind_field,
                battery_info=battery_info,
                no_fly_zones=no_fly_zones,
                energy_model_result=energy_result,
                return_threshold=threshold_result
            )

            risk_summary = self.risk_detector.calculate_risk_summary(risks)

            content_hash, hash_content = self.deduplication_manager.calculate_content_hash(
                waypoint_plan=waypoint_plan,
                payload_weight=payload_weight,
                wind_field=wind_field,
                battery_info=battery_info,
                no_fly_zones=no_fly_zones,
                corrections=None
            )

            with get_db_connection() as conn:
                existing_result = conn.execute(
                    'SELECT id FROM calculation_results WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1',
                    (task_id,)
                ).fetchone()

                if existing_result:
                    existing_result_id = existing_result['id']
                    conn.execute('DELETE FROM source_traces WHERE result_id = ?', (existing_result_id,))
                    conn.execute('DELETE FROM calculation_results WHERE id = ?', (existing_result_id,))

                with get_db_connection() as conn2:
                    existing_hash = conn2.execute(
                        'SELECT * FROM content_hashes WHERE hash = ?',
                        (content_hash,)
                    ).fetchone()

                    if existing_hash:
                        existing_task_id = existing_hash['task_id']
                        if existing_task_id != task_id:
                            original_result = conn2.execute(
                                'SELECT * FROM calculation_results WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1',
                                (existing_task_id,)
                            ).fetchone()
                            
                            if original_result:
                                result_id = str(uuid.uuid4())
                                conn2.execute(
                                    '''INSERT INTO calculation_results
                                       (id, task_id, energy_model, return_threshold, risks, content_hash, calculated_at)
                                       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                                    (
                                        result_id,
                                        task_id,
                                        original_result['energy_model'],
                                        original_result['return_threshold'],
                                        original_result['risks'],
                                        content_hash
                                    )
                                )

                            conn2.execute(
                                'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                ('completed', task_id)
                            )

                            original_data = self.get_result(existing_task_id) if original_result else {}
                            return {
                                'isDuplicate': True,
                                'duplicateTaskId': existing_task_id,
                                'message': f'检测到重复计算，任务 {existing_task_id} 已有相同输入的计算结果',
                                **{k: v for k, v in (original_data or {}).items() if k not in ('isDuplicate', 'duplicateTaskId', 'message')}
                            }

            source_traces = source_tracer.to_list()

            with get_db_connection() as conn:
                result_id = str(uuid.uuid4())

                conn.execute(
                    '''INSERT INTO calculation_results
                       (id, task_id, energy_model, return_threshold, risks, content_hash, calculated_at)
                       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                    (
                        result_id,
                        task_id,
                        json.dumps(energy_result, ensure_ascii=False),
                        json.dumps(threshold_result, ensure_ascii=False),
                        json.dumps(risks, ensure_ascii=False),
                        content_hash
                    )
                )

                conn.execute(
                    'INSERT OR IGNORE INTO content_hashes (hash, task_id, hash_content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                    (content_hash, task_id, hash_content)
                )

                for trace in source_traces:
                    conn.execute(
                        '''INSERT INTO source_traces
                           (id, result_id, type, description, value, source_package_id, correction_id, previous_node_id, timestamp)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                        (
                            trace['id'],
                            result_id,
                            trace['type'],
                            trace['description'],
                            trace['value'],
                            trace.get('sourcePackageId'),
                            trace.get('correctionId'),
                            trace.get('previousNodeId'),
                            trace['timestamp']
                        )
                    )

                audit_trail.log_calculation(
                    task_id=task_id,
                    calculation_type='wind_return_calculation',
                    performed_by='system',
                    result_summary=f'能耗: {energy_result["totalEnergyRequired"]} Wh, 风险等级: {risk_summary["overallRiskLevel"]}',
                    metadata={'result_id': result_id}
                )

                for audit_entry in audit_trail.to_dict(task_id):
                    conn.execute(
                        '''INSERT INTO correction_logs
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

                conn.execute(
                    'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    ('completed', task_id)
                )

            return {
                'isDuplicate': False,
                'taskId': task_id,
                'resultId': result_id,
                'energyModel': energy_result,
                'returnThreshold': threshold_result,
                'risks': risks,
                'riskSummary': risk_summary,
                'contentHash': content_hash,
                'sourceTraces': source_traces,
                'calculatedAt': datetime.now().isoformat()
            }

        except Exception as e:
            with get_db_connection() as conn:
                conn.execute(
                    'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    ('failed', task_id)
                )
            raise e

    def apply_correction(
        self,
        task_id: str,
        field: str,
        old_value: Any,
        new_value: Any,
        corrected_by: str,
        reason: str
    ) -> Dict[str, Any]:
        correction_id = str(uuid.uuid4())

        with get_db_connection() as conn:
            conn.execute(
                '''INSERT INTO correction_logs
                   (id, task_id, field, old_value, new_value, corrected_by, reason, corrected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                (
                    correction_id,
                    task_id,
                    field,
                    json.dumps(old_value, ensure_ascii=False) if isinstance(old_value, (dict, list)) else str(old_value),
                    json.dumps(new_value, ensure_ascii=False) if isinstance(new_value, (dict, list)) else str(new_value),
                    corrected_by,
                    reason
                )
            )

            conn.execute(
                'UPDATE calculation_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ('pending', task_id)
            )

        return {
            'correctionId': correction_id,
            'taskId': task_id,
            'field': field,
            'oldValue': old_value,
            'newValue': new_value,
            'correctedBy': corrected_by,
            'reason': reason,
            'message': '修正已记录，请重新执行计算'
        }

    def get_corrections(self, task_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            corrections = conn.execute(
                'SELECT * FROM correction_logs WHERE task_id = ? ORDER BY corrected_at DESC',
                (task_id,)
            ).fetchall()

        return rows_to_list(corrections)

    def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            result = conn.execute(
                'SELECT * FROM calculation_results WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1',
                (task_id,)
            ).fetchone()

            if not result:
                return None

            result_dict = row_to_dict(result)

            source_traces = conn.execute(
                'SELECT * FROM source_traces WHERE result_id = ? ORDER BY timestamp',
                (result_dict['id'],)
            ).fetchall()

            corrections = conn.execute(
                'SELECT * FROM correction_logs WHERE task_id = ? ORDER BY corrected_at DESC',
                (task_id,)
            ).fetchall()

        return {
            'taskId': task_id,
            'resultId': result_dict['id'],
            'energyModel': json.loads(result_dict['energy_model']),
            'returnThreshold': json.loads(result_dict['return_threshold']),
            'risks': json.loads(result_dict['risks']),
            'contentHash': result_dict['content_hash'],
            'sourceTraces': rows_to_list(source_traces),
            'corrections': rows_to_list(corrections),
            'calculatedAt': result_dict['calculated_at']
        }

    def check_duplicates(self, task_id: str) -> Dict[str, Any]:
        task_data = self._extract_task_data(task_id)

        content_hash, hash_content = self.deduplication_manager.calculate_content_hash(
            waypoint_plan=task_data['waypoint_plan'],
            payload_weight=task_data['payload_weight'],
            wind_field=task_data['wind_field'],
            battery_info=task_data['battery_info'],
            no_fly_zones=task_data['no_fly_zones']
        )

        with get_db_connection() as conn:
            existing = conn.execute(
                'SELECT * FROM content_hashes WHERE hash = ? AND task_id != ?',
                (content_hash, task_id)
            ).fetchall()

            all_hashes = conn.execute(
                'SELECT hash, task_id, hash_content FROM content_hashes WHERE task_id != ?',
                (task_id,)
            ).fetchall()

        near_duplicates = self.deduplication_manager.check_near_duplicate(
            content_hash,
            hash_content,
            rows_to_list(all_hashes),
            threshold=0.9
        )

        return {
            'contentHash': content_hash,
            'exactDuplicates': [
                {
                    'taskId': h['task_id'],
                    'hash': h['hash']
                }
                for h in rows_to_list(existing)
            ],
            'nearDuplicates': near_duplicates,
            'isDuplicate': len(existing) > 0
        }
