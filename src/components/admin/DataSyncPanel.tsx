// Data Sync Panel component

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

  // Load member list
  React.useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    try {
      const data = await loadMembers();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load member list:', error);
    }
  };

  // Add log
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US');
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setSyncLog((prev) => [...prev, logMessage]);
  };

  // Clear log
  const clearLog = () => {
    setSyncLog([]);
  };

  // ============= Auto sync features =============

  // Sync single member
  const handleSyncMember = async () => {
    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    const member = members.find(m => m.id === selectedMember);
    if (!member) {
      alert('Member not found');
      return;
    }

    const validation = validateMemberConfig(member);
    if (!validation.valid) {
      alert(`This member has no API configured: ${validation.message}`);
      return;
    }

    setLoading(true);
    clearLog();
    addLog(`Starting sync for member: ${member.name}`, 'info');

    try {
      const result = await syncMemberData(member, (message, type) => {
        addLog(message, type);
      });

      if (result.success) {
        addLog(`✓ Sync successful: ${member.name}`, 'success');

        // Save to localStorage
        if (result.characterInfo) {
          localStorage.setItem(
            `aion2_character_${member.id}`,
            JSON.stringify(result.characterInfo)
          );
          addLog('✓ Character info saved to localStorage', 'success');
        }

        if (result.equipmentDetails && result.equipmentDetails.length > 0) {
          const cache: EquipmentDetailsCache = {
            memberId: member.id,
            lastUpdate: new Date().toISOString(),
            details: result.equipmentDetails,
          };
          saveEquipmentCache(cache);
          addLog(`✓ Equipment details saved (${result.equipmentDetails.length} items)`, 'success');
        }

        alert('Sync successful! Data saved to local storage');
      } else {
        addLog(`✗ Sync failed: ${result.error}`, 'error');
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`✗ Sync failed: ${error.message}`, 'error');
      alert(`Sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Batch sync all members
  const handleSyncAll = async () => {
    if (configuredMembers.length === 0) {
      alert('No members with API configured');
      return;
    }

    if (!confirm(`Are you sure you want to sync all ${configuredMembers.length} members?`)) {
      return;
    }

    setLoading(true);
    clearLog();
    addLog(`Starting batch sync for ${configuredMembers.length} members...`, 'info');

    try {
      const result = await syncAllMembers(configuredMembers, (message, type) => {
        addLog(message, type);
      });

      const successRate = ((result.success / result.total) * 100).toFixed(0);
      addLog(`Sync complete: ${result.success}/${result.total} successful (${successRate}%)`, 'success');

      alert(`Sync complete!\nSuccessful: ${result.success}\nFailed: ${result.failed}\nTotal: ${result.total}`);
    } catch (error: any) {
      addLog(`✗ Batch sync failed: ${error.message}`, 'error');
      alert(`Batch sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export current member data to file
  const handleExportMemberData = () => {
    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    const characterData = localStorage.getItem(`aion2_character_${selectedMember}`);
    const equipmentData = localStorage.getItem(`aion2_equipment_${selectedMember}`);

    if (!characterData && !equipmentData) {
      alert('No sync data for this member. Please click "Sync Data" button first');
      return;
    }

    addLog(`Exporting data for ${selectedMember}...`, 'info');

    // Export character info
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
      addLog(`✓ Exported: ${selectedMember}_character_info.json`, 'success');
    }

    // Export equipment details
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
      addLog(`✓ Exported: ${selectedMember}_equipment_details.json`, 'success');
    }

    addLog(`✓ Export complete. Place files in public/data/${selectedMember}/ folder`, 'success');
    alert(`Export successful!\n\nPlace downloaded files in:\npublic/data/${selectedMember}/\n\nFiles:\n- ${selectedMember}_character_info.json → character_info.json\n- ${selectedMember}_equipment_details.json → equipment_details.json`);
  };

  // Manual JSON import
  const handleManualImport = () => {
    if (!manualJson.trim()) {
      alert('Please paste JSON data');
      return;
    }

    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    try {
      // Try to parse JSON
      const data = JSON.parse(manualJson);

      // Determine if character data or equipment details
      if (data.equipment || data.character) {
        // Character data
        addLog(`Successfully parsed character data`, 'success');
        addLog(`Tip: Save data as public/data/${selectedMember}/character.json`, 'info');

        // Download as file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedMember}_character.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addLog(`Downloaded file: ${selectedMember}_character.json`, 'success');
      } else if (data.details || Array.isArray(data)) {
        // Equipment details cache
        const cache: EquipmentDetailsCache = {
          memberId: selectedMember,
          lastUpdate: new Date().toISOString(),
          details: Array.isArray(data) ? data : data.details,
        };

        saveEquipmentCache(cache);
        addLog(`Equipment details saved to localStorage`, 'success');
        addLog(`Total ${cache.details.length} equipment items`, 'info');

        // Also download as file
        exportEquipmentCacheToFile(cache);
        addLog(`Downloaded file: ${selectedMember}_equipment_details.json`, 'success');
      } else {
        addLog('Unable to recognize JSON data format', 'error');
      }

      setManualJson('');
    } catch (error: any) {
      addLog(`JSON parse failed: ${error.message}`, 'error');
    }
  };

  // Import equipment details from file
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedMember) {
      alert('Please select a member first');
      event.target.value = '';
      return;
    }

    try {
      const data = await importJsonFile<any>(file);

      // If data contains memberId, use file's memberId
      if (data.memberId) {
        saveEquipmentCache(data as EquipmentDetailsCache);
        addLog(`Import successful: ${data.memberId}`, 'success');
      } else {
        // Otherwise create new cache object
        const cache: EquipmentDetailsCache = {
          memberId: selectedMember,
          lastUpdate: new Date().toISOString(),
          details: Array.isArray(data) ? data : data.details || [],
        };
        saveEquipmentCache(cache);
        addLog(`Import successful: ${selectedMember}`, 'success');
      }

      addLog(`Equipment details saved`, 'success');
    } catch (error: any) {
      addLog(`Import failed: ${error.message}`, 'error');
    }

    event.target.value = '';
  };

  // Copy API URL
  const copyApiUrl = (member: MemberConfig) => {
    const url = getCharacterUrlFromMember(member);
    if (!url) {
      alert('This member has no API configured');
      return;
    }

    // Clipboard copy compatible with HTTP and HTTPS
    const copyToClipboard = (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Prefer modern Clipboard API (requires HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(resolve, reject);
        } else {
          // HTTP fallback: use legacy document.execCommand
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              resolve();
            } else {
              reject(new Error('Copy command failed'));
            }
          } catch (err) {
            document.body.removeChild(textArea);
            reject(err);
          }
        }
      });
    };

    copyToClipboard(url).then(
      () => {
        addLog(`Copied ${member.name}'s API URL`, 'success');
      },
      () => {
        alert('Copy failed, please copy manually');
      }
    );
  };

  // Get members with configured API
  const configuredMembers = members.filter(m => validateMemberConfig(m).valid);

  return (
    <div className="data-sync-panel">
      {/* Documentation */}
      <div className="sync-panel__intro">
        <h3>Data Sync Guide</h3>
        <div className="intro-content">
          <p>
            Now supports <strong>one-click auto sync</strong>! Click the buttons below to automatically fetch all member data.
          </p>
          <ul>
            <li>
              <strong>Auto Sync (Recommended)</strong>: Select a member and click "Sync Data" to complete the 3-step sync process
            </li>
            <li>
              <strong>Batch Sync</strong>: Click "Sync All Members" to sync all members with API configured
            </li>
            <li>
              <strong>Manual Import</strong>: If auto sync fails, you can manually paste JSON data
            </li>
          </ul>
          <p className="hint-text">
            Note: Development uses proxy to bypass CORS, production requires backend proxy configuration
          </p>
        </div>
      </div>

      {/* Auto sync section */}
      <div className="sync-panel__auto">
        <h3>Auto Sync</h3>

        {/* Member selector */}
        <div className="sync-panel__selector">
          <label htmlFor="member-select">Select Member:</label>
          <select
            id="member-select"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Please Select --</option>
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
              Copy API URL
            </button>
          )}
        </div>

        {/* Sync buttons */}
        <div className="sync-panel__actions">
          <button
            onClick={handleSyncMember}
            disabled={!selectedMember || loading}
            className="btn btn--primary btn--large"
          >
            {loading ? 'Syncing...' : 'Sync Data'}
          </button>

          <button
            onClick={handleExportMemberData}
            disabled={!selectedMember || loading}
            className="btn btn--secondary btn--large"
          >
            Export to File
          </button>

          <button
            onClick={handleSyncAll}
            disabled={configuredMembers.length === 0 || loading}
            className="btn btn--primary btn--large"
          >
            {loading ? 'Syncing...' : `Sync All Members (${configuredMembers.length})`}
          </button>
        </div>

        {configuredMembers.length === 0 && (
          <p className="hint-text">
            No members with API configured. Please configure member API URLs in "Members" first
          </p>
        )}
      </div>

      {/* Manual JSON input */}
      <div className="sync-panel__manual">
        <h3>Manual Paste JSON Data</h3>
        <textarea
          value={manualJson}
          onChange={(e) => setManualJson(e.target.value)}
          placeholder="Paste JSON data returned from API here..."
          rows={12}
        />
        <div className="sync-panel__actions">
          <button
            onClick={handleManualImport}
            disabled={!selectedMember || !manualJson.trim()}
            className="btn btn--primary"
          >
            Import Data
          </button>
          <button
            onClick={() => setManualJson('')}
            className="btn btn--secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* File import */}
      <div className="sync-panel__file">
        <h3>Import from File</h3>
        <label className="btn btn--secondary">
          Select JSON File
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            disabled={!selectedMember}
            style={{ display: 'none' }}
          />
        </label>
        {!selectedMember && (
          <span className="hint-text">Please select a member first</span>
        )}
      </div>

      {/* Sync log */}
      <div className="sync-panel__log">
        <div className="log-header">
          <h3>Sync Log</h3>
          <button onClick={clearLog} className="btn btn--sm btn--secondary">
            Clear Log
          </button>
        </div>
        <div className="log-content">
          {syncLog.length === 0 ? (
            <div className="log-empty">No logs yet</div>
          ) : (
            syncLog.map((log, index) => (
              <div
                key={index}
                className={`log-item ${log.includes('ERROR')
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

      {/* Node.js script info */}
      <div className="sync-panel__script-info">
        <h3>Using Node.js Sync Script</h3>
        <div className="script-info-content">
          <p>Run the following command in project root:</p>
          <pre><code>node scripts/sync-data.js</code></pre>
          <p>The script will automatically:</p>
          <ul>
            <li>Read member config (public/data/members.json)</li>
            <li>Batch fetch all member character data</li>
            <li>Batch fetch all equipment detail data</li>
            <li>Save to corresponding folders (public/data/memberId/)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataSyncPanel;
