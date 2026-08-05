---
goal: Add a session-authenticated asynchronous video generation workbench
version: 1.0
date_created: 2026-08-05
last_updated: 2026-08-05
owner: New API maintainers
status: 'In progress'
tags: [feature, video-generation, frontend, backend, billing]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Implement a video generation workspace that matches the existing image generation experience while using the repository's asynchronous task submission, polling, billing settlement, refund, and result proxy infrastructure.

## 1. Requirements & Constraints

- **REQ-001**: Add a protected `/video-generation` page with prompt, model, reference images, duration, aspect ratio, generation status, history, playback, reuse, and download controls.
- **REQ-002**: Submit video jobs through a session-authenticated `/pg/videos` endpoint and poll `/pg/videos/:task_id` until the task is completed or failed.
- **REQ-003**: Reuse existing task billing, task persistence, automatic settlement, and failure refund behavior without introducing a second billing path.
- **REQ-004**: List only models available to the signed-in user's group that are served by video-capable task channels.
- **REQ-005**: Support text-to-video and image-to-video with at most three PNG, JPEG, WebP, or GIF reference images of at most 10 MiB each.
- **SEC-001**: Require authenticated user sessions for all `/pg/videos` routes and scope task fetches to the authenticated user.
- **CON-001**: Do not expose reference video or reference audio controls until the generic task request has a provider-independent upload contract.
- **CON-002**: Do not send an explicit group in the task payload because `TaskSubmitReq` does not define group selection; use the authenticated user's backend group.
- **CON-003**: Preserve all unrelated existing workspace changes and existing token-authenticated `/v1/videos` behavior.
- **GUD-001**: Match the current image generation page's layout, spacing, responsive behavior, and direct model selection interaction.
- **PAT-001**: Use `controller.RelayTask` for submission, `controller.RelayTaskFetch` for status retrieval, and the existing task adaptor/result normalization pipeline.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Expose the existing asynchronous video task system to authenticated web sessions without changing public API behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add POST `/pg/videos` and GET `/pg/videos/:task_id` routes in `router/relay-router.go` using `controller.RelayTask` and `controller.RelayTaskFetch` with `RelayModeVideoFetchByID`. | ✅ | 2026-08-05 |
| TASK-002 | Update `middleware/distributor.go` to recognize `/pg/videos` as OpenAI-style video submit/fetch routes, select a channel only for POST, and recover the original task model for GET. | ✅ | 2026-08-05 |
| TASK-003 | Update `relay/relay_task.go` so `/pg/videos/:task_id` returns the normalized `dto.OpenAIVideo` response used by `/v1/videos/:task_id`. | ✅ | 2026-08-05 |
| TASK-004 | Extend video endpoint classification in `common/model.go` and its tests so user model filtering includes all task channel types backed by video adaptors. | ✅ | 2026-08-05 |

### Implementation Phase 2

- GOAL-002: Build the video generation workbench and integrate it with navigation and localization.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `web/default/src/features/video-generation/` types, constants, API functions, state hook, reference uploader, generation form, result/history panel, and page component. | ✅ | 2026-08-05 |
| TASK-006 | Convert accepted reference image files to data URLs, submit `{model,prompt,images,duration,seconds,size}`, poll every three seconds, and normalize queued, in-progress, completed, and failed responses. | ✅ | 2026-08-05 |
| TASK-007 | Add the protected TanStack route at `web/default/src/routes/_authenticated/video-generation/index.tsx`. | ✅ | 2026-08-05 |
| TASK-008 | Add `video_gen` to sidebar defaults, runtime sidebar data, profile configuration, system configuration, and backend default module configuration. | ✅ | 2026-08-05 |
| TASK-009 | Add complete Simplified Chinese and English localization keys for the new workspace and navigation label. | ✅ | 2026-08-05 |

### Implementation Phase 3

- GOAL-003: Verify backend routing, frontend correctness, and the rendered local page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Add backend tests for `/pg/videos` distributor relay modes, normalized fetch response selection, and video endpoint model classification. | ✅ | 2026-08-05 |
| TASK-011 | Run targeted Go tests, frontend TypeScript validation, and frontend lint for all changed files. | ✅ | 2026-08-05 |
| TASK-012 | Open the local `/video-generation` page, verify responsive controls and empty/loading/result states, and fix visual or console regressions. | | |

## 3. Alternatives

- **ALT-001**: Call `/v1/videos` directly from the browser with a user-managed API key; rejected because the signed-in workbench should deduct the user's site quota without requiring API key setup.
- **ALT-002**: Implement a synchronous video response like image generation; rejected because video providers return task identifiers and complete asynchronously.
- **ALT-003**: Add generic reference video and audio upload fields immediately; rejected because current task adaptors do not share a safe, provider-independent payload contract for those media types.

## 4. Dependencies

- **DEP-001**: Existing Gin session authentication, distributor middleware, task relay controller, task poller, billing service, and provider task adaptors.
- **DEP-002**: Existing React, TanStack Query, TanStack Router, Axios wrapper, i18next, shadcn/ui, and Lucide dependencies in `web/default`.

## 5. Files

- **FILE-001**: `router/relay-router.go`, `middleware/distributor.go`, and `relay/relay_task.go` for session video task routing and normalized responses.
- **FILE-002**: `common/model.go` and related Go tests for video-capable model classification.
- **FILE-003**: `web/default/src/features/video-generation/**` for the video workspace implementation.
- **FILE-004**: `web/default/src/routes/_authenticated/video-generation/index.tsx` for authenticated routing.
- **FILE-005**: Sidebar configuration files in `web/default/src/hooks`, profile settings, system settings, and `controller/user.go`.
- **FILE-006**: `web/default/src/i18n/locales/en.json` and `web/default/src/i18n/locales/zh.json` for localized UI copy.

## 6. Testing

- **TEST-001**: Verify POST `/pg/videos` is classified as video submit and reads the requested model while GET `/pg/videos/:task_id` is classified as video fetch without channel selection.
- **TEST-002**: Verify video-capable task channel models are returned for `endpoint_type=openai-video` and non-video endpoint filters remain unchanged.
- **TEST-003**: Verify TypeScript compilation accepts task request/response normalization, polling cleanup, reference image handling, and route integration.
- **TEST-004**: Verify the local page visually provides empty, submitting, processing, completed, and failed states with usable playback and download controls.

## 7. Risks & Assumptions

- **RISK-001**: Provider-specific duration and size constraints differ; the UI must choose conservative defaults and surface upstream validation errors without hiding them.
- **RISK-002**: Base64 reference images increase JSON request size; the three-file and 10 MiB-per-file limits bound client behavior, while deployments may need a smaller reverse-proxy body limit.
- **RISK-003**: Some configured video models may support only text-to-video or image-to-video; the selected provider remains the source of truth and errors must trigger the existing refund path.
- **ASSUMPTION-001**: The backend task poller remains enabled and updates persisted task status and result metadata after successful submission.
- **ASSUMPTION-002**: A configured video task channel and priced model are required for an end-to-end generation test; UI and routing verification can proceed without spending quota.

## 8. Related Specifications / Further Reading

[Reference playground](https://nbility.ai/playground)
[OpenAI video API compatibility routes](../router/video-router.go)
