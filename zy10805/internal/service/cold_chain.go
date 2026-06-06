package service

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"cold-chain-review/internal/model"
	"cold-chain-review/internal/repository"
)

type ColdChainService struct {
	repo *repository.Repository
}

func NewColdChainService(repo *repository.Repository) *ColdChainService {
	return &ColdChainService{repo: repo}
}

type CreateExceptionRequest struct {
	TransferOrderID string    `json:"transfer_order_id"`
	ExceptionNo     string    `json:"exception_no"`
	Type            string    `json:"type"`
	Severity        string    `json:"severity"`
	Description     string    `json:"description"`
	ReporterID      string    `json:"reporter_id"`
	ReporterName    string    `json:"reporter_name"`
	FoundTime       time.Time `json:"found_time"`
	IdempotencyKey  string    `json:"idempotency_key"`
}

func (s *ColdChainService) RegisterException(req *CreateExceptionRequest) (*model.ExceptionRecord, error) {
	if req.ExceptionNo == "" {
		return nil, errors.New("exception_no is required")
	}
	if req.TransferOrderID == "" {
		return nil, errors.New("transfer_order_id is required")
	}
	if req.Type == "" {
		return nil, errors.New("exception type is required")
	}

	existing, err := s.repo.GetExceptionByNo(req.ExceptionNo)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("check existing exception failed: %w", err)
	}
	if existing != nil {
		return existing, nil
	}

	order, err := s.repo.GetTransferOrder(req.TransferOrderID)
	if err != nil {
		return nil, fmt.Errorf("get transfer order failed: %w", err)
	}
	if order == nil {
		return nil, errors.New("transfer order not found")
	}

	exception := &model.ExceptionRecord{
		ExceptionNo:     req.ExceptionNo,
		TransferOrderID: req.TransferOrderID,
		Type:            req.Type,
		Severity:        req.Severity,
		Description:     req.Description,
		ReporterID:      req.ReporterID,
		ReporterName:    req.ReporterName,
		Status:          model.ExceptionStatusPending,
		FoundTime:       req.FoundTime,
	}

	if exception.FoundTime.IsZero() {
		exception.FoundTime = time.Now()
	}

	err = s.repo.CreateExceptionRecord(exception)
	if err != nil {
		return nil, fmt.Errorf("create exception failed: %w", err)
	}

	err = s.repo.UpdateTransferOrderStatus(req.TransferOrderID, model.TransferStatusException)
	if err != nil {
		return nil, fmt.Errorf("update transfer order status failed: %w", err)
	}

	return exception, nil
}

type UploadEvidenceRequest struct {
	ExceptionID     string `json:"exception_id"`
	TransferOrderID string `json:"transfer_order_id"`
	Type            string `json:"type"`
	FileName        string `json:"file_name"`
	FileType        string `json:"file_type"`
	FileSize        int64  `json:"file_size"`
	UploaderID      string `json:"uploader_id"`
	UploaderName    string `json:"uploader_name"`
	Description     string `json:"description"`
	FilePath        string `json:"file_path"`
	IdempotencyKey  string `json:"idempotency_key"`
}

func (s *ColdChainService) UploadEvidence(req *UploadEvidenceRequest) (*model.Evidence, error) {
	if req.ExceptionID == "" && req.TransferOrderID == "" {
		return nil, errors.New("exception_id or transfer_order_id is required")
	}

	if req.ExceptionID != "" {
		exception, err := s.repo.GetExceptionRecord(req.ExceptionID)
		if err != nil {
			return nil, fmt.Errorf("get exception failed: %w", err)
		}
		if exception == nil {
			return nil, errors.New("exception not found")
		}
		if req.TransferOrderID == "" {
			req.TransferOrderID = exception.TransferOrderID
		}
	}

	evidence := &model.Evidence{
		ExceptionID:     req.ExceptionID,
		TransferOrderID: req.TransferOrderID,
		Type:            req.Type,
		FileName:        req.FileName,
		FileType:        req.FileType,
		FileSize:        req.FileSize,
		UploaderID:      req.UploaderID,
		UploaderName:    req.UploaderName,
		Description:     req.Description,
		FilePath:        req.FilePath,
	}

	err := s.repo.CreateEvidence(evidence)
	if err != nil {
		return nil, fmt.Errorf("create evidence failed: %w", err)
	}

	return evidence, nil
}

