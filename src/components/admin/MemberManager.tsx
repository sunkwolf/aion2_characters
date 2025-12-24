// 成员管理组件

import React, { useState, useEffect } from 'react';
import type { MemberConfig } from '../../types/admin';
import {
  loadMembers,
  saveMembers,
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

  // 加载成员列表
  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    try {
      const data = await loadMembers();
      setMembers(data);
    } catch (error) {
      console.error('加载成员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新成员
  const handleCreate = () => {
    setIsCreating(true);
    setEditingMember({
      id: '',
      name: '',
      role: 'member',
      joinDate: new Date().toISOString().split('T')[0],
      characterId: '',
      serverId: 1001,
    });
  };

  // 编辑成员
  const handleEdit = (member: MemberConfig) => {
    setIsCreating(false);
    setEditingMember(member);
  };

  // 保存成员
  const handleSave = async (memberData: MemberConfig) => {
    try {
      if (isCreating) {
        const updated = await addMember(members, memberData);
        setMembers(updated);
      } else {
        const updated = await updateMember(members, memberData);
        setMembers(updated);
      }
      setEditingMember(null);
      setIsCreating(false);
    } catch (error: any) {
      alert(error.message || '保存失败');
    }
  };

  // 删除成员
  const handleDelete = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // 显示确认对话框
    setConfirmDialog({
      visible: true,
      memberId: member.id,
      memberName: member.name,
    });
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    const memberId = confirmDialog.memberId;

    // 关闭对话框
    setConfirmDialog({ visible: false, memberId: '', memberName: '' });

    try {
      const updated = await deleteMember(members, memberId);
      setMembers(updated);
    } catch (error: any) {
      alert(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setConfirmDialog({ visible: false, memberId: '', memberName: '' });
  };

  // 筛选成员
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.id.toLowerCase().includes(query)
    );
  });

  // 角色显示名称
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      leader: '团长',
      elite: '精英',
      member: '成员',
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return <div className="member-manager__loading">加载中...</div>;
  }

  return (
    <div className="member-manager">
      {/* 工具栏 */}
      <div className="member-manager__toolbar">
        <div className="member-manager__search">
          <input
            type="text"
            placeholder="搜索成员名称或ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="member-manager__actions">
          <button onClick={handleCreate} className="btn btn--primary">
            添加成员
          </button>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="member-manager__list">
        <table className="member-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>职位</th>
              <th>加入日期</th>
              <th>API配置</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="member-table__empty">
                  {searchQuery ? '没有找到匹配的成员' : '暂无成员数据'}
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
                    <td>{member.joinDate || '-'}</td>
                    <td>
                      {validation.valid ? (
                        <span className="status-badge status-badge--success" title={`${member.characterId} / ${member.serverId}`}>
                          已配置
                        </span>
                      ) : (
                        <span
                          className="status-badge status-badge--warning"
                          title={validation.message}
                        >
                          未配置
                        </span>
                      )}
                    </td>
                    <td className="member-table__actions">
                      <button
                        onClick={() => handleEdit(member)}
                        className="btn btn--sm btn--secondary"
                      >
                        编辑
                      </button>
                      {apiUrl && (
                        <a
                          href={apiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--sm btn--secondary"
                          title="打开 API URL"
                        >
                          API
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="btn btn--sm btn--danger"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 统计信息 */}
      <div className="member-manager__stats">
        <span>总计: {members.length} 名成员</span>
        {searchQuery && <span>筛选结果: {filteredMembers.length} 名</span>}
      </div>

      {/* 编辑弹窗 */}
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="删除成员"
        message={`确定要删除成员 "${confirmDialog.memberName}" 吗？此操作将删除该成员的所有数据,且无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        danger={true}
      />
    </div>
  );
};

export default MemberManager;
