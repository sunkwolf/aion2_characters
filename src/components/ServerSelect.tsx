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
  placeholder = '请选择服务器',
  required = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownAbove, setDropdownAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取服务器显示名称
  const getServerDisplayName = (server: Server) => {
    const raceName = server.raceId === 1 ? '天族' : '魔族';
    return `${raceName} · ${server.serverName}`;
  };

  // 获取选中的服务器
  const selectedServer = serverList.find(s => s.serverId === Number(value));

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 视口检测,防止下拉菜单跑出屏幕
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 400; // 最大高度
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // 如果下方空间不足且上方空间更大,则向上展开
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
          {/* 两列布局 */}
          <div className="server-select__grid">
            {/* 天族列 */}
            <div className="server-select__column server-select__column--celestial">
              <div className="server-select__column-header">天族</div>
              <div className="server-select__column-list">
                {serverList
                  .filter(s => s.raceId === 1)
                  .map(server => (
                    <div
                      key={server.serverId}
                      className={`server-select__option ${
                        server.serverId === Number(value) ? 'server-select__option--selected' : ''
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

            {/* 魔族列 */}
            <div className="server-select__column server-select__column--asmodian">
              <div className="server-select__column-header">魔族</div>
              <div className="server-select__column-list">
                {serverList
                  .filter(s => s.raceId === 2)
                  .map(server => (
                    <div
                      key={server.serverId}
                      className={`server-select__option ${
                        server.serverId === Number(value) ? 'server-select__option--selected' : ''
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

      {/* 隐藏的input用于表单验证 */}
      {required && <input type="hidden" required value={value} />}
    </div>
  );
};

export default ServerSelect;
