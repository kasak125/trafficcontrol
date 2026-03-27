# Smart Traffic Management

A production-oriented traffic analytics system with a React dashboard on the frontend and a modular Node.js backend that provides PostgreSQL-backed APIs, a simulation engine, Socket.io realtime events, Redis-ready caching, and Prisma ORM.

## Stack

- Frontend: React + Vite + Tailwind CSS + Recharts + Framer Motion
- Backend: Node.js + Express + Socket.io
- Database: PostgreSQL + Prisma ORM
- Cache: Redis with graceful fallback
- Architecture: MVC + service layer + event bus

## Project Structure

```text
trafficmanag/
  backend/
    prisma/
      schema.prisma
      seed.js
    src/
      config/
      controllers/
      events/
      middlewares/
      routes/
      services/
      simulator/
      sockets/
      utils/
      validators/
      app.js
      server.js
    .env.example
    package.json
  src/
    components/
    data/
    hooks/
    App.jsx
    index.css
    main.jsx
  index.html
  package.json
```

## What The Backend Provides

- `GET /api/traffic/summary`
- `GET /api/traffic/trends`
- `GET /api/traffic/wait-times`
- Realtime Socket.io events:
  - `traffic:update`
  - `traffic:congestion`
  - `traffic:waitTime`
- Traffic simulation every few seconds with peak-hour behavior
- AI-style optimization rule that reduces wait time when congestion exceeds `70%`
- Optimization logs persisted to PostgreSQL
- Redis summary caching with safe fallback when Redis is unavailable
- Rate limiting, validation middleware, centralized error handling, and graceful shutdown

## Step-By-Step Setup

### 1. Frontend setup

PowerShell on your machine blocks `npm`, so use `npm.cmd`.

```powershell
npm.cmd install
```

Start the frontend:

```powershell
npm.cmd run dev
```

The dashboard usually runs on `http://localhost:5173`.

### 2. Backend setup

Move into the backend folder and install server dependencies:

```powershell
cd backend
npm.cmd install
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

### 3. Configure PostgreSQL

Create a PostgreSQL database, then update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_traffic?schema=public
```

### 4. Optional Redis

If Redis is available locally, keep `REDIS_URL` set. If not, leave it blank and the backend will still run without cache.

```env
REDIS_URL=redis://localhost:6379
```

### 5. Generate Prisma client and migrate

```powershell
cd backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

### 6. Start the backend

```powershell
cd backend
npm.cmd run dev
```

The API and Socket.io server run on `http://localhost:4000` by default.

### 7. Connect frontend to backend

The frontend socket hook already defaults to `http://localhost:4000`. If you want to override it, create a frontend `.env` file:

```env
VITE_SOCKET_URL=http://localhost:4000
```

## Prisma Data Model

The Prisma schema is defined in [backend/prisma/schema.prisma](/workspace/backend/prisma/schema.prisma) and includes:

- `Intersection`
  - `id`
  - `name`
  - `location`
  - `status`
- `TrafficLog`
  - `id`
  - `intersectionId`
  - `vehicleCount`
  - `congestionLevel`
  - `avgWaitTime`
  - `timestamp`
- `OptimizationLog`
  - stores AI-style optimization actions for congested intersections

Indexes are included for:

- `Intersection.status`
- `TrafficLog.intersectionId + timestamp`
- `TrafficLog.timestamp`
- `TrafficLog.congestionLevel + timestamp`
- `OptimizationLog.intersectionId + timestamp`

## API Endpoints

### `GET /api/traffic/summary`

Optional query params:

- `from`
- `to`

Example response:

```json
{
  "success": true,
  "data": {
    "range": {
      "from": "2026-03-26T00:00:00.000Z",
      "to": "2026-03-26T12:30:00.000Z"
    },
    "totals": {
      "vehicles": 38150,
      "avgWaitTime": 58.14,
      "avgCongestionLevel": 46.72,
      "activeIntersections": 42,
      "optimizationCount": 19
    },
    "latestSnapshot": {
      "intersectionId": 2,
      "intersectionName": "Airport Link / Terminal Road",
      "vehicleCount": 941,
      "congestionLevel": 77.4,
      "avgWaitTime": 53,
      "timestamp": "2026-03-26T12:29:56.000Z"
    }
  }
}
```

### `GET /api/traffic/trends`

Optional query params:

- `from`
- `to`
- `intersectionId`
- `interval=hour|day`

Example response:

```json
{
  "success": true,
  "data": {
    "interval": "hour",
    "series": [
      {
        "timestamp": "2026-03-26T08:00:00.000Z",
        "vehicleCount": 5120,
        "congestionLevel": 63.4
      }
    ]
  }
}
```

### `GET /api/traffic/wait-times`

Optional query params:

- `from`
- `to`
- `intersectionId`
- `limit`

Example response:

```json
{
  "success": true,
  "data": {
    "series": [
      {
        "timestamp": "2026-03-26T08:00:00.000Z",
        "avgWaitTime": 61.3
      }
    ],
    "latestByIntersection": [
      {
        "intersectionId": 2,
        "name": "Airport Link / Terminal Road",
        "avgWaitTime": 53,
        "congestionLevel": 77.4,
        "timestamp": "2026-03-26T12:29:56.000Z"
      }
    ]
  }
}
```

## Realtime Events

The Socket.io server emits every simulation cycle:

- `traffic:update`
  - full intersection snapshot
- `traffic:congestion`
  - emitted when congestion exceeds `70%`
- `traffic:waitTime`
  - wait-time specific payload for dashboard widgets

The backend uses an internal event bus in `backend/src/events/trafficEventBus.js`, so the simulator does not emit directly to sockets.

## Frontend Realtime Hook

The sample client hook is in [src/hooks/useTrafficSocket.js](/workspace/src/hooks/useTrafficSocket.js). It:

- connects to the Socket.io backend
- tracks connection state
- stores the latest traffic snapshot
- keeps recent congestion alerts
- keeps recent wait-time updates by intersection

## Backend Notes

- The simulator writes traffic logs every `SIMULATION_INTERVAL_MS`
- Peak traffic is emphasized around `8-10 AM` and `6-9 PM`
- Night traffic is reduced automatically
- When congestion is above `70%`, wait time is reduced and an optimization log is stored
- Redis caching is applied to summary responses to reduce repeated aggregate queries

## Useful Commands

Frontend:

```powershell
npm.cmd run dev
npm.cmd run build
```

Backend:

```powershell
cd backend
npm.cmd run dev
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```
