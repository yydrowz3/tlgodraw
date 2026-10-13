package adk

import (
	"sync/atomic"
	"tlgodraw/internal/ports"
)

type Runner struct {
	appName string
	agent   ports.Agent
	plugins []ports.RunnerPlugin
	counter *atomic.Uint64
}
