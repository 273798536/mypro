package services

import (
	"encoding/json"
	"time"

	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/models"

	"github.com/google/uuid"
)

type StatisticsService struct {
	historyService *HistoryService
}

func NewStatisticsService() *StatisticsService {
	return &StatisticsService{
		historyService: NewHistoryService(),
	}
}

type RetryClassification struct {
	ConflictType   string `json:"conflict_type"`
	Count          int    `json:"count"`
	SuccessCount   int    `json:"success_count"`
	FailedCount    int    `json:"failed_count"`
	ManualCount    int    `json:"manual_count"`
	AvgRetryCount  float64 `json:"avg_retry_count"`
}

type DeadLetterStats struct {
	TotalCount     int                           `json:"total_count"`
	ResolvedCount  int                           `json:"resolved_count"`
	UnresolvedCount int                          `json:"unresolved_count"`
	ByConflictType map[string]int                `json:"by_conflict_type"`
	ByItemType     map[string]int                `json:"by_item_type"`
	AvgErrorCount  float64                       `json:"avg_error_count"`
	OldestFailedAt *time.Time                    `json:"oldest_failed_at"`
}

type TaskResumeStats struct {
	TotalCount      int `json:"total_count"`
	ResumedCount    int `json:"resumed_count"`
	PendingCount    int `json:"pending_count"`
	FailedCount     int `json:"failed_count"`
	SuccessRate     float64 `json:"success_rate"`
}

type DailyOverview struct {
	StatDate        time.Time `json:"stat_date"`
	TotalTasks      int `json:"total_tasks"`
	PendingCount    int `json:"pending_count"`
	ProcessingCount int `json:"processing_count"`
	SuccessCount    int `json:"success_count"`
	FailedCount     int `json:"failed_count"`
	DeadLetterCount int `json:"dead_letter_count"`
	ManualCount     int `json:"manual_count"`
	CompensatedCount int `json:"compensated_count"`
	SuccessRate     float64 `json:"success_rate"`
	AvgRetryCount   float64 `json:"avg_retry_count"`
}

type ManagerDashboard struct {
	Overview          DailyOverview          `json:"overview"`
	RetryClassification []RetryClassification `json:"retry_classification"`
	DeadLetter        DeadLetterStats        `json:"dead_letter"`
	TaskResume        TaskResumeStats        `json:"task_resume"`
	RecentTasks       []models.RetryTask     `json:"recent_tasks"`
	RecentOperations  []models.OperationHistory `json:"recent_operations"`
}

type ConsistencyCheckResult struct {
	IsConsistent  bool     `json:"is_consistent"`
	Discrepancies []string `json:"discrepancies"`
	TaskCounts    map[string]int `json:"task_counts"`
	ItemCounts    map[string]int `json:"item_counts"`
}

func (s *StatisticsService) GetManagerDashboard(branchID uuid.UUID) (*ManagerDashboard, error) {
	dashboard := &ManagerDashboard{}

	overview, err := s.GetDailyOverview(branchID, time.Now())
	if err != nil {
		return nil, err
	}
	dashboard.Overview = *overview

	classification, err := s.GetRetryClassification(branchID)
	if err != nil {
		return nil, err
	}
	dashboard.RetryClassification = classification

	deadLetter, err := s.GetDeadLetterStats(branchID)
	if err != nil {
		return nil, err
	}
	dashboard.DeadLetter = *deadLetter

	resume, err := s.GetTaskResumeStats(branchID)
	if err != nil {
		return nil, err
	}
	dashboard.TaskResume = *resume

	var recentTasks []models.RetryTask
	database.DB.Where("branch_id = ?", branchID).Order("created_at DESC").Limit(10).Find(&recentTasks)
	dashboard.RecentTasks = recentTasks

	recentOps, _ := s.historyService.GetRecentHistory(20)
	dashboard.RecentOperations = recentOps

	return dashboard, nil
}

