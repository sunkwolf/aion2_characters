// Tools Manager component - Manages tools_config.json

import React, { useState, useEffect } from 'react';
import './ToolsManager.css';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
}

interface RiftConfig {
  enabled: boolean;
  timezone: string;
  intervalHours: number;
  durationMinutes: number;
  doorOpenMinutes: number;
  openTimes: string[];
}

interface ToolsConfig {
  rift: RiftConfig;
  tools: Tool[];
}

const ToolsManager: React.FC = () => {
  const [config, setConfig] = useState<ToolsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit state
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tools-config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      } else {
        showMessage('error', 'Failed to load config');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      showMessage('error', 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: ToolsConfig) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/tools-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
      const data = await response.json();
      if (data.success) {
        setConfig(newConfig);
        showMessage('success', 'Saved successfully');
        return true;
      } else {
        showMessage('error', data.error || 'Save failed');
        return false;
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showMessage('error', 'Failed to save config');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Tool operations
  const handleAddTool = () => {
    setEditingTool({ id: '', name: '', description: '', url: '' });
    setIsAdding(true);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool({ ...tool });
    setIsAdding(false);
  };

  const handleSaveTool = async () => {
    if (!editingTool || !config) return;

    // Validation
    if (!editingTool.name.trim()) {
      showMessage('error', 'Please enter tool name');
      return;
    }
    if (!editingTool.description.trim()) {
      showMessage('error', 'Please enter tool description');
      return;
    }
    if (!editingTool.url.trim()) {
      showMessage('error', 'Please enter tool URL');
      return;
    }

    let newTools: Tool[];
    if (isAdding) {
      // Add new tool - generate ID
      const newId = editingTool.name.toLowerCase().replace(/\s+/g, '-');
      newTools = [...config.tools, { ...editingTool, id: newId }];
    } else {
      // Edit tool
      newTools = config.tools.map(t => t.id === editingTool.id ? editingTool : t);
    }

    const success = await saveConfig({ ...config, tools: newTools });
    if (success) {
      setEditingTool(null);
      setIsAdding(false);
    }
  };

  const handleDeleteTool = async (id: string) => {
    if (!config) return;
    if (!confirm('Are you sure you want to delete this tool?')) return;

    const newTools = config.tools.filter(t => t.id !== id);
    await saveConfig({ ...config, tools: newTools });
  };

  const handleCancelEdit = () => {
    setEditingTool(null);
    setIsAdding(false);
  };

  // Rift config operations
  const handleRiftToggle = async () => {
    if (!config) return;
    await saveConfig({
      ...config,
      rift: { ...config.rift, enabled: !config.rift.enabled }
    });
  };

  const handleRiftTimeChange = (index: number, value: string) => {
    if (!config) return;
    const newOpenTimes = [...config.rift.openTimes];
    newOpenTimes[index] = value;
    setConfig({
      ...config,
      rift: { ...config.rift, openTimes: newOpenTimes }
    });
  };

  const handleAddRiftTime = () => {
    if (!config) return;
    setConfig({
      ...config,
      rift: { ...config.rift, openTimes: [...config.rift.openTimes, '00:00'] }
    });
  };

  const handleRemoveRiftTime = (index: number) => {
    if (!config) return;
    const newOpenTimes = config.rift.openTimes.filter((_, i) => i !== index);
    setConfig({
      ...config,
      rift: { ...config.rift, openTimes: newOpenTimes.length ? newOpenTimes : ['00:00'] }
    });
  };

  const handleSaveRiftConfig = async () => {
    if (!config) return;
    await saveConfig(config);
  };

  if (loading) {
    return <div className="tools-manager__loading">Loading...</div>;
  }

  if (!config) {
    return <div className="tools-manager__error">Failed to load config</div>;
  }

  return (
    <div className="tools-manager">
      <div className="tools-manager__header">
        <h2>Tools Management</h2>
        <p className="tools-manager__desc">Manage tools list and rift countdown config</p>
      </div>

      {message && (
        <div className={`tools-manager__message tools-manager__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Rift Config */}
      <section className="tools-manager__section">
        <div className="tools-manager__section-header">
          <h3>Rift Countdown Config</h3>
          <label className="tools-manager__toggle">
            <input
              type="checkbox"
              checked={config.rift.enabled}
              onChange={handleRiftToggle}
              disabled={saving}
            />
            <span>Enable Rift Countdown</span>
          </label>
        </div>

        <div className="tools-manager__rift-times">
          <label>Open Times (Daily):</label>
          <div className="tools-manager__time-grid">
            {config.rift.openTimes.map((time, index) => (
              <div className="tools-manager__time-item" key={`${time}-${index}`}>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleRiftTimeChange(index, e.target.value)}
                  disabled={saving}
                  className="tools-manager__time-input"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRiftTime(index)}
                  disabled={saving || config.rift.openTimes.length <= 1}
                  className="tools-manager__btn tools-manager__time-remove"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          <div className="tools-manager__time-actions">
            <button
              type="button"
              onClick={handleAddRiftTime}
              disabled={saving}
              className="tools-manager__btn tools-manager__btn--add"
            >
              + Add Time
            </button>
            <button
              onClick={handleSaveRiftConfig}
              disabled={saving}
              className="tools-manager__btn tools-manager__btn--save"
            >
              {saving ? 'Saving...' : 'Save Rift Config'}
            </button>
          </div>
        </div>
      </section>

      {/* Tools List */}
      <section className="tools-manager__section">
        <div className="tools-manager__section-header">
          <h3>Tools List</h3>
          <button
            onClick={handleAddTool}
            disabled={saving || !!editingTool}
            className="tools-manager__btn tools-manager__btn--add"
          >
            + Add Tool
          </button>
        </div>

        <div className="tools-manager__tools-list">
          {config.tools.map((tool) => (
            <div key={tool.id} className="tools-manager__tool-item">
              {editingTool?.id === tool.id && !isAdding ? (
                <div className="tools-manager__tool-edit">
                  <input
                    type="text"
                    value={editingTool.name}
                    onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                    placeholder="Tool Name"
                    className="tools-manager__input"
                  />
                  <input
                    type="text"
                    value={editingTool.description}
                    onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                    placeholder="Tool Description"
                    className="tools-manager__input"
                  />
                  <input
                    type="url"
                    value={editingTool.url}
                    onChange={(e) => setEditingTool({ ...editingTool, url: e.target.value })}
                    placeholder="Tool URL"
                    className="tools-manager__input"
                  />
                  <div className="tools-manager__tool-actions">
                    <button
                      onClick={handleSaveTool}
                      disabled={saving}
                      className="tools-manager__btn tools-manager__btn--save"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="tools-manager__btn tools-manager__btn--cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="tools-manager__tool-view">
                  <div className="tools-manager__tool-info">
                    <h4>{tool.name}</h4>
                    <p>{tool.description}</p>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                      {tool.url}
                    </a>
                  </div>
                  <div className="tools-manager__tool-actions">
                    <button
                      onClick={() => handleEditTool(tool)}
                      disabled={saving || !!editingTool}
                      className="tools-manager__btn tools-manager__btn--edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      disabled={saving || !!editingTool}
                      className="tools-manager__btn tools-manager__btn--delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add tool form */}
          {isAdding && editingTool && (
            <div className="tools-manager__tool-item tools-manager__tool-item--adding">
              <div className="tools-manager__tool-edit">
                <input
                  type="text"
                  value={editingTool.name}
                  onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                  placeholder="Tool Name"
                  className="tools-manager__input"
                />
                <input
                  type="text"
                  value={editingTool.description}
                  onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                  placeholder="Tool Description"
                  className="tools-manager__input"
                />
                <input
                  type="url"
                  value={editingTool.url}
                  onChange={(e) => setEditingTool({ ...editingTool, url: e.target.value })}
                  placeholder="Tool URL"
                  className="tools-manager__input"
                />
                <div className="tools-manager__tool-actions">
                  <button
                    onClick={handleSaveTool}
                    disabled={saving}
                    className="tools-manager__btn tools-manager__btn--save"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="tools-manager__btn tools-manager__btn--cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ToolsManager;
