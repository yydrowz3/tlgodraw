package adk

import (
	"sync/atomic"
	"tlgodraw/internal/ports"
)

const maxToolCallIterations = 4

type Runner struct {
	appName string
	agent   ports.Agent
	plugins []ports.RunnerPlugin
	counter *atomic.Uint64
}
