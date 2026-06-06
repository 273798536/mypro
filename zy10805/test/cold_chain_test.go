package test

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"cold-chain-review/internal/model"
	"cold-chain-review/internal/repository"
	"cold-chain-review/internal/service"
)

func setupTestDB(t *testing.T) (*repository.Database, *service.ColdChainService) {
	dbPath := fmt.Sprintf("./test_%d.db", time.Now().UnixNano())
	db, err := repository.NewDatabase(dbPath)
	require.NoError(t, err)

	repo := repository.NewRepository(db)
	svc := service.NewColdChainService(repo)

	t.Cleanup(func() {
		db.Close()
		os.Remove(dbPath)
	})

	return db, svc
}

func createTestData(t *testing.T, svc *service.ColdChainService) (string, string, string, string, string) {
	store1 := &model.Store{Name: "门店A", Address: "地址A"}
	err := svc.CreateStore(store1)
	require.NoError(t, err)

	store2 := &model.Store{Name: "门店B", Address: "地址B"}
	err = svc.CreateStore(store2)
	require.NoError(t, err)

	batch := &model.DrugBatch{
		DrugName:     "胰岛素注射液",
		BatchNo:      fmt.Sprintf("BATCH-%d", time.Now().UnixNano()),
		Spec:         "300IU/3ml",
		Manufacturer: "某制药厂",
		MinTemp:      2.0,
		MaxTemp:      8.0,
		ExpiryDate:   time.Now().AddDate(1, 0, 0),
	}
	err = svc.CreateDrugBatch(batch)
	require.NoError(t, err)

	cabinet := &model.ColdChainCabinet{
		CabinetNo:   "CAB-001",
		StoreID:     store1.ID,
		ProbeID:     "PROBE-001",
		MinTemp:     2.0,
		MaxTemp:     8.0,
		Status:      "active",
		LastCalibAt: time.Now().AddDate(0, -1, 0),
	}
	err = svc.CreateCabinet(cabinet)
	require.NoError(t, err)

	orderNo := fmt.Sprintf("TRANSFER-%d", time.Now().UnixNano())
	order := &model.TransferOrder{
		OrderNo:        orderNo,
		FromStoreID:    store1.ID,
		ToStoreID:      store2.ID,
		DrugBatchID:    batch.ID,
		Quantity:       100,
		CabinetID:      cabinet.ID,
		OutboundTime:   time.Now().Add(-2 * time.Hour),
		ExpectedArrive: time.Now().Add(1 * time.Hour),
		Status:         model.TransferStatusShipped,
	}
	err = svc.CreateTransferOrder(order)
	require.NoError(t, err)

	return store1.ID, store2.ID, batch.ID, cabinet.ID, order.ID
}

func TestIdempotency_RegisterException(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, _, orderID := createTestData(t, svc)

	exceptionNo := fmt.Sprintf("EXC-%d", time.Now().UnixNano())
	req := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempBreak,
		Severity:        model.SeverityHigh,
		Description:     "温度超标，达到12度",
		ReporterID:      "user001",
		ReporterName:    "张三",
		FoundTime:       time.Now(),
	}

	exc1, err := svc.RegisterException(req)
	require.NoError(t, err)
	assert.NotNil(t, exc1)

	exc2, err := svc.RegisterException(req)
	require.NoError(t, err)
	assert.NotNil(t, exc2)

	assert.Equal(t, exc1.ID, exc2.ID, "重复提交异常登记应返回相同记录，保证幂等性")
}

