package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (base *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if base.ID == uuid.Nil {
		base.ID = uuid.New()
	}
	return nil
}

type Branch struct {
	BaseModel
	BranchCode string `gorm:"size:20;uniqueIndex;not null"`
	BranchName string `gorm:"size:100;not null"`
	Address    string `gorm:"size:200"`
	Status     string `gorm:"size:20;default:'active'"`
}

type Teller struct {
	BaseModel
	BranchID    uuid.UUID `gorm:"type:uuid;index"`
	EmployeeID  string    `gorm:"size:50;uniqueIndex;not null"`
	Name        string    `gorm:"size:50;not null"`
	Level       string    `gorm:"size:20"`
	SkillTags   string    `gorm:"size:500"`
	Status      string    `gorm:"size:20;default:'active'"`
}

type TellerSchedule struct {
	BaseModel
	BranchID       uuid.UUID `gorm:"type:uuid;index"`
	TellerID       uuid.UUID `gorm:"type:uuid;index"`
	ScheduleDate   time.Time `gorm:"index"`
	ShiftType      string    `gorm:"size:20"`
	StartTime      string    `gorm:"size:10"`
	EndTime        string    `gorm:"size:10"`
	WindowNo       string    `gorm:"size:10"`
	LunchStartTime string    `gorm:"size:10"`
	LunchEndTime   string    `gorm:"size:10"`
	Status         string    `gorm:"size:20;default:'draft'"`
	BatchNo        string    `gorm:"size:50;index"`
	Source         string    `gorm:"size:50"`
}

type LeaveRequest struct {
	BaseModel
	BranchID       uuid.UUID `gorm:"type:uuid;index"`
	TellerID       uuid.UUID `gorm:"type:uuid;index"`
	RequestNo      string    `gorm:"size:50;uniqueIndex;not null"`
	LeaveType      string    `gorm:"size:20"`
	StartDate      time.Time
	EndDate        time.Time
	StartTime      string `gorm:"size:10"`
	EndTime        string `gorm:"size:10"`
	Reason         string `gorm:"size:500"`
	Status         string `gorm:"size:20;default:'pending'"`
	ApproverID     uuid.UUID
	ApprovedAt     *time.Time
	BatchNo        string `gorm:"size:50;index"`
	Source         string `gorm:"size:50"`
}

type BusinessVolumeForecast struct {
	BaseModel
	BranchID      uuid.UUID `gorm:"type:uuid;index"`
	ForecastDate  time.Time `gorm:"index"`
	TimeSlot      string    `gorm:"size:20"`
	WindowNo      string    `gorm:"size:10"`
	ForecastCount int
	ActualCount   int
	PriorityLevel string `gorm:"size:20"`
	BatchNo       string `gorm:"size:50;index"`
	Source        string `gorm:"size:50"`
}

type ScanDetail struct {
	BaseModel
	BranchID     uuid.UUID `gorm:"type:uuid;index"`
	ScanBatchNo  string    `gorm:"size:50;index"`
	ScanTime     time.Time
	TellerID     uuid.UUID `gorm:"type:uuid;index"`
	WindowNo     string    `gorm:"size:10"`
	BusinessType string    `gorm:"size:50"`
	SerialNo     string    `gorm:"size:50"`
	CustomerInfo string    `gorm:"size:200"`
	Amount       float64
	Status       string `gorm:"size:20;default:'pending'"`
	Remark       string `gorm:"size:500"`
	BatchNo      string `gorm:"size:50;index"`
	Source       string `gorm:"size:50"`
}

type TempTraining struct {
	BaseModel
	BranchID    uuid.UUID `gorm:"type:uuid;index"`
	TellerID    uuid.UUID `gorm:"type:uuid;index"`
	TrainingNo  string    `gorm:"size:50;uniqueIndex;not null"`
	StartDate   time.Time
	EndDate     time.Time
	StartTime   string `gorm:"size:10"`
	EndTime     string `gorm:"size:10"`
	Location    string `gorm:"size:100"`
	Description string `gorm:"size:500"`
	Status      string `gorm:"size:20;default:'scheduled'"`
}

type RetryTaskStatus string

const (
	TaskStatusPending       RetryTaskStatus = "pending"
	TaskStatusQueued        RetryTaskStatus = "queued"
	TaskStatusProcessing    RetryTaskStatus = "processing"
	TaskStatusRetrying      RetryTaskStatus = "retrying"
	TaskStatusSuccess       RetryTaskStatus = "success"
	TaskStatusFailed        RetryTaskStatus = "failed"
	TaskStatusPartialFailed RetryTaskStatus = "partial_failed"
	TaskStatusManualTakeover RetryTaskStatus = "manual_takeover"
	TaskStatusCompensated   RetryTaskStatus = "compensated"
	TaskStatusDeadLetter    RetryTaskStatus = "dead_letter"
	TaskStatusFrozen        RetryTaskStatus = "frozen"
	TaskStatusClosed        RetryTaskStatus = "closed"
	TaskStatusCancelled     RetryTaskStatus = "cancelled"
	TaskStatusWithdrawn     RetryTaskStatus = "withdrawn"
	TaskStatusResubmitted   RetryTaskStatus = "resubmitted"
)

type ConflictType string

const (
	ConflictLeaveOverlap      ConflictType = "leave_overlap"
	ConflictTrainingOverlap   ConflictType = "training_overlap"
	ConflictLunchRule         ConflictType = "lunch_rule"
	ConflictWindowShortage    ConflictType = "window_shortage"
	ConflictForecastMismatch  ConflictType = "forecast_mismatch"
	ConflictScanMissing       ConflictType = "scan_missing"
)

