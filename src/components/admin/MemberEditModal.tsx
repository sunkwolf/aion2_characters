// 成员编辑弹窗组件

import React, { useState, useEffect } from 'react';
import type { MemberConfig } from '../../types/admin';
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

  useEffect(() => {
    setFormData(member);
  }, [member]);

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
    } else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = 'ID 只能包含小写字母、数字、下划线和连字符';
    }

    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空';
    }

    // URL 验证 - 两个 URL 必须同时配置或同时为空
    const hasInfoUrl = formData.characterInfoUrl && formData.characterInfoUrl.trim();
    const hasEquipUrl = formData.characterEquipmentUrl && formData.characterEquipmentUrl.trim();

    if (hasInfoUrl && !hasEquipUrl) {
      newErrors.characterEquipmentUrl = '配置了角色信息 URL 时必须同时配置装备 URL';
    }
    if (!hasInfoUrl && hasEquipUrl) {
      newErrors.characterInfoUrl = '配置了装备 URL 时必须同时配置角色信息 URL';
    }

    // 验证 URL 格式
    if (hasInfoUrl) {
      try {
        new URL(formData.characterInfoUrl!);
      } catch {
        newErrors.characterInfoUrl = '请输入有效的 URL';
      }
    }

    if (hasEquipUrl) {
      try {
        new URL(formData.characterEquipmentUrl!);
      } catch {
        newErrors.characterEquipmentUrl = '请输入有效的 URL';
      }
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
      characterInfoUrl: formData.characterInfoUrl?.trim() || undefined,
      characterEquipmentUrl: formData.characterEquipmentUrl?.trim() || undefined,
    };

    onSave(cleanedData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreating ? '添加成员' : '编辑成员'}</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 基础信息和 API 配置并排 */}
          <div className="modal-form-grid">
            {/* 基础信息 */}
            <div className="form-section">
              <h3>基础信息</h3>

              <div className="form-field">
                <label htmlFor="member-id">
                  ID <span className="required">*</span>
                </label>
                <input
                  id="member-id"
                  type="text"
                  value={formData.id}
                  onChange={(e) => handleChange('id', e.target.value)}
                  disabled={!isCreating}
                  placeholder="例如: player_001"
                />
                {errors.id && <span className="form-error">{errors.id}</span>}
                <span className="form-hint">
                  用于文件夹名称,只能包含小写字母、数字、下划线和连字符
                  {!isCreating && ' (不可修改)'}
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="member-name">
                  名称 <span className="required">*</span>
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="角色名称"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="member-role">角色</label>
                <select
                  id="member-role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as MemberConfig['role'])}
                >
                  <option value="member">成员</option>
                  <option value="elite">精英</option>
                  <option value="leader">团长</option>
                </select>
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

            {/* API 配置 */}
            <div className="form-section">
              <h3>API 配置</h3>
              <p className="form-section-desc">
              直接粘贴完整的 API URL。两个 URL 必须同时填写。
            </p>

            <div className="form-field">
              <label htmlFor="member-info-url">
                角色信息 URL <span className="required-badge">包含 /character/info</span>
              </label>
              <input
                id="member-info-url"
                type="text"
                value={formData.characterInfoUrl || ''}
                onChange={(e) => handleChange('characterInfoUrl', e.target.value)}
                placeholder="https://tw.ncsoft.com/aion2/api/character/info?lang=zh&characterId=...&serverId=..."
              />
              {errors.characterInfoUrl && <span className="form-error">{errors.characterInfoUrl}</span>}
              <span className="form-hint">
                ⚠️ 注意:URL 路径必须包含 <code>/character/info</code>
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="member-equip-url">
                角色装备 URL <span className="required-badge">包含 /character/equipment</span>
              </label>
              <input
                id="member-equip-url"
                type="text"
                value={formData.characterEquipmentUrl || ''}
                onChange={(e) => handleChange('characterEquipmentUrl', e.target.value)}
                placeholder="https://tw.ncsoft.com/aion2/api/character/equipment?lang=zh&characterId=...&serverId=..."
              />
              {errors.characterEquipmentUrl && <span className="form-error">{errors.characterEquipmentUrl}</span>}
              <span className="form-hint">
                ⚠️ 注意:URL 路径必须包含 <code>/character/equipment</code>
              </span>
            </div>
          </div>
          </div>
        </form>

        {/* 操作按钮 */}
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="btn btn--secondary">
            取消
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn--primary">
            {isCreating ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberEditModal;
