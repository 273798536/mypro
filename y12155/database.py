from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from models import EngineCreate, EngineRecord, EngineUpdate, MixtureResult

_DB_PATH = "rocket_engine.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS engines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fuel_params TEXT NOT NULL,
    oxidizer_flow TEXT NOT NULL,
    nozzle_data TEXT NOT NULL,
    combustion_temp TEXT NOT NULL,
    efficiency REAL NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engine_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    result_json TEXT NOT NULL,
    calculated_at TEXT NOT NULL,
    FOREIGN KEY (engine_id) REFERENCES engines(id)
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript(_SCHEMA)
    conn.commit()
    conn.close()


def create_engine(data: EngineCreate) -> EngineRecord:
    now = datetime.now(timezone.utc).isoformat()
    eid = uuid4().hex[:12]
    conn = get_conn()
    conn.execute(
        "INSERT INTO engines (id, name, fuel_params, oxidizer_flow, nozzle_data, combustion_temp, efficiency, current_version, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
        (
            eid,
            data.name,
            data.fuel_params.model_dump_json(),
            data.oxidizer_flow.model_dump_json(),
            data.nozzle_data.model_dump_json(),
            data.combustion_temp.model_dump_json(),
            data.efficiency,
            now,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return EngineRecord(
        id=eid,
        name=data.name,
        fuel_params=data.fuel_params,
        oxidizer_flow=data.oxidizer_flow,
        nozzle_data=data.nozzle_data,
        combustion_temp=data.combustion_temp,
        efficiency=data.efficiency,
        current_version=0,
        created_at=now,
        updated_at=now,
    )


def get_engine(eid: str) -> Optional[EngineRecord]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM engines WHERE id = ?", (eid,)).fetchone()
    conn.close()
    if row is None:
        return None
    return _row_to_engine(row)


def list_engines() -> list[EngineRecord]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM engines ORDER BY created_at DESC").fetchall()
    conn.close()
    return [_row_to_engine(r) for r in rows]


def update_engine(eid: str, data: EngineUpdate) -> Optional[EngineRecord]:
    engine = get_engine(eid)
    if engine is None:
        return None

    if data.name is not None:
        engine.name = data.name
    if data.fuel_params is not None:
        engine.fuel_params = data.fuel_params
    if data.oxidizer_flow is not None:
        engine.oxidizer_flow = data.oxidizer_flow
    if data.nozzle_data is not None:
        engine.nozzle_data = data.nozzle_data
    if data.combustion_temp is not None:
        engine.combustion_temp = data.combustion_temp
    if data.efficiency is not None:
        engine.efficiency = data.efficiency

    now = datetime.now(timezone.utc).isoformat()
    engine.updated_at = now

    conn = get_conn()
    conn.execute(
        "UPDATE engines SET name=?, fuel_params=?, oxidizer_flow=?, nozzle_data=?, combustion_temp=?, efficiency=?, updated_at=? WHERE id=?",
        (
            engine.name,
            engine.fuel_params.model_dump_json(),
            engine.oxidizer_flow.model_dump_json(),
            engine.nozzle_data.model_dump_json(),
            engine.combustion_temp.model_dump_json(),
            engine.efficiency,
            now,
            eid,
        ),
    )
    conn.commit()
    conn.close()
    return engine


def delete_engine(eid: str) -> bool:
    conn = get_conn()
    cursor = conn.execute("DELETE FROM engines WHERE id = ?", (eid,))
    conn.execute("DELETE FROM results WHERE engine_id = ?", (eid,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def save_result(engine_id: str, result: MixtureResult) -> MixtureResult:
    conn = get_conn()
    conn.execute(
        "INSERT INTO results (engine_id, version, result_json, calculated_at) VALUES (?, ?, ?, ?)",
        (engine_id, result.version, result.model_dump_json(), result.calculated_at),
    )
    conn.execute(
        "UPDATE engines SET current_version = ? WHERE id = ?",
        (result.version, engine_id),
    )
    conn.commit()
    conn.close()
    return result


def get_results(engine_id: str) -> list[MixtureResult]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM results WHERE engine_id = ? ORDER BY version ASC",
        (engine_id,),
    ).fetchall()
    conn.close()
    return [MixtureResult.model_validate_json(r["result_json"]) for r in rows]


def get_result_version(engine_id: str, version: int) -> Optional[MixtureResult]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM results WHERE engine_id = ? AND version = ?",
        (engine_id, version),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return MixtureResult.model_validate_json(row["result_json"])


def get_latest_result(engine_id: str) -> Optional[MixtureResult]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM results WHERE engine_id = ? ORDER BY version DESC LIMIT 1",
        (engine_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return MixtureResult.model_validate_json(row["result_json"])


def _row_to_engine(row: sqlite3.Row) -> EngineRecord:
    return EngineRecord(
        id=row["id"],
        name=row["name"],
        fuel_params=json.loads(row["fuel_params"]),
        oxidizer_flow=json.loads(row["oxidizer_flow"]),
        nozzle_data=json.loads(row["nozzle_data"]),
        combustion_temp=json.loads(row["combustion_temp"]),
        efficiency=row["efficiency"],
        current_version=row["current_version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
