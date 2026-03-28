import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const userIdRef = useRef(null);
  // connected is exposed so dashboards can add it as a useEffect dependency.
  // This is the key to reliable handler registration: dashboard effects re-run
  // when connected flips true, ensuring handlers are always on the live socket.
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userId = user?._id;
    const userRole = user?.role;

    if (!userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        userIdRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Same user already has a live socket - do nothing.
    // This guard prevents React 18 StrictMode double-invocation from creating two sockets.
    if (socketRef.current && userIdRef.current === userId) return;

    // Different user — tear down the old socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    userIdRef.current = userId;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      auth: { userId, role: userRole },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      // Re-join rooms on every (re)connect so the server always knows who this socket is
      socket.emit("join", userId);
      socket.emit("joinRole", userRole);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Global toast notifications — attached once, persist across reconnects
    socket.on("orderPlaced", (d) =>
      toast("🍽️ " + (d.message || "New order!"), { icon: "" }),
    );
    socket.on("orderAssigned", (d) =>
      toast.success(d.message || "Rider assigned!"),
    );
    socket.on("orderAccepted", (d) =>
      toast.success(d.message || "Order accepted!"),
    );
    socket.on("orderPickedUp", (d) =>
      toast.success(d.message || "Order picked up!"),
    );
    socket.on("orderDelivered", (d) =>
      toast.success(d.message || "Order delivered!"),
    );
    socket.on("orderCancelled", (d) =>
      toast.error(d.message || "Order cancelled"),
    );

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
      socketRef.current = null;
      userIdRef.current = null;
      setConnected(false);
    };
  }, [user?._id]); // only re-run when the actual user identity changes

  // Stable on/off helpers.
  // Because socketRef is a ref (not state), its .current always points to the
  // current socket object — no stale closure issues.
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};
