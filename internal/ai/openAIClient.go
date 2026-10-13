package ai

import (
	"net/http"
	"time"
)

type OpenAIClient struct {
	httpClient     *http.Client
	completionsURL string
	apiKey         string
	model          string
}

type OpenAIToolDef struct {
	Name        string
	Description string
}

func NewOpenAIClient(completionsURL, apiKey, model string, requestTimeout time.Duration) *OpenAIClient {
	if requestTimeout <= 0 {
		requestTimeout = 5 * time.Minute
	}
	return &OpenAIClient{
		httpClient:     &http.Client{Timeout: requestTimeout},
		completionsURL: completionsURL,
		apiKey:         apiKey,
		model:          model,
	}
}
