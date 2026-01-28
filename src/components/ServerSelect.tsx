import { useState, useRef, useEffect } from 'react';
import './ServerSelect.css';

interface Server {
  serverId: number;
  serverName: string;
  raceId: number;
}

interface ServerSelectProps {
  value: string;
  onChange: (serverId: number, serverName: string) => void;
  serverList: Server[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const ServerSelect: React.FC<ServerSelectProps> = ({
  value,
  onChange,
  serverList,
  placeholder = 'Select server',
  required = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownAbove, setDropdownAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get server display name
  const getServerDisplayName = (server: Server) => {
    const raceName = server.raceId === 1 ? 'Elyos' : 'Asmodian';
    return `${raceName} · ${server.serverName}`;
  };

  // Get selected server
  const selectedServer = serverList.find(s => s.serverId === Number(value));

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Viewport detection to prevent dropdown from going off screen
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 400; // max height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is insufficient and space above is larger, expand upward
      setDropdownAbove(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  const handleSelect = (server: Server) => {
    onChange(server.serverId, server.serverName);
    setIsOpen(false);
  };

  return (
    <div className="server-select" ref={containerRef}>
      <div
        className={`server-select__trigger ${isOpen ? 'server-select__trigger--open' : ''} ${disabled ? 'server-select__trigger--disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span className={selectedServer ? '' : 'server-select__placeholder'}>
          {selectedServer ? getServerDisplayName(selectedServer) : placeholder}
        </span>
        <svg className="server-select__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className={`server-select__dropdown ${dropdownAbove ? 'server-select__dropdown--above' : ''}`}>
          {/* Two column layout */}
          <div className="server-select__grid">
            {/* Elyos column */}
            <div className="server-select__column server-select__column--celestial">
              <div className="server-select__column-header">Elyos</div>
              <div className="server-select__column-list">
                {serverList
                  .filter(s => s.raceId === 1)
                  .map(server => (
                    <div
                      key={server.serverId}
                      className={`server-select__option ${server.serverId === Number(value) ? 'server-select__option--selected' : ''
                        }`}
                      onClick={() => handleSelect(server)}
                    >
                      {server.serverName}
                      {server.serverId === Number(value) && (
                        <svg className="server-select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Asmodian column */}
            <div className="server-select__column server-select__column--asmodian">
              <div className="server-select__column-header">Asmodian</div>
              <div className="server-select__column-list">
                {serverList
                  .filter(s => s.raceId === 2)
                  .map(server => (
                    <div
                      key={server.serverId}
                      className={`server-select__option ${server.serverId === Number(value) ? 'server-select__option--selected' : ''
                        }`}
                      onClick={() => handleSelect(server)}
                    >
                      {server.serverName}
                      {server.serverId === Number(value) && (
                        <svg className="server-select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && <input type="hidden" required value={value} />}
    </div>
  );
};

export default ServerSelect;
