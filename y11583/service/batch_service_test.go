package service

import (
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"store-prepaid-audit/models"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}

	err = db.AutoMigrate(
		&models.Batch{},
		&models.RechargeRecord{},
		&models.RefundApplication{},
		&models.StoreHandover{},
		&models.Evidence{},
		&models.StatusHistory{},
		&models.BalanceHistory{},
		&models.AuditLog{},
		&models.ReconciliationResult{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	return db
}

func getTestOpCtx() OperatorContext {
	return OperatorContext{
		OperatorID:   "TEST_OP",
		OperatorName: "测试操作员",
		IPAddress:    "127.0.0.1",
		UserAgent:    "TestAgent",
	}
}

func TestCreateBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, err := service.CreateBatch("STORE001", "测试门店", opCtx)
	if err != nil {
		t.Fatalf("CreateBatch failed: %v", err)
	}

	if batch.ID == uuid.Nil {
		t.Error("Batch ID should not be nil")
	}
	if batch.Status != models.BatchStatusDraft {
		t.Errorf("Expected status DRAFT, got %s", batch.Status)
	}
	if batch.StoreID != "STORE001" {
		t.Errorf("Expected store ID STORE001, got %s", batch.StoreID)
	}
}

func TestStatusTransitions(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	tests := []struct {
		name      string
		fromState models.BatchStatus
		action    func(uuid.UUID, string, OperatorContext) error
		wantErr   bool
	}{
		{"DRAFT -> SUBMITTED", models.BatchStatusDraft, service.SubmitBatch, false},
		{"SUBMITTED -> REVIEWING", models.BatchStatusSubmitted, service.StartReview, false},
		{"REVIEWING -> APPROVED", models.BatchStatusReviewing, service.ApproveBatch, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.action(batch.ID, "测试原因", opCtx)
			if (err != nil) != tt.wantErr {
				t.Errorf("%s error = %v, wantErr %v", tt.name, err, tt.wantErr)
			}

			b, _ := service.GetBatch(batch.ID)
			if !tt.wantErr && b.Status == tt.fromState {
				t.Errorf("Status should have changed from %s", tt.fromState)
			}
		})
	}
}

func TestInvalidStatusTransitions(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	service.ApproveBatch(batch.ID, "测试", opCtx)

	err := service.SubmitBatch(batch.ID, "尝试从APPROVED回到SUBMITTED", opCtx)
	if err == nil {
		t.Error("Expected error for invalid transition, got nil")
	}
}

func TestRecallBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	service.SubmitBatch(batch.ID, "提交", opCtx)

	b, _ := service.GetBatch(batch.ID)
	if b.Status != models.BatchStatusSubmitted {
		t.Fatalf("Expected SUBMITTED, got %s", b.Status)
	}

	err := service.RecallBatch(batch.ID, "撤回修改", opCtx)
	if err != nil {
		t.Fatalf("RecallBatch failed: %v", err)
	}

	b, _ = service.GetBatch(batch.ID)
	if b.Status != models.BatchStatusDraft {
		t.Errorf("Expected DRAFT after recall, got %s", b.Status)
	}
}

func TestFreezeBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)
	service.SubmitBatch(batch.ID, "提交", opCtx)
	service.StartReview(batch.ID, "审核", opCtx)

	err := service.FreezeBatch(batch.ID, "导出前冻结", opCtx)
	if err != nil {
		t.Fatalf("FreezeBatch failed: %v", err)
	}

	b, _ := service.GetBatch(batch.ID)
	if b.Status != models.BatchStatusFrozen {
		t.Errorf("Expected FROZEN, got %s", b.Status)
	}
}

func TestPartialPass(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)
	service.SubmitBatch(batch.ID, "提交", opCtx)
	service.StartReview(batch.ID, "审核", opCtx)

	err := service.PartialPass(batch.ID, "部分异常已核实", opCtx)
	if err != nil {
		t.Fatalf("PartialPass failed: %v", err)
	}

	b, _ := service.GetBatch(batch.ID)
	if b.Status != models.BatchStatusPartial {
		t.Errorf("Expected PARTIAL, got %s", b.Status)
	}
}

func TestStatusHistoryRecorded(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	service.SubmitBatch(batch.ID, "提交", opCtx)
	service.StartReview(batch.ID, "审核", opCtx)

	b, _ := service.GetBatch(batch.ID)
	historyCount := len(b.Histories)
	if historyCount < 2 {
		t.Errorf("Expected at least 2 history records, got %d", historyCount)
	}

	for _, h := range b.Histories {
		if h.OperatorID != opCtx.OperatorID {
			t.Errorf("Expected operator ID %s, got %s", opCtx.OperatorID, h.OperatorID)
		}
		if h.Reason == "" {
			t.Error("Reason should not be empty")
		}
	}
}

func TestCancelBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	err := service.CancelBatch(batch.ID, "取消批次", opCtx)
	if err != nil {
		t.Fatalf("CancelBatch failed: %v", err)
	}

	b, _ := service.GetBatch(batch.ID)
	if b.Status != models.BatchStatusCancelled {
		t.Errorf("Expected CANCELLED, got %s", b.Status)
	}

	err = service.SubmitBatch(batch.ID, "尝试提交已取消的批次", opCtx)
	if err == nil {
		t.Error("Expected error when submitting cancelled batch")
	}
}

func TestListBatches(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	for i := 0; i < 5; i++ {
		service.CreateBatch("STORE001", "测试门店", opCtx)
	}

	batches, total, err := service.ListBatches("", "", 1, 10)
	if err != nil {
		t.Fatalf("ListBatches failed: %v", err)
	}

	if total != 5 {
		t.Errorf("Expected 5 batches, got %d", total)
	}
	if len(batches) != 5 {
		t.Errorf("Expected 5 batches in list, got %d", len(batches))
	}
}

func TestBatchNotFound(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	_, err := service.GetBatch(uuid.New())
	if err == nil {
		t.Error("Expected error for non-existent batch")
	}
}
