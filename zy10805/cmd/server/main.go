package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"cold-chain-review/internal/handler"
	"cold-chain-review/internal/repository"
	"cold-chain-review/internal/service"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/cold_chain.db"
	}

	db, err := repository.NewDatabase(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	svc := service.NewColdChainService(repo)
	h := handler.NewHandler(svc)

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api/v1")
	{
		api.GET("/health", h.HealthCheck)

		api.POST("/stores", h.CreateStore)
		api.POST("/drug-batches", h.CreateDrugBatch)
		api.POST("/cabinets", h.CreateCabinet)
		api.POST("/transfer-orders", h.CreateTransferOrder)
		api.GET("/transfer-orders/:id", h.GetTransferOrder)
		api.POST("/temperature-records", h.CreateTemperatureRecord)
		api.POST("/receiving-reviews", h.CreateReceivingReview)

		api.POST("/exceptions", h.RegisterException)
		api.GET("/exceptions/:id", h.GetException)

		api.POST("/evidences", h.UploadEvidence)
		api.GET("/exceptions/:id/evidences", h.GetEvidences)

		api.POST("/reviews", h.SubmitReview)
		api.GET("/reviews/:id", h.GetReview)

		api.POST("/reviews/revert", h.RevertReview)
		api.GET("/reviews/:id/revert-logs", h.GetRevertLogs)

		api.POST("/disposals", h.CreateDisposal)

		api.GET("/transfer-orders/:id/export", h.ExportReview)
		api.GET("/transfer-orders/:id/export/download", h.ExportReviewJSON)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	log.Printf("Database path: %s", dbPath)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
