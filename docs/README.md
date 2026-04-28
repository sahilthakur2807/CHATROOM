# Setup Guide

Use this guide to set up the project features that are currently implemented in the repo.

## What Is Included Right Now

- Backend server with Express and Socket.IO
- PostgreSQL schema for users, posts, and messages
- Database initialization script
- Authentication routes for signup, login, and current user lookup
- Frontend Vite + React starter app

## Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL running locally or remotely

## 1. Create the Database

Create a PostgreSQL database for the app if you have not already done so.

Example:

```bash
createdb blogdb
```

If you are using a hosted database, copy its connection string instead.

## 2. Configure Backend Environment Variables

From the project root, copy the backend env example into place:

```bash
cd backend
cp .env.example .env
```

Update the values in `backend/.env`:

- `PORT`: backend port, default `4000`
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: a long random secret for authentication tokens

## 3. Install Backend Dependencies

```bash
cd backend
npm install
```

This installs Express, PostgreSQL, Socket.IO, bcryptjs, and jsonwebtoken.

## 4. Initialize the Database Schema

The backend can initialize the schema automatically at startup, but you can also run it manually:

```bash
cd backend
npm run db:init
```

This creates the following tables:

- `users`
- `posts`
- `messages`

## 5. Start the Backend Server

```bash
cd backend
npm run dev
```

Expected default URL:

- `http://localhost:4000`

Quick check:

```bash
curl http://localhost:4000/api/ping
```

## 6. Configure Frontend Environment Variables

From the project root, copy the frontend env example:

```bash
cd frontend
cp .env.example .env
```

Update `frontend/.env` if your backend is not running on `http://localhost:4000`.

## 7. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## 8. Start the Frontend App

```bash
cd frontend
npm run dev
```

Expected default URL:

- `http://localhost:5173`

## 9. Verify Authentication Endpoints

You can test the auth routes with a tool like curl or Postman.

Signup example:

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

Login example:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
```

Use the returned token for protected requests:

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 10. Suggested Development Order

Follow the modules in order:

1. Project initialization
2. Database design and setup
3. Authentication system
4. Blog post CRUD
5. Post viewing and listing UI
6. Global chat system
7. Post-specific chat rooms
8. Comments system
9. API integration and protected routes
10. UI and UX improvements
11. Testing and debugging
12. Final integration and cleanup

## Notes

- Keep `backend/.env` and `frontend/.env` out of version control.
- Do not reuse weak secrets for `JWT_SECRET`.
- If the backend cannot connect to PostgreSQL, verify `DATABASE_URL` and that the database server is running.
