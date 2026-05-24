package service

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"

	"store-prepaid-audit/models"
)

type DataGenService struct {
	rand *rand.Rand
}

func NewDataGenService() *DataGenService {
	return &DataGenService{
		rand: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (s *DataGenService) GenerateRechargeRecords(batchID uuid.UUID, storeID, storeName string, count int, includeErrors bool) []models.RechargeRecord {
	var records []models.RechargeRecord
	members := s.generateMembers(count / 2)

	baseTime := time.Now().AddDate(0, 0, -7)

	for i := 0; i < count; i++ {
		member := members[i%len(members)]
		transTime := baseTime.Add(time.Duration(i*30) * time.Minute)
		amount := float64(s.rand.Intn(1000) + 100)

		beforeBalance := float64(s.rand.Intn(5000))
		afterBalance := beforeBalance + amount

		if includeErrors && i%7 == 0 {
			afterBalance = beforeBalance + amount + float64(s.rand.Intn(50)-25)
		}

		isCancelled := i%11 == 0

		var cancelTime *time.Time
		var cancelOperator *string
		if isCancelled {
			ct := transTime.Add(2 * time.Hour)
			cancelTime = &ct
			op := "系统管理员"
			cancelOperator = &op
		}

		transStoreID := storeID
		transStoreName := storeName
		if includeErrors && i%13 == 0 {
			transStoreID = "STORE_OTHER"
			transStoreName = "其他门店"
		}

		record := models.RechargeRecord{
			BatchID:        batchID,
			TransNo:        fmt.Sprintf("R%s%06d", time.Now().Format("20060102"), i+100000),
			MemberID:       member.ID,
			MemberName:     member.Name,
			StoreID:        transStoreID,
			StoreName:      transStoreName,
			Amount:         amount,
			BeforeBalance:  beforeBalance,
			AfterBalance:   afterBalance,
			PayMethod:      []string{"CASH", "WECHAT", "ALIPAY", "CARD"}[s.rand.Intn(4)],
			OperatorID:     fmt.Sprintf("OP%03d", s.rand.Intn(10)+1),
			OperatorName:   []string{"张三", "李四", "王五", "赵六"}[s.rand.Intn(4)],
			TransTime:      transTime,
			Status:         "SUCCESS",
			IsCancelled:    isCancelled,
			CancelTime:     cancelTime,
			CancelOperator: cancelOperator,
			Remark:         fmt.Sprintf("测试充值流水%d", i+1),
		}
		records = append(records, record)
	}

	return records
}

func (s *DataGenService) GenerateRefundApplications(batchID uuid.UUID, storeID, storeName string, count int) []models.RefundApplication {
	var refunds []models.RefundApplication

	for i := 0; i < count; i++ {
		applyTime := time.Now().AddDate(0, 0, -s.rand.Intn(7))
		approveTime := applyTime.Add(time.Hour * time.Duration(s.rand.Intn(24)+1))
		approverID := "ADMIN001"
		approverName := "财务主管"

		refund := models.RefundApplication{
			BatchID:      batchID,
			RefundNo:     fmt.Sprintf("RF%s%04d", time.Now().Format("20060102"), i+1000),
			TransNo:      fmt.Sprintf("R%s%06d", time.Now().Format("20060102"), s.rand.Intn(100)+100000),
			MemberID:     fmt.Sprintf("M%04d", s.rand.Intn(100)+1),
			MemberName:   fmt.Sprintf("会员%d", s.rand.Intn(100)+1),
			StoreID:      storeID,
			StoreName:    storeName,
			Amount:       float64(s.rand.Intn(500) + 50),
			Reason:       []string{"用户要求退款", "充值错误", "系统问题", "其他"}[s.rand.Intn(4)],
			ApplicantID:  fmt.Sprintf("OP%03d", s.rand.Intn(10)+1),
			ApplicantName: []string{"张三", "李四", "王五", "赵六"}[s.rand.Intn(4)],
			ApplyTime:    applyTime,
			ApproverID:   &approverID,
			ApproverName: &approverName,
			ApproveTime:  &approveTime,
			Status:       []string{"APPROVED", "PENDING", "REJECTED"}[s.rand.Intn(3)],
			Remark:       fmt.Sprintf("退款申请%d", i+1),
		}
		refunds = append(refunds, refund)
	}

	return refunds
}

func (s *DataGenService) GenerateHandoverRecords(batchID uuid.UUID, storeID, storeName string, count int) []models.StoreHandover {
	var handovers []models.StoreHandover
	operators := []string{"张三", "李四", "王五", "赵六", "钱七"}

	for i := 0; i < count; i++ {
		handoverDate := time.Now().AddDate(0, 0, -i)
		cashAmount := float64(s.rand.Intn(5000))
		posAmount := float64(s.rand.Intn(10000))
		prepaidAmount := float64(s.rand.Intn(3000))
		totalAmount := cashAmount + posAmount + prepaidAmount
		actualAmount := totalAmount + float64(s.rand.Intn(100)-50)
		supervisorID := "SUP001"
		supervisorName := "店长"

		handover := models.StoreHandover{
			BatchID:          batchID,
			HandoverNo:       fmt.Sprintf("HO%s%03d", time.Now().Format("20060102"), i+1),
			StoreID:          storeID,
			StoreName:        storeName,
			Shift:            []string{"早班", "中班", "晚班"}[s.rand.Intn(3)],
			HandoverDate:     handoverDate,
			FromOperatorID:   fmt.Sprintf("OP%03d", s.rand.Intn(5)+1),
			FromOperatorName: operators[s.rand.Intn(5)],
			ToOperatorID:     fmt.Sprintf("OP%03d", s.rand.Intn(5)+1),
			ToOperatorName:   operators[s.rand.Intn(5)],
			CashAmount:       cashAmount,
			POSAmount:        posAmount,
			PrepaidAmount:    prepaidAmount,
			TotalAmount:      totalAmount,
			ActualAmount:     actualAmount,
			Difference:       actualAmount - totalAmount,
			SupervisorID:     &supervisorID,
			SupervisorName:   &supervisorName,
			Status:           "COMPLETED",
			Remark:           fmt.Sprintf("交接记录%d", i+1),
		}
		handovers = append(handovers, handover)
	}

	return handovers
}

type Member struct {
	ID   string
	Name string
}

func (s *DataGenService) generateMembers(count int) []Member {
	var members []Member
	names := []string{"张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
		"郑一", "冯二", "陈三", "褚四", "卫五", "蒋六", "沈七", "韩八"}

	for i := 0; i < count; i++ {
		members = append(members, Member{
			ID:   fmt.Sprintf("M%04d", i+1),
			Name: names[i%len(names)],
		})
	}
	return members
}

func (s *DataGenService) GenerateGapRecordsWithGap(batchID uuid.UUID, storeID, storeName string, memberCount int) []models.RechargeRecord {
	var records []models.RechargeRecord
	baseTime := time.Now().AddDate(0, 0, -7)

	for m := 0; m < memberCount; m++ {
		memberID := fmt.Sprintf("M%04d", m+1)
		memberName := fmt.Sprintf("会员%d", m+1)

		var balance float64 = 0

		for i := 0; i < 5; i++ {
			transTime := baseTime.Add(time.Duration(m*24*60+i*120) * time.Minute)
			amount := float64(s.rand.Intn(500) + 100)
			beforeBalance := balance

			if i == 3 && m == 1 {
				beforeBalance = balance + 100
			}

			afterBalance := beforeBalance + amount

			record := models.RechargeRecord{
				BatchID:       batchID,
				TransNo:       fmt.Sprintf("RGAP%02d%03d", m+1, i+1),
				MemberID:      memberID,
				MemberName:    memberName,
				StoreID:       storeID,
				StoreName:     storeName,
				Amount:        amount,
				BeforeBalance: beforeBalance,
				AfterBalance:  afterBalance,
				PayMethod:     "CASH",
				OperatorID:    "OP001",
				OperatorName:  "操作员",
				TransTime:     transTime,
				Status:        "SUCCESS",
				IsCancelled:   false,
				Remark:        fmt.Sprintf("余额断层测试-会员%d-%d", m+1, i+1),
			}
			records = append(records, record)
			balance = afterBalance
		}
	}

	return records
}
