// 数据同步面板组件

import React, { useState } from 'react';
import type { MemberConfig, EquipmentDetailsCache } from '../../types/admin';
import {
  loadMembers,
  saveEquipmentCache,
  exportEquipmentCacheToFile,
  importJsonFile,
} from '../../services/dataService';
import {
  getCharacterUrlFromMember,
  validateMemberConfig,
} from '../../services/apiService';
import { syncMemberData, syncAllMembers } from '../../services/syncService';
import './DataSyncPanel.css';

const DataSyncPanel: React.FC = () => {
  const [members, setMembers] = useState<MemberConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [manualJson, setManualJson] = useState('');

  // 加载成员列表
  React.useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    try {
      const data = await loadMembers();
      setMembers(data);
    } catch (error) {
      console.error('加载成员列表失败:', error);
    }
  };

  // 添加日志
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setSyncLog((prev) => [...prev, logMessage]);
  };

  // 清空日志
  const clearLog = () => {
    setSyncLog([]);
  };

  // ============= 新增: 自动同步功能 =============

  // 同步单个成员
  const handleSyncMember = async () => {
    if (!selectedMember) {
      alert('请选择成员');
      return;
    }

    const member = members.find(m => m.id === selectedMember);
    if (!member) {
      alert('未找到成员');
      return;
    }

    const validation = validateMemberConfig(member);
    if (!validation.valid) {
      alert(`该成员未配置 API: ${validation.message}`);
      return;
    }

    setLoading(true);
    clearLog();
    addLog(`开始同步成员: ${member.name}`, 'info');

    try {
      const result = await syncMemberData(member, (message, type) => {
        addLog(message, type);
      });

      if (result.success) {
        addLog(`✓ 同步成功: ${member.name}`, 'success');

        // 保存到 localStorage
        if (result.characterInfo) {
          localStorage.setItem(
            `aion2_character_${member.id}`,
            JSON.stringify(result.characterInfo)
          );
          addLog('✓ 角色信息已保存到 localStorage', 'success');
        }

        if (result.equipmentDetails && result.equipmentDetails.length > 0) {
          const cache: EquipmentDetailsCache = {
            memberId: member.id,
            lastUpdate: new Date().toISOString(),
            details: result.equipmentDetails,
          };
          saveEquipmentCache(cache);
          addLog(`✓ 装备详情已保存 (${result.equipmentDetails.length} 件装备)`, 'success');
        }

        alert('同步成功!数据已保存到本地存储');
      } else {
        addLog(`✗ 同步失败: ${result.error}`, 'error');
        alert(`同步失败: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`✗ 同步失败: ${error.message}`, 'error');
      alert(`同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 批量同步所有成员
  const handleSyncAll = async () => {
    if (configuredMembers.length === 0) {
      alert('没有已配置 API 的成员');
      return;
    }

    if (!confirm(`确定要同步所有 ${configuredMembers.length} 名成员的数据吗?`)) {
      return;
    }

    setLoading(true);
    clearLog();
    addLog(`开始批量同步 ${configuredMembers.length} 名成员...`, 'info');

    try {
      const result = await syncAllMembers(configuredMembers, (message, type) => {
        addLog(message, type);
      });

      const successRate = ((result.success / result.total) * 100).toFixed(0);
      addLog(`同步完成: 成功 ${result.success}/${result.total} (${successRate}%)`, 'success');

      alert(`同步完成!\n成功: ${result.success} 名\n失败: ${result.failed} 名\n总计: ${result.total} 名`);
    } catch (error: any) {
      addLog(`✗ 批量同步失败: ${error.message}`, 'error');
      alert(`批量同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 导出当前成员数据为文件
  const handleExportMemberData = () => {
    if (!selectedMember) {
      alert('请选择成员');
      return;
    }

    const characterData = localStorage.getItem(`aion2_character_${selectedMember}`);
    const equipmentData = localStorage.getItem(`aion2_equipment_${selectedMember}`);

    if (!characterData && !equipmentData) {
      alert('该成员暂无同步数据,请先点击"同步数据"按钮');
      return;
    }

    addLog(`正在导出 ${selectedMember} 的数据...`, 'info');

    // 导出角色信息
    if (characterData) {
      const blob = new Blob([characterData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedMember}_character_info.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog(`✓ 已导出: ${selectedMember}_character_info.json`, 'success');
    }

    // 导出装备详情
    if (equipmentData) {
      const blob = new Blob([equipmentData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedMember}_equipment_details.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog(`✓ 已导出: ${selectedMember}_equipment_details.json`, 'success');
    }

    addLog(`✓ 导出完成,请将文件放到 public/data/${selectedMember}/ 文件夹`, 'success');
    alert(`导出成功!\n\n请将下载的文件放到项目的以下目录:\npublic/data/${selectedMember}/\n\n文件名:\n- ${selectedMember}_character_info.json → character_info.json\n- ${selectedMember}_equipment_details.json → equipment_details.json`);
  };

  // 手动导入 JSON 数据
  const handleManualImport = () => {
    if (!manualJson.trim()) {
      alert('请粘贴 JSON 数据');
      return;
    }

    if (!selectedMember) {
      alert('请选择成员');
      return;
    }

    try {
      // 尝试解析 JSON
      const data = JSON.parse(manualJson);

      // 判断是角色数据还是装备详情数据
      if (data.equipment || data.character) {
        // 角色数据
        addLog(`成功解析角色数据`, 'success');
        addLog(`提示: 请将数据保存为 public/data/${selectedMember}/character.json`, 'info');

        // 下载为文件
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedMember}_character.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addLog(`已下载文件: ${selectedMember}_character.json`, 'success');
      } else if (data.details || Array.isArray(data)) {
        // 装备详情缓存
        const cache: EquipmentDetailsCache = {
          memberId: selectedMember,
          lastUpdate: new Date().toISOString(),
          details: Array.isArray(data) ? data : data.details,
        };

        saveEquipmentCache(cache);
        addLog(`装备详情已保存到 localStorage`, 'success');
        addLog(`共 ${cache.details.length} 件装备`, 'info');

        // 同时下载为文件
        exportEquipmentCacheToFile(cache);
        addLog(`已下载文件: ${selectedMember}_equipment_details.json`, 'success');
      } else {
        addLog('无法识别 JSON 数据格式', 'error');
      }

      setManualJson('');
    } catch (error: any) {
      addLog(`JSON 解析失败: ${error.message}`, 'error');
    }
  };

  // 从文件导入装备详情
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedMember) {
      alert('请先选择成员');
      event.target.value = '';
      return;
    }

    try {
      const data = await importJsonFile<any>(file);

      // 如果数据包含 memberId,使用文件中的 memberId
      if (data.memberId) {
        saveEquipmentCache(data as EquipmentDetailsCache);
        addLog(`导入成功: ${data.memberId}`, 'success');
      } else {
        // 否则创建新的缓存对象
        const cache: EquipmentDetailsCache = {
          memberId: selectedMember,
          lastUpdate: new Date().toISOString(),
          details: Array.isArray(data) ? data : data.details || [],
        };
        saveEquipmentCache(cache);
        addLog(`导入成功: ${selectedMember}`, 'success');
      }

      addLog(`装备详情已保存`, 'success');
    } catch (error: any) {
      addLog(`导入失败: ${error.message}`, 'error');
    }

    event.target.value = '';
  };

  // 复制 API URL
  const copyApiUrl = (member: MemberConfig) => {
    const url = getCharacterUrlFromMember(member);
    if (!url) {
      alert('该成员未配置 API 参数');
      return;
    }

    navigator.clipboard.writeText(url).then(
      () => {
        addLog(`已复制 ${member.name} 的 API URL`, 'success');
      },
      () => {
        alert('复制失败,请手动复制');
      }
    );
  };

  // 获取已配置 API 的成员
  const configuredMembers = members.filter(m => validateMemberConfig(m).valid);

  return (
    <div className="data-sync-panel">
      {/* 说明文档 */}
      <div className="sync-panel__intro">
        <h3>数据同步说明</h3>
        <div className="intro-content">
          <p>
            现在支持<strong>一键自动同步</strong>!点击下方按钮即可自动获取所有成员数据。
          </p>
          <ul>
            <li>
              <strong>自动同步 (推荐)</strong>: 选择成员后点击"同步数据"按钮,自动完成 3 步同步流程
            </li>
            <li>
              <strong>批量同步</strong>: 点击"同步所有成员"按钮,自动同步所有已配置 API 的成员
            </li>
            <li>
              <strong>手动导入</strong>: 如果自动同步失败,可以手动复制粘贴 JSON 数据
            </li>
          </ul>
          <p className="hint-text">
            注意: 开发环境下使用代理绕过 CORS,生产环境需要配置后端代理
          </p>
        </div>
      </div>

      {/* 自动同步区域 */}
      <div className="sync-panel__auto">
        <h3>自动同步</h3>

        {/* 成员选择 */}
        <div className="sync-panel__selector">
          <label htmlFor="member-select">选择成员:</label>
          <select
            id="member-select"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            disabled={loading}
          >
            <option value="">-- 请选择 --</option>
            {configuredMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.id})
              </option>
            ))}
          </select>

          {selectedMember && !loading && (
            <button
              onClick={() => {
                const member = members.find(m => m.id === selectedMember);
                if (member) copyApiUrl(member);
              }}
              className="btn btn--secondary"
            >
              复制 API URL
            </button>
          )}
        </div>

        {/* 同步按钮 */}
        <div className="sync-panel__actions">
          <button
            onClick={handleSyncMember}
            disabled={!selectedMember || loading}
            className="btn btn--primary btn--large"
          >
            {loading ? '同步中...' : '同步数据'}
          </button>

          <button
            onClick={handleExportMemberData}
            disabled={!selectedMember || loading}
            className="btn btn--secondary btn--large"
          >
            导出为文件
          </button>

          <button
            onClick={handleSyncAll}
            disabled={configuredMembers.length === 0 || loading}
            className="btn btn--primary btn--large"
          >
            {loading ? '同步中...' : `同步所有成员 (${configuredMembers.length})`}
          </button>
        </div>

        {configuredMembers.length === 0 && (
          <p className="hint-text">
            暂无已配置 API 的成员,请先在"成员管理"中配置成员的 API URL
          </p>
        )}
      </div>

      {/* 手动输入 JSON */}
      <div className="sync-panel__manual">
        <h3>手动粘贴 JSON 数据</h3>
        <textarea
          value={manualJson}
          onChange={(e) => setManualJson(e.target.value)}
          placeholder="在此粘贴从 API 返回的 JSON 数据..."
          rows={12}
        />
        <div className="sync-panel__actions">
          <button
            onClick={handleManualImport}
            disabled={!selectedMember || !manualJson.trim()}
            className="btn btn--primary"
          >
            导入数据
          </button>
          <button
            onClick={() => setManualJson('')}
            className="btn btn--secondary"
          >
            清空
          </button>
        </div>
      </div>

      {/* 文件导入 */}
      <div className="sync-panel__file">
        <h3>从文件导入</h3>
        <label className="btn btn--secondary">
          选择 JSON 文件
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            disabled={!selectedMember}
            style={{ display: 'none' }}
          />
        </label>
        {!selectedMember && (
          <span className="hint-text">请先选择成员</span>
        )}
      </div>

      {/* 同步日志 */}
      <div className="sync-panel__log">
        <div className="log-header">
          <h3>同步日志</h3>
          <button onClick={clearLog} className="btn btn--sm btn--secondary">
            清空日志
          </button>
        </div>
        <div className="log-content">
          {syncLog.length === 0 ? (
            <div className="log-empty">暂无日志</div>
          ) : (
            syncLog.map((log, index) => (
              <div
                key={index}
                className={`log-item ${
                  log.includes('ERROR')
                    ? 'log-item--error'
                    : log.includes('SUCCESS')
                    ? 'log-item--success'
                    : ''
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Node.js 脚本说明 */}
      <div className="sync-panel__script-info">
        <h3>使用 Node.js 同步脚本</h3>
        <div className="script-info-content">
          <p>在项目根目录运行以下命令:</p>
          <pre><code>node scripts/sync-data.js</code></pre>
          <p>脚本会自动:</p>
          <ul>
            <li>读取成员配置 (public/data/members.json)</li>
            <li>批量请求所有成员的角色数据</li>
            <li>批量请求所有装备详情数据</li>
            <li>保存到对应的文件夹 (public/data/成员ID/)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataSyncPanel;