type SubmitReviewRequest struct {
	ExceptionID  string    `json:"exception_id"`
	ReviewerID   string    `json:"reviewer_id"`
	ReviewerName string    `json:"reviewer_name"`
	Conclusion   string    `json:"conclusion"`
	Opinion      string    `json:"opinion"`
	Status       string    `json:"status"`
	ReviewedAt   time.Time `json:"reviewed_at"`
	IdempotencyKey string  `json:"idempotency_key"`
}

func (s *ColdChainService) SubmitReview(req *SubmitReviewRequest) (*model.ReviewRecord, error) {
	if req.ExceptionID == "" {
		return nil, errors.New("exception_id is required")
	}
	if req.Status == "" {
		return nil, errors.New("status is required")
	}
	if req.Status != model.ReviewStatusApproved && req.Status != model.ReviewStatusRejected {
		return nil, errors.New("invalid review status")
	}

	exception, err := s.repo.GetExceptionRecord(req.ExceptionID)
	if err != nil {
		return nil, fmt.Errorf("get exception failed: %w", err)
	}
	if exception == nil {
		return nil, errors.New("exception not found")
	}

	existingReviews, err := s.repo.GetReviewsByException(req.ExceptionID)
	if err != nil {
		return nil, fmt.Errorf("get existing reviews failed: %w", err)
	}

	for _, r := range existingReviews {
		if r.Status == req.Status && r.Conclusion == req.Conclusion && r.Opinion == req.Opinion {
			return &r, nil
		}
	}

	review := &model.ReviewRecord{
		ExceptionID:     req.ExceptionID,
		TransferOrderID: exception.TransferOrderID,
		ReviewerID:      req.ReviewerID,
		ReviewerName:    req.ReviewerName,
		Conclusion:      req.Conclusion,
		Opinion:         req.Opinion,
		Status:          req.Status,
		ReviewedAt:      req.ReviewedAt,
	}

	if review.ReviewedAt.IsZero() {
		review.ReviewedAt = time.Now()
	}

	err = s.repo.CreateReviewRecord(review)
	if err != nil {
		return nil, fmt.Errorf("create review failed: %w", err)
	}

	exceptionStatus := model.ExceptionStatusConfirmed
	if req.Status == model.ReviewStatusRejected {
		exceptionStatus = model.ExceptionStatusClosed
	}
	err = s.repo.UpdateExceptionStatus(req.ExceptionID, exceptionStatus)
	if err != nil {
		return nil, fmt.Errorf("update exception status failed: %w", err)
	}

	return review, nil
}

