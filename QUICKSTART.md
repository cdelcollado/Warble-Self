# Warble-Self — Quick Start

Warble-Self is a **single-user, self-hosted** version of Warble. No registration, no login — you're the only user. All uploads and repository actions are attributed to a local `warble` account that is created automatically on first startup.

## Docker (recommended)

```bash
git clone https://github.com/cdelcollado/Warble-Self.git
cd Warble-Self

cp .env.example .env
# Edit .env — required values:
#   POSTGRES_PASSWORD   → choose a strong password
#   MINIO_ACCESS_KEY    → choose a username for MinIO
#   MINIO_SECRET_KEY    → choose a strong password for MinIO
#   ADMIN_SECRET        → openssl rand -base64 32
#                         (protects /api/admin/* endpoints)

docker compose up --build -d
```

Open **http://localhost** in your browser. No login needed.

> **Port 80 conflict:** If your system nginx is running, stop it first:
> `sudo systemctl stop nginx`

## Local Development

```bash
# 1. Start infrastructure
docker compose up postgres minio -d

# 2. Backend
cp backend/.env.example backend/.env  # edit values
cd backend && npm install && npm run dev

# 3. Frontend (new terminal)
cd ..
npm install && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

## Admin API

The admin endpoints (`GET /api/admin/reports`, `DELETE /api/admin/codefiles/:id`, `DELETE /api/admin/comments/:id`) are protected by `ADMIN_SECRET`. Call them with:

```bash
curl -H "Authorization: Bearer <ADMIN_SECRET>" http://localhost/api/admin/reports
```

## Useful commands

```bash
# Stop everything
docker compose down

# Stop and delete all data (volumes)
docker compose down -v

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up --build -d

# Run backend tests
cd backend && npm test
```
