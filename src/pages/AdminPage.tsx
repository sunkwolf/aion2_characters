// 管理后台主页面

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

  // 未登录时重定向到首页
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 未登录不显示任何内容(会自动重定向)
  if (!isAdmin) {
    return null;
  }

  // 管理后台主界面
  return (
    <div className="admin-page">
      {/* 左侧导航 */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h1 className="admin-sidebar__title">管理后台</h1>
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav__item ${activeTab === 'members' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            成员管理
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'applications' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            申请审批
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'gallery' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            相册管理
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'config' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            全局配置
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'tools' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            工具管理
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'items' ? 'admin-nav__item--active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            数据库
          </button>
        </nav>
        <div className="admin-sidebar__footer">
          <button onClick={handleLogout} className="admin-sidebar__logout">
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
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
