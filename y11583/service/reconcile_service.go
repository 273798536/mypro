package service

import (
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
	"store-prepaid-audit/repository"
)

type ReconcileService struct {
	db                  *gorm.DB
	batchRepo           *repository.BatchRepository
	rechargeRepo        *repository.RechargeRepository
	refundRepo          *repository.RefundRepository
	balanceHistoryRepo  *repository.BalanceHistoryRepository
	reconciliationRepo  *repository.ReconciliationRepository
}

func NewReconcileService(db *gorm.DB) *ReconcileService {
	return &ReconcileService{
		db:                 db,
		batchRepo:          repository.NewBatchRepository(db),
		rechargeRepo:       repository.NewRechargeRepository(db),
		refundRepo:         repository.NewRefundRepository(db),
		balanceHistoryRepo: repository.NewBalanceHistoryRepository(db),
		reconciliationRepo: repository.NewReconciliationRepository(db),
	}
}

type ReconcileResult struct {
	TotalRecords      int
	MatchedRecords    int
	MismatchedRecords int
	CrossStoreCount   int
	CancelledCount    int
	GapsFound         int
	Details           []models.ReconciliationResult
}

func (s *ReconcileService) ReconcileBatch(batchID uuid.UUID, opCtx OperatorContext) (*ReconcileResult, error) {
	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		return nil, err
	}

	if batch.Status == models.BatchStatusFrozen {
		return nil, ErrBatchFrozen
	}

	recharges, err := s.rechargeRepo.GetByBatchID(batchID)
	if err != nil {
		return nil, err
	}

	if err := s.balanceHistoryRepo.DeleteByBatchID(batchID); err != nil {
		return nil, err
	}

	if err := s.reconciliationRepo.DeleteByBatchID(batchID); err != nil {
		return nil, err
	}

	balanceHistories := s.buildBalanceHistory(batchID, recharges, batch.StoreID)

	if err := s.balanceHistoryRepo.CreateBatch(balanceHistories); err != nil {
		return nil, err
	}

	result, err := s.performReconciliation(batchID, balanceHistories, opCtx)
	if err != nil {
		return nil, err
	}

	if err := s.batchRepo.UpdateStats(batchID, batch.TotalAmount,
		result.TotalRecords, result.MatchedRecords, result.MismatchedRecords); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *ReconcileService) buildBalanceHistory(batchID uuid.UUID, recharges []models.RechargeRecord, currentStoreID string) []models.BalanceHistory {
	memberRecords := make(map[string][]models.RechargeRecord)
	for _, r := range recharges {
		memberRecords[r.MemberID] = append(memberRecords[r.MemberID], r)
	}

	var histories []models.BalanceHistory

	for memberID, records := range memberRecords {
		sort.Slice(records, func(i, j int) bool {
			return records[i].TransTime.Before(records[j].TransTime)
		})

		memberName := ""
		if len(records) > 0 {
			memberName = records[0].MemberName
		}

		for i, record := range records {
			isCrossStore := record.StoreID != currentStoreID

			history := models.BalanceHistory{
				BatchID:       batchID,
				MemberID:      memberID,
				MemberName:    memberName,
				TransNo:       record.TransNo,
				TransType:     "RECHARGE",
				StoreID:       record.StoreID,
				StoreName:     record.StoreName,
				Amount:        record.Amount,
				BeforeBalance: record.BeforeBalance,
				AfterBalance:  record.AfterBalance,
				TransTime:     record.TransTime,
				IsCrossStore:  isCrossStore,
				IsCancelled:   record.IsCancelled,
				Reconciled:    false,
			}

			if record.IsCancelled {
				cancelRemark := fmt.Sprintf("已撤销, 撤销人: %s", *record.CancelOperator)
				if record.CancelTime != nil {
					cancelRemark += fmt.Sprintf(", 撤销时间: %s", record.CancelTime.Format("2006-01-02 15:04:05"))
				}
				history.Remark = cancelRemark
			}

			if i == 0 {
				history.Remark += "首笔交易"
			}

			histories = append(histories, history)
		}
	}

	sort.Slice(histories, func(i, j int) bool {
		return histories[i].TransTime.Before(histories[j].TransTime)
	})

	return histories
}

