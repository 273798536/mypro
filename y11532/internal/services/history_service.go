package services

import (
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/models"

	"github.com/google/uuid"
)

type HistoryService struct{}

func NewHistoryService() *HistoryService {
	return &HistoryService{}
}

type OperatorInfo struct {
	OperatorID   uuid.UUID
	OperatorName string
	IPAddress    string
	UserAgent    string
}

func (s *HistoryService) RecordOperation(
	taskID uuid.UUID,
	itemID uuid.UUID,
	opType models.OperationType,
	fromStatus string,
	toStatus string,
	beforeData interface{},
	afterData interface{},
	remark string,
	operator OperatorInfo,
) (*models.OperationHistory, error) {
	beforeSnapshot := snapshotData(beforeData)
	afterSnapshot := snapshotData(afterData)
	diffSummary := generateDiff(beforeData, afterData)

	history := &models.OperationHistory{
		TaskID:         taskID,
		ItemID:         itemID,
		OperationType:  opType,
		OperatorID:     operator.OperatorID,
		OperatorName:   operator.OperatorName,
		OperationTime:  time.Now(),
		FromStatus:     fromStatus,
		ToStatus:       toStatus,
		BeforeSnapshot: beforeSnapshot,
		AfterSnapshot:  afterSnapshot,
		DiffSummary:    diffSummary,
		Remark:         remark,
		IPAddress:      operator.IPAddress,
		UserAgent:      operator.UserAgent,
	}

	if err := database.DB.Create(history).Error; err != nil {
		return nil, fmt.Errorf("failed to record operation history: %w", err)
	}

	return history, nil
}

func (s *HistoryService) GetTaskHistory(taskID uuid.UUID) ([]models.OperationHistory, error) {
	var histories []models.OperationHistory
	err := database.DB.Where("task_id = ?", taskID).Order("operation_time ASC").Find(&histories).Error
	return histories, err
}

func (s *HistoryService) GetItemHistory(itemID uuid.UUID) ([]models.OperationHistory, error) {
	var histories []models.OperationHistory
	err := database.DB.Where("item_id = ?", itemID).Order("operation_time ASC").Find(&histories).Error
	return histories, err
}

func (s *HistoryService) GetHistoryByID(historyID uuid.UUID) (*models.OperationHistory, error) {
	var history models.OperationHistory
	err := database.DB.First(&history, historyID).Error
	if err != nil {
		return nil, err
	}
	return &history, nil
}

func (s *HistoryService) CompareHistory(historyID1, historyID2 uuid.UUID) (string, error) {
	h1, err := s.GetHistoryByID(historyID1)
	if err != nil {
		return "", err
	}

	h2, err := s.GetHistoryByID(historyID2)
	if err != nil {
		return "", err
	}

	return generateDiffFromSnapshots(h1.AfterSnapshot, h2.AfterSnapshot), nil
}

func (s *HistoryService) GetRecentHistory(limit int) ([]models.OperationHistory, error) {
	var histories []models.OperationHistory
	err := database.DB.Order("operation_time DESC").Limit(limit).Find(&histories).Error
	return histories, err
}

func snapshotData(data interface{}) string {
	if data == nil {
		return "{}"
	}

	bytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Sprintf(`{"error": "%s"}`, err.Error())
	}
	return string(bytes)
}

func generateDiff(before, after interface{}) string {
	if before == nil && after == nil {
		return "无变化"
	}
	if before == nil {
		return "新增数据"
	}
	if after == nil {
		return "删除数据"
	}

	beforeVal := reflect.ValueOf(before)
	afterVal := reflect.ValueOf(after)

	if beforeVal.Kind() == reflect.Ptr {
		beforeVal = beforeVal.Elem()
	}
	if afterVal.Kind() == reflect.Ptr {
		afterVal = afterVal.Elem()
	}

	if beforeVal.Type() != afterVal.Type() {
		return "类型不同，无法对比"
	}

	var changes []string

	switch beforeVal.Kind() {
	case reflect.Struct:
		for i := 0; i < beforeVal.NumField(); i++ {
			fieldName := beforeVal.Type().Field(i).Name
			beforeField := beforeVal.Field(i)
			afterField := afterVal.Field(i)

			if !beforeField.CanInterface() || !afterField.CanInterface() {
				continue
			}

			beforeStr := fmt.Sprintf("%v", beforeField.Interface())
			afterStr := fmt.Sprintf("%v", afterField.Interface())

			if beforeStr != afterStr {
				changes = append(changes, fmt.Sprintf("%s: %s → %s", fieldName, beforeStr, afterStr))
			}
		}
	default:
		beforeStr := fmt.Sprintf("%v", before)
		afterStr := fmt.Sprintf("%v", after)
		if beforeStr != afterStr {
			changes = append(changes, fmt.Sprintf("%s → %s", beforeStr, afterStr))
		}
	}

	if len(changes) == 0 {
		return "无变化"
	}

	result := ""
	for i, change := range changes {
		if i > 0 {
			result += "; "
		}
		result += change
		if len(result) > 900 {
			result += "..."
			break
		}
	}
	return result
}

func generateDiffFromSnapshots(before, after string) string {
	var beforeData, afterData map[string]interface{}
	json.Unmarshal([]byte(before), &beforeData)
	json.Unmarshal([]byte(after), &afterData)

	var changes []string

	allKeys := make(map[string]bool)
	for k := range beforeData {
		allKeys[k] = true
	}
	for k := range afterData {
		allKeys[k] = true
	}

	for k := range allKeys {
		bv, bOK := beforeData[k]
		av, aOK := afterData[k]

		if !bOK {
			changes = append(changes, fmt.Sprintf("+%s: %v", k, av))
		} else if !aOK {
			changes = append(changes, fmt.Sprintf("-%s: %v", k, bv))
		} else {
			bStr := fmt.Sprintf("%v", bv)
			aStr := fmt.Sprintf("%v", av)
			if bStr != aStr {
				changes = append(changes, fmt.Sprintf("%s: %v → %v", k, bv, av))
			}
		}
	}

	if len(changes) == 0 {
		return "无变化"
	}

	result := ""
	for i, change := range changes {
		if i > 0 {
			result += "; "
		}
		result += change
		if len(result) > 900 {
			result += "..."
			break
		}
	}
	return result
}
