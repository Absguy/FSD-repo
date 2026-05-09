import React, { createContext, useState, useEffect } from 'react';
import { setSocketAuthToken } from '../socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const token = storedToken || null;
      setUser({ ...parsed, token });
      setSocketAuthToken(token);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    setUser({ ...userData, token: token || null });
    setSocketAuthToken(token);
  };

  const loginGuest = (name) => {
    const guestUser = { name: name?.trim() || "Guest", role: "guest", guest: true };
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.removeItem('token');
    setUser({ ...guestUser, token: null });
    setSocketAuthToken(null);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setSocketAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
