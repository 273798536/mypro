package dto

import (
	"time"

	"github.com/google/uuid"

	"store-prepaid-audit/models"
)

type CreateBatchRequest struct {
	StoreID   string `json:"store_id" binding:"required"`
	StoreName string `json:"store_name" binding:"required"`
}

type CreateBatchResponse struct {
	ID      uuid.UUID `json:"id"`
	BatchNo string    `json:"batch_no"`
	Status  string    `json:"status"`
}

type BatchResponse struct {
	ID                uuid.UUID `json:"id"`
	BatchNo           string    `json:"batch_no"`
	StoreID           string    `json:"store_id"`
	StoreName         string    `json:"store_name"`
	OperatorID        string    `json:"operator_id"`
	OperatorName      string    `json:"operator_name"`
	Status            string    `json:"status"`
	TotalAmount       float64   `json:"total_amount"`
	TotalRecords      int       `json:"total_records"`
	MatchedRecords    int       `json:"matched_records"`
	MismatchedRecords int       `json:"mismatched_records"`
	Remark            string    `json:"remark"`
	Version           int       `json:"version"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type BatchListRequest struct {
	StoreID  string `form:"store_id"`
	Status   string `form:"status"`
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
}

type BatchListResponse struct {
	Total  int64          `json:"total"`
	Page   int            `json:"page"`
	Size   int            `json:"size"`
	Items  []BatchResponse `json:"items"`
}

type StatusChangeRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type AddRecordsRequest struct {
	Strategy          string                      `json:"strategy" binding:"required,oneof=IGNORE OVERWRITE APPEND"`
	RechargeRecords   []models.RechargeRecord    `json:"recharge_records"`
	RefundRecords     []models.RefundApplication `json:"refund_records"`
	HandoverRecords   []models.StoreHandover     `json:"handover_records"`
}

type AddRecordsResponse struct {
	AddedRecharges  int `json:"added_recharges"`
	AddedRefunds    int `json:"added_refunds"`
	AddedHandovers  int `json:"added_handovers"`
}

type GenerateDataRequest struct {
	RechargeCount  int  `json:"recharge_count" binding:"min=1,max=1000"`
	RefundCount    int  `json:"refund_count" binding:"min=0,max=100"`
	HandoverCount  int  `json:"handover_count" binding:"min=0,max=50"`
	IncludeErrors  bool `json:"include_errors"`
}

type GenerateDataResponse struct {
	GeneratedRecharges int `json:"generated_recharges"`
	GeneratedRefunds   int `json:"generated_refunds"`
	GeneratedHandovers int `json:"generated_handovers"`
}

type ReconcileResponse struct {
	TotalRecords      int `json:"total_records"`
	MatchedRecords    int `json:"matched_records"`
	MismatchedRecords int `json:"mismatched_records"`
	CrossStoreCount   int `json:"cross_store_count"`
	CancelledCount    int `json:"cancelled_count"`
	GapsFound         int `json:"gaps_found"`
}

type ExportResponse struct {
	FilePath string `json:"file_path"`
	FileName string `json:"file_name"`
}

type PlaybackRequest struct {
	MemberID  string    `form:"member_id" binding:"required"`
	StartTime time.Time `form:"start_time" binding:"required"`
	EndTime   time.Time `form:"end_time" binding:"required"`
}

type PlaybackResponse struct {
	Records       []models.BalanceHistory `json:"records"`
	FinalBalance  float64                 `json:"final_balance"`
}

type AuditLogListRequest struct {
	BatchID      string `form:"batch_id"`
	Action       string `form:"action"`
	ResourceType string `form:"resource_type"`
	Page         int    `form:"page,default=1"`
	PageSize     int    `form:"page_size,default=20"`
}

type AuditLogResponse struct {
	ID           uuid.UUID `json:"id"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	OperatorID   string    `json:"operator_id"`
	OperatorName string    `json:"operator_name"`
	IPAddress    string    `json:"ip_address"`
	BeforeData   string    `json:"before_data"`
	AfterData    string    `json:"after_data"`
	Remark       string    `json:"remark"`
	CreatedAt    time.Time `json:"created_at"`
}

type AuditLogListResponse struct {
	Total int64               `json:"total"`
	Page  int                 `json:"page"`
	Size  int                 `json:"size"`
	Items []AuditLogResponse  `json:"items"`
}

type ReconciliationResultResponse struct {
	MemberID          string  `json:"member_id"`
	TransNo           string  `json:"trans_no"`
	MatchStatus       string  `json:"match_status"`
	ExpectedBalance   float64 `json:"expected_balance"`
	ActualBalance     float64 `json:"actual_balance"`
	Difference        float64 `json:"difference"`
	CrossStoreCheck   string  `json:"cross_store_check"`
	CancelCheck       string  `json:"cancel_check"`
	HistoryContinuous bool    `json:"history_continuous"`
	Remark            string  `json:"remark"`
}
