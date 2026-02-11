import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextValue {
  isLoggedIn: boolean;
  userEmail: string | null;
  selectedStore: string | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  selectStore: (store: string) => Promise<void>;
  clearStore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      const store = await AsyncStorage.getItem('selected_store');
      if (email) {
        setIsLoggedIn(true);
        setUserEmail(email);
      }
      if (store) {
        setSelectedStore(store);
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string) => {
    await AsyncStorage.setItem('user_email', email);
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['user_email', 'selected_store']);
    setUserEmail(null);
    setSelectedStore(null);
    setIsLoggedIn(false);
  };

  const selectStore = async (store: string) => {
    await AsyncStorage.setItem('selected_store', store);
    setSelectedStore(store);
  };

  const clearStore = async () => {
    await AsyncStorage.removeItem('selected_store');
    setSelectedStore(null);
  };

  const value = useMemo(() => ({
    isLoggedIn,
    userEmail,
    selectedStore,
    isLoading,
    login,
    logout,
    selectStore,
    clearStore,
  }), [isLoggedIn, userEmail, selectedStore, isLoading]);

  return (
    <AuthContext.Provider value={value}>
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
