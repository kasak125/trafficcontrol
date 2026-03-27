import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  EMERGENCY_UPDATE_EVENT,
  SIGNAL_OVERRIDE_EVENT,
  TRAFFIC_CONGESTION_EVENT,
  TRAFFIC_UPDATE_EVENT,
  TRAFFIC_WAIT_TIME_EVENT,
  trafficEventBus,
} from "../events/trafficEventBus.js";

export function registerTrafficSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [env.clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info("Socket client connected", { socketId: socket.id });

    socket.emit("system:connected", {
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
      supportedEvents: [
        TRAFFIC_UPDATE_EVENT,
        TRAFFIC_CONGESTION_EVENT,
        TRAFFIC_WAIT_TIME_EVENT,
        EMERGENCY_UPDATE_EVENT,
        SIGNAL_OVERRIDE_EVENT,
      ],
    });

    socket.on("disconnect", () => {
      logger.info("Socket client disconnected", { socketId: socket.id });
    });
  });

  const forwardUpdate = (payload) => io.emit(TRAFFIC_UPDATE_EVENT, payload);
  const forwardCongestion = (payload) => io.emit(TRAFFIC_CONGESTION_EVENT, payload);
  const forwardWaitTime = (payload) => io.emit(TRAFFIC_WAIT_TIME_EVENT, payload);
  const forwardEmergencyUpdate = (payload) => io.emit(EMERGENCY_UPDATE_EVENT, payload);
  const forwardSignalOverride = (payload) => io.emit(SIGNAL_OVERRIDE_EVENT, payload);

  trafficEventBus.on(TRAFFIC_UPDATE_EVENT, forwardUpdate);
  trafficEventBus.on(TRAFFIC_CONGESTION_EVENT, forwardCongestion);
  trafficEventBus.on(TRAFFIC_WAIT_TIME_EVENT, forwardWaitTime);
  trafficEventBus.on(EMERGENCY_UPDATE_EVENT, forwardEmergencyUpdate);
  trafficEventBus.on(SIGNAL_OVERRIDE_EVENT, forwardSignalOverride);

  return {
    io,
    dispose() {
      trafficEventBus.off(TRAFFIC_UPDATE_EVENT, forwardUpdate);
      trafficEventBus.off(TRAFFIC_CONGESTION_EVENT, forwardCongestion);
      trafficEventBus.off(TRAFFIC_WAIT_TIME_EVENT, forwardWaitTime);
      trafficEventBus.off(EMERGENCY_UPDATE_EVENT, forwardEmergencyUpdate);
      trafficEventBus.off(SIGNAL_OVERRIDE_EVENT, forwardSignalOverride);
    },
  };
}
