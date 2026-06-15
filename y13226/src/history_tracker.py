import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional


class HistoryTracker:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        paths_path = os.path.join(base_dir, 'config', 'paths.json')
        with open(paths_path, 'r', encoding='utf-8') as f:
            self.paths = json.load(f)
        self.history_path = os.path.join(base_dir, self.paths['history_log'])
        self._ensure_dirs()

    def _ensure_dirs(self):
        history_dir = os.path.dirname(self.history_path)
        if not os.path.exists(history_dir):
            os.makedirs(history_dir, exist_ok=True)

    def _load_history(self) -> Dict:
        if not os.path.exists(self.history_path):
            return {'runs': [], 'manual_decisions': []}
        try:
            with open(self.history_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {'runs': [], 'manual_decisions': []}

    def _save_history(self, data: Dict):
        with open(self.history_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def record_run(self, summary: Dict):
        history = self._load_history()
        run_record = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'summary': summary
        }
        history['runs'].append(run_record)
        self._save_history(history)

    def record_manual_decision(self, conflict_id: str, decision: str,
                                operator: str, note: str = ''):
        history = self._load_history()
        decision_record = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'conflict_id': conflict_id,
            'decision': decision,
            'operator': operator,
            'note': note
        }
        history['manual_decisions'].append(decision_record)
        self._save_history(history)
        return decision_record

    def get_manual_decisions(self, conflict_id: Optional[str] = None) -> List[Dict]:
        history = self._load_history()
        decisions = history.get('manual_decisions', [])
        if conflict_id:
            return [d for d in decisions if d.get('conflict_id') == conflict_id]
        return decisions

    def get_recent_runs(self, limit: int = 10) -> List[Dict]:
        history = self._load_history()
        runs = history.get('runs', [])
        return runs[-limit:]

    def get_linjie_modifications(self, rows: List[Dict]) -> List[Dict]:
        modified = []
        for row in rows:
            src_file = str(row.get('_source_file', '')).lower()
            src = str(row.get('source', '')).lower()
            version = str(row.get('version', '')).lower()
            if '林姐' in src_file or 'linjie' in src_file or '临时' in version or '林姐' in src:
                modified.append({
                    'song_name': row.get('song_name', ''),
                    'performance_time': row.get('performance_time', ''),
                    'theater': row.get('theater', ''),
                    'source_file': row.get('_source_file', ''),
                    'line_number': row.get('_line_number', ''),
                    'version': row.get('version', ''),
                    'status': row.get('status', ''),
                    'note': '林姐临时修改，请务必确认，不要被旧版覆盖'
                })
        return modified
