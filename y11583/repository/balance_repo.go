package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
)

type BalanceHistoryRepository struct {
	db *gorm.DB
}

func NewBalanceHistoryRepository(db *gorm.DB) *BalanceHistoryRepository {
	return &BalanceHistoryRepository{db: db}
}

func (r *BalanceHistoryRepository) Create(history *models.BalanceHistory) error {
	history.ID = uuid.New()
	history.CreatedAt = time.Now()
	return r.db.Create(history).Error
}

func (r *BalanceHistoryRepository) CreateBatch(histories []models.BalanceHistory) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range histories {
			histories[i].ID = uuid.New()
			histories[i].CreatedAt = time.Now()
			if err := tx.Create(&histories[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *BalanceHistoryRepository) GetByMemberID(memberID string) ([]models.BalanceHistory, error) {
	var histories []models.BalanceHistory
	err := r.db.Where("member_id = ?", memberID).Order("trans_time ASC").Find(&histories).Error
	return histories, err
}

func (r *BalanceHistoryRepository) GetByBatchID(batchID uuid.UUID) ([]models.BalanceHistory, error) {
	var histories []models.BalanceHistory
	err := r.db.Where("batch_id = ?", batchID).Order("trans_time ASC").Find(&histories).Error
	return histories, err
}

func (r *BalanceHistoryRepository) GetByTransNo(transNo string) (*models.BalanceHistory, error) {
	var history models.BalanceHistory
	err := r.db.First(&history, "trans_no = ?", transNo).Error
	if err != nil {
		return nil, err
	}
	return &history, nil
}

func (r *BalanceHistoryRepository) GetLatestByMemberID(memberID string) (*models.BalanceHistory, error) {
	var history models.BalanceHistory
	err := r.db.Where("member_id = ?", memberID).Order("trans_time DESC").First(&history).Error
	if err != nil {
		return nil, err
	}
	return &history, nil
}

func (r *BalanceHistoryRepository) DeleteByBatchID(batchID uuid.UUID) error {
	return r.db.Where("batch_id = ?", batchID).Delete(&models.BalanceHistory{}).Error
}

func (r *BalanceHistoryRepository) MarkReconciled(ids []uuid.UUID) error {
	return r.db.Model(&models.BalanceHistory{}).Where("id IN ?", ids).
		Update("reconciled", true).Error
}

type ReconciliationRepository struct {
	db *gorm.DB
}

func NewReconciliationRepository(db *gorm.DB) *ReconciliationRepository {
	return &ReconciliationRepository{db: db}
}

func (r *ReconciliationRepository) Create(result *models.ReconciliationResult) error {
	result.ID = uuid.New()
	result.CreatedAt = time.Now()
	return r.db.Create(result).Error
}

func (r *ReconciliationRepository) CreateBatch(results []models.ReconciliationResult) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range results {
			results[i].ID = uuid.New()
			results[i].CreatedAt = time.Now()
			if err := tx.Create(&results[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *ReconciliationRepository) GetByBatchID(batchID uuid.UUID) ([]models.ReconciliationResult, error) {
	var results []models.ReconciliationResult
	err := r.db.Where("batch_id = ?", batchID).Find(&results).Error
	return results, err
}

func (r *ReconciliationRepository) GetMismatchedByBatchID(batchID uuid.UUID) ([]models.ReconciliationResult, error) {
	var results []models.ReconciliationResult
	err := r.db.Where("batch_id = ? AND match_status != ?", batchID, "MATCHED").Find(&results).Error
	return results, err
}

func (r *ReconciliationRepository) DeleteByBatchID(batchID uuid.UUID) error {
	return r.db.Where("batch_id = ?", batchID).Delete(&models.ReconciliationResult{}).Error
}

type AuditLogRepository struct {
	db *gorm.DB
}

func NewAuditLogRepository(db *gorm.DB) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

func (r *AuditLogRepository) Create(log *models.AuditLog) error {
	log.ID = uuid.New()
	log.CreatedAt = time.Now()
	return r.db.Create(log).Error
}

func (r *AuditLogRepository) List(batchID *uuid.UUID, action, resourceType string, page, pageSize int) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := r.db.Model(&models.AuditLog{})
	if batchID != nil {
		query = query.Where("batch_id = ?", *batchID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

type EvidenceRepository struct {
	db *gorm.DB
}

func NewEvidenceRepository(db *gorm.DB) *EvidenceRepository {
	return &EvidenceRepository{db: db}
}

func (r *EvidenceRepository) Create(evidence *models.Evidence) error {
	evidence.ID = uuid.New()
	evidence.CreatedAt = time.Now()
	return r.db.Create(evidence).Error
}

func (r *EvidenceRepository) GetByBatchID(batchID uuid.UUID) ([]models.Evidence, error) {
	var evidences []models.Evidence
	err := r.db.Where("batch_id = ?", batchID).Find(&evidences).Error
	return evidences, err
}

func (r *EvidenceRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Evidence{}, id).Error
}
