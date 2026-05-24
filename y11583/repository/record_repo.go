package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
)

type RechargeRepository struct {
	db *gorm.DB
}

func NewRechargeRepository(db *gorm.DB) *RechargeRepository {
	return &RechargeRepository{db: db}
}

func (r *RechargeRepository) Create(record *models.RechargeRecord) error {
	record.ID = uuid.New()
	record.CreatedAt = time.Now()
	return r.db.Create(record).Error
}

func (r *RechargeRepository) CreateBatch(records []models.RechargeRecord) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range records {
			records[i].ID = uuid.New()
			records[i].CreatedAt = time.Now()
			if err := tx.Create(&records[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *RechargeRepository) GetByTransNo(transNo string) (*models.RechargeRecord, error) {
	var record models.RechargeRecord
	err := r.db.First(&record, "trans_no = ?", transNo).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *RechargeRepository) GetByBatchID(batchID uuid.UUID) ([]models.RechargeRecord, error) {
	var records []models.RechargeRecord
	err := r.db.Where("batch_id = ?", batchID).Order("trans_time DESC").Find(&records).Error
	return records, err
}

func (r *RechargeRepository) GetByMemberID(memberID string) ([]models.RechargeRecord, error) {
	var records []models.RechargeRecord
	err := r.db.Where("member_id = ?", memberID).Order("trans_time DESC").Find(&records).Error
	return records, err
}

func (r *RechargeRepository) ExistsByTransNo(transNo string) (bool, error) {
	var count int64
	err := r.db.Model(&models.RechargeRecord{}).Where("trans_no = ?", transNo).Count(&count).Error
	return count > 0, err
}

func (r *RechargeRepository) DeleteByBatchID(batchID uuid.UUID) error {
	return r.db.Where("batch_id = ?", batchID).Delete(&models.RechargeRecord{}).Error
}

type RefundRepository struct {
	db *gorm.DB
}

func NewRefundRepository(db *gorm.DB) *RefundRepository {
	return &RefundRepository{db: db}
}

func (r *RefundRepository) Create(refund *models.RefundApplication) error {
	refund.ID = uuid.New()
	refund.CreatedAt = time.Now()
	return r.db.Create(refund).Error
}

func (r *RefundRepository) CreateBatch(refunds []models.RefundApplication) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range refunds {
			refunds[i].ID = uuid.New()
			refunds[i].CreatedAt = time.Now()
			if err := tx.Create(&refunds[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *RefundRepository) GetByRefundNo(refundNo string) (*models.RefundApplication, error) {
	var refund models.RefundApplication
	err := r.db.First(&refund, "refund_no = ?", refundNo).Error
	if err != nil {
		return nil, err
	}
	return &refund, nil
}

func (r *RefundRepository) GetByBatchID(batchID uuid.UUID) ([]models.RefundApplication, error) {
	var refunds []models.RefundApplication
	err := r.db.Where("batch_id = ?", batchID).Order("apply_time DESC").Find(&refunds).Error
	return refunds, err
}

func (r *RefundRepository) ExistsByRefundNo(refundNo string) (bool, error) {
	var count int64
	err := r.db.Model(&models.RefundApplication{}).Where("refund_no = ?", refundNo).Count(&count).Error
	return count > 0, err
}

func (r *RefundRepository) DeleteByBatchID(batchID uuid.UUID) error {
	return r.db.Where("batch_id = ?", batchID).Delete(&models.RefundApplication{}).Error
}

type HandoverRepository struct {
	db *gorm.DB
}

func NewHandoverRepository(db *gorm.DB) *HandoverRepository {
	return &HandoverRepository{db: db}
}

func (r *HandoverRepository) Create(handover *models.StoreHandover) error {
	handover.ID = uuid.New()
	handover.CreatedAt = time.Now()
	return r.db.Create(handover).Error
}

func (r *HandoverRepository) CreateBatch(handovers []models.StoreHandover) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range handovers {
			handovers[i].ID = uuid.New()
			handovers[i].CreatedAt = time.Now()
			if err := tx.Create(&handovers[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *HandoverRepository) GetByHandoverNo(handoverNo string) (*models.StoreHandover, error) {
	var handover models.StoreHandover
	err := r.db.First(&handover, "handover_no = ?", handoverNo).Error
	if err != nil {
		return nil, err
	}
	return &handover, nil
}

func (r *HandoverRepository) GetByBatchID(batchID uuid.UUID) ([]models.StoreHandover, error) {
	var handovers []models.StoreHandover
	err := r.db.Where("batch_id = ?", batchID).Order("handover_date DESC").Find(&handovers).Error
	return handovers, err
}

func (r *HandoverRepository) ExistsByHandoverNo(handoverNo string) (bool, error) {
	var count int64
	err := r.db.Model(&models.StoreHandover{}).Where("handover_no = ?", handoverNo).Count(&count).Error
	return count > 0, err
}

func (r *HandoverRepository) DeleteByBatchID(batchID uuid.UUID) error {
	return r.db.Where("batch_id = ?", batchID).Delete(&models.StoreHandover{}).Error
}