func TestIdempotency_CreateTransferOrder(t *testing.T) {
	_, svc := setupTestDB(t)

	store1 := &model.Store{Name: "门店A", Address: "地址A"}
	err := svc.CreateStore(store1)
	require.NoError(t, err)

	store2 := &model.Store{Name: "门店B", Address: "地址B"}
	err = svc.CreateStore(store2)
	require.NoError(t, err)

	batch := &model.DrugBatch{
		DrugName:     "测试药品",
		BatchNo:      "TEST-BATCH-001",
		MinTemp:      2.0,
		MaxTemp:      8.0,
		ExpiryDate:   time.Now().AddDate(1, 0, 0),
	}
	err = svc.CreateDrugBatch(batch)
	require.NoError(t, err)

	order := &model.TransferOrder{
		OrderNo:        "TEST-ORDER-001",
		FromStoreID:    store1.ID,
		ToStoreID:      store2.ID,
		DrugBatchID:    batch.ID,
		Quantity:       50,
		OutboundTime:   time.Now(),
		ExpectedArrive: time.Now().Add(2 * time.Hour),
	}

	err = svc.CreateTransferOrder(order)
	require.NoError(t, err)

	order2 := &model.TransferOrder{
		OrderNo:        "TEST-ORDER-001",
		FromStoreID:    store1.ID,
		ToStoreID:      store2.ID,
		DrugBatchID:    batch.ID,
		Quantity:       999,
		OutboundTime:   time.Now(),
		ExpectedArrive: time.Now().Add(2 * time.Hour),
	}

	err = svc.CreateTransferOrder(order2)
	require.NoError(t, err)

	savedOrder, err := svc.GetTransferOrderByNo("TEST-ORDER-001")
	require.NoError(t, err)
	assert.Equal(t, 50, savedOrder.Quantity, "重复提交调拨单不应覆盖原有数量")
}

func TestIdempotency_CreateReceivingReview(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, _, orderID := createTestData(t, svc)

	review := &model.ReceivingReview{
		TransferOrderID: orderID,
		ReviewerID:      "reviewer001",
		ReviewerName:    "李四",
		ReceiveTime:     time.Now(),
		PackageIntact:   true,
		TempOnArrival:   5.0,
		IsQualified:     true,
		Remark:          "收货正常",
	}

	err := svc.CreateReceivingReview(review)
	require.NoError(t, err)

	review2 := &model.ReceivingReview{
		TransferOrderID: orderID,
		ReviewerID:      "reviewer002",
		ReviewerName:    "王五",
		ReceiveTime:     time.Now(),
		PackageIntact:   false,
		TempOnArrival:   15.0,
		IsQualified:     false,
		Remark:          "异常数据",
	}

	err = svc.CreateReceivingReview(review2)
	require.NoError(t, err)

	savedReview, err := svc.GetTransferOrder(orderID)
	require.NoError(t, err)
	assert.NotNil(t, savedReview)
}

func TestIdempotency_CreateDisposal(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, _, orderID := createTestData(t, svc)

	exceptionNo := fmt.Sprintf("EXC-DIS-%d", time.Now().UnixNano())
	req := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempBreak,
		Severity:        model.SeverityHigh,
		Description:     "温度超标",
		ReporterID:      "user001",
		ReporterName:    "张三",
	}
	exc, err := svc.RegisterException(req)
	require.NoError(t, err)

	disposalReq := &service.CreateDisposalRequest{
		ExceptionID:    exc.ID,
		DisposalType:   "销毁",
		HandlerID:      "handler001",
		HandlerName:    "赵六",
		Description:    "药品已变质，做销毁处理",
	}

	d1, err := svc.CreateDisposal(disposalReq)
	require.NoError(t, err)

	d2, err := svc.CreateDisposal(disposalReq)
	require.NoError(t, err)

	assert.Equal(t, d1.ID, d2.ID, "重复提交处置结果应返回相同记录")
}

