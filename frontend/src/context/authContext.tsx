'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  _id?: string;
  username: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const savedToken = localStorage.getItem('asm_jwt_token');
    const savedUser = localStorage.getItem('asm_user_info');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('asm_jwt_token');
        localStorage.removeItem('asm_user_info');
      }
    }
    setIsLoading(false);

    // Global fetch interceptor to attach Authorization header automatically
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const currentToken = localStorage.getItem('asm_jwt_token');
      const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const isApiCall = urlString.includes('/api/') || urlString.startsWith('/api');

      if (isApiCall && currentToken) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${currentToken}`);
        }
        init.headers = headers;
      }

      const response = await originalFetch(input, init);

      if (isApiCall && (response.status === 401 || response.status === 403)) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          localStorage.removeItem('asm_jwt_token');
          localStorage.removeItem('asm_user_info');
          window.location.href = '/login';
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Auth Guard Effect
  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = pathname === '/login';
      const hasValidSession = Boolean(token && user);

      if (!hasValidSession && !isPublicPath) {
        router.replace('/login');
      } else if (hasValidSession && isPublicPath) {
        router.replace('/dashboard');
      }
    }
  }, [token, user, isLoading, pathname, router]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.' };
      }

      setToken(data.token);
      setUser(data.user);

      localStorage.setItem('asm_jwt_token', data.token);
      localStorage.setItem('asm_user_info', JSON.stringify(data.user));

      router.push('/dashboard');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Không thể kết nối đến máy chủ API backend.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('asm_jwt_token');
    localStorage.removeItem('asm_user_info');
    router.push('/login');
  };

  const authFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const currentToken = token || localStorage.getItem('asm_jwt_token');
    const headers = new Headers(init.headers || {});

    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) {
      if (API_BASE.endsWith('/api') && cleanUrl.startsWith('/api')) {
        cleanUrl = cleanUrl.substring(4);
      }
      if (!cleanUrl.startsWith('/')) {
        cleanUrl = '/' + cleanUrl;
      }
    }

    const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `${API_BASE}${cleanUrl}`;
    const response = await fetch(fullUrl, { ...init, headers });

    if (response.status === 401 || response.status === 403) {
      logout();
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
