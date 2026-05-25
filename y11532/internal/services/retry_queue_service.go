package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/models"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type DataStrategy string

const (
	StrategyIgnore DataStrategy = "ignore"
	StrategyOverwrite DataStrategy = "overwrite"
	StrategyAppend DataStrategy = "append"
)

type RetryQueueService struct {
	conflictService *ConflictService
	historyService  *HistoryService
}

func NewRetryQueueService() *RetryQueueService {
	return &RetryQueueService{
		conflictService: NewConflictService(),
		historyService:  NewHistoryService(),
	}
}

type SubmitTaskRequest struct {
	BranchID     uuid.UUID
	BatchNo      string
	TaskType     string
	Priority     int
	DataStrategy string
	Schedules    []models.TellerSchedule
	Leaves       []models.LeaveRequest
	Forecasts    []models.BusinessVolumeForecast
	Scans        []models.ScanDetail
	Trainings    []models.TempTraining
	Operator     OperatorInfo
}

type ProcessResult struct {
	Success bool
	Message string
	ItemResults []ItemProcessResult
}

type ItemProcessResult struct {
	ItemID      uuid.UUID
	ItemType    string
	Success     bool
	Error       string
	Conflict    string
}

func (s *RetryQueueService) SubmitTask(req SubmitTaskRequest) (*models.RetryTask, error) {
	var existingTask models.RetryTask
	err := database.DB.Where("batch_no = ?", req.BatchNo).First(&existingTask).Error

	if err == nil {
		if req.DataStrategy == "" {
			return nil, fmt.Errorf("批次 %s 已存在，请指定数据处理策略(ignore/overwrite/append)", req.BatchNo)
		}

		switch DataStrategy(req.DataStrategy) {
		case StrategyIgnore:
			s.historyService.RecordOperation(
				existingTask.ID, uuid.Nil, models.OpTypeSubmit,
				string(existingTask.Status), string(existingTask.Status),
				nil, nil,
				fmt.Sprintf("重复提交，按策略忽略原批次: %s", req.BatchNo),
				req.Operator,
			)
			return &existingTask, nil

		case StrategyOverwrite:
			return s.overwriteTask(&existingTask, req)

		case StrategyAppend:
			return s.appendToTask(&existingTask, req)

		default:
			return nil, fmt.Errorf("未知的数据处理策略: %s", req.DataStrategy)
		}
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("检查批次存在性失败: %w", err)
	}

	return s.createNewTask(req)
}

func (s *RetryQueueService) createNewTask(req SubmitTaskRequest) (*models.RetryTask, error) {
	tx := database.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	sourceData, _ := json.Marshal(map[string]interface{}{
		"schedules_count": len(req.Schedules),
		"leaves_count":    len(req.Leaves),
		"forecasts_count": len(req.Forecasts),
		"scans_count":     len(req.Scans),
		"trainings_count": len(req.Trainings),
	})

	task := &models.RetryTask{
		BranchID:      req.BranchID,
		BatchNo:       req.BatchNo,
		TaskType:      req.TaskType,
		Status:        models.TaskStatusPending,
		Priority:      req.Priority,
		MaxRetryCount: 3,
		DataStrategy:  req.DataStrategy,
		SubmittedBy:   req.Operator.OperatorID,
		SubmittedAt:   time.Now(),
		TotalCount:    len(req.Schedules) + len(req.Leaves) + len(req.Forecasts) + len(req.Scans) + len(req.Trainings),
		ScheduleCount: len(req.Schedules),
		LeaveCount:    len(req.Leaves),
		ForecastCount: len(req.Forecasts),
		ScanCount:     len(req.Scans),
		SourceData:    string(sourceData),
	}

	if err := tx.Create(task).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建任务失败: %w", err)
	}

	if err := s.createTaskItems(tx, task, req); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	s.historyService.RecordOperation(
		task.ID, uuid.Nil, models.OpTypeSubmit,
		"", string(task.Status),
		nil, task,
		fmt.Sprintf("创建新任务批次: %s", req.BatchNo),
		req.Operator,
	)

	return task, nil
}

