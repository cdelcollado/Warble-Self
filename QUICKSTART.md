# Warble-Self — Quick Start

Warble-Self is a **single-user, self-hosted** version of Warble. No registration, no login — you're the only user. All uploads and repository actions are attributed to a local `warble` account that is created automatically on first startup.

## Docker (recommended)

```bash
git clone https://github.com/cdelcollado/Warble-Self.git
cd Warble-Self

./setup.sh          # generates .env with random secrets automatically
docker compose up --build -d
```

> For production with a real domain, edit `.env` before starting and set `DOMAIN`, `BETTER_AUTH_URL` and `FRONTEND_URL`. See the [SSL section](#ssl-amb-un-domini-propi) below.

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

## SSL amb un domini propi

Warble-Self utilitza **Caddy** com a proxy invers. Caddy obté i renova certificats **Let's Encrypt automàticament** quan detecta un domini real.

### Opció A — DNS sense proxy de Cloudflare (recomanada)

Aquesta és l'opció més senzilla. Caddy gestiona el certificat SSL sense cap configuració addicional.

**1. A Cloudflare DNS**, crea un registre A apuntant al teu servidor amb el **proxy desactivat** (núvol gris — "DNS only"):

```
Tipus  Nom              Contingut       Proxy
A      warble.exemple.com  <IP_SERVIDOR>  DNS only (gris)
```

**2. Configura el `.env`:**

```env
DOMAIN=warble.exemple.com
BETTER_AUTH_URL=https://warble.exemple.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://warble.exemple.com
```

**3. Assegura't que els ports 80 i 443 estan oberts** al firewall del servidor.

**4. Arrenca:**

```bash
docker compose up --build -d
```

Caddy demanarà el certificat automàticament en el primer accés. En uns segons tindrà HTTPS funcionant.

---

### Opció B — Proxy de Cloudflare activat (núvol taronja)

Si vols mantenir el proxy de Cloudflare actiu (protecció DDoS, ocultació de la IP del servidor), cal ajustar la configuració perquè Cloudflare gestioni el SSL.

**1. A Cloudflare**, activa el proxy (núvol taronja) i configura el mode SSL:

- Ves a **SSL/TLS → Overview**
- Selecciona el mode **"Full"** (recomanat) o **"Flexible"**

> **Diferència:**
> - `Flexible`: Cloudflare ↔ navegador és HTTPS, Cloudflare ↔ servidor és HTTP. Més simple.
> - `Full`: Cloudflare ↔ navegador és HTTPS, Cloudflare ↔ servidor també és HTTPS (amb cert autosignat). Més segur.

**2. Modifica el `Caddyfile`** perquè Caddy no intenti obtenir un certificat Let's Encrypt (el proxy de Cloudflare bloqueja el challenge ACME):

Per al mode **Flexible** (Caddy serveix HTTP):

```
:{$PORT:80} {
    reverse_proxy frontend:80
}
```

I al `docker-compose.yml`, canvia el servei `caddy` per exposar només el port 80:

```yaml
caddy:
  ports:
    - "80:80"
```

**3. Configura el `.env`:**

```env
DOMAIN=warble.exemple.com
BETTER_AUTH_URL=https://warble.exemple.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://warble.exemple.com
```

> Els usuaris veuen HTTPS perquè Cloudflare el proporciona, tot i que internament el servidor usa HTTP.

**4. Arrenca:**

```bash
docker compose up --build -d
```

---

> **Resum ràpid:**
> | Escenari | Cloudflare Proxy | Caddyfile | SSL gestionat per |
> |---|---|---|---|
> | Opció A | Desactivat (gris) | Per defecte | Caddy + Let's Encrypt |
> | Opció B | Activat (taronja) | Cal modificar | Cloudflare |

---

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
