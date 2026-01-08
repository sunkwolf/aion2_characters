// 工具管理组件 - 管理 tools_config.json

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

  // 编辑状态
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // 加载配置
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
        showMessage('error', '加载配置失败');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      showMessage('error', '加载配置失败');
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
        showMessage('success', '保存成功');
        return true;
      } else {
        showMessage('error', data.error || '保存失败');
        return false;
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showMessage('error', '保存配置失败');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 工具操作
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

    // 验证
    if (!editingTool.name.trim()) {
      showMessage('error', '请输入工具名称');
      return;
    }
    if (!editingTool.description.trim()) {
      showMessage('error', '请输入工具描述');
      return;
    }
    if (!editingTool.url.trim()) {
      showMessage('error', '请输入工具URL');
      return;
    }

    let newTools: Tool[];
    if (isAdding) {
      // 新增工具 - 生成ID
      const newId = editingTool.name.toLowerCase().replace(/\s+/g, '-');
      newTools = [...config.tools, { ...editingTool, id: newId }];
    } else {
      // 编辑工具
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
    if (!confirm('确定要删除这个工具吗?')) return;

    const newTools = config.tools.filter(t => t.id !== id);
    await saveConfig({ ...config, tools: newTools });
  };

  const handleCancelEdit = () => {
    setEditingTool(null);
    setIsAdding(false);
  };

  // 裂缝配置操作
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

  const handleSaveRiftConfig = async () => {
    if (!config) return;
    await saveConfig(config);
  };

  if (loading) {
    return <div className="tools-manager__loading">加载中...</div>;
  }

  if (!config) {
    return <div className="tools-manager__error">加载配置失败</div>;
  }

  return (
    <div className="tools-manager">
      <div className="tools-manager__header">
        <h2>工具管理</h2>
        <p className="tools-manager__desc">管理工具列表和裂缝倒计时配置</p>
      </div>

      {message && (
        <div className={`tools-manager__message tools-manager__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 裂缝配置 */}
      <section className="tools-manager__section">
        <div className="tools-manager__section-header">
          <h3>裂缝倒计时配置</h3>
          <label className="tools-manager__toggle">
            <input
              type="checkbox"
              checked={config.rift.enabled}
              onChange={handleRiftToggle}
              disabled={saving}
            />
            <span>启用裂缝倒计时</span>
          </label>
        </div>

        <div className="tools-manager__rift-times">
          <label>开启时间 (每日):</label>
          <div className="tools-manager__time-grid">
            {config.rift.openTimes.map((time, index) => (
              <input
                key={index}
                type="time"
                value={time}
                onChange={(e) => handleRiftTimeChange(index, e.target.value)}
                disabled={saving}
                className="tools-manager__time-input"
              />
            ))}
          </div>
          <button
            onClick={handleSaveRiftConfig}
            disabled={saving}
            className="tools-manager__btn tools-manager__btn--save"
          >
            {saving ? '保存中...' : '保存裂缝配置'}
          </button>
        </div>
      </section>

      {/* 工具列表 */}
      <section className="tools-manager__section">
        <div className="tools-manager__section-header">
          <h3>工具列表</h3>
          <button
            onClick={handleAddTool}
            disabled={saving || !!editingTool}
            className="tools-manager__btn tools-manager__btn--add"
          >
            + 添加工具
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
                    placeholder="工具名称"
                    className="tools-manager__input"
                  />
                  <input
                    type="text"
                    value={editingTool.description}
                    onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                    placeholder="工具描述"
                    className="tools-manager__input"
                  />
                  <input
                    type="url"
                    value={editingTool.url}
                    onChange={(e) => setEditingTool({ ...editingTool, url: e.target.value })}
                    placeholder="工具URL"
                    className="tools-manager__input"
                  />
                  <div className="tools-manager__tool-actions">
                    <button
                      onClick={handleSaveTool}
                      disabled={saving}
                      className="tools-manager__btn tools-manager__btn--save"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="tools-manager__btn tools-manager__btn--cancel"
                    >
                      取消
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
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      disabled={saving || !!editingTool}
                      className="tools-manager__btn tools-manager__btn--delete"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 新增工具表单 */}
          {isAdding && editingTool && (
            <div className="tools-manager__tool-item tools-manager__tool-item--adding">
              <div className="tools-manager__tool-edit">
                <input
                  type="text"
                  value={editingTool.name}
                  onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                  placeholder="工具名称"
                  className="tools-manager__input"
                />
                <input
                  type="text"
                  value={editingTool.description}
                  onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                  placeholder="工具描述"
                  className="tools-manager__input"
                />
                <input
                  type="url"
                  value={editingTool.url}
                  onChange={(e) => setEditingTool({ ...editingTool, url: e.target.value })}
                  placeholder="工具URL"
                  className="tools-manager__input"
                />
                <div className="tools-manager__tool-actions">
                  <button
                    onClick={handleSaveTool}
                    disabled={saving}
                    className="tools-manager__btn tools-manager__btn--save"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="tools-manager__btn tools-manager__btn--cancel"
                  >
                    取消
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
