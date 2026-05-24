package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
	"store-prepaid-audit/repository"
)

var (
	ErrBatchNotFound       = errors.New("batch not found")
	ErrInvalidStatus       = errors.New("invalid status transition")
	ErrBatchFrozen         = errors.New("batch is frozen")
	ErrBatchAlreadyExported = errors.New("batch already exported")
	ErrDuplicateTransNo    = errors.New("duplicate transaction number")
)

type OperatorContext struct {
	OperatorID   string
	OperatorName string
	IPAddress    string
	UserAgent    string
}

type BatchService struct {
	db                    *gorm.DB
	batchRepo             *repository.BatchRepository
	rechargeRepo          *repository.RechargeRepository
	refundRepo            *repository.RefundRepository
	handoverRepo          *repository.HandoverRepository
	balanceHistoryRepo    *repository.BalanceHistoryRepository
	reconciliationRepo    *repository.ReconciliationRepository
	auditRepo             *repository.AuditLogRepository
}

func NewBatchService(db *gorm.DB) *BatchService {
	return &BatchService{
		db:                 db,
		batchRepo:          repository.NewBatchRepository(db),
		rechargeRepo:       repository.NewRechargeRepository(db),
		refundRepo:         repository.NewRefundRepository(db),
		handoverRepo:       repository.NewHandoverRepository(db),
		balanceHistoryRepo: repository.NewBalanceHistoryRepository(db),
		reconciliationRepo: repository.NewReconciliationRepository(db),
		auditRepo:          repository.NewAuditLogRepository(db),
	}
}

func (s *BatchService) CreateBatch(storeID, storeName string, opCtx OperatorContext) (*models.Batch, error) {
	batch := models.NewBatch(storeID, storeName, opCtx.OperatorID, opCtx.OperatorName)

	if err := s.batchRepo.Create(batch); err != nil {
		return nil, err
	}

	s.logAudit(nil, "CREATE_BATCH", "BATCH", batch.ID.String(), opCtx, nil, batch, "创建批次")

	return batch, nil
}

func (s *BatchService) GetBatch(id uuid.UUID) (*models.Batch, error) {
	return s.batchRepo.GetByID(id)
}

func (s *BatchService) GetBatchByNo(batchNo string) (*models.Batch, error) {
	return s.batchRepo.GetByBatchNo(batchNo)
}

func (s *BatchService) ListBatches(storeID string, status models.BatchStatus, page, pageSize int) ([]models.Batch, int64, error) {
	return s.batchRepo.List(storeID, status, page, pageSize)
}

func (s *BatchService) canTransition(from, to models.BatchStatus) bool {
	validTransitions := map[models.BatchStatus][]models.BatchStatus{
		models.BatchStatusDraft: {
			models.BatchStatusSubmitted,
			models.BatchStatusCancelled,
		},
		models.BatchStatusSubmitted: {
			models.BatchStatusReviewing,
			models.BatchStatusDraft,
			models.BatchStatusCancelled,
		},
		models.BatchStatusReviewing: {
			models.BatchStatusApproved,
			models.BatchStatusRejected,
			models.BatchStatusPartial,
			models.BatchStatusFrozen,
			models.BatchStatusDraft,
		},
		models.BatchStatusPartial: {
			models.BatchStatusApproved,
			models.BatchStatusRejected,
			models.BatchStatusFrozen,
			models.BatchStatusDraft,
		},
		models.BatchStatusRejected: {
			models.BatchStatusDraft,
			models.BatchStatusFrozen,
		},
		models.BatchStatusApproved: {
			models.BatchStatusFrozen,
			models.BatchStatusExported,
		},
		models.BatchStatusFrozen: {
			models.BatchStatusDraft,
			models.BatchStatusExported,
		},
		models.BatchStatusExported:  {},
		models.BatchStatusCancelled: {},
	}

	for _, valid := range validTransitions[from] {
		if valid == to {
			return true
		}
	}
	return false
}

func (s *BatchService) changeStatus(batchID uuid.UUID, newStatus models.BatchStatus, reason string, opCtx OperatorContext) error {
	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrBatchNotFound
		}
		return err
	}

	if !s.canTransition(batch.Status, newStatus) {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrInvalidStatus, batch.Status, newStatus)
	}

	history := &models.StatusHistory{
		BatchID:      batchID,
		FromStatus:   batch.Status,
		ToStatus:     newStatus,
		OperatorID:   opCtx.OperatorID,
		OperatorName: opCtx.OperatorName,
		Reason:       reason,
		ChangeTime:   time.Now(),
		IPAddress:    opCtx.IPAddress,
		UserAgent:    opCtx.UserAgent,
	}

	if err := s.batchRepo.UpdateStatus(batchID, newStatus, history); err != nil {
		return err
	}

	s.logAudit(&batchID, "STATUS_CHANGE", "BATCH", batchID.String(), opCtx,
		map[string]interface{}{"status": batch.Status},
		map[string]interface{}{"status": newStatus, "reason": reason},
		reason)

	return nil
}

