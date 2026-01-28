// Global Config Manager component

import React, { useState, useEffect } from 'react';
import type { ClassBoardConfig, ClassBoardMapping } from '../../utils/daevanion';
import './ConfigManager.css';

interface GlobalConfig {
  voiceChannelUrl: string;
  voiceChannelName: string;
  voiceChannelDescription: string;
  redeemCode: string;
  redeemCodeExpiry: string; // ISO format date
}

interface SyncStatus {
  isRunning: boolean;
  isSyncing: boolean;
  intervalHours: number;
  lastSyncTime: string | null;
  nextSyncTime: string | null;
}

interface SyncLog {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

type SubTabType = 'timing' | 'voice' | 'redeem' | 'daevanion';

const ConfigManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('timing');

  const [config, setConfig] = useState<GlobalConfig>({
    voiceChannelUrl: '',
    voiceChannelName: 'Legion Voice',
    voiceChannelDescription: 'Click to join our voice channel',
    redeemCode: '',
    redeemCodeExpiry: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync logs
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Scheduled task status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    isSyncing: false,
    intervalHours: 4,
    lastSyncTime: null,
    nextSyncTime: null
  });
  const [syncIntervalInput, setSyncIntervalInput] = useState(4);

  // Daevanion class config state
  const [daevanionConfig, setDaevanionConfig] = useState<ClassBoardConfig | null>(null);
  const [daevanionLoading, setDaevanionLoading] = useState(false);
  const [daevanionSaving, setDaevanionSaving] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassBoardMapping | null>(null);
  const [isAddingClass, setIsAddingClass] = useState(false);

