package utils

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadDotEnv(path string) string {
	if path == "" {
		return ""
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return ""
		}
		log.Fatalf("stat dotenv %s: %v", path, err)
	}
	pairs, err := godotenv.Read(path)
	if err != nil {
		log.Fatalf("read dotenv %s: %v", path, err)
	}
	for key, value := range pairs {
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		if err := os.Setenv(key, value); err != nil {
			log.Fatalf("set env %s: %v", key, err)
		}
	}

	return path
}

func DefaultEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
