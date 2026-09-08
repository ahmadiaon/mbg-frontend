# Product Requirements Document (PRD)

## Overview

The project consists of a **Laravel backend** (`mbg-backend`) and a **React/TypeScript frontend** (`mbg-frontend`).

The goal is to **reduce redundant data fetching and improve application performance** by introducing:

1. **Server‑side in‑memory cache** (`SchemaCacheService`) for EAV builder metadata.
2. **Frontend context cache** (`EavContext`) that stores schema and master records in `localStorage` and shares them across pages.
3. **Cache invalidation** on any mutation (create/update/delete entity, field, or approval configuration).

## User Stories

- **As a user**, I want the UI to load instantly after login without repeated heavy API calls, so I can work efficiently.
- **As an admin**, I need any changes to the data model to be reflected immediately across the app, without stale data.
- **As a developer**, I want a clear caching layer that can be unit‑tested and does not require manual cache management throughout the codebase.

## Functional Requirements

| ID | Description |
|----|-------------|
| FR‑1 | `SchemaCacheService` stores the result of `eavApi.builder()` in memory for the lifetime of the backend process.
| FR‑2 | `SchemaCacheService.get()` returns cached data if it is less than **5 minutes** old; otherwise it returns `null`.
| FR‑3 | All services that need schema (`EavService`, `ApprovalService`) must request the cache first and fall back to the DB when missing.
| FR‑4 | `SchemaCacheService.invalidate()` is called after any mutating operation (entity/field CRUD, approval config save).
| FR‑5 | `EavContext` loads the cached schema from `localStorage` on mount (`fetchSchema`).
| FR‑6 | `EavContext` provides `fetchMasterRecords(tableCode)` that caches master data per table in memory and persists it to `localStorage`.
| FR‑7 | UI components (`DatabaseData`, `DatabaseForm`, etc.) consume the context instead of calling `eavApi.builder()` directly.
| FR‑8 | When the cache is invalidated, the context automatically refreshes on the next navigation or explicit `invalidateSchema()` call.

## Non‑Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR‑1 | Cache lookup latency must be **< 5 ms** (in‑memory).
| NFR‑2 | Cache size is limited to the schema (≈ 200 KB) and master records (≤ 5 MB total).
| NFR‑3 | The system must remain functional when the cache is empty (fallback to DB).
| NFR‑4 | All cache keys must be namespaced (`mbg_eav_schema`, `mbg_eav_master_<TABLE>`).
| NFR‑5 | Unit tests must achieve **≥ 90 %** coverage of cache logic.

## Acceptance Criteria

- [ ] Running `npm run build` for the frontend succeeds with **no TypeScript unused‑variable errors**.
- [ ] Backend unit tests pass (`npm test` → all passed).
- [ ] After a mutation (e.g., creating a new entity), navigating to another page shows the updated schema without a full DB query (verify via network tab).
- [ ] When the backend restarts, the in‑memory cache is rebuilt lazily on first request.
- [ ] `localStorage` entries are cleared when the user logs out.

## Dependencies

- `NestJS` (`@nestjs/common`, `@nestjs/core`) for backend modules.
- Existing `eavApi` client in the frontend.
- No new external libraries are required.

## Milestones & Timeline

| Milestone | Owner | Estimated Effort |
|-----------|-------|------------------|
| Implement `SchemaCacheService` & module | Backend dev | 1 day |
| Add cache usage & invalidation in services | Backend dev | 1 day |
| Create `EavContext` with master‑record caching | Frontend dev | 2 days |
| Refactor pages to use context (DatabaseData, DatabaseForm, Home) | Frontend dev | 2 days |
| Unit‑test cache layers (backend & frontend) | QA | 1 day |
| Verify build & performance | DevOps | 0.5 day |

## Open Questions / Decisions

> [!IMPORTANT]
> - **Cache TTL**: The current design uses a 5‑minute TTL for the server‑side cache. Do we need a configurable TTL?
> - **Storage Size Limits**: Should we enforce a hard limit on the total size of master‑record caches in the browser?

---

*Prepared by Antigravity coding assistant.*
