import { useState } from 'react';
import './ServerSelector.css';

interface Server {
  id: number;
  name: string;
  label: string;
}

interface ServerSelectorProps {
  servers: Server[];
  selectedServer: number | null;
  onSelectServer: (serverId: number | null) => void;
}

const ServerSelector = ({ servers, selectedServer, onSelectServer }: ServerSelectorProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // 获取选中服务器的显示名称
  const getSelectedServerLabel = () => {
    if (!selectedServer) return '全部服务器';
    const server = servers.find(s => s.id === selectedServer);
    return server ? server.label : '全部服务器';
  };

  // 选择服务器
  const handleSelectServer = (serverId: number | null) => {
    onSelectServer(serverId);
    setShowDropdown(false);
  };

  // 切换下拉菜单
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // 天族服务器 (serverId 1001-1018)
  const celestialServers = servers.filter(s => s.id >= 1001 && s.id <= 1018);
  // 魔族服务器 (serverId 2001-2018)
  const asmodianServers = servers.filter(s => s.id >= 2001 && s.id <= 2018);

  return (
    <div className="server-selector-wrapper">
      <button
        type="button"
        className="server-selector-button"
        onClick={toggleDropdown}
      >
        {getSelectedServerLabel()}
      </button>

      {/* 服务器选择面板 */}
      {showDropdown && (
        <>
          <div
            className="server-selector-overlay"
            onClick={() => setShowDropdown(false)}
          />
          <div className="server-selector-panel">
            <div className="server-selector-panel__header">
              <h4 className="server-selector-panel__title">选择服务器</h4>
              <button
                type="button"
                className="server-selector-panel__close"
                onClick={() => setShowDropdown(false)}
              >
                ✕
              </button>
            </div>

            {/* 全部服务器按钮 */}
            <button
              type="button"
              className={`server-selector-panel__all ${!selectedServer ? 'server-selector-panel__all--active' : ''}`}
              onClick={() => handleSelectServer(null)}
            >
              全部服务器
            </button>

            {/* 天魔分组显示 */}
            <div className="server-selector-panel__groups">
              {/* 天族组 */}
              <div className="server-selector-panel__group server-selector-panel__group--celestial">
                <div className="server-selector-panel__group-header">
                  <img
                    src="https://assets.playnccdn.com/static-about-game/aion2/img/elyos/emblem.webp"
                    alt="天族"
                    className="server-selector-panel__group-icon-img"
                  />
                  <span className="server-selector-panel__group-title">天族服务器</span>
                  <span className="server-selector-panel__group-count">{celestialServers.length}个</span>
                </div>
                <div className="server-selector-panel__buttons">
                  {celestialServers.map(server => (
                    <button
                      key={server.id}
                      type="button"
                      className={`server-selector-panel__btn server-selector-panel__btn--celestial ${selectedServer === server.id ? 'server-selector-panel__btn--active' : ''}`}
                      onClick={() => handleSelectServer(server.id)}
                    >
                      {server.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 魔族组 */}
              <div className="server-selector-panel__group server-selector-panel__group--asmodian">
                <div className="server-selector-panel__group-header">
                  <img
                    src="https://assets.playnccdn.com/static-about-game/aion2/img/asmodians/emblem.webp"
                    alt="魔族"
                    className="server-selector-panel__group-icon-img"
                  />
                  <span className="server-selector-panel__group-title">魔族服务器</span>
                  <span className="server-selector-panel__group-count">{asmodianServers.length}个</span>
                </div>
                <div className="server-selector-panel__buttons">
                  {asmodianServers.map(server => (
                    <button
                      key={server.id}
                      type="button"
                      className={`server-selector-panel__btn server-selector-panel__btn--asmodian ${selectedServer === server.id ? 'server-selector-panel__btn--active' : ''}`}
                      onClick={() => handleSelectServer(server.id)}
                    >
                      {server.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServerSelector;
