import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import i18n from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('examflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('examflow_token') || null);
  const [loading, setLoading] = useState(true);

  // Check token and refresh profile on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('examflow_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.user) {
          const verifiedUser = res.data.user;
          setUser(verifiedUser);
          localStorage.setItem('examflow_user', JSON.stringify(verifiedUser));

          // Restore verified user's language preference if saved, or default to Arabic
          const userId = verifiedUser._id || verifiedUser.id;
          const userPref = localStorage.getItem(`examflow_lang_${userId}`);
          if (userPref && userPref !== i18n.language) {
            i18n.changeLanguage(userPref);
          }
        }
      } catch (err) {
        console.warn('Session verification failed:', err.response?.data?.message || err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, user: loggedInUser } = res.data;
        localStorage.setItem('examflow_token', token);
        localStorage.setItem('examflow_user', JSON.stringify(loggedInUser));
        setToken(token);
        setUser(loggedInUser);

        // Load specific user's preference or default to Arabic for new users
        const userId = loggedInUser._id || loggedInUser.id;
        const userPref = localStorage.getItem(`examflow_lang_${userId}`) || 'ar';
        i18n.changeLanguage(userPref);

        return { success: true, user: loggedInUser };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('examflow_token');
    localStorage.removeItem('examflow_user');
    setToken(null);
    setUser(null);

    // Reset language to default Arabic upon logout so subsequent users do not inherit previous user's language
    i18n.changeLanguage('ar');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
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
