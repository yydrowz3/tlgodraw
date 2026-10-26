# Too Long; Go Draw — Web

The React frontend for Too Long; Go Draw, an AI-assisted diagramming workbench.
Describe a diagram, review the generated Draw.io canvas, and refine it through
chat or direct editing.

## Features

- Embedded Draw.io editor with autosave and SVG preview/download.
- AI agent selection, chat, and optional inclusion of the current diagram XML
  as context for a request.
- Multiple browser-local sessions with chat history, diagram restoration,
  renaming, and deletion.
- Responsive workbench with light and dark themes.
- English, Simplified Chinese, and Japanese interface languages.

## Stack

React 19, TypeScript 6, and Vite 8 with React Compiler; TanStack Router for
file-based routes, TanStack Query for API state, and TanStack Form for login.
Styling uses Tailwind CSS 4 and daisyUI 5. The diagram editor is embedded through
`react-drawio`, and translations use i18next/react-i18next. Vitest and Testing
Library provide tests; Oxlint and Oxfmt provide linting and formatting.

## Requirements

- Node.js compatible with the installed dependencies. Node.js 24.15 or later
  within the 24.x release line supports the current Vite, Vitest, and jsdom
  engine requirements.
- pnpm. The dependency lockfile is `pnpm-lock.yaml`.
- The [Go API](../api/README.md) running for agent discovery and chat.
- Browser access to a Draw.io embed server. The default is
  `https://embed.diagrams.net`.

## Local Development

From the repository root:

```sh
cd apps/web
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_BASE_URL=http://localhost:8091/api/v1
VITE_DRAWIO_BASE_URL=https://embed.diagrams.net
```

Start the API in another terminal using its README, then start the frontend:

```sh
pnpm dev
```

Open the URL printed by Vite and sign in with the demo credentials:

```text
Username: admin
Password: admin
```

This login is a client-side demo check stored in a browser cookie. It does not
authenticate requests to the API.

### Environment Variables

| Variable | Purpose | Fallback |
| --- | --- | --- |
| `VITE_BASE_URL` | Complete API base URL, including `/api/v1` | `http://localhost:8091/api/v1` when undefined |
| `VITE_DRAWIO_BASE_URL` | Draw.io embed server URL | `https://embed.diagrams.net` when empty or undefined |

Set `VITE_BASE_URL` explicitly when copying the example: an empty value produces
relative API requests and does **not** use the localhost fallback. There is no
API proxy configured in `vite.config.ts`.

Vite reads these values when starting development or building the application.
Restart the dev server after changing them and rebuild for deployment. All
`VITE_` values are exposed to the browser; keep AI provider credentials in the
backend environment.

## Commands

Run these commands from `apps/web`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Type-check the project and build static assets into `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run the Vitest suite once in jsdom |
| `pnpm lint` | Run Oxlint |
| `pnpm fmt` | Format files with Oxfmt |
| `pnpm fmt:check` | Check formatting without writing changes |

The tests use mocked API responses and do not call an AI provider. They cover
API state and cancellation, session ownership, diagram export and editor
synchronization, theme preferences, and language switching. See
[frontend verification](tests/README.md) for fixture-based browser QA.

## API Integration

`src/services/apiAgent.ts` calls these routes relative to `VITE_BASE_URL`:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/query-ai-agent-config-list` | Load available agents |
| `POST` | `/create_session` | Obtain a backend session ID |
| `POST` | `/chat` | Submit a message and receive diagram XML or text |

JSON responses use a `{ code, info, data }` envelope; `code: "0000"` indicates
success. The current workbench uses the JSON chat endpoint. The backend also
offers an SSE endpoint documented in the [API README](../api/README.md).

## State and Editor Behavior

Sessions, messages, and diagram XML are stored under `drawio_sessions` in
localStorage for the current browser origin. They are separate from backend
session IDs and are not synchronized between devices or browser origins.
Language, theme, and the last selected agent use `tlgodraw_language`,
`tlgodraw_theme`, and `ai_agent_last_agent`, respectively.

The app saves the current diagram before switching sessions or remounting the
editor for a theme change. A theme change resets Draw.io undo/redo history.
Export requests are serialized and matched to their originating session to avoid
applying delayed results to another drawing.

## Internationalization

English (`en`) is the first-visit default and runtime fallback; browser language
detection is disabled. The language selector is available on the login page and
workbench, and switching preserves drafts, sessions, requests, and the editor.
Dates follow the interface language and retain the browser time zone.

Translation resources live in `src/i18n/locales/`. Add semantic keys to `en.ts`,
then supply matching keys and interpolation placeholders in `zh-CN.ts` and
`ja.ts`. English defines the TypeScript key shape. Use `useTranslation` when
rendering and store semantic keys or error objects for transient notices.

Draw.io menus, configured agent names, user messages, AI replies, custom session
titles, and diagram text retain their original language. Recorded chat failures
retain the language used when saved. Built-in session titles and greetings use
`isDefaultTitle` and `kind: "greeting"` markers; legacy detection preserves
manually assigned titles. Run `pnpm test`, `pnpm lint`, and `pnpm build` after
changing translations.

## Project Layout

```text
public/                 Icons and branding assets
src/
  hooks/                Workbench, API, session, editor, and preference logic
  i18n/                 Translation setup, messages, and locale resources
  routes/               TanStack Router file-based routes
  services/             HTTP API client
  types/                API and workbench types
  ui/                   Pages, shared components, and workbench panels
  utils/                Diagram exports, themes, cookies, and helpers
  main.tsx              Application entry point
  routeTree.gen.ts      Generated route tree
tests/                  Unit/component tests and the local API fixture
vite.config.ts          Build plugins and the @/ source alias
vitest.config.ts        jsdom test configuration
```

Edit route files in `src/routes/`; the router plugin generates
`src/routeTree.gen.ts`.

## Deployment and Troubleshooting

Build with the public API and editor URLs configured, then serve `dist/` from a
static host. Configure SPA fallback to `index.html` so direct navigation to
`/login` works. `pnpm preview` is for local build verification.

- **Agents do not load:** confirm the API is running and `VITE_BASE_URL` includes
  `/api/v1`. Check the browser network panel for HTTP or application errors.
- **The editor does not load:** verify the embed server is reachable and allows
  embedding. An HTTPS frontend needs a browser-trusted HTTPS editor endpoint.
- **Sessions cannot be saved:** check localStorage availability and quota;
  export important diagrams before clearing browser storage.
- **AI generation fails:** inspect the API logs and backend provider/model
  configuration.

See the [project overview](../../README.md),
[contribution guide](../../CONTRIBUTING.md), and [MIT license](../../LICENSE).
