package ai

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"tlgodraw/internal/model"
	"tlgodraw/internal/ports"

	"go.yaml.in/yaml/v3"
)

type SkillFactory struct {
}

type SkillTool struct {
	ToolName     string
	SkillName    string
	Description  string
	Path         string
	ManifestPath string
}

func NewSkillFactory() *SkillFactory {
	return &SkillFactory{}
}

func (t SkillTool) Name() string {
	return t.ToolName
}

func (f *SkillFactory) BuildTools(_ context.Context, config model.ToolSkillsConfig) ([]ports.Tool, error) {
	skillType := strings.TrimSpace(config.Type)
	if skillType == "" {
		skillType = "directory"
	}
	if skillType != "directory" && skillType != "resource" {
		return nil, fmt.Errorf("unsupported skill type %q", config.Type)
	}
	rawPath := strings.TrimSpace(config.Path)
	if rawPath == "" {
		return nil, fmt.Errorf("skill path is required")
	}

	root, err := resolveSkillRoot(skillType, rawPath)
	if err != nil {
		return nil, err
	}
	manifests, err := findSkillManifests(root)
	if err != nil {
		return nil, err
	}
	if len(manifests) == 0 {
		return nil, fmt.Errorf("skill path %q has no SKILL.md files", root)
	}

	tools := make([]ports.Tool, 0, len(manifests))
	for _, manifest := range manifests {
		tool, err := loadSkillTool(root, manifest)
		if err != nil {
			return nil, err
		}
		tools = append(tools, tool)
	}

	return tools, nil
}

func resolveSkillRoot(skillType, rawPath string) (string, error) {
	if filepath.IsAbs(rawPath) {
		return existingPath(rawPath, rawPath)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("resolve skill path %q: %w", rawPath, err)
	}

	candidates := skillPathCandidates(cwd, skillType, rawPath)
	for _, candidate := range candidates {
		if path, err := existingPath(candidate, rawPath); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("skill path %q cannot be resolved", rawPath)
}

func skillPathCandidates(cwd, skillType, rawPath string) []string {
	var candidates []string
	add := func(path string) {
		clean := filepath.Clean(path)
		for _, candidate := range candidates {
			if candidate == clean {
				return
			}
		}
		candidates = append(candidates, clean)
	}

	for dir := cwd; ; dir = filepath.Dir(dir) {
		add(filepath.Join(dir, rawPath))
		add(filepath.Join(dir, "configs", rawPath))
		add(filepath.Join(dir, "tlgodraw", rawPath))
		add(filepath.Join(dir, "tlgodraw", "configs", rawPath))
		if skillType == "resource" && strings.HasPrefix(rawPath, "agent"+string(filepath.Separator)) {
			add(filepath.Join(dir, "configs", rawPath))
			add(filepath.Join(dir, "tlgodraw", "configs", rawPath))
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}
	return candidates
}

func findSkillManifests(root string) ([]string, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return []string{root}, nil
	}

	var manifests []string
	err = filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if entry.Name() == "SKILL.md" {
			manifests = append(manifests, path)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("scan skill path %q: %w", root, err)
	}
	sort.Strings(manifests)
	return manifests, nil
}

func loadSkillTool(root, manifest string) (SkillTool, error) {
	data, err := os.ReadFile(manifest)
	if err != nil {
		return SkillTool{}, fmt.Errorf("read skill manifest %q: %w", manifest, err)
	}
	meta, err := parseSkillFrontMatter(string(data))
	if err != nil {
		return SkillTool{}, fmt.Errorf("parse skill manifest %q: %w", manifest, err)
	}

	skillDir := filepath.Dir(manifest)
	name := strings.TrimSpace(meta["name"])
	if name == "" {
		name = filepath.Base(skillDir)
	}
	description := strings.TrimSpace(meta["description"])

	return SkillTool{
		ToolName:     "skill_" + sanitizeToolName(name),
		SkillName:    name,
		Description:  description,
		Path:         skillDir,
		ManifestPath: manifest,
	}, nil
}

func sanitizeToolName(name string) string {
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '_', r == '-':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	out := b.String()
	if out == "" {
		out = "tool"
	}
	if len(out) > 64 {
		out = out[:64]
	}
	return out
}

func parseSkillFrontMatter(content string) (map[string]string, error) {
	result := make(map[string]string)
	if !strings.HasPrefix(content, "---") {
		return result, nil
	}

	rest := strings.TrimPrefix(content, "---")
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return result, fmt.Errorf("front matter terminator is required")
	}

	frontMatter := rest[:end]
	if err := yaml.Unmarshal([]byte(frontMatter), &result); err != nil {
		return nil, err
	}
	return result, nil
}
