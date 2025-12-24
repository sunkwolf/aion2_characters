// 成员编辑弹窗组件

import React, { useState, useEffect } from 'react';
import type { MemberConfig } from '../../types/admin';
import ServerSelect from '../ServerSelect';
import './MemberEditModal.css';

interface MemberEditModalProps {
  member: MemberConfig;
  isCreating: boolean;
  onSave: (member: MemberConfig) => void;
  onCancel: () => void;
}

const MemberEditModal: React.FC<MemberEditModalProps> = ({
  member,
  isCreating,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<MemberConfig>(member);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverList, setServerList] = useState<Array<{
    serverId: number;
    serverName: string;
    raceId: number;
  }>>([]);

  useEffect(() => {
    setFormData(member);
  }, [member]);

  // 加载服务器列表
  useEffect(() => {
    const loadServers = async () => {
      try {
        const response = await fetch('/data/serverId.json');
        const data = await response.json();
        setServerList(data.serverList || []);
      } catch (error) {
        console.error('加载服务器列表失败:', error);
      }
    };
    loadServers();
  }, []);

  const handleChange = (field: keyof MemberConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 必填字段验证
    if (!formData.id.trim()) {
      newErrors.id = 'ID 不能为空';
    }

    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空';
    }

    // Character ID 验证（必填）
    if (!formData.characterId || !formData.characterId.trim()) {
      newErrors.characterId = 'Character ID 不能为空';
    }

    // serverId 验证（必填）
    if (!formData.serverId) {
      newErrors.serverId = '请选择服务器';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // 清理数据
    const cleanedData: MemberConfig = {
      ...formData,
      id: formData.id.trim(),
      name: formData.name.trim(),
      characterId: formData.characterId.trim(),
      serverId: formData.serverId,
    };

    onSave(cleanedData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-content--member" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header__content">
            <h2>{isCreating ? '添加新成员' : '编辑成员信息'}</h2>
            <p className="modal-subtitle">{isCreating ? '填写成员基本信息' : `编辑 ${formData.name} 的信息`}</p>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 左右两列布局 */}
          <div className="member-form-grid">
            {/* 左列 - 基本信息 */}
            <div className="form-column">
              <div className="form-column__header">
                <div className="form-column__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>基本信息</h3>
              </div>

              {isCreating ? (
                <>
                  <div className="form-field">
                    <label htmlFor="member-id">成员ID</label>
                    <input
                      id="member-id"
                      type="text"
                      value={formData.id}
                      onChange={(e) => handleChange('id', e.target.value)}
                      placeholder="A1pIWbd0..."
                    />
                    {errors.id && <span className="form-error">{errors.id}</span>}
                  </div>

                  <div className="form-field">
                    <label htmlFor="member-name">角色名称</label>
                    <input
                      id="member-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="请输入角色名称"
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                </>
              ) : (
                <div className="readonly-card">
                  <div className="readonly-item">
                    <span className="readonly-label">成员ID</span>
                    <span className="readonly-value">{formData.id}</span>
                  </div>
                  <div className="readonly-item">
                    <span className="readonly-label">角色名称</span>
                    <span className="readonly-value">{formData.name}</span>
                  </div>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="member-role">职位</label>
                <div className="select-wrapper">
                  <select
                    id="member-role"
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value as MemberConfig['role'])}
                  >
                    <option value="member">成员</option>
                    <option value="elite">精英</option>
                    <option value="leader">团长</option>
                  </select>
                  <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="member-joindate">加入日期</label>
                <input
                  id="member-joindate"
                  type="date"
                  value={formData.joinDate || ''}
                  onChange={(e) => handleChange('joinDate', e.target.value)}
                />
              </div>
            </div>

            {/* 右列 - API配置 */}
            <div className="form-column">
              <div className="form-column__header">
                <div className="form-column__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>API配置</h3>
              </div>

              {isCreating ? (
                <>
                  <div className="form-field">
                    <label htmlFor="member-character-id">Character ID</label>
                    <input
                      id="member-character-id"
                      type="text"
                      value={formData.characterId || ''}
                      onChange={(e) => handleChange('characterId', e.target.value)}
                      placeholder="A1pIWbd0..."
                    />
                    {errors.characterId && <span className="form-error">{errors.characterId}</span>}
                  </div>

                  <div className="form-field">
                    <label htmlFor="member-server">服务器</label>
                    <ServerSelect
                      value={formData.serverId?.toString() || ''}
                      onChange={(serverId) => handleChange('serverId', serverId)}
                      serverList={serverList}
                      placeholder="请选择服务器"
                    />
                    {errors.serverId && <span className="form-error">{errors.serverId}</span>}
                  </div>
                </>
              ) : (
                <div className="readonly-card">
                  <div className="readonly-item">
                    <span className="readonly-label">Character ID</span>
                    <span className="readonly-value readonly-value--mono">{formData.characterId}</span>
                  </div>
                  <div className="readonly-item">
                    <span className="readonly-label">服务器</span>
                    <span className="readonly-value">
                      {serverList.find(s => s.serverId === formData.serverId)?.serverName || formData.serverId}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* 操作按钮 */}
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn--ghost">
            取消
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isCreating ? '创建成员' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberEditModal;
