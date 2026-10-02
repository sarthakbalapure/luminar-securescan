import { createContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../api/client.js";

export const AuthContext = createContext(null);

const STORAGE_KEY = "securelite_auth";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEY);

    if (!savedAuth) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(savedAuth);
    setToken(parsed.token);
    setUser(parsed.user);
    setAuthToken(parsed.token);
    setLoading(false);
  }, []);

  const persistAuth = (authData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    setToken(authData.token);
    setUser(authData.user);
    setAuthToken(authData.token);
  };

  const login = async (formData) => {
    const response = await api.post("/auth/login", formData);
    persistAuth(response.data.data);
    return response.data.data;
  };

  const signup = async (formData) => {
    const response = await api.post("/auth/signup", formData);
    persistAuth(response.data.data);
    return response.data.data;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setUser(null);
    setAuthToken("");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
