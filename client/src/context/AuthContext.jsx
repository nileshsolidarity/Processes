import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [branch, setBranch] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedBranch = localStorage.getItem('branch');
    if (savedToken && savedBranch) {
      setToken(savedToken);
      setBranch(JSON.parse(savedBranch));
    }
    setLoading(false);
  }, []);

  const login = (tokenValue, branchData) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('branch', JSON.stringify(branchData));
    setToken(tokenValue);
    setBranch(branchData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('branch');
    setToken(null);
    setBranch(null);
  };

  return (
    <AuthContext.Provider value={{ branch, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
