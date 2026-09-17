import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('unfv_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password) => {
    const data = await api.login(username, password);
    setCurrentUser(data);
    localStorage.setItem('unfv_user', JSON.stringify(data));
    return data;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('unfv_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
