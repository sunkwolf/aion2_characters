// 管理后台主页面

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import MemberManager from '../components/admin/MemberManager';
import ApplicationManager from '../components/admin/ApplicationManager';
import DataSyncPanel from '../components/admin/DataSyncPanel';
import './AdminPage.css';

type TabType = 'members' | 'applications' | 'sync';

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
      <div className="admin-header">
        <h1 className="admin-header__title">管理后台</h1>
        <button onClick={handleLogout} className="admin-header__logout">
          退出登录
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tabs__tab ${activeTab === 'members' ? 'admin-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          成员管理
        </button>
        <button
          className={`admin-tabs__tab ${activeTab === 'applications' ? 'admin-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          申请审批
        </button>
        <button
          className={`admin-tabs__tab ${activeTab === 'sync' ? 'admin-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          数据同步
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'members' && <MemberManager />}
        {activeTab === 'applications' && <ApplicationManager />}
        {activeTab === 'sync' && <DataSyncPanel />}
      </div>
    </div>
  );
};

export default AdminPage;