func (s *ReconcileService) performReconciliation(batchID uuid.UUID, histories []models.BalanceHistory, opCtx OperatorContext) (*ReconcileResult, error) {
	result := &ReconcileResult{
		TotalRecords: len(histories),
	}

	memberHistories := make(map[string][]models.BalanceHistory)
	for _, h := range histories {
		memberHistories[h.MemberID] = append(memberHistories[h.MemberID], h)
	}

	var reconcileResults []models.ReconciliationResult

	for memberID, memberHis := range memberHistories {
		sort.Slice(memberHis, func(i, j int) bool {
			return memberHis[i].TransTime.Before(memberHis[j].TransTime)
		})

		for i, h := range memberHis {
			rr := models.ReconciliationResult{
				BatchID:         batchID,
				MemberID:        memberID,
				TransNo:         h.TransNo,
				MatchStatus:     "MATCHED",
				ExpectedBalance: h.AfterBalance,
				ActualBalance:   h.AfterBalance,
				Difference:      0,
				CrossStoreCheck: "PASS",
				CancelCheck:     "PASS",
				HistoryContinuous: true,
				OperatorID:      opCtx.OperatorID,
				OperatorName:    opCtx.OperatorName,
			}

			if h.IsCrossStore {
				rr.CrossStoreCheck = "WARNING"
				result.CrossStoreCount++
				rr.Remark += "跨店交易; "
			}

			if h.IsCancelled {
				rr.CancelCheck = "WARNING"
				result.CancelledCount++
				rr.Remark += "已撤销; "
			}

			if i > 0 {
				prev := memberHis[i-1]
				expectedBefore := prev.AfterBalance
				if h.BeforeBalance != expectedBefore {
					rr.MatchStatus = "MISMATCHED"
					rr.HistoryContinuous = false
					gap := h.BeforeBalance - expectedBefore
					rr.GapBefore = &gap
					rr.Difference = gap
					rr.ExpectedBalance = expectedBefore + h.Amount
					rr.ActualBalance = h.AfterBalance
					result.GapsFound++
					rr.Remark += fmt.Sprintf("余额断层: 前笔后余额%.2f, 当前前余额%.2f, 差额%.2f; ", expectedBefore, h.BeforeBalance, gap)
				}
			}

			calcAfter := h.BeforeBalance + h.Amount
			if !h.IsCancelled && calcAfter != h.AfterBalance {
				rr.MatchStatus = "MISMATCHED"
				rr.Difference = h.AfterBalance - calcAfter
				rr.Remark += fmt.Sprintf("余额计算错误: %.2f + %.2f = %.2f, 实际%.2f; ", h.BeforeBalance, h.Amount, calcAfter, h.AfterBalance)
			}

			if rr.MatchStatus == "MATCHED" {
				result.MatchedRecords++
			} else {
				result.MismatchedRecords++
			}

			reconcileResults = append(reconcileResults, rr)
		}
	}

	if err := s.reconciliationRepo.CreateBatch(reconcileResults); err != nil {
		return nil, err
	}

	result.Details = reconcileResults

	return result, nil
}

func (s *ReconcileService) GetBalanceHistory(batchID uuid.UUID) ([]models.BalanceHistory, error) {
	return s.balanceHistoryRepo.GetByBatchID(batchID)
}

func (s *ReconcileService) GetMemberBalanceHistory(memberID string) ([]models.BalanceHistory, error) {
	return s.balanceHistoryRepo.GetByMemberID(memberID)
}

func (s *ReconcileService) GetReconciliationResults(batchID uuid.UUID) ([]models.ReconciliationResult, error) {
	return s.reconciliationRepo.GetByBatchID(batchID)
}

func (s *ReconcileService) GetMismatchedResults(batchID uuid.UUID) ([]models.ReconciliationResult, error) {
	return s.reconciliationRepo.GetMismatchedByBatchID(batchID)
}

func (s *ReconcileService) PlaybackTransactions(memberID string, startTime, endTime time.Time) ([]models.BalanceHistory, float64, error) {
	histories, err := s.balanceHistoryRepo.GetByMemberID(memberID)
	if err != nil {
		return nil, 0, err
	}

	var filtered []models.BalanceHistory
	for _, h := range histories {
		if (h.TransTime.Equal(startTime) || h.TransTime.After(startTime)) &&
			(h.TransTime.Equal(endTime) || h.TransTime.Before(endTime)) {
			filtered = append(filtered, h)
		}
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].TransTime.Before(filtered[j].TransTime)
	})

	var currentBalance float64
	if len(filtered) > 0 {
		currentBalance = filtered[len(filtered)-1].AfterBalance
	}

	return filtered, currentBalance, nil
}
