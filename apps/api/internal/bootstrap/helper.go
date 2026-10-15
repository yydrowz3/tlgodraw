package bootstrap

import (
	"net/http"
	"os"
	"strings"
	"tlgodraw/internal/config"
	"tlgodraw/internal/model"

	"github.com/gin-gonic/gin"
)

func newRouter(env string) *gin.Engine {
	if env == "prod" || env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	if env != "prod" && env != "production" {
		router.Use(gin.Logger())
	}

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return router
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func loadAgentTables(paths []string) (map[string]model.AiAgentConfigTable, error) {
	merged := make(map[string]model.AiAgentConfigTable)
	for _, raw := range paths {
		path := strings.TrimSpace(raw)
		if path == "" {
			continue
		}
		expanded := os.ExpandEnv(path) // 环境变量 替换 文本 template
		tables, err := config.LoadAgentTablesFile(expanded)
		if err != nil {
			return nil, err
		}
		for name, table := range tables {
			merged[name] = table
		}
	}

	return merged, nil
}
