package models

import (
	"time"

	"github.com/google/uuid"
)

type BatchStatus string

const (
	BatchStatusDraft      BatchStatus = "DRAFT"
	BatchStatusSubmitted  BatchStatus = "SUBMITTED"
	BatchStatusReviewing  BatchStatus = "REVIEWING"
	BatchStatusPartial    BatchStatus = "PARTIAL"
	BatchStatusApproved   BatchStatus = "APPROVED"
	BatchStatusRejected   BatchStatus = "REJECTED"
	BatchStatusFrozen     BatchStatus = "FROZEN"
	BatchStatusExported   BatchStatus = "EXPORTED"
	BatchStatusCancelled  BatchStatus = "CANCELLED"
)

type DuplicateStrategy string

const (
	DuplicateStrategyIgnore  DuplicateStrategy = "IGNORE"
	DuplicateStrategyOverwrite DuplicateStrategy = "OVERWRITE"
	DuplicateStrategyAppend  DuplicateStrategy = "APPEND"
)

type Batch struct {
	ID                uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	BatchNo           string            `json:"batch_no" gorm:"uniqueIndex;size:64"`
	StoreID           string            `json:"store_id" gorm:"size:32;index"`
	StoreName         string            `json:"store_name" gorm:"size:128"`
	OperatorID        string            `json:"operator_id" gorm:"size:32"`
	OperatorName      string            `json:"operator_name" gorm:"size:64"`
	Status            BatchStatus       `json:"status" gorm:"size:32;index"`
	TotalAmount       float64           `json:"total_amount"`
	TotalRecords      int               `json:"total_records"`
	MatchedRecords    int               `json:"matched_records"`
	MismatchedRecords int               `json:"mismatched_records"`
	Remark            string            `json:"remark" gorm:"size:512"`
	ParentBatchID     *uuid.UUID        `json:"parent_batch_id" gorm:"type:uuid;index"`
	Version           int               `json:"version"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
	Histories         []StatusHistory   `json:"histories,omitempty" gorm:"foreignKey:BatchID"`
	Recharges         []RechargeRecord  `json:"recharges,omitempty" gorm:"foreignKey:BatchID"`
	Refunds           []RefundApplication `json:"refunds,omitempty" gorm:"foreignKey:BatchID"`
	Handovers         []StoreHandover   `json:"handovers,omitempty" gorm:"foreignKey:BatchID"`
	Evidences         []Evidence        `json:"evidences,omitempty" gorm:"foreignKey:BatchID"`
}

type RechargeRecord struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID        uuid.UUID  `json:"batch_id" gorm:"type:uuid;index"`
	TransNo        string     `json:"trans_no" gorm:"uniqueIndex;size:64"`
	MemberID       string     `json:"member_id" gorm:"size:32;index"`
	MemberName     string     `json:"member_name" gorm:"size:64"`
	StoreID        string     `json:"store_id" gorm:"size:32;index"`
	StoreName      string     `json:"store_name" gorm:"size:128"`
	Amount         float64    `json:"amount"`
	BeforeBalance  float64    `json:"before_balance"`
	AfterBalance   float64    `json:"after_balance"`
	PayMethod      string     `json:"pay_method" gorm:"size:32"`
	OperatorID     string     `json:"operator_id" gorm:"size:32"`
	OperatorName   string     `json:"operator_name" gorm:"size:64"`
	TransTime      time.Time  `json:"trans_time"`
	Status         string     `json:"status" gorm:"size:32"`
	IsCancelled    bool       `json:"is_cancelled"`
	CancelTime     *time.Time `json:"cancel_time,omitempty"`
	CancelOperator *string    `json:"cancel_operator,omitempty" gorm:"size:64"`
	Remark         string     `json:"remark" gorm:"size:512"`
	CreatedAt      time.Time  `json:"created_at"`
}

type RefundApplication struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID      uuid.UUID  `json:"batch_id" gorm:"type:uuid;index"`
	RefundNo     string     `json:"refund_no" gorm:"uniqueIndex;size:64"`
	TransNo      string     `json:"trans_no" gorm:"size:64;index"`
	MemberID     string     `json:"member_id" gorm:"size:32;index"`
	MemberName   string     `json:"member_name" gorm:"size:64"`
	StoreID      string     `json:"store_id" gorm:"size:32;index"`
	StoreName    string     `json:"store_name" gorm:"size:128"`
	Amount       float64    `json:"amount"`
	Reason       string     `json:"reason" gorm:"size:256"`
	ApplicantID  string     `json:"applicant_id" gorm:"size:32"`
	ApplicantName string    `json:"applicant_name" gorm:"size:64"`
	ApplyTime    time.Time  `json:"apply_time"`
	ApproverID   *string    `json:"approver_id,omitempty" gorm:"size:32"`
	ApproverName *string    `json:"approver_name,omitempty" gorm:"size:64"`
	ApproveTime  *time.Time `json:"approve_time,omitempty"`
	Status       string     `json:"status" gorm:"size:32"`
	Remark       string     `json:"remark" gorm:"size:512"`
	CreatedAt    time.Time  `json:"created_at"`
}

type StoreHandover struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID       uuid.UUID `json:"batch_id" gorm:"type:uuid;index"`
	HandoverNo    string    `json:"handover_no" gorm:"uniqueIndex;size:64"`
	StoreID       string    `json:"store_id" gorm:"size:32;index"`
	StoreName     string    `json:"store_name" gorm:"size:128"`
	Shift         string    `json:"shift" gorm:"size:32"`
	HandoverDate  time.Time `json:"handover_date"`
	FromOperatorID   string  `json:"from_operator_id" gorm:"size:32"`
	FromOperatorName string `json:"from_operator_name" gorm:"size:64"`
	ToOperatorID     string  `json:"to_operator_id" gorm:"size:32"`
	ToOperatorName   string  `json:"to_operator_name" gorm:"size:64"`
	CashAmount      float64 `json:"cash_amount"`
	POSAmount       float64 `json:"pos_amount"`
	PrepaidAmount   float64 `json:"prepaid_amount"`
	TotalAmount     float64 `json:"total_amount"`
	ActualAmount    float64 `json:"actual_amount"`
	Difference      float64 `json:"difference"`
	SupervisorID    *string `json:"supervisor_id,omitempty" gorm:"size:32"`
	SupervisorName  *string `json:"supervisor_name,omitempty" gorm:"size:64"`
	Status          string  `json:"status" gorm:"size:32"`
	Remark          string  `json:"remark" gorm:"size:512"`
	CreatedAt       time.Time `json:"created_at"`
}

type Evidence struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID     uuid.UUID `json:"batch_id" gorm:"type:uuid;index"`
	EvidenceNo  string    `json:"evidence_no" gorm:"size:64"`
	EvidenceType string   `json:"evidence_type" gorm:"size:32"`
	FileName    string    `json:"file_name" gorm:"size:256"`
	FileType    string    `json:"file_type" gorm:"size:32"`
	FileSize    int64     `json:"file_size"`
	FilePath    string    `json:"file_path" gorm:"size:512"`
	UploaderID  string    `json:"uploader_id" gorm:"size:32"`
	UploaderName string   `json:"uploader_name" gorm:"size:64"`
	Description string    `json:"description" gorm:"size:512"`
	TransNo     *string   `json:"trans_no,omitempty" gorm:"size:64"`
	MemberID    *string   `json:"member_id,omitempty" gorm:"size:32"`
	CreatedAt   time.Time `json:"created_at"`
}

type StatusHistory struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID     uuid.UUID   `json:"batch_id" gorm:"type:uuid;index"`
	FromStatus  BatchStatus `json:"from_status" gorm:"size:32"`
	ToStatus    BatchStatus `json:"to_status" gorm:"size:32"`
	OperatorID  string      `json:"operator_id" gorm:"size:32"`
	OperatorName string     `json:"operator_name" gorm:"size:64"`
	Reason      string      `json:"reason" gorm:"size:512"`
	ChangeTime  time.Time   `json:"change_time"`
	IPAddress   string      `json:"ip_address" gorm:"size:64"`
	UserAgent   string      `json:"user_agent" gorm:"size:512"`
	CreatedAt   time.Time   `json:"created_at"`
}

type BalanceHistory struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID       uuid.UUID  `json:"batch_id" gorm:"type:uuid;index"`
	MemberID      string     `json:"member_id" gorm:"size:32;index"`
	MemberName    string     `json:"member_name" gorm:"size:64"`
	TransNo       string     `json:"trans_no" gorm:"size:64;index"`
	TransType     string     `json:"trans_type" gorm:"size:32"`
	StoreID       string     `json:"store_id" gorm:"size:32;index"`
	StoreName     string     `json:"store_name" gorm:"size:128"`
	Amount        float64    `json:"amount"`
	BeforeBalance float64    `json:"before_balance"`
	AfterBalance  float64    `json:"after_balance"`
	TransTime     time.Time  `json:"trans_time"`
	IsCrossStore  bool       `json:"is_cross_store"`
	IsCancelled   bool       `json:"is_cancelled"`
	CancelTransNo *string    `json:"cancel_trans_no,omitempty" gorm:"size:64"`
	Reconciled    bool       `json:"reconciled"`
	Remark        string     `json:"remark" gorm:"size:512"`
	CreatedAt     time.Time  `json:"created_at"`
}

type AuditLog struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID     *uuid.UUID `json:"batch_id,omitempty" gorm:"type:uuid;index"`
	Action      string    `json:"action" gorm:"size:64"`
	ResourceType string   `json:"resource_type" gorm:"size:64"`
	ResourceID  string    `json:"resource_id" gorm:"size:64"`
	OperatorID  string    `json:"operator_id" gorm:"size:32"`
	OperatorName string   `json:"operator_name" gorm:"size:64"`
	IPAddress   string    `json:"ip_address" gorm:"size:64"`
	UserAgent   string    `json:"user_agent" gorm:"size:512"`
	BeforeData  string    `json:"before_data" gorm:"type:text"`
	AfterData   string    `json:"after_data" gorm:"type:text"`
	Remark      string    `json:"remark" gorm:"size:512"`
	CreatedAt   time.Time `json:"created_at"`
}

type ReconciliationResult struct {
	ID                uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	BatchID           uuid.UUID `json:"batch_id" gorm:"type:uuid;index"`
	MemberID          string    `json:"member_id" gorm:"size:32;index"`
	TransNo           string    `json:"trans_no" gorm:"size:64;index"`
	MatchStatus       string    `json:"match_status" gorm:"size:32"`
	ExpectedBalance   float64   `json:"expected_balance"`
	ActualBalance     float64   `json:"actual_balance"`
	Difference        float64   `json:"difference"`
	CrossStoreCheck   string    `json:"cross_store_check" gorm:"size:32"`
	CancelCheck       string    `json:"cancel_check" gorm:"size:32"`
	HistoryContinuous bool      `json:"history_continuous"`
	GapBefore         *float64  `json:"gap_before,omitempty"`
	GapAfter          *float64  `json:"gap_after,omitempty"`
	OperatorID        string    `json:"operator_id" gorm:"size:32"`
	OperatorName      string    `json:"operator_name" gorm:"size:64"`
	Remark            string    `json:"remark" gorm:"size:512"`
	CreatedAt         time.Time `json:"created_at"`
}

func NewBatch(storeID, storeName, operatorID, operatorName string) *Batch {
	return &Batch{
		ID:           uuid.New(),
		BatchNo:      generateBatchNo(),
		StoreID:      storeID,
		StoreName:    storeName,
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Status:       BatchStatusDraft,
		Version:      1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

func generateBatchNo() string {
	return "B" + time.Now().Format("20060102150405") + uuid.NewString()[:8]
}
