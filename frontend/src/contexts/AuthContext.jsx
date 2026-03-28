import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("shc_token");
    const storedUser = localStorage.getItem("shc_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("shc_token", authToken);
    localStorage.setItem("shc_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("shc_token");
    localStorage.removeItem("shc_user");
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("shc_user", JSON.stringify(updatedUser));
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, updateUser, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
};
