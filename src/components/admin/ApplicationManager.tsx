// 申请审批组件

import React, { useState, useEffect } from 'react';
import type { JoinApplication, MemberConfig } from '../../types/admin';
import {
  loadApplications,
  reviewApplication,
  deleteApplication,
  exportApplicationsToFile,
  importJsonFile,
  createMemberFromApplication,
  addMember,
  loadMembers,
} from '../../services/dataService';
import './ApplicationManager.css';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const ApplicationManager: React.FC = () => {
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [members, setMembers] = useState<MemberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [reviewingApp, setReviewingApp] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, membersData] = await Promise.all([
        loadApplications(),
        loadMembers(),
      ]);
      setApplications(appsData);
      setMembers(membersData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 通过申请
  const handleApprove = async (applicationId: string, createMember: boolean) => {
    const application = applications.find(a => a.id === applicationId);
    if (!application) return;

    try {
      // 更新申请状态
      const updatedApps = reviewApplication(
        applications,
        applicationId,
        'approved',
        reviewNote || undefined
      );
      setApplications(updatedApps);

      // 如果选择创建成员
      if (createMember) {
        const memberData = createMemberFromApplication(application);
        const fullMemberData: MemberConfig = {
          ...memberData,
          characterId: undefined,
          serverId: undefined,
        };
        const updatedMembers = addMember(members, fullMemberData);
        setMembers(updatedMembers);
        alert(`申请已通过,成员 "${application.characterName}" 已创建`);
      } else {
        alert('申请已通过');
      }

      setReviewingApp(null);
      setReviewNote('');
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  // 拒绝申请
  const handleReject = (applicationId: string) => {
    try {
      const updatedApps = reviewApplication(
        applications,
        applicationId,
        'rejected',
        reviewNote || undefined
      );
      setApplications(updatedApps);
      alert('申请已拒绝');
      setReviewingApp(null);
      setReviewNote('');
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  // 删除申请
  const handleDelete = (applicationId: string) => {
    const application = applications.find(a => a.id === applicationId);
    if (!confirm(`确定要删除 "${application?.characterName}" 的申请吗?`)) {
      return;
    }

    try {
      const updatedApps = deleteApplication(applications, applicationId);
      setApplications(updatedApps);
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  // 导出申请列表
  const handleExport = () => {
    exportApplicationsToFile(applications);
  };

  // 导入申请列表
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importJsonFile<JoinApplication[]>(file);
      setApplications(data);
      alert('导入成功');
    } catch (error: any) {
      alert(error.message || '导入失败');
    }

    event.target.value = '';
  };

  // 筛选申请
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // 统计数据
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // 状态显示
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div className="application-manager__loading">加载中...</div>;
  }

  return (
    <div className="application-manager">
      {/* 统计卡片 */}
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card__value">{stats.pending}</div>
          <div className="stats-card__label">待审批</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.approved}</div>
          <div className="stats-card__label">已通过</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.rejected}</div>
          <div className="stats-card__label">已拒绝</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.total}</div>
          <div className="stats-card__label">总计</div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="application-manager__toolbar">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'pending' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            待审批 ({stats.pending})
          </button>
          <button
            className={`filter-btn ${filter === 'approved' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            已通过 ({stats.approved})
          </button>
          <button
            className={`filter-btn ${filter === 'rejected' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            已拒绝 ({stats.rejected})
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 ({stats.total})
          </button>
        </div>

        <div className="application-manager__actions">
          <button onClick={handleExport} className="btn btn--secondary">
            导出 JSON
          </button>
          <label className="btn btn--secondary">
            导入 JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* 申请列表 */}
      <div className="application-list">
        {filteredApplications.length === 0 ? (
          <div className="application-list__empty">
            {filter === 'pending' ? '暂无待审批申请' : '暂无申请'}
          </div>
        ) : (
          filteredApplications.map((app) => (
            <div key={app.id} className={`application-card application-card--${app.status}`}>
              <div className="application-card__header">
                <div className="application-card__title">
                  <span className="application-card__name">{app.characterName}</span>
                  <span className={`status-tag status-tag--${app.status}`}>
                    {getStatusDisplay(app.status)}
                  </span>
                </div>
                <div className="application-card__meta">
                  提交于 {new Date(app.submittedAt).toLocaleString('zh-CN')}
                </div>
              </div>

              <div className="application-card__body">
                <div className="application-card__info">
                  <div className="info-item">
                    <span className="info-label">职业:</span>
                    <span className="info-value">{app.className}</span>
                  </div>
                  {app.level && (
                    <div className="info-item">
                      <span className="info-label">等级:</span>
                      <span className="info-value">{app.level}</span>
                    </div>
                  )}
                  {app.contact && (
                    <div className="info-item">
                      <span className="info-label">联系方式:</span>
                      <span className="info-value">{app.contact}</span>
                    </div>
                  )}
                </div>

                {app.message && (
                  <div className="application-card__message">
                    <div className="info-label">留言:</div>
                    <div className="message-content">{app.message}</div>
                  </div>
                )}

                {app.status !== 'pending' && app.reviewedAt && (
                  <div className="application-card__review">
                    <div className="review-time">
                      审批于 {new Date(app.reviewedAt).toLocaleString('zh-CN')}
                    </div>
                    {app.reviewNote && (
                      <div className="review-note">
                        <span className="info-label">备注:</span> {app.reviewNote}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="application-card__actions">
                {app.status === 'pending' && (
                  <>
                    {reviewingApp === app.id ? (
                      <div className="review-panel">
                        <input
                          type="text"
                          placeholder="审批备注 (可选)"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="review-note-input"
                        />
                        <div className="review-panel__buttons">
                          <button
                            onClick={() => handleApprove(app.id, true)}
                            className="btn btn--success"
                          >
                            通过并创建成员
                          </button>
                          <button
                            onClick={() => handleApprove(app.id, false)}
                            className="btn btn--secondary"
                          >
                            仅通过
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            className="btn btn--danger"
                          >
                            拒绝
                          </button>
                          <button
                            onClick={() => {
                              setReviewingApp(null);
                              setReviewNote('');
                            }}
                            className="btn btn--secondary"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingApp(app.id)}
                        className="btn btn--primary"
                      >
                        审批
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDelete(app.id)}
                  className="btn btn--sm btn--danger"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicationManager;
