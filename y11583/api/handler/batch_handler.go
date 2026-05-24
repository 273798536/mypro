package handler

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"store-prepaid-audit/api/dto"
	"store-prepaid-audit/models"
	"store-prepaid-audit/service"
)

type BatchHandler struct {
	batchService     *service.BatchService
	reconcileService  *service.ReconcileService
	exportService     *service.ExportService
	dataGenService    *service.DataGenService
}

func NewBatchHandler(
	batchService *service.BatchService,
	reconcileService *service.ReconcileService,
	exportService *service.ExportService,
	dataGenService *service.DataGenService,
) *BatchHandler {
	return &BatchHandler{
		batchService:    batchService,
		reconcileService: reconcileService,
		exportService:    exportService,
		dataGenService:   dataGenService,
	}
}

func (h *BatchHandler) getOperatorContext(c *gin.Context) service.OperatorContext {
	return service.OperatorContext{
		OperatorID:   c.GetHeader("X-Operator-ID"),
		OperatorName: c.GetHeader("X-Operator-Name"),
		IPAddress:    c.ClientIP(),
		UserAgent:    c.Request.UserAgent(),
	}
}

func (h *BatchHandler) CreateBatch(c *gin.Context) {
	var req dto.CreateBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	opCtx := h.getOperatorContext(c)
	if opCtx.OperatorID == "" {
		opCtx.OperatorID = "DEFAULT_OP"
		opCtx.OperatorName = "默认操作员"
	}

	batch, err := h.batchService.CreateBatch(req.StoreID, req.StoreName, opCtx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.CreateBatchResponse{
		ID:      batch.ID,
		BatchNo: batch.BatchNo,
		Status:  string(batch.Status),
	})
}

func (h *BatchHandler) GetBatch(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	batch, err := h.batchService.GetBatch(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, h.toBatchResponse(batch))
}

func (h *BatchHandler) ListBatches(c *gin.Context) {
	var req dto.BatchListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	batches, total, err := h.batchService.ListBatches(
		req.StoreID,
		models.BatchStatus(req.Status),
		req.Page,
		req.PageSize,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	items := make([]dto.BatchResponse, len(batches))
	for i, b := range batches {
		items[i] = h.toBatchResponse(&b)
	}

	c.JSON(http.StatusOK, dto.BatchListResponse{
		Total: total,
		Page:  req.Page,
		Size:  req.PageSize,
		Items: items,
	})
}

func (h *BatchHandler) SubmitBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.SubmitBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) RecallBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.RecallBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) StartReview(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.StartReview(id, reason, opCtx)
	})
}

func (h *BatchHandler) ApproveBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.ApproveBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) RejectBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.RejectBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) PartialPass(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.PartialPass(id, reason, opCtx)
	})
}

func (h *BatchHandler) FreezeBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.FreezeBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) CancelBatch(c *gin.Context) {
	h.changeStatus(c, func(id uuid.UUID, reason string, opCtx service.OperatorContext) error {
		return h.batchService.CancelBatch(id, reason, opCtx)
	})
}

func (h *BatchHandler) changeStatus(c *gin.Context, fn func(uuid.UUID, string, service.OperatorContext) error) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	var req dto.StatusChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	opCtx := h.getOperatorContext(c)
	if opCtx.OperatorID == "" {
		opCtx.OperatorID = "DEFAULT_OP"
		opCtx.OperatorName = "默认操作员"
	}

	if err := fn(id, req.Reason, opCtx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}

