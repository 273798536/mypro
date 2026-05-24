package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"store-prepaid-audit/api"
	"store-prepaid-audit/config"
	"store-prepaid-audit/database"
)

func main() {
	configPath := flag.String("config", "./config/config.yaml", "path to config file")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if err := database.Init(&cfg.Database); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := api.SetupRouter(cfg)

	addr := cfg.GetServerAddr()
	fmt.Printf("Server starting on %s\n", addr)
	fmt.Printf("API Documentation:\n")
	fmt.Printf("  POST   /api/v1/batches              - Create batch\n")
	fmt.Printf("  GET    /api/v1/batches              - List batches\n")
	fmt.Printf("  GET    /api/v1/batches/:id          - Get batch detail\n")
	fmt.Printf("  POST   /api/v1/batches/:id/submit   - Submit batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/recall   - Recall batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/review   - Start review\n")
	fmt.Printf("  POST   /api/v1/batches/:id/approve  - Approve batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/reject   - Reject batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/partial  - Partial pass\n")
	fmt.Printf("  POST   /api/v1/batches/:id/freeze   - Freeze batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/cancel   - Cancel batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/records  - Add records\n")
	fmt.Printf("  POST   /api/v1/batches/:id/generate - Generate test data\n")
	fmt.Printf("  POST   /api/v1/batches/:id/reconcile- Reconcile batch\n")
	fmt.Printf("  POST   /api/v1/batches/:id/export   - Export batch\n")
	fmt.Printf("  GET    /api/v1/batches/:id/balance-history     - Get balance history\n")
	fmt.Printf("  GET    /api/v1/batches/:id/reconciliation-results - Get reconciliation results\n")
	fmt.Printf("  GET    /api/v1/playback              - Playback transactions\n")
	fmt.Printf("  GET    /api/v1/audit/logs            - List audit logs\n")

	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
