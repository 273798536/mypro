package model

import (
	"time"
)

type Store struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type DrugBatch struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	DrugName    string    `json:"drug_name"`
	BatchNo     string    `json:"batch_no"`
	Spec        string    `json:"spec"`
	Manufacturer string   `json:"manufacturer"`
	MinTemp     float64   `json:"min_temp"`
	MaxTemp     float64   `json:"max_temp"`
	ExpiryDate  time.Time `json:"expiry_date"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ColdChainCabinet struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	CabinetNo   string    `json:"cabinet_no"`
	StoreID     string    `json:"store_id"`
	ProbeID     string    `json:"probe_id"`
	MinTemp     float64   `json:"min_temp"`
	MaxTemp     float64   `json:"max_temp"`
	Status      string    `json:"status"`
	LastCalibAt time.Time `json:"last_calib_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type TemperatureRecord struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	CabinetID    string    `json:"cabinet_id"`
	ProbeID      string    `json:"probe_id"`
	Temperature  float64   `json:"temperature"`
	RecordTime   time.Time `json:"record_time"`
	IsAnomaly    bool      `json:"is_anomaly"`
	IsGap        bool      `json:"is_gap"`
	GapMinutes   int       `json:"gap_minutes"`
	ProbeAnomaly bool      `json:"probe_anomaly"`
	CreatedAt    time.Time `json:"created_at"`
}

type TransferOrder struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	OrderNo        string    `json:"order_no"`
	FromStoreID    string    `json:"from_store_id"`
	ToStoreID      string    `json:"to_store_id"`
	DrugBatchID    string    `json:"drug_batch_id"`
	Quantity       int       `json:"quantity"`
	CabinetID      string    `json:"cabinet_id"`
	OutboundTime   time.Time `json:"outbound_time"`
	ExpectedArrive time.Time `json:"expected_arrive"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ReceivingReview struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	TransferOrderID string    `json:"transfer_order_id"`
	ReviewerID      string    `json:"reviewer_id"`
	ReviewerName    string    `json:"reviewer_name"`
	ReceiveTime     time.Time `json:"receive_time"`
	PackageIntact   bool      `json:"package_intact"`
	TempOnArrival   float64   `json:"temp_on_arrival"`
	IsQualified     bool      `json:"is_qualified"`
	Remark          string    `json:"remark"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ExceptionRecord struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	ExceptionNo     string    `json:"exception_no"`
	TransferOrderID string    `json:"transfer_order_id"`
	Type            string    `json:"type"`
	Severity        string    `json:"severity"`
	Description     string    `json:"description"`
	ReporterID      string    `json:"reporter_id"`
	ReporterName    string    `json:"reporter_name"`
	Status          string    `json:"status"`
	FoundTime       time.Time `json:"found_time"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Evidence struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	ExceptionID     string    `json:"exception_id"`
	TransferOrderID string    `json:"transfer_order_id"`
	Type            string    `json:"type"`
	FileName        string    `json:"file_name"`
	FileType        string    `json:"file_type"`
	FileSize        int64     `json:"file_size"`
	UploaderID      string    `json:"uploader_id"`
	UploaderName    string    `json:"uploader_name"`
	Description     string    `json:"description"`
	FilePath        string    `json:"file_path"`
	CreatedAt       time.Time `json:"created_at"`
}

type ReviewRecord struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	ExceptionID     string    `json:"exception_id"`
	TransferOrderID string    `json:"transfer_order_id"`
	ReviewerID      string    `json:"reviewer_id"`
	ReviewerName    string    `json:"reviewer_name"`
	Conclusion      string    `json:"conclusion"`
	Opinion         string    `json:"opinion"`
	Status          string    `json:"status"`
	ReviewedAt      time.Time `json:"reviewed_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type DisposalResult struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	ExceptionID     string    `json:"exception_id"`
	TransferOrderID string    `json:"transfer_order_id"`
	ReviewRecordID  string    `json:"review_record_id"`
	DisposalType    string    `json:"disposal_type"`
	HandlerID       string    `json:"handler_id"`
	HandlerName     string    `json:"handler_name"`
	Description     string    `json:"description"`
	DisposedAt      time.Time `json:"disposed_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type RevertLog struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	ReviewRecordID string    `json:"review_record_id"`
	ExceptionID    string    `json:"exception_id"`
	OperatorID     string    `json:"operator_id"`
	OperatorName   string    `json:"operator_name"`
	BeforeStatus   string    `json:"before_status"`
	AfterStatus    string    `json:"after_status"`
	BeforeOpinion  string    `json:"before_opinion"`
	AfterOpinion   string    `json:"after_opinion"`
	BeforeConclusion string  `json:"before_conclusion"`
	AfterConclusion string   `json:"after_conclusion"`
	Reason         string    `json:"reason"`
	RevertedAt     time.Time `json:"reverted_at"`
	CreatedAt      time.Time `json:"created_at"`
}

type ReviewExport struct {
	ID               string             `json:"id"`
	ExportNo         string             `json:"export_no"`
	TransferOrder    *TransferOrder     `json:"transfer_order"`
	DrugBatch        *DrugBatch         `json:"drug_batch"`
	FromStore        *Store             `json:"from_store"`
	ToStore          *Store             `json:"to_store"`
	Cabinet          *ColdChainCabinet  `json:"cabinet"`
	TemperatureRecords []TemperatureRecord `json:"temperature_records"`
	ReceivingReview  *ReceivingReview   `json:"receiving_review"`
	ExceptionRecord  *ExceptionRecord   `json:"exception_record"`
	Evidences        []Evidence         `json:"evidences"`
	ReviewRecords    []ReviewRecord     `json:"review_records"`
	DisposalResult   *DisposalResult    `json:"disposal_result"`
	RevertLogs       []RevertLog        `json:"revert_logs"`
	ExportedAt       time.Time          `json:"exported_at"`
	ExportedBy       string             `json:"exported_by"`
}

const (
	TransferStatusCreated    = "created"
	TransferStatusShipped    = "shipped"
	TransferStatusReceived   = "received"
	TransferStatusException  = "exception"
	TransferStatusClosed     = "closed"

	ExceptionStatusPending   = "pending"
	ExceptionStatusReviewing = "reviewing"
	ExceptionStatusConfirmed = "confirmed"
	ExceptionStatusReverted  = "reverted"
	ExceptionStatusClosed    = "closed"

	ExceptionTypeTempBreak   = "temp_break"
	ExceptionTypeTempGap     = "temp_gap"
	ExceptionTypeProbeFault  = "probe_fault"
	ExceptionTypePackageDamaged = "package_damaged"
	ExceptionTypeLateArrival = "late_arrival"
	ExceptionTypeOther       = "other"

	ReviewStatusPending      = "pending"
	ReviewStatusApproved     = "approved"
	ReviewStatusRejected     = "rejected"
	ReviewStatusReverted     = "reverted"

	SeverityLow     = "low"
	SeverityMedium  = "medium"
	SeverityHigh    = "high"
	SeverityCritical = "critical"
)
