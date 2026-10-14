package ai

type ToolFactory struct {
	router *MCPToolRouter
}

type SKillFactory struct {
}

type MCPTool struct {
	ToolName       string
	TransportType  string
	BaseURI        string
	SSEEndpoint    string
	Command        string
	Args           []string
	Env            map[string]string
	RequestTimeout int
}

type SkillTool struct {
	ToolName     string
	SkillName    string
	Description  string
	Path         string
	ManifestPath string
}

func (t MCPTool) Name() string {
	return t.ToolName
}
