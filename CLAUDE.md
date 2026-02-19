# Content Creator Studio — CLAUDE.md

## Project Overview

A multi-user, role-based web application for SEO content creation workflow management. It replaces an existing Google Sheets + n8n automation pipeline with a proper full-stack web app.

**5-Step Workflow Pipeline:**
1. **Topic Creator** — Manage top-level topics, keywords, and AI-generated content ideas
2. **Persona Creator** — Define target audience personas per keyword
3. **Structure Creator** — Build article outlines and section structure
4. **Blog Creator** — Write and manage full blog content
5. **Image Creator** — Generate/manage images based on blog content

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken + bcrypt) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Search | ValueSERP API (keyword research data) |
| HTTP Client | Axios |

---

## Project Structure

```
/
├── frontend/                    # React Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Titlebar, Statusbar, Tabs
│   │   │   ├── topic/           # TopicTree, KeywordCard, ResultsTable
│   │   │   ├── auth/            # LoginScreen
│   │   │   └── user/            # UserModal, UserTable
│   │   ├── pages/
│   │   │   ├── TopicCreator.tsx
│   │   │   ├── PersonaCreator.tsx
│   │   │   └── StructureCreator.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useTopics.ts
│   │   ├── api/                 # Axios API client functions
│   │   │   ├── client.ts        # Base axios instance with JWT header
│   │   │   ├── auth.ts
│   │   │   ├── topics.ts
│   │   │   ├── keywords.ts
│   │   │   ├── results.ts
│   │   │   └── generate.ts
│   │   ├── types/
│   │   │   └── index.ts         # Shared TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                     # Express API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts         # Admin only
│   │   │   ├── topLevels.ts
│   │   │   ├── keywords.ts
│   │   │   ├── results.ts
│   │   │   └── generate.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── topLevelController.ts
│   │   │   ├── keywordController.ts
│   │   │   ├── resultController.ts
│   │   │   └── generateController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verify → req.user
│   │   │   └── requireAdmin.ts  # Role check ADMIN only
│   │   ├── services/
│   │   │   ├── claudeService.ts # Anthropic API calls
│   │   │   └── serpService.ts   # ValueSERP API calls
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── seed.ts              # Initial admin user + sample data
│   │   └── server.ts            # Express app entry point
│   └── package.json
│
├── CLAUDE.md
├── .env.example
└── .gitignore
```

---

## Database Schema (Prisma)

File: `backend/src/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String     @id @default(cuid())
  name         String
  email        String     @unique
  passwordHash String
  role         Role       @default(EDITOR)
  active       Boolean    @default(true)
  lastLogin    DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  topLevels    TopLevel[]
}

model TopLevel {
  id        String    @id @default(cuid())
  name      String
  order     Int       @default(0)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  keywords  Keyword[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Keyword {
  id         String            @id @default(cuid())
  keyword    String
  goal       String            @default("")
  audience   String            @default("")
  topLevelId String
  topLevel   TopLevel          @relation(fields: [topLevelId], references: [id], onDelete: Cascade)
  results    GeneratedResult[]
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
}

model GeneratedResult {
  id          String   @id @default(cuid())
  keywordText String
  title       String
  status      Status   @default(DRAFT)
  keywordId   String
  keyword     Keyword  @relation(fields: [keywordId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum Status {
  DRAFT
  READY
  PROGRESS
  DONE
  PUBLISHED
}
```

---

## API Endpoints

**Base URL**: `http://localhost:3001/api`

All routes except `/api/auth/*` require `Authorization: Bearer <token>` header.

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | `{ email, password }` | Returns JWT token + user |
| GET | `/auth/me` | — | Returns current user from token |

### Users (Admin only)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/users` | — | List all users |
| POST | `/users` | `{ name, email, password, role }` | Create user |
| PATCH | `/users/:id` | `{ role?, active? }` | Update user |
| DELETE | `/users/:id` | — | Delete user (cannot delete self) |

### Top Levels
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/top-levels` | — | Get all with keywords + results |
| POST | `/top-levels` | `{ name }` | Create |
| PATCH | `/top-levels/:id` | `{ name }` | Rename |
| DELETE | `/top-levels/:id` | — | Delete (cascades) |

### Keywords
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/keywords` | `{ topLevelId, keyword, goal?, audience? }` | Create |
| PATCH | `/keywords/:id` | `{ keyword?, goal?, audience? }` | Update |
| DELETE | `/keywords/:id` | — | Delete (cascades) |

### Results
| Method | Path | Body | Description |
|--------|------|------|-------------|
| PATCH | `/results/:id` | `{ title?, status? }` | Update title or cycle status |
| DELETE | `/results/:id` | — | Delete |

