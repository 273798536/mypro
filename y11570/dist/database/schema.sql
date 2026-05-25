CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    status TEXT NOT NULL,
    session_summary TEXT NOT NULL,
    sla_rule_id TEXT NOT NULL,
    current_agent_id TEXT,
    total_compensation REAL DEFAULT 0,
    status_before_frozen TEXT,
    frozen_reason TEXT,
    frozen_type TEXT,
    frozen_by TEXT,
    frozen_at TEXT,
    settled_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    ticket_count INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    frozen_count INTEGER DEFAULT 0,
    settled_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS assignment_records (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    from_agent_id TEXT,
    to_agent_id TEXT NOT NULL,
    assignment_type TEXT NOT NULL,
    reason TEXT,
    assigned_at TEXT NOT NULL,
    expected_complete_time TEXT,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS timeout_records (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    timeout_type TEXT NOT NULL,
    duration REAL NOT NULL,
    blame_level INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (assignment_id) REFERENCES assignment_records(id)
);

CREATE TABLE IF NOT EXISTS compensation_approvals (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    requested_amount REAL NOT NULL,
    approved_amount REAL,
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    approver_id TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS inventory_differences (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expected_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS state_transitions (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    operator_name TEXT,
    manual INTEGER NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    operator_id TEXT NOT NULL,
    operator_name TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS failed_records (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    ticket_id TEXT,
    record_type TEXT NOT NULL,
    raw_data TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    failed_at TEXT NOT NULL,
    retried INTEGER DEFAULT 0,
    retried_at TEXT
);

CREATE TABLE IF NOT EXISTS export_requests (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    filters TEXT,
    status TEXT NOT NULL,
    file_url TEXT,
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    requested_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS sla_rules (
    id TEXT PRIMARY KEY,
    ticket_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    first_response_time INTEGER NOT NULL,
    resolution_time INTEGER NOT NULL,
    escalation_threshold INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compensation_rules (
    id TEXT PRIMARY KEY,
    issue_type TEXT NOT NULL,
    base_amount REAL NOT NULL,
    max_amount REAL NOT NULL,
    multiplier REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_batch_id ON tickets(batch_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_ticket_id ON assignment_records(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transitions_ticket_id ON state_transitions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_failed_records_batch ON failed_records(batch_id);
