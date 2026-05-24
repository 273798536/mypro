package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
)

type BatchRepository struct {
	db *gorm.DB
}

func NewBatchRepository(db *gorm.DB) *BatchRepository {
	return &BatchRepository{db: db}
}

func (r *BatchRepository) Create(batch *models.Batch) error {
	return r.db.Create(batch).Error
}

func (r *BatchRepository) GetByID(id uuid.UUID) (*models.Batch, error) {
	var batch models.Batch
	err := r.db.Preload("Histories").Preload("Recharges").Preload("Refunds").
		Preload("Handovers").Preload("Evidences").
		First(&batch, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &batch, nil
}

func (r *BatchRepository) GetByBatchNo(batchNo string) (*models.Batch, error) {
	var batch models.Batch
	err := r.db.Preload("Histories").Preload("Recharges").Preload("Refunds").
		Preload("Handovers").Preload("Evidences").
		First(&batch, "batch_no = ?", batchNo).Error
	if err != nil {
		return nil, err
	}
	return &batch, nil
}

func (r *BatchRepository) List(storeID string, status models.BatchStatus, page, pageSize int) ([]models.Batch, int64, error) {
	var batches []models.Batch
	var total int64

	query := r.db.Model(&models.Batch{})
	if storeID != "" {
		query = query.Where("store_id = ?", storeID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&batches).Error
	return batches, total, err
}

func (r *BatchRepository) UpdateStatus(id uuid.UUID, status models.BatchStatus, history *models.StatusHistory) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Batch{}).Where("id = ?", id).
			Updates(map[string]interface{}{
				"status":     status,
				"updated_at": time.Now(),
			}).Error; err != nil {
			return err
		}

		if history != nil {
			history.ID = uuid.New()
			history.CreatedAt = time.Now()
			if err := tx.Create(history).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *BatchRepository) Update(batch *models.Batch) error {
	batch.UpdatedAt = time.Now()
	return r.db.Save(batch).Error
}

func (r *BatchRepository) UpdateStats(id uuid.UUID, totalAmount float64, totalRecords, matchedRecords, mismatchedRecords int) error {
	return r.db.Model(&models.Batch{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"total_amount":        totalAmount,
			"total_records":       totalRecords,
			"matched_records":     matchedRecords,
			"mismatched_records": mismatchedRecords,
			"updated_at":          time.Now(),
		}).Error
}

func (r *BatchRepository) IncrementVersion(id uuid.UUID) error {
	return r.db.Model(&models.Batch{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"version":    gorm.Expr("version + 1"),
			"updated_at": time.Now(),
		}).Error
}

func (r *BatchRepository) SetParentBatch(id, parentID uuid.UUID) error {
	return r.db.Model(&models.Batch{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"parent_batch_id": parentID,
			"updated_at":      time.Now(),
		}).Error
}
