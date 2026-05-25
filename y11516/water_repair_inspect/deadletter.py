import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from .config import Config


class DeadLetterQueue:
    def __init__(self, config: Config):
        self.config = config
        self.base_dir = Path(config.base_dir)
        self.dlq_dir = self.base_dir / 'data' / 'deadletter'
        self.dlq_file = self.dlq_dir / 'dead_letters.jsonl'
        self._ensure_dirs()

    def _ensure_dirs(self):
        self.dlq_dir.mkdir(parents=True, exist_ok=True)
        if not self.dlq_file.exists():
            self.dlq_file.touch()

    def enqueue(self, source_type: str, source_file: str, batch_id: str,
                row_number: int, original_content: Dict[str, Any],
                error_message: str, retry_count: int = 0) -> str:
        dlq_id = f"dlq_{datetime.now().strftime('%Y%m%d%H%M%S')}_{row_number}"
        
        entry = {
            'dlq_id': dlq_id,
            'source_type': source_type,
            'source_file': source_file,
            'batch_id': batch_id,
            'row_number': row_number,
            'original_content': original_content,
            'error_message': error_message,
            'retry_count': retry_count,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'processed_at': None,
            'result_record_id': None
        }
        
        with open(self.dlq_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        
        return dlq_id

    def enqueue_batch(self, source_type: str, source_file: str, batch_id: str,
                      failed_rows: List[Dict]) -> List[str]:
        dlq_ids = []
        for fail in failed_rows:
            dlq_id = self.enqueue(
                source_type=source_type,
                source_file=source_file,
                batch_id=batch_id,
                row_number=fail.get('row', 0),
                original_content=fail.get('content', {}),
                error_message=fail.get('error', '')
            )
            dlq_ids.append(dlq_id)
        return dlq_ids

    def list_all(self, status: Optional[str] = None,
                 source_type: Optional[str] = None) -> List[Dict]:
        entries = []
        with open(self.dlq_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    if status and entry.get('status') != status:
                        continue
                    if source_type and entry.get('source_type') != source_type:
                        continue
                    entries.append(entry)
        return entries

    def get(self, dlq_id: str) -> Optional[Dict]:
        with open(self.dlq_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    if entry.get('dlq_id') == dlq_id:
                        return entry
        return None

    def mark_processing(self, dlq_id: str) -> bool:
        return self._update_entry(dlq_id, {'status': 'processing'})

    def mark_success(self, dlq_id: str, result_record_id: str) -> bool:
        return self._update_entry(dlq_id, {
            'status': 'success',
            'processed_at': datetime.now().isoformat(),
            'result_record_id': result_record_id
        })

    def mark_failed(self, dlq_id: str, error_message: str) -> bool:
        entry = self.get(dlq_id)
        if not entry:
            return False
        return self._update_entry(dlq_id, {
            'status': 'failed',
            'retry_count': entry.get('retry_count', 0) + 1,
            'error_message': error_message,
            'processed_at': datetime.now().isoformat()
        })

    def mark_manual(self, dlq_id: str, operator: str, note: str = None) -> bool:
        return self._update_entry(dlq_id, {
            'status': 'manual',
            'processed_at': datetime.now().isoformat(),
            'operator': operator,
            'note': note
        })

    def _update_entry(self, dlq_id: str, updates: Dict) -> bool:
        updated = False
        temp_file = self.dlq_file.with_suffix('.tmp')
        
        with open(self.dlq_file, 'r', encoding='utf-8') as f_in, \
             open(temp_file, 'w', encoding='utf-8') as f_out:
            for line in f_in:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    if entry.get('dlq_id') == dlq_id:
                        entry.update(updates)
                        entry['updated_at'] = datetime.now().isoformat()
                        updated = True
                    f_out.write(json.dumps(entry, ensure_ascii=False) + '\n')
        
        if updated:
            temp_file.replace(self.dlq_file)
            return True
        else:
            temp_file.unlink()
            return False

    def retry(self, dlq_id: str) -> Optional[Dict]:
        entry = self.get(dlq_id)
        if not entry:
            return None
        self.mark_processing(dlq_id)
        return entry

    def clear_processed(self, older_than_days: int = 7) -> int:
        count = 0
        temp_file = self.dlq_file.with_suffix('.tmp')
        
        with open(self.dlq_file, 'r', encoding='utf-8') as f_in, \
             open(temp_file, 'w', encoding='utf-8') as f_out:
            for line in f_in:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    status = entry.get('status')
                    if status in ['success', 'manual']:
                        count += 1
                    else:
                        f_out.write(json.dumps(entry, ensure_ascii=False) + '\n')
        
        temp_file.replace(self.dlq_file)
        return count

    def get_statistics(self) -> Dict:
        stats = {
            'total': 0,
            'pending': 0,
            'processing': 0,
            'success': 0,
            'failed': 0,
            'manual': 0,
            'by_source_type': {}
        }
        
        with open(self.dlq_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    stats['total'] += 1
                    status = entry.get('status', 'unknown')
                    if status in stats:
                        stats[status] += 1
                    
                    source_type = entry.get('source_type', 'unknown')
                    stats['by_source_type'][source_type] = \
                        stats['by_source_type'].get(source_type, 0) + 1
        
        return stats

    def export_csv(self, output_path: str, status: Optional[str] = None) -> int:
        entries = self.list_all(status=status)
        
        with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
            if entries:
                fieldnames = list(entries[0].keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for entry in entries:
                    entry_copy = dict(entry)
                    entry_copy['original_content'] = json.dumps(
                        entry_copy.get('original_content', {}),
                        ensure_ascii=False
                    )
                    writer.writerow(entry_copy)
        
        return len(entries)
