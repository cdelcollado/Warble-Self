# Warble — Quick Start

## Docker (recommended)

```bash
git clone https://github.com/cdelcollado/Warble-postgress.git
cd Warble-postgress

cp .env.example .env
# Edit .env: set BETTER_AUTH_SECRET (openssl rand -base64 32), change passwords

docker compose up --build -d
```

Open **http://localhost**

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
