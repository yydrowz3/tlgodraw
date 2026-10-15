# Contributing Guide

Thank you for contributing to tlgodraw. This guide describes the development,
commit, and Pull Request conventions for the project.

## Before You Start

1. Fork the repository and create a feature branch from the default branch.
2. Make sure the following tools are installed:
   - Go 1.27.1 or a compatible version
   - Node.js and pnpm
3. Install or synchronize dependencies in both `apps/api` and `apps/web`.
4. Use local configuration when running the services. Never commit real secrets,
   tokens, database passwords, or other sensitive information.

The main project directories are:

- `apps/api`: Go backend service
- `apps/web`: React/Vite frontend application
- `docs`: Project documentation

## Development Workflow

1. Create a focused branch, such as `feat/workbench-toolbar` or
   `fix/session-timeout`.
2. Keep each commit focused. Do not mix unrelated formatting or refactoring into
   a feature change.
3. Update relevant configuration, documentation, and tests with the code change.
4. Run the checks related to your changes before committing.
5. Push your branch and open a Pull Request with a complete description of the
   changes and validation results.

## Local Checks

### Go API

Run the following commands from `apps/api`:

```bash
go test ./...
go vet ./...
```

If you change dependencies or Go formatting, also run:

```bash
go mod tidy
gofmt -w .
```

Before submitting, confirm that all changes to `go.mod` and `go.sum` are
necessary.

### Web Frontend

Run the following commands from `apps/web`:

```bash
pnpm install
pnpm lint
pnpm build
```

For development, use:

```bash
pnpm dev
```

For UI changes, verify the main pages, error states, and mobile layouts.

## Code Conventions

- Follow the existing directory structure, naming conventions, and abstraction
  boundaries.
- Format Go code with `gofmt` and add behavior-focused tests where appropriate.
- Follow the existing Oxlint, formatting, and component organization conventions
  for TypeScript and React code.
- Avoid unrelated bulk renames or formatting changes in focused patches.
- Keep sensitive configuration in environment variables or local configuration.
- Update documentation when API contracts, configuration formats, or user-visible
  behavior changes.

## Commit Messages

This project uses Conventional Commits with an Emoji prefix:

```text
<emoji> <type>(<scope>): <description>
```

Examples:

```text
✨ feat(workbench): add export action
🐛 fix(session): handle expired session
📝 docs: update contribution guide
```

Commit title requirements:

- Put the Emoji at the beginning of the title.
- Use a standard `type`, such as `feat`, `fix`, `docs`, `test`, `refactor`,
  `chore`, or `ci`.
- Keep `scope` short and accurate; it may be omitted when no scope applies.
- Write the `description` in English using the imperative mood, starting with a
  lowercase letter and without a trailing period.
- Keep the title at or below 72 characters when possible.
- Mark breaking changes with `!` or add `BREAKING CHANGE:` to the commit body,
  including migration instructions.

See [`docs/commit-conventions.md`](docs/commit-conventions.md) for the complete
list of types and rules.

## Pull Requests

When opening a Pull Request:

- Explain the reason for the change, its main implementation, and its impact.
- Link the related Issue, or explain the context if no Issue exists.
- List the tests, lint checks, and build commands that you ran.
- Include screenshots or a recording for UI changes, along with the tested
  viewport sizes or workflows.
- Describe compatibility implications for configuration, databases, APIs, or
  deployment.
- Keep the Pull Request limited to changes related to its stated purpose.
- Respond to review feedback and rerun affected checks after making changes.

## Issue Reports

When reporting a bug, include as much of the following as possible:

- Steps to reproduce
- Expected behavior and actual behavior
- Environment details such as operating system, browser, and Go/Node.js versions
- Relevant logs, error messages, or screenshots
- A minimal reproduction configuration

For feature requests, describe the use case, the problem to solve, and the
impact on existing behavior.

## License

By contributing to this project, you agree that your contributions will be
released under the MIT License in the project root [`LICENSE`](LICENSE).