### AI Generation
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/generate` | `{ keywordId }` | Run ValueSERP search → Claude API → save 3 results |

---

## AI Generation Logic

**File**: `backend/src/services/claudeService.ts`

**Flow:**
1. Fetch keyword record with `goal` and `audience`
2. Call ValueSERP API with `keyword` to get search result titles/snippets
3. Send to Claude API with this prompt structure:

```
You are an SEO and content marketing expert.

Generate 3 unique keyword + title pairs for a blog.

Search keyword: {keyword}
Content goal: {goal}
Target audience: {audience}
Search context (top results): {serpData}

Steps:
1. Extract unspoken pain points from search data
2. Select unique keywords aligned with the blog's identity
3. Create compelling titles that drive clicks

Output ONLY valid JSON array:
[
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." },
  { "keyword": "...", "title": "..." }
]
```

4. Parse JSON response → save as `GeneratedResult` records with status `DRAFT`

---

## UI Design System

**Reference**: `content-creator-studio.html` in project root

### Color Palette (CSS Variables)
```css
--bg0: #0d1117   /* primary background */
--bg1: #161b22   /* secondary background */
--bg2: #21262d   /* tertiary background */
--bd:  #30363d   /* border */
--aB:  #58a6ff   /* blue accent */
--aG:  #3fb950   /* green accent */
--aO:  #d29922   /* orange accent */
--aR:  #f85149   /* red accent */
--aP:  #bc8cff   /* purple accent */
--aC:  #39d2c0   /* cyan accent */
--t1:  #e6edf3   /* primary text */
--t2:  #8b949e   /* secondary text */
--tM:  #484f58   /* muted text */
```

### Fonts
- **UI text**: `Noto Sans JP` (Japanese support)
- **Monospace / code**: `JetBrains Mono`

### Layout (5 panels)
1. **Titlebar** (38px top) — app name + user avatar/menu
2. **Activity Bar** (56px left) — Topic / Persona / Structure icons
3. **Sidebar** (320px) — tree structure with inline editing
4. **Main Editor** — tabs + breadcrumb + content area
5. **Status Bar** (28px bottom, blue background) — git branch, status info

### Status Badge Colors
- `draft` → grey
- `ready` → blue
- `progress` → orange
- `done` → green
- `published` → purple

---

## Environment Variables

### `.env.example`
```
# Backend
DATABASE_URL="postgresql://user:password@localhost:5432/content_studio"
JWT_SECRET="change-this-to-random-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
ANTHROPIC_API_KEY="sk-ant-..."
VALUESERP_API_KEY="your-valueserp-key"

# Frontend (Vite prefix required)
VITE_API_URL="http://localhost:3001/api"
```

---

## Dev Commands

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push          # Apply schema to DB
npm run seed                 # Create admin user + sample data
npm run dev                  # Start server on :3001

# Frontend
cd frontend
npm install
npm run dev                  # Start Vite on :5173

# Database GUI
cd backend && npx prisma studio
```

---

## Security Rules

- Passwords: bcrypt with 10 salt rounds — never store plaintext
- JWT: `expiresIn: '7d'` — store in `localStorage` on client
- All API routes: validate `req.user` from JWT middleware
- Admin routes: check `req.user.role === 'ADMIN'`
- CORS: backend only allows `FRONTEND_URL` origin
- Users cannot delete or deactivate their own account

---

## Seed Data

**File**: `backend/src/seed.ts`

Creates:
- Admin user: `admin@example.com` / `admin123` (role: ADMIN)
- 2 sample top-levels with keywords and generated results
- Mirrors the sample data from the HTML prototype

---

## User Roles

| Role | Permissions |
|------|------------|
| ADMIN | All actions + user management |
| EDITOR | Create/edit/delete topics, keywords, results; trigger AI generation |
| VIEWER | Read-only access to all content |

---

## Deployment (Digital Ocean App Platform)

**Backend**:
- Build: `npx prisma generate && npx prisma db push && npm run build`
- Run: `npm start`
- Add Managed PostgreSQL database

**Frontend**:
- Build: `npm run build`
- Output: `dist/`
- Static site deployment or serve from backend

---

## Key Patterns

- **API client** (`frontend/src/api/client.ts`): Single axios instance, reads token from `localStorage`, sets `Authorization` header on every request
- **Auth context**: React context storing `user` + `token`, wraps entire app
- **Tree state**: Frontend manages collapsed/expanded state locally; server is source of truth for data
- **Optimistic updates**: Update UI immediately, rollback on API error
- **Toast notifications**: Global toast system for success/error feedback