func (s *StatisticsService) GetDailyOverview(branchID uuid.UUID, date time.Time) (*DailyOverview, error) {
	dateOnly := date.Format("2006-01-02")

	var stats models.DailyStatistics
	err := database.DB.Where("branch_id = ? AND date(stat_date) = ?", branchID, dateOnly).First(&stats).Error

	if err != nil {
		return s.calculateDailyOverview(branchID, date)
	}

	successRate := 0.0
	if stats.TotalTasks > 0 {
		successRate = float64(stats.SuccessCount) / float64(stats.TotalTasks) * 100
	}

	return &DailyOverview{
		StatDate:         stats.StatDate,
		TotalTasks:       stats.TotalTasks,
		PendingCount:     stats.PendingCount,
		ProcessingCount:  stats.ProcessingCount,
		SuccessCount:     stats.SuccessCount,
		FailedCount:      stats.FailedCount,
		DeadLetterCount:  stats.DeadLetterCount,
		ManualCount:      stats.ManualCount,
		CompensatedCount: stats.CompensatedCount,
		SuccessRate:      successRate,
		AvgRetryCount:    stats.AvgRetryCount,
	}, nil
}

func (s *StatisticsService) calculateDailyOverview(branchID uuid.UUID, date time.Time) (*DailyOverview, error) {
	dateOnly := date.Format("2006-01-02")

	var tasks []models.RetryTask
	database.DB.Where("branch_id = ? AND date(created_at) = ?", branchID, dateOnly).Find(&tasks)

	overview := &DailyOverview{
		StatDate:   date,
		TotalTasks: len(tasks),
	}

	totalRetry := 0
	for _, t := range tasks {
		totalRetry += t.RetryCount
		switch t.Status {
		case models.TaskStatusPending:
			overview.PendingCount++
		case models.TaskStatusProcessing, models.TaskStatusQueued, models.TaskStatusRetrying:
			overview.ProcessingCount++
		case models.TaskStatusSuccess:
			overview.SuccessCount++
		case models.TaskStatusFailed, models.TaskStatusPartialFailed:
			overview.FailedCount++
		case models.TaskStatusDeadLetter:
			overview.DeadLetterCount++
			overview.FailedCount++
		case models.TaskStatusManualTakeover:
			overview.ManualCount++
		case models.TaskStatusCompensated:
			overview.CompensatedCount++
		}
	}

	if overview.TotalTasks > 0 {
		overview.SuccessRate = float64(overview.SuccessCount) / float64(overview.TotalTasks) * 100
		overview.AvgRetryCount = float64(totalRetry) / float64(overview.TotalTasks)
	}

	return overview, nil
}

func (s *StatisticsService) GetRetryClassification(branchID uuid.UUID) ([]RetryClassification, error) {
	var items []models.RetryTaskItem
	database.DB.Joins("JOIN retry_tasks ON retry_tasks.id = retry_task_items.task_id").
		Where("retry_tasks.branch_id = ? AND retry_task_items.conflict_type != ''", branchID).
		Find(&items)

	classificationMap := make(map[string]*RetryClassification)

	for _, item := range items {
		ct := item.ConflictType
		if _, ok := classificationMap[ct]; !ok {
			classificationMap[ct] = &RetryClassification{
				ConflictType: ct,
			}
		}
		classificationMap[ct].Count++
		classificationMap[ct].AvgRetryCount += float64(item.RetryCount)

		switch item.Status {
		case models.TaskStatusSuccess, models.TaskStatusCompensated:
			classificationMap[ct].SuccessCount++
		case models.TaskStatusFailed, models.TaskStatusDeadLetter:
			classificationMap[ct].FailedCount++
		case models.TaskStatusManualTakeover:
			classificationMap[ct].ManualCount++
		}
	}

	result := make([]RetryClassification, 0, len(classificationMap))
	for _, c := range classificationMap {
		if c.Count > 0 {
			c.AvgRetryCount = c.AvgRetryCount / float64(c.Count)
		}
		result = append(result, *c)
	}

	return result, nil
}

