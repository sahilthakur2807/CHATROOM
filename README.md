# Blog + Chat Fullstack

Monorepo with `backend` (Express + Socket.IO) and `frontend` (Vite + React).

Getting started (development):

1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env as needed
npm run dev
```

2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Module 2 and 3 are now in place in the backend:

- PostgreSQL schema for users, posts, and messages lives in `backend/sql/schema.sql`.
- Database initialization runs from `backend/database/initDatabase.js`.
- Auth endpoints are available under `/api/auth/signup`, `/api/auth/login`, and `/api/auth/me`.

This repo is organized to implement features module-by-module. Work proceeds only after review of each module.
