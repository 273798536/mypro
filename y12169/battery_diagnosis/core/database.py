import sqlite3
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

from .config import get_db_path
from .models import DiagnosisResult, DiagnosisRecordDB


class DatabaseManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        self.db_path = get_db_path()
        self._create_tables()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _create_tables(self):
        with self._get_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS diagnosis_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    diagnosis_id TEXT UNIQUE NOT NULL,
                    vin TEXT NOT NULL,
                    packet_id TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    result_json TEXT NOT NULL,
                    hash_signature TEXT UNIQUE NOT NULL
                )
            ''')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_vin ON diagnosis_records (vin)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_packet_id ON diagnosis_records (packet_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON diagnosis_records (created_at)')

    @staticmethod
    def generate_hash_signature(result: DiagnosisResult) -> str:
        signature_data = {
            "vin": result.vin,
            "range_estimate": {
                "nominal_range_km": result.range_estimate.nominal_range_km,
                "actual_estimated_range_km": round(result.range_estimate.actual_estimated_range_km, 2),
                "battery_health_percent": round(result.range_estimate.battery_health_percent, 2)
            },
            "anomaly_types": sorted([a.anomaly_type.value for a in result.anomalies]),
            "factor_breakdown": sorted([
                f"{f.factor.value}:{round(f.contribution_percent, 1)}"
                for f in result.factor_breakdown
            ]),
            "trip_count": len(result.range_estimate.source_refs),
            "anomaly_count": len(result.anomalies)
        }
        json_str = json.dumps(signature_data, sort_keys=True)
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()

    def check_duplicate(self, result: DiagnosisResult) -> Optional[DiagnosisRecordDB]:
        hash_sig = self.generate_hash_signature(result)
        with self._get_connection() as conn:
            row = conn.execute(
                'SELECT * FROM diagnosis_records WHERE hash_signature = ? OR (vin = ? AND packet_id = ?)',
                (hash_sig, result.vin, result.packet_id)
            ).fetchone()

        if row:
            return DiagnosisRecordDB(**dict(row))
        return None

    def save_diagnosis_result(self, result: DiagnosisResult) -> Optional[DiagnosisRecordDB]:
        hash_sig = self.generate_hash_signature(result)

        duplicate = self.check_duplicate(result)
        if duplicate:
            return duplicate

        result_json = json.dumps(result.model_dump(mode='json'), ensure_ascii=False)
        record = DiagnosisRecordDB(
            diagnosis_id=result.diagnosis_id,
            vin=result.vin,
            packet_id=result.packet_id,
            created_at=result.created_at,
            result_json=result_json,
            hash_signature=hash_sig
        )

        with self._get_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO diagnosis_records
                (diagnosis_id, vin, packet_id, created_at, result_json, hash_signature)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                record.diagnosis_id,
                record.vin,
                record.packet_id,
                record.created_at.isoformat(),
                record.result_json,
                record.hash_signature
            ))
            record.id = cursor.lastrowid

        return record

    def get_diagnosis_by_id(self, diagnosis_id: str) -> Optional[DiagnosisResult]:
        with self._get_connection() as conn:
            row = conn.execute(
                'SELECT * FROM diagnosis_records WHERE diagnosis_id = ?',
                (diagnosis_id,)
            ).fetchone()

        if row:
            record = DiagnosisRecordDB(**dict(row))
            result_dict = json.loads(record.result_json)
            return DiagnosisResult(**result_dict)
        return None

    def get_diagnosis_history(
        self,
        vin: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[DiagnosisResult]:
        query = 'SELECT * FROM diagnosis_records WHERE 1=1'
        params: List[Any] = []

        if vin:
            query += ' AND vin = ?'
            params.append(vin)
        if start_date:
            query += ' AND created_at >= ?'
            params.append(start_date.isoformat())
        if end_date:
            query += ' AND created_at <= ?'
            params.append(end_date.isoformat())

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])

        results = []
        with self._get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            for row in rows:
                record = DiagnosisRecordDB(**dict(row))
                result_dict = json.loads(record.result_json)
                results.append(DiagnosisResult(**result_dict))

        return results

    def get_diagnosis_count(self, vin: Optional[str] = None) -> int:
        query = 'SELECT COUNT(*) as cnt FROM diagnosis_records WHERE 1=1'
        params: List[Any] = []

        if vin:
            query += ' AND vin = ?'
            params.append(vin)

        with self._get_connection() as conn:
            row = conn.execute(query, params).fetchone()
            return row['cnt'] if row else 0

    def delete_diagnosis(self, diagnosis_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute(
                'DELETE FROM diagnosis_records WHERE diagnosis_id = ?',
                (diagnosis_id,)
            )
            return cursor.rowcount > 0


def get_db() -> DatabaseManager:
    return DatabaseManager()