type RetryTask struct {
	BaseModel
	BranchID          uuid.UUID     `gorm:"type:uuid;index"`
	BatchNo           string        `gorm:"size:50;uniqueIndex;not null"`
	TaskType          string        `gorm:"size:50"`
	Status            RetryTaskStatus `gorm:"size:30;index"`
	StatusBeforeFreeze RetryTaskStatus `gorm:"size:30"`
	Priority          int           `gorm:"default:0"`
	RetryCount        int           `gorm:"default:0"`
	MaxRetryCount     int           `gorm:"default:3"`
	NextRetryAt       *time.Time    `gorm:"index"`
	LastError         string        `gorm:"size:1000"`
	ConflictTypes     string        `gorm:"size:500"`
	ReviewRequired    bool          `gorm:"default:false"`
	ReviewedBy        uuid.UUID
	ReviewedAt        *time.Time
	ReviewComment     string        `gorm:"size:1000"`
	ManualOverride    bool          `gorm:"default:false"`
	OverriddenBy      uuid.UUID
	OverriddenAt      *time.Time
	OverrideReason    string        `gorm:"size:1000"`
	DataStrategy      string        `gorm:"size:20;default:'append'"`
	SubmittedBy       uuid.UUID
	SubmittedAt       time.Time
	CompensatedBy     uuid.UUID
	CompensatedAt     *time.Time
	ClosedBy          uuid.UUID
	ClosedAt          *time.Time
	SuccessCount      int           `gorm:"default:0"`
	FailedCount       int           `gorm:"default:0"`
	TotalCount        int           `gorm:"default:0"`
	ScheduleCount     int
	LeaveCount        int
	ForecastCount     int
	ScanCount         int
	SourceData        string        `gorm:"type:text"`
	ResultData        string        `gorm:"type:text"`
}

type RetryTaskItem struct {
	BaseModel
	TaskID          uuid.UUID     `gorm:"type:uuid;index"`
	ItemType        string        `gorm:"size:50"`
	ItemID          uuid.UUID     `gorm:"type:uuid"`
	Status          RetryTaskStatus `gorm:"size:30"`
	RetryCount      int           `gorm:"default:0"`
	LastError       string        `gorm:"size:1000"`
	ConflictType    string        `gorm:"size:50"`
	ConflictDetail  string        `gorm:"size:1000"`
	Resolved        bool          `gorm:"default:false"`
	ResolvedBy      uuid.UUID
	ResolvedAt      *time.Time
	ResolveComment  string        `gorm:"size:1000"`
}

type OperationType string

const (
	OpTypeSubmit        OperationType = "submit"
	OpTypeQueue         OperationType = "queue"
	OpTypeProcess       OperationType = "process"
	OpTypeRetry         OperationType = "retry"
	OpTypeSuccess       OperationType = "success"
	OpTypeFail          OperationType = "fail"
	OpTypeManualTakeover OperationType = "manual_takeover"
	OpTypeOverride      OperationType = "override"
	OpTypeCompensate    OperationType = "compensate"
	OpTypeClose         OperationType = "close"
	OpTypeFreeze        OperationType = "freeze"
	OpTypeUnfreeze      OperationType = "unfreeze"
	OpTypeWithdraw      OperationType = "withdraw"
	OpTypeResubmit      OperationType = "resubmit"
	OpTypeReview        OperationType = "review"
	OpTypeExport        OperationType = "export"
)

type OperationHistory struct {
	BaseModel
	TaskID          uuid.UUID     `gorm:"type:uuid;index"`
	ItemID          uuid.UUID     `gorm:"type:uuid;index"`
	OperationType   OperationType `gorm:"size:30;index"`
	OperatorID      uuid.UUID
	OperatorName    string        `gorm:"size:50"`
	OperationTime   time.Time
	FromStatus      string        `gorm:"size:30"`
	ToStatus        string        `gorm:"size:30"`
	BeforeSnapshot  string        `gorm:"type:text"`
	AfterSnapshot   string        `gorm:"type:text"`
	DiffSummary     string        `gorm:"size:1000"`
	Remark          string        `gorm:"size:1000"`
	IPAddress       string        `gorm:"size:50"`
	UserAgent       string        `gorm:"size:200"`
}

type DeadLetter struct {
	BaseModel
	TaskID          uuid.UUID `gorm:"type:uuid;index"`
	ItemID          uuid.UUID `gorm:"type:uuid"`
	ItemType        string    `gorm:"size:50"`
	FailedAt        time.Time
	ErrorCount      int
	LastError       string    `gorm:"size:1000"`
	ConflictType    string    `gorm:"size:50"`
	OriginalData    string    `gorm:"type:text"`
	Resolved        bool      `gorm:"default:false"`
	ResolvedBy      uuid.UUID
	ResolvedAt      *time.Time
	ResolveMethod   string    `gorm:"size:50"`
	ResolveComment  string    `gorm:"size:1000"`
	RestoredTaskID  uuid.UUID
}

type ExportRecord struct {
	BaseModel
	TaskID          uuid.UUID `gorm:"type:uuid;index"`
	ExportType      string    `gorm:"size:50"`
	ExportedBy      uuid.UUID
	ExportedAt      time.Time
	FileName        string    `gorm:"size:200"`
	FileHash        string    `gorm:"size:64"`
	RecordCount     int
	DataSnapshot    string    `gorm:"type:text"`
	Status          string    `gorm:"size:20;default:'completed'"`
}

type DailyStatistics struct {
	BaseModel
	BranchID        uuid.UUID `gorm:"type:uuid;index"`
	StatDate        time.Time `gorm:"index"`
	TotalTasks      int
	PendingCount    int
	ProcessingCount int
	SuccessCount    int
	FailedCount     int
	DeadLetterCount int
	ManualCount     int
	CompensatedCount int
	AvgRetryCount   float64
	ConflictByType  string `gorm:"type:text"`
}