func (s *RetryQueueService) createTaskItems(tx *gorm.DB, task *models.RetryTask, req SubmitTaskRequest) error {
	for i := range req.Schedules {
		req.Schedules[i].BatchNo = task.BatchNo
		req.Schedules[i].BranchID = task.BranchID
		if err := tx.Create(&req.Schedules[i]).Error; err != nil {
			return err
		}

		item := &models.RetryTaskItem{
			TaskID:   task.ID,
			ItemType: "schedule",
			ItemID:   req.Schedules[i].ID,
			Status:   models.TaskStatusPending,
		}
		if err := tx.Create(item).Error; err != nil {
			return err
		}
	}

	for i := range req.Leaves {
		req.Leaves[i].BatchNo = task.BatchNo
		req.Leaves[i].BranchID = task.BranchID
		if err := tx.Create(&req.Leaves[i]).Error; err != nil {
			return err
		}

		item := &models.RetryTaskItem{
			TaskID:   task.ID,
			ItemType: "leave",
			ItemID:   req.Leaves[i].ID,
			Status:   models.TaskStatusPending,
		}
		if err := tx.Create(item).Error; err != nil {
			return err
		}
	}

	for i := range req.Forecasts {
		req.Forecasts[i].BatchNo = task.BatchNo
		req.Forecasts[i].BranchID = task.BranchID
		if err := tx.Create(&req.Forecasts[i]).Error; err != nil {
			return err
		}

		item := &models.RetryTaskItem{
			TaskID:   task.ID,
			ItemType: "forecast",
			ItemID:   req.Forecasts[i].ID,
			Status:   models.TaskStatusPending,
		}
		if err := tx.Create(item).Error; err != nil {
			return err
		}
	}

	for i := range req.Scans {
		req.Scans[i].BatchNo = task.BatchNo
		req.Scans[i].BranchID = task.BranchID
		if err := tx.Create(&req.Scans[i]).Error; err != nil {
			return err
		}

		item := &models.RetryTaskItem{
			TaskID:   task.ID,
			ItemType: "scan",
			ItemID:   req.Scans[i].ID,
			Status:   models.TaskStatusPending,
		}
		if err := tx.Create(item).Error; err != nil {
			return err
		}
	}

	for i := range req.Trainings {
		req.Trainings[i].BranchID = task.BranchID
		if err := tx.Create(&req.Trainings[i]).Error; err != nil {
			return err
		}

		item := &models.RetryTaskItem{
			TaskID:   task.ID,
			ItemType: "training",
			ItemID:   req.Trainings[i].ID,
			Status:   models.TaskStatusPending,
		}
		if err := tx.Create(item).Error; err != nil {
			return err
		}
	}

	return nil
}

