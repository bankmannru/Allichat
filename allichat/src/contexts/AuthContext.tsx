import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  displayName: string;
  role: string;
  isOnline: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  allowedNames: string[];
  lastSeen?: any;
  isTyping?: { [roomId: string]: boolean };
}

interface AuthContextType {
  currentUser: User | null;
  login: (name: string, secretCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (name: string, secretCode: string) => {
    try {
      const userRef = doc(db, 'users', name);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      if (userData.secretCode !== secretCode) {
        return false;
      }

      await updateDoc(userRef, {
        isOnline: true,
        lastLogin: new Date().toISOString()
      });

      setCurrentUser({
        id: name,
        displayName: userData.displayName,
        role: userData.role,
        isOnline: true,
        isMuted: userData.isMuted || false,
        isBanned: userData.isBanned || false,
        allowedNames: userData.allowedNames,
        lastSeen: userData.lastSeen,
        isTyping: userData.isTyping || {}
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.displayName);
        await updateDoc(userRef, {
          isOnline: false
        });
        setCurrentUser(null);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (currentUser) {
        logout();
      }
    };
  }, []);

  const value = {
    currentUser,
    login,
    logout,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 