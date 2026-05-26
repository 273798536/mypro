package service

import (
	"testing"
	"time"

	"store-prepaid-audit/models"
)

func TestBalanceContinuityCheck(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
		},
		{
			TransNo:       "TXN002",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        50,
			BeforeBalance: 100,
			AfterBalance:  150,
			TransTime:     now.Add(1 * time.Hour),
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.TotalRecords != 2 {
		t.Errorf("Expected 2 total records, got %d", result.TotalRecords)
	}
}

func TestBalanceGapDetection(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
		},
		{
			TransNo:       "TXN002",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        50,
			BeforeBalance: 200,
			AfterBalance:  250,
			TransTime:     now.Add(1 * time.Hour),
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.GapsFound <= 0 {
		t.Errorf("Expected balance gaps detected, got %d", result.GapsFound)
	}
}

func TestCrossStoreDetection(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			StoreID:       "STORE001",
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
		},
		{
			TransNo:       "TXN002",
			MemberID:      "M002",
			MemberName:    "李四",
			Amount:        50,
			StoreID:       "STORE002",
			BeforeBalance: 0,
			AfterBalance:  50,
			TransTime:     now.Add(1 * time.Hour),
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.CrossStoreCount <= 0 {
		t.Errorf("Expected cross-store transactions detected, got %d", result.CrossStoreCount)
	}
}

func TestReversedTransactionDetection(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			StoreID:       "STORE001",
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
			IsCancelled:   true,
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.CancelledCount <= 0 {
		t.Errorf("Expected cancelled transactions detected, got %d", result.CancelledCount)
	}
}

func TestAmountCalculationCheck(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
		},
		{
			TransNo:       "TXN002",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        50,
			BeforeBalance: 100,
			AfterBalance:  200,
			TransTime:     now.Add(1 * time.Hour),
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.MismatchedRecords <= 0 {
		t.Errorf("Expected mismatched records, got %d", result.MismatchedRecords)
	}
}

func TestMultipleMembersReconcile(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	now := time.Now()
	records := []models.RechargeRecord{
		{
			TransNo:       "TXN001",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        100,
			BeforeBalance: 0,
			AfterBalance:  100,
			TransTime:     now,
		},
		{
			TransNo:       "TXN002",
			MemberID:      "M002",
			MemberName:    "李四",
			Amount:        50,
			BeforeBalance: 0,
			AfterBalance:  50,
			TransTime:     now.Add(30 * time.Minute),
		},
		{
			TransNo:       "TXN003",
			MemberID:      "M001",
			MemberName:    "张三",
			Amount:        50,
			BeforeBalance: 100,
			AfterBalance:  150,
			TransTime:     now.Add(1 * time.Hour),
		},
	}

	batchService.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)

	result, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile failed: %v", err)
	}

	if result.TotalRecords != 3 {
		t.Errorf("Expected 3 total records, got %d", result.TotalRecords)
	}
}

func TestEmptyBatchReconcile(t *testing.T) {
	db := setupTestDB(t)
	opCtx := getTestOpCtx()

	batchService := NewBatchService(db)
	reconcileService := NewReconcileService(db)

	batch, _ := batchService.CreateBatch("STORE001", "测试门店", opCtx)

	_, err := reconcileService.ReconcileBatch(batch.ID, opCtx)
	if err != nil {
		t.Fatalf("Reconcile of empty batch should not fail: %v", err)
	}
}
