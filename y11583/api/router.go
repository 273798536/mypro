package api

import (
	"github.com/gin-gonic/gin"

	"store-prepaid-audit/api/handler"
	"store-prepaid-audit/api/middleware"
	"store-prepaid-audit/config"
	"store-prepaid-audit/database"
	"store-prepaid-audit/repository"
	"store-prepaid-audit/service"
)

func SetupRouter(cfg *config.Config) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	r.Use(middleware.RequestLogger())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.ErrorHandler())

	db := database.GetDB()

	batchRepo := repository.NewBatchRepository(db)
	rechargeRepo := repository.NewRechargeRepository(db)
	refundRepo := repository.NewRefundRepository(db)
	handoverRepo := repository.NewHandoverRepository(db)
	balanceHistoryRepo := repository.NewBalanceHistoryRepository(db)
	reconciliationRepo := repository.NewReconciliationRepository(db)

	batchService := service.NewBatchService(db)
	reconcileService := service.NewReconcileService(db)
	dataGenService := service.NewDataGenService()

	exportService := service.NewExportService(&cfg.Export, db)
	exportService.SetRepos(
		batchRepo,
		rechargeRepo,
		refundRepo,
		handoverRepo,
		balanceHistoryRepo,
		reconciliationRepo,
	)

	batchHandler := handler.NewBatchHandler(
		batchService,
		reconcileService,
		exportService,
		dataGenService,
	)

	auditHandler := handler.NewAuditHandler(batchService)

	api := r.Group("/api/v1")
	{
		batches := api.Group("/batches")
		{
			batches.POST("", batchHandler.CreateBatch)
			batches.GET("", batchHandler.ListBatches)
			batches.GET("/:id", batchHandler.GetBatch)

			batches.POST("/:id/submit", batchHandler.SubmitBatch)
			batches.POST("/:id/recall", batchHandler.RecallBatch)
			batches.POST("/:id/review", batchHandler.StartReview)
			batches.POST("/:id/approve", batchHandler.ApproveBatch)
			batches.POST("/:id/reject", batchHandler.RejectBatch)
			batches.POST("/:id/partial", batchHandler.PartialPass)
			batches.POST("/:id/freeze", batchHandler.FreezeBatch)
			batches.POST("/:id/cancel", batchHandler.CancelBatch)

			batches.POST("/:id/records", batchHandler.AddRecords)
			batches.POST("/:id/generate", batchHandler.GenerateData)
			batches.POST("/:id/reconcile", batchHandler.Reconcile)
			batches.POST("/:id/export", batchHandler.ExportBatch)

			batches.GET("/:id/balance-history", batchHandler.GetBalanceHistory)
			batches.GET("/:id/reconciliation-results", batchHandler.GetReconciliationResults)
		}

		api.GET("/playback", batchHandler.PlaybackTransactions)

		audit := api.Group("/audit")
		{
			audit.GET("/logs", auditHandler.ListAuditLogs)
		}
	}

	return r
}