func TestBoundary_TemperatureGap(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, cabinetID, orderID := createTestData(t, svc)

	baseTime := time.Now().Add(-1 * time.Hour)
	rec1 := &model.TemperatureRecord{
		CabinetID:   cabinetID,
		ProbeID:     "PROBE-001",
		Temperature: 5.0,
		RecordTime:  baseTime,
		IsAnomaly:   false,
	}
	err := svc.CreateTemperatureRecord(rec1)
	require.NoError(t, err)

	rec2 := &model.TemperatureRecord{
		CabinetID:   cabinetID,
		ProbeID:     "PROBE-001",
		Temperature: 5.2,
		RecordTime:  baseTime.Add(35 * time.Minute),
		IsAnomaly:   false,
		IsGap:       true,
		GapMinutes:  30,
	}
	err = svc.CreateTemperatureRecord(rec2)
	require.NoError(t, err)

	exceptionNo := fmt.Sprintf("EXC-GAP-%d", time.Now().UnixNano())
	excReq := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempGap,
		Severity:        model.SeverityMedium,
		Description:     "温度记录出现30分钟断点",
		ReporterID:      "user001",
		ReporterName:    "张三",
	}
	exc, err := svc.RegisterException(excReq)
	require.NoError(t, err)
	assert.Equal(t, model.ExceptionTypeTempGap, exc.Type)

	evidenceReq := &service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "screenshot",
		FileName:     "温度断点截图.png",
		FileType:     "image/png",
		FileSize:     102400,
		UploaderID:   "user001",
		UploaderName: "张三",
		Description:  "温度记录系统显示30分钟无数据",
		FilePath:     "/evidence/gap_screenshot.png",
	}
	evidence, err := svc.UploadEvidence(evidenceReq)
	require.NoError(t, err)
	assert.NotNil(t, evidence)

	reviewReq := &service.SubmitReviewRequest{
		ExceptionID:  exc.ID,
		ReviewerID:   "reviewer001",
		ReviewerName: "李四",
		Conclusion:   "温度断点不影响药品质量",
		Opinion:      "经核实，断点期间冷藏箱处于断电保温状态，箱内温度仍在合格范围内，予以通过",
		Status:       model.ReviewStatusApproved,
	}
	review, err := svc.SubmitReview(reviewReq)
	require.NoError(t, err)
	assert.Equal(t, model.ReviewStatusApproved, review.Status)

	updatedExc, err := svc.GetException(exc.ID)
	require.NoError(t, err)
	assert.Equal(t, model.ExceptionStatusConfirmed, updatedExc.Status)
}

func TestBoundary_CrossStoreTransfer(t *testing.T) {
	_, svc := setupTestDB(t)

	storeHQ := &model.Store{Name: "总部中心仓", Address: "总部地址"}
	err := svc.CreateStore(storeHQ)
	require.NoError(t, err)

	storeBranch := &model.Store{Name: "偏远门店C", Address: "偏远地区地址"}
	err = svc.CreateStore(storeBranch)
	require.NoError(t, err)

	batch := &model.DrugBatch{
		DrugName:     "特殊冷藏药品",
		BatchNo:      fmt.Sprintf("BATCH-CROSS-%d", time.Now().UnixNano()),
		Spec:         "100ml",
		Manufacturer: "某生物制药",
		MinTemp:      2.0,
		MaxTemp:      8.0,
		ExpiryDate:   time.Now().AddDate(1, 0, 0),
	}
	err = svc.CreateDrugBatch(batch)
	require.NoError(t, err)

	cabinet := &model.ColdChainCabinet{
		CabinetNo:   "TRANS-CAB-001",
		StoreID:     storeHQ.ID,
		ProbeID:     "PROBE-TRANS-001",
		MinTemp:     2.0,
		MaxTemp:     8.0,
		Status:      "active",
		LastCalibAt: time.Now().AddDate(0, 0, -7),
	}
	err = svc.CreateCabinet(cabinet)
	require.NoError(t, err)

	orderNo := fmt.Sprintf("TRANSFER-CROSS-%d", time.Now().UnixNano())
	order := &model.TransferOrder{
		OrderNo:        orderNo,
		FromStoreID:    storeHQ.ID,
		ToStoreID:      storeBranch.ID,
		DrugBatchID:    batch.ID,
		Quantity:       50,
		CabinetID:      cabinet.ID,
		OutboundTime:   time.Now().Add(-8 * time.Hour),
		ExpectedArrive: time.Now().Add(4 * time.Hour),
		Status:         model.TransferStatusShipped,
	}
	err = svc.CreateTransferOrder(order)
	require.NoError(t, err)

	savedOrder, err := svc.GetTransferOrder(order.ID)
	require.NoError(t, err)
	assert.NotEqual(t, savedOrder.FromStoreID, savedOrder.ToStoreID, "跨店调拨应从不同门店发出和接收")

	exceptionNo := fmt.Sprintf("EXC-CROSS-%d", time.Now().UnixNano())
	excReq := &service.CreateExceptionRequest{
		TransferOrderID: order.ID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeLateArrival,
		Severity:        model.SeverityHigh,
		Description:     "跨店长距离运输，预计超时2小时",
		ReporterID:      "trans001",
		ReporterName:    "运输员",
		FoundTime:       time.Now(),
	}
	exc, err := svc.RegisterException(excReq)
	require.NoError(t, err)

	receivingReview := &model.ReceivingReview{
		TransferOrderID: order.ID,
		ReviewerID:      "branch001",
		ReviewerName:    "门店C收货员",
		ReceiveTime:     time.Now(),
		PackageIntact:   true,
		TempOnArrival:   7.5,
		IsQualified:     true,
		Remark:          "虽超时到达，但温度仍在合格范围内",
	}
	err = svc.CreateReceivingReview(receivingReview)
	require.NoError(t, err)
}

