import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (has token)
    const token = localStorage.getItem('token');
    if (token) {
      // You could verify the token here if needed
      // For now, we'll assume if token exists, user is logged in
      // We need to get the username from localStorage as well
      const username = localStorage.getItem('username');
      setUser({ username, token });
    }
    setLoading(false);
  }, []);

  const login = (username, token) => {
    setUser({ username, token });
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  };

  const register = (username, token) => {
    setUser({ username, token });
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px'
        }}>
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
} 