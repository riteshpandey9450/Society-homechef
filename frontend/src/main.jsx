import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { CartProvider } from "./contexts/CartContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: "#1a1a2e",
                  color: "#f0ece4",
                  border: "1px solid rgba(255,125,15,0.3)",
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: "12px",
                },
                success: {
                  iconTheme: { primary: "#22c55e", secondary: "#0f0f1a" },
                },
                error: {
                  iconTheme: { primary: "#ff7d0f", secondary: "#0f0f1a" },
                },
              }}
            />
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
