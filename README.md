# Smart Contract Negotiator

Collaborative, AI‑assisted contract drafting and negotiation platform with real‑time editing, version history, role‑based sharing, and export tools.

## Overview

This monorepo contains a React + Redux client and a Node.js + Express + Socket.IO server backed by MongoDB. Users can register/login, create and share contracts with roles (owner/editor/viewer), collaborate in real time, view version history, and use optional AI helpers for clause suggestions, analysis, chat, and smart templates.

Key highlights:

- Realtime collaboration with presence, cursors, and typing indicators (Socket.IO)
- Role‑based access (owner/editor/viewer) and secure JWT auth
- Modern dashboard and editor UI, responsive and keyboard‑friendly
- Version history and manual/auto versioning
- Export contracts as PDF or TXT
- Optional AI features (OpenAI) with mock fallbacks when not configured

For deeper AI details, see `AI_INTEGRATION_README.md`.

## Tech Stack

- Frontend: React 18, Redux Toolkit, React Router, React‑Quill, Socket.IO Client, CSS Modules
- Backend: Node.js, Express 5, Socket.IO, Mongoose/MongoDB, JWT (jsonwebtoken), bcryptjs
- Dev tooling: Create React App, nodemon

## Repository Structure

```text
client/                 # React app (CRA + Redux Toolkit)
server/                 # Express API + Socket.IO + Mongoose models
docker-compose.yml      # Convenience services (Mongo; server stub)
AI_INTEGRATION_README.md# AI features and endpoints
README.md               # This file
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB 6+ (local install) or Docker Desktop (to run Mongo in a container)

## Quick Start

### Step 1. Configure environment (server)

Create `server/.env` with values appropriate for your environment:

```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production
# If you run a local Mongo instance, the app defaults to mongodb://localhost:27017/contractdb
# You can set your own URI and update server config accordingly
MONGO_URI=mongodb://localhost:27017/contractdb

# Optional: enable AI features
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 2. Install dependencies

```bash
# At repo root (install shared root deps if any)
npm install

# Server
cd server
npm install

# Client (in a separate terminal)
cd client
npm install
```

### Step 3. Start MongoDB

- Local install: ensure `mongod` is running on `mongodb://localhost:27017`
- Or with Docker (Mongo only):

```bash
docker compose up -d mongo
```

### Step 4. Run the apps (development)

```bash
# Terminal 1: API server (http://localhost:5000)
cd server
npm run dev

# Terminal 2: Web client (http://localhost:3000)
cd client
npm start
```

Open the app at <http://localhost:3000>. Log in or register, then create a contract and start editing.

Notes:

- The client calls the API at `http://localhost:5000` and connects Socket.IO to the same URL (see `client/src/socket.js`).
- CORS is enabled for <http://localhost:3000> and <http://localhost:3001> by default.

## Features

- Authentication: Register/Login with JWT; session stored in localStorage
- Dashboard: stats, search/filter, bulk select, export, quick actions
- Editor: rich text editing, real‑time collaboration, presence & typing indicators, save status
- Sharing: add participants with roles (owner/editor/viewer)
- Version History: manual snapshotting and periodic auto‑versioning
- Export: PDF and TXT exports
- AI (optional): clause suggestions, contract analysis, chatbot, smart templates

See `AI_INTEGRATION_README.md` for AI usage details, endpoints, and fallback behavior.

## Environment Configuration (Server)

Environment variables are loaded from `server/.env`:

- PORT: API/Socket server port (default: 5000)
- JWT_SECRET: Secret for signing/verifying JWTs (required; keep consistent across the server)
- MONGO_URI: MongoDB connection string (default code currently connects to `mongodb://localhost:27017/contractdb`)
- OPENAI_API_KEY: OpenAI key for AI features (optional; if missing, mock responses are used)

Important:

- Ensure JWT_SECRET is set and stable. If tokens break with “Invalid token”, verify all API calls include the header and the server uses a single secret (see `server/config/jwt.js`).
- By default, `server/index.js` connects to `mongodb://localhost:27017/contractdb`. If you use a different `MONGO_URI`, update the connection string in `server/index.js` or align your local Mongo accordingly.

## Running with Docker

The provided `docker-compose.yml` defines:

- mongo: MongoDB exposed on 27017
- server: a build target for the API (requires a `server/Dockerfile` you can add)

Common workflows:

- Start MongoDB only:

```bash
docker compose up -d mongo
```

- If you add `server/Dockerfile`, you can run the server via Compose as well:

```bash
docker compose up --build server
```

Until a Dockerfile is added, run the server with `npm run dev` as shown in Quick Start.

## API Overview

Auth:

- POST `/api/register` → { username, token }
- POST `/api/login` → { username, token }

Contracts (Authorization: `Bearer <token>`):

- GET `/api/contracts` → Array of contracts for the user
- POST `/api/contracts` → Create a contract { title, content? }
- GET `/api/contracts/:id` → Contract details (must be a participant)
- PUT `/api/contracts/:id` → Update title/content (owner/editor)
- DELETE `/api/contracts/:id` → Delete (owner only)
- POST `/api/contracts/:id/share` → { username, role } add/update participant

Versions:

- GET `/api/contracts/:id/versions` → List versions (participants)
- POST `/api/contracts/:id/versions` → Create new version (owner/editor)
- GET `/api/contracts/:id/versions/:versionId` → Fetch specific version

AI (optional; requires auth): see `AI_INTEGRATION_README.md`

- POST `/api/ai/suggestions`
- POST `/api/ai/analyze`
- POST `/api/ai/chat`
- POST `/api/ai/template`
- GET `/api/ai/status`

Auth header example:

```http
Authorization: Bearer <your_jwt_token>
```

## Socket.IO Events

Client → Server:

- `join-room` { roomId, username, userId? }
- `send-changes` { roomId, delta }
- `cursor-move` { roomId, position, username }
- `typing-start` { roomId, username }
- `typing-stop` { roomId, username }

Server → Clients:

- `user-joined` { username, socketId }
- `receive-changes` delta
- `cursor-update` { socketId, position, username }
- `user-typing` { socketId, username, isTyping }
- `user-left` { username, socketId }

## Scripts

Server (`server/package.json`):

- `npm run dev` → Start with nodemon
- `npm start` → Start once

Client (`client/package.json`):

- `npm start` → Run CRA dev server on 3000
- `npm run build` → Production build
- `npm test` → CRA test runner

## Testing

- Client: `cd client && npm test` (includes CRA scaffolding and a Redux counter spec)
- Server: no tests yet

## Troubleshooting

- Invalid token / session expired
	- Ensure the `Authorization: Bearer <token>` header is set on API calls
	- Verify server `JWT_SECRET` is set and unchanged; see `server/config/jwt.js`
	- Log out and log back in to refresh the token

- API unreachable / network error
	- Check that `server` is running on port 5000
	- Ensure MongoDB is up (local or `docker compose up -d mongo`)
	- Confirm CORS origins include your client origin (3000/3001)

- Port already in use
	- Change the port or stop the other process

- AI returns mock responses
	- Add `OPENAI_API_KEY` to `server/.env` and restart the server

## Security Notes

- Never commit real API keys or secrets
- Keep JWT secrets private and rotate when needed
- AI features only send contract content when explicitly invoked
