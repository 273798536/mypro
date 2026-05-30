import json
import hashlib
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, List, Any, Tuple
from copy import deepcopy
import numpy as np

from error_analysis import ErrorEstimate, ErrorStatus, ReviewAction
from core import generate_function_from_expr


@dataclass
class ChangeRecord:
    field: str
    old_value: Any
    new_value: Any
    timestamp: str
    changed_by: str = "system"
    comment: str = ""


@dataclass
class DataSource:
    data_id: str
    function_expr: str
    a: float
    b: float
    n: int
    created_at: str
    modified_at: str
    version: int
    exact_value: Optional[float] = None
    exact_value_source: str = ""
    f_double_prime_max: Optional[float] = None
    f_fourth_prime_max: Optional[float] = None
    error_estimate: Optional[Dict] = None
    detail_data: Optional[Dict] = None
    change_history: List[ChangeRecord] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

    def compute_data_hash(self) -> str:
        core_data = {
            'function_expr': self.function_expr,
            'a': self.a,
            'b': self.b,
            'n': self.n,
            'exact_value': self.exact_value,
        }
        data_str = json.dumps(core_data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()


class DataManager:
    def __init__(self, storage_dir: str = "./data"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._cache: Dict[str, DataSource] = {}

    def _generate_id(self, expr: str, a: float, b: float, n: int) -> str:
        raw = f"{expr}_{a}_{b}_{n}"
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    def create_data_source(
        self,
        function_expr: str,
        a: float,
        b: float,
        n: int,
        exact_value: Optional[float] = None,
        exact_value_source: str = "",
        tags: Optional[List[str]] = None
    ) -> DataSource:
        data_id = self._generate_id(function_expr, a, b, n)
        now = datetime.now().isoformat()

        ds = DataSource(
            data_id=data_id,
            function_expr=function_expr,
            a=a,
            b=b,
            n=n,
            created_at=now,
            modified_at=now,
            version=1,
            exact_value=exact_value,
            exact_value_source=exact_value_source,
            tags=tags or []
        )

        self._cache[data_id] = ds
        self._save(ds)
        return ds

    def update_exact_value(
        self,
        data_id: str,
        exact_value: float,
        exact_value_source: str = "",
        changed_by: str = "助教",
        comment: str = ""
    ) -> DataSource:
        ds = self._get_or_load(data_id)
        old_value = ds.exact_value
        old_source = ds.exact_value_source

        changes = []
        if old_value != exact_value:
            changes.append(ChangeRecord(
                field="exact_value",
                old_value=old_value,
                new_value=exact_value,
                timestamp=datetime.now().isoformat(),
                changed_by=changed_by,
                comment=comment
            ))

        if old_source != exact_value_source:
            changes.append(ChangeRecord(
                field="exact_value_source",
                old_value=old_source,
                new_value=exact_value_source,
                timestamp=datetime.now().isoformat(),
                changed_by=changed_by,
                comment=comment
            ))

        ds.exact_value = exact_value
        ds.exact_value_source = exact_value_source
        ds.change_history.extend(changes)
        ds.version += 1
        ds.modified_at = datetime.now().isoformat()

        self._cache[data_id] = ds
        self._save(ds)
        return ds

    def update_error_estimate(
        self,
        data_id: str,
        error_estimate: ErrorEstimate
    ) -> DataSource:
        ds = self._get_or_load(data_id)
        old_est = ds.error_estimate
        new_est = asdict(error_estimate)

        if old_est != new_est:
            ds.change_history.append(ChangeRecord(
                field="error_estimate",
                old_value="updated",
                new_value="updated",
                timestamp=datetime.now().isoformat(),
                changed_by="system",
                comment="重新计算误差估计"
            ))

        ds.error_estimate = new_est
        ds.version += 1
        ds.modified_at = datetime.now().isoformat()

        self._cache[data_id] = ds
        self._save(ds)
        return ds

    def update_detail_data(
        self,
        data_id: str,
        detail_data: Dict
    ) -> DataSource:
        ds = self._get_or_load(data_id)
        ds.detail_data = self._make_json_serializable(detail_data)
        ds.modified_at = datetime.now().isoformat()

        self._cache[data_id] = ds
        self._save(ds)
        return ds

    def get_conclusions_modified_fields(self, data_id: str) -> List[ChangeRecord]:
        ds = self._get_or_load(data_id)
        conclusion_fields = {'exact_value', 'error_estimate'}
        return [c for c in ds.change_history if c.field in conclusion_fields]

    def has_conclusions_changed(self, data_id: str) -> bool:
        return len(self.get_conclusions_modified_fields(data_id)) > 0

    def get_data_source(self, data_id: str) -> Optional[DataSource]:
        return self._get_or_load(data_id)

    def list_all_data_sources(self) -> List[DataSource]:
        result = []
        for filename in os.listdir(self.storage_dir):
            if filename.endswith('.json'):
                try:
                    filepath = os.path.join(self.storage_dir, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    ds = self._dict_to_datasource(data)
                    result.append(ds)
                except:
                    continue
        return sorted(result, key=lambda x: x.created_at, reverse=True)

    def get_unified_data(self, data_id: str) -> Dict[str, Any]:
        ds = self._get_or_load(data_id)
        data_hash = ds.compute_data_hash()

        f, expr = generate_function_from_expr(ds.function_expr)

        return {
            'data_id': ds.data_id,
            'data_hash': data_hash,
            'version': ds.version,
            'function_expr': ds.function_expr,
            'a': ds.a,
            'b': ds.b,
            'n': ds.n,
            'h': abs(ds.b - ds.a) / ds.n,
            'exact_value': ds.exact_value,
            'exact_value_source': ds.exact_value_source,
            'f_double_prime_max': ds.f_double_prime_max,
            'f_fourth_prime_max': ds.f_fourth_prime_max,
            'error_estimate': ds.error_estimate,
            'detail_data': ds.detail_data,
            'has_changes': self.has_conclusions_changed(data_id),
            'change_history': [asdict(c) for c in ds.change_history],
            'created_at': ds.created_at,
            'modified_at': ds.modified_at,
            'tags': ds.tags,
            'f': f,
            'expr': expr
        }

    def _get_or_load(self, data_id: str) -> DataSource:
        if data_id in self._cache:
            return self._cache[data_id]

        filepath = os.path.join(self.storage_dir, f"{data_id}.json")
        if not os.path.exists(filepath):
            raise ValueError(f"DataSource {data_id} not found")

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        ds = self._dict_to_datasource(data)
        self._cache[data_id] = ds
        return ds

    def _dict_to_datasource(self, data: Dict) -> DataSource:
        change_history = [
            ChangeRecord(**c) for c in data.get('change_history', [])
        ]
        return DataSource(
            data_id=data['data_id'],
            function_expr=data['function_expr'],
            a=data['a'],
            b=data['b'],
            n=data['n'],
            created_at=data['created_at'],
            modified_at=data['modified_at'],
            version=data['version'],
            exact_value=data.get('exact_value'),
            exact_value_source=data.get('exact_value_source', ''),
            f_double_prime_max=data.get('f_double_prime_max'),
            f_fourth_prime_max=data.get('f_fourth_prime_max'),
            error_estimate=data.get('error_estimate'),
            detail_data=data.get('detail_data'),
            change_history=change_history,
            tags=data.get('tags', [])
        )

    def _save(self, ds: DataSource):
        filepath = os.path.join(self.storage_dir, f"{ds.data_id}.json")
        data = asdict(ds)
        data = self._make_json_serializable(data)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def _make_json_serializable(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: self._make_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_serializable(v) for v in obj]
        elif isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (ErrorStatus, ReviewAction)):
            return obj.value
        else:
            return obj

    def delete_data_source(self, data_id: str):
        if data_id in self._cache:
            del self._cache[data_id]
        filepath = os.path.join(self.storage_dir, f"{data_id}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
