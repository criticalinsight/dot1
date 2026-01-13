# Deployment Guide

## Current Deployment

| Service | URL |
|---------|-----|
| Frontend | https://e7c5d55d.velocity-frontend.pages.dev |
| Backend | https://velocity-backend.iamkingori.workers.dev |

- Node.js 20+
- Cloudflare account with Workers paid plan (for Durable Objects)
- Wrangler CLI: `npm install -g wrangler`

## Backend Deployment

### 1. Configure wrangler.toml

```toml
name = "velocity-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "PROJECT_BRAIN"
class_name = "ProjectBrain"

[[migrations]]
tag = "v1"
new_classes = ["ProjectBrain"]
```

### 2. Deploy

```bash
cd backend
wrangler login
wrangler deploy
```

### 3. Verify

```bash
curl https://velocity-backend.<your-subdomain>.workers.dev/sync
```

---

## Frontend Deployment

### Option A: Cloudflare Pages

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=velocity-frontend
```

### Option B: Vercel

```bash
cd frontend
npm run build
npx vercel --prod
```

### Option C: Static Hosting

```bash
cd frontend
npm run build
# Upload contents of dist/ to any static host
```

---

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `BACKEND_URL` | frontend/src/db/client.ts | Backend worker URL |

Update `BACKEND_URL` in `client.ts` after deploying backend:

```typescript
const BACKEND_URL = 'https://velocity-backend.<subdomain>.workers.dev';
```

---

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Backend
```bash
cd backend
npm install
npx wrangler dev  # http://localhost:8787
```

Update frontend `BACKEND_URL` to `http://localhost:8787` for local testing.
