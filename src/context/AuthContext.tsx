import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  loginOperator,
  registerOperator,
  logoutOperator,
  getCurrentOperator,
  updateOperatorProfile,
  UpdateProfilePayload,
  RegisterPayload,
  getAuthToken,
  setAuthToken,
} from '../services/api';

export type PortalMode = 'landing' | 'auth' | 'app';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentPortal: PortalMode;
  setPortal: (portal: PortalMode) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  enterDemoMode: (role?: string) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Quick 1-click evaluation accounts
export const DEMO_OPERATOR_PRESETS = [
  {
    username: 'admin',
    password: 'Admin@123',
    name: 'Major Vikram Sen',
    role: 'Commander',
    code: 'LVL-4 COMMAND',
    sector: 'All Border Sectors (HQ)',
    color: '#ec4899',
    tag: 'COMMAND',
  },
  {
    username: 'operator',
    password: 'Operator@123',
    name: 'Officer Rajesh Kumar',
    role: 'Surveillance Operator',
    code: 'LVL-3 OPERATOR',
    sector: 'Gate Alpha & Checkpoint 1',
    color: '#00f0ff',
    tag: 'SURVEILLANCE',
  },
  {
    username: 'patrol',
    password: 'Patrol@123',
    name: 'Havaldar Amit Patel',
    role: 'Patrol Officer',
    code: 'LVL-2 PATROL',
    sector: 'East Perimeter Border Fence',
    color: '#10b981',
    tag: 'PATROL',
  },
  {
    username: 'analyst',
    password: 'Analyst@123',
    name: 'Dr. Ananya Sharma',
    role: 'AI Analyst',
    code: 'LVL-3 ANALYST',
    sector: 'Neural Net Model Training',
    color: '#a855f7',
    tag: 'AI ANALYST',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPortal, setCurrentPortal] = useState<PortalMode>('landing');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Verify stored session on boot
  useEffect(() => {
    const checkActiveSession = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await getCurrentOperator();
        if (res.success && res.user) {
          setUser(res.user);
          setToken(storedToken);
          // If already logged in, navigate straight to dashboard
          setCurrentPortal('app');
        } else {
          setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // Fallback: If backend is offline, preserve local fallback session if token exists
        console.warn('[AUTH] Offline or token validation warning:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await loginOperator(username, password);
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        setCurrentPortal('app');
        return res.user;
      }
      throw new Error(res.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await registerOperator(payload);
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        setCurrentPortal('app');
        return res.user;
      }
      throw new Error(res.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await updateOperatorProfile(payload);
      if (res.success && res.user) {
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutOperator();
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      setCurrentPortal('landing');
      setIsLoading(false);
    }
  }, []);

  // Quick 1-click evaluation preset handler
  const enterDemoMode = useCallback(async (role: string = 'Commander'): Promise<UserProfile> => {
    const preset = DEMO_OPERATOR_PRESETS.find((p) => p.role.toLowerCase() === role.toLowerCase()) || DEMO_OPERATOR_PRESETS[0];
    return login(preset.username, preset.password);
  }, [login]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    currentPortal,
    setPortal: setCurrentPortal,
    isProfileModalOpen,
    setIsProfileModalOpen,
    login,
    register,
    updateProfile,
    logout,
    enterDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
