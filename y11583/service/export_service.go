package service

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"store-prepaid-audit/config"
	"store-prepaid-audit/models"
	"store-prepaid-audit/repository"
)

type ExportService struct {
	cfg                 *config.ExportConfig
	batchRepo           *repository.BatchRepository
	rechargeRepo        *repository.RechargeRepository
	refundRepo          *repository.RefundRepository
	handoverRepo        *repository.HandoverRepository
	balanceHistoryRepo  *repository.BalanceHistoryRepository
	reconciliationRepo  *repository.ReconciliationRepository
}

func NewExportService(cfg *config.ExportConfig, db interface{}) *ExportService {
	return &ExportService{
		cfg: cfg,
	}
}

func (s *ExportService) SetRepos(
	batchRepo *repository.BatchRepository,
	rechargeRepo *repository.RechargeRepository,
	refundRepo *repository.RefundRepository,
	handoverRepo *repository.HandoverRepository,
	balanceHistoryRepo *repository.BalanceHistoryRepository,
	reconciliationRepo *repository.ReconciliationRepository,
) {
	s.batchRepo = batchRepo
	s.rechargeRepo = rechargeRepo
	s.refundRepo = refundRepo
	s.handoverRepo = handoverRepo
	s.balanceHistoryRepo = balanceHistoryRepo
	s.reconciliationRepo = reconciliationRepo
}

func (s *ExportService) ExportBatch(batchID uuid.UUID, opCtx OperatorContext) (string, error) {
	if err := os.MkdirAll(s.cfg.Directory, 0755); err != nil {
		return "", err
	}

	batch, err := s.batchRepo.GetByID(batchID)
	if err != nil {
		return "", err
	}

	fileName := fmt.Sprintf("批次_%s_%s.xlsx", batch.BatchNo, time.Now().Format("20060102150405"))
	filePath := filepath.Join(s.cfg.Directory, fileName)

	f := excelize.NewFile()

	if err := s.exportBatchSummary(f, batch); err != nil {
		return "", err
	}

	if err := s.exportRecharges(f, batchID); err != nil {
		return "", err
	}

	if err := s.exportRefunds(f, batchID); err != nil {
		return "", err
	}

	if err := s.exportHandovers(f, batchID); err != nil {
		return "", err
	}

	if err := s.exportBalanceHistory(f, batchID); err != nil {
		return "", err
	}

	if err := s.exportReconciliation(f, batchID); err != nil {
		return "", err
	}

	if err := s.exportStatusHistory(f, batch); err != nil {
		return "", err
	}

	if err := f.SaveAs(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *ExportService) exportBatchSummary(f *excelize.File, batch *models.Batch) error {
	sheetName := "批次概览"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"字段", "值"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	data := [][]interface{}{
		{"批次号", batch.BatchNo},
		{"门店ID", batch.StoreID},
		{"门店名称", batch.StoreName},
		{"创建人ID", batch.OperatorID},
		{"创建人", batch.OperatorName},
		{"当前状态", batch.Status},
		{"版本", batch.Version},
		{"总金额", batch.TotalAmount},
		{"总记录数", batch.TotalRecords},
		{"匹配记录数", batch.MatchedRecords},
		{"不匹配记录数", batch.MismatchedRecords},
		{"备注", batch.Remark},
		{"创建时间", batch.CreatedAt.Format("2006-01-02 15:04:05")},
		{"更新时间", batch.UpdatedAt.Format("2006-01-02 15:04:05")},
	}

	for i, row := range data {
		for j, val := range row {
			cell := fmt.Sprintf("%c%d", 'A'+j, i+2)
			f.SetCellValue(sheetName, cell, val)
		}
	}

	f.SetColWidth(sheetName, "A", "A", 20)
	f.SetColWidth(sheetName, "B", "B", 40)

	return nil
}

func (s *ExportService) exportRecharges(f *excelize.File, batchID uuid.UUID) error {
	sheetName := "充值流水"
	f.NewSheet(sheetName)

	headers := []string{"交易号", "会员ID", "会员姓名", "门店ID", "门店名称", "金额", "充值前余额", "充值后余额",
		"支付方式", "操作人ID", "操作人", "交易时间", "状态", "是否撤销", "撤销时间", "撤销人", "备注"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	recharges, err := s.rechargeRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	for i, r := range recharges {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), r.TransNo)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), r.MemberID)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), r.MemberName)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), r.StoreID)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), r.StoreName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), r.Amount)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), r.BeforeBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), r.AfterBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), r.PayMethod)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), r.OperatorID)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), r.OperatorName)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), r.TransTime.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), r.Status)
		f.SetCellValue(sheetName, fmt.Sprintf("N%d", row), r.IsCancelled)
		if r.CancelTime != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("O%d", row), r.CancelTime.Format("2006-01-02 15:04:05"))
		}
		if r.CancelOperator != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("P%d", row), *r.CancelOperator)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("Q%d", row), r.Remark)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 18)
	}

	return nil
}

