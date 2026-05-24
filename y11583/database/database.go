package database

import (
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"store-prepaid-audit/config"
	"store-prepaid-audit/models"
)

var DB *gorm.DB

func Init(cfg *config.DatabaseConfig) error {
	dir := filepath.Dir(cfg.DSN)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	db, err := gorm.Open(sqlite.Open(cfg.DSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	DB = db

	return migrate(db)
}

func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Batch{},
		&models.RechargeRecord{},
		&models.RefundApplication{},
		&models.StoreHandover{},
		&models.Evidence{},
		&models.StatusHistory{},
		&models.BalanceHistory{},
		&models.AuditLog{},
		&models.ReconciliationResult{},
	)
}

func GetDB() *gorm.DB {
	return DB
}
