import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const defaultState = {
  connected: false,
  error: "",
  latestUpdate: null,
  congestionAlerts: [],
  waitTimes: [],
};

export function useTrafficSocket(
  socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
) {
  const [state, setState] = useState(defaultState);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      timeout: 5000,
      withCredentials: true,
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
        error: error.message || "Socket connection failed.",
      }));
    };

    const handleUpdate = (payload) => {
      setState((current) => ({
        ...current,
        latestUpdate: payload,
      }));
    };

    const handleCongestion = (payload) => {
      setState((current) => ({
        ...current,
        congestionAlerts: [payload, ...current.congestionAlerts].slice(0, 5),
      }));
    };

    const handleWaitTime = (payload) => {
      setState((current) => ({
        ...current,
        waitTimes: [
          payload,
          ...current.waitTimes.filter((item) => item.intersectionId !== payload.intersectionId),
        ].slice(0, 8),
      }));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("traffic:update", handleUpdate);
    socket.on("traffic:congestion", handleCongestion);
    socket.on("traffic:waitTime", handleWaitTime);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("traffic:update", handleUpdate);
      socket.off("traffic:congestion", handleCongestion);
      socket.off("traffic:waitTime", handleWaitTime);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl]);

  return state;
}
