package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"store-prepaid-audit/api/dto"
	"store-prepaid-audit/service"
)

type AuditHandler struct {
	batchService *service.BatchService
}

func NewAuditHandler(batchService *service.BatchService) *AuditHandler {
	return &AuditHandler{batchService: batchService}
}

func (h *AuditHandler) ListAuditLogs(c *gin.Context) {
	var req dto.AuditLogListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var batchID *uuid.UUID
	if req.BatchID != "" {
		id, err := uuid.Parse(req.BatchID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch id"})
			return
		}
		batchID = &id
	}

	logs, total, err := h.batchService.ListAuditLogs(batchID, req.Action, req.ResourceType, req.Page, req.PageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	items := make([]dto.AuditLogResponse, len(logs))
	for i, l := range logs {
		items[i] = dto.AuditLogResponse{
			ID:           l.ID,
			Action:       l.Action,
			ResourceType: l.ResourceType,
			ResourceID:   l.ResourceID,
			OperatorID:   l.OperatorID,
			OperatorName: l.OperatorName,
			IPAddress:    l.IPAddress,
			BeforeData:   l.BeforeData,
			AfterData:    l.AfterData,
			Remark:       l.Remark,
			CreatedAt:    l.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, dto.AuditLogListResponse{
		Total: total,
		Page:  req.Page,
		Size:  req.PageSize,
		Items: items,
	})
}
