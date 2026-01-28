// Member Manager component

import React, { useState, useEffect } from 'react';
import type { MemberConfig } from '../../types/admin';
import {
  loadMembers,
  addMember,
  updateMember,
  deleteMember,
} from '../../services/dataService';
import { getCharacterUrlFromMember, validateMemberConfig } from '../../services/apiService';
import MemberEditModal from './MemberEditModal';
import ConfirmDialog from '../ConfirmDialog';
import './MemberManager.css';

const MemberManager: React.FC = () => {
  const [members, setMembers] = useState<MemberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<MemberConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    memberId: string;
    memberName: string;
  }>({
    visible: false,
    memberId: '',
    memberName: '',
  });

  // Load member list
  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    try {
      const data = await loadMembers();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load member list:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new member
  const handleCreate = () => {
    setIsCreating(true);
    setEditingMember({
      id: '',
      name: '',
      role: 'member',
      characterId: '',
      serverId: 1001,
    });
  };

  // Edit member
  const handleEdit = (member: MemberConfig) => {
    setIsCreating(false);
    setEditingMember(member);
  };

  // Save member
  const handleSave = async (memberData: MemberConfig) => {
    try {
      if (isCreating) {
        const updated = await addMember(members, memberData);
        setMembers(updated);

        // Async sync new member's character data in background
        fetch('/api/sync/member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memberData)
        }).then(response => {
          if (response.ok) {
            console.log(`Member ${memberData.name}'s character data synced successfully`);
          } else {
            console.warn(`Member ${memberData.name}'s character data sync failed`);
          }
        }).catch(error => {
          console.error(`Member ${memberData.name}'s character data sync failed:`, error);
        });
      } else {
        const updated = await updateMember(members, memberData);
        setMembers(updated);
      }
      setEditingMember(null);
      setIsCreating(false);
    } catch (error: any) {
      alert(error.message || 'Save failed');
    }
  };

  // Delete member
  const handleDelete = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Show confirm dialog
    setConfirmDialog({
      visible: true,
      memberId: member.id,
      memberName: member.name,
    });
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    const memberId = confirmDialog.memberId;

    // Close dialog
    setConfirmDialog({ visible: false, memberId: '', memberName: '' });

    try {
      const updated = await deleteMember(members, memberId);
      setMembers(updated);
    } catch (error: any) {
      alert(`Delete failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDialog({ visible: false, memberId: '', memberName: '' });
  };

  // Filter members
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.id.toLowerCase().includes(query)
    );
  });

  // Role display names
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      leader: 'Legion Leader',
      elite: 'Elite',
      member: 'Member',
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return <div className="member-manager__loading">Loading...</div>;
  }

  return (
    <div className="member-manager">
      {/* Toolbar */}
      <div className="member-manager__toolbar">
        <div className="member-manager__search">
          <input
            type="text"
            placeholder="Search member name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="member-manager__actions">
          <button onClick={handleCreate} className="btn btn--primary">
            Add Member
          </button>
        </div>
      </div>

      {/* Member list */}
      <div className="member-manager__list">
        <table className="member-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Title</th>
              <th>API Config</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="member-table__empty">
                  {searchQuery ? 'No matching members found' : 'No member data'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const validation = validateMemberConfig(member);
                const apiUrl = getCharacterUrlFromMember(member);

                return (
                  <tr key={member.id}>
                    <td className="member-table__name">{member.name}</td>
                    <td className="member-table__role">
                      <span className={`role-badge role-badge--${member.role}`}>
                        {getRoleDisplay(member.role)}
                      </span>
                    </td>
                    <td>{member.title || '-'}</td>
                    <td>
                      {validation.valid ? (
                        <span className="status-badge status-badge--success" title={`${member.characterId} / ${member.serverId}`}>
                          Configured
                        </span>
                      ) : (
                        <span
                          className="status-badge status-badge--warning"
                          title={validation.message}
                        >
                          Not Configured
                        </span>
                      )}
                    </td>
                    <td className="member-table__actions">
                      <button
                        onClick={() => handleEdit(member)}
                        className="btn btn--sm btn--secondary"
                      >
                        Edit
                      </button>
                      {apiUrl && (
                        <a
                          href={apiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--sm btn--secondary"
                          title="Open API URL"
                        >
                          API
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="btn btn--sm btn--danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="member-manager__stats">
        <span>Total: {members.length} members</span>
        {searchQuery && <span>Filtered: {filteredMembers.length}</span>}
      </div>

      {/* Edit modal */}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          isCreating={isCreating}
          onSave={handleSave}
          onCancel={() => {
            setEditingMember(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Delete Member"
        message={`Are you sure you want to delete member "${confirmDialog.memberName}"? This will delete all data for this member and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        danger={true}
      />
    </div>
  );
};

export default MemberManager;
