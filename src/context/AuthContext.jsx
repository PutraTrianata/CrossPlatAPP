import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Helper untuk get storage (localStorage with fallback ke memory)
const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('_test_', 'ok');
      window.localStorage.removeItem('_test_');
      return window.localStorage;
    } catch (e) {
      console.warn('[AUTH] localStorage not available, using memory fallback');
    }
  }
  // Fallback: in-memory storage (akan hilang saat refresh, tapi minimal tidak error)
  return {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; }
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore user dari localStorage saat app mount
  useEffect(() => {
    const initAuth = () => {
      try {
        console.log('[AUTH] Initializing authentication...');
        const storage = getStorage();
        const storedUser = storage.getItem('authUser');
        
        console.log('[AUTH] Stored user found:', !!storedUser);
        console.log('[AUTH] Storage type:', typeof storage === 'object' ? (storage.data ? 'memory' : 'localStorage') : 'unknown');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('[AUTH] Restoring user:', userData.email);
          setUser(userData);
        }
      } catch (error) {
        console.error('[AUTH] Error restoring user:', error);
        // Clear corrupted data
        try {
          const storage = getStorage();
          storage.removeItem('authUser');
        } catch (e) {}
      } finally {
        console.log('[AUTH] Initialization complete');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Save user ke storage setiap kali berubah (hanya setelah initialized)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      const storage = getStorage();
      if (user) {
        console.log('[AUTH] Saving user:', user.email);
        storage.setItem('authUser', JSON.stringify(user));
      } else {
        console.log('[AUTH] Clearing stored user');
        storage.removeItem('authUser');
      }
    } catch (error) {
      console.error('[AUTH] Error saving user:', error);
    }
  }, [user, isInitialized]);

  const login = (userData) => {
    console.log('[AUTH] Login:', userData.email);
    setUser(userData);
  };

  const updateUser = (updatedData) => {
    console.log('[AUTH] Update user');
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const logout = () => {
    console.log('[AUTH] Logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, loading, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
