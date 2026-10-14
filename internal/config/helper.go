package config

import (
	"os"
	"regexp"
)

var envPlaceholderRE = regexp.MustCompile(`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}`)

// expandEnvPlaceholders replaces ${VAR} and ${VAR:-default} in YAML text using
// the current process environment. It deliberately ignores bare $NAME forms so
// dollar signs that happen to appear inside instructions or URLs are not
// mangled.
func expandEnvPlaceholders(input string) string {
	return envPlaceholderRE.ReplaceAllStringFunc(input, func(match string) string {
		groups := envPlaceholderRE.FindStringSubmatch(match)
		name := groups[1]
		if value, ok := os.LookupEnv(name); ok && value != "" {
			return value
		}
		if len(groups) > 2 {
			return groups[2]
		}
		return ""
	})
}