func (s *RetryQueueService) overwriteTask(existingTask *models.RetryTask, req SubmitTaskRequest) (*models.RetryTask, error) {
	tx := database.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	oldTask := *existingTask

	if err := tx.Where("task_id = ?", existingTask.ID).Delete(&models.RetryTaskItem{}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Where("batch_no = ?", existingTask.BatchNo).Delete(&models.TellerSchedule{})
	tx.Where("batch_no = ?", existingTask.BatchNo).Delete(&models.LeaveRequest{})
	tx.Where("batch_no = ?", existingTask.BatchNo).Delete(&models.BusinessVolumeForecast{})
	tx.Where("batch_no = ?", existingTask.BatchNo).Delete(&models.ScanDetail{})
	tx.Where("branch_id = ?", existingTask.BranchID).Delete(&models.TempTraining{})

	existingTask.Status = models.TaskStatusPending
	existingTask.RetryCount = 0
	existingTask.SuccessCount = 0
	existingTask.FailedCount = 0
	existingTask.TotalCount = len(req.Schedules) + len(req.Leaves) + len(req.Forecasts) + len(req.Scans) + len(req.Trainings)
	existingTask.ScheduleCount = len(req.Schedules)
	existingTask.LeaveCount = len(req.Leaves)
	existingTask.ForecastCount = len(req.Forecasts)
	existingTask.ScanCount = len(req.Scans)
	existingTask.LastError = ""
	existingTask.ConflictTypes = ""
	existingTask.SubmittedAt = time.Now()

	sourceData, _ := json.Marshal(map[string]interface{}{
		"schedules_count": len(req.Schedules),
		"leaves_count":    len(req.Leaves),
		"forecasts_count": len(req.Forecasts),
		"scans_count":     len(req.Scans),
		"trainings_count": len(req.Trainings),
	})
	existingTask.SourceData = string(sourceData)

	if err := tx.Save(existingTask).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := s.createTaskItems(tx, existingTask, req); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	s.historyService.RecordOperation(
		existingTask.ID, uuid.Nil, models.OpTypeSubmit,
		string(oldTask.Status), string(existingTask.Status),
		&oldTask, existingTask,
		fmt.Sprintf("覆盖原有批次数据: %s", req.BatchNo),
		req.Operator,
	)

	return existingTask, nil
}

func (s *RetryQueueService) appendToTask(existingTask *models.RetryTask, req SubmitTaskRequest) (*models.RetryTask, error) {
	tx := database.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	oldTask := *existingTask

	if err := s.createTaskItems(tx, existingTask, req); err != nil {
		tx.Rollback()
		return nil, err
	}

	addedCount := len(req.Schedules) + len(req.Leaves) + len(req.Forecasts) + len(req.Scans) + len(req.Trainings)
	existingTask.TotalCount += addedCount
	existingTask.ScheduleCount += len(req.Schedules)
	existingTask.LeaveCount += len(req.Leaves)
	existingTask.ForecastCount += len(req.Forecasts)
	existingTask.ScanCount += len(req.Scans)

	if existingTask.Status == models.TaskStatusSuccess || existingTask.Status == models.TaskStatusClosed {
		existingTask.Status = models.TaskStatusPending
	}

	if err := tx.Save(existingTask).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	s.historyService.RecordOperation(
		existingTask.ID, uuid.Nil, models.OpTypeSubmit,
		string(oldTask.Status), string(existingTask.Status),
		&oldTask, existingTask,
		fmt.Sprintf("追加数据到批次: %s，新增 %d 条记录", req.BatchNo, addedCount),
		req.Operator,
	)

	return existingTask, nil
}

func (s *RetryQueueService) QueueTask(taskID uuid.UUID, operator OperatorInfo) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusPending && task.Status != models.TaskStatusFailed && task.Status != models.TaskStatusResubmitted {
		return fmt.Errorf("任务状态 %s 不允许排队", task.Status)
	}

	if task.Status == models.TaskStatusFrozen {
		return fmt.Errorf("任务已冻结，请先解冻")
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusQueued
	now := time.Now()
	task.NextRetryAt = &now

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeQueue,
		string(oldStatus), string(task.Status),
		nil, &task,
		"任务进入队列等待处理",
		operator,
	)

	return nil
}

func (s *RetryQueueService) ProcessTask(taskID uuid.UUID) (*ProcessResult, error) {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return nil, err
	}

	if task.Status != models.TaskStatusQueued && task.Status != models.TaskStatusRetrying {
		return nil, fmt.Errorf("任务状态 %s 不允许处理", task.Status)
	}

	var items []models.RetryTaskItem
	if err := database.DB.Where("task_id = ? AND status NOT IN ('success', 'compensated')", taskID).Find(&items).Error; err != nil {
		return nil, err
	}

	oldStatus := task.Status
	oldTask := task

	task.Status = models.TaskStatusProcessing
	database.DB.Save(&task)

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeProcess,
		string(oldStatus), string(task.Status),
		&oldTask, &task,
		fmt.Sprintf("开始处理任务，共 %d 个待处理项", len(items)),
		OperatorInfo{},
	)

	result := &ProcessResult{
		Success:     true,
		ItemResults: make([]ItemProcessResult, 0, len(items)),
	}

	successCount := 0
	var conflictTypes []string
	var lastError string

	for _, item := range items {
		itemResult := s.processTaskItem(&task, &item)
		result.ItemResults = append(result.ItemResults, itemResult)

		if itemResult.Success {
			successCount++
		} else {
			result.Success = false
			if itemResult.Conflict != "" {
				conflictTypes = append(conflictTypes, itemResult.Conflict)
			}
			lastError = itemResult.Error
		}
	}

	oldTask = task
	task.SuccessCount += successCount
	task.FailedCount = task.TotalCount - task.SuccessCount

	var opType models.OperationType
	var remark string

	if result.Success {
		task.Status = models.TaskStatusSuccess
		task.LastError = ""
		opType = models.OpTypeSuccess
		remark = fmt.Sprintf("任务处理成功，共 %d 项全部成功", task.TotalCount)
	} else if successCount > 0 {
		task.Status = models.TaskStatusPartialFailed
		task.ConflictTypes = strings.Join(uniqueStrings(conflictTypes), ",")
		task.LastError = lastError
		task.ReviewRequired = true
		opType = models.OpTypeFail
		remark = fmt.Sprintf("任务部分成功，成功 %d 项，失败 %d 项，冲突类型: %s",
			successCount, task.TotalCount-successCount, task.ConflictTypes)
	} else {
		if task.RetryCount < task.MaxRetryCount {
			task.Status = models.TaskStatusRetrying
			task.RetryCount++
			nextRetry := time.Now().Add(time.Duration(task.RetryCount*30) * time.Second)
			task.NextRetryAt = &nextRetry
			opType = models.OpTypeRetry
			remark = fmt.Sprintf("任务处理失败，第 %d 次重试，下次重试时间: %s，错误: %s",
				task.RetryCount, nextRetry.Format("2006-01-02 15:04:05"), lastError)
		} else {
			task.Status = models.TaskStatusDeadLetter
			for i := range items {
				if items[i].Status != models.TaskStatusSuccess && items[i].Status != models.TaskStatusCompensated {
					items[i].Status = models.TaskStatusDeadLetter
					database.DB.Save(&items[i])
				}
			}
			s.moveToDeadLetter(&task, items)
			opType = models.OpTypeFail
			remark = fmt.Sprintf("任务达到最大重试次数 %d，转入死信队列，错误: %s",
				task.MaxRetryCount, lastError)
		}
		task.ConflictTypes = strings.Join(uniqueStrings(conflictTypes), ",")
		task.LastError = lastError
	}

	database.DB.Save(&task)

	s.historyService.RecordOperation(
		taskID, uuid.Nil, opType,
		string(models.TaskStatusProcessing), string(task.Status),
		&oldTask, &task,
		remark,
		OperatorInfo{},
	)

	return result, nil
}

