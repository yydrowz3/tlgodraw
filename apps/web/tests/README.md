# Frontend verification

Run from `apps/web`:

```sh
pnpm test
pnpm lint
pnpm build
```

The tests cover appearance preferences, browser storage failures, export request
correlation and timeouts, save-before-remount, and delayed replies after changing
sessions. API tests also cover query cache sharing, stale-data refresh on mount,
focus and reconnect, request cancellation, mutation retry protection, agent
selection changes, and delayed responses after unmount. Each test gets an
isolated QueryClient, and API requests use mocked fetch responses. They do not
call an AI provider.

For browser QA, `node tests/apiFixture.mjs` serves a deterministic API on port 8099. In a second PowerShell terminal, start an isolated frontend using the real
self-hosted Draw.io instance:

```powershell
$env:VITE_BASE_URL = 'http://127.0.0.1:8099/api/v1'
$env:VITE_DRAWIO_BASE_URL = 'http://43.155.185.215:8085/'
pnpm dev --host 127.0.0.1 --port 5175 --strictPort
```

These process overrides leave `.env` unchanged. The HTTPS instance configured in
the local `.env` currently fails browser certificate validation
(`ERR_CERT_AUTHORITY_INVALID`); the HTTP instance loads inside the localhost app.
For production, use a Draw.io endpoint with a browser-trusted HTTPS certificate.

Use the existing demo login. A message containing `draw` returns a sample diagram;
`slow` delays the response, and `error` returns an HTTP error. Test sessions belong
to the browser origin used for QA. The fixture is not imported into the app build.

Check both themes at 390, 768, 1024 and 1440 CSS pixels, plus session actions,
drawer focus/escape, dialog focus/escape, preserved composer drafts, diagram
restoration and SVG preview. Draw.io uses its native Minimal interface so its
panels do not consume the entire drawing area on phones. Resizing the viewport
does not reload the editor.

Theme changes save the latest diagram before remounting the editor. This resets
Draw.io undo/redo history. Timeout or storage failure leaves the existing editor
mounted and offers a retry. The app follows the system only until the first
explicit light/dark choice; this preference is independent of login and sessions.

Phone viewport emulation checks layout; actual iOS/Android keyboard behavior still
requires device testing. The app uses `visualViewport` height and the
`interactive-widget=resizes-content` viewport hint to keep the composer visible.
