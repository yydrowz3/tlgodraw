# Too Long; Go Draw — API

The Go backend for Too Long; Go Draw. It exposes a Gin HTTP API for agent
discovery, session creation, and chat, and assembles configurable AI workflows
that turn natural-language requests into Draw.io XML.

The default drawing workflow runs three agents in sequence: analyze the request,
generate a diagram, and review the XML. The [web frontend](../web/README.md)
displays the result in its embedded Draw.io editor.

## Requirements

- Go 1.27.1, as declared in `go.mod`.
- Access to an OpenAI-compatible chat completions API and a model supported by
  that provider.

The current bootstrap uses in-memory agent and session stores. PostgreSQL and
Redis helpers and configuration sections exist, but are not connected by
`internal/bootstrap.Build`; neither service is needed to run the current API.

## Local Development

From the repository root:

```sh
cd apps/api
go mod download
```

Copy `.env.example` to `.env` and supply your provider settings:

```dotenv
OPENAI_BASE_URL=https://your-provider.example/v1
OPENAI_API_KEY=replace-with-your-api-key
```

In `configs/agent/draw.yaml`, set `module.chat-model.model` under the
`drawIoAgent` table to a model available from your provider. The checked-in
value is `deepseek-flash`. The configured `completions-path` is
`chat/completions`, appended to the base URL; for the example above the resulting
URL is `https://your-provider.example/v1/chat/completions`.

Start the service from `apps/api` so the default relative paths resolve:

```sh
go run ./cmd/server
```

The default listener is `:8091`. Verify startup without making an AI request:

```sh
curl http://localhost:8091/healthz
curl http://localhost:8091/api/v1/query-ai-agent-config-list
```

`/healthz` returns `{"status":"ok"}`. It checks HTTP availability, not provider
connectivity. Configure the frontend with
`VITE_BASE_URL=http://localhost:8091/api/v1`.

## Configuration

### Startup Options

| Setting | Default | Purpose |
| --- | --- | --- |
| `--env` / `APP_ENV_FILE` | `.env` | Dotenv file loaded before application configuration |
| `--config` / `APP_CONFIG` | `configs/application.yaml` | Application YAML path |
| `PORT` | Unset | Overrides `server.addr` with `:<PORT>`; accepts integers from 1 to 65535 |
| `OPENAI_BASE_URL` | Required by the default agent YAML | Provider base URL |
| `OPENAI_API_KEY` | Required by the default agent YAML | Provider credential |

Command-line flags take precedence over their environment defaults. Existing
process environment values take precedence over values in the dotenv file.
A missing dotenv file is skipped. To explicitly disable dotenv loading, pass an
empty `--env` argument:

```sh
go run ./cmd/server --env="" --config=configs/application.yaml
```

An empty `APP_ENV_FILE` falls back to `.env`; use the flag to skip loading.
Set `APP_CONFIG` and `APP_ENV_FILE` in the process environment when using them
to select files, since flag defaults are resolved before dotenv loading.

### Application YAML

`configs/application.yaml` controls:

| Key | Checked-in value | Behavior |
| --- | --- | --- |
| `app.name` | `tlgodraw` | Application name |
| `app.env` | `development` | `prod` or `production` enables Gin release mode and disables its request logger |
| `server.addr` | `:8091` | HTTP listener when `PORT` is unset |
| `llm.request-timeout` | `5m` | Timeout for each upstream model HTTP request; must be a positive Go duration |
| `agent.config-paths` | `[configs/agent/draw.yaml]` | Agent YAML files loaded at startup |
| `database.*`, `redis.*` | Local placeholders | Reserved connection settings; unused by the current bootstrap |

Configuration paths are relative to the process working directory, including
entries in `agent.config-paths`. Agent file paths support environment expansion.
Agent YAML values support `${VAR}` and `${VAR:-default}` placeholders.
Application YAML values are parsed directly rather than interpolated.

### Agent Workflows and Tools

Agent definitions are stored under `ai.agent.config.tables` in the agent YAML.
Each table declares its public agent ID/name/description, provider settings,
model, individual agents, workflows, and runner entry point.

The default public agent ID is `300000`, and its runner selects
`sequential_draw_process`:

```text
agent_analyst -> agent_drawer -> agent_reviewer -> final Draw.io XML
```

The YAML also contains loop and parallel workflow examples; they are not the
default entry point. The schema supports `sequential`, `parallel`, and `loop`
workflows, with `max-iterations` for loops. Instructions and output keys pass
results between stages. The checked-in instructions request Chinese analysis
and raw Draw.io XML output; the frontend language selector does not change them.