func TestBoundary_ProbeAnomalyAfterReceive(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, cabinetID, orderID := createTestData(t, svc)

	receivingReview := &model.ReceivingReview{
		TransferOrderID: orderID,
		ReviewerID:      "receiver001",
		ReviewerName:    "收货员",
		ReceiveTime:     time.Now(),
		PackageIntact:   true,
		TempOnArrival:   5.0,
		IsQualified:     true,
		Remark:          "收货时一切正常",
	}
	err := svc.CreateReceivingReview(receivingReview)
	require.NoError(t, err)

	for i := 0; i < 10; i++ {
		rec := &model.TemperatureRecord{
			CabinetID:   cabinetID,
			ProbeID:     "PROBE-001",
			Temperature: 5.0 + float64(i)*0.1,
			RecordTime:  time.Now().Add(time.Duration(i) * time.Minute),
			IsAnomaly:   false,
		}
		err = svc.CreateTemperatureRecord(rec)
		require.NoError(t, err)
	}

	abnormalRec := &model.TemperatureRecord{
		CabinetID:    cabinetID,
		ProbeID:      "PROBE-001",
		Temperature:  999.0,
		RecordTime:   time.Now().Add(15 * time.Minute),
		IsAnomaly:    true,
		ProbeAnomaly: true,
	}
	err = svc.CreateTemperatureRecord(abnormalRec)
	require.NoError(t, err)

	exceptionNo := fmt.Sprintf("EXC-PROBE-%d", time.Now().UnixNano())
	excReq := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeProbeFault,
		Severity:        model.SeverityMedium,
		Description:     "收货后发现温度探头读数异常（999度）",
		ReporterID:      "qa001",
		ReporterName:    "QA人员",
		FoundTime:       time.Now(),
	}
	exc, err := svc.RegisterException(excReq)
	require.NoError(t, err)

	evidenceReq1 := &service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "photo",
		FileName:     "探头异常照片.jpg",
		FileType:     "image/jpeg",
		FileSize:     204800,
		UploaderID:   "qa001",
		UploaderName: "QA人员",
		Description:  "温度探头显示999度异常值",
		FilePath:     "/evidence/probe_anomaly.jpg",
	}
	_, err = svc.UploadEvidence(evidenceReq1)
	require.NoError(t, err)

	evidenceReq2 := &service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "document",
		FileName:     "探头校准记录.pdf",
		FileType:     "application/pdf",
		FileSize:     512000,
		UploaderID:   "qa001",
		UploaderName: "QA人员",
		Description:  "探头上次校准记录，证明探头已过期未校准",
		FilePath:     "/evidence/calibration.pdf",
	}
	_, err = svc.UploadEvidence(evidenceReq2)
	require.NoError(t, err)

	reviewReq := &service.SubmitReviewRequest{
		ExceptionID:  exc.ID,
		ReviewerID:   "manager001",
		ReviewerName: "质量经理",
		Conclusion:   "探头异常，收货前数据可信",
		Opinion:      "经核实，收货时人工测量温度正常（5度），探头异常发生在收货后，不影响本批次药品质量。建议立即更换探头并安排校准。",
		Status:       model.ReviewStatusApproved,
	}
	review, err := svc.SubmitReview(reviewReq)
	require.NoError(t, err)

	disposalReq := &service.CreateDisposalRequest{
		ExceptionID:    exc.ID,
		ReviewRecordID: review.ID,
		DisposalType:   "继续使用",
		HandlerID:      "warehouse001",
		HandlerName:    "仓库管理员",
		Description:    "药品质量无影响，继续使用；已更换新探头并安排校准",
	}
	disposal, err := svc.CreateDisposal(disposalReq)
	require.NoError(t, err)
	assert.Equal(t, "继续使用", disposal.DisposalType)
}

