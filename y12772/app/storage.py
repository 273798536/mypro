import json
import os
import uuid
from datetime import datetime
from . import DB_PATH


class Storage:
    @staticmethod
    def _load():
        if not os.path.exists(DB_PATH):
            return {'batches': {}, 'runs': [], 'anomalies': []}
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)

    @staticmethod
    def _save(data):
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def get_batches():
        return Storage._load()['batches']

    @staticmethod
    def get_batch(batch_no):
        return Storage._load()['batches'].get(batch_no)

    @staticmethod
    def upsert_batch(batch_no, batch_data):
        data = Storage._load()
        data['batches'][batch_no] = batch_data
        Storage._save(data)
        return data['batches'][batch_no]

    @staticmethod
    def add_run(run_data):
        data = Storage._load()
        run_data['run_id'] = str(uuid.uuid4())[:8]
        run_data['timestamp'] = datetime.now().isoformat()
        data['runs'].append(run_data)
        Storage._save(data)
        return run_data

    @staticmethod
    def get_runs():
        return Storage._load()['runs']

    @staticmethod
    def get_run(run_id):
        for r in Storage._load()['runs']:
            if r['run_id'] == run_id:
                return r
        return None

    @staticmethod
    def add_anomaly(anomaly_data):
        data = Storage._load()
        anomaly_data['anomaly_id'] = str(uuid.uuid4())[:8]
        anomaly_data['timestamp'] = datetime.now().isoformat()
        data['anomalies'].append(anomaly_data)
        Storage._save(data)
        return anomaly_data

    @staticmethod
    def get_anomalies():
        return Storage._load()['anomalies']

    @staticmethod
    def get_anomalies_for_batch(batch_no):
        return [a for a in Storage._load()['anomalies'] if a.get('batch_no') == batch_no]

    @staticmethod
    def get_anomalies_for_run(run_id):
        return [a for a in Storage._load()['anomalies'] if a.get('run_id') == run_id]
