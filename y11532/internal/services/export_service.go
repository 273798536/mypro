package services

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/models"

	"github.com/google/uuid"
)

type ExportService struct {
	historyService *HistoryService
}

func NewExportService() *ExportService {
	return &ExportService{
		historyService: NewHistoryService(),
	}
}

type ExportRequest struct {
	TaskID     uuid.UUID
	ExportType string
	Operator   OperatorInfo
}

type ExportData struct {
	Task       *models.RetryTask
	Items      []models.RetryTaskItem
	Schedules  []models.TellerSchedule
	Leaves     []models.LeaveRequest
	Forecasts  []models.BusinessVolumeForecast
	Scans      []models.ScanDetail
	Histories  []models.OperationHistory
	ExportTime time.Time
}

func (s *ExportService) ExportTask(req ExportRequest) (string, error) {
	var task models.RetryTask
	if err := database.DB.First(&task, req.TaskID).Error; err != nil {
		return "", err
	}

	if task.Status != models.TaskStatusSuccess &&
		task.Status != models.TaskStatusCompensated &&
		task.Status != models.TaskStatusClosed &&
		task.Status != models.TaskStatusFrozen {
		return "", fmt.Errorf("只有成功、补偿、已关闭或已冻结的任务才能导出")
	}

	exportData := &ExportData{
		Task:       &task,
		ExportTime: time.Now(),
	}

	database.DB.Where("task_id = ?", req.TaskID).Find(&exportData.Items)
	database.DB.Where("batch_no = ?", task.BatchNo).Find(&exportData.Schedules)
	database.DB.Where("batch_no = ?", task.BatchNo).Find(&exportData.Leaves)
	database.DB.Where("batch_no = ?", task.BatchNo).Find(&exportData.Forecasts)
	database.DB.Where("batch_no = ?", task.BatchNo).Find(&exportData.Scans)
	database.DB.Where("task_id = ?", req.TaskID).Order("operation_time ASC").Find(&exportData.Histories)

	fileName := fmt.Sprintf("export_%s_%s_%s.csv",
		task.BatchNo,
		req.ExportType,
		time.Now().Format("20060102_150405"))

	filePath := filepath.Join("exports", fileName)
	os.MkdirAll("exports", 0755)

	var fileHash string
	switch req.ExportType {
	case "summary":
		fileHash, _ = s.exportSummary(filePath, exportData)
	case "details":
		fileHash, _ = s.exportDetails(filePath, exportData)
	case "history":
		fileHash, _ = s.exportHistory(filePath, exportData)
	case "full":
		fileHash, _ = s.exportFull(filePath, exportData)
	default:
		return "", fmt.Errorf("不支持的导出类型: %s", req.ExportType)
	}

	record := &models.ExportRecord{
		TaskID:       req.TaskID,
		ExportType:   req.ExportType,
		ExportedBy:   req.Operator.OperatorID,
		ExportedAt:   time.Now(),
		FileName:     fileName,
		FileHash:     fileHash,
		RecordCount:  len(exportData.Items),
		Status:       "completed",
	}

	snapshot, _ := json.Marshal(exportData)
	record.DataSnapshot = string(snapshot)
	database.DB.Create(record)

	s.historyService.RecordOperation(
		req.TaskID, uuid.Nil, models.OpTypeExport,
		string(task.Status), string(task.Status),
		nil, nil,
		fmt.Sprintf("导出文件: %s，类型: %s", fileName, req.ExportType),
		req.Operator,
	)

	return filePath, nil
}

func (s *ExportService) exportSummary(filePath string, data *ExportData) (string, error) {
	file, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	writer.Write([]string{"批次号", "任务类型", "状态", "提交时间", "总记录数",
		"成功数", "失败数", "重试次数", "冲突类型", "数据策略"})

	writer.Write([]string{
		data.Task.BatchNo,
		data.Task.TaskType,
		string(data.Task.Status),
		data.Task.SubmittedAt.Format("2006-01-02 15:04:05"),
		strconv.Itoa(data.Task.TotalCount),
		strconv.Itoa(data.Task.SuccessCount),
		strconv.Itoa(data.Task.FailedCount),
		strconv.Itoa(data.Task.RetryCount),
		data.Task.ConflictTypes,
		data.Task.DataStrategy,
	})

	return calculateFileHash(filePath)
}

