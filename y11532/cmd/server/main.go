package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bank-schedule-retry/config"
	"bank-schedule-retry/internal/database"
	"bank-schedule-retry/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func main() {
	cfg := config.Load()

	initLogger(cfg)

	if err := database.Init(&cfg.Database); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	gin.SetMode(cfg.Server.Mode)
	router := gin.Default()

	router.Use(corsMiddleware())
	router.Use(requestLogger())

	taskHandler := handlers.NewTaskHandler()

	api := router.Group("/api/v1")
	{
		tasks := api.Group("/tasks")
		{
			tasks.POST("", taskHandler.SubmitTask)
			tasks.GET("", taskHandler.ListTasks)
			tasks.GET("/:id", taskHandler.GetTask)
			tasks.POST("/:id/queue", taskHandler.QueueTask)
			tasks.POST("/:id/process", taskHandler.ProcessTask)
			tasks.POST("/:id/manual-takeover", taskHandler.ManualTakeover)
			tasks.POST("/:id/compensate", taskHandler.CompensateTask)
			tasks.POST("/:id/close", taskHandler.CloseTask)
			tasks.POST("/:id/freeze", taskHandler.FreezeTask)
			tasks.POST("/:id/unfreeze", taskHandler.UnfreezeTask)
			tasks.POST("/:id/withdraw", taskHandler.WithdrawTask)
			tasks.POST("/:id/resubmit", taskHandler.ResubmitTask)
			tasks.GET("/:id/history", taskHandler.GetTaskHistory)
			tasks.GET("/:id/consistency", taskHandler.CheckConsistency)
			tasks.POST("/:id/export", taskHandler.ExportTask)
		}

		history := api.Group("/history")
		{
			history.GET("/compare", taskHandler.CompareHistory)
		}

		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/manager", taskHandler.GetManagerDashboard)
		}

		deadletters := api.Group("/dead-letters")
		{
			deadletters.GET("", taskHandler.ListDeadLetters)
			deadletters.POST("/:id/restore", taskHandler.RestoreDeadLetter)
		}

		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
				"time":   time.Now().Format(time.RFC3339),
			})
		})
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	go func() {
		logrus.Infof("Server starting on port %s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logrus.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logrus.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logrus.Fatalf("Server forced to shutdown: %v", err)
	}

	logrus.Info("Server exited properly")
}

func initLogger(cfg *config.Config) {
	level, err := logrus.ParseLevel(cfg.Log.Level)
	if err != nil {
		level = logrus.InfoLevel
	}
	logrus.SetLevel(level)

	if cfg.Log.Format == "json" {
		logrus.SetFormatter(&logrus.JSONFormatter{})
	} else {
		logrus.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
		})
	}

	logrus.SetOutput(os.Stdout)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		logrus.WithFields(logrus.Fields{
			"status":   statusCode,
			"method":   c.Request.Method,
			"path":     path,
			"latency":  latency,
			"client_ip": c.ClientIP(),
		}).Info("Request completed")
	}
}
