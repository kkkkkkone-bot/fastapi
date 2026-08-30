---
goal: Improve Fast API search crawlability, indexability, page performance, and direct GitHub-to-Zeabur deployment readiness
version: 1.0
date_created: 2026-08-30
last_updated: 2026-08-30
owner: Fast API maintainers
status: 'Completed'
tags: [feature, seo, performance, deployment, zeabur]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Implement production SEO foundations for the Fast API public site while preserving the existing New API and QuantumNous attribution, then make the repository safe and documented for direct Dockerfile deployment from GitHub to Zeabur.

## 1. Requirements & Constraints

- **REQ-001**: Serve valid plain-text `/robots.txt` and valid XML `/sitemap.xml` responses without SPA HTML fallback content.
- **REQ-002**: Serve route-aware titles, descriptions, canonical URLs, Open Graph metadata, Twitter metadata, and JSON-LD in the initial HTML response for public indexable routes.
- **REQ-003**: Return HTTP 404 for unknown browser routes while continuing to serve the SPA shell for all declared application routes.
- **REQ-004**: Mark authentication, account, administrative, setup, OAuth, and error routes as `noindex, nofollow`.
- **REQ-005**: Render meaningful public homepage content in the initial HTML before React starts, then replace it with the interactive application without duplicate content.
- **REQ-006**: Reduce the homepage loading gate so the default landing page does not wait for `/api/home_page_content` when no cached custom homepage exists.
- **REQ-007**: Use one-year immutable caching for fingerprinted production assets and no-cache for HTML documents.
- **REQ-008**: Support direct Zeabur deployment from the GitHub repository using the existing root `Dockerfile`, including documented environment, database, volume, and migration requirements.
- **SEC-001**: Exclude local binaries, SQLite databases, logs, caches, and generated artifacts from the Docker build context.
- **SEC-002**: Do not commit credentials, Zeabur tokens, database connection strings, or user data.
- **CON-001**: Preserve every existing New API and QuantumNous project name, attribution, comment, package path, license, and copyright reference.
- **CON-002**: Preserve SQLite, MySQL, and PostgreSQL compatibility.
- **CON-003**: Preserve the React 19, TanStack Router, Rsbuild, Gin, and embedded-filesystem architecture.
- **GUD-001**: Use Bun for frontend commands and project-standard Go tooling for backend tests.
- **PAT-001**: Keep SEO response generation in the router layer and keep route classification deterministic and testable.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Implement correct crawl, index, metadata, and HTTP response behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `router/seo.go` with canonical URL normalization, public/noindex route metadata, robots response generation, sitemap response generation, and HTML metadata injection. | ✅ | 2026-08-30 |
| TASK-002 | Add `router/seo_test.go` covering robots validity, sitemap XML validity, canonical URLs, public metadata, noindex routes, known SPA routes, and unknown-route 404 behavior. | ✅ | 2026-08-30 |
| TASK-003 | Update `router/web-router.go` to register robots and sitemap endpoints, inject metadata for known browser routes, and return 404 for unknown browser routes. | ✅ | 2026-08-30 |
| TASK-004 | Update `web/default/index.html` and `web/classic/index.html` with SEO injection markers while preserving New API and QuantumNous attribution. | ✅ | 2026-08-30 |

### Implementation Phase 2

- GOAL-002: Make meaningful homepage content available immediately and improve cache behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Add visible, accessible Fast API homepage fallback content to `web/default/index.html` and remove it immediately before React mounts in `web/default/src/main.tsx`. | ✅ | 2026-08-30 |
| TASK-006 | Update `web/default/src/features/home/hooks/use-home-page-content.ts` and `web/default/src/features/home/index.tsx` so the built-in homepage renders immediately when no cached custom homepage exists. | ✅ | 2026-08-30 |
| TASK-007 | Update `middleware/cache.go` to return one-year immutable caching for fingerprinted static assets, a shorter safe cache for non-fingerprinted assets, and no-cache for HTML routes. | ✅ | 2026-08-30 |

### Implementation Phase 3

- GOAL-003: Make direct GitHub-to-Zeabur deployment safe and reproducible.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Update `.dockerignore` to exclude local binaries, databases, logs, caches, plans, and development artifacts from Zeabur Docker build contexts. | ✅ | 2026-08-30 |
| TASK-009 | Add `docs/deployment/zeabur-github.md` with GitHub App setup, Dockerfile auto-detection, required variables, PostgreSQL/Redis recommendations, SQLite `/data` volume requirements, data migration, domain binding, and rollback steps. | ✅ | 2026-08-30 |

### Implementation Phase 4