func (s *StatisticsService) GetDeadLetterStats(branchID uuid.UUID) (*DeadLetterStats, error) {
	var deadLetters []models.DeadLetter
	database.DB.Joins("JOIN retry_tasks ON retry_tasks.id = dead_letters.task_id").
		Where("retry_tasks.branch_id = ?", branchID).
		Find(&deadLetters)

	stats := &DeadLetterStats{
		TotalCount:     len(deadLetters),
		ByConflictType: make(map[string]int),
		ByItemType:     make(map[string]int),
	}

	totalErrorCount := 0
	var oldest *time.Time

	for _, dl := range deadLetters {
		if dl.Resolved {
			stats.ResolvedCount++
		} else {
			stats.UnresolvedCount++
		}

		stats.ByConflictType[dl.ConflictType]++
		stats.ByItemType[dl.ItemType]++
		totalErrorCount += dl.ErrorCount

		if oldest == nil || dl.FailedAt.Before(*oldest) {
			oldest = &dl.FailedAt
		}
	}

	if stats.TotalCount > 0 {
		stats.AvgErrorCount = float64(totalErrorCount) / float64(stats.TotalCount)
	}
	stats.OldestFailedAt = oldest

	return stats, nil
}

func (s *StatisticsService) GetTaskResumeStats(branchID uuid.UUID) (*TaskResumeStats, error) {
	var tasks []models.RetryTask
	database.DB.Where("branch_id = ? AND retry_count > 0", branchID).Find(&tasks)

	stats := &TaskResumeStats{
		TotalCount: len(tasks),
	}

	for _, t := range tasks {
		switch t.Status {
		case models.TaskStatusSuccess, models.TaskStatusCompensated, models.TaskStatusClosed:
			stats.ResumedCount++
		case models.TaskStatusPending, models.TaskStatusQueued, models.TaskStatusRetrying, models.TaskStatusProcessing:
			stats.PendingCount++
		case models.TaskStatusFailed, models.TaskStatusPartialFailed, models.TaskStatusDeadLetter:
			stats.FailedCount++
		}
	}

	if stats.TotalCount > 0 {
		stats.SuccessRate = float64(stats.ResumedCount) / float64(stats.TotalCount) * 100
	}

	return stats, nil
}

func (s *StatisticsService) CheckConsistency(taskID uuid.UUID) (*ConsistencyCheckResult, error) {
	result := &ConsistencyCheckResult{
		IsConsistent:  true,
		Discrepancies: make([]string, 0),
		TaskCounts:    make(map[string]int),
		ItemCounts:    make(map[string]int),
	}

	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return nil, err
	}

	var items []models.RetryTaskItem
	database.DB.Where("task_id = ?", taskID).Find(&items)

	itemStatusCount := make(map[string]int)
	for _, item := range items {
		itemStatusCount[string(item.Status)]++
	}

	successItems := itemStatusCount[string(models.TaskStatusSuccess)] + itemStatusCount[string(models.TaskStatusCompensated)]
	failedItems := len(items) - successItems

	if task.TotalCount != len(items) {
		result.IsConsistent = false
		result.Discrepancies = append(result.Discrepancies,
			"任务记录总数与实际明细数不符")
	}

	if task.SuccessCount != successItems {
		result.IsConsistent = false
		result.Discrepancies = append(result.Discrepancies,
			"任务成功数与明细成功数不符")
	}

	if task.FailedCount != failedItems {
		result.IsConsistent = false
		result.Discrepancies = append(result.Discrepancies,
			"任务失败数与明细失败数不符")
	}

	result.TaskCounts = map[string]int{
		"task_total":   task.TotalCount,
		"task_success": task.SuccessCount,
		"task_failed":  task.FailedCount,
	}
	result.ItemCounts = map[string]int{
		"item_total":   len(items),
		"item_success": successItems,
		"item_failed":  failedItems,
	}

	var histories []models.OperationHistory
	database.DB.Where("task_id = ?", taskID).Order("operation_time DESC").Find(&histories)

	if len(histories) > 0 {
		lastStatus := histories[0].ToStatus
		if lastStatus != string(task.Status) {
			result.IsConsistent = false
			result.Discrepancies = append(result.Discrepancies,
				"任务当前状态与历史记录最终状态不符")
		}
	}

	return result, nil
}

