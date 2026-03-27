# Smart Traffic Management

Production-oriented traffic management and emergency response platform with:

- React dashboard frontend
- Node.js + Express backend
- PostgreSQL + Prisma ORM
- Socket.io realtime updates
- TomTom traffic flow, incidents, and routing integration
- Simulation fallback when a live API key is unavailable

## Core Capabilities

- Live traffic monitoring via TomTom Traffic Flow API
- Incident ingestion via TomTom Traffic Incidents API
- Emergency vehicle dispatch and live route tracking
- Green corridor signal override logic
- Historical traffic analytics and wait-time reporting
- Realtime socket events for traffic, emergency movement, and signal actions

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
    services/
    App.jsx
    index.css
    main.jsx
  .env.example
  index.html
  package.json
```

## Backend Environment

Create `backend/.env` from `backend/.env.example`.

```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_traffic?schema=public
REDIS_URL=
LIVE_TRAFFIC_POLL_INTERVAL_MS=12000
EMERGENCY_UPDATE_INTERVAL_MS=3000
EMERGENCY_CONGESTION_THRESHOLD=70
TOMTOM_API_KEY=your_tomtom_key
TOMTOM_TRAFFIC_BASE_URL=https://api.tomtom.com
TOMTOM_ROUTING_BASE_URL=https://api.tomtom.com
```

## Frontend Environment

Create `.env` in the repo root if you want explicit URLs:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Setup

### 1. Install frontend dependencies

```powershell
cd C:\Users\Asus\OneDrive\Desktop\trafficmanag
npm.cmd install
```

### 2. Install backend dependencies

```powershell
cd C:\Users\Asus\OneDrive\Desktop\trafficmanag\backend
npm.cmd install
```

### 3. Prepare PostgreSQL

Update `backend/.env` with your database credentials, then run:

```powershell
cd C:\Users\Asus\OneDrive\Desktop\trafficmanag\backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

### 4. Start backend

```powershell
cd C:\Users\Asus\OneDrive\Desktop\trafficmanag\backend
npm.cmd run dev
```

### 5. Start frontend

```powershell
cd C:\Users\Asus\OneDrive\Desktop\trafficmanag
npm.cmd run dev
```

## Important Endpoints

### Traffic

- `GET /api/traffic/summary`
- `GET /api/traffic/trends`
- `GET /api/traffic/wait-times`
- `GET /api/traffic/live`
- `GET /api/traffic/incidents`

### Emergency

- `POST /api/emergency/start`
- `GET /api/emergency/active`
- `GET /api/emergency/history`

## Example Emergency Request

```json
POST /api/emergency/start
{
  "type": "AMBULANCE",
  "currentLocation": {
    "lat": 28.6139,
    "lng": 77.209,
    "label": "Delhi Gate"
  },
  "destination": {
    "lat": 28.5672,
    "lng": 77.2100,
    "label": "AIIMS Trauma Center"
  },
  "speed": 18
}
```

## Realtime Events

- `traffic:update`
- `traffic:congestion`
- `traffic:waitTime`
- `emergency:update`
- `signal:override`

## Frontend Example

Use [useEmergencyTrafficFeed.js](C:/Users/Asus/OneDrive/Desktop/trafficmanag/src/hooks/useEmergencyTrafficFeed.js) for a React-side live feed example, and [EmergencyRealtimePanel.jsx](C:/Users/Asus/OneDrive/Desktop/trafficmanag/src/components/EmergencyRealtimePanel.jsx) as a simple dashboard panel example.

## Notes

- If `TOMTOM_API_KEY` is configured, the backend uses live TomTom traffic flow, incidents, and routing.
- If no TomTom key is configured, the system falls back to realistic simulation for traffic and emergency movement.
- Redis is optional. If `REDIS_URL` is blank, the backend runs without cache.
