package services

import (
	"fmt"
	"time"

	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/models"

	"github.com/google/uuid"
)

type ConflictService struct{}

func NewConflictService() *ConflictService {
	return &ConflictService{}
}

type ConflictResult struct {
	HasConflict   bool
	ConflictType  models.ConflictType
	Detail        string
	AffectedItems []uuid.UUID
}

type ScheduleValidationContext struct {
	BranchID     uuid.UUID
	ScheduleDate time.Time
	TellerID     uuid.UUID
	WindowNo     string
	StartTime    string
	EndTime      string
}

func (s *ConflictService) ValidateSchedule(ctx ScheduleValidationContext) []ConflictResult {
	var conflicts []ConflictResult

	if result := s.checkLeaveOverlap(ctx); result.HasConflict {
		conflicts = append(conflicts, result)
	}

	if result := s.checkTrainingOverlap(ctx); result.HasConflict {
		conflicts = append(conflicts, result)
	}

	if result := s.checkLunchRule(ctx); result.HasConflict {
		conflicts = append(conflicts, result)
	}

	if result := s.checkWindowShortage(ctx); result.HasConflict {
		conflicts = append(conflicts, result)
	}

	return conflicts
}

func (s *ConflictService) checkLeaveOverlap(ctx ScheduleValidationContext) ConflictResult {
	var leaves []models.LeaveRequest
	dateOnly := ctx.ScheduleDate.Format("2006-01-02")

	err := database.DB.Where(
		"teller_id = ? AND status = 'approved' AND date(start_date) <= ? AND date(end_date) >= ?",
		ctx.TellerID, dateOnly, dateOnly,
	).Find(&leaves).Error

	if err != nil || len(leaves) == 0 {
		return ConflictResult{HasConflict: false}
	}

	affectedIDs := make([]uuid.UUID, len(leaves))
	for i, l := range leaves {
		affectedIDs[i] = l.ID
	}

	return ConflictResult{
		HasConflict:   true,
		ConflictType:  models.ConflictLeaveOverlap,
		Detail:        fmt.Sprintf("柜员在 %s 有 %d 条请假记录", dateOnly, len(leaves)),
		AffectedItems: affectedIDs,
	}
}

func (s *ConflictService) checkTrainingOverlap(ctx ScheduleValidationContext) ConflictResult {
	var trainings []models.TempTraining
	dateOnly := ctx.ScheduleDate.Format("2006-01-02")

	err := database.DB.Where(
		"teller_id = ? AND status = 'scheduled' AND date(start_date) <= ? AND date(end_date) >= ?",
		ctx.TellerID, dateOnly, dateOnly,
	).Find(&trainings).Error

	if err != nil || len(trainings) == 0 {
		return ConflictResult{HasConflict: false}
	}

	affectedIDs := make([]uuid.UUID, len(trainings))
	for i, t := range trainings {
		affectedIDs[i] = t.ID
	}

	return ConflictResult{
		HasConflict:   true,
		ConflictType:  models.ConflictTrainingOverlap,
		Detail:        fmt.Sprintf("柜员在 %s 有 %d 条培训记录", dateOnly, len(trainings)),
		AffectedItems: affectedIDs,
	}
}

func (s *ConflictService) checkLunchRule(ctx ScheduleValidationContext) ConflictResult {
	startMinutes := timeToMinutes(ctx.StartTime)
	endMinutes := timeToMinutes(ctx.EndTime)

	if endMinutes-startMinutes >= 360 {
		lunchStart := timeToMinutes("12:00")
		lunchEnd := timeToMinutes("13:30")

		overlapStart := max(startMinutes, lunchStart)
		overlapEnd := min(endMinutes, lunchEnd)

		if overlapEnd-overlapStart < 60 {
			return ConflictResult{
				HasConflict:  true,
				ConflictType: models.ConflictLunchRule,
				Detail:       "工作时长超过6小时但午休时间不足60分钟",
			}
		}
	}

	return ConflictResult{HasConflict: false}
}

func (s *ConflictService) checkWindowShortage(ctx ScheduleValidationContext) ConflictResult {
	var forecasts []models.BusinessVolumeForecast
	dateOnly := ctx.ScheduleDate.Format("2006-01-02")

	err := database.DB.Where(
		"branch_id = ? AND date(forecast_date) = ?",
		ctx.BranchID, dateOnly,
	).Find(&forecasts).Error

	if err != nil || len(forecasts) == 0 {
		return ConflictResult{HasConflict: false}
	}

	var schedules []models.TellerSchedule
	database.DB.Where(
		"branch_id = ? AND date(schedule_date) = ? AND status IN ('confirmed', 'pending')",
		ctx.BranchID, dateOnly,
	).Find(&schedules)

	windowCount := make(map[string]int)
	for _, s := range schedules {
		windowCount[s.WindowNo]++
	}

	for _, f := range forecasts {
		required := calculateRequiredWindows(f.ForecastCount)
		actual := windowCount[f.WindowNo]
		if actual < required {
			return ConflictResult{
				HasConflict:  true,
				ConflictType: models.ConflictWindowShortage,
				Detail: fmt.Sprintf("窗口 %s 业务量预测 %d 需要 %d 个窗口，当前只有 %d 个",
					f.WindowNo, f.ForecastCount, required, actual),
			}
		}
	}

	return ConflictResult{HasConflict: false}
}

func (s *ConflictService) CheckScanCompletion(branchID uuid.UUID, date time.Time) ConflictResult {
	var schedules []models.TellerSchedule
	dateOnly := date.Format("2006-01-02")

	database.DB.Where(
		"branch_id = ? AND date(schedule_date) = ? AND status = 'confirmed'",
		branchID, dateOnly,
	).Find(&schedules)

	if len(schedules) == 0 {
		return ConflictResult{HasConflict: false}
	}

	var scans []models.ScanDetail
	database.DB.Where(
		"branch_id = ? AND date(scan_time) = ? AND status = 'verified'",
		branchID, dateOnly,
	).Find(&scans)

	scanTellers := make(map[uuid.UUID]bool)
	for _, s := range scans {
		scanTellers[s.TellerID] = true
	}

	var missingTellers []uuid.UUID
	for _, s := range schedules {
		if !scanTellers[s.TellerID] {
			missingTellers = append(missingTellers, s.TellerID)
		}
	}

	if len(missingTellers) > 0 {
		return ConflictResult{
			HasConflict:   true,
			ConflictType:  models.ConflictScanMissing,
			Detail:        fmt.Sprintf("%d 名柜员的扫码明细缺失", len(missingTellers)),
			AffectedItems: missingTellers,
		}
	}

	return ConflictResult{HasConflict: false}
}

func timeToMinutes(timeStr string) int {
	if len(timeStr) < 5 {
		return 0
	}
	h := int(timeStr[0]-'0')*10 + int(timeStr[1]-'0')
	m := int(timeStr[3]-'0')*10 + int(timeStr[4]-'0')
	return h*60 + m
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func calculateRequiredWindows(volume int) int {
	switch {
	case volume <= 50:
		return 1
	case volume <= 100:
		return 2
	case volume <= 200:
		return 3
	default:
		return 4
	}
}