func (h *BatchHandler) AddRecords(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	var req dto.AddRecordsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	opCtx := h.getOperatorContext(c)
	strategy := models.DuplicateStrategy(req.Strategy)

	addedRecharges := 0
	addedRefunds := 0
	addedHandovers := 0

	if len(req.RechargeRecords) > 0 {
		addedRecharges, err = h.batchService.AddRechargeRecords(id, req.RechargeRecords, strategy, opCtx)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if len(req.RefundRecords) > 0 {
		addedRefunds, err = h.batchService.AddRefundApplications(id, req.RefundRecords, strategy, opCtx)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if len(req.HandoverRecords) > 0 {
		addedHandovers, err = h.batchService.AddHandoverRecords(id, req.HandoverRecords, strategy, opCtx)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, dto.AddRecordsResponse{
		AddedRecharges: addedRecharges,
		AddedRefunds:   addedRefunds,
		AddedHandovers: addedHandovers,
	})
}

func (h *BatchHandler) GenerateData(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	batch, err := h.batchService.GetBatch(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	var req dto.GenerateDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	opCtx := h.getOperatorContext(c)

	recharges := h.dataGenService.GenerateRechargeRecords(id, batch.StoreID, batch.StoreName, req.RechargeCount, req.IncludeErrors)
	refunds := h.dataGenService.GenerateRefundApplications(id, batch.StoreID, batch.StoreName, req.RefundCount)
	handovers := h.dataGenService.GenerateHandoverRecords(id, batch.StoreID, batch.StoreName, req.HandoverCount)

	addedRecharges := 0
	addedRefunds := 0
	addedHandovers := 0

	if len(recharges) > 0 {
		addedRecharges, err = h.batchService.AddRechargeRecords(id, recharges, models.DuplicateStrategyIgnore, opCtx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if len(refunds) > 0 {
		addedRefunds, err = h.batchService.AddRefundApplications(id, refunds, models.DuplicateStrategyIgnore, opCtx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if len(handovers) > 0 {
		addedHandovers, err = h.batchService.AddHandoverRecords(id, handovers, models.DuplicateStrategyIgnore, opCtx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, dto.GenerateDataResponse{
		GeneratedRecharges: addedRecharges,
		GeneratedRefunds:   addedRefunds,
		GeneratedHandovers: addedHandovers,
	})
}

func (h *BatchHandler) Reconcile(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	opCtx := h.getOperatorContext(c)

	result, err := h.reconcileService.ReconcileBatch(id, opCtx)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ReconcileResponse{
		TotalRecords:      result.TotalRecords,
		MatchedRecords:    result.MatchedRecords,
		MismatchedRecords: result.MismatchedRecords,
		CrossStoreCount:   result.CrossStoreCount,
		CancelledCount:    result.CancelledCount,
		GapsFound:         result.GapsFound,
	})
}

func (h *BatchHandler) ExportBatch(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	opCtx := h.getOperatorContext(c)

	filePath, err := h.exportService.ExportBatch(id, opCtx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.batchService.MarkExported(id, "导出完成", opCtx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	fileName := filepath.Base(filePath)

	c.JSON(http.StatusOK, dto.ExportResponse{
		FilePath: filePath,
		FileName: fileName,
	})
}

func (h *BatchHandler) GetBalanceHistory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	histories, err := h.reconcileService.GetBalanceHistory(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, histories)
}

func (h *BatchHandler) GetReconciliationResults(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
		return
	}

	results, err := h.reconcileService.GetReconciliationResults(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]dto.ReconciliationResultResponse, len(results))
	for i, r := range results {
		response[i] = dto.ReconciliationResultResponse{
			MemberID:          r.MemberID,
			TransNo:           r.TransNo,
			MatchStatus:       r.MatchStatus,
			ExpectedBalance:   r.ExpectedBalance,
			ActualBalance:     r.ActualBalance,
			Difference:        r.Difference,
			CrossStoreCheck:   r.CrossStoreCheck,
			CancelCheck:       r.CancelCheck,
			HistoryContinuous: r.HistoryContinuous,
			Remark:            r.Remark,
		}
	}

	c.JSON(http.StatusOK, response)
}

func (h *BatchHandler) PlaybackTransactions(c *gin.Context) {
	var req dto.PlaybackRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	records, finalBalance, err := h.reconcileService.PlaybackTransactions(req.MemberID, req.StartTime, req.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.PlaybackResponse{
		Records:      records,
		FinalBalance: finalBalance,
	})
}

func (h *BatchHandler) toBatchResponse(batch *models.Batch) dto.BatchResponse {
	return dto.BatchResponse{
		ID:                batch.ID,
		BatchNo:           batch.BatchNo,
		StoreID:           batch.StoreID,
		StoreName:         batch.StoreName,
		OperatorID:        batch.OperatorID,
		OperatorName:      batch.OperatorName,
		Status:            string(batch.Status),
		TotalAmount:       batch.TotalAmount,
		TotalRecords:      batch.TotalRecords,
		MatchedRecords:    batch.MatchedRecords,
		MismatchedRecords: batch.MismatchedRecords,
		Remark:            batch.Remark,
		Version:           batch.Version,
		CreatedAt:         batch.CreatedAt,
		UpdatedAt:         batch.UpdatedAt,
	}
}
