package repository

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	DB *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on&_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	database := &Database{DB: db}
	if err := database.initTables(); err != nil {
		return nil, fmt.Errorf("failed to init tables: %w", err)
	}

	if err := database.initIndexes(); err != nil {
		return nil, fmt.Errorf("failed to init indexes: %w", err)
	}

	log.Println("Database initialized successfully")
	return database, nil
}

func (d *Database) initTables() error {
	sqlStatements := []string{
		`CREATE TABLE IF NOT EXISTS stores (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			address TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS drug_batches (
			id TEXT PRIMARY KEY,
			drug_name TEXT NOT NULL,
			batch_no TEXT NOT NULL,
			spec TEXT,
			manufacturer TEXT,
			min_temp REAL NOT NULL,
			max_temp REAL NOT NULL,
			expiry_date DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(batch_no)
		)`,
		`CREATE TABLE IF NOT EXISTS cold_chain_cabinets (
			id TEXT PRIMARY KEY,
			cabinet_no TEXT NOT NULL,
			store_id TEXT NOT NULL,
			probe_id TEXT,
			min_temp REAL NOT NULL,
			max_temp REAL NOT NULL,
			status TEXT DEFAULT 'active',
			last_calib_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (store_id) REFERENCES stores(id)
		)`,
		`CREATE TABLE IF NOT EXISTS temperature_records (
			id TEXT PRIMARY KEY,
			cabinet_id TEXT NOT NULL,
			probe_id TEXT,
			temperature REAL NOT NULL,
			record_time DATETIME NOT NULL,
			is_anomaly INTEGER DEFAULT 0,
			is_gap INTEGER DEFAULT 0,
			gap_minutes INTEGER DEFAULT 0,
			probe_anomaly INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (cabinet_id) REFERENCES cold_chain_cabinets(id)
		)`,
		`CREATE TABLE IF NOT EXISTS transfer_orders (
			id TEXT PRIMARY KEY,
			order_no TEXT NOT NULL UNIQUE,
			from_store_id TEXT NOT NULL,
			to_store_id TEXT NOT NULL,
			drug_batch_id TEXT NOT NULL,
			quantity INTEGER NOT NULL,
			cabinet_id TEXT,
			outbound_time DATETIME,
			expected_arrive DATETIME,
			status TEXT DEFAULT 'created',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (from_store_id) REFERENCES stores(id),
			FOREIGN KEY (to_store_id) REFERENCES stores(id),
			FOREIGN KEY (drug_batch_id) REFERENCES drug_batches(id),
			FOREIGN KEY (cabinet_id) REFERENCES cold_chain_cabinets(id)
		)`,
		`CREATE TABLE IF NOT EXISTS receiving_reviews (
			id TEXT PRIMARY KEY,
			transfer_order_id TEXT NOT NULL UNIQUE,
			reviewer_id TEXT,
			reviewer_name TEXT,
			receive_time DATETIME,
			package_intact INTEGER DEFAULT 1,
			temp_on_arrival REAL,
			is_qualified INTEGER DEFAULT 1,
			remark TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id)
		)`,
		`CREATE TABLE IF NOT EXISTS exception_records (
			id TEXT PRIMARY KEY,
			exception_no TEXT NOT NULL UNIQUE,
			transfer_order_id TEXT NOT NULL,
			type TEXT NOT NULL,
			severity TEXT DEFAULT 'medium',
			description TEXT,
			reporter_id TEXT,
			reporter_name TEXT,
			status TEXT DEFAULT 'pending',
			found_time DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id)
		)`,
		`CREATE TABLE IF NOT EXISTS evidences (
			id TEXT PRIMARY KEY,
			exception_id TEXT,
			transfer_order_id TEXT,
			type TEXT,
			file_name TEXT,
			file_type TEXT,
			file_size INTEGER DEFAULT 0,
			uploader_id TEXT,
			uploader_name TEXT,
			description TEXT,
			file_path TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (exception_id) REFERENCES exception_records(id),
			FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id)
		)`,
		`CREATE TABLE IF NOT EXISTS review_records (
			id TEXT PRIMARY KEY,
			exception_id TEXT NOT NULL,
			transfer_order_id TEXT NOT NULL,
			reviewer_id TEXT,
			reviewer_name TEXT,
			conclusion TEXT,
			opinion TEXT,
			status TEXT DEFAULT 'pending',
			reviewed_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (exception_id) REFERENCES exception_records(id),
			FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id)
		)`,
		`CREATE TABLE IF NOT EXISTS disposal_results (
			id TEXT PRIMARY KEY,
			exception_id TEXT NOT NULL,
			transfer_order_id TEXT NOT NULL,
			review_record_id TEXT,
			disposal_type TEXT,
			handler_id TEXT,
			handler_name TEXT,
			description TEXT,
			disposed_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (exception_id) REFERENCES exception_records(id),
			FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id),
			FOREIGN KEY (review_record_id) REFERENCES review_records(id)
		)`,
		`CREATE TABLE IF NOT EXISTS revert_logs (
			id TEXT PRIMARY KEY,
			review_record_id TEXT NOT NULL,
			exception_id TEXT NOT NULL,
			operator_id TEXT,
			operator_name TEXT,
			before_status TEXT,
			after_status TEXT,
			before_opinion TEXT,
			after_opinion TEXT,
			before_conclusion TEXT,
			after_conclusion TEXT,
			reason TEXT,
			reverted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (review_record_id) REFERENCES review_records(id),
			FOREIGN KEY (exception_id) REFERENCES exception_records(id)
		)`,
	}

	for _, stmt := range sqlStatements {
		if _, err := d.DB.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute statement: %w, sql: %s", err, stmt)
		}
	}

	return nil
}

func (d *Database) initIndexes() error {
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_temp_records_cabinet_time ON temperature_records(cabinet_id, record_time)`,
		`CREATE INDEX IF NOT EXISTS idx_exception_transfer ON exception_records(transfer_order_id)`,
		`CREATE INDEX IF NOT EXISTS idx_evidence_exception ON evidences(exception_id)`,
		`CREATE INDEX IF NOT EXISTS idx_review_exception ON review_records(exception_id)`,
		`CREATE INDEX IF NOT EXISTS idx_revert_review ON revert_logs(review_record_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transfer_status ON transfer_orders(status)`,
		`CREATE INDEX IF NOT EXISTS idx_exception_status ON exception_records(status)`,
	}

	for _, idx := range indexes {
		if _, err := d.DB.Exec(idx); err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

func (d *Database) Close() error {
	return d.DB.Close()
}
