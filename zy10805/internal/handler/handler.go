package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"cold-chain-review/internal/model"
	"cold-chain-review/internal/service"
)

type Handler struct {
	service *service.ColdChainService
}

func NewHandler(svc *service.ColdChainService) *Handler {
	return &Handler{service: svc}
}

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func (h *Handler) RegisterException(c *gin.Context) {
	var req service.CreateExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	exception, err := h.service.RegisterException(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    exception,
	})
}

func (h *Handler) UploadEvidence(c *gin.Context) {
	var req service.UploadEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	evidence, err := h.service.UploadEvidence(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    evidence,
	})
}

func (h *Handler) SubmitReview(c *gin.Context) {
	var req service.SubmitReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	review, err := h.service.SubmitReview(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    review,
	})
}

func (h *Handler) RevertReview(c *gin.Context) {
	var req service.RevertReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	revertLog, err := h.service.RevertReview(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    revertLog,
	})
}

func (h *Handler) CreateDisposal(c *gin.Context) {
	var req service.CreateDisposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	disposal, err := h.service.CreateDisposal(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    disposal,
	})
}

func (h *Handler) ExportReview(c *gin.Context) {
	transferOrderID := c.Param("id")
	exportedBy := c.Query("exported_by")
	if exportedBy == "" {
		exportedBy = "system"
	}

	exportData, err := h.service.ExportReview(transferOrderID, exportedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    exportData,
	})
}

func (h *Handler) ExportReviewJSON(c *gin.Context) {
	transferOrderID := c.Param("id")
	exportedBy := c.Query("exported_by")
	if exportedBy == "" {
		exportedBy = "system"
	}

	jsonData, err := h.service.ExportReviewToJSON(transferOrderID, exportedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=review_export_"+transferOrderID+".json")
	c.String(http.StatusOK, jsonData)
}

func (h *Handler) GetException(c *gin.Context) {
	id := c.Param("id")
	exception, err := h.service.GetException(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}
	if exception == nil {
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: "exception not found",
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    exception,
	})
}

func (h *Handler) GetEvidences(c *gin.Context) {
	exceptionID := c.Param("id")
	evidences, err := h.service.GetEvidences(exceptionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    evidences,
	})
}

func (h *Handler) GetReview(c *gin.Context) {
	id := c.Param("id")
	review, err := h.service.GetReview(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}
	if review == nil {
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: "review not found",
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    review,
	})
}

func (h *Handler) GetRevertLogs(c *gin.Context) {
	reviewID := c.Param("id")
	logs, err := h.service.GetRevertLogs(reviewID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    logs,
	})
}

func (h *Handler) GetTransferOrder(c *gin.Context) {
	id := c.Param("id")
	order, err := h.service.GetTransferOrder(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, Response{
			Code:    404,
			Message: "transfer order not found",
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    order,
	})
}

func (h *Handler) CreateStore(c *gin.Context) {
	var store model.Store
	if err := c.ShouldBindJSON(&store); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateStore(&store)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    store,
	})
}

func (h *Handler) CreateDrugBatch(c *gin.Context) {
	var batch model.DrugBatch
	if err := c.ShouldBindJSON(&batch); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateDrugBatch(&batch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    batch,
	})
}

func (h *Handler) CreateCabinet(c *gin.Context) {
	var cabinet model.ColdChainCabinet
	if err := c.ShouldBindJSON(&cabinet); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateCabinet(&cabinet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    cabinet,
	})
}

func (h *Handler) CreateTransferOrder(c *gin.Context) {
	var order model.TransferOrder
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateTransferOrder(&order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    order,
	})
}

func (h *Handler) CreateTemperatureRecord(c *gin.Context) {
	var rec model.TemperatureRecord
	if err := c.ShouldBindJSON(&rec); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateTemperatureRecord(&rec)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    rec,
	})
}

func (h *Handler) CreateReceivingReview(c *gin.Context) {
	var review model.ReceivingReview
	if err := c.ShouldBindJSON(&review); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request: " + err.Error(),
		})
		return
	}

	err := h.service.CreateReceivingReview(&review)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    review,
	})
}

func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "ok",
		Data: gin.H{
			"status": "running",
		},
	})
}
