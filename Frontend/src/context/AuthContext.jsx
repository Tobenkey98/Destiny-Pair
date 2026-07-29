import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveTokens = useCallback((tokens, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('access_token', tokens.access);
    storage.setItem('refresh_token', tokens.refresh);
    if (rememberMe) {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }, []);

  const setAuth = useCallback((data, rememberMe) => {
    saveTokens(data.tokens, rememberMe);
    setUser(data.user);
    setLoading(false);
  }, [saveTokens]);

  const getToken = useCallback(() => {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || user) { setLoading(false); return; }
    api.getProfile()
      .then(data => setUser(data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, [clearTokens, getToken]);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const { remember_me, ...credentials } = payload;
    const data = await api.login(credentials);
    setAuth(data, remember_me);

    const pendingRaw = sessionStorage.getItem('pending_profile');
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        const profilePayload = {};

        if (pending.last_name) profilePayload.last_name = pending.last_name;
        if (pending.phone) profilePayload.phone = pending.phone;
        if (pending.gender) profilePayload.gender = pending.gender;
        if (pending.state_of_residence) profilePayload.state_of_residence = pending.state_of_residence;
        if (pending.state_of_origin) profilePayload.state_of_origin = pending.state_of_origin;
        if (pending.faith) profilePayload.faith = pending.faith;
        if (pending.denomination) profilePayload.denomination = parseInt(pending.denomination, 10);
        if (pending.custom_denomination) profilePayload.custom_denomination = pending.custom_denomination;
        if (pending.highest_qualification) profilePayload.highest_qualification = pending.highest_qualification;
        if (pending.institution) profilePayload.institution = pending.institution;
        if (pending.profession) profilePayload.profession = pending.profession;
        if (pending.ethnic_group) profilePayload.ethnic_group = pending.ethnic_group;
        if (pending.about_self) profilePayload.about_self = pending.about_self;
        if (pending.seeking_description) profilePayload.seeking_description = pending.seeking_description;

        if (pending.dob_day && pending.dob_month && pending.dob_year) {
          const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
          const monthIndex = months.indexOf(pending.dob_month) + 1;
          const mm = String(monthIndex).padStart(2, '0');
          const dd = String(parseInt(pending.dob_day)).padStart(2, '0');
          profilePayload.date_of_birth = `${pending.dob_year}-${mm}-${dd}`;
        }

        if (pending.lga_of_residence) {
          profilePayload.city_state = pending.lga_of_residence;
        }

        if (Object.keys(profilePayload).length > 0) {
          const updated = await api.updateProfile(profilePayload);
          setUser(updated);
        }

        sessionStorage.removeItem('pending_profile');
      } catch (e) {
        console.warn('Failed to save pending profile:', e);
      }
    }

    return data;
  }, [setAuth]);

  const socialAuth = useCallback(async (payload) => {
    const data = await api.socialAuth(payload);
    setAuth(data);
    return data;
  }, [setAuth]);

  const verifyEmail = useCallback(async (email, code) => {
    return await api.verifyEmail(email, code);
  }, []);

  const resendVerification = useCallback(async (email) => {
    return await api.resendVerification(email);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.updateProfile(payload);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
      await api.logout(refresh);
    } catch {}
    clearTokens();
    setUser(null);
  }, [clearTokens]);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, socialAuth, verifyEmail, resendVerification, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
