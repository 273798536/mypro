package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Queue    QueueConfig
	Log      LogConfig
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	Mode         string
}

type DatabaseConfig struct {
	Driver      string
	DSN         string
	MaxOpenConn int
	MaxIdleConn int
	MaxLifetime time.Duration
}

type QueueConfig struct {
	WorkerCount    int
	PollInterval   time.Duration
	RetryInterval  time.Duration
	MaxRetryCount  int
	BackoffMultiplier float64
}

type LogConfig struct {
	Level  string
	Format string
	Output string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("SERVER_PORT", "8080"),
			ReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 30*time.Second),
			Mode:         getEnv("SERVER_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Driver:      getEnv("DB_DRIVER", "sqlite"),
			DSN:         getEnv("DB_DSN", "bank_schedule.db"),
			MaxOpenConn: getIntEnv("DB_MAX_OPEN_CONN", 100),
			MaxIdleConn: getIntEnv("DB_MAX_IDLE_CONN", 10),
			MaxLifetime: getDurationEnv("DB_MAX_LIFETIME", time.Hour),
		},
		Queue: QueueConfig{
			WorkerCount:       getIntEnv("QUEUE_WORKER_COUNT", 5),
			PollInterval:      getDurationEnv("QUEUE_POLL_INTERVAL", 5*time.Second),
			RetryInterval:     getDurationEnv("QUEUE_RETRY_INTERVAL", 30*time.Second),
			MaxRetryCount:     getIntEnv("QUEUE_MAX_RETRY_COUNT", 3),
			BackoffMultiplier: getFloatEnv("QUEUE_BACKOFF_MULTIPLIER", 2.0),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
			Output: getEnv("LOG_OUTPUT", "stdout"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if v, err := strconv.Atoi(value); err == nil {
			return v
		}
	}
	return defaultValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if v, err := strconv.ParseFloat(value, 64); err == nil {
			return v
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if v, err := time.ParseDuration(value); err == nil {
			return v
		}
	}
	return defaultValue
}
