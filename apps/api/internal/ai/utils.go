package ai

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

func existingPath(candidate, original string) (string, error) {
	info, err := os.Stat(candidate)
	if err != nil {
		return "", fmt.Errorf("skill path %q cannot be resolved", original)
	}
	if !info.IsDir() && filepath.Base(candidate) != "SKILL.md" {
		return "", fmt.Errorf("skill path %q is not a directory or SKILL.md file", candidate)
	}
	return candidate, nil
}

func normalizeSSETarget(baseURI, endpoint string) (string, string, error) {
	parsed, err := url.Parse(baseURI)
	if err != nil {
		return "", "", fmt.Errorf("invalid base-uri: %w", err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", "", fmt.Errorf("base-uri must include scheme and host")
	}

	host := strings.TrimRight(parsed.Scheme+"://"+parsed.Host, "/")
	basePath := parsed.RawPath
	if basePath == "" {
		basePath = parsed.EscapedPath()
	}
	baseQuery := parsed.RawQuery

	if endpoint == "" {
		if basePath == "" || basePath == "/" {
			return host, "/sse", nil
		}
		merged := basePath
		if baseQuery != "" {
			merged += "?" + baseQuery
		}
		return host, normalizeEndpoint(merged), nil
	}

	endpointPath, endpointQuery := splitPathQuery(endpoint)
	mergedPath := joinPaths(basePath, endpointPath)
	mergedQuery := mergeQueries(baseQuery, endpointQuery)
	if mergedQuery != "" {
		mergedPath += "?" + mergedQuery
	}
	return host, normalizeEndpoint(mergedPath), nil
}

func splitPathQuery(raw string) (string, string) {
	if idx := strings.Index(raw, "?"); idx >= 0 {
		return raw[:idx], raw[idx+1:]
	}
	return raw, ""
}

func joinPaths(base, extra string) string {
	if extra == "" {
		if base == "" {
			return "/"
		}
		return base
	}
	if strings.HasPrefix(extra, "/") {
		return extra
	}
	if base == "" {
		return "/" + extra
	}
	if strings.HasSuffix(base, "/") {
		return base + extra
	}
	return base + "/" + extra
}

func mergeQueries(base, extra string) string {
	switch {
	case base == "" && extra == "":
		return ""
	case base == "":
		return extra
	case extra == "":
		return base
	default:
		return base + "&" + extra
	}
}

func normalizeEndpoint(endpoint string) string {
	trimmed := strings.TrimSpace(endpoint)
	if trimmed == "" {
		return "/sse"
	}
	if strings.HasPrefix(trimmed, "/") {
		return trimmed
	}
	return "/" + trimmed
}

func normalizeTimeout(timeout int) int {
	if timeout > 0 {
		return timeout
	}

	return 300000
}

func cloneEnv(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

func maskSecretPath(raw string) string {
	if strings.TrimSpace(raw) == "" {
		return raw
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	query := parsed.Query()
	changed := false
	for key := range query {
		upper := strings.ToUpper(key)
		if strings.Contains(upper, "KEY") || strings.Contains(upper, "TOKEN") || strings.Contains(upper, "SECRET") {
			query.Set(key, "${"+strings.ToUpper(strings.ReplaceAll(key, "-", "_"))+"}")
			changed = true
		}
	}
	if !changed {
		return raw
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}
