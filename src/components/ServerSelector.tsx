import { useState } from 'react';
import { translateServerName } from '../data/statTranslations';
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

  // Get selected server display name
  const getSelectedServerLabel = () => {
    if (!selectedServer) return 'All Servers';
    const server = servers.find(s => s.id === selectedServer);
    return server ? translateServerName(server.label) : 'All Servers';
  };

  // Select server
  const handleSelectServer = (serverId: number | null) => {
    onSelectServer(serverId);
    setShowDropdown(false);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Elyos servers (serverId 1001-1018)
  const celestialServers = servers.filter(s => s.id >= 1001 && s.id <= 1018);
  // Asmodian servers (serverId 2001-2018)
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

      {/* Server selection panel */}
      {showDropdown && (
        <>
          <div
            className="server-selector-overlay"
            onClick={() => setShowDropdown(false)}
          />
          <div className="server-selector-panel">
            <div className="server-selector-panel__header">
              <h4 className="server-selector-panel__title">Select Server</h4>
              <button
                type="button"
                className="server-selector-panel__close"
                onClick={() => setShowDropdown(false)}
              >
                ✕
              </button>
            </div>

            {/* All servers button */}
            <button
              type="button"
              className={`server-selector-panel__all ${!selectedServer ? 'server-selector-panel__all--active' : ''}`}
              onClick={() => handleSelectServer(null)}
            >
              All Servers
            </button>

            {/* Faction groups */}
            <div className="server-selector-panel__groups">
              {/* Elyos group */}
              <div className="server-selector-panel__group server-selector-panel__group--celestial">
                <div className="server-selector-panel__group-header">
                  <img
                    src="https://assets.playnccdn.com/static-about-game/aion2/img/elyos/emblem.webp"
                    alt="Elyos"
                    className="server-selector-panel__group-icon-img"
                  />
                  <span className="server-selector-panel__group-title">Elyos Servers</span>
                  <span className="server-selector-panel__group-count">{celestialServers.length}</span>
                </div>
                <div className="server-selector-panel__buttons">
                  {celestialServers.map(server => (
                    <button
                      key={server.id}
                      type="button"
                      className={`server-selector-panel__btn server-selector-panel__btn--celestial ${selectedServer === server.id ? 'server-selector-panel__btn--active' : ''}`}
                      onClick={() => handleSelectServer(server.id)}
                    >
                      {translateServerName(server.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asmodian group */}
              <div className="server-selector-panel__group server-selector-panel__group--asmodian">
                <div className="server-selector-panel__group-header">
                  <img
                    src="https://assets.playnccdn.com/static-about-game/aion2/img/asmodians/emblem.webp"
                    alt="Asmodian"
                    className="server-selector-panel__group-icon-img"
                  />
                  <span className="server-selector-panel__group-title">Asmodian Servers</span>
                  <span className="server-selector-panel__group-count">{asmodianServers.length}</span>
                </div>
                <div className="server-selector-panel__buttons">
                  {asmodianServers.map(server => (
                    <button
                      key={server.id}
                      type="button"
                      className={`server-selector-panel__btn server-selector-panel__btn--asmodian ${selectedServer === server.id ? 'server-selector-panel__btn--active' : ''}`}
                      onClick={() => handleSelectServer(server.id)}
                    >
                      {translateServerName(server.label)}
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
