package main

import (
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/spf13/cobra"

	"store-prepaid-audit/config"
	"store-prepaid-audit/database"
	"store-prepaid-audit/models"
	"store-prepaid-audit/repository"
	"store-prepaid-audit/service"
)

var (
	cfgFile    string
	storeID    string
	storeName  string
	batchID    string
	recordCount int
	includeErrors bool
)

var rootCmd = &cobra.Command{
	Use:   "prepaid-cli",
	Short: "门店会员储值验收回放链路服务 CLI",
}

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "启动HTTP服务",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("请使用主程序 main.go 启动HTTP服务")
		fmt.Println("示例: go run main.go")
	},
}

var createBatchCmd = &cobra.Command{
	Use:   "create-batch",
	Short: "创建新批次",
	Run: func(cmd *cobra.Command, args []string) {
		initDB()

		opCtx := service.OperatorContext{
			OperatorID:   "CLI_OP",
			OperatorName: "命令行操作员",
			IPAddress:    "127.0.0.1",
			UserAgent:    "CLI",
		}

		batchService := service.NewBatchService(database.GetDB())
		batch, err := batchService.CreateBatch(storeID, storeName, opCtx)
		if err != nil {
			fmt.Printf("创建批次失败: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("批次创建成功!\n")
		fmt.Printf("  批次ID: %s\n", batch.ID)
		fmt.Printf("  批次号: %s\n", batch.BatchNo)
		fmt.Printf("  门店: %s - %s\n", batch.StoreID, batch.StoreName)
	},
}

var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "生成测试数据",
	Run: func(cmd *cobra.Command, args []string) {
		initDB()

		if batchID == "" {
			fmt.Println("请指定批次ID --batch-id")
			os.Exit(1)
		}

		opCtx := service.OperatorContext{
			OperatorID:   "CLI_OP",
			OperatorName: "命令行操作员",
			IPAddress:    "127.0.0.1",
			UserAgent:    "CLI",
		}

		db := database.GetDB()
		batchService := service.NewBatchService(db)
		dataGenService := service.NewDataGenService()

		batch, err := batchService.GetBatch(parseUUID(batchID))
		if err != nil {
			fmt.Printf("获取批次失败: %v\n", err)
			os.Exit(1)
		}

		recharges := dataGenService.GenerateRechargeRecords(batch.ID, batch.StoreID, batch.StoreName, recordCount, includeErrors)

		added, err := batchService.AddRechargeRecords(batch.ID, recharges, models.DuplicateStrategyIgnore, opCtx)
		if err != nil {
			fmt.Printf("添加记录失败: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("测试数据生成成功!\n")
		fmt.Printf("  新增充值记录: %d\n", added)
	},
}

var reconcileCmd = &cobra.Command{
	Use:   "reconcile",
	Short: "执行对账",
	Run: func(cmd *cobra.Command, args []string) {
		initDB()

		if batchID == "" {
			fmt.Println("请指定批次ID --batch-id")
			os.Exit(1)
		}

		opCtx := service.OperatorContext{
			OperatorID:   "CLI_OP",
			OperatorName: "命令行操作员",
			IPAddress:    "127.0.0.1",
			UserAgent:    "CLI",
		}

		reconcileService := service.NewReconcileService(database.GetDB())
		result, err := reconcileService.ReconcileBatch(parseUUID(batchID), opCtx)
		if err != nil {
			fmt.Printf("对账失败: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("对账完成!\n")
		fmt.Printf("  总记录数: %d\n", result.TotalRecords)
		fmt.Printf("  匹配记录: %d\n", result.MatchedRecords)
		fmt.Printf("  不匹配记录: %d\n", result.MismatchedRecords)
		fmt.Printf("  跨店交易: %d\n", result.CrossStoreCount)
		fmt.Printf("  已撤销交易: %d\n", result.CancelledCount)
		fmt.Printf("  发现余额断层: %d\n", result.GapsFound)
	},
}

var exportCmd = &cobra.Command{
	Use:   "export",
	Short: "导出批次数据",
	Run: func(cmd *cobra.Command, args []string) {
		initDB()

		if batchID == "" {
			fmt.Println("请指定批次ID --batch-id")
			os.Exit(1)
		}

		cfg, err := config.Load(cfgFile)
		if err != nil {
			fmt.Printf("加载配置失败: %v\n", err)
			os.Exit(1)
		}

		opCtx := service.OperatorContext{
			OperatorID:   "CLI_OP",
			OperatorName: "命令行操作员",
			IPAddress:    "127.0.0.1",
			UserAgent:    "CLI",
		}

		db := database.GetDB()
		batchRepo := repository.NewBatchRepository(db)
		rechargeRepo := repository.NewRechargeRepository(db)
		refundRepo := repository.NewRefundRepository(db)
		handoverRepo := repository.NewHandoverRepository(db)
		balanceRepo := repository.NewBalanceHistoryRepository(db)
		reconRepo := repository.NewReconciliationRepository(db)

		exportService := service.NewExportService(&cfg.Export, db)
		exportService.SetRepos(batchRepo, rechargeRepo, refundRepo, handoverRepo, balanceRepo, reconRepo)

		filePath, err := exportService.ExportBatch(parseUUID(batchID), opCtx)
		if err != nil {
			fmt.Printf("导出失败: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("导出成功!\n")
		fmt.Printf("  文件路径: %s\n", filePath)
	},
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "列出批次",
	Run: func(cmd *cobra.Command, args []string) {
		initDB()

		batchService := service.NewBatchService(database.GetDB())
		batches, total, err := batchService.ListBatches(storeID, models.BatchStatus(""), 1, 100)
		if err != nil {
			fmt.Printf("查询失败: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("共 %d 个批次:\n", total)
		for _, b := range batches {
			fmt.Printf("  [%s] %s - %s - 记录:%d 金额:%.2f\n",
				b.Status, b.BatchNo, b.StoreName, b.TotalRecords, b.TotalAmount)
		}
	},
}

func init() {
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "./config/config.yaml", "配置文件路径")

	createBatchCmd.Flags().StringVar(&storeID, "store-id", "STORE001", "门店ID")
	createBatchCmd.Flags().StringVar(&storeName, "store-name", "朝阳门店", "门店名称")

	generateCmd.Flags().StringVar(&batchID, "batch-id", "", "批次ID")
	generateCmd.Flags().IntVar(&recordCount, "count", 50, "生成记录数量")
	generateCmd.Flags().BoolVar(&includeErrors, "with-errors", false, "包含错误数据")

	reconcileCmd.Flags().StringVar(&batchID, "batch-id", "", "批次ID")

	exportCmd.Flags().StringVar(&batchID, "batch-id", "", "批次ID")

	listCmd.Flags().StringVar(&storeID, "store-id", "", "门店ID过滤")

	rootCmd.AddCommand(serveCmd, createBatchCmd, generateCmd, reconcileCmd, exportCmd, listCmd)
}

func initDB() {
	cfg, err := config.Load(cfgFile)
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		os.Exit(1)
	}

	if err := database.Init(&cfg.Database); err != nil {
		fmt.Printf("初始化数据库失败: %v\n", err)
		os.Exit(1)
	}
}

func parseUUID(s string) uuid.UUID {
	id, err := uuid.Parse(s)
	if err != nil {
		fmt.Printf("无效的UUID: %v\n", err)
		os.Exit(1)
	}
	return id
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
