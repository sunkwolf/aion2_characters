// Application review component

import React, { useState, useEffect } from 'react';
import type { JoinApplication, MemberConfig } from '../../types/admin';
import {
  loadApplications,
  reviewApplication,
  deleteApplication,
  addMember,
  loadMembers,
} from '../../services/dataService';
import ConfirmDialog from '../ConfirmDialog';
import './ApplicationManager.css';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

// Message dialog state
interface MessageDialog {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error';
}

const ApplicationManager: React.FC = () => {
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [members, setMembers] = useState<MemberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [reviewingApp, setReviewingApp] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    applicationId: string;
    characterName: string;
  }>({
    visible: false,
    applicationId: '',
    characterName: '',
  });
  const [messageDialog, setMessageDialog] = useState<MessageDialog>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Load data
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
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Approve application
  const handleApprove = async (applicationId: string, createMember: boolean) => {
    const application = applications.find(a => a.id === applicationId);
    if (!application) return;

    try {
      // Update application status
      await reviewApplication(
        applicationId,
        'approved',
        reviewNote || undefined
      );

      // If choosing to create member
      if (createMember) {
        // Decode characterId, decode URL encoded characters (e.g., %3D -> =)
        const decodedCharacterId = decodeURIComponent(application.characterId);
        const memberId = decodedCharacterId;

        // Check if already exists
        if (members.some(m => m.id === memberId)) {
          setMessageDialog({
            visible: true,
            title: 'Member Already Exists',
            message: `This character already exists in the member list\nCharacter: ${application.characterName}\nID: ${memberId}`,
            type: 'warning'
          });
          loadData();
          return;
        }

        const fullMemberData: MemberConfig = {
          id: memberId,  // Use decoded characterId as ID
          name: application.characterName,
          role: 'member',
          serverId: application.serverId,
          characterId: decodedCharacterId,
        };

        try {
          await addMember(members, fullMemberData);

          // Background async sync character data, don't wait for result
          fetch('/api/sync/member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullMemberData)
          }).then(response => {
            if (response.ok) {
              console.log(`Member ${application.characterName} character data synced successfully`);
            } else {
              console.warn(`Member ${application.characterName} character data sync failed`);
            }
          }).catch(error => {
            console.error(`Member ${application.characterName} character data sync failed:`, error);
          });

          // Show success message immediately
          setMessageDialog({
            visible: true,
            title: 'Approved Successfully',
            message: `Application approved, member "${application.characterName}" created\nServer: ${application.serverName}\n\nCharacter data syncing in background...`,
            type: 'success'
          });
        } catch (error: any) {
          if (error.message.includes('already exists') || error.message.includes('已存在')) {
            setMessageDialog({
              visible: true,
              title: 'Member Already Exists',
              message: `Member already exists: ${memberId}`,
              type: 'warning'
            });
          } else {
            throw error;
          }
        }
      } else {
        setMessageDialog({
          visible: true,
          title: 'Approved Successfully',
          message: 'Application approved',
          type: 'success'
        });
      }

      setReviewingApp(null);
      setReviewNote('');

      // Reload data
      loadData();
    } catch (error: any) {
      setMessageDialog({
        visible: true,
        title: 'Operation Failed',
        message: error.message || 'Operation failed',
        type: 'error'
      });
    }
  };

  // Reject application
  const handleReject = async (applicationId: string) => {
    try {
      await reviewApplication(
        applicationId,
        'rejected',
        reviewNote || undefined
      );
      setMessageDialog({
        visible: true,
        title: 'Rejected',
        message: 'Application rejected',
        type: 'success'
      });
      setReviewingApp(null);
      setReviewNote('');

      // Reload data
      loadData();
    } catch (error: any) {
      setMessageDialog({
        visible: true,
        title: 'Operation Failed',
        message: error.message || 'Operation failed',
        type: 'error'
      });
    }
  };

  // Delete application
  const handleDelete = async (applicationId: string, characterName: string) => {
    setConfirmDialog({
      visible: true,
      applicationId: applicationId,
      characterName: characterName,
    });
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    const applicationId = confirmDialog.applicationId;

    // Close dialog
    setConfirmDialog({ visible: false, applicationId: '', characterName: '' });

    try {
      await deleteApplication(applicationId);
      // Reload data
      loadData();
    } catch (error: any) {
      alert(error.message || 'Delete failed');
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDialog({ visible: false, applicationId: '', characterName: '' });
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // Statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // Status display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div className="application-manager__loading">Loading...</div>;
  }

  return (
    <div className="application-manager">
      {/* Stats cards */}
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card__value">{stats.pending}</div>
          <div className="stats-card__label">Pending</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.approved}</div>
          <div className="stats-card__label">Approved</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.rejected}</div>
          <div className="stats-card__label">Rejected</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__value">{stats.total}</div>
          <div className="stats-card__label">Total</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="application-manager__toolbar">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'pending' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={`filter-btn ${filter === 'approved' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({stats.approved})
          </button>
          <button
            className={`filter-btn ${filter === 'rejected' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({stats.rejected})
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
        </div>
      </div>

      {/* Application list */}
      <div className="application-list">
        {filteredApplications.length === 0 ? (
          <div className="application-list__empty">
            {filter === 'pending' ? 'No pending applications' : 'No applications'}
          </div>
        ) : (
          filteredApplications.map((app) => (
            <div key={app.id} className={`application-card application-card--${app.status}`}>
              <div className="application-card__header">
                <div className="application-card__title">
                  <span className="application-card__name">
                    {app.characterName}
                  </span>
                  <span className={`status-tag status-tag--${app.status}`}>
                    {getStatusDisplay(app.status)}
                  </span>
                </div>
                <div className="application-card__meta">
                  Submitted on {new Date(app.submittedAt).toLocaleString('en-US')}
                </div>
              </div>

              <div className="application-card__body">
                <div className="application-card__info">
                  {/* Character info */}
                  <div className="info-item">
                    <span className="info-label">Character Name:</span>
                    <span className="info-value">{app.characterName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Server:</span>
                    <span className="info-value">
                      {app.serverName} (ID: {app.serverId})
                    </span>
                  </div>
                  {/* Character link */}
                  <div className="info-item">
                    <span className="info-label">Character Link:</span>
                    <a
                      href={app.characterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="info-value info-value--link"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        wordBreak: 'break-all'
                      }}
                    >
                      View Character Details
                      <svg
                        style={{ display: 'inline-block', width: '14px', height: '14px', marginLeft: '4px' }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>

                {app.status !== 'pending' && app.reviewedAt && (
                  <div className="application-card__review">
                    <div className="review-time">
                      Reviewed on {new Date(app.reviewedAt).toLocaleString('en-US')}
                    </div>
                    {app.reviewNote && (
                      <div className="review-note">
                        <span className="info-label">Note:</span> {app.reviewNote}
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
                          placeholder="Review note (optional)"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="review-note-input"
                        />
                        <div className="review-panel__buttons">
                          <button
                            onClick={() => handleApprove(app.id, true)}
                            className="btn btn--success"
                          >
                            Approve & Create Member
                          </button>
                          <button
                            onClick={() => handleApprove(app.id, false)}
                            className="btn btn--secondary"
                          >
                            Approve Only
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            className="btn btn--danger"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setReviewingApp(null);
                              setReviewNote('');
                            }}
                            className="btn btn--secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingApp(app.id)}
                        className="btn btn--primary"
                      >
                        Review
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDelete(app.id, app.characterName)}
                  className="btn btn--sm btn--danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Delete Application"
        message={`Are you sure you want to delete "${confirmDialog.characterName}"'s application?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        danger={true}
      />

      {/* Message dialog */}
      <ConfirmDialog
        visible={messageDialog.visible}
        title={messageDialog.title}
        message={messageDialog.message}
        confirmText="OK"
        onConfirm={() => setMessageDialog({ ...messageDialog, visible: false })}
        onCancel={() => setMessageDialog({ ...messageDialog, visible: false })}
        danger={messageDialog.type === 'error'}
      />
    </div>
  );
};

export default ApplicationManager;