func (s *ExportService) exportRefunds(f *excelize.File, batchID uuid.UUID) error {
	sheetName := "退款申请"
	f.NewSheet(sheetName)

	headers := []string{"退款单号", "原交易号", "会员ID", "会员姓名", "门店ID", "门店名称", "退款金额",
		"退款原因", "申请人ID", "申请人", "申请时间", "审批人ID", "审批人", "审批时间", "状态", "备注"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	refunds, err := s.refundRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	for i, r := range refunds {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), r.RefundNo)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), r.TransNo)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), r.MemberID)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), r.MemberName)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), r.StoreID)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), r.StoreName)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), r.Amount)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), r.Reason)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), r.ApplicantID)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), r.ApplicantName)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), r.ApplyTime.Format("2006-01-02 15:04:05"))
		if r.ApproverID != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), *r.ApproverID)
		}
		if r.ApproverName != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), *r.ApproverName)
		}
		if r.ApproveTime != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("N%d", row), r.ApproveTime.Format("2006-01-02 15:04:05"))
		}
		f.SetCellValue(sheetName, fmt.Sprintf("O%d", row), r.Status)
		f.SetCellValue(sheetName, fmt.Sprintf("P%d", row), r.Remark)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 18)
	}

	return nil
}

func (s *ExportService) exportHandovers(f *excelize.File, batchID uuid.UUID) error {
	sheetName := "门店交接表"
	f.NewSheet(sheetName)

	headers := []string{"交接单号", "门店ID", "门店名称", "班次", "交接日期",
		"交班人ID", "交班人", "接班人ID", "接班人", "现金金额", "POS金额",
		"储值金额", "账面总额", "实际金额", "差异", "主管ID", "主管", "状态", "备注"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	handovers, err := s.handoverRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	for i, h := range handovers {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), h.HandoverNo)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), h.StoreID)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), h.StoreName)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), h.Shift)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), h.HandoverDate.Format("2006-01-02"))
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), h.FromOperatorID)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), h.FromOperatorName)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), h.ToOperatorID)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), h.ToOperatorName)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), h.CashAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), h.POSAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), h.PrepaidAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), h.TotalAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("N%d", row), h.ActualAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("O%d", row), h.Difference)
		if h.SupervisorID != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("P%d", row), *h.SupervisorID)
		}
		if h.SupervisorName != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("Q%d", row), *h.SupervisorName)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("R%d", row), h.Status)
		f.SetCellValue(sheetName, fmt.Sprintf("S%d", row), h.Remark)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 15)
	}

	return nil
}

func (s *ExportService) exportBalanceHistory(f *excelize.File, batchID uuid.UUID) error {
	sheetName := "余额历史"
	f.NewSheet(sheetName)

	headers := []string{"会员ID", "会员姓名", "交易号", "交易类型", "门店ID", "门店名称",
		"金额", "交易前余额", "交易后余额", "交易时间", "是否跨店", "是否撤销", "备注"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	histories, err := s.balanceHistoryRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	for i, h := range histories {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), h.MemberID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), h.MemberName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), h.TransNo)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), h.TransType)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), h.StoreID)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), h.StoreName)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), h.Amount)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), h.BeforeBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), h.AfterBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), h.TransTime.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), h.IsCrossStore)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), h.IsCancelled)
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), h.Remark)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 18)
	}

	return nil
}

func (s *ExportService) exportReconciliation(f *excelize.File, batchID uuid.UUID) error {
	sheetName := "对账结果"
	f.NewSheet(sheetName)

	headers := []string{"会员ID", "交易号", "匹配状态", "期望余额", "实际余额", "差异",
		"跨店检查", "撤销检查", "历史连续", "操作人ID", "操作人", "备注"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	results, err := s.reconciliationRepo.GetByBatchID(batchID)
	if err != nil {
		return err
	}

	for i, r := range results {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), r.MemberID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), r.TransNo)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), r.MatchStatus)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), r.ExpectedBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), r.ActualBalance)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), r.Difference)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), r.CrossStoreCheck)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), r.CancelCheck)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), r.HistoryContinuous)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), r.OperatorID)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), r.OperatorName)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), r.Remark)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 18)
	}

	return nil
}

func (s *ExportService) exportStatusHistory(f *excelize.File, batch *models.Batch) error {
	sheetName := "状态变更历史"
	f.NewSheet(sheetName)

	headers := []string{"序号", "原状态", "新状态", "操作人ID", "操作人", "变更原因", "变更时间", "IP地址"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, s.getHeaderStyle(f))
	}

	for i, h := range batch.Histories {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), h.FromStatus)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), h.ToStatus)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), h.OperatorID)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), h.OperatorName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), h.Reason)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), h.ChangeTime.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), h.IPAddress)
	}

	for i := range headers {
		f.SetColWidth(sheetName, fmt.Sprintf("%c", 'A'+i), fmt.Sprintf("%c", 'A'+i), 20)
	}

	return nil
}

func (s *ExportService) getHeaderStyle(f *excelize.File) int {
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#CCE5FF"},
			Pattern: 1,
		},
	})
	return style
}