func (s *ExportService) exportDetails(filePath string, data *ExportData) (string, error) {
	file, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	writer.Write([]string{"序号", "明细类型", "状态", "重试次数", "冲突类型", "冲突详情", "最后错误"})

	for i, item := range data.Items {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			item.ItemType,
			string(item.Status),
			strconv.Itoa(item.RetryCount),
			item.ConflictType,
			item.ConflictDetail,
			item.LastError,
		})
	}

	return calculateFileHash(filePath)
}

func (s *ExportService) exportHistory(filePath string, data *ExportData) (string, error) {
	file, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	writer.Write([]string{"序号", "操作时间", "操作类型", "操作人", "原状态", "新状态", "差异摘要", "备注"})

	for i, h := range data.Histories {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			h.OperationTime.Format("2006-01-02 15:04:05"),
			string(h.OperationType),
			h.OperatorName,
			h.FromStatus,
			h.ToStatus,
			h.DiffSummary,
			h.Remark,
		})
	}

	return calculateFileHash(filePath)
}

func (s *ExportService) exportFull(filePath string, data *ExportData) (string, error) {
	file, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	writer.Write([]string{"=== 任务概览 ==="})
	writer.Write([]string{"批次号", "任务类型", "状态", "提交时间", "总记录数",
		"成功数", "失败数", "重试次数", "冲突类型"})
	writer.Write([]string{
		data.Task.BatchNo,
		data.Task.TaskType,
		string(data.Task.Status),
		data.Task.SubmittedAt.Format("2006-01-02 15:04:05"),
		strconv.Itoa(data.Task.TotalCount),
		strconv.Itoa(data.Task.SuccessCount),
		strconv.Itoa(data.Task.FailedCount),
		strconv.Itoa(data.Task.RetryCount),
		data.Task.ConflictTypes,
	})
	writer.Write([]string{})

	writer.Write([]string{"=== 操作历史 ==="})
	writer.Write([]string{"序号", "操作时间", "操作类型", "操作人", "原状态", "新状态", "差异摘要", "备注"})
	for i, h := range data.Histories {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			h.OperationTime.Format("2006-01-02 15:04:05"),
			string(h.OperationType),
			h.OperatorName,
			h.FromStatus,
			h.ToStatus,
			h.DiffSummary,
			h.Remark,
		})
	}
	writer.Write([]string{})

	writer.Write([]string{"=== 明细列表 ==="})
	writer.Write([]string{"序号", "明细类型", "状态", "重试次数", "冲突类型", "冲突详情"})
	for i, item := range data.Items {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			item.ItemType,
			string(item.Status),
			strconv.Itoa(item.RetryCount),
			item.ConflictType,
			item.ConflictDetail,
		})
	}

	return calculateFileHash(filePath)
}

func calculateFileHash(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}

func (s *ExportService) VerifyExportConsistency(exportID uuid.UUID) (bool, error) {
	var record models.ExportRecord
	if err := database.DB.First(&record, exportID).Error; err != nil {
		return false, err
	}

	filePath := filepath.Join("exports", record.FileName)
	currentHash, err := calculateFileHash(filePath)
	if err != nil {
		return false, err
	}

	if currentHash != record.FileHash {
		return false, nil
	}

	return true, nil
}

func (s *ExportService) GetExportRecords(taskID uuid.UUID) ([]models.ExportRecord, error) {
	var records []models.ExportRecord
	err := database.DB.Where("task_id = ?", taskID).Order("exported_at DESC").Find(&records).Error
	return records, err
}
