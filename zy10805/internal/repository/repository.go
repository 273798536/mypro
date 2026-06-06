package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"cold-chain-review/internal/model"
)

type Repository struct {
	db *Database
}

func NewRepository(db *Database) *Repository {
	return &Repository{db: db}
}

func newID() string {
	return uuid.New().String()
}

func (r *Repository) CreateStore(store *model.Store) error {
	store.ID = newID()
	store.CreatedAt = time.Now()
	store.UpdatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO stores (id, name, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		store.ID, store.Name, store.Address, store.CreatedAt, store.UpdatedAt,
	)
	return err
}

func (r *Repository) GetStore(id string) (*model.Store, error) {
	var store model.Store
	err := r.db.DB.QueryRow(
		`SELECT id, name, address, created_at, updated_at FROM stores WHERE id = ?`, id,
	).Scan(&store.ID, &store.Name, &store.Address, &store.CreatedAt, &store.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &store, err
}

func (r *Repository) CreateDrugBatch(batch *model.DrugBatch) error {
	batch.ID = newID()
	batch.CreatedAt = time.Now()
	batch.UpdatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO drug_batches (id, drug_name, batch_no, spec, manufacturer, min_temp, max_temp, expiry_date, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		batch.ID, batch.DrugName, batch.BatchNo, batch.Spec, batch.Manufacturer,
		batch.MinTemp, batch.MaxTemp, batch.ExpiryDate, batch.CreatedAt, batch.UpdatedAt,
	)
	return err
}

func (r *Repository) GetDrugBatch(id string) (*model.DrugBatch, error) {
	var batch model.DrugBatch
	err := r.db.DB.QueryRow(
		`SELECT id, drug_name, batch_no, spec, manufacturer, min_temp, max_temp, expiry_date, created_at, updated_at 
		 FROM drug_batches WHERE id = ?`, id,
	).Scan(&batch.ID, &batch.DrugName, &batch.BatchNo, &batch.Spec, &batch.Manufacturer,
		&batch.MinTemp, &batch.MaxTemp, &batch.ExpiryDate, &batch.CreatedAt, &batch.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &batch, err
}

func (r *Repository) CreateCabinet(cabinet *model.ColdChainCabinet) error {
	cabinet.ID = newID()
	cabinet.CreatedAt = time.Now()
	cabinet.UpdatedAt = time.Now()
	if cabinet.Status == "" {
		cabinet.Status = "active"
	}
	_, err := r.db.DB.Exec(
		`INSERT INTO cold_chain_cabinets (id, cabinet_no, store_id, probe_id, min_temp, max_temp, status, last_calib_at, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		cabinet.ID, cabinet.CabinetNo, cabinet.StoreID, cabinet.ProbeID,
		cabinet.MinTemp, cabinet.MaxTemp, cabinet.Status, cabinet.LastCalibAt,
		cabinet.CreatedAt, cabinet.UpdatedAt,
	)
	return err
}

func (r *Repository) GetCabinet(id string) (*model.ColdChainCabinet, error) {
	var cabinet model.ColdChainCabinet
	err := r.db.DB.QueryRow(
		`SELECT id, cabinet_no, store_id, probe_id, min_temp, max_temp, status, last_calib_at, created_at, updated_at 
		 FROM cold_chain_cabinets WHERE id = ?`, id,
	).Scan(&cabinet.ID, &cabinet.CabinetNo, &cabinet.StoreID, &cabinet.ProbeID,
		&cabinet.MinTemp, &cabinet.MaxTemp, &cabinet.Status, &cabinet.LastCalibAt,
		&cabinet.CreatedAt, &cabinet.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &cabinet, err
}

func (r *Repository) CreateTemperatureRecord(rec *model.TemperatureRecord) error {
	rec.ID = newID()
	rec.CreatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO temperature_records (id, cabinet_id, probe_id, temperature, record_time, is_anomaly, is_gap, gap_minutes, probe_anomaly, created_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		rec.ID, rec.CabinetID, rec.ProbeID, rec.Temperature, rec.RecordTime,
		rec.IsAnomaly, rec.IsGap, rec.GapMinutes, rec.ProbeAnomaly, rec.CreatedAt,
	)
	return err
}

func (r *Repository) GetTemperatureRecordsByCabinet(cabinetID string, startTime, endTime time.Time) ([]model.TemperatureRecord, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, cabinet_id, probe_id, temperature, record_time, is_anomaly, is_gap, gap_minutes, probe_anomaly, created_at 
		 FROM temperature_records WHERE cabinet_id = ? AND record_time >= ? AND record_time <= ? ORDER BY record_time`,
		cabinetID, startTime, endTime,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.TemperatureRecord
	for rows.Next() {
		var rec model.TemperatureRecord
		err := rows.Scan(&rec.ID, &rec.CabinetID, &rec.ProbeID, &rec.Temperature, &rec.RecordTime,
			&rec.IsAnomaly, &rec.IsGap, &rec.GapMinutes, &rec.ProbeAnomaly, &rec.CreatedAt)
		if err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, nil
}

func (r *Repository) CreateTransferOrder(order *model.TransferOrder) error {
	order.ID = newID()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	if order.Status == "" {
		order.Status = model.TransferStatusCreated
	}
	_, err := r.db.DB.Exec(
		`INSERT INTO transfer_orders (id, order_no, from_store_id, to_store_id, drug_batch_id, quantity, cabinet_id, outbound_time, expected_arrive, status, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		order.ID, order.OrderNo, order.FromStoreID, order.ToStoreID, order.DrugBatchID,
		order.Quantity, order.CabinetID, order.OutboundTime, order.ExpectedArrive,
		order.Status, order.CreatedAt, order.UpdatedAt,
	)
	return err
}

func (r *Repository) GetTransferOrder(id string) (*model.TransferOrder, error) {
	var order model.TransferOrder
	err := r.db.DB.QueryRow(
		`SELECT id, order_no, from_store_id, to_store_id, drug_batch_id, quantity, cabinet_id, outbound_time, expected_arrive, status, created_at, updated_at 
		 FROM transfer_orders WHERE id = ?`, id,
	).Scan(&order.ID, &order.OrderNo, &order.FromStoreID, &order.ToStoreID, &order.DrugBatchID,
		&order.Quantity, &order.CabinetID, &order.OutboundTime, &order.ExpectedArrive,
		&order.Status, &order.CreatedAt, &order.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &order, err
}

func (r *Repository) GetTransferOrderByNo(orderNo string) (*model.TransferOrder, error) {
	var order model.TransferOrder
	err := r.db.DB.QueryRow(
		`SELECT id, order_no, from_store_id, to_store_id, drug_batch_id, quantity, cabinet_id, outbound_time, expected_arrive, status, created_at, updated_at 
		 FROM transfer_orders WHERE order_no = ?`, orderNo,
	).Scan(&order.ID, &order.OrderNo, &order.FromStoreID, &order.ToStoreID, &order.DrugBatchID,
		&order.Quantity, &order.CabinetID, &order.OutboundTime, &order.ExpectedArrive,
		&order.Status, &order.CreatedAt, &order.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &order, err
}

func (r *Repository) UpdateTransferOrderStatus(id, status string) error {
	_, err := r.db.DB.Exec(
		`UPDATE transfer_orders SET status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now(), id,
	)
	return err
}

func (r *Repository) CreateReceivingReview(review *model.ReceivingReview) error {
	review.ID = newID()
	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO receiving_reviews (id, transfer_order_id, reviewer_id, reviewer_name, receive_time, package_intact, temp_on_arrival, is_qualified, remark, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		review.ID, review.TransferOrderID, review.ReviewerID, review.ReviewerName,
		review.ReceiveTime, review.PackageIntact, review.TempOnArrival,
		review.IsQualified, review.Remark, review.CreatedAt, review.UpdatedAt,
	)
	return err
}

func (r *Repository) GetReceivingReview(transferOrderID string) (*model.ReceivingReview, error) {
	var review model.ReceivingReview
	err := r.db.DB.QueryRow(
		`SELECT id, transfer_order_id, reviewer_id, reviewer_name, receive_time, package_intact, temp_on_arrival, is_qualified, remark, created_at, updated_at 
		 FROM receiving_reviews WHERE transfer_order_id = ?`, transferOrderID,
	).Scan(&review.ID, &review.TransferOrderID, &review.ReviewerID, &review.ReviewerName,
		&review.ReceiveTime, &review.PackageIntact, &review.TempOnArrival,
		&review.IsQualified, &review.Remark, &review.CreatedAt, &review.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &review, err
}

func (r *Repository) CreateExceptionRecord(exception *model.ExceptionRecord) error {
	exception.ID = newID()
	exception.CreatedAt = time.Now()
	exception.UpdatedAt = time.Now()
	if exception.Status == "" {
		exception.Status = model.ExceptionStatusPending
	}
	if exception.Severity == "" {
		exception.Severity = model.SeverityMedium
	}
	_, err := r.db.DB.Exec(
		`INSERT INTO exception_records (id, exception_no, transfer_order_id, type, severity, description, reporter_id, reporter_name, status, found_time, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		exception.ID, exception.ExceptionNo, exception.TransferOrderID, exception.Type,
		exception.Severity, exception.Description, exception.ReporterID, exception.ReporterName,
		exception.Status, exception.FoundTime, exception.CreatedAt, exception.UpdatedAt,
	)
	return err
}

func (r *Repository) GetExceptionRecord(id string) (*model.ExceptionRecord, error) {
	var exception model.ExceptionRecord
	err := r.db.DB.QueryRow(
		`SELECT id, exception_no, transfer_order_id, type, severity, description, reporter_id, reporter_name, status, found_time, created_at, updated_at 
		 FROM exception_records WHERE id = ?`, id,
	).Scan(&exception.ID, &exception.ExceptionNo, &exception.TransferOrderID, &exception.Type,
		&exception.Severity, &exception.Description, &exception.ReporterID, &exception.ReporterName,
		&exception.Status, &exception.FoundTime, &exception.CreatedAt, &exception.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &exception, err
}

func (r *Repository) GetExceptionByNo(exceptionNo string) (*model.ExceptionRecord, error) {
	var exception model.ExceptionRecord
	err := r.db.DB.QueryRow(
		`SELECT id, exception_no, transfer_order_id, type, severity, description, reporter_id, reporter_name, status, found_time, created_at, updated_at 
		 FROM exception_records WHERE exception_no = ?`, exceptionNo,
	).Scan(&exception.ID, &exception.ExceptionNo, &exception.TransferOrderID, &exception.Type,
		&exception.Severity, &exception.Description, &exception.ReporterID, &exception.ReporterName,
		&exception.Status, &exception.FoundTime, &exception.CreatedAt, &exception.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &exception, err
}

func (r *Repository) GetExceptionsByTransferOrder(transferOrderID string) ([]model.ExceptionRecord, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, exception_no, transfer_order_id, type, severity, description, reporter_id, reporter_name, status, found_time, created_at, updated_at 
		 FROM exception_records WHERE transfer_order_id = ? ORDER BY created_at DESC`,
		transferOrderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var exceptions []model.ExceptionRecord
	for rows.Next() {
		var exception model.ExceptionRecord
		err := rows.Scan(&exception.ID, &exception.ExceptionNo, &exception.TransferOrderID, &exception.Type,
			&exception.Severity, &exception.Description, &exception.ReporterID, &exception.ReporterName,
			&exception.Status, &exception.FoundTime, &exception.CreatedAt, &exception.UpdatedAt)
		if err != nil {
			return nil, err
		}
		exceptions = append(exceptions, exception)
	}
	return exceptions, nil
}

func (r *Repository) UpdateExceptionStatus(id, status string) error {
	_, err := r.db.DB.Exec(
		`UPDATE exception_records SET status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now(), id,
	)
	return err
}

func (r *Repository) CreateEvidence(evidence *model.Evidence) error {
	evidence.ID = newID()
	evidence.CreatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO evidences (id, exception_id, transfer_order_id, type, file_name, file_type, file_size, uploader_id, uploader_name, description, file_path, created_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		evidence.ID, evidence.ExceptionID, evidence.TransferOrderID, evidence.Type,
		evidence.FileName, evidence.FileType, evidence.FileSize, evidence.UploaderID,
		evidence.UploaderName, evidence.Description, evidence.FilePath, evidence.CreatedAt,
	)
	return err
}

func (r *Repository) GetEvidencesByException(exceptionID string) ([]model.Evidence, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, exception_id, transfer_order_id, type, file_name, file_type, file_size, uploader_id, uploader_name, description, file_path, created_at 
		 FROM evidences WHERE exception_id = ? ORDER BY created_at`,
		exceptionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evidences []model.Evidence
	for rows.Next() {
		var evidence model.Evidence
		err := rows.Scan(&evidence.ID, &evidence.ExceptionID, &evidence.TransferOrderID, &evidence.Type,
			&evidence.FileName, &evidence.FileType, &evidence.FileSize, &evidence.UploaderID,
			&evidence.UploaderName, &evidence.Description, &evidence.FilePath, &evidence.CreatedAt)
		if err != nil {
			return nil, err
		}
		evidences = append(evidences, evidence)
	}
	return evidences, nil
}

func (r *Repository) CreateReviewRecord(review *model.ReviewRecord) error {
	review.ID = newID()
	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()
	if review.Status == "" {
		review.Status = model.ReviewStatusPending
	}
	_, err := r.db.DB.Exec(
		`INSERT INTO review_records (id, exception_id, transfer_order_id, reviewer_id, reviewer_name, conclusion, opinion, status, reviewed_at, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		review.ID, review.ExceptionID, review.TransferOrderID, review.ReviewerID,
		review.ReviewerName, review.Conclusion, review.Opinion, review.Status,
		review.ReviewedAt, review.CreatedAt, review.UpdatedAt,
	)
	return err
}

func (r *Repository) GetReviewRecord(id string) (*model.ReviewRecord, error) {
	var review model.ReviewRecord
	err := r.db.DB.QueryRow(
		`SELECT id, exception_id, transfer_order_id, reviewer_id, reviewer_name, conclusion, opinion, status, reviewed_at, created_at, updated_at 
		 FROM review_records WHERE id = ?`, id,
	).Scan(&review.ID, &review.ExceptionID, &review.TransferOrderID, &review.ReviewerID,
		&review.ReviewerName, &review.Conclusion, &review.Opinion, &review.Status,
		&review.ReviewedAt, &review.CreatedAt, &review.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &review, err
}

func (r *Repository) GetReviewsByException(exceptionID string) ([]model.ReviewRecord, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, exception_id, transfer_order_id, reviewer_id, reviewer_name, conclusion, opinion, status, reviewed_at, created_at, updated_at 
		 FROM review_records WHERE exception_id = ? ORDER BY created_at DESC`,
		exceptionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []model.ReviewRecord
	for rows.Next() {
		var review model.ReviewRecord
		err := rows.Scan(&review.ID, &review.ExceptionID, &review.TransferOrderID, &review.ReviewerID,
			&review.ReviewerName, &review.Conclusion, &review.Opinion, &review.Status,
			&review.ReviewedAt, &review.CreatedAt, &review.UpdatedAt)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, review)
	}
	return reviews, nil
}

func (r *Repository) UpdateReviewRecord(review *model.ReviewRecord) error {
	review.UpdatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`UPDATE review_records SET conclusion = ?, opinion = ?, status = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
		review.Conclusion, review.Opinion, review.Status, review.ReviewedAt, review.UpdatedAt, review.ID,
	)
	return err
}

func (r *Repository) CreateDisposalResult(disposal *model.DisposalResult) error {
	disposal.ID = newID()
	disposal.CreatedAt = time.Now()
	disposal.UpdatedAt = time.Now()
	_, err := r.db.DB.Exec(
		`INSERT INTO disposal_results (id, exception_id, transfer_order_id, review_record_id, disposal_type, handler_id, handler_name, description, disposed_at, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		disposal.ID, disposal.ExceptionID, disposal.TransferOrderID, disposal.ReviewRecordID,
		disposal.DisposalType, disposal.HandlerID, disposal.HandlerName, disposal.Description,
		disposal.DisposedAt, disposal.CreatedAt, disposal.UpdatedAt,
	)
	return err
}

func (r *Repository) GetDisposalResultByException(exceptionID string) (*model.DisposalResult, error) {
	var disposal model.DisposalResult
	err := r.db.DB.QueryRow(
		`SELECT id, exception_id, transfer_order_id, review_record_id, disposal_type, handler_id, handler_name, description, disposed_at, created_at, updated_at 
		 FROM disposal_results WHERE exception_id = ? ORDER BY created_at DESC LIMIT 1`,
		exceptionID,
	).Scan(&disposal.ID, &disposal.ExceptionID, &disposal.TransferOrderID, &disposal.ReviewRecordID,
		&disposal.DisposalType, &disposal.HandlerID, &disposal.HandlerName, &disposal.Description,
		&disposal.DisposedAt, &disposal.CreatedAt, &disposal.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &disposal, err
}

func (r *Repository) CreateRevertLog(log *model.RevertLog) error {
	log.ID = newID()
	log.CreatedAt = time.Now()
	if log.RevertedAt.IsZero() {
		log.RevertedAt = time.Now()
	}
	_, err := r.db.DB.Exec(
		`INSERT INTO revert_logs (id, review_record_id, exception_id, operator_id, operator_name, before_status, after_status, before_opinion, after_opinion, before_conclusion, after_conclusion, reason, reverted_at, created_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		log.ID, log.ReviewRecordID, log.ExceptionID, log.OperatorID, log.OperatorName,
		log.BeforeStatus, log.AfterStatus, log.BeforeOpinion, log.AfterOpinion,
		log.BeforeConclusion, log.AfterConclusion, log.Reason, log.RevertedAt, log.CreatedAt,
	)
	return err
}

func (r *Repository) GetRevertLogsByReview(reviewRecordID string) ([]model.RevertLog, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, review_record_id, exception_id, operator_id, operator_name, before_status, after_status, before_opinion, after_opinion, before_conclusion, after_conclusion, reason, reverted_at, created_at 
		 FROM revert_logs WHERE review_record_id = ? ORDER BY created_at DESC`,
		reviewRecordID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []model.RevertLog
	for rows.Next() {
		var log model.RevertLog
		err := rows.Scan(&log.ID, &log.ReviewRecordID, &log.ExceptionID, &log.OperatorID, &log.OperatorName,
			&log.BeforeStatus, &log.AfterStatus, &log.BeforeOpinion, &log.AfterOpinion,
			&log.BeforeConclusion, &log.AfterConclusion, &log.Reason, &log.RevertedAt, &log.CreatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, nil
}

func (r *Repository) GetRevertLogsByException(exceptionID string) ([]model.RevertLog, error) {
	rows, err := r.db.DB.Query(
		`SELECT id, review_record_id, exception_id, operator_id, operator_name, before_status, after_status, before_opinion, after_opinion, before_conclusion, after_conclusion, reason, reverted_at, created_at 
		 FROM revert_logs WHERE exception_id = ? ORDER BY created_at DESC`,
		exceptionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []model.RevertLog
	for rows.Next() {
		var log model.RevertLog
		err := rows.Scan(&log.ID, &log.ReviewRecordID, &log.ExceptionID, &log.OperatorID, &log.OperatorName,
			&log.BeforeStatus, &log.AfterStatus, &log.BeforeOpinion, &log.AfterOpinion,
			&log.BeforeConclusion, &log.AfterConclusion, &log.Reason, &log.RevertedAt, &log.CreatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, nil
}