func (s *RetryQueueService) processTaskItem(task *models.RetryTask, item *models.RetryTaskItem) ItemProcessResult {
	result := ItemProcessResult{
		ItemID:   item.ItemID,
		ItemType: item.ItemType,
		Success:  true,
	}

	tx := database.Begin()
	defer tx.Rollback()

	oldItemStatus := item.Status
	var oldData interface{}

	switch item.ItemType {
	case "schedule":
		var schedule models.TellerSchedule
		if err := tx.First(&schedule, item.ItemID).Error; err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("查询排班失败: %v", err)
			return result
		}
		oldData = schedule

		ctx := ScheduleValidationContext{
			BranchID:     task.BranchID,
			ScheduleDate: schedule.ScheduleDate,
			TellerID:     schedule.TellerID,
			WindowNo:     schedule.WindowNo,
			StartTime:    schedule.StartTime,
			EndTime:      schedule.EndTime,
		}

		conflicts := s.conflictService.ValidateSchedule(ctx)
		if len(conflicts) > 0 {
			result.Success = false
			result.Conflict = string(conflicts[0].ConflictType)
			result.Error = conflicts[0].Detail

			item.ConflictType = string(conflicts[0].ConflictType)
			item.ConflictDetail = conflicts[0].Detail
			item.Status = models.TaskStatusFailed
			item.LastError = conflicts[0].Detail
		} else {
			schedule.Status = "confirmed"
			tx.Save(&schedule)
			item.Status = models.TaskStatusSuccess
			item.Resolved = true
		}

	case "leave":
		var leave models.LeaveRequest
		if err := tx.First(&leave, item.ItemID).Error; err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("查询请假单失败: %v", err)
			return result
		}
		oldData = leave
		leave.Status = "approved"
		now := time.Now()
		leave.ApprovedAt = &now
		tx.Save(&leave)
		item.Status = models.TaskStatusSuccess
		item.Resolved = true

	case "forecast":
		var forecast models.BusinessVolumeForecast
		if err := tx.First(&forecast, item.ItemID).Error; err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("查询预测数据失败: %v", err)
			return result
		}
		oldData = forecast
		item.Status = models.TaskStatusSuccess
		item.Resolved = true

	case "scan":
		var scan models.ScanDetail
		if err := tx.First(&scan, item.ItemID).Error; err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("查询扫码明细失败: %v", err)
			return result
		}
		oldData = scan
		scan.Status = "verified"
		tx.Save(&scan)
		item.Status = models.TaskStatusSuccess
		item.Resolved = true

	case "training":
		var training models.TempTraining
		if err := tx.First(&training, item.ItemID).Error; err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("查询培训记录失败: %v", err)
			return result
		}
		oldData = training
		training.Status = "confirmed"
		tx.Save(&training)
		item.Status = models.TaskStatusSuccess
		item.Resolved = true
	}

	item.RetryCount++
	tx.Save(item)
	tx.Commit()

	if item.Status != oldItemStatus {
		opType := models.OpTypeProcess
		if item.Status == models.TaskStatusSuccess {
			opType = models.OpTypeSuccess
		} else if item.Status == models.TaskStatusFailed {
			opType = models.OpTypeFail
		}

		s.historyService.RecordOperation(
			task.ID, item.ID, opType,
			string(oldItemStatus), string(item.Status),
			oldData, nil,
			fmt.Sprintf("明细项处理: %s", result.Error),
			OperatorInfo{},
		)
	}

	return result
}