Optional `module.chat-model.tool-mcp-list` entries configure local, SSE, or stdio
tools, while `tool-skills-list` configures skill resources. These lists are not
enabled in the default drawing configuration. See `internal/model/config.go`
for configuration fields and `internal/ai/` for implementations.

## HTTP API

All agent routes use the `/api/v1` prefix. `/healthz` is outside this prefix.

| Method | Path | Request | Result |
| --- | --- | --- | --- |
| `GET` | `/healthz` | None | HTTP health status |
| `GET` | `/api/v1/query-ai-agent-config-list` | None | Agent summaries with `agentID`, `agentName`, and `agentDesc` |
| `POST` | `/api/v1/create_session` | JSON: `agentID`, `userID` | `data.sessionID` |
| `GET` | `/api/v1/create_session` | Query: `agentID`, `userID` | Same session operation through query parameters |
| `POST` | `/api/v1/chat` | JSON: `agentID`, `userID`, `sessionID`, `message` | `data.content` containing text or diagram XML |
| `POST` | `/api/v1/chat_stream` | Same JSON fields as `/chat` | Server-sent `message` events and an `error` event on failure |

Session creation reuses the stored ID for the same `(userID, agentID)` pair.
Chat can obtain a session when `sessionID` is empty. Session IDs and mappings
are held in memory and reset when the process restarts.

### Request Examples

Create a session using this JSON body:

```json
{
  "agentID": "300000",
  "userID": "demo-user"
}
```

Send a message to `/api/v1/chat`, replacing `sessionID` with the returned value:

```json
{
  "agentID": "300000",
  "userID": "demo-user",
  "sessionID": "<returned-session-id>",
  "message": "Draw a user login flowchart."
}
```

Use `Content-Type: application/json` for both requests. Successful JSON API
responses use this envelope:

```json
{
  "code": "0000",
  "info": "success",
  "data": {
    "sessionID": "<returned-session-id>"
  }
}
```

Application errors also return HTTP 200; clients must inspect `code`:

| Code | Meaning |
| --- | --- |
| `0000` | Success |
| `0001` | Unknown or internal error |
| `0002` | Illegal parameter or request binding failure |
| `0003` | Agent not found |

Error envelopes omit `data`. Health responses and SSE events use their own
formats instead of this envelope. Configure streaming clients for a POST
request with a JSON body.

## Build and Checks

Run from `apps/api`:

```sh
go test ./...
go vet ./...
go build -o server ./cmd/server
```

Run the resulting executable from `apps/api`, or provide configuration paths
that resolve from its working directory. On Windows, use
`go build -o server.exe ./cmd/server`.

## Project Layout

```text
cmd/server/             CLI entry point and startup
configs/                Application and agent workflow YAML
internal/
  bootstrap/            Dependency assembly, Gin router, CORS, and health route
  config/               YAML loading, defaults, and validation
  handler/              HTTP routes and request handling
  dto/                  HTTP request and response types
  response/             JSON response envelope
  chat/                 Agent lookup, session resolution, and execution
  ports/                Interfaces and in-memory stores
  model/                Configuration and domain types
  armory/               Agent assembly pipeline nodes
  factory/              Factory wiring for models, tools, agents, and runners
  adk/                  Agent and runner implementation
  ai/                   Model adapter, provider client, MCP tools, and skills
  workflow/             Sequential, parallel, and loop execution
  pipeline/             Assembly pipeline
pkg/                    Logging, error codes, dotenv, and connection helpers
```

## Operational Notes

The API currently has no authentication middleware. The frontend demo login
does not protect these routes. CORS reflects the request origin and allows
credentials; deployments requiring access control need authentication and an
appropriate origin policy.

Keep provider credentials in the server environment or a local dotenv file.
Deployments must include the application and agent YAML files alongside the
binary, or supply paths to them. Configure proxy timeouts to accommodate the
multi-stage drawing workflow, and allow SSE responses to flush when using
`/chat_stream`.

- **Startup reports a required provider field:** check the dotenv path and the
  `OPENAI_BASE_URL` / `OPENAI_API_KEY` process environment values.
- **Configuration files cannot be found:** start from `apps/api` or update all
  relevant paths for the working directory.
- **Chat reports an upstream error:** check the provider URL, completions path,
  credentials, model availability, and `llm.request-timeout`.
- **The frontend receives a 404:** ensure its API base URL includes `/api/v1`.

See the [project overview](../../README.md),
[contribution guide](../../CONTRIBUTING.md), and [MIT license](../../LICENSE).
