# TODOS

Items explicitly deferred from deployment hardening review (2026-04-09).
Each item is deliberately not in scope for the 2-week validation experiment.
Revisit if the experiment succeeds.

---

## Stream file preview endpoint

**What:** Refactor `GET /codefiles/:id/buffer` to stream the MinIO object
directly to the HTTP response instead of buffering it in memory first.

**Why:** Current implementation loads the full file (up to 10 MB) into a
Node.js Buffer before sending. Under concurrent preview load, this creates
memory pressure proportional to file size × concurrent requests.

**How to start:** The MinIO client returns a readable stream from `getObject()`.
Pipe it directly into `reply.raw` or use Fastify's `reply.send(stream)`.

**Blocked by:** Nothing. Low priority at MVP scale.

---

## Expand backend test coverage

**What:** Add Vitest test files for the currently untested route modules:
- `ratings.ts` (upsert, delete, recalculate)
- `comments.ts` (CRUD, threading)
- `reports.ts` (write path)
- `profiles.ts` (read, upsert)
- `codefiles.ts` — missing paths: 403 on non-owner delete, full upload success path, Zod validation failures

**Why:** Current suite covers critical regressions (download counter, truncation check)
and the admin auth surface. The untested routes are unlikely to break silently but
real users will hit them on day one.

**How to start:** Use `backend/src/__tests__/admin.test.ts` as the pattern.
Mock `../db/index.js` and `../storage/minio.js`, use `buildApp()`, test with `inject()`.

**Blocked by:** Nothing.

---

## CI/CD pipeline

**What:** GitHub Actions workflow that:
1. Runs `cd backend && npm test` on every push to main
2. (Optional) SSH deploys to server on merge to main via `docker compose pull && up -d`

**Why:** Right now a broken commit reaches the server on the next manual deploy.
A 5-minute CI run catches that before it happens.

**How to start:** `.github/workflows/test.yml` with `runs-on: ubuntu-latest`,
`services: postgres` for any integration tests added later. Server deploy requires
an SSH key stored as `SERVER_SSH_KEY` in GitHub Actions secrets.

**Blocked by:** Validation experiment surviving 2 weeks.