func (s *RetryQueueService) moveToDeadLetter(task *models.RetryTask, items []models.RetryTaskItem) {
	for _, item := range items {
		if item.Status == models.TaskStatusSuccess || item.Status == models.TaskStatusCompensated {
			continue
		}

		deadLetter := &models.DeadLetter{
			TaskID:          task.ID,
			RetryTaskItemID: item.ID,
			BusinessDataID:  item.ItemID,
			ItemType:        item.ItemType,
			FailedAt:        time.Now(),
			ErrorCount:      item.RetryCount,
			LastError:       item.LastError,
			ConflictType:    item.ConflictType,
		}

		var originalData string
		var err error
		switch item.ItemType {
		case "schedule":
			var s models.TellerSchedule
			if err = database.DB.First(&s, item.ItemID).Error; err == nil {
				data, _ := json.Marshal(s)
				originalData = string(data)
			}
		case "leave":
			var l models.LeaveRequest
			if err = database.DB.First(&l, item.ItemID).Error; err == nil {
				data, _ := json.Marshal(l)
				originalData = string(data)
			}
		case "forecast":
			var f models.BusinessVolumeForecast
			if err = database.DB.First(&f, item.ItemID).Error; err == nil {
				data, _ := json.Marshal(f)
				originalData = string(data)
			}
		case "scan":
			var sc models.ScanDetail
			if err = database.DB.First(&sc, item.ItemID).Error; err == nil {
				data, _ := json.Marshal(sc)
				originalData = string(data)
			}
		case "training":
			var tr models.TempTraining
			if err = database.DB.First(&tr, item.ItemID).Error; err == nil {
				data, _ := json.Marshal(tr)
				originalData = string(data)
			}
		}
		deadLetter.OriginalData = originalData

		if err := database.DB.Create(deadLetter).Error; err != nil {
			logrus.Errorf("Failed to create dead letter for item %s: %v", item.ID, err)
		}
	}
}

func (s *RetryQueueService) ManualTakeover(taskID uuid.UUID, operator OperatorInfo, reason string) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusFailed && task.Status != models.TaskStatusPartialFailed && task.Status != models.TaskStatusDeadLetter {
		return fmt.Errorf("任务状态 %s 不允许人工接管", task.Status)
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusManualTakeover
	task.ManualOverride = true
	task.OverriddenBy = operator.OperatorID
	now := time.Now()
	task.OverriddenAt = &now
	task.OverrideReason = reason

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeManualTakeover,
		string(oldStatus), string(task.Status),
		nil, &task,
		fmt.Sprintf("人工接管，原因: %s", reason),
		operator,
	)

	return nil
}

func (s *RetryQueueService) CompensateTask(taskID uuid.UUID, operator OperatorInfo, comment string) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusManualTakeover {
		return fmt.Errorf("任务状态 %s 不允许补偿入账，请先人工接管", task.Status)
	}

	var items []models.RetryTaskItem
	database.DB.Where("task_id = ? AND status NOT IN ('success', 'compensated')", taskID).Find(&items)

	for i := range items {
		items[i].Status = models.TaskStatusCompensated
		items[i].Resolved = true
		items[i].ResolvedBy = operator.OperatorID
		now := time.Now()
		items[i].ResolvedAt = &now
		items[i].ResolveComment = comment
		database.DB.Save(&items[i])
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusCompensated
	task.CompensatedBy = operator.OperatorID
	now := time.Now()
	task.CompensatedAt = &now
	task.SuccessCount = task.TotalCount
	task.FailedCount = 0

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeCompensate,
		string(oldStatus), string(task.Status),
		nil, &task,
		fmt.Sprintf("补偿入账，备注: %s", comment),
		operator,
	)

	return nil
}