  // Load config
  useEffect(() => {
    loadConfig();
    loadSyncStatus();

    // Refresh sync status every 5 seconds
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      showMessage('error', 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Config saved successfully!');
      } else {
        showMessage('error', data.error || 'Save failed');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showMessage('error', 'Save failed, please try again');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleChange = (field: keyof GlobalConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Add log
  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const newLog: SyncLog = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setSyncLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100
  };

  // ========== Scheduled Task Management ==========

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const data = await response.json();
      if (data.success) {
        setSyncStatus(data.data);
        setSyncIntervalInput(data.data.intervalHours);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleStartSync = async () => {
    try {
      addLog('info', `Starting scheduled task, interval: ${syncIntervalInput} hours`);
      const response = await fetch('/api/sync/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalHours: syncIntervalInput })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', `${data.message}\nFirst sync started in background`);
        addLog('success', 'Scheduled task started');
        addLog('info', 'First sync running in background, you can continue browsing');

        // Refresh status
        setTimeout(() => {
          loadSyncStatus();
        }, 1000);
      } else {
        showMessage('error', data.error || 'Start failed');
        addLog('error', `Start failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to start sync:', error);
      showMessage('error', 'Start failed');
      addLog('error', 'Start failed, network error');
    }
  };

  const handleStopSync = async () => {
    try {
      addLog('info', 'Stopping scheduled task...');
      const response = await fetch('/api/sync/stop', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        addLog('success', 'Scheduled task stopped');
        loadSyncStatus();
      } else {
        showMessage('error', data.message || 'Stop failed');
        addLog('error', `Stop failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to stop sync:', error);
      showMessage('error', 'Stop failed');
      addLog('error', 'Stop failed, network error');
    }
  };

  const handleSyncNow = async () => {
    try {
      addLog('info', 'Starting background sync...');

      const response = await fetch('/api/sync/now', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Data sync started in background, please check sync status later');
        addLog('success', 'Background sync started, you can continue browsing');
        addLog('info', 'Tip: Sync will run on server in background, please wait');

        // Refresh status display
        setTimeout(() => {
          loadSyncStatus();
        }, 1000);
      } else {
        showMessage('error', data.message || 'Sync failed');
        addLog('error', `Sync failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to start sync:', error);
      showMessage('error', 'Failed to start sync');
      addLog('error', 'Failed to start sync, network error');
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never synced';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // ========== Daevanion Class Config Management ==========

  const loadDaevanionConfig = async () => {
    setDaevanionLoading(true);
    try {
      const response = await fetch('/data/class_board_mapping.json');
      if (response.ok) {
        const data: ClassBoardConfig = await response.json();
        setDaevanionConfig(data);
      }
    } catch (error) {
      console.error('Failed to load Daevanion config:', error);
      showMessage('error', 'Failed to load Daevanion config');
    } finally {
      setDaevanionLoading(false);
    }
  };

  const saveDaevanionConfig = async () => {
    if (!daevanionConfig) return;

    setDaevanionSaving(true);
    try {
      const response = await fetch('/api/daevanion/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(daevanionConfig)
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Daevanion config saved successfully!');
        // Reload config
        await loadDaevanionConfig();
      } else {
        showMessage('error', data.error || 'Save failed');
      }
    } catch (error) {
      console.error('Failed to save Daevanion config:', error);
      showMessage('error', 'Save failed, please try again');
    } finally {
      setDaevanionSaving(false);
    }
  };

  const handleAddClass = () => {
    setEditingClass({
      classId: 0,
      className: '',
      classNameSimplified: '',
      classNameEn: '',
      boardIds: [0, 0, 0, 0, 0, 0]
    });
    setIsAddingClass(true);
  };

  const handleEditClass = (classMapping: ClassBoardMapping) => {
    setEditingClass({ ...classMapping });
    setIsAddingClass(false);
  };

  const handleDeleteClass = (classId: number) => {
    if (!daevanionConfig) return;

    if (confirm(`Are you sure you want to delete class ID ${classId} config?`)) {
      setDaevanionConfig({
        ...daevanionConfig,
        classes: daevanionConfig.classes.filter(c => c.classId !== classId),
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const handleSaveClass = () => {
    if (!editingClass || !daevanionConfig) return;

    // Validation
    if (!editingClass.className || !editingClass.classNameEn) {
      showMessage('error', 'Please enter class name');
      return;
    }

    if (editingClass.boardIds.some(id => id <= 0)) {
      showMessage('error', 'Board ID must be greater than 0');
      return;
    }

    if (isAddingClass) {
      // Check if ID already exists
      if (daevanionConfig.classes.some(c => c.classId === editingClass.classId)) {
        showMessage('error', 'This class ID already exists');
        return;
      }

      setDaevanionConfig({
        ...daevanionConfig,
        classes: [...daevanionConfig.classes, editingClass].sort((a, b) => a.classId - b.classId),
        lastUpdated: new Date().toISOString()
      });
    } else {
      setDaevanionConfig({
        ...daevanionConfig,
        classes: daevanionConfig.classes.map(c =>
          c.classId === editingClass.classId ? editingClass : c
        ),
        lastUpdated: new Date().toISOString()
      });
    }

    setEditingClass(null);
    setIsAddingClass(false);
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
    setIsAddingClass(false);
  };

  // Load Daevanion config when switching to that tab
  useEffect(() => {
    if (activeSubTab === 'daevanion' && !daevanionConfig) {
      loadDaevanionConfig();
    }
  }, [activeSubTab]);

  if (loading) {
    return <div className="config-manager__loading">Loading...</div>;
  }

  return (
    <div className="config-manager">
      <div className="config-manager__header">
        <h2>Global Config</h2>
        <p>Manage legion website global settings</p>
      </div>

      {/* Subtab navigation */}
      <div className="config-subtabs">
        <button
          className={`config-subtabs__tab ${activeSubTab === 'timing' ? 'config-subtabs__tab--active' : ''}`}
          onClick={() => setActiveSubTab('timing')}
        >
          Scheduled Tasks
        </button>
        <button
          className={`config-subtabs__tab ${activeSubTab === 'voice' ? 'config-subtabs__tab--active' : ''}`}
          onClick={() => setActiveSubTab('voice')}
        >
          Voice Config
        </button>
        <button
          className={`config-subtabs__tab ${activeSubTab === 'redeem' ? 'config-subtabs__tab--active' : ''}`}
          onClick={() => setActiveSubTab('redeem')}
        >
          Redeem Codes
        </button>
        <button
          className={`config-subtabs__tab ${activeSubTab === 'daevanion' ? 'config-subtabs__tab--active' : ''}`}
          onClick={() => setActiveSubTab('daevanion')}
        >
          Daevanion Config
        </button>
      </div>

      <div className="config-manager__content">
        {/* Scheduled Tasks Tab */}
        {activeSubTab === 'timing' && (
          <>
            {/* Scheduled task config */}
            <div className="config-section">
              <h3 className="config-section__title">
                <span className="config-section__icon">⏰</span>
                Scheduled Data Sync
              </h3>
              <p className="config-section__desc">
                Automatically update all members' character data periodically (equipment, level, stats, etc.)
              </p>

              <div className="sync-status">
                <div className="sync-status__row">
                  <span className="sync-status__label">Task Status:</span>
                  <span className={`sync-status__value ${syncStatus.isRunning ? 'sync-status__value--running' : ''}`}>
                    {syncStatus.isRunning ? '⏰ Running' : '⏹️ Stopped'}
                  </span>
                </div>

                {syncStatus.isSyncing && (
                  <div className="sync-status__row">
                    <span className="sync-status__label">Current Status:</span>
                    <span className="sync-status__value sync-status__value--syncing">
                      🔄 Syncing data...
                    </span>
                  </div>
                )}

                <div className="sync-status__row">
                  <span className="sync-status__label">Last Sync:</span>
                  <span className="sync-status__value">{formatTime(syncStatus.lastSyncTime)}</span>
                </div>

                {syncStatus.isRunning && syncStatus.nextSyncTime && (
                  <div className="sync-status__row">
                    <span className="sync-status__label">Next Sync:</span>
                    <span className="sync-status__value">{formatTime(syncStatus.nextSyncTime)}</span>
                  </div>
                )}
              </div>

              <div className="config-field">
                <label htmlFor="syncInterval">
                  Sync Interval (hours)
                  <span className="config-field__hint">(Recommended: 2-6 hours)</span>
                </label>
                <input
                  id="syncInterval"
                  type="number"
                  min="1"
                  max="24"
                  value={syncIntervalInput}
                  onChange={(e) => setSyncIntervalInput(Number(e.target.value))}
                  disabled={syncStatus.isRunning}
                />
                <span className="config-field__help">
                  Range: 1-24 hours. Too frequent may cause API rate limiting.
                </span>
              </div>

              <div className="sync-actions">
                {syncStatus.isRunning ? (
                  <button
                    onClick={handleStopSync}
                    className="btn btn--danger"
                    disabled={syncStatus.isSyncing}
                  >
                    ⏹️ Stop Scheduled Task
                  </button>
                ) : (
                  <button
                    onClick={handleStartSync}
                    className="btn btn--primary"
                  >
                    ▶️ Start Scheduled Task
                  </button>
                )}

                <button
                  onClick={handleSyncNow}
                  className="btn btn--secondary"
                  disabled={syncStatus.isSyncing}
                >
                  🔄 Sync Now
                </button>
              </div>

              <div className="sync-notice">
                <div className="sync-notice__icon">💡</div>
                <div className="sync-notice__content">
                  <p><strong>Notes:</strong></p>
                  <ul>
                    <li>Scheduled task will auto-update all members with API configured</li>
                    <li>Sync includes: character info, equipment details, level, stats, etc.</li>
                    <li>First sync runs immediately after starting scheduled task</li>
                    <li>Members without API config will be skipped</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sync log */}
            <div className="config-section">
              <h3 className="config-section__title">
                <span className="config-section__icon">📋</span>
                Sync Log
              </h3>
              <p className="config-section__desc">
                View recent data sync operation records
              </p>

              <div className="sync-log">
                {syncLogs.length === 0 ? (
                  <div className="sync-log__empty">No sync logs yet</div>
                ) : (
                  <div className="sync-log__list">
                    {syncLogs.map((log, index) => (
                      <div key={index} className={`sync-log__item sync-log__item--${log.type}`}>
                        <span className="sync-log__time">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                        <span className={`sync-log__type sync-log__type--${log.type}`}>
                          {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : 'ℹ'}
                        </span>
                        <span className="sync-log__message">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Voice Config Tab */}
        {activeSubTab === 'voice' && (
          <>
            {/* Voice channel config */}
            <div className="config-section">
              <h3 className="config-section__title">
                <span className="config-section__icon">🎤</span>
                Voice Channel Config
              </h3>
              <p className="config-section__desc">
                Configure legion voice channel link. Supports Discord, QQ Channel, YY, or any voice platform invite link
              </p>

              <div className="config-field">
                <label htmlFor="voiceChannelUrl">
                  Voice Channel Link
                  <span className="config-field__hint">(Full invite URL)</span>
                </label>
                <input
                  id="voiceChannelUrl"
                  type="url"
                  value={config.voiceChannelUrl}
                  onChange={(e) => handleChange('voiceChannelUrl', e.target.value)}
                  placeholder="https://discord.gg/example or https://pd.qq.com/..."
                />
                <span className="config-field__help">
                  Examples: Discord: https://discord.gg/xxxxx, QQ Channel: https://pd.qq.com/s/xxxxx
                </span>
              </div>

              <div className="config-field">
                <label htmlFor="voiceChannelName">
                  Display Name
                  <span className="config-field__hint">(Title shown on legion page)</span>
                </label>
                <input
                  id="voiceChannelName"
                  type="text"
                  value={config.voiceChannelName}
                  onChange={(e) => handleChange('voiceChannelName', e.target.value)}
                  placeholder="Legion Voice"
                />
              </div>

              <div className="config-field">
                <label htmlFor="voiceChannelDescription">
                  Description
                  <span className="config-field__hint">(Guide text)</span>
                </label>
                <textarea
                  id="voiceChannelDescription"
                  value={config.voiceChannelDescription}
                  onChange={(e) => handleChange('voiceChannelDescription', e.target.value)}
                  placeholder="Click to join our voice channel"
                  rows={3}
                />
              </div>
            </div>

            {/* Preview area */}
            <div className="config-preview">
              <h4 className="config-preview__title">Preview</h4>
              <div className="config-preview__content">
                <div className="config-preview__icon">🎤</div>
                <h3>{config.voiceChannelName || 'Legion Voice'}</h3>
                <p>{config.voiceChannelDescription || 'Click to join our voice channel'}</p>
                {config.voiceChannelUrl ? (
                  <div className="config-preview__button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Join Voice Channel
                  </div>
                ) : (
                  <div className="config-preview__empty">Please configure voice channel link first</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="config-manager__actions">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn--primary"
              >
                {saving ? 'Saving...' : 'Save Config'}
              </button>
              <button
                onClick={loadConfig}
                disabled={saving}
                className="btn btn--secondary"
              >
                Reset
              </button>
            </div>
          </>
        )}

        {/* Redeem Code Tab */}
        {activeSubTab === 'redeem' && (
          <>
            {/* Redeem code config */}
            <div className="config-section">
              <h3 className="config-section__title">
                <span className="config-section__icon">🎁</span>
                Redeem Code Management
              </h3>
              <p className="config-section__desc">
                Configure legion redeem codes to display on legion page for members to copy
              </p>

              <div className="config-field">
                <label htmlFor="redeemCode">
                  Redeem Code
                  <span className="config-field__hint">(In-game redeemable gift code)</span>
                </label>
                <input
                  id="redeemCode"
                  type="text"
                  value={config.redeemCode}
                  onChange={(e) => handleChange('redeemCode', e.target.value)}
                  placeholder="Enter redeem code"
                  maxLength={50}
                />
                <span className="config-field__help">
                  Leave empty if no code available
                </span>
              </div>

              <div className="config-field">
                <label htmlFor="redeemCodeExpiry">
                  Expiry Time
                  <span className="config-field__hint">(Code expiration date)</span>
                </label>
                <input
                  id="redeemCodeExpiry"
                  type="datetime-local"
                  value={config.redeemCodeExpiry ? config.redeemCodeExpiry.slice(0, 16) : ''}
                  onChange={(e) => handleChange('redeemCodeExpiry', e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
                <span className="config-field__help">
                  Set code validity period. Shows "Expired" on legion page after expiry
                </span>
              </div>
            </div>

            {/* Preview area */}
            <div className="config-preview">
              <h4 className="config-preview__title">Preview</h4>
              <div className="config-preview__content config-preview__content--redeem">
                {config.redeemCode ? (
                  <>
                    <div className="redeem-preview">
                      <div className="redeem-preview__header">
                        <span className="redeem-preview__icon">🎁</span>
                        <span className="redeem-preview__title">Legion Redeem Code</span>
                      </div>
                      <div className="redeem-preview__code-wrapper">
                        <code className="redeem-preview__code">{config.redeemCode}</code>
                        <button className="redeem-preview__copy">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy
                        </button>
                      </div>
                      {config.redeemCodeExpiry && (
                        <div className="redeem-preview__expiry">
                          Expires: {new Date(config.redeemCodeExpiry).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="config-preview__empty">Please configure redeem code first</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="config-manager__actions">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn--primary"
              >
                {saving ? 'Saving...' : 'Save Config'}
              </button>
              <button
                onClick={loadConfig}
                disabled={saving}
                className="btn btn--secondary"
              >
                Reset
              </button>
            </div>
          </>
        )}

        {/* Daevanion Config Tab */}
        {activeSubTab === 'daevanion' && (
          <>
            {/* Daevanion class config */}
            <div className="config-section">
              <h3 className="config-section__title">
                <span className="config-section__icon">🛡️</span>
                Daevanion Class Config
              </h3>
              <p className="config-section__desc">
                Configure each class's Daevanion board IDs (boardId). Each class has 6 boards
              </p>

              {daevanionLoading ? (
                <div className="config-manager__loading">Loading...</div>
              ) : (
                <>
                  <div className="daevanion-class-list">
                    <table className="daevanion-table">
                      <thead>
                        <tr>
                          <th>Class ID</th>
                          <th>Class Name (Traditional)</th>
                          <th>Class Name (Simplified)</th>
                          <th>Class Name (English)</th>
                          <th>Board ID List</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daevanionConfig?.classes.map((classMapping) => (
                          <tr key={classMapping.classId}>
                            <td>{classMapping.classId}</td>
                            <td>{classMapping.className}</td>
                            <td>{classMapping.classNameSimplified}</td>
                            <td>{classMapping.classNameEn}</td>
                            <td>
                              <code className="board-ids">
                                [{classMapping.boardIds.join(', ')}]
                              </code>
                            </td>
                            <td>
                              <button
                                onClick={() => handleEditClass(classMapping)}
                                className="btn btn--small btn--secondary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClass(classMapping.classId)}
                                className="btn btn--small btn--danger"
                                style={{ marginLeft: '8px' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(!daevanionConfig || daevanionConfig.classes.length === 0) && (
                      <div className="daevanion-empty">No class config yet</div>
                    )}
                  </div>

                  <div className="config-section__actions">
                    <button
                      onClick={handleAddClass}
                      className="btn btn--primary"
                    >
                      + Add Class
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Edit/Add class dialog */}
            {editingClass && (
              <div className="modal-overlay" onClick={handleCancelEdit}>
                <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                  <h3>{isAddingClass ? 'Add Class' : 'Edit Class'}</h3>

                  <div className="config-field">
                    <label htmlFor="classId">Class ID</label>
                    <input
                      id="classId"
                      type="number"
                      value={editingClass.classId}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        classId: parseInt(e.target.value) || 0
                      })}
                      disabled={!isAddingClass}
                      placeholder="e.g.: 1"
                    />
                  </div>

                  <div className="config-field">
                    <label htmlFor="className">Class Name (Traditional)</label>
                    <input
                      id="className"
                      type="text"
                      value={editingClass.className}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        className: e.target.value
                      })}
                      placeholder="e.g.: 劍星"
                    />
                  </div>

                  <div className="config-field">
                    <label htmlFor="classNameSimplified">Class Name (Simplified)</label>
                    <input
                      id="classNameSimplified"
                      type="text"
                      value={editingClass.classNameSimplified}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        classNameSimplified: e.target.value
                      })}
                      placeholder="e.g.: 剑星"
                    />
                  </div>

                  <div className="config-field">
                    <label htmlFor="classNameEn">Class Name (English)</label>
                    <input
                      id="classNameEn"
                      type="text"
                      value={editingClass.classNameEn}
                      onChange={(e) => setEditingClass({
                        ...editingClass,
                        classNameEn: e.target.value
                      })}
                      placeholder="e.g.: Gladiator"
                    />
                  </div>

                  <div className="config-field">
                    <label>Board ID List (6 boards)</label>
                    <div className="board-ids-input">
                      {editingClass.boardIds.map((id, index) => (
                        <input
                          key={index}
                          type="number"
                          value={id}
                          onChange={(e) => {
                            const newBoardIds = [...editingClass.boardIds];
                            newBoardIds[index] = parseInt(e.target.value) || 0;
                            setEditingClass({
                              ...editingClass,
                              boardIds: newBoardIds
                            });
                          }}
                          placeholder={`Board ${index + 1}`}
                          style={{ width: '80px', marginRight: '8px' }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button onClick={handleSaveClass} className="btn btn--primary">
                      Save
                    </button>
                    <button onClick={handleCancelEdit} className="btn btn--secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save buttons */}
            <div className="config-manager__actions">
              <button
                onClick={saveDaevanionConfig}
                disabled={daevanionSaving}
                className="btn btn--primary"
              >
                {daevanionSaving ? 'Saving...' : 'Save Config to File'}
              </button>
              <button
                onClick={loadDaevanionConfig}
                disabled={daevanionSaving}
                className="btn btn--secondary"
              >
                Reload
              </button>
            </div>

            <div className="sync-notice" style={{ marginTop: '24px' }}>
              <div className="sync-notice__icon">💡</div>
              <div className="sync-notice__content">
                <p><strong>Notes:</strong></p>
                <ul>
                  <li>Changes require clicking "Save Config to File" to take effect</li>
                  <li>Each class must have 6 Daevanion board IDs configured</li>
                  <li>Board ID is usually classId*10 + sequence, e.g. Gladiator (class 1): [11,12,13,14,15,16]</li>
                  <li>Frontend auto-loads new config after save, no restart needed</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Message notification */}
      {message && (
        <div className={`config-manager__message config-manager__message--${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default ConfigManager;