func (s *StatisticsService) ListDeadLetters(branchID uuid.UUID, resolved *bool, page, pageSize int) ([]models.DeadLetter, int64, error) {
	var deadLetters []models.DeadLetter
	var total int64

	query := database.DB.Model(&models.DeadLetter{}).
		Joins("JOIN retry_tasks ON retry_tasks.id = dead_letters.task_id").
		Where("retry_tasks.branch_id = ?", branchID)

	if resolved != nil {
		query = query.Where("dead_letters.resolved = ?", *resolved)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	err := query.Order("failed_at DESC").Offset(offset).Limit(pageSize).Find(&deadLetters).Error
	return deadLetters, total, err
}

func (s *StatisticsService) RestoreDeadLetter(deadLetterID uuid.UUID, operator OperatorInfo) (*models.RetryTask, error) {
	var deadLetter models.DeadLetter
	if err := database.DB.First(&deadLetter, deadLetterID).Error; err != nil {
		return nil, err
	}

	if deadLetter.Resolved {
		return nil, nil
	}

	var task models.RetryTask
	if err := database.DB.First(&task, deadLetter.TaskID).Error; err != nil {
		return nil, err
	}

	task.Status = models.TaskStatusPending
	task.RetryCount = 0
	task.LastError = ""

	var item models.RetryTaskItem
	database.DB.Where("id = ?", deadLetter.ItemID).First(&item)
	item.Status = models.TaskStatusPending
	item.RetryCount = 0
	item.LastError = ""
	item.Resolved = false

	tx := database.Begin()
	tx.Save(&task)
	tx.Save(&item)

	deadLetter.Resolved = true
	deadLetter.ResolvedBy = operator.OperatorID
	now := time.Now()
	deadLetter.ResolvedAt = &now
	deadLetter.ResolveMethod = "restore"
	deadLetter.RestoredTaskID = task.ID
	tx.Save(&deadLetter)

	tx.Commit()

	return &task, nil
}

func (s *StatisticsService) GenerateDailyStatistics(date time.Time) error {
	var branches []models.Branch
	database.DB.Find(&branches)

	for _, branch := range branches {
		overview, err := s.calculateDailyOverview(branch.ID, date)
		if err != nil {
			continue
		}

		classification, _ := s.GetRetryClassification(branch.ID)
		conflictByType, _ := json.Marshal(classification)

		stat := &models.DailyStatistics{
			BranchID:         branch.ID,
			StatDate:         date,
			TotalTasks:       overview.TotalTasks,
			PendingCount:     overview.PendingCount,
			ProcessingCount:  overview.ProcessingCount,
			SuccessCount:     overview.SuccessCount,
			FailedCount:      overview.FailedCount,
			DeadLetterCount:  overview.DeadLetterCount,
			ManualCount:      overview.ManualCount,
			CompensatedCount: overview.CompensatedCount,
			AvgRetryCount:    overview.AvgRetryCount,
			ConflictByType:   string(conflictByType),
		}

		var existing models.DailyStatistics
		err = database.DB.Where("branch_id = ? AND date(stat_date) = ?",
			branch.ID, date.Format("2006-01-02")).First(&existing).Error

		if err == nil {
			stat.ID = existing.ID
			database.DB.Save(stat)
		} else {
			database.DB.Create(stat)
		}
	}

	return nil
}
