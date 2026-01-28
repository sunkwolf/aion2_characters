// Member Edit Modal component

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

  // Load server list
  useEffect(() => {
    const loadServers = async () => {
      try {
        const response = await fetch(`/data/serverId.json?t=${Date.now()}`);
        const data = await response.json();
        setServerList(data.serverList || []);
      } catch (error) {
        console.error('Failed to load server list:', error);
      }
    };
    loadServers();
  }, []);

  const handleChange = (field: keyof MemberConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
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

    // Required field validation
    if (!formData.id.trim()) {
      newErrors.id = 'ID cannot be empty';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name cannot be empty';
    }

    // Character ID validation (required)
    if (!formData.characterId || !formData.characterId.trim()) {
      newErrors.characterId = 'Character ID cannot be empty';
    }

    // serverId validation (required)
    if (!formData.serverId) {
      newErrors.serverId = 'Please select a server';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Clean data
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
            <h2>{isCreating ? 'Add New Member' : 'Edit Member Info'}</h2>
            <p className="modal-subtitle">{isCreating ? 'Fill in member basic info' : `Edit ${formData.name}'s info`}</p>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Two column layout */}
          <div className="member-form-grid">
            {/* Left column - Basic info */}
            <div className="form-column">
              <div className="form-column__header">
                <div className="form-column__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>Basic Info</h3>
              </div>

              {isCreating ? (
                <>
                  <div className="form-field">
                    <label htmlFor="member-id">Member ID</label>
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
                    <label htmlFor="member-name">Character Name</label>
                    <input
                      id="member-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter character name"
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>
                </>
              ) : (
                <div className="readonly-card">
                  <div className="readonly-item">
                    <span className="readonly-label">Member ID</span>
                    <span className="readonly-value">{formData.id}</span>
                  </div>
                  <div className="readonly-item">
                    <span className="readonly-label">Character Name</span>
                    <span className="readonly-value">{formData.name}</span>
                  </div>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="member-role">Role</label>
                <div className="select-wrapper">
                  <select
                    id="member-role"
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value as MemberConfig['role'])}
                  >
                    <option value="member">Member</option>
                    <option value="elite">Elite</option>
                    <option value="leader">Legion Leader</option>
                  </select>
                  <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="member-title">Title</label>
                <input
                  id="member-title"
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter title (optional)"
                />
              </div>
            </div>

            {/* Right column - API config */}
            <div className="form-column">
              <div className="form-column__header">
                <div className="form-column__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>API Config</h3>
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
                    <label htmlFor="member-server">Server</label>
                    <ServerSelect
                      value={formData.serverId?.toString() || ''}
                      onChange={(serverId) => handleChange('serverId', serverId)}
                      serverList={serverList}
                      placeholder="Select server"
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
                    <span className="readonly-label">Server</span>
                    <span className="readonly-value">
                      {serverList.find(s => s.serverId === formData.serverId)?.serverName || formData.serverId}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Action buttons */}
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn--ghost">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isCreating ? 'Create Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberEditModal;
