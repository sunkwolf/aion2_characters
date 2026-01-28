// Admin panel main page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import MemberManager from '../components/admin/MemberManager';
import ApplicationManager from '../components/admin/ApplicationManager';
import GalleryManager from '../components/admin/GalleryManager';
import ConfigManager from '../components/admin/ConfigManager';
import ToolsManager from '../components/admin/ToolsManager';
import ItemsSyncManager from '../components/admin/ItemsSyncManager';
import './AdminPage.css';

type TabType = 'members' | 'applications' | 'gallery' | 'config' | 'tools' | 'items';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabType>('members');

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Don't show content if not logged in (will auto redirect)
  if (!isAdmin) {
    return null;
  }

  // Admin panel main interface
  return (
    <div className="admin-page">
      {/* Left sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h1 className="admin-sidebar__title">Admin Panel</h1>
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav__item ${activeTab === 'members' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'applications' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'gallery' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'config' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Config
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'tools' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'items' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Database
          </button>
        </nav>
        <div className="admin-sidebar__footer">
          <button onClick={handleLogout} className="admin-sidebar__logout">
            Logout
          </button>
        </div>
      </aside>

      {/* Right content area */}
      <main className="admin-main">
        {activeTab === 'members' && <MemberManager />}
        {activeTab === 'applications' && <ApplicationManager />}
        {activeTab === 'gallery' && <GalleryManager />}
        {activeTab === 'config' && <ConfigManager />}
        {activeTab === 'tools' && <ToolsManager />}
        {activeTab === 'items' && <ItemsSyncManager />}
      </main>
    </div>
  );
};

export default AdminPage;
