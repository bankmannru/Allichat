import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface User {
  displayName: string;
  role: string;
  isOnline: boolean;
  allowedNames: string[];
}

interface AuthContextType {
  currentUser: User | null;
  login: (name: string, secretCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
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
        displayName: userData.displayName,
        role: userData.role,
        isOnline: true,
        allowedNames: userData.allowedNames
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 