# tlgodraw

`tlgodraw` is an AI-assisted diagramming workbench. Describe a diagram in
natural language, collaborate with an AI agent, and create or refine Draw.io
diagrams in the browser.

The project contains a Go API service and a React/Vite frontend. The default AI
workflow analyzes the request, generates Draw.io XML, and reviews the result
before returning it to the workbench.

## Features

- Natural-language diagram generation.
- Draw.io editing in the browser.
- AI-assisted diagram analysis, generation, and review.
- Multiple local drawing and chat sessions.
- Session persistence in browser `localStorage`.
- Configurable OpenAI-compatible API settings and agent workflows.

## Project Structure

```text
apps/
  api/       Go backend service
  web/       React/Vite frontend application
docs/        Project documentation
```

The API configuration is stored in `apps/api/configs/application.yaml`, and the
agent workflow is configured in `apps/api/configs/agent/draw.yaml`.

## Requirements

- Go 1.27.1 or a compatible version.
- Node.js and pnpm.
- An OpenAI-compatible API for AI diagram generation.
- PostgreSQL and Redis are optional for the default local configuration. Enable
  them only when the corresponding application features require them.

## Configuration

The API loads `configs/application.yaml` by default when started from the
`apps/api` directory. It also supports:

- `APP_CONFIG`: path to the application YAML configuration.
- `APP_ENV_FILE`: path to a dotenv file. Set it to an empty value to skip dotenv
  loading.

The default agent configuration expects these environment variables:

- `OPENAI_BASE_URL`: OpenAI-compatible API base URL.
- `OPENAI_API_KEY`: API key for the configured AI provider.

Create a local `.env` file in `apps/api` for development values. Do not commit
real credentials or other sensitive information.

The default API address is `http://localhost:8091`. The frontend reads its API
base URL from `VITE_BASE_URL`, for example:

```dotenv
VITE_BASE_URL=http://localhost:8091
```

## Deploy the API to Render

The repository includes `render.yaml` for deploying the Go API as a Render Web
Service. It uses `apps/api` as the root directory, builds with:

```bash
go build -tags netgo -ldflags '-s -w' -o app ./cmd/server
```

and starts with `./app`. Render provides the `PORT` environment variable; the
API uses it automatically in production. The health check endpoint is
`/healthz`.

Set `OPENAI_BASE_URL` and `OPENAI_API_KEY` as secret environment variables in
Render. The agent configuration is loaded from
`apps/api/configs/agent/draw.yaml` relative to the API working directory.

## Running Locally

### Start the API

From the repository root:

```bash
cd apps/api
go run ./cmd/server
```

The server listens on `:8091` by default. To use custom configuration paths:

```bash
go run ./cmd/server --env .env --config configs/application.yaml
```

### Start the Web App

In a second terminal:

```bash
cd apps/web
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Make sure `VITE_BASE_URL` points to the
running API service.

## Development Checks

Run API checks from `apps/api`:

```bash
go test ./...
go vet ./...
```

Run frontend checks from `apps/web`:

```bash
pnpm lint
pnpm build
```

## API Overview

The frontend uses the API for the following operations:

- `GET /query-ai-agent-config-list`: list available AI agents.
- `POST /create_session`: create an AI session.
- `POST /chat`: send a message and receive an AI response.

The API returns a response envelope with a success code of `0000` for successful
requests.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions,
local checks, commit message rules, and Pull Request requirements.

For community expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). For
security reports, see [SECURITY.md](SECURITY.md).

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