func TestRevertReview_FullFlow(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, _, orderID := createTestData(t, svc)

	exceptionNo := fmt.Sprintf("EXC-REVERT-%d", time.Now().UnixNano())
	excReq := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempBreak,
		Severity:        model.SeverityHigh,
		Description:     "运输途中温度超标",
		ReporterID:      "user001",
		ReporterName:    "张三",
	}
	exc, err := svc.RegisterException(excReq)
	require.NoError(t, err)

	reviewReq := &service.SubmitReviewRequest{
		ExceptionID:  exc.ID,
		ReviewerID:   "reviewer001",
		ReviewerName: "初审员",
		Conclusion:   "温度超标，药品报废",
		Opinion:      "温度达到15度，持续2小时，药品已变质，做报废处理",
		Status:       model.ReviewStatusRejected,
	}
	review, err := svc.SubmitReview(reviewReq)
	require.NoError(t, err)
	assert.Equal(t, model.ReviewStatusRejected, review.Status)

	revertReq := &service.RevertReviewRequest{
		ReviewRecordID: review.ID,
		OperatorID:     "director001",
		OperatorName:   "质量总监",
		NewStatus:      model.ReviewStatusReverted,
		NewOpinion:     "经复查，温度超标时间较短，药品稳定性数据支持仍可使用",
		NewConclusion:  "改判为合格，继续使用",
		Reason:         "新证据显示该批次药品在30度下可稳定48小时，本次超标仅2小时，风险可控",
	}
	revertLog, err := svc.RevertReview(revertReq)
	require.NoError(t, err)

	assert.Equal(t, model.ReviewStatusRejected, revertLog.BeforeStatus)
	assert.Equal(t, model.ReviewStatusReverted, revertLog.AfterStatus)
	assert.Contains(t, revertLog.Reason, "新证据")

	updatedReview, err := svc.GetReview(review.ID)
	require.NoError(t, err)
	assert.Equal(t, model.ReviewStatusReverted, updatedReview.Status)
	assert.Contains(t, updatedReview.Opinion, "仍可使用")

	updatedExc, err := svc.GetException(exc.ID)
	require.NoError(t, err)
	assert.Equal(t, model.ExceptionStatusReverted, updatedExc.Status)

	reviewLogs, err := svc.GetRevertLogs(review.ID)
	require.NoError(t, err)
	assert.Len(t, reviewLogs, 1)
	assert.Equal(t, "质量总监", reviewLogs[0].OperatorName)
}

