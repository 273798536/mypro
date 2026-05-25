package handlers

import (
	"fmt"
	"net/http"

	"bank-schedule-retry/internal/models"
	"bank-schedule-retry/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TaskHandler struct {
	retryQueueService  *services.RetryQueueService
	historyService     *services.HistoryService
	statisticsService  *services.StatisticsService
	exportService      *services.ExportService
}

func NewTaskHandler() *TaskHandler {
	return &TaskHandler{
		retryQueueService: services.NewRetryQueueService(),
		historyService:    services.NewHistoryService(),
		statisticsService: services.NewStatisticsService(),
		exportService:     services.NewExportService(),
	}
}

type SubmitTaskRequest struct {
	BranchID     string                           `json:"branch_id" binding:"required"`
	BatchNo      string                           `json:"batch_no" binding:"required"`
	TaskType     string                           `json:"task_type" binding:"required"`
	Priority     int                              `json:"priority"`
	DataStrategy string                           `json:"data_strategy"`
	Schedules    []models.TellerSchedule          `json:"schedules"`
	Leaves       []models.LeaveRequest            `json:"leaves"`
	Forecasts    []models.BusinessVolumeForecast  `json:"forecasts"`
	Scans        []models.ScanDetail              `json:"scans"`
	Trainings    []models.TempTraining            `json:"trainings"`
	OperatorID   string                           `json:"operator_id" binding:"required"`
	OperatorName string                           `json:"operator_name"`
}

func (h *TaskHandler) SubmitTask(c *gin.Context) {
	var req SubmitTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	branchID, err := uuid.Parse(req.BranchID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的支行ID"})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)

	taskReq := services.SubmitTaskRequest{
		BranchID:     branchID,
		BatchNo:      req.BatchNo,
		TaskType:     req.TaskType,
		Priority:     req.Priority,
		DataStrategy: req.DataStrategy,
		Schedules:    req.Schedules,
		Leaves:       req.Leaves,
		Forecasts:    req.Forecasts,
		Scans:        req.Scans,
		Trainings:    req.Trainings,
		Operator: services.OperatorInfo{
			OperatorID:   operatorID,
			OperatorName: req.OperatorName,
			IPAddress:    c.ClientIP(),
			UserAgent:    c.GetHeader("User-Agent"),
		},
	}

	task, err := h.retryQueueService.SubmitTask(taskReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"task_id":   task.ID,
		"batch_no":  task.BatchNo,
		"status":    task.Status,
		"message":   "任务提交成功",
	})
}

func (h *TaskHandler) QueueTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.QueueTask(taskID, operator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务已加入队列"})
}

func (h *TaskHandler) ProcessTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	result, err := h.retryQueueService.ProcessTask(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *TaskHandler) ManualTakeover(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
		Reason       string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.ManualTakeover(taskID, operator, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "人工接管成功"})
}

func (h *TaskHandler) CompensateTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
		Comment      string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.CompensateTask(taskID, operator, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "补偿入账成功"})
}

func (h *TaskHandler) CloseTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
		Remark       string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.CloseTask(taskID, operator, req.Remark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务关闭成功"})
}

func (h *TaskHandler) FreezeTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
		Reason       string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.FreezeTask(taskID, operator, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务冻结成功"})
}

func (h *TaskHandler) UnfreezeTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.UnfreezeTask(taskID, operator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务解冻成功"})
}

func (h *TaskHandler) WithdrawTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
		Reason       string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.WithdrawTask(taskID, operator, req.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务撤回成功"})
}

func (h *TaskHandler) ResubmitTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	if err := h.retryQueueService.ResubmitTask(taskID, operator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务重新提交成功"})
}

func (h *TaskHandler) GetTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	task, err := h.retryQueueService.GetTask(taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	items, _ := h.retryQueueService.GetTaskItems(taskID)

	c.JSON(http.StatusOK, gin.H{
		"task":   task,
		"items":  items,
	})
}

func (h *TaskHandler) ListTasks(c *gin.Context) {
	branchIDStr := c.Query("branch_id")
	status := c.Query("status")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		fmt.Sscanf(p, "%d", &page)
	}
	if ps := c.Query("page_size"); ps != "" {
		fmt.Sscanf(ps, "%d", &pageSize)
	}

	var branchID uuid.UUID
	if branchIDStr != "" {
		branchID, _ = uuid.Parse(branchIDStr)
	}

	tasks, total, err := h.retryQueueService.ListTasks(branchID, status, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"total": total,
		"page":  page,
		"page_size": pageSize,
	})
}

func (h *TaskHandler) GetTaskHistory(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	histories, err := h.historyService.GetTaskHistory(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"histories": histories})
}

func (h *TaskHandler) CompareHistory(c *gin.Context) {
	historyID1, err := uuid.Parse(c.Query("history_id1"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的历史记录ID1"})
		return
	}
	historyID2, err := uuid.Parse(c.Query("history_id2"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的历史记录ID2"})
		return
	}

	diff, err := h.historyService.CompareHistory(historyID1, historyID2)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"diff": diff})
}

func (h *TaskHandler) GetManagerDashboard(c *gin.Context) {
	branchIDStr := c.Query("branch_id")
	if branchIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少支行ID"})
		return
	}

	branchID, err := uuid.Parse(branchIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的支行ID"})
		return
	}

	dashboard, err := h.statisticsService.GetManagerDashboard(branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dashboard)
}

func (h *TaskHandler) CheckConsistency(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	result, err := h.statisticsService.CheckConsistency(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *TaskHandler) ExportTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var req struct {
		ExportType   string `json:"export_type" binding:"required"`
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	exportReq := services.ExportRequest{
		TaskID:     taskID,
		ExportType: req.ExportType,
		Operator:   operator,
	}

	filePath, err := h.exportService.ExportTask(exportReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file_path": filePath,
		"message":   "导出成功",
	})
}

func (h *TaskHandler) ListDeadLetters(c *gin.Context) {
	branchIDStr := c.Query("branch_id")
	if branchIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少支行ID"})
		return
	}

	branchID, err := uuid.Parse(branchIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的支行ID"})
		return
	}

	page := 1
	pageSize := 20
	if p := c.Query("page"); p != "" {
		fmt.Sscanf(p, "%d", &page)
	}
	if ps := c.Query("page_size"); ps != "" {
		fmt.Sscanf(ps, "%d", &pageSize)
	}

	var resolved *bool
	if r := c.Query("resolved"); r != "" {
		res := r == "true"
		resolved = &res
	}

	deadLetters, total, err := h.statisticsService.ListDeadLetters(branchID, resolved, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"dead_letters": deadLetters,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}

func (h *TaskHandler) RestoreDeadLetter(c *gin.Context) {
	deadLetterID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的死信ID"})
		return
	}

	var req struct {
		OperatorID   string `json:"operator_id" binding:"required"`
		OperatorName string `json:"operator_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	operatorID, _ := uuid.Parse(req.OperatorID)
	operator := services.OperatorInfo{
		OperatorID:   operatorID,
		OperatorName: req.OperatorName,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	task, err := h.statisticsService.RestoreDeadLetter(deadLetterID, operator)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if task == nil {
		c.JSON(http.StatusOK, gin.H{"message": "死信已处理，无需恢复"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"task_id": task.ID,
		"message": "死信恢复成功，任务已重新加入待处理队列",
	})
}
