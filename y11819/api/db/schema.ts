export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS berth_record (
    id TEXT PRIMARY KEY,
    vessel_name TEXT NOT NULL,
    port TEXT NOT NULL,
    berth_start TEXT,
    berth_end TEXT,
    notice_time TEXT,
    free_period_end TEXT,
    voyage_number TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS handling_record (
    id TEXT PRIMARY KEY,
    berth_id TEXT NOT NULL REFERENCES berth_record(id),
    handling_start TEXT,
    handling_end TEXT,
    operation_type TEXT,
    quantity REAL,
    pause_hours REAL DEFAULT 0,
    pause_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_rate (
    id TEXT PRIMARY KEY,
    vessel_name TEXT NOT NULL,
    port TEXT NOT NULL,
    free_hours REAL,
    currency TEXT DEFAULT 'USD',
    rate_tier1 REAL,
    rate_tier1_max_days REAL,
    rate_tier2 REAL,
    rate_tier2_max_days REAL,
    rate_tier3 REAL,
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weather_exemption (
    id TEXT PRIMARY KEY,
    berth_id TEXT,
    vessel_name TEXT,
    port TEXT,
    weather_start TEXT,
    weather_end TEXT,
    weather_type TEXT,
    evidence TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calculation_result (
    id TEXT PRIMARY KEY,
    berth_id TEXT NOT NULL REFERENCES berth_record(id),
    total_demurrage REAL,
    free_hours REAL,
    chargeable_hours REAL,
    exempted_hours REAL,
    currency TEXT DEFAULT 'USD',
    calculated_at TEXT DEFAULT (datetime('now')),
    flags TEXT
);

CREATE TABLE IF NOT EXISTS calculation_segment (
    id TEXT PRIMARY KEY,
    calculation_id TEXT NOT NULL REFERENCES calculation_result(id),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    segment_type TEXT NOT NULL,
    rate_tier TEXT,
    rate REAL,
    hours REAL,
    amount REAL,
    exempted_hours REAL DEFAULT 0,
    needs_review INTEGER DEFAULT 0,
    review_reason TEXT,
    exemptions_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_berth_vessel ON berth_record(vessel_name);
CREATE INDEX IF NOT EXISTS idx_berth_port ON berth_record(port);
CREATE INDEX IF NOT EXISTS idx_handling_berth ON handling_record(berth_id);
CREATE INDEX IF NOT EXISTS idx_contract_vessel_port ON contract_rate(vessel_name, port);
CREATE INDEX IF NOT EXISTS idx_weather_berth ON weather_exemption(berth_id);
CREATE INDEX IF NOT EXISTS idx_calc_berth ON calculation_result(berth_id);
CREATE INDEX IF NOT EXISTS idx_segment_calc ON calculation_segment(calculation_id);
`;
