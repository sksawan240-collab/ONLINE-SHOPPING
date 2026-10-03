import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RegistrationData, User } from '../types';
import { api, setStoredTokens, clearStoredTokens } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSalesManager: boolean;
  isCustomer: boolean;
  hasPermission: (perm: string) => boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User }>;
  register: (data: RegistrationData) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch {
      setUser(null);
      clearStoredTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('luxe_access_token');
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    if (res.success && res.tokens) {
      setStoredTokens(res.tokens.accessToken, res.tokens.refreshToken);
      setUser(res.user);
      return { success: true, user: res.user };
    }
    return { success: false };
  };

  const register = async (data: RegistrationData) => {
    clearStoredTokens();
    setUser(null);
    const res = await api.auth.register(data);
    return { success: !!res.success };
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      clearStoredTokens();
    }
  };

  const logoutAll = async () => {
    try {
      await api.auth.logoutAll();
    } finally {
      setUser(null);
      clearStoredTokens();
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return !!(user.permissions && user.permissions.includes(permission));
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isSalesManager = user?.role === 'SALES_MANAGER' || isAdmin;
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isSalesManager,
        isCustomer,
        hasPermission,
        login,
        register,
        logout,
        logoutAll,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