type RevertReviewRequest struct {
	ReviewRecordID string `json:"review_record_id"`
	ExceptionID    string `json:"exception_id"`
	OperatorID     string `json:"operator_id"`
	OperatorName   string `json:"operator_name"`
	NewStatus      string `json:"new_status"`
	NewOpinion     string `json:"new_opinion"`
	NewConclusion  string `json:"new_conclusion"`
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"idempotency_key"`
}

func (s *ColdChainService) RevertReview(req *RevertReviewRequest) (*model.RevertLog, error) {
	if req.ReviewRecordID == "" {
		return nil, errors.New("review_record_id is required")
	}
	if req.Reason == "" {
		return nil, errors.New("revert reason is required")
	}

	review, err := s.repo.GetReviewRecord(req.ReviewRecordID)
	if err != nil {
		return nil, fmt.Errorf("get review failed: %w", err)
	}
	if review == nil {
		return nil, errors.New("review record not found")
	}

	if review.Status == model.ReviewStatusReverted {
		return nil, errors.New("review already reverted")
	}

	newStatus := req.NewStatus
	if newStatus == "" {
		newStatus = model.ReviewStatusReverted
	}

	revertLog := &model.RevertLog{
		ReviewRecordID:   req.ReviewRecordID,
		ExceptionID:      review.ExceptionID,
		OperatorID:       req.OperatorID,
		OperatorName:     req.OperatorName,
		BeforeStatus:     review.Status,
		AfterStatus:      newStatus,
		BeforeOpinion:    review.Opinion,
		AfterOpinion:     req.NewOpinion,
		BeforeConclusion: review.Conclusion,
		AfterConclusion:  req.NewConclusion,
		Reason:           req.Reason,
	}

	err = s.repo.CreateRevertLog(revertLog)
	if err != nil {
		return nil, fmt.Errorf("create revert log failed: %w", err)
	}

	review.Status = newStatus
	if req.NewOpinion != "" {
		review.Opinion = req.NewOpinion
	}
	if req.NewConclusion != "" {
		review.Conclusion = req.NewConclusion
	}

	err = s.repo.UpdateReviewRecord(review)
	if err != nil {
		return nil, fmt.Errorf("update review failed: %w", err)
	}

	err = s.repo.UpdateExceptionStatus(review.ExceptionID, model.ExceptionStatusReverted)
	if err != nil {
		return nil, fmt.Errorf("update exception status failed: %w", err)
	}

	return revertLog, nil
}

type CreateDisposalRequest struct {
	ExceptionID    string    `json:"exception_id"`
	ReviewRecordID string    `json:"review_record_id"`
	DisposalType   string    `json:"disposal_type"`
	HandlerID      string    `json:"handler_id"`
	HandlerName    string    `json:"handler_name"`
	Description    string    `json:"description"`
	DisposedAt     time.Time `json:"disposed_at"`
	IdempotencyKey string    `json:"idempotency_key"`
}

func (s *ColdChainService) CreateDisposal(req *CreateDisposalRequest) (*model.DisposalResult, error) {
	if req.ExceptionID == "" {
		return nil, errors.New("exception_id is required")
	}

	exception, err := s.repo.GetExceptionRecord(req.ExceptionID)
	if err != nil {
		return nil, fmt.Errorf("get exception failed: %w", err)
	}
	if exception == nil {
		return nil, errors.New("exception not found")
	}

	existingDisposal, err := s.repo.GetDisposalResultByException(req.ExceptionID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("check existing disposal failed: %w", err)
	}
	if existingDisposal != nil {
		return existingDisposal, nil
	}

	disposal := &model.DisposalResult{
		ExceptionID:     req.ExceptionID,
		TransferOrderID: exception.TransferOrderID,
		ReviewRecordID:  req.ReviewRecordID,
		DisposalType:    req.DisposalType,
		HandlerID:       req.HandlerID,
		HandlerName:     req.HandlerName,
		Description:     req.Description,
		DisposedAt:      req.DisposedAt,
	}

	if disposal.DisposedAt.IsZero() {
		disposal.DisposedAt = time.Now()
	}

	err = s.repo.CreateDisposalResult(disposal)
	if err != nil {
		return nil, fmt.Errorf("create disposal failed: %w", err)
	}

	err = s.repo.UpdateExceptionStatus(req.ExceptionID, model.ExceptionStatusClosed)
	if err != nil {
		return nil, fmt.Errorf("update exception status failed: %w", err)
	}

	err = s.repo.UpdateTransferOrderStatus(exception.TransferOrderID, model.TransferStatusClosed)
	if err != nil {
		return nil, fmt.Errorf("update transfer order status failed: %w", err)
	}

	return disposal, nil
}

func (s *ColdChainService) ExportReview(transferOrderID string, exportedBy string) (*model.ReviewExport, error) {
	if transferOrderID == "" {
		return nil, errors.New("transfer_order_id is required")
	}

	order, err := s.repo.GetTransferOrder(transferOrderID)
	if err != nil {
		return nil, fmt.Errorf("get transfer order failed: %w", err)
	}
	if order == nil {
		return nil, errors.New("transfer order not found")
	}

	drugBatch, err := s.repo.GetDrugBatch(order.DrugBatchID)
	if err != nil {
		return nil, fmt.Errorf("get drug batch failed: %w", err)
	}

	fromStore, err := s.repo.GetStore(order.FromStoreID)
	if err != nil {
		return nil, fmt.Errorf("get from store failed: %w", err)
	}

	toStore, err := s.repo.GetStore(order.ToStoreID)
	if err != nil {
		return nil, fmt.Errorf("get to store failed: %w", err)
	}

	var cabinet *model.ColdChainCabinet
	if order.CabinetID != "" {
		cabinet, err = s.repo.GetCabinet(order.CabinetID)
		if err != nil {
			return nil, fmt.Errorf("get cabinet failed: %w", err)
		}
	}

	var tempRecords []model.TemperatureRecord
	if order.CabinetID != "" && !order.OutboundTime.IsZero() {
		endTime := order.ExpectedArrive
		if endTime.IsZero() {
			endTime = time.Now()
		}
		tempRecords, err = s.repo.GetTemperatureRecordsByCabinet(order.CabinetID, order.OutboundTime, endTime)
		if err != nil {
			return nil, fmt.Errorf("get temperature records failed: %w", err)
		}
	}

	receivingReview, err := s.repo.GetReceivingReview(transferOrderID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("get receiving review failed: %w", err)
	}

	exceptions, err := s.repo.GetExceptionsByTransferOrder(transferOrderID)
	if err != nil {
		return nil, fmt.Errorf("get exceptions failed: %w", err)
	}

	var exceptionRecord *model.ExceptionRecord
	var evidences []model.Evidence
	var reviewRecords []model.ReviewRecord
	var disposalResult *model.DisposalResult
	var revertLogs []model.RevertLog

	if len(exceptions) > 0 {
		exceptionRecord = &exceptions[0]

		evidences, err = s.repo.GetEvidencesByException(exceptionRecord.ID)
		if err != nil {
			return nil, fmt.Errorf("get evidences failed: %w", err)
		}

		reviewRecords, err = s.repo.GetReviewsByException(exceptionRecord.ID)
		if err != nil {
			return nil, fmt.Errorf("get reviews failed: %w", err)
		}

		disposalResult, err = s.repo.GetDisposalResultByException(exceptionRecord.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get disposal result failed: %w", err)
		}

		revertLogs, err = s.repo.GetRevertLogsByException(exceptionRecord.ID)
		if err != nil {
			return nil, fmt.Errorf("get revert logs failed: %w", err)
		}
	}

	export := &model.ReviewExport{
		ID:                 uuid.New().String(),
		ExportNo:           fmt.Sprintf("EXP-%s", time.Now().Format("20060102150405")),
		TransferOrder:      order,
		DrugBatch:          drugBatch,
		FromStore:          fromStore,
		ToStore:            toStore,
		Cabinet:            cabinet,
		TemperatureRecords: tempRecords,
		ReceivingReview:    receivingReview,
		ExceptionRecord:    exceptionRecord,
		Evidences:          evidences,
		ReviewRecords:      reviewRecords,
		DisposalResult:     disposalResult,
		RevertLogs:         revertLogs,
		ExportedAt:         time.Now(),
		ExportedBy:         exportedBy,
	}

	return export, nil
}

func (s *ColdChainService) ExportReviewToJSON(transferOrderID string, exportedBy string) (string, error) {
	export, err := s.ExportReview(transferOrderID, exportedBy)
	if err != nil {
		return "", err
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal export failed: %w", err)
	}

	return string(data), nil
}

func (s *ColdChainService) CreateStore(store *model.Store) error {
	return s.repo.CreateStore(store)
}

func (s *ColdChainService) CreateDrugBatch(batch *model.DrugBatch) error {
	return s.repo.CreateDrugBatch(batch)
}

func (s *ColdChainService) CreateCabinet(cabinet *model.ColdChainCabinet) error {
	return s.repo.CreateCabinet(cabinet)
}

func (s *ColdChainService) CreateTransferOrder(order *model.TransferOrder) error {
	existing, err := s.repo.GetTransferOrderByNo(order.OrderNo)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if existing != nil {
		return nil
	}
	return s.repo.CreateTransferOrder(order)
}

func (s *ColdChainService) CreateTemperatureRecord(rec *model.TemperatureRecord) error {
	return s.repo.CreateTemperatureRecord(rec)
}

func (s *ColdChainService) CreateReceivingReview(review *model.ReceivingReview) error {
	existing, err := s.repo.GetReceivingReview(review.TransferOrderID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if existing != nil {
		return nil
	}
	return s.repo.CreateReceivingReview(review)
}

func (s *ColdChainService) GetException(id string) (*model.ExceptionRecord, error) {
	return s.repo.GetExceptionRecord(id)
}

func (s *ColdChainService) GetReview(id string) (*model.ReviewRecord, error) {
	return s.repo.GetReviewRecord(id)
}

func (s *ColdChainService) GetEvidences(exceptionID string) ([]model.Evidence, error) {
	return s.repo.GetEvidencesByException(exceptionID)
}

func (s *ColdChainService) GetRevertLogs(reviewID string) ([]model.RevertLog, error) {
	return s.repo.GetRevertLogsByReview(reviewID)
}

func (s *ColdChainService) GetTransferOrder(id string) (*model.TransferOrder, error) {
	return s.repo.GetTransferOrder(id)
}

func (s *ColdChainService) GetTransferOrderByNo(orderNo string) (*model.TransferOrder, error) {
	return s.repo.GetTransferOrderByNo(orderNo)
}
