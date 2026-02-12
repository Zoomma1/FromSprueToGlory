# From Sprue to Glory ⚔️
⚠️ This app was AI generated using google antigravity, I did not write any of the code inside the  initial commit, I just provided the idea and tested a new tool. I will continue to build the app by my own and will use it for learning purposes, maybe one day I will release it as an open source project.

> *From sprue to glory* — Track your Warhammer Pile of Shame

A full-stack Angular + Node.js TypeScript mini-SaaS for tracking your Warhammer miniatures journey, from unboxed sprues to gloriously painted models.

## 🏗️ Architecture

```
from-sprue-to-glory/
├── client/          # Angular 19 + Material + PWA
├── server/          # Express + TypeScript + Prisma
├── docker-compose.yml
├── .env.example
└── README.md
```

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Angular 19, Material, CDK, PWA    |
| Backend   | Express, TypeScript, Zod          |
| ORM       | Prisma                            |
| Database  | PostgreSQL 16 (Docker)            |
| Auth      | JWT + Refresh Token Rotation      |
| Media     | S3 Pre-signed URLs                |
| Testing   | Vitest (server), Karma (client)   |

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.19
- Docker & Docker Compose
- npm

### 1. Clone & Install

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Start Database

```bash
# From project root
docker-compose up -d

# With MinIO (for local S3):
docker-compose --profile with-minio up -d
```

**Services:**
| Service  | URL                      | Credentials             |
|----------|--------------------------|-------------------------|
| Postgres | `localhost:5432`         | sprue / sprue_secret    |
| pgAdmin  | `http://localhost:5050`  | admin@sprue.dev / admin |
| MinIO    | `http://localhost:9001`  | minioadmin / minioadmin |

### 3. Setup Environment

```bash
# From project root
cp .env.example .env
# Edit .env with your values (JWT secrets, S3 keys later)
```

### 4. Run Migrations & Seed

```bash
cd server
npx prisma migrate dev
npm run seed
```

### 5. Start Development

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npx ng serve
```

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health

## 📡 API Endpoints

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | `/api/health`                   | Health check                 |
| POST   | `/api/auth/signup`              | Create account               |
| POST   | `/api/auth/login`               | Login                        |
| POST   | `/api/auth/refresh`             | Refresh JWT                  |
| POST   | `/api/auth/logout`              | Logout                       |
| GET    | `/api/items`                    | List items (filtered)        |
| POST   | `/api/items`                    | Create item                  |
| PUT    | `/api/items/:id`                | Update item                  |
| DELETE | `/api/items/:id`                | Delete item                  |
| PATCH  | `/api/items/:id/status`         | Change status + history      |
| GET    | `/api/items/:id/history`        | Status change history        |
| GET    | `/api/color-schemes`            | List color schemes           |
| POST   | `/api/color-schemes`            | Create scheme + steps        |
| PUT    | `/api/color-schemes/:id`        | Update scheme + steps        |
| DELETE | `/api/color-schemes/:id`        | Delete scheme                |
| GET    | `/api/reference/game-systems`   | Game systems                 |
| GET    | `/api/reference/factions`       | Factions (filterable)        |
| GET    | `/api/reference/models`         | Models (filterable)          |
| GET    | `/api/reference/paint-brands`   | Paint brands                 |
| GET    | `/api/reference/paints`         | Paints (filterable)          |
| GET    | `/api/reference/techniques`     | Painting techniques          |
| POST   | `/api/media/presign-upload`     | Get pre-signed upload URL    |
| GET    | `/api/media/presign-read/:key`  | Get pre-signed read URL      |
| GET    | `/api/export/items`             | Export items (JSON/CSV)      |
| DELETE | `/api/account`                  | Delete account + all data    |

## 📦 Import Format

### CSV (Factions example)
```csv
name,gameSystemSlug
Space Marines,40k
Orks,40k
Stormcast Eternals,aos
```

### JSON (Paints example)
```json
[
  { "name": "Abaddon Black", "code": null, "brandSlug": "citadel", "type": "BASE" },
  { "name": "Retributor Armour", "code": null, "brandSlug": "citadel", "type": "BASE" }
]
```

### Run import
```bash
cd server
npm run import -- --type factions --file data/factions.csv
npm run import -- --type paints --file data/paints.json
```

## 🗄️ Database Schema

See `server/prisma/schema.prisma` for the full schema.

## 📐 Milestones

- **M0** ✅ Setup repo + Angular Material + Docker Postgres + PWA
- **M1** ✅ Prisma schema + migration + seed MVP
- **M2** ✅ Import scripts (CSV/JSON)
- **M3** ✅ API reference endpoints
- **M4** ✅ API Items CRUD + tags + history
- **M5** ✅ API ColorSchemes + step builder backend
- **M6** ✅ Auth JWT + refresh + security
- **M7** ✅ S3 media (pre-signed upload/read)
- **M8** ✅ Angular Auth + routing + guards
- **M9** ✅ UI Items + dashboard + export
- **M10** ✅ UI Kanban + history tracking
- **M11** ✅ UI Color Schemes (step builder)
- **M12** ✅ Tests + lint + polish

## 📄 License

Private project — learning purposes.
