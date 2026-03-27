import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const initialState = {
  connected: false,
  activeEmergency: null,
  trafficUpdates: [],
  signalOverrides: [],
  error: "",
};

export function useEmergencyTrafficFeed(
  socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
) {
  const [state, setState] = useState(initialState);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      timeout: 5000,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setState((current) => ({
        ...current,
        connected: true,
        error: "",
      }));
    };

    const handleDisconnect = (reason) => {
      setState((current) => ({
        ...current,
        connected: false,
        error: reason ? `Disconnected: ${reason}` : current.error,
      }));
    };

    const handleConnectError = (error) => {
      setState((current) => ({
        ...current,
        connected: false,
        error: error.message || "Failed to connect to emergency feed.",
      }));
    };

    const handleEmergencyUpdate = (payload) => {
      setState((current) => ({
        ...current,
        activeEmergency: payload.status === "ACTIVE" ? payload : current.activeEmergency,
      }));
    };

    const handleTrafficUpdate = (payload) => {
      setState((current) => ({
        ...current,
        trafficUpdates: [payload, ...current.trafficUpdates].slice(0, 8),
      }));
    };

    const handleSignalOverride = (payload) => {
      setState((current) => ({
        ...current,
        signalOverrides: [payload, ...current.signalOverrides].slice(0, 8),
      }));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("emergency:update", handleEmergencyUpdate);
    socket.on("traffic:update", handleTrafficUpdate);
    socket.on("signal:override", handleSignalOverride);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("emergency:update", handleEmergencyUpdate);
      socket.off("traffic:update", handleTrafficUpdate);
      socket.off("signal:override", handleSignalOverride);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl]);

  return state;
}
