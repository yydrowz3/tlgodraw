package ai

import (
	"fmt"
	"os"
	"path/filepath"
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
