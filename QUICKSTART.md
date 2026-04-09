# Warble — Quick Start

## Docker (recommended)

```bash
git clone https://github.com/cdelcollado/Warble-postgress.git
cd Warble-postgress

cp .env.example .env
# Edit .env — required values:
#   BETTER_AUTH_SECRET  → openssl rand -base64 32
#   ADMIN_SECRET        → openssl rand -base64 32
#   POSTGRES_PASSWORD   → choose a strong password
#   MINIO_ACCESS_KEY / MINIO_SECRET_KEY → choose strong values
#
# If Caddy serves HTTPS (default for non-localhost domains):
#   BETTER_AUTH_URL=https://your-domain.com
#   FRONTEND_URL=https://your-domain.com
#
# For localhost with Caddy's auto-HTTPS:
#   BETTER_AUTH_URL=https://localhost
#   FRONTEND_URL=https://localhost

docker compose up --build -d
```

Open **http://localhost** (or **https://localhost** if Caddy issued a local certificate)

> **Port 80 conflict:** If the system nginx is running (`sudo systemctl stop nginx`), stop it before starting the stack.

## Local Development

```bash
# 1. Start infrastructure
docker compose up postgres minio -d

# 2. Backend
cp backend/.env.example backend/.env  # edit values
cd backend && npm install && npm run dev

# 3. Frontend (new terminal)
cd ..
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm install && npm run dev
```

Frontend: http://localhost:5173

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
```
