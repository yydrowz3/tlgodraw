package persistence

import (
	"fmt"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type PostgreSQLConfig struct {
	Required bool
	DSN      string
}

func OpenPostgreSQL(config PostgreSQLConfig) (*gorm.DB, error) {
	if strings.TrimSpace(config.DSN) == "" {
		if config.Required {
			return nil, fmt.Errorf("postgresql dsn is required")
		}
		return nil, nil
	}
	db, err := gorm.Open(postgres.Open(config.DSN), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open postgresql: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("postgresql db handle: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping postgresql: %w", err)
	}

	return db, nil
}
