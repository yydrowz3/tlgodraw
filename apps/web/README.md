# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Interface languages

The interface supports English (`en`, the first-visit default), Simplified
Chinese (`zh-CN`), and Japanese (`ja`). The language selector next to the
appearance controls is available on both the login page and workbench, including
mobile screens. The choice is saved under `tlgodraw_language` in localStorage.
Invalid or inaccessible settings fall back to English; if saving is blocked,
switching still works for the current page. Browser language detection is disabled.

Translation resources live in `src/i18n/locales/`. Add semantic keys to
`en.ts`, then supply the same keys and interpolation placeholders in
`zh-CN.ts` and `ja.ts`. English defines the TypeScript key shape and is the
runtime fallback. Keep phrases with variables in one translation rather than
concatenating fragments. Use `useTranslation` for rendering and retain semantic
keys or error objects in transient state so active notices also change language.

Switching preserves drafts, sessions, requests, and the embedded editor. Dates
and times follow the interface language while retaining the browser's time zone.
Quick-action labels and newly inserted example prompts follow the selected language.
Draw.io menus, configured agent names, user messages, AI replies, custom session
titles, and diagram text are not translated. Chat failure messages retain the
language used when they were recorded. API failures show a translated summary
with any original server details; request contracts are unchanged.

Local sessions keep the existing `drawio_sessions` key. Optional
`isDefaultTitle` and `kind: "greeting"` markers allow built-in titles and
welcome messages to translate at render time. Legacy sessions are recognized only
when a `New Chat` title has no user messages, or the first agent message exactly
matches the original built-in greeting. Explicit markers take precedence for
titles, so manually naming a new session `New Chat` is preserved verbatim.

Run `pnpm test`, `pnpm lint`, and `pnpm build` after changing translations.
The tests check resource keys and placeholders, preference handling, live UI
switching, historical content, request ownership, and editor preservation.
