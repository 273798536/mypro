package service

import (
	"testing"

	"github.com/google/uuid"

	"store-prepaid-audit/models"
)

func TestIdempotencyIgnoreStrategy(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	records := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
	}

	result, err := service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)
	if err != nil {
		t.Fatalf("First add failed: %v", err)
	}
	if result.Added != 1 {
		t.Errorf("Expected 1 added, got %d", result.Added)
	}

	result, err = service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)
	if err != nil {
		t.Fatalf("Second add failed: %v", err)
	}
	if result.Added != 0 {
		t.Errorf("Expected 0 added with IGNORE, got %d", result.Added)
	}
	if result.Skipped != 1 {
		t.Errorf("Expected 1 skipped, got %d", result.Skipped)
	}
}

func TestIdempotencyOverwriteStrategy(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	records := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
	}

	result, err := service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyOverwrite, opCtx)
	if err != nil {
		t.Fatalf("First add failed: %v", err)
	}
	if result.Added != 1 {
		t.Errorf("Expected 1 added, got %d", result.Added)
	}

	updatedRecords := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     200,
		},
	}

	result, err = service.AddRechargeRecords(batch.ID, updatedRecords, models.DuplicateStrategyOverwrite, opCtx)
	if err != nil {
		t.Fatalf("Second add failed: %v", err)
	}
	if result.Updated != 1 {
		t.Errorf("Expected 1 updated with OVERWRITE, got %d", result.Updated)
	}
}

func TestIdempotencyAppendStrategy(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	records := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
	}

	result, err := service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyAppend, opCtx)
	if err != nil {
		t.Fatalf("First add failed: %v", err)
	}
	if result.Added != 1 {
		t.Errorf("Expected 1 added, got %d", result.Added)
	}

	result, err = service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyAppend, opCtx)
	if err != nil {
		t.Fatalf("Second add failed: %v", err)
	}
	if result.Appended != 1 {
		t.Errorf("Expected 1 appended with APPEND, got %d", result.Appended)
	}
}

func TestIdempotencyMultipleStrategies(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	existingRecords := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
		{
			TransNo:    "TXN002",
			MemberID:   "M002",
			MemberName: "李四",
			Amount:     200,
		},
	}

	service.AddRechargeRecords(batch.ID, existingRecords, models.DuplicateStrategyIgnore, opCtx)

	mixedRecords := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     150,
		},
		{
			TransNo:    "TXN003",
			MemberID:   "M003",
			MemberName: "王五",
			Amount:     300,
		},
	}

	result, err := service.AddRechargeRecords(batch.ID, mixedRecords, models.DuplicateStrategyIgnore, opCtx)
	if err != nil {
		t.Fatalf("Mixed add failed: %v", err)
	}
	if result.Added != 1 {
		t.Errorf("Expected 1 new record added, got %d", result.Added)
	}
	if result.Skipped != 1 {
		t.Errorf("Expected 1 existing record skipped, got %d", result.Skipped)
	}
}

func TestCannotModifyFrozenBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)
	service.SubmitBatch(batch.ID, "提交", opCtx)
	service.StartReview(batch.ID, "审核", opCtx)
	service.FreezeBatch(batch.ID, "冻结", opCtx)

	records := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
	}

	_, err := service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)
	if err == nil {
		t.Error("Expected error when adding records to frozen batch")
	}
}

func TestCannotModifyExportedBatch(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)
	service.SubmitBatch(batch.ID, "提交", opCtx)
	service.StartReview(batch.ID, "审核", opCtx)
	service.ApproveBatch(batch.ID, "通过", opCtx)
	service.ExportBatch(batch.ID, "导出", opCtx)

	records := []models.RechargeRecord{
		{
			TransNo:    "TXN001",
			MemberID:   "M001",
			MemberName: "张三",
			Amount:     100,
		},
	}

	_, err := service.AddRechargeRecords(batch.ID, records, models.DuplicateStrategyIgnore, opCtx)
	if err == nil {
		t.Error("Expected error when adding records to exported batch")
	}
}

func TestAuditLogForStatusChange(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)

	service.SubmitBatch(batch.ID, "提交审核", opCtx)

	var logs []models.AuditLog
	db.Where("batch_id = ?", batch.ID).Find(&logs)

	if len(logs) == 0 {
		t.Error("Expected at least one audit log")
	}

	logsWithChange := 0
	for _, log := range logs {
		if log.Action == "STATUS_CHANGE" {
			logsWithChange++
		}
	}
	if logsWithChange == 0 {
		t.Error("Expected audit log for status change")
	}
}

func TestVersionIncrement(t *testing.T) {
	db := setupTestDB(t)
	service := NewBatchService(db)
	opCtx := getTestOpCtx()

	batch, _ := service.CreateBatch("STORE001", "测试门店", opCtx)
	initialVersion := batch.Version

	service.SubmitBatch(batch.ID, "提交", opCtx)

	b, _ := service.GetBatch(batch.ID)
	if b.Version <= initialVersion {
		t.Errorf("Expected version to increment, got %d (was %d)", b.Version, initialVersion)
	}
}
