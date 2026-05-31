import hashlib
import json
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime

class DeduplicationManager:
    def __init__(self):
        self.hash_fields = [
            'waypoint_plan',
            'payload_weight',
            'wind_field',
            'battery_info',
            'no_fly_zones',
            'calculation_params'
        ]
        self.excluded_fields = ['id', 'created_at', 'updated_at', 'timestamp', 'imported_at']

    def _normalize_value(self, value: Any) -> Any:
        if isinstance(value, float):
            return round(value, 6)
        elif isinstance(value, dict):
            return {k: self._normalize_value(v) for k, v in sorted(value.items()) if k not in self.excluded_fields}
        elif isinstance(value, list):
            return [self._normalize_value(v) for v in value]
        return value

    def _extract_hash_content(self, data: Dict[str, Any]) -> Dict[str, Any]:
        hash_content = {}
        for field in self.hash_fields:
            if field in data:
                hash_content[field] = self._normalize_value(data[field])
        return hash_content

    def calculate_content_hash(
        self,
        waypoint_plan: Optional[Dict[str, Any]] = None,
        payload_weight: Optional[Dict[str, Any]] = None,
        wind_field: Optional[Dict[str, Any]] = None,
        battery_info: Optional[Dict[str, Any]] = None,
        no_fly_zones: Optional[List[Dict[str, Any]]] = None,
        calculation_params: Optional[Dict[str, Any]] = None,
        corrections: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[str, str]:
        hash_data = {
            'waypoint_plan': waypoint_plan,
            'payload_weight': payload_weight,
            'wind_field': wind_field,
            'battery_info': battery_info,
            'no_fly_zones': no_fly_zones,
            'calculation_params': calculation_params
        }

        if corrections:
            hash_data['corrections'] = [
                {
                    'field': c.get('field'),
                    'new_value': c.get('new_value'),
                    'corrected_by': c.get('corrected_by')
                }
                for c in corrections
            ]

        normalized = self._normalize_value(hash_data)
        json_str = json.dumps(normalized, sort_keys=True, ensure_ascii=False)

        hash_obj = hashlib.sha256(json_str.encode('utf-8'))
        hash_hex = hash_obj.hexdigest()

        return hash_hex, json_str

    def calculate_result_hash(self, calculation_result: Dict[str, Any]) -> Tuple[str, str]:
        result_data = {
            'energy_model': calculation_result.get('energy_model'),
            'return_threshold': calculation_result.get('return_threshold'),
            'risks': calculation_result.get('risks')
        }

        normalized = self._normalize_value(result_data)
        json_str = json.dumps(normalized, sort_keys=True, ensure_ascii=False)

        hash_obj = hashlib.sha256(json_str.encode('utf-8'))
        hash_hex = hash_obj.hexdigest()

        return hash_hex, json_str

    def check_duplicate(
        self,
        new_hash: str,
        existing_hashes: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        for existing in existing_hashes:
            if existing.get('hash') == new_hash:
                return existing
        return None

    def check_near_duplicate(
        self,
        new_hash: str,
        new_content: str,
        existing_hashes: List[Dict[str, Any]],
        threshold: float = 0.95
    ) -> List[Dict[str, Any]]:
        near_duplicates = []
        for existing in existing_hashes:
            similarity = self._calculate_similarity(new_content, existing.get('hash_content', ''))
            if similarity >= threshold:
                near_duplicates.append({
                    'task_id': existing.get('task_id'),
                    'hash': existing.get('hash'),
                    'similarity': round(similarity, 4)
                })
        return near_duplicates

    def _calculate_similarity(self, str1: str, str2: str) -> float:
        if not str1 or not str2:
            return 0.0

        set1 = set(str1.split('"'))
        set2 = set(str2.split('"'))

        intersection = set1.intersection(set2)
        union = set1.union(set2)

        if not union:
            return 0.0

        return len(intersection) / len(union)

    def get_duplicate_info(
        self,
        duplicate_task: Dict[str, Any],
        new_task: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {
            'isDuplicate': True,
            'duplicateTaskId': duplicate_task.get('id'),
            'duplicateTaskName': duplicate_task.get('name'),
            'duplicateCreatedAt': duplicate_task.get('created_at'),
            'newTaskId': new_task.get('id'),
            'newTaskName': new_task.get('name'),
            'message': f'检测到重复计算，已有相同计算任务 "{duplicate_task.get("name")}" 创建于 {duplicate_task.get("created_at")}'
        }

    def merge_duplicate_tasks(
        self,
        primary_task: Dict[str, Any],
        duplicate_task: Dict[str, Any]
    ) -> Dict[str, Any]:
        merged = dict(primary_task)

        if duplicate_task.get('raw_data_packages'):
            existing_pkgs = {p.get('id') for p in merged.get('raw_data_packages', [])}
            for pkg in duplicate_task['raw_data_packages']:
                if pkg.get('id') not in existing_pkgs:
                    merged.setdefault('raw_data_packages', []).append(pkg)

        if duplicate_task.get('correction_logs'):
            existing_corrections = {c.get('id') for c in merged.get('correction_logs', [])}
            for corr in duplicate_task['correction_logs']:
                if corr.get('id') not in existing_corrections:
                    merged.setdefault('correction_logs', []).append(corr)

        merged['duplicate_of'] = duplicate_task.get('id')
        merged['merged_at'] = datetime.now().isoformat()

        return merged

    def compare_tasks(
        self,
        task1: Dict[str, Any],
        task2: Dict[str, Any]
    ) -> Dict[str, Any]:
        differences = []

        pkg1_ids = {p.get('id') for p in task1.get('raw_data_packages', [])}
        pkg2_ids = {p.get('id') for p in task2.get('raw_data_packages', [])}

        if pkg1_ids != pkg2_ids:
            differences.append({
                'field': 'raw_data_packages',
                'task1_value': sorted(pkg1_ids),
                'task2_value': sorted(pkg2_ids),
                'difference': '不同的原始数据包'
            })

        corr1_ids = {c.get('id') for c in task1.get('corrections', [])}
        corr2_ids = {c.get('id') for c in task2.get('corrections', [])}

        if corr1_ids != corr2_ids:
            differences.append({
                'field': 'corrections',
                'task1_value': sorted(corr1_ids),
                'task2_value': sorted(corr2_ids),
                'difference': '不同的修正记录'
            })

        result1 = task1.get('latest_result', {})
        result2 = task2.get('latest_result', {})

        if result1.get('energy_model', {}).get('totalEnergyRequired') != result2.get('energy_model', {}).get('totalEnergyRequired'):
            differences.append({
                'field': 'total_energy_required',
                'task1_value': result1.get('energy_model', {}).get('totalEnergyRequired'),
                'task2_value': result2.get('energy_model', {}).get('totalEnergyRequired'),
                'difference': '不同的总能耗计算结果'
            })

        return {
            'areIdentical': len(differences) == 0,
            'differences': differences,
            'differenceCount': len(differences)
        }
