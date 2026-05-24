package database

import (
	"log"

	"bank-schedule-retry/config"
	"bank-schedule-retry/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(cfg *config.DatabaseConfig) error {
	var db *gorm.DB
	var err error

	logLevel := logger.Info
	if cfg.Driver == "sqlite" {
		db, err = gorm.Open(sqlite.Open(cfg.DSN), &gorm.Config{
			Logger: logger.Default.LogMode(logLevel),
		})
	}

	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	sqlDB.SetMaxOpenConns(cfg.MaxOpenConn)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConn)
	sqlDB.SetConnMaxLifetime(cfg.MaxLifetime)

	DB = db

	if err := autoMigrate(); err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

func autoMigrate() error {
	return DB.AutoMigrate(
		&models.Branch{},
		&models.Teller{},
		&models.TellerSchedule{},
		&models.LeaveRequest{},
		&models.BusinessVolumeForecast{},
		&models.ScanDetail{},
		&models.TempTraining{},
		&models.RetryTask{},
		&models.RetryTaskItem{},
		&models.OperationHistory{},
		&models.DeadLetter{},
		&models.ExportRecord{},
		&models.DailyStatistics{},
	)
}

func GetDB() *gorm.DB {
	return DB
}

func Begin() *gorm.DB {
	return DB.Begin()
}