func (s *RetryQueueService) CloseTask(taskID uuid.UUID, operator OperatorInfo, remark string) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusSuccess && task.Status != models.TaskStatusCompensated {
		return fmt.Errorf("任务状态 %s 不允许关闭", task.Status)
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusClosed
	task.ClosedBy = operator.OperatorID
	now := time.Now()
	task.ClosedAt = &now

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeClose,
		string(oldStatus), string(task.Status),
		nil, &task,
		fmt.Sprintf("关闭任务，备注: %s", remark),
		operator,
	)

	return nil
}

func (s *RetryQueueService) FreezeTask(taskID uuid.UUID, operator OperatorInfo, reason string) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status == models.TaskStatusFrozen {
		return fmt.Errorf("任务已冻结")
	}

	if task.Status == models.TaskStatusClosed {
		return fmt.Errorf("任务已关闭，无法冻结")
	}

	oldStatus := task.Status
	task.StatusBeforeFreeze = task.Status
	task.Status = models.TaskStatusFrozen

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeFreeze,
		string(oldStatus), string(task.Status),
		nil, &task,
		fmt.Sprintf("冻结任务，冻结前状态: %s，原因: %s", oldStatus, reason),
		operator,
	)

	return nil
}

func (s *RetryQueueService) UnfreezeTask(taskID uuid.UUID, operator OperatorInfo) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusFrozen {
		return fmt.Errorf("任务未冻结")
	}

	newStatus := task.StatusBeforeFreeze
	if newStatus == "" {
		newStatus = models.TaskStatusPending
		if task.RetryCount > 0 {
			newStatus = models.TaskStatusRetrying
		}
	}

	task.Status = newStatus
	task.StatusBeforeFreeze = ""
	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeUnfreeze,
		string(models.TaskStatusFrozen), string(newStatus),
		nil, &task,
		fmt.Sprintf("解冻任务，恢复到冻结前状态: %s", newStatus),
		operator,
	)

	return nil
}

func (s *RetryQueueService) WithdrawTask(taskID uuid.UUID, operator OperatorInfo, reason string) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status == models.TaskStatusClosed || task.Status == models.TaskStatusFrozen {
		return fmt.Errorf("任务状态 %s 不允许撤回", task.Status)
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusWithdrawn

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeWithdraw,
		string(oldStatus), string(task.Status),
		nil, &task,
		fmt.Sprintf("撤回任务，原因: %s", reason),
		operator,
	)

	return nil
}

func (s *RetryQueueService) ResubmitTask(taskID uuid.UUID, operator OperatorInfo) error {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return err
	}

	if task.Status != models.TaskStatusWithdrawn {
		return fmt.Errorf("只有已撤回的任务才能重新提交")
	}

	oldStatus := task.Status
	task.Status = models.TaskStatusResubmitted
	task.RetryCount = 0

	if err := database.DB.Save(&task).Error; err != nil {
		return err
	}

	s.historyService.RecordOperation(
		taskID, uuid.Nil, models.OpTypeResubmit,
		string(oldStatus), string(task.Status),
		nil, &task,
		"重新提交任务",
		operator,
	)

	return nil
}

func (s *RetryQueueService) GetTask(taskID uuid.UUID) (*models.RetryTask, error) {
	var task models.RetryTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (s *RetryQueueService) GetTaskItems(taskID uuid.UUID) ([]models.RetryTaskItem, error) {
	var items []models.RetryTaskItem
	err := database.DB.Where("task_id = ?", taskID).Find(&items).Error
	return items, err
}

func (s *RetryQueueService) ListTasks(branchID uuid.UUID, status string, page, pageSize int) ([]models.RetryTask, int64, error) {
	var tasks []models.RetryTask
	var total int64

	query := database.DB.Model(&models.RetryTask{})
	if branchID != uuid.Nil {
		query = query.Where("branch_id = ?", branchID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tasks).Error
	return tasks, total, err
}

func uniqueStrings(slice []string) []string {
	keys := make(map[string]bool)
	var list []string
	for _, entry := range slice {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}
