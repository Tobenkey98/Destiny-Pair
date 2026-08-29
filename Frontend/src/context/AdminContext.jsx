import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getAdminAccessToken, getAdminRefreshToken } from '../lib/api';

const AdminContext = createContext(null);

const ROLE_HIERARCHY = {
  super_admin: 4,
  operations_admin: 3,
  moderator: 2,
  counsellor: 1,
};

const ROLE_DISPLAY = {
  super_admin: 'Super Admin',
  operations_admin: 'Operations Admin',
  moderator: 'Moderator',
  counsellor: 'Counsellor',
};

const MODULE_ACCESS = {
  super_admin: [
    'dashboard', 'users', 'subscriptions', 'payments', 'moderation',
    'reports', 'counselling', 'settings', 'audit', 'roles',
    'notifications', 'messages', 'analytics', 'content', 'admins',
  ],
  operations_admin: [
    'dashboard', 'users', 'subscriptions', 'payments',
    'matches', 'notifications', 'support',
  ],
  moderator: [
    'dashboard', 'moderation', 'reports', 'users',
  ],
  counsellor: [
    'dashboard', 'counselling',
  ],
};

const ROUTE_ROLE_MAP = {
  '/admin': '*',
  '/admin/users': ['super_admin', 'operations_admin', 'moderator'],
  '/admin/matches': ['super_admin', 'operations_admin'],
  '/admin/messages': ['super_admin', 'operations_admin', 'moderator'],
  '/admin/counselling': ['super_admin', 'counsellor'],
  '/admin/subscriptions': ['super_admin', 'operations_admin'],
  '/admin/payments': ['super_admin', 'operations_admin'],
  '/admin/reports': ['super_admin', 'moderator', 'operations_admin'],
  '/admin/moderation': ['super_admin', 'moderator'],
  '/admin/notifications': ['super_admin', 'operations_admin'],
  '/admin/content': ['super_admin'],
  '/admin/support': ['super_admin', 'operations_admin'],
  '/admin/audit': ['super_admin'],
  '/admin/roles': ['super_admin'],
  '/admin/settings': ['super_admin'],
  '/admin/admins': ['super_admin'],
  '/admin/analytics': ['super_admin'],
  '/admin/emails': ['super_admin'],
  '/admin/logs': ['super_admin'],
  '/admin/integrations': ['super_admin'],
  '/admin/seo': ['super_admin'],
  '/admin/payments': ['super_admin', 'operations_admin'],
};

function getToken() {
  const token = getAdminAccessToken();
  if (token && !sessionStorage.getItem('admin_access_token')) {
    sessionStorage.setItem('admin_source', 'local');
  }
  return token;
}

function saveTokens(tokens, rememberMe) {
  sessionStorage.setItem('admin_access_token', tokens.access);
  sessionStorage.setItem('admin_refresh_token', tokens.refresh);
  sessionStorage.setItem('admin_source', rememberMe ? 'both' : 'session');
  if (rememberMe) {
    localStorage.setItem('admin_access_token', tokens.access);
    localStorage.setItem('admin_refresh_token', tokens.refresh);
  }
}

function clearTokens() {
  const source = sessionStorage.getItem('admin_source');
  sessionStorage.removeItem('admin_access_token');
  sessionStorage.removeItem('admin_refresh_token');
  sessionStorage.removeItem('admin_source');
  if (source === 'local' || source === 'both') {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
  }
}

export function AdminProvider({ children }) {
  const [adminProfile, setAdminProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminDashboard();
      setDashboard(data);
      setAdminProfile({
        role: data.role,
        role_display: ROLE_DISPLAY[data.role] || data.role,
        modules: data.modules || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
      setAdminProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchAdminData();
    } else {
      setAdminProfile(null);
      setDashboard(null);
      setLoading(false);
    }
  }, [fetchAdminData]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const interval = setInterval(() => {
      api.adminHeartbeat().catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const adminLogin = useCallback(async (email, password, rememberMe) => {
    const data = await api.adminLogin({ email, password });
    saveTokens(data.tokens, rememberMe);
    setAdminProfile({
      role: data.user.role,
      role_display: ROLE_DISPLAY[data.user.role] || data.user.role,
      modules: MODULE_ACCESS[data.user.role] || [],
    });
    return data;
  }, []);

  const adminLogout = useCallback(() => {
    clearTokens();
    setAdminProfile(null);
    setDashboard(null);
    setError(null);
  }, []);

  const refreshDashboard = useCallback(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const canAccess = useCallback((route) => {
    const allowed = ROUTE_ROLE_MAP[route];
    if (!allowed) return true;
    if (allowed === '*') return true;
    if (!adminProfile) return false;
    return allowed.includes(adminProfile.role);
  }, [adminProfile]);

  const hasModule = useCallback((module) => {
    if (!adminProfile) return false;
    const allowed = MODULE_ACCESS[adminProfile.role];
    return allowed && allowed.includes(module);
  }, [adminProfile]);

  const isAdmin = useCallback(() => {
    return !!adminProfile;
  }, [adminProfile]);

  const hasRole = useCallback((...roles) => {
    if (!adminProfile) return false;
    return roles.includes(adminProfile.role);
  }, [adminProfile]);

  const roleLevel = adminProfile ? (ROLE_HIERARCHY[adminProfile.role] || 0) : 0;

  const counts = dashboard?.counts || {};

  return (
    <AdminContext.Provider value={{
      adminProfile,
      dashboard,
      counts,
      loading,
      error,
      adminLogin,
      adminLogout,
      refreshDashboard,
      canAccess,
      hasModule,
      isAdmin,
      hasRole,
      roleLevel,
      roleDisplay: adminProfile?.role_display || '',
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
}

export { MODULE_ACCESS, ROLE_DISPLAY, ROLE_HIERARCHY };