func (s *BatchService) SubmitBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusSubmitted, reason, opCtx)
}

func (s *BatchService) RecallBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusDraft, reason, opCtx)
}

func (s *BatchService) StartReview(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusReviewing, reason, opCtx)
}

func (s *BatchService) ApproveBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusApproved, reason, opCtx)
}

func (s *BatchService) RejectBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusRejected, reason, opCtx)
}

func (s *BatchService) PartialPass(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusPartial, reason, opCtx)
}

func (s *BatchService) FreezeBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusFrozen, reason, opCtx)
}

func (s *BatchService) CancelBatch(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusCancelled, reason, opCtx)
}

func (s *BatchService) MarkExported(batchID uuid.UUID, reason string, opCtx OperatorContext) error {
	return s.changeStatus(batchID, models.BatchStatusExported, reason, opCtx)
}

func (s *BatchService) AddRechargeRecords(batchID uuid.UUID, records []models.RechargeRecord, strategy models.DuplicateStrategy, opCtx OperatorContext) (int, error) {
	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		return 0, err
	}

	if batch.Status == models.BatchStatusFrozen {
		return 0, ErrBatchFrozen
	}
	if batch.Status == models.BatchStatusExported {
		return 0, ErrBatchAlreadyExported
	}

	added := 0
	skipped := 0
	overwritten := 0

	for i := range records {
		records[i].BatchID = batchID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, record := range records {
			exists, err := repository.NewRechargeRepository(tx).ExistsByTransNo(record.TransNo)
			if err != nil {
				return err
			}

			if exists {
				switch strategy {
				case models.DuplicateStrategyIgnore:
					skipped++
					continue
				case models.DuplicateStrategyOverwrite:
					existing, err := repository.NewRechargeRepository(tx).GetByTransNo(record.TransNo)
					if err != nil {
						return err
					}
					record.ID = existing.ID
					record.CreatedAt = existing.CreatedAt
					if err := tx.Save(&record).Error; err != nil {
						return err
					}
					overwritten++
				case models.DuplicateStrategyAppend:
					record.TransNo = fmt.Sprintf("%s_%d", record.TransNo, time.Now().UnixNano())
					fallthrough
				default:
					if err := repository.NewRechargeRepository(tx).Create(&record); err != nil {
						return err
					}
					added++
				}
			} else {
				if err := repository.NewRechargeRepository(tx).Create(&record); err != nil {
					return err
				}
				added++
			}
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	s.logAudit(&batchID, "ADD_RECHARGES", "BATCH", batchID.String(), opCtx,
		nil,
		map[string]interface{}{"added": added, "skipped": skipped, "overwritten": overwritten, "strategy": strategy},
		fmt.Sprintf("添加充值记录: 新增%d, 跳过%d, 覆盖%d", added, skipped, overwritten))

	s.updateBatchStats(batchID)

	return added, nil
}

func (s *BatchService) AddRefundApplications(batchID uuid.UUID, refunds []models.RefundApplication, strategy models.DuplicateStrategy, opCtx OperatorContext) (int, error) {
	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		return 0, err
	}

	if batch.Status == models.BatchStatusFrozen {
		return 0, ErrBatchFrozen
	}
	if batch.Status == models.BatchStatusExported {
		return 0, ErrBatchAlreadyExported
	}

	added := 0
	skipped := 0
	overwritten := 0

	for i := range refunds {
		refunds[i].BatchID = batchID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, refund := range refunds {
			exists, err := repository.NewRefundRepository(tx).ExistsByRefundNo(refund.RefundNo)
			if err != nil {
				return err
			}

			if exists {
				switch strategy {
				case models.DuplicateStrategyIgnore:
					skipped++
					continue
				case models.DuplicateStrategyOverwrite:
					existing, err := repository.NewRefundRepository(tx).GetByRefundNo(refund.RefundNo)
					if err != nil {
						return err
					}
					refund.ID = existing.ID
					refund.CreatedAt = existing.CreatedAt
					if err := tx.Save(&refund).Error; err != nil {
						return err
					}
					overwritten++
				case models.DuplicateStrategyAppend:
					refund.RefundNo = fmt.Sprintf("%s_%d", refund.RefundNo, time.Now().UnixNano())
					fallthrough
				default:
					if err := repository.NewRefundRepository(tx).Create(&refund); err != nil {
						return err
					}
					added++
				}
			} else {
				if err := repository.NewRefundRepository(tx).Create(&refund); err != nil {
					return err
				}
				added++
			}
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	s.logAudit(&batchID, "ADD_REFUNDS", "BATCH", batchID.String(), opCtx,
		nil,
		map[string]interface{}{"added": added, "skipped": skipped, "overwritten": overwritten, "strategy": strategy},
		fmt.Sprintf("添加退款申请: 新增%d, 跳过%d, 覆盖%d", added, skipped, overwritten))

	s.updateBatchStats(batchID)

	return added, nil
}

func (s *BatchService) AddHandoverRecords(batchID uuid.UUID, handovers []models.StoreHandover, strategy models.DuplicateStrategy, opCtx OperatorContext) (int, error) {
	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		return 0, err
	}

	if batch.Status == models.BatchStatusFrozen {
		return 0, ErrBatchFrozen
	}
	if batch.Status == models.BatchStatusExported {
		return 0, ErrBatchAlreadyExported
	}

	added := 0
	skipped := 0
	overwritten := 0

	for i := range handovers {
		handovers[i].BatchID = batchID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, handover := range handovers {
			exists, err := repository.NewHandoverRepository(tx).ExistsByHandoverNo(handover.HandoverNo)
			if err != nil {
				return err
			}

			if exists {
				switch strategy {
				case models.DuplicateStrategyIgnore:
					skipped++
					continue
				case models.DuplicateStrategyOverwrite:
					existing, err := repository.NewHandoverRepository(tx).GetByHandoverNo(handover.HandoverNo)
					if err != nil {
						return err
					}
					handover.ID = existing.ID
					handover.CreatedAt = existing.CreatedAt
					if err := tx.Save(&handover).Error; err != nil {
						return err
					}
					overwritten++
				case models.DuplicateStrategyAppend:
					handover.HandoverNo = fmt.Sprintf("%s_%d", handover.HandoverNo, time.Now().UnixNano())
					fallthrough
				default:
					if err := repository.NewHandoverRepository(tx).Create(&handover); err != nil {
						return err
					}
					added++
				}
			} else {
				if err := repository.NewHandoverRepository(tx).Create(&handover); err != nil {
					return err
				}
				added++
			}
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	s.logAudit(&batchID, "ADD_HANDOVERS", "BATCH", batchID.String(), opCtx,
		nil,
		map[string]interface{}{"added": added, "skipped": skipped, "overwritten": overwritten, "strategy": strategy},
		fmt.Sprintf("添加交接表: 新增%d, 跳过%d, 覆盖%d", added, skipped, overwritten))

	s.updateBatchStats(batchID)

	return added, nil
}

func (s *BatchService) updateBatchStats(batchID uuid.UUID) error {
	recharges, err := s.rechargeRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	totalAmount := 0.0
	totalRecords := len(recharges)

	for _, r := range recharges {
		totalAmount += r.Amount
	}

	return s.batchRepo.UpdateStats(batchID, totalAmount, totalRecords, 0, 0)
}

func (s *BatchService) logAudit(batchID *uuid.UUID, action, resourceType, resourceID string, opCtx OperatorContext, before, after interface{}, remark string) {
	var beforeData, afterData string
	if before != nil {
		if b, err := json.Marshal(before); err == nil {
			beforeData = string(b)
		}
	}
	if after != nil {
		if a, err := json.Marshal(after); err == nil {
			afterData = string(a)
		}
	}

	log := &models.AuditLog{
		BatchID:      batchID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		OperatorID:   opCtx.OperatorID,
		OperatorName: opCtx.OperatorName,
		IPAddress:    opCtx.IPAddress,
		UserAgent:    opCtx.UserAgent,
		BeforeData:   beforeData,
		AfterData:    afterData,
		Remark:       remark,
	}

	s.auditRepo.Create(log)
}

func (s *BatchService) ListAuditLogs(batchID *uuid.UUID, action, resourceType string, page, pageSize int) ([]models.AuditLog, int64, error) {
	return s.auditRepo.List(batchID, action, resourceType, page, pageSize)
}
