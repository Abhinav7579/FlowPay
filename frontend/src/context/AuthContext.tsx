import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types';
import apiClient from '../api/client';
import { useToast } from './ToastContext';

interface AuthContextProps {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role: UserRole }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('flowpay_token'));
  const [role, setRole] = useState<UserRole | null>(localStorage.getItem('flowpay_role') as UserRole | null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success, error } = useToast();

  // Decode JWT to extract email/details if needed (basic parse for display)
  const parseToken = (jwtToken: string): { userId: string; role: UserRole } | null => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse token', e);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('flowpay_token');
      const storedRole = localStorage.getItem('flowpay_role') as UserRole | null;

      if (storedToken && storedRole) {
        const decoded = parseToken(storedToken);
        if (decoded) {
          setUser({
            id: decoded.userId,
            name: decoded.role === 'ADMIN' ? 'Administrator' : decoded.role === 'VENDOR' ? 'Merchant Partner' : 'Customer',
            email: '', // Backend doesn't have a profile endpoint, but we can set placeholder
            role: storedRole,
            createdAt: new Date().toISOString(),
          });
          setToken(storedToken);
          setRole(storedRole);
        } else {
          // Token is corrupted/expired
          localStorage.removeItem('flowpay_token');
          localStorage.removeItem('flowpay_role');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/user/signin', { email, password });
      const { token: receivedToken, role: receivedRole, message } = response.data;

      localStorage.setItem('flowpay_token', receivedToken);
      localStorage.setItem('flowpay_role', receivedRole);

      setToken(receivedToken);
      setRole(receivedRole as UserRole);

      const decoded = parseToken(receivedToken);
      setUser({
        id: decoded?.userId || '',
        name: receivedRole === 'ADMIN' ? 'Administrator' : receivedRole === 'VENDOR' ? 'Merchant Partner' : 'Customer',
        email: email,
        role: receivedRole as UserRole,
        createdAt: new Date().toISOString(),
      });

      success(message || 'Login successful!');
      return { success: true, role: receivedRole as UserRole };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      error(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, roleSelected: UserRole) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/user/register', {
        name,
        email,
        password,
        role: roleSelected,
      });
      
      const { message } = response.data;
      success(message || 'Registration successful!');
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      error(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('flowpay_token');
    localStorage.removeItem('flowpay_role');
    setToken(null);
    setRole(null);
    setUser(null);
    success('Logged out successfully.');
  }, [success]);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