func TestExportReview_FullData(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, cabinetID, orderID := createTestData(t, svc)

	for i := 0; i < 5; i++ {
		rec := &model.TemperatureRecord{
			CabinetID:   cabinetID,
			ProbeID:     "PROBE-001",
			Temperature: 4.5 + float64(i)*0.5,
			RecordTime:  time.Now().Add(-time.Duration(5-i) * time.Hour),
			IsAnomaly:   i == 4,
		}
		err := svc.CreateTemperatureRecord(rec)
		require.NoError(t, err)
	}

	receivingReview := &model.ReceivingReview{
		TransferOrderID: orderID,
		ReviewerID:      "receiver001",
		ReviewerName:    "收货员",
		ReceiveTime:     time.Now(),
		PackageIntact:   true,
		TempOnArrival:   6.5,
		IsQualified:     false,
		Remark:          "到达时温度偏高",
	}
	err := svc.CreateReceivingReview(receivingReview)
	require.NoError(t, err)

	exceptionNo := fmt.Sprintf("EXC-EXPORT-%d", time.Now().UnixNano())
	excReq := &service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempBreak,
		Severity:        model.SeverityMedium,
		Description:     "温度记录显示有超标",
		ReporterID:      "qa001",
		ReporterName:    "QA",
	}
	exc, err := svc.RegisterException(excReq)
	require.NoError(t, err)

	evidenceReq := &service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "photo",
		FileName:     "温度曲线截图.png",
		FileType:     "image/png",
		FileSize:     150000,
		UploaderID:   "qa001",
		UploaderName: "QA",
		Description:  "温度超标时段截图",
		FilePath:     "/evidence/temp_graph.png",
	}
	_, err = svc.UploadEvidence(evidenceReq)
	require.NoError(t, err)

	reviewReq := &service.SubmitReviewRequest{
		ExceptionID:  exc.ID,
		ReviewerID:   "reviewer001",
		ReviewerName: "复核员",
		Conclusion:   "轻微超标，影响有限",
		Opinion:      "超标时间较短，药品质量可控，予以放行",
		Status:       model.ReviewStatusApproved,
	}
	review, err := svc.SubmitReview(reviewReq)
	require.NoError(t, err)

	disposalReq := &service.CreateDisposalRequest{
		ExceptionID:    exc.ID,
		ReviewRecordID: review.ID,
		DisposalType:   "放行使用",
		HandlerID:      "warehouse001",
		HandlerName:    "仓管",
		Description:    "按复核意见正常使用",
	}
	_, err = svc.CreateDisposal(disposalReq)
	require.NoError(t, err)

	export, err := svc.ExportReview(orderID, "admin")
	require.NoError(t, err)

	assert.NotNil(t, export.TransferOrder)
	assert.NotNil(t, export.DrugBatch)
	assert.NotNil(t, export.FromStore)
	assert.NotNil(t, export.ToStore)
	assert.NotNil(t, export.Cabinet)
	assert.Len(t, export.TemperatureRecords, 5)
	assert.NotNil(t, export.ReceivingReview)
	assert.NotNil(t, export.ExceptionRecord)
	assert.Len(t, export.Evidences, 1)
	assert.Len(t, export.ReviewRecords, 1)
	assert.NotNil(t, export.DisposalResult)
	assert.Equal(t, "admin", export.ExportedBy)
	assert.NotEmpty(t, export.ExportNo)

	jsonStr, err := svc.ExportReviewToJSON(orderID, "admin")
	require.NoError(t, err)
	assert.Contains(t, jsonStr, "胰岛素注射液")
	assert.Contains(t, jsonStr, "放行使用")
}

