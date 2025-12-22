import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// 管理员密码（生产环境应使用更安全的方式）
const ADMIN_PASSWORD = 'chunxia2025';

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider = ({ children }: AdminProviderProps) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    const adminSession = localStorage.getItem('chunxia_admin');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem('chunxia_admin', 'true');
      setShowLoginModal(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem('chunxia_admin');
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, showLoginModal, setShowLoginModal }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