- GOAL-004: Verify correctness, compatibility, and production build output.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Run Go formatting and targeted router/middleware tests. | ✅ | 2026-08-30 |
| TASK-011 | Run targeted frontend formatting/lint checks, default-theme type checking, and both production theme builds with Bun. | ✅ | 2026-08-30 |
| TASK-012 | Build the Go application with embedded frontend assets and verify robots, sitemap, metadata, canonical, noindex, 404, cache headers, and Lighthouse results against a local production server. | ✅ | 2026-08-30 |

## 3. Alternatives

- **ALT-001**: Deploy a prebuilt container image to Zeabur; rejected because it adds an unnecessary image registry and manual image publishing layer when Zeabur can build the root Dockerfile directly from GitHub.
- **ALT-002**: Migrate the public website to a separate SSR framework immediately; deferred because the current Gin router can provide initial metadata and crawlable fallback content with a smaller, lower-risk change.
- **ALT-003**: Return the SPA shell for every unknown route; rejected because this produces soft 404 responses and ambiguous indexing signals.

## 4. Dependencies

- **DEP-001**: Existing root `Dockerfile` and embedded frontend build pipeline.
- **DEP-002**: Zeabur GitHub integration and Dockerfile auto-detection.
- **DEP-003**: Configured `ServerAddress` system setting for production canonical URL generation.
- **DEP-004**: Bun, Go, Chrome, Lighthouse, and browser-harness for local verification.

## 5. Files

- **FILE-001**: `router/seo.go` — SEO route classification and response generation.
- **FILE-002**: `router/seo_test.go` — SEO behavior tests.
- **FILE-003**: `router/web-router.go` — browser route response handling.
- **FILE-004**: `web/default/index.html` — default-theme initial metadata and fallback content.
- **FILE-005**: `web/classic/index.html` — classic-theme SEO marker compatibility.
- **FILE-005A**: `web/classic/rsbuild.config.ts` — isolate the classic theme's required date-fns v2 dependency during repository builds.
- **FILE-006**: `web/default/src/main.tsx` — fallback replacement before React mounting.
- **FILE-007**: `web/default/src/features/home/hooks/use-home-page-content.ts` — non-blocking custom homepage loading.
- **FILE-008**: `web/default/src/features/home/index.tsx` — immediate built-in homepage rendering.
- **FILE-009**: `middleware/cache.go` — cache policy.
- **FILE-009A**: `middleware/cache_test.go` — cache policy tests.
- **FILE-010**: `.dockerignore` — source deployment build-context exclusions.
- **FILE-011**: `docs/deployment/zeabur-github.md` — direct repository deployment runbook.

## 6. Testing

- **TEST-001**: `go test ./router ./middleware` succeeds.
- **TEST-002**: Targeted format/lint checks and `bun run typecheck` succeed for changed default-theme files; default and classic production builds both succeed.
- **TEST-003**: Production `/robots.txt` contains no HTML and Lighthouse reports no robots syntax errors.
- **TEST-004**: Production `/sitemap.xml` parses as XML and contains only canonical public URLs.
- **TEST-005**: Production public routes return unique initial metadata and self-referential canonical URLs.
- **TEST-006**: Production private routes return `X-Robots-Tag: noindex, nofollow`.
- **TEST-007**: Production unknown routes return HTTP 404 instead of HTTP 200.
- **TEST-008**: Production fingerprinted static assets return `Cache-Control: public, max-age=31536000, immutable`.
- **TEST-009**: Local mobile Lighthouse performance and SEO results are recorded after the changes.

## 7. Risks & Assumptions

- **RISK-001**: Strict known-route classification may omit a valid browser route; tests must enumerate generated TanStack routes and backend public error routes before release.
- **RISK-002**: Repository builds take longer than prebuilt image pulls because Zeabur compiles both frontend themes and the Go binary.
- **RISK-003**: Switching an existing image service to a new Git service without preserving its database or `/data` volume can lose runtime state.
- **ASSUMPTION-001**: Production continues to use `https://www.fastapi.ltd` as the configured ServerAddress and canonical host.
- **ASSUMPTION-002**: The default frontend theme remains the production theme while classic-theme compatibility is retained.
- **ASSUMPTION-003**: Zeabur builds the repository root and automatically detects the root `Dockerfile`.

## 8. Related Specifications / Further Reading

[Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
[Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
[Zeabur GitHub integration](https://zeabur.com/docs/en-US/deploy/methods/github-integration)
[Zeabur Dockerfile deployment](https://zeabur.com/docs/en-US/deploy/methods/dockerfile)
[Zeabur volumes](https://zeabur.com/docs/en-US/data-management/volumes)