func TestFullWorkflow_Traceability(t *testing.T) {
	_, svc := setupTestDB(t)
	_, _, _, cabinetID, orderID := createTestData(t, svc)

	baseTime := time.Now().Add(-3 * time.Hour)
	for i := 0; i < 20; i++ {
		temp := 5.0
		if i > 10 && i < 15 {
			temp = 12.0
		}
		rec := &model.TemperatureRecord{
			CabinetID:   cabinetID,
			ProbeID:     "PROBE-001",
			Temperature: temp,
			RecordTime:  baseTime.Add(time.Duration(i*10) * time.Minute),
			IsAnomaly:   temp > 8.0,
		}
		err := svc.CreateTemperatureRecord(rec)
		require.NoError(t, err)
	}

	exceptionNo := fmt.Sprintf("EXC-FULL-%d", time.Now().UnixNano())
	exc, err := svc.RegisterException(&service.CreateExceptionRequest{
		TransferOrderID: orderID,
		ExceptionNo:     exceptionNo,
		Type:            model.ExceptionTypeTempBreak,
		Severity:        model.SeverityHigh,
		Description:     "温度曲线显示有50分钟超标，温度达到12度",
		ReporterID:      "receiver001",
		ReporterName:    "收货员小王",
		FoundTime:       time.Now(),
	})
	require.NoError(t, err)
	require.NotNil(t, exc)

	_, err = svc.UploadEvidence(&service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "image",
		FileName:     "温度记录仪截图.jpg",
		FileType:     "image/jpeg",
		FileSize:     250000,
		UploaderID:   "receiver001",
		UploaderName: "收货员小王",
		Description:  "现场拍摄的温度记录仪截图",
		FilePath:     "/evidence/20240101_temp_log.jpg",
	})
	require.NoError(t, err)

	_, err = svc.UploadEvidence(&service.UploadEvidenceRequest{
		ExceptionID:  exc.ID,
		Type:         "video",
		FileName:     "开箱视频.mp4",
		FileType:     "video/mp4",
		FileSize:     5242880,
		UploaderID:   "receiver001",
		UploaderName: "收货员小王",
		Description:  "收货开箱全程录像",
		FilePath:     "/evidence/20240101_unbox.mp4",
	})
	require.NoError(t, err)

	review, err := svc.SubmitReview(&service.SubmitReviewRequest{
		ExceptionID:  exc.ID,
		ReviewerID:   "reviewer001",
		ReviewerName: "复核员小李",
		Conclusion:   "温度超标时间较长，存在质量风险",
		Opinion:      "经查看温度曲线，超标时间达50分钟，最高温度12度，建议销毁处理",
		Status:       model.ReviewStatusRejected,
	})
	require.NoError(t, err)

	revertLog, err := svc.RevertReview(&service.RevertReviewRequest{
		ReviewRecordID: review.ID,
		OperatorID:     "manager001",
		OperatorName:   "质量总监老张",
		NewStatus:      model.ReviewStatusReverted,
		NewOpinion:     "经查阅该药品稳定性试验数据，在15度下可保存72小时，本次超标影响有限，改判为合格",
		NewConclusion:  "改判：药品质量合格，可继续使用",
		Reason:         "补充了药品稳定性研究数据作为新证据，经专家委员会讨论决定改判",
	})
	require.NoError(t, err)
	require.NotNil(t, revertLog)

	disposal, err := svc.CreateDisposal(&service.CreateDisposalRequest{
		ExceptionID:    exc.ID,
		ReviewRecordID: review.ID,
		DisposalType:   "正常使用",
		HandlerID:      "warehouse001",
		HandlerName:    "仓库管理员小陈",
		Description:    "按改判意见，药品正常入库使用，已记录温度超标情况",
	})
	require.NoError(t, err)
	require.NotNil(t, disposal)

	export, err := svc.ExportReview(orderID, "system")
	require.NoError(t, err)

	require.Equal(t, 1, len(export.ReviewRecords))
	require.Equal(t, 1, len(export.RevertLogs))
	require.Equal(t, 2, len(export.Evidences))
	require.Equal(t, model.ReviewStatusReverted, export.ReviewRecords[0].Status)

	t.Logf("完整可复查链路验证通过:")
	t.Logf("  调拨单: %s", export.TransferOrder.OrderNo)
	t.Logf("  异常编号: %s", export.ExceptionRecord.ExceptionNo)
	t.Logf("  证据数量: %d", len(export.Evidences))
	t.Logf("  复核记录: %d 条", len(export.ReviewRecords))
	t.Logf("  改判记录: %d 条", len(export.RevertLogs))
	t.Logf("  最终处置: %s", export.DisposalResult.DisposalType)
	t.Logf("  导出编号: %s", export.ExportNo)
}

func TestSQLDirectAccess(t *testing.T) {
	db, _ := setupTestDB(t)

	result, err := db.DB.Exec(`INSERT INTO stores (id, name, address) VALUES (?, ?, ?)`,
		"test-store-001", "测试门店", "测试地址")
	require.NoError(t, err)

	rowsAffected, err := result.RowsAffected()
	require.NoError(t, err)
	assert.Equal(t, int64(1), rowsAffected)

	var name string
	err = db.DB.QueryRow(`SELECT name FROM stores WHERE id = ?`, "test-store-001").Scan(&name)
	require.NoError(t, err)
	assert.Equal(t, "测试门店", name)

	_, err = db.DB.Exec(`INSERT INTO drug_batches (id, drug_name, batch_no, min_temp, max_temp) VALUES (?, ?, ?, ?, ?)`,
		"test-batch-001", "测试药", "TEST001", 2.0, 8.0)
	require.NoError(t, err)

	var count int
	err = db.DB.QueryRow(`SELECT COUNT(*) FROM drug_batches`).Scan(&count)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, count, 1)
}
