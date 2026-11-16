import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import useSefirahSocket from '../hooks/useSefirahSocket';
import toast from 'react-hot-toast';

const Ctx = createContext(null);

export const useApp = () => {
  const context = useContext(Ctx);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('tarot_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const socket = useSefirahSocket();

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      sessionStorage.setItem('tarot_user', JSON.stringify(me));
      return me;
    } catch (err) {
      setUser(null);
      sessionStorage.removeItem('tarot_user');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Listen to socket events for notifications and achievements
  useEffect(() => {
    const unsubAch = socket.on('ACHIEVEMENT_UNLOCKED', data => {
      toast(`✦ Achievement Unlocked: ${data.title}!`, {
        icon: '🏆',
        style: {
          background: '#1E1E2C',
          color: '#D4AF37',
          border: '1px solid #D4AF37',
          boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
        }
      });
      refreshMe();
    });

    const unsubNotif = socket.on('NOTIFICATION_RECEIVED', data => {
      toast(`${data.title}: ${data.text}`, {
        icon: '📜',
        style: {
          background: '#1E1E2C',
          color: '#EAE7DC',
          border: '1px solid #7B5A2B'
        }
      });
      refreshMe();
    });

    return () => {
      unsubAch();
      unsubNotif();
    };
  }, [socket, refreshMe]);

  const login = userData => {
    setUser(userData);
    sessionStorage.setItem('tarot_user', JSON.stringify(userData));
    refreshMe();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    sessionStorage.removeItem('tarot_user');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, socket, login, logout, refreshMe }}>
      {children}
    </Ctx.Provider>
  );
}
